import * as cheerio from 'cheerio';
import { launchBrowser } from '../../lib/playwright-helper.js';

// 의미없는 로고 alt 패턴 ("로고", "logo", "CI" 등)
const GENERIC_ALT_RE = /^(로고|로고\s*이미지|홈페이지\s*로고|홈페이지\s*이미지|logo(\s*img)?|symbol|ci|emblem|이미지|홈페이지|home|homepage|home\s*page|welcome|welcome\s*to|welcome\s*homepage|main|index|메인|대문|인트로|intro)$/i;

// 오류 페이지 제목 패턴 — 학교명으로 오인하면 안 되는 문자열
const ERROR_TITLE_RE = /찾을\s*수\s*없|요청하신\s*페이지|페이지를\s*찾|없는\s*페이지|존재하지\s*않|접근\s*거부|권한이\s*없|서비스\s*준비|점검\s*중|error|not\s*found|forbidden|unauthorized/i;

// 홈페이지 로고 이미지 alt → og:site_name → title 순으로 기관명 추출
async function extractSiteName(homeUrl) {
  try {
    let html;
    try {
      const result = await fetchHtmlInsecure(homeUrl);
      html = result.html;
    } catch {
      const res = await fetch(homeUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return '';
      html = await res.text();
    }
    const $ = cheerio.load(html);

    // 1) 로고 이미지 alt
    const LOGO_SEL = [
      'header img[alt]',
      '#header img[alt]',
      '.header img[alt]',
      '#gnb img[alt]',
      '.gnb img[alt]',
      '#logo img[alt]',
      '.logo img[alt]',
      '.h_logo img[alt]',
      '.logo_wrap img[alt]',
      '.site-logo img[alt]',
      'h1 img[alt]',
      '[class*="logo"] img[alt]',
      '[id*="logo"] img[alt]',
      'a.logo img[alt]',
    ].join(', ');

    const isValid = v => v && v.length > 1 && !GENERIC_ALT_RE.test(v) && !ERROR_TITLE_RE.test(v);

    const logoAlts = [];
    $(LOGO_SEL).each((_, el) => {
      const alt = $(el).attr('alt')?.trim();
      if (isValid(alt)) logoAlts.push(alt);
    });
    if (logoAlts.length > 0) return logoAlts[0];

    // 2) og:site_name
    const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim();
    if (isValid(ogSiteName)) return ogSiteName;

    // 3) <title> 태그 — 구분자(|·-·:·>)로 분리 후 첫 파트
    const title = $('title').first().text().trim();
    if (title) {
      const firstPart = title.split(/\s*[|\-:：>]\s*/)[0].trim();
      if (isValid(firstPart)) return firstPart;
    }

    // 4) meta keywords — 학교명 패턴 추출
    const metaKeywords = $('meta[name="keywords"]').attr('content')?.trim();
    if (metaKeywords) {
      const kwMatch = metaKeywords.match(/([^\s,·]{2,20}(?:학교|대학교|고등학교|중학교|초등학교|학원))/);
      if (kwMatch) return kwMatch[1];
    }

    // 5) meta description — 앞부분에 학교명 패턴이 있으면 추출
    const metaDesc = $('meta[name="description"]').attr('content')?.trim();
    if (metaDesc) {
      const descMatch = metaDesc.match(/([^\s,\.·!?]{2,20}(?:학교|대학교|고등학교|중학교|초등학교|학원))/);
      if (descMatch) return descMatch[1];
    }

    // 6) h1, h2 텍스트에서 학교명 패턴 추출
    const headings = ['h1', 'h2'];
    for (const tag of headings) {
      const text = $(tag).first().text().replace(/\s+/g, ' ').trim();
      if (!text || GENERIC_ALT_RE.test(text) || ERROR_TITLE_RE.test(text)) continue;
      const hMatch = text.match(/([^\s,·]{2,20}(?:학교|대학교|고등학교|중학교|초등학교|학원))/);
      if (hMatch) return hMatch[1];
      if (text.length >= 2 && text.length <= 30) return text;
    }
  } catch {}
  return '';
}

async function extractUrlsFromSitemap(origin) {
  const candidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap/sitemap.xml`,
  ];
  for (const u of candidates) {
    try {
      let xml;
      try {
        const result = await fetchHtmlInsecure(u);
        xml = result.html;
      } catch {
        const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) continue;
        xml = await res.text();
      }
      const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
        .map(m => m[1].trim())
        .filter(u => !u.endsWith('.xml'));
      if (urls.length > 0) return urls;
    } catch {}
  }
  return null;
}

// href 또는 onclick/data-* 에서 실제 이동 URL 추출
// 한국 학교 CMS는 href="javascript:leftMenuView(N)" 처럼 javascript: 를 많이 사용
function resolveHref(el, $, pageUrl) {
  const raw = ($(el).attr('href') || '').trim();
  if (raw && raw !== '#' && !raw.startsWith('#') && !raw.startsWith('javascript:')) return raw;

  const onclick = $(el).attr('onclick') || '';
  if (onclick) {
    const PATTERNS = [
      /location\.href\s*=\s*['"]([^'"]+)['"]/,
      /window\.location(?:\.href)?\s*=\s*['"]([^'"]+)['"]/,
      /(?:goPage|goUrl|fnMove|goMenu|movePage|fnGoMenu|goSub|fnGoPage|linkPage|fnLink)\s*\(\s*['"]([^'"]+)['"]/i,
      /\(\s*['"]([^'"]*\.(?:do|php|asp|jsp)(?:\?[^'"]*)?)['"]/,
      /\(\s*['"](\?[^'"]+)['"]/,
    ];
    for (const re of PATTERNS) {
      const m = onclick.match(re);
      if (m?.[1]) return m[1];
    }
  }

  return $(el).attr('data-href') || $(el).attr('data-url') || null;
}

// 이 <a>가 하위메뉴를 여는 상위 토글인지 판단
// - <li> 안에 <ul>/<ol> 직계 자식이 있으면 → 상위 토글
// - <a>의 형제 <ul>/<ol> 가 있으면 → 상위 토글
// - <a>의 형제 <div> 안에 <ul>/<ol>이 포함되어 있으면 → 상위 토글 (GNB의 div.sub 구조 대응)
function hasSubMenu($, a) {
  const $li = $(a).closest('li');
  if (!$li.length) return false;

  if ($li.children('ul, ol').length > 0) return true;
  if ($(a).siblings('ul, ol').length > 0) return true;

  // div 기반 서브메뉴: 형제 div 안에 ul/ol이 있으면 서브메뉴 컨테이너
  if ($(a).siblings('div').filter((_, d) => $(d).find('ul, ol').length > 0).length > 0) return true;

  return false;
}

// SSL 검증 없이 HTML을 가져오는 fallback (한국 공공기관 인증서 대응)
async function fetchHtmlInsecure(url, timeoutMs = 10000) {
  const { request: httpsReq } = await import('node:https');
  const { request: httpReq } = await import('node:http');

  const fetchOne = (targetUrl) => new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const mod = parsed.protocol === 'https:' ? httpsReq : httpReq;
    const req = mod(
      targetUrl,
      { rejectUnauthorized: false, timeout: timeoutMs },
      (res) => {
        // 301/302 리다이렉트 처리 (최대 5회)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, targetUrl).href;
          res.resume();
          return resolve({ redirect: redirectUrl });
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf-8'), finalUrl: targetUrl }));
        res.on('error', reject);
      }
    );
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });

  let current = url;
  for (let i = 0; i < 5; i++) {
    const result = await fetchOne(current);
    if (result.redirect) { current = result.redirect; continue; }
    return result;
  }
  throw new Error('too many redirects');
}

async function extractUrlsFromNav(pageUrl) {
  const inputOrigin = new URL(pageUrl).origin;
  let html;
  let finalUrl = pageUrl;
  let browser;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    finalUrl = page.url(); // 리다이렉트 후 실제 URL 추적
    await page.waitForTimeout(1000);

    // 숨겨진 서브메뉴 펼치기: CSS 강제 노출 + javascript: 토글 함수 실행
    try {
      await page.evaluate(() => {
        // 1단계: li > ul/ol 패턴의 숨김 강제 해제 (display:none 등)
        document.querySelectorAll('li > ul, li > ol').forEach(el => {
          el.style.display = 'block';
          el.style.visibility = 'visible';
          el.removeAttribute('hidden');
        });
        // 2단계: javascript: 토글 함수 실행 (AJAX 로딩형 서브메뉴 대응)
        // 단순 함수 호출 패턴 + 페이지 이동 코드 없는 경우만 실행
        document.querySelectorAll('a[href^="javascript:"]').forEach(a => {
          try {
            const code = (a.getAttribute('href') || '').replace(/^javascript:\s*/i, '').trim();
            if (
              /^\w[\w$]*\s*\([^)]*\)\s*;?$/.test(code) &&
              !/\b(?:location|history\.push|window\.open|document\.write)\b/i.test(code) &&
              !/\.href\s*=/.test(code)
            ) {
              // eslint-disable-next-line no-eval
              eval(code);
            }
          } catch {}
        });
      }).catch(() => {});
      await page.waitForTimeout(500);
    } catch {}

    html = await page.content();
  } catch {
    // 한국 공공기관 SSL 인증서 오류 등을 무시하는 fallback
    try {
      const result = await fetchHtmlInsecure(pageUrl);
      finalUrl = result.finalUrl;
      html = result.html;
    } catch {
      const res = await fetch(pageUrl, { signal: AbortSignal.timeout(8000) });
      finalUrl = res.url || pageUrl;
      html = await res.text();
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  // http → https 리다이렉트 등을 처리하기 위해 입력 origin + 최종 origin 모두 허용
  const finalOrigin = new URL(finalUrl).origin;
  const allowedOrigins = new Set([inputOrigin, finalOrigin]);

  const $ = cheerio.load(html);
  // url → { text, depth }
  const urlMap = new Map();

  // 유틸리티 버튼 텍스트 제외 패턴
  const UTIL_TEXT_RE = /^(더보기|more|전체보기|view\s*all|자세히\s*보기|바로\s*가기|닫기|열기|검색|search|top|위로|홈|home|go)$/i;

  const addLink = (a) => {
    try {
      // href 또는 onclick/data-* 에서 URL 추출
      const rawHref = resolveHref(a, $, finalUrl);
      if (!rawHref) return;

      const href = new URL(rawHref, finalUrl).href;
      if (![...allowedOrigins].some(o => href.startsWith(o))) return;
      if (href.match(/\.(jpg|jpeg|png|gif|pdf|zip|hwp|docx?)(\?|$)/i)) return;

      // 직접 텍스트 추출 (중첩 a 제거)
      const text = $(a).clone().find('a').remove().end().text().replace(/\s+/g, ' ').trim()
        || $(a).text().replace(/\s+/g, ' ').trim();
      if (!text) return;

      // 더보기·검색 등 유틸리티 버튼 제외
      if (UTIL_TEXT_RE.test(text)) return;

      // 하위 메뉴가 있는 상위 토글 링크 제외 → 자식 URL만 추출
      if (hasSubMenu($, a)) return;

      const depth = $(a).parents().length;
      const existing = urlMap.get(href);
      // 처음 발견이거나 더 깊은 위치(하위 메뉴)면 덮어쓰기
      if (!existing || depth > existing.depth) {
        urlMap.set(href, { text, depth });
      }
    } catch {}
  };

  // 전체 a 스캔 — NAV_SEL 없이 페이지 내 모든 링크 포함 (학교 CMS 커스텀 클래스 대응)
  $('a').each((_, a) => addLink(a));

  // text만 꺼내서 반환
  return new Map([...urlMap.entries()].map(([url, { text }]) => [url, text]));
}

export const config = { api: { responseLimit: false } };

function sendEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  if (typeof res.flush === 'function') res.flush();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const { url } = req.body;
    const origin = new URL(url).origin;
    const homeUrl = origin + '/';
    const isSameUrl = homeUrl === url + '/' || homeUrl === url;
    const totalSteps = isSameUrl ? 3 : 4;

    sendEvent(res, { type: 'progress', step: 1, total: totalSteps, label: '사이트맵 확인 중…' });
    const sitemapUrls = await extractUrlsFromSitemap(origin);

    sendEvent(res, { type: 'progress', step: 2, total: totalSteps, label: '홈페이지 메뉴 분석 중…' });
    const [mapFromHome, siteName] = await Promise.all([
      homeUrl !== url ? extractUrlsFromNav(homeUrl) : Promise.resolve(new Map()),
      extractSiteName(homeUrl),
    ]);

    let mapFromInput;
    if (!isSameUrl) {
      sendEvent(res, { type: 'progress', step: 3, total: totalSteps, label: '입력 페이지 링크 추출 중…' });
      mapFromInput = await extractUrlsFromNav(url);
    } else {
      mapFromInput = new Map();
    }

    sendEvent(res, { type: 'progress', step: totalSteps, total: totalSteps, label: 'URL 정리 중…' });

    const navMap = new Map([...mapFromHome, ...mapFromInput]);
    const navUrls = [...navMap.keys()];

    let urlList;
    let source;
    if (sitemapUrls && sitemapUrls.length > 0) {
      const sitemapSet = new Set(sitemapUrls);
      urlList = [...sitemapUrls, ...navUrls.filter(u => !sitemapSet.has(u))];
      source = 'sitemap+nav';
    } else {
      urlList = navUrls;
      source = 'nav';
    }

    const seen = new Map();
    for (const u of urlList) {
      try {
        const parsed = new URL(u);
        const { pathname } = parsed;
        if (/login/i.test(pathname)) continue;
        if (pathname === '/' || pathname === '' || /\/main\.do$/i.test(pathname)) continue;
        if (/\/board/i.test(pathname)) continue;
        if (/\/(bbs|notice|news|gallery|photo|album|file|download|upload)\b/i.test(pathname)) continue;
        if (/^\/data\b/i.test(pathname)) continue;
        if (/\/map\b/i.test(pathname)) continue;
        if (/\/(popup|print|rss)\b/i.test(pathname)) continue;
        const sortedSearch = [...parsed.searchParams.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('&');
        const key = parsed.origin + pathname + (sortedSearch ? '?' + sortedSearch : '');
        if (!seen.has(key)) seen.set(key, u);
      } catch {}
    }

    const unique = [...seen.values()].slice(0, 200);
    const items = unique.map(u => ({ url: u, title: navMap.get(u) || '' }));

    sendEvent(res, { type: 'result', items, source, total: items.length, siteName });
  } catch (e) {
    sendEvent(res, { type: 'error', detail: e.message });
  } finally {
    res.end();
  }
}
