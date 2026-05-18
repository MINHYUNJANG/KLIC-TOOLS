import Groq from 'groq-sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { convertFigmaNode } from './figma-converter.js';

function loadMockNode() {
  return JSON.parse(readFileSync(join(process.cwd(), 'fixtures', 'figma-mock-node.json'), 'utf-8'));
}

const FIGMA_API = 'https://api.figma.com/v1';
const NO_VARIANT = new Set(['class-list']);
const TYPE_CHOICES = 'greeting, history, pri-his, symbol, roadmap, class-list, none';

// 5분 메모리 캐시
const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return null; }
  return entry.val;
}

function cacheSet(key, val) {
  _cache.set(key, { val, ts: Date.now() });
}

// ─── 일러스트 노드 감지 유틸 ───────────────────────────────────────────────────

const VECTOR_LEAF = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'ELLIPSE', 'LINE']);

function hasTextDescendant(node) {
  if (!node || node.visible === false) return false;
  // 실제 내용이 있는 TEXT 노드만 카운트 (빈 문자열 TEXT는 무시)
  if (node.type === 'TEXT' && node.characters?.trim()) return true;
  return (node.children || []).some(c => hasTextDescendant(c));
}

function hasVectorDescendant(node) {
  if (!node || node.visible === false) return false;
  if (VECTOR_LEAF.has(node.type)) return true;
  return (node.children || []).some(c => hasVectorDescendant(c));
}

export function collectIllustrationNodeIds(node, result = [], MAX = 5) {
  if (!node || node.visible === false || node.type === 'TEXT') return result;
  if (result.length >= MAX) return result;

  const b = node.absoluteBoundingBox;
  // absoluteBoundingBox가 없으면 크기 조건 통과 (API geometry=omit 시 누락 가능)
  const largeEnough = !b || (b.width >= 16 && b.height >= 16);
  const isIllustContainer =
    ['GROUP', 'COMPONENT', 'INSTANCE', 'COMPONENT_SET'].includes(node.type) ||
    (node.type === 'FRAME' && !node.layoutMode);

  if (isIllustContainer && largeEnough && !hasTextDescendant(node) && hasVectorDescendant(node)) {
    result.push(node.id);
    return result;
  }

  for (const c of (node.children || [])) {
    if (result.length >= MAX) break;
    collectIllustrationNodeIds(c, result, MAX);
  }
  return result;
}

// 일러스트 노드 ID 목록 → Figma export CDN URL 맵 반환 (파일 저장 없음)
async function fetchIllustExportUrls(fileKey, nodeIds) {
  if (!nodeIds.length) return {};
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) return {};
  try {
    const resp = await fetch(
      `${FIGMA_API}/images/${fileKey}?ids=${encodeURIComponent(nodeIds.join(','))}&format=png&scale=2`,
      { headers: figmaHeaders(), signal: AbortSignal.timeout(45000) }
    );
    if (!resp.ok) return {};
    const body = await resp.json();
    const images = body.images ?? {};
    return Object.fromEntries(Object.entries(images).filter(([, v]) => v));
  } catch {
    return {};
  }
}

let _groqClient = null;

function getGroq() {
  if (!_groqClient) _groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groqClient;
}

function figmaHeaders() {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) throw new Error('FIGMA_ACCESS_TOKEN이 설정되지 않았습니다.');
  return { 'X-Figma-Token': token };
}

async function getWithRetry(url, options = {}, maxAttempts = 3) {
  // 호출자의 AbortSignal은 재시도 대기 중 만료될 수 있으므로 직접 관리
  const { signal: _unused, ...baseOptions } = options;
  const RETRY_DELAYS_MS = [5000, 15000];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const resp = await fetch(url, {
      ...baseOptions,
      signal: AbortSignal.timeout(45000),
    });

    if (resp.status === 429) {
      const retryAfterSec = parseInt(resp.headers.get('Retry-After') || '0', 10);
      if (attempt < maxAttempts - 1) {
        const delay = retryAfterSec > 0
          ? Math.min(retryAfterSec * 1000, 60000)
          : (RETRY_DELAYS_MS[attempt] ?? 15000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw new Error(`FIGMA_RATE_LIMIT:${retryAfterSec}`);
    }
    if (resp.status === 403 || resp.status === 401) {
      throw new Error('FIGMA_TOKEN_INVALID');
    }
    return resp;
  }
  throw new Error('FIGMA_RATE_LIMIT:0');
}

export function parseFigmaUrl(url) {
  const fileM = url.match(/figma\.com\/(?:file|design|proto)\/([A-Za-z0-9]+)/);
  if (!fileM) throw new Error('올바른 Figma URL이 아닙니다. (예: https://www.figma.com/design/XXXX/...)');
  const fileKey = fileM[1];
  const nodeM = url.match(/node-id=([^&]+)/);
  const nodeId = nodeM ? nodeM[1].replace(/-/g, ':') : null;
  return [fileKey, nodeId];
}

async function getFigmaNodeData(fileKey, nodeId) {
  const resp = await getWithRetry(
    `${FIGMA_API}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}&geometry=omit`,
    { headers: figmaHeaders(), signal: AbortSignal.timeout(5000) },
    1
  );
  if (!resp.ok) throw new Error(`Figma API 오류: ${resp.status}`);
  const data = await resp.json();
  return data.nodes?.[nodeId]?.document ?? null;
}

function extractNodeText(node, lines = []) {
  if (!node) return lines;
  if (node.type === 'TEXT' && node.characters?.trim()) {
    lines.push(node.characters.trim());
  }
  for (const child of node.children || []) extractNodeText(child, lines);
  return lines;
}

export async function figmaMarkupFast(figmaUrl, templateHtml = '') {
  const [fileKey, nodeId] = parseFigmaUrl(figmaUrl);
  if (!nodeId) throw new Error('Figma URL에 node-id가 필요합니다. (예: ?node-id=125-10349)');

  const nodeData = await getFigmaNodeData(fileKey, nodeId);
  if (!nodeData) throw new Error('Figma 노드를 찾을 수 없습니다.');

  const textLines = extractNodeText(nodeData);
  if (!textLines.length) throw new Error('텍스트 콘텐츠를 찾을 수 없습니다.');

  const hasTemplate = templateHtml && templateHtml.trim().length > 0;
  const systemPrompt = hasTemplate
    ? '당신은 HTML 마크업 전문가입니다. 아래 HTML 템플릿의 구조와 태그를 그대로 유지하면서, Figma 텍스트 데이터로 내용을 채워 완성된 HTML만 반환하세요. 설명·주석·코드블록 없이 HTML만 출력하세요.'
    : `당신은 HTML 마크업 전문가입니다. 제공된 텍스트를 HTML로 변환합니다.
규칙: 타이틀 <h2 class="tit1">/<h3 class="tit2">/<h4 class="tit3">, 하위내용 <div class="indent">, 텍스트 <p>, 리스트 <ul class="list_st1">, 순서리스트 <ol class="list_ol1"> 숫자 <span class="num">, 테이블 <div class="tbl_st scroll_gr"><table>, 탭 들여쓰기. HTML만 출력.`;

  const figmaText = textLines.join('\n').slice(0, 1200);
  const tmpl = hasTemplate ? templateHtml.slice(0, 1500) : '';
  const userContent = hasTemplate
    ? `[Figma 텍스트]\n${figmaText}\n\n[HTML 템플릿]\n${tmpl}`
    : `아래 텍스트를 HTML로 변환해주세요:\n\n${figmaText}`;

  const result = await getGroq().chat.completions.create({
    model: 'llama-3.1-8b-instant',
    max_tokens: 800,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  }, { signal: AbortSignal.timeout(7000) });
  return { html: result.choices[0].message.content.trim() };
}

export async function getTopFrameIds(fileKey) {
  if (process.env.FIGMA_MOCK === 'true') return ['mock:1'];
  const resp = await getWithRetry(
    `${FIGMA_API}/files/${fileKey}?depth=1`,
    { headers: figmaHeaders(), signal: AbortSignal.timeout(30000) }
  );
  if (!resp.ok) throw new Error(`Figma API 오류: ${resp.status}`);
  const data = await resp.json();
  const pages = data.document?.children || [];
  const ids = [];
  for (const page of pages) {
    for (const child of page.children || []) {
      if (['FRAME', 'COMPONENT', 'COMPONENT_SET', 'GROUP'].includes(child.type)) {
        ids.push(child.id);
      }
      if (ids.length >= 5) break;
    }
    if (ids.length > 0) break;
  }
  return ids;
}

export async function exportFigmaFrames(fileKey, nodeIds) {
  const idsParam = nodeIds.join(',');
  const resp = await getWithRetry(
    `${FIGMA_API}/images/${fileKey}?ids=${encodeURIComponent(idsParam)}&format=png&scale=1.5`,
    { headers: figmaHeaders(), signal: AbortSignal.timeout(20000) }
  );
  if (!resp.ok) throw new Error(`Figma export 오류: ${resp.status}`);
  const { images: imageUrls = {} } = await resp.json();

  const results = [];
  for (const nodeId of nodeIds) {
    const imgUrl = imageUrls[nodeId];
    if (!imgUrl) continue;
    const imgResp = await getWithRetry(imgUrl, { signal: AbortSignal.timeout(30000) });
    if (imgResp.ok) {
      results.push(Buffer.from(await imgResp.arrayBuffer()));
    }
  }
  return results;
}

// 컴포넌트별 HTML 구조 템플릿
const COMPONENT_STRUCTURES = {
  greeting: `
[인사말(greeting) 컴포넌트 전용 구조]
반드시 아래 구조만 사용하세요. 다른 태그나 클래스를 추가하지 마세요.

<div class="lead-wrap">
\t<div class="inner">
\t\t<p>리드 문구 (강조 부분은 <strong>굵게</strong>)</p>
\t\t<div class="bg-text">
\t\t\t<div class="track">
\t\t\t\t<p>배경 텍스트</p>
\t\t\t\t<p>배경 텍스트</p>
\t\t\t</div>
\t\t</div>
\t</div>
</div>
<div class="txt-wrap">
\t<div class="txt">
\t\t<p>본문 단락</p>
\t\t<p>본문 단락</p>
\t</div>
\t<div class="sign">학교명 교장 <strong>홍 길 동</strong></div>
</div>

규칙:
- lead-wrap > inner > p: 상단 인사 리드 문구. 강조 텍스트는 <strong> 사용
- bg-text > track: 배경에 크게 표시되는 텍스트 (보통 학교명 또는 슬로건), <p> 두 개
- txt-wrap > txt: 본문 단락들을 <p>로 나열
- sign: "학교명 교장 <strong>이 름</strong>" 형식, 이름은 한 글자씩 공백으로 띄어쓰기
- 래퍼 div(.greeting, .greeting.tyA 등)는 생성하지 말 것
- 설명·주석·코드블록 없이 HTML만 출력`,
};

export async function detectComponent(imageBytes) {
  const b64 = imageBytes.toString('base64');
  const result = await getGroq().chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    max_tokens: 20,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
        {
          type: 'text',
          text: `Korean school website section. Identify component type and layout variant.
Reply ONLY with: [type] [variant]

Types: ${TYPE_CHOICES}

Variants (tyA / tyB / tyC):
- tyA: centered/symmetric layout, big background text or circular elements
- tyB: split left-right layout, colored background panel
- tyC: sidebar sticky + main scrollable, or image strip on side

Examples:
greeting tyA
history tyB
class-list
none`,
        },
      ],
    }],
  });

  const raw = result.choices[0].message.content.trim().toLowerCase();
  const parts = raw.split(/\s+/);
  const compType = parts[0] || 'none';
  const variantRaw = parts[1] || '';

  const validTypes = new Set(['greeting', 'history', 'pri-his', 'symbol', 'roadmap', 'class-list', 'none']);
  const variantMap = { tya: 'tyA', tyb: 'tyB', tyc: 'tyC' };

  const ct = validTypes.has(compType) ? compType : 'none';
  const cv = NO_VARIANT.has(ct) ? '' : (variantMap[variantRaw] || '');
  return [ct, cv];
}

export async function visionToMarkup(imageBytes, compType = '', variant = '') {
  const b64 = imageBytes.toString('base64');
  let system, userText;

  if (compType && COMPONENT_STRUCTURES[compType]) {
    system =
      '당신은 HTML 마크업 전문가입니다.\n' +
      'Figma 디자인 이미지를 분석하여 아래 구조에 맞게 HTML 소스만 반환합니다.\n' +
      '설명·주석·코드블록 없이 HTML만 출력하세요.\n' +
      COMPONENT_STRUCTURES[compType];
    userText = '이 Figma 디자인 이미지의 텍스트를 위 구조에 맞게 빠짐없이 채워 HTML로 변환해주세요. 디자인에 보이는 텍스트를 정확히 그대로 사용하세요.';
  } else {
    const compHint = (compType && compType !== 'none')
      ? `\n이 디자인은 CSS 클래스 '${compType}${variant ? ' ' + variant : ''}' 컴포넌트의 내부 콘텐츠입니다. 래퍼 div는 생성하지 말고 내부 콘텐츠만 마크업하세요.`
      : '';
    system =
      '당신은 HTML 마크업 전문가입니다.\n' +
      'Figma 디자인 이미지를 분석하여 아래 규칙에 따라 HTML 소스만 반환합니다.\n' +
      '설명·주석·코드블록 없이 HTML만 출력하세요.\n\n' +
      '[마크업 규칙]\n' +
      '1. 타이틀은 레벨에 따라 순서대로:\n' +
      '   <h2 class="tit1"></h2>\n' +
      '   <h3 class="tit2"></h3>\n' +
      '   <h4 class="tit3"></h4>\n\n' +
      '2. 타이틀 하위 내용은 <div class="indent"></div>로 감싸서 들여쓰기\n\n' +
      '3. 일반 텍스트는 <p></p>\n\n' +
      '4. 일반 리스트(순서 없음)는 레벨에 따라:\n' +
      '   <ul class="list_st1"></ul>\n' +
      '   <ul class="list_st2"></ul>\n' +
      '   하위 리스트는 상위 <li> 안에 넣기\n\n' +
      '5. 숫자가 있는 순서 리스트는:\n' +
      '   <ol class="list_ol1"></ol>\n' +
      '   숫자는 <span class="num">1</span> 형식으로 작성\n\n' +
      '6. 테이블:\n' +
      '   <div class="tbl_st scroll_gr">\n' +
      '     <table>\n' +
      '       <caption>테이블 설명</caption>\n' +
      '       <colgroup><col>...</colgroup>\n' +
      '       <thead>...</thead>\n' +
      '       <tbody>...</tbody>\n' +
      '     </table>\n' +
      '   </div>\n\n' +
      '7. 디자인에 보이는 텍스트를 정확히 그대로 사용할 것 (수정·요약 금지)\n\n' +
      '8. section, div로 묶지 말 것 (규칙에 명시된 div 클래스 제외)\n\n' +
      '9. 모든 소스는 탭(\\t) 들여쓰기로 작성';
    userText = `이 Figma 디자인 이미지를 마크업 규칙에 따라 HTML로 변환해주세요. 디자인에 보이는 모든 텍스트와 구조를 빠짐없이 포함하세요.${compHint}`;
  }

  const result = await getGroq().chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
          { type: 'text', text: userText },
        ],
      },
    ],
  });
  return result.choices[0].message.content.trim();
}

function wrapWithComponent(html, compType, variant) {
  if (!compType || compType === 'none') return html;
  const classes = [compType, variant].filter(Boolean).join(' ');
  return `<div class="${classes}">\n${html}\n</div>`;
}

export async function figmaMarkup(figmaUrl, componentType = 'auto', variant = 'auto') {
  const [fileKey, nodeId] = parseFigmaUrl(figmaUrl);

  const nodeIds = nodeId
    ? [nodeId]
    : await getTopFrameIds(fileKey);

  if (!nodeIds.length) {
    throw new Error('내보낼 프레임을 찾을 수 없습니다. Figma URL에 node-id를 포함해 주세요.');
  }

  const images = await exportFigmaFrames(fileKey, nodeIds);
  if (!images.length) {
    throw new Error('Figma 이미지를 가져오지 못했습니다. 파일 접근 권한을 확인해주세요.');
  }

  const markups = [];
  let detectedType = '', detectedVariant = '';

  for (const imgBytes of images) {
    let ct, cv;
    if (componentType === 'auto') {
      [ct, cv] = await detectComponent(imgBytes);
    } else {
      ct = componentType;
      cv = NO_VARIANT.has(ct) ? '' : (variant !== 'auto' ? variant : '');
    }
    if (!detectedType) { detectedType = ct; detectedVariant = cv; }

    const innerHtml = await visionToMarkup(imgBytes, ct, cv);
    markups.push(wrapWithComponent(innerHtml, ct, cv));
  }

  return {
    html: markups.join('\n'),
    frame_count: images.length,
    file_key: fileKey,
    node_ids: nodeIds,
    detected_type: detectedType,
    detected_variant: detectedVariant,
  };
}

// ─── IMAGE fill 참조 수집 ──────────────────────────────────────────────────────

export function collectImageRefs(node, refs = new Set()) {
  if (!node) return refs;
  for (const fill of node.fills || []) {
    if (fill.type === 'IMAGE' && fill.imageRef) refs.add(fill.imageRef);
  }
  for (const child of node.children || []) collectImageRefs(child, refs);
  return refs;
}

export async function fetchImageFillUrls(fileKey) {
  if (process.env.FIGMA_MOCK === 'true') {
    return { 'mock-ref-001': 'https://picsum.photos/seed/klictools/1040/240' };
  }
  const cacheKey = `images:${fileKey}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const resp = await getWithRetry(
      `${FIGMA_API}/files/${fileKey}/images`,
      { headers: figmaHeaders(), signal: AbortSignal.timeout(15000) }
    );
    if (!resp.ok) return {};
    const data = await resp.json();
    const result = data.meta?.images || {};
    cacheSet(cacheKey, result);
    return result;
  } catch {
    return {};
  }
}

// ─── Figma 노드 전체 데이터 조회 (스타일 전체 포함, geometry path 제외) ────────

function withTimeout(promise, ms, msg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

export async function getFigmaNodeFull(fileKey, nodeId) {
  if (process.env.FIGMA_MOCK === 'true') return loadMockNode();
  const cacheKey = `node:${fileKey}:${nodeId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const resp = await withTimeout(
    getWithRetry(
      `${FIGMA_API}/files/${fileKey}/nodes?ids=${encodeURIComponent(nodeId)}&geometry=omit`,
      { headers: figmaHeaders() },
      2
    ),
    200000,
    'Figma 노드 조회 타임아웃 (200s)'
  );
  if (!resp.ok) throw new Error(`Figma API 오류: ${resp.status}`);
  const data = await withTimeout(resp.json(), 90000, 'Figma 노드 파싱 타임아웃 (90s)');
  const result = data.nodes?.[nodeId]?.document ?? null;
  if (result) cacheSet(cacheKey, result);
  return result;
}

// ─── Locofy 방식: 노드 트리 → HTML/CSS 프로그래매틱 변환 ─────────────────────

export async function figmaAccurateMarkup(figmaUrl, markupType = 'html') {
  const [fileKey, nodeId] = parseFigmaUrl(figmaUrl);
  const nodeIds = nodeId ? [nodeId] : await getTopFrameIds(fileKey);
  if (!nodeIds.length) throw new Error('내보낼 프레임을 찾을 수 없습니다. Figma URL에 node-id를 포함해 주세요.');

  const allHtml = [], allCss = [], allJsx = [];

  // fileKey당 1회만 호출 (캐시 + 중복 제거)
  const allCdnUrls = await fetchImageFillUrls(fileKey);

  for (const nid of nodeIds.slice(0, 3)) {
    const nodeData = await getFigmaNodeFull(fileKey, nid);
    if (!nodeData) continue;

    // 일러스트/아이콘 그룹 → Figma export CDN URL을 imageNodeMap에 직접 매핑
    const imageNodeMap = {};
    const illNodeIds = collectIllustrationNodeIds(nodeData);
    if (illNodeIds.length > 0) {
      try {
        const exportUrls = await fetchIllustExportUrls(fileKey, illNodeIds);
        for (const id of illNodeIds) {
          if (exportUrls[id]) imageNodeMap[id] = exportUrls[id];
        }
      } catch { /* 계속 진행 */ }
    }

    const imageRefs = collectImageRefs(nodeData);
    const imageFillUrls = imageRefs.size > 0
      ? Object.fromEntries([...imageRefs].map(ref => [ref, allCdnUrls[ref]]).filter(([, url]) => url))
      : {};

    const result = convertFigmaNode(nodeData, markupType, imageFillUrls, new Set(), imageNodeMap);

    if (markupType === 'react') {
      allJsx.push(result.jsx);
      allCss.push(result.css);
    } else {
      allHtml.push(result.html);
      allCss.push(result.css);
    }
  }

  if (!allHtml.length && !allJsx.length) throw new Error('마크업 생성에 실패했습니다.');

  return markupType === 'react'
    ? { jsx: allJsx.join('\n\n'), css: allCss.join('\n\n'), frame_count: allJsx.length }
    : { html: allHtml.join('\n\n'), css: allCss.join('\n\n'), frame_count: allHtml.length };
}

// ─── Figma → HTML + CSS 풀 마크업 ────────────────────────────
async function visionToFullMarkup(imageBytes) {
  const b64 = imageBytes.toString('base64');

  const system = `당신은 Figma 디자인을 HTML과 CSS로 변환하는 전문 웹 퍼블리셔입니다.
반드시 아래 형식으로만 출력하세요. 설명이나 다른 텍스트는 절대 포함하지 마세요.

[HTML]
(HTML 코드)

[CSS]
(CSS 코드)

HTML 규칙:
- 시맨틱 태그 사용 (section, article, ul, li 등)
- BEM 스타일 class 작성 (예: .card, .card__title, .card--active)
- 이미지는 <img src="#" alt="이미지 설명"> 형태로 처리
- 디자인에 보이는 모든 텍스트 그대로 포함
- 탭(\\t) 들여쓰기

CSS 규칙:
- 디자인의 색상값(hex/rgb) 정확히 추출
- 폰트 크기, 굵기, 행간, 자간 정확히 반영
- padding, margin, gap 등 여백 정확히 반영
- Flexbox 또는 Grid로 레이아웃 구현
- 상단에 * { box-sizing: border-box; margin: 0; padding: 0; } 포함
- 클래스 이름은 HTML과 일치`;

  const result = await getGroq().chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    max_tokens: 8192,
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
          { type: 'text', text: 'Figma 디자인을 분석하여 HTML과 CSS를 생성해주세요. 색상, 폰트, 여백, 레이아웃을 정확히 반영하세요.' },
        ],
      },
    ],
  });

  const content = result.choices[0].message.content;
  const htmlMatch = content.match(/\[HTML\]\s*([\s\S]*?)(?=\[CSS\]|$)/);
  const cssMatch = content.match(/\[CSS\]\s*([\s\S]*?)$/);

  const stripFence = (s) => (s || '').trim().replace(/^```(?:\w+)?\s*\n?([\s\S]*?)\n?```\s*$/m, '$1').trim();

  return {
    html: stripFence(htmlMatch?.[1] || ''),
    css: stripFence(cssMatch?.[1] || ''),
  };
}

export async function figmaFullMarkup(figmaUrl) {
  const [fileKey, nodeId] = parseFigmaUrl(figmaUrl);

  const nodeIds = nodeId ? [nodeId] : await getTopFrameIds(fileKey);
  if (!nodeIds.length) throw new Error('내보낼 프레임을 찾을 수 없습니다. Figma URL에 node-id를 포함해 주세요.');

  const images = await exportFigmaFrames(fileKey, nodeIds);
  if (!images.length) throw new Error('Figma 이미지를 가져오지 못했습니다. 파일 접근 권한을 확인해주세요.');

  const results = [];
  for (const img of images) {
    results.push(await visionToFullMarkup(img));
  }

  return {
    html: results.map(r => r.html).join('\n\n'),
    css: results.map(r => r.css).join('\n\n'),
    frame_count: images.length,
    file_key: fileKey,
    node_ids: nodeIds,
  };
}
