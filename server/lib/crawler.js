import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
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

async function ocrImage(imageUrl) {
  try {
    const resp = await fetch(imageUrl, { redirect: 'follow' });
    if (!resp.ok) return '';
    const mediaType = mimeFromContentType(resp.headers.get('content-type') || 'image/jpeg');
    const buf = await resp.arrayBuffer();
    const imageData = Buffer.from(buf).toString('base64');

    const result = await getClient().chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageData}` } },
          { type: 'text', text: '이 이미지에 텍스트가 있으면 모두 추출해주세요. 텍스트만 반환하고 설명은 생략하세요. 텍스트가 없으면 빈 문자열을 반환하세요.' },
        ],
      }],
    });
    const text = result.choices[0].message.content.trim();
    return ['빈 문자열', '텍스트가 없습니다', '없음', ''].includes(text) ? '' : text;
  } catch {
    return '';
  }
}

// ─── 셀렉터 목록 ──────────────────────────────────────────────
const SEMANTIC_SELECTORS = ['main', 'article', '[role="main"]'];

const COMMON_SELECTORS = [
  '#content', '#main', '#article', '#post', '#body', '#all_box',
  '.content', '.main', '.article', '.post', '.view',
  '.view_content', '.view_con', '.board_view', '.board-view',
  '.article-body', '.article_body', '.news_body', '.news-body',
  '.cont_wrap', '.cont-wrap', '.sub_content', '.sub-content',
  '.inner_content', '.inner-content', '.page_content',
  '.bbs_content', '.bbs-content', '.detail_content',
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
  'h2',
];

const SKIP_TAGS = new Set(['nav', 'header', 'footer', 'aside']);
const SKIP_KEYWORDS = new Set(['nav', 'header', 'footer', 'aside', 'gnb', 'lnb', 'snb', 'menu', 'sidebar']);
const NOISE_ID_CLASS = new Set([
  'header', 'footer', 'gnb', 'lnb', 'snb', 'sidebar',
  'nav', 'navigation', 'menu', 'quick', 'banner', 'ad',
  'location', 'breadcrumb', 'crumb', 'sns', 'snsbox', 'share',
  'print', 'toolbar', 'util', 'floating', 'popup',
  'title_bar', 'titlebar', 'tit_bar', 'titbar',
  'sub_visual', 'page_head', 'cont_head', 'sub_head',
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
}

// 선택된 요소 내부에서 브레드크럼·유틸 버튼 등 제거
function removeInnerNoise($, el) {
  $(el).find('div, nav, ul, ol, p, span, button, a').each((_, child) => {
    const id = ($(child).attr('id') || '').toLowerCase();
    const cls = ($(child).attr('class') || '').toLowerCase();
    if ([...NOISE_ID_CLASS].some(kw => id.includes(kw) || cls.includes(kw))) {
      $(child).remove();
    }
  });
}

// ─── 본문 영역 내부로 드릴다운 ────────────────────────────────
function drillDown($, el, depth = 3) {
  if (depth === 0) return el;
  const parentLen = elText($, el).length;

  for (const sel of INNER_SELECTORS) {
    const child = $(el).find(sel).first().get(0);
    if (!child) continue;
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
    if (coverage >= 0.6) return drillDown($, bestChild, depth - 1);
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
    browser = await chromium.launch({ headless: true });
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

  removeInnerNoise($, element);

  const images = [];
  $(element).find('img').each((_, img) => {
    const src = $(img).attr('src');
    const alt = $(img).attr('alt') || '';
    if (!src || src.startsWith('data:')) return;
    try {
      images.push({ src: new URL(src, url).href, alt, ocr_text: '' });
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
    images,
    detected_selector: detectedSelector,
  };
}
