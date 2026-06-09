import * as cheerio from 'cheerio';
import { launchBrowser } from './playwright-helper.js';
import Groq from 'groq-sdk';

let _groqClient = null;

function getClient() {
  if (!_groqClient) {
    _groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groqClient;
}

function mimeFromContentType(ct) {
  const t = ct.split(';')[0].trim().toLowerCase();
  const supported = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  if (supported.has(t)) return t;
  if (t.includes('png')) return 'image/png';
  if (t.includes('gif')) return 'image/gif';
  if (t.includes('webp')) return 'image/webp';
  return 'image/jpeg';
}

const OCR_PROMPT = `이 이미지에서 텍스트를 추출하세요.

[테이블 판별]
행(row)과 열(column)로 구성된 실제 데이터 표(성적표·시간표·현황표·비교표 등)는 <table> HTML로 변환하세요.
아래는 테이블이 아닙니다 → 일반 텍스트 추출:
  - 사진·그림 옆에 설명글이 배치된 레이아웃 (교표/교훈/교목/교화 소개 등)
  - 항목명 + 긴 설명 문단이 나란히 있는 소개·안내 페이지

[테이블 변환 규칙]
  - 다중 헤더(2행 이상)는 <thead>에 모두 포함하고 colspan/rowspan을 정확히 반영하세요
  - 세로쓰기 텍스트도 읽어서 그대로 셀에 넣으세요
  - 셀 내 줄바꿈은 <br>로 표현하세요
  - 빈 셀도 <td></td>로 빠짐없이 표시하세요
  - 모든 숫자·텍스트를 원문 그대로 포함하세요

[일반 텍스트인 경우 - 절대 생략 금지]
  - 글자 하나도 빠짐없이 추출, 줄바꿈 유지, 절대 요약·압축·생략 금지

[텍스트 없는 순수 사진] 빈 문자열만 반환하세요.

출력: <table> HTML 또는 순수 텍스트만. 코드블록·마크다운·부가 설명 불포함.`;

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
const EMPTY_TEXTS = new Set(['빈 문자열', '텍스트가 없습니다', '없음', '']);

// Gemini API 공통 호출 (모델별 12초 타임아웃 — 429는 즉시 반환되므로 실질 대기 최소)
async function geminiCall(parts, maxTokens = 8192) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  for (const model of GEMINI_MODELS) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { maxOutputTokens: maxTokens },
          }),
          signal: AbortSignal.timeout(12000),
        }
      );
      if (!resp.ok) continue;
      const data = await resp.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (!raw) continue;
      return raw.replace(/^```(?:html)?\s*\n?([\s\S]*?)\n?```\s*$/s, '$1').trim();
    } catch { continue; }
  }
  return null;
}

// 2차 패스: colspan/rowspan이 있는 복잡한 테이블에만 실행
function isComplexTable(html) {
  return /colspan=["'][2-9]\d*["']|rowspan=["'][2-9]\d*["']/i.test(html);
}

async function verifyOcrTable(imageData, mediaType, html) {
  const verifyPrompt = `이미지와 아래 HTML을 비교하여 오류를 수정하세요.

[검토 순서]
1. 셀 내용: 모든 숫자·텍스트가 이미지와 정확히 일치하는가
2. 병합 셀: colspan/rowspan이 이미지 병합 구조와 일치하는가
3. 누락: 빠진 행·열·셀이 없는가
4. 헤더 구조: thead/tbody 구분이 올바른가
5. 세로쓰기 텍스트: 올바르게 읽혔는가

[1차 추출 HTML]
${html}

수정된 최종 HTML만 반환하세요. 오류가 없으면 원본 그대로 반환. 코드블록·설명 없이 HTML만 출력.`;

  return geminiCall([
    { inline_data: { mime_type: mediaType, data: imageData } },
    { text: verifyPrompt },
  ], 8192);
}

async function ocrImage(imageUrl) {
  try {
    const resp = await fetch(imageUrl, { redirect: 'follow' });
    if (!resp.ok) return '';
    const mediaType = mimeFromContentType(resp.headers.get('content-type') || 'image/jpeg');
    const buf = await resp.arrayBuffer();
    const imageData = Buffer.from(buf).toString('base64');

    // Gemini 우선: 1차 추출
    const firstPass = await geminiCall([
      { inline_data: { mime_type: mediaType, data: imageData } },
      { text: OCR_PROMPT },
    ]);

    if (firstPass !== null && !EMPTY_TEXTS.has(firstPass)) {
      // colspan/rowspan이 있는 복잡한 테이블만 2차 검증 (단순 테이블·텍스트는 1차로 충분)
      if (/<table[\s>]/i.test(firstPass) && isComplexTable(firstPass)) {
        const verified = await verifyOcrTable(imageData, mediaType, firstPass);
        return (verified && !EMPTY_TEXTS.has(verified)) ? verified : firstPass;
      }
      return firstPass;
    }

    // Gemini 완전 실패 시 Groq 폴백
    const result = await getClient().chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageData}` } },
          { type: 'text', text: OCR_PROMPT },
        ],
      }],
    });
    const raw = result.choices[0].message.content.trim();
    const text = raw.replace(/^```(?:html)?\s*\n?([\s\S]*?)\n?```\s*$/s, '$1').trim();
    return EMPTY_TEXTS.has(text) ? '' : text;
  } catch {
    return '';
  }
}

// ─── 셀렉터 목록 ──────────────────────────────────────────────
const SEMANTIC_SELECTORS = ['main', 'article', '[role="main"]'];

const COMMON_SELECTORS = [
  // 시맨틱 id
  '#content', '#main', '#article', '#post', '#body', '#all_box',
  '#subContent', '#sub_content', '#sub_container', '#container',
  '#contentArea', '#contentWrap', '#content_wrap', '#wrap_content',
  '#mainContent', '#main_content', '#pageContent', '#page_content',
  '#contWrap', '#cont_wrap', '#contArea', '#cont_area',
  '#contents',
  // 시맨틱 class
  '.content', '.main', '.article', '.post', '.view',
  '.view_content', '.view_con', '.board_view', '.board-view',
  '.article-body', '.article_body', '.news_body', '.news-body',
  '.cont_wrap', '.cont-wrap', '.sub_content', '.sub-content',
  '.inner_content', '.inner-content', '.page_content',
  '.bbs_content', '.bbs-content', '.detail_content',
  '.contents',
  // 한국 학교 CMS 공통 패턴
  '.sub_con', '.sub_cont', '.subCon', '.subCont',
  '.wrap_cont', '.wrapCont', '.cont_inner', '.contInner',
  '.section_con', '.section_cont', '.page_con', '.page_cont',
  '.contents_wrap', '.contentsWrap', '.inner_wrap', '.innerWrap',
  '.board_con', '.boardCon', '.bbs_con', '.bbsCon',
];

const INNER_SELECTORS = [
  '.view_content', '.view_con', '.view-content', '.view-con',
  '.board_view', '.board-view', '.board_content', '.board-content',
  '.detail_content', '.detail-content', '.detail_wrap',
  '.article_body', '.article-body', '.article_content',
  '.cont_inner', '.cont-inner', '.cont_body',
  '.tbl_wrap', '.tblWrap', '.tblTy01', '.tbl_st',
  '.bbs_view', '.bbs-view',
  'td.content', 'td#content',
];

const TITLE_SELECTORS = [
  'h1',
  '#title_bar', '.title_bar', '.titleBar',
  '.tit', '.title', '.tit1',
  '.view_title', '.view-title', '.cont_title', '.cont-title',
  '.page_title', '.page-title', '.sub_title', '.sub-title',
  '.board_title', '.board-title',
  'h2', 'h3', 'h4',
];

const SKIP_TAGS = new Set(['nav', 'header', 'footer', 'aside']);
const SKIP_KEYWORDS = new Set(['nav', 'header', 'footer', 'aside', 'gnb', 'lnb', 'snb', 'menu', 'sidebar']);
const NOISE_ID_CLASS = new Set([
  'header', 'footer', 'gnb', 'lnb', 'snb', 'sidebar',
  'nav', 'navigation', 'menu', 'quick', 'banner', 'ad',
  'location', 'breadcrumb', 'crumb', 'sns', 'snsbox', 'share',
  'print', 'toolbar', 'util', 'floating', 'popup',
  'title_bar', 'titlebar', 'tit_bar', 'titbar',
  'sub_visual', 'subvisual', 'page_head', 'cont_head', 'sub_head',
]);

// ─── 헬퍼 ──────────────────────────────────────────────────────
function elText($, el) {
  return $(el).text().trim();
}

function linkText($, el) {
  let t = '';
  $(el).find('a').each((_, a) => { t += $(a).text().trim(); });
  return t;
}

function score($, el) {
  const full = elText($, el);
  if (!full) return 0;
  const link = linkText($, el);
  const linkRatio = link.length / full.length;
  const children = Math.max($(el).find('*').length, 1);
  return full.length * (1 - linkRatio) / children;
}

function tagName(el) {
  return (el?.tagName || el?.name || '').toLowerCase();
}

function isSkipNode($, el) {
  if (SKIP_TAGS.has(tagName(el))) return true;
  const cls = ($(el).attr('class') || '').toLowerCase();
  return [...SKIP_KEYWORDS].some(kw => cls.includes(kw));
}

function inSkipArea($, el) {
  let cur = $(el).parent().get(0);
  while (cur && !['body', 'html'].includes(tagName(cur))) {
    if (isSkipNode($, cur)) return true;
    cur = $(cur).parent().get(0);
  }
  return false;
}

// ─── 노이즈 제거 ──────────────────────────────────────────────
function removeNoise($) {
  $('header, nav, footer, aside').remove();
  $('div, section, nav, aside, ul, ol, header, footer').each((_, el) => {
    const id = ($(el).attr('id') || '').toLowerCase();
    const cls = ($(el).attr('class') || '').toLowerCase();
    if ([...NOISE_ID_CLASS].some(kw => id.includes(kw) || cls.includes(kw))) {
      $(el).remove();
    }
  });
  // 위치표시(p#location), 브레드크럼, 사이드메뉴, 숨김 접근성 요소 추가 제거
  $('[id="location"],[id="Location"],[id="pageTxt"],[id="pagetxt"]').remove();
  $('[class*="line_map"],[class*="linemap"],[class*="location_bar"],[class*="navi_map"]').remove();
  $('[id*="sideContent"],[id*="side_content"],[class*="sideContent"],[class*="side_content"]').remove();
  $('.hid, .hidden, .blind, .screen_out, .sr-only').remove();
}

// ─── 감지된 콘텐츠 내부 노이즈 제거 ──────────────────────────
function removeInnerNoise($, el) {
  // NOISE_ID_CLASS 패턴 매칭 요소 제거
  $(el).find('div, nav, ul, ol, p, span, button, a').each((_, child) => {
    const id = ($(child).attr('id') || '').toLowerCase();
    const cls = ($(child).attr('class') || '').toLowerCase();
    if ([...NOISE_ID_CLASS].some(kw => id.includes(kw) || cls.includes(kw))) {
      $(child).remove();
    }
  });

  // 서브 네비게이션 페이지 타이틀 컨테이너 제거 (짧은 텍스트, 블록 자식 없음)
  // h1~h6 헤딩 태그는 실제 콘텐츠 제목일 수 있으므로 반드시 제외
  $(el).find('[class*="tit1"],[class*="tit_area"],[class*="titArea"],[class*="con_tit"],[class*="cont_tit"],[class*="sub_tit"],[class*="page_tit"],[class*="view_tit"],[class*="board_tit"]').each((_, title) => {
    if (/^h[1-6]$/i.test(title.tagName || '')) return;
    const text = $(title).text().trim();
    if (text.length < 60 && !$(title).find('p, ul, ol, table').length) {
      $(title).remove();
    }
  });

  // 콘텐츠 최상단 단독 짧은 h1/h2 제거 (서브메뉴 페이지 타이틀 패턴)
  const $firstH = $(el).find('h1, h2').first();
  if ($firstH.length) {
    const text = $firstH.text().trim();
    const hasMoreContent = $(el).find('h3, h4, p, ul, ol, table').length > 0;
    if (text.length <= 40 && hasMoreContent) {
      $firstH.remove();
    }
  }
}

// ─── 본문 영역 내부로 드릴다운 ────────────────────────────────
function drillDown($, el, depth = 3) {
  if (depth === 0) return el;

  // 테이블이 2개 이상이면 드릴다운 금지 — 자식 하나로 좁힐 경우 다른 테이블 누락
  if ($(el).find('table').length > 1) return el;

  const parentLen = elText($, el).length;

  for (const sel of INNER_SELECTORS) {
    const child = $(el).find(sel).first().get(0);
    if (!child) continue;
    // 자식으로 이동하면 테이블이 줄어드는 경우 건너뜀
    if ($(child).find('table').length < $(el).find('table').length) continue;
    if (elText($, child).length >= parentLen * 0.4) {
      return drillDown($, child, depth - 1);
    }
  }

  let bestChild = null, bestScore = 0;
  $(el).children('div, section, article, td').each((_, child) => {
    const len = elText($, child).length;
    if (len < 200) return;
    const lnk = linkText($, child);
    if (lnk.length / Math.max(len, 1) > 0.5) return;
    const s = score($, child);
    if (s > bestScore) { bestScore = s; bestChild = child; }
  });

  if (bestChild) {
    const coverage = elText($, bestChild).length / Math.max(parentLen, 1);
    // 자식으로 이동할 때 테이블이 줄어들면 드릴다운 금지
    const childTables = $(bestChild).find('table').length;
    const parentTables = $(el).find('table').length;
    if (coverage >= 0.6 && childTables >= parentTables) {
      return drillDown($, bestChild, depth - 1);
    }
  }
  return el;
}

// ─── 타이틀 기반 탐지 ─────────────────────────────────────────
function findByTitle($) {
  let titleEl = null;

  for (const sel of TITLE_SELECTORS) {
    $(sel).each((_, el) => {
      if (elText($, el).length >= 2 && !inSkipArea($, el)) {
        titleEl = el;
        return false;
      }
    });
    if (titleEl) break;
  }
  if (!titleEl) return [null, null];

  const label = `(타이틀 기반: "${elText($, titleEl).slice(0, 20)}")`;

  // 부모에 테이블이 여러 개면 형제 하나로 좁히지 않고 부모 전체를 반환 (테이블 누락 방지)
  const titleParent = $(titleEl).parent().get(0);
  if ($(titleParent).find('table').length > 1 && !isSkipNode($, titleParent)) {
    return [titleParent, label];
  }

  // 형제 노드에서 본문 컨테이너 탐색
  let result = null;
  $(titleEl).parent().children().each((_, sib) => {
    if (sib === titleEl) return;
    const sibLen = elText($, sib).length;
    if (sibLen < 100) return;
    const lnk = linkText($, sib);
    if (lnk.length / Math.max(sibLen, 1) < 0.5) { result = sib; return false; }
  });
  if (result) return [result, label];

  // 위로 올라가며 컨테이너 탐색
  let node = $(titleEl).parent().get(0);
  while (node && !['body', 'html'].includes(tagName(node))) {
    if (isSkipNode($, node)) { node = $(node).parent().get(0); continue; }

    const nodeLen = elText($, node).length;
    const imgs = $(node).find('img').length;
    const lnk = linkText($, node);
    const linkRatio = lnk.length / Math.max(nodeLen, 1);

    if (nodeLen > 200 && linkRatio < 0.4) return [node, label];
    if (imgs > 0 && nodeLen - lnk.length < 50) return [node, label];

    node = $(node).parent().get(0);
  }
  return [$(titleEl).parent().get(0), label];
}

// ─── 자동 감지 (4단계 휴리스틱) ───────────────────────────────
function autoDetect($) {
  for (const sel of SEMANTIC_SELECTORS) {
    const el = $(sel).first().get(0);
    if (el && elText($, el).length > 100) return [el, sel];
  }
  for (const sel of COMMON_SELECTORS) {
    const el = $(sel).first().get(0);
    if (el && elText($, el).length > 100) return [el, sel];
  }

  const [titleEl, label] = findByTitle($);
  if (titleEl) return [titleEl, label];

  let bestEl = null, bestScore = 0;
  $('div, section, td').each((_, tag) => {
    const full = elText($, tag);
    if (full.length < 200) return;
    const lnk = linkText($, tag);
    const linkRatio = lnk.length / Math.max(full.length, 1);
    if (linkRatio > 0.5) return;
    const s = full.length * (1 - linkRatio) / Math.max($(tag).find('*').length, 1);
    if (s > bestScore) { bestScore = s; bestEl = tag; }
  });

  return bestEl ? [bestEl, '(자동 감지)'] : [null, null];
}

// ─── 텍스트 추출 (블록 요소 사이 개행) ───────────────────────
function extractText($, el) {
  const BLOCK = new Set(['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr', 'td', 'th']);
  let result = '';

  function walk(node) {
    if (node.nodeType === 3) {
      result += node.data;
    } else if (node.nodeType === 1) {
      const tag = tagName(node);
      if (BLOCK.has(tag)) result += '\n';
      $(node).contents().each((_, child) => walk(child));
      if (BLOCK.has(tag)) result += '\n';
    }
  }

  $(el).contents().each((_, child) => walk(child));
  return result.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

const SCHOOL_RE = /[가-힣]+(초등학교|중학교|고등학교|유치원|학교)/;
const CIRCLED_NUMS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';

// ─── 페이지 타이틀 추출 (브레드크럼·LNB 현재 항목 기준) ─────────
// 노이즈 제거 전에 호출해야 타이틀 요소가 살아 있음
function extractPageTitle($) {
  const CRUMB_SELS = [
    '#location li:last-child', '#pageTxt', '#pageTitle',
    '.location li:last-child', '.locationBar li:last-child',
    '[class*="location"] li:last-child',
    '[class*="breadcrumb"] li:last-child',
    '[class*="crumb"] li:last-child',
    '[class*="navi_map"] li:last-child',
    '[class*="line_map"] li:last-child',
  ];
  for (const sel of CRUMB_SELS) {
    const text = $(sel).first().text().trim();
    if (text && text.length >= 2 && text.length <= 40) return text;
  }
  const VISUAL_SELS = [
    '[class*="sub_visual"] h2', '[class*="sub_visual"] h1',
    '[class*="page_head"] h2', '[class*="cont_head"] h2',
    '[class*="sub_tit"] h2', '[class*="page_tit"] h2',
    '.sub_tit', '.page_tit', '.cont_tit',
  ];
  for (const sel of VISUAL_SELS) {
    const text = $(sel).first().text().trim();
    if (text && text.length >= 2 && text.length <= 40) return text;
  }
  const LNB_SELS = [
    '[class*="lnb"] li.on > a', '[class*="lnb"] li.active > a',
    '[class*="snb"] li.on > a', '[class*="snb"] li.active > a',
    '[class*="sub_menu"] li.on > a', '[class*="sub_menu"] li.active > a',
  ];
  for (const sel of LNB_SELS) {
    const text = $(sel).first().text().trim();
    if (text && text.length >= 2 && text.length <= 40) return text;
  }
  return '';
}

// ─── 학교명 누락 위치에 삽입 (개인정보처리방침 CMS 템플릿 패턴) ──
function injectSchoolName(text, name) {
  if (!name) return text;
  const n = name;
  return text
    // 줄 시작: 에서/가/는 + 공백 (학교명이 앞에 와야 하는 패턴)
    .replace(/(^|\n)(에서 )/gm, `$1${n}$2`)
    .replace(/(^|\n)(가 개인정보)/gm, `$1${n}$2`)
    .replace(/(^|\n)(는 (?:파기|정보주체|이용자|위탁|개인정보|관리|전담|기술|암호))/gm, `$1${n}$2`)
    .replace(/(^|\n)(의 개인정보 보호책임자)/gm, `$1${n}$2`)
    // 원문자(①②...) 뒤 바로 는/가/이 단독으로 오는 경우
    .replace(new RegExp(`([${CIRCLED_NUMS}]\\s+)(는 |가 |은 )`, 'g'), `$1${n}$2`)
    // ~는/은 에 대해 → ~는/은 학교명에 대해
    .replace(/(는|은)( 에 대해)/g, `$1 ${n}에 대해`);
}

// ─── 학교명 추출 (cheerio $ 기준) ────────────────────────────
function extractSchoolName($) {
  const injected = $('meta[name="school-name"]').attr('content');
  if (injected?.trim()) return injected.trim();
  const og = $('meta[property="og:site_name"]').attr('content');
  if (og?.trim()) return og.trim();
  const titleText = $('title').text().trim();
  if (titleText) {
    const parts = titleText.split(/\s*[-|:]{1,2}\s*/);
    if (parts.length > 1) return parts.reduce((a, b) => a.length <= b.length ? a : b).trim();
    const m = titleText.match(SCHOOL_RE);
    if (m) return m[0];
  }
  const h1 = $('header h1, #header h1').first().text().trim();
  if (h1) return h1;
  const logoAlt = $('header .logo img, #header .logo img, header #logo img').first().attr('alt');
  if (logoAlt?.trim()) return logoAlt.trim();
  return '';
}

// ─── 메인 크롤 함수 ───────────────────────────────────────────
export async function crawl(url, selector = '') {
  let html;
  let browser;

  // Playwright로 JS 렌더링 → 학교명 포함 완전한 DOM 획득
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1500);
    html = await page.content();

    // 현재 페이지에서 학교명 못 찾으면 홈페이지에서 재시도 (같은 브라우저 세션)
    const $check = cheerio.load(html);
    if (!extractSchoolName($check)) {
      const homeUrl = new URL(url).origin + '/';
      if (homeUrl !== url && homeUrl !== url + '/') {
        const homePage = await browser.newPage();
        try {
          await homePage.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await homePage.waitForTimeout(1000);
          const homeHtml = await homePage.content();
          const $home = cheerio.load(homeHtml);
          const name = extractSchoolName($home);
          if (name) {
            // 홈페이지에서 추출한 학교명을 현재 페이지 html에 meta로 주입
            html = html.replace('</head>', `<meta name="school-name" content="${name}"></head>`);
          }
        } catch {} finally {
          await homePage.close().catch(() => {});
        }
      }
    }
  } catch (e) {
    // Playwright 실패 시 정적 fetch로 폴백
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(7000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      html = await resp.text();
    } catch (fe) {
      return { success: false, error: `페이지 로딩 실패: ${fe.message}` };
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  const $ = cheerio.load(html);
  const schoolName = extractSchoolName($);
  const pageTitle = extractPageTitle($);

  let element, detectedSelector;

  if (selector) {
    const el = $(selector).first().get(0);
    if (!el) return { success: false, error: `셀렉터 '${selector}'에 해당하는 요소를 찾을 수 없습니다.` };
    element = el;
    detectedSelector = selector;
  } else {
    removeNoise($);
    const [detected, detSel] = autoDetect($);
    if (!detected) return { success: false, error: '본문 영역을 자동으로 감지하지 못했습니다. CSS 셀렉터를 직접 입력해주세요.' };

    const refined = drillDown($, detected);
    if (refined !== detected) {
      const cls = ($(refined).attr('class') || '').trim();
      const id = ($(refined).attr('id') || '').trim();
      const tn = tagName(refined);
      const lbl = cls ? '.' + cls.split(/\s+/).join('.') : (id ? '#' + id : tn);
      detectedSelector = `${detSel} → ${lbl}`;
      element = refined;
    } else {
      detectedSelector = detSel;
      element = detected;
    }
  }

  // 테이블 누락 방지: 선택된 요소(테이블 자체 포함)보다 부모에 테이블이 더 있으면 부모로 확장
  const elementTableCount = tagName(element) === 'table' ? 1 : $(element).find('table').length;
  if (elementTableCount > 0) {
    let cur = element;
    for (let step = 0; step < 4; step++) {
      const parent = $(cur).parent().get(0);
      if (!parent || ['body', 'html'].includes(tagName(parent))) break;
      if (isSkipNode($, parent)) break;
      const parentTables = $(parent).find('table').length;
      const curTables = tagName(cur) === 'table' ? 1 : $(cur).find('table').length;
      if (parentTables > curTables) {
        const txt = elText($, parent);
        const lnk = linkText($, parent);
        if (lnk.length / Math.max(txt.length, 1) < 0.5) {
          cur = parent;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    if (cur !== element) element = cur;
  }

  removeInnerNoise($, element);

  const images = [];
  $(element).find('img').each((_, img) => {
    const src = $(img).attr('src');
    const alt = $(img).attr('alt') || '';
    if (!src || src.startsWith('data:')) return;
    try {
      images.push({ src: new URL(src, url).href, orig_src: src, alt, ocr_text: '' });
    } catch {}
  });

  await Promise.all(images.map(async img => {
    img.ocr_text = await ocrImage(img.src);
  }));

  const bodyText = injectSchoolName(extractText($, element), schoolName);

  return {
    success: true,
    html: $.html(element),
    text: bodyText,
    school_name: schoolName || null,
    page_title: pageTitle || null,
    images,
    detected_selector: detectedSelector,
  };
}
