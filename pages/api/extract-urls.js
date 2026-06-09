import * as cheerio from 'cheerio';
import { launchBrowser } from '../../lib/playwright-helper.js';

// 의미없는 로고 alt 패턴 ("로고", "logo", "CI" 등)
const GENERIC_ALT_RE = /^(로고|로고\s*이미지|홈페이지\s*로고|홈페이지\s*이미지|logo(\s*img)?|symbol|ci|emblem|이미지|홈페이지|home|homepage|home\s*page|welcome|welcome\s*to|welcome\s*homepage|main|index|메인|대문|인트로|intro)$/i;

// 홈페이지 로고 이미지 alt → og:site_name → title 순으로 기관명 추출
async function extractSiteName(homeUrl) {
  try {
    const res = await fetch(homeUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return '';
    const html = await res.text();
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

    const logoAlts = [];
    $(LOGO_SEL).each((_, el) => {
      const alt = $(el).attr('alt')?.trim();
      if (alt && alt.length > 1 && !GENERIC_ALT_RE.test(alt)) logoAlts.push(alt);
    });
    if (logoAlts.length > 0) return logoAlts[0];

    // 2) og:site_name
    const ogSiteName = $('meta[property="og:site_name"]').attr('content')?.trim();
    if (ogSiteName && ogSiteName.length > 1 && !GENERIC_ALT_RE.test(ogSiteName)) return ogSiteName;

    // 3) <title> 태그 — 구분자(|·-·:·>)로 분리 후 첫 파트
    const title = $('title').first().text().trim();
    if (title) {
      const firstPart = title.split(/\s*[|\-:：>]\s*/)[0].trim();
      if (firstPart.length > 1 && !GENERIC_ALT_RE.test(firstPart)) return firstPart;
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
      if (!text || GENERIC_ALT_RE.test(text)) continue;
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
      const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const xml = await res.text();
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

async function extractUrlsFromNav(pageUrl) {
  const origin = new URL(pageUrl).origin;
  let html;
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
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
    const res = await fetch(pageUrl, { signal: AbortSignal.timeout(8000) });
    html = await res.text();
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  const $ = cheerio.load(html);
  // url → { text, depth }
  const urlMap = new Map();

  // 유틸리티 버튼 텍스트 제외 패턴
  const UTIL_TEXT_RE = /^(더보기|more|전체보기|view\s*all|자세히\s*보기|바로\s*가기|닫기|열기|검색|search|top|위로|홈|home|go)$/i;

  const addLink = (a) => {
    try {
      // href 또는 onclick/data-* 에서 URL 추출
      const rawHref = resolveHref(a, $, pageUrl);
      if (!rawHref) return;

      const href = new URL(rawHref, pageUrl).href;
      if (!href.startsWith(origin)) return;
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });
  try {
    const { url } = req.body;
    const origin = new URL(url).origin;
    const homeUrl = origin + '/';

    const [sitemapUrls, mapFromInput, mapFromHome, siteName] = await Promise.all([
      extractUrlsFromSitemap(origin),
      extractUrlsFromNav(url),
      homeUrl !== url ? extractUrlsFromNav(homeUrl) : Promise.resolve(new Map()),
      extractSiteName(homeUrl),
    ]);

    const navMap = new Map([...mapFromHome, ...mapFromInput]);
    const navUrls = [...navMap.keys()];

    let urlList;
    let source;
    if (sitemapUrls && sitemapUrls.length > 0) {
      // sitemap + nav 합산: sitemap에 없는 하위 메뉴 URL도 포함
      const sitemapSet = new Set(sitemapUrls);
      urlList = [...sitemapUrls, ...navUrls.filter(u => !sitemapSet.has(u))];
      source = 'sitemap+nav';
    } else {
      urlList = navUrls;
      source = 'nav';
    }

    // 로그인·메인 제외 + 중복 제거 (쿼리 파라미터 순서 무관하게 정규화)
    const seen = new Map();
    for (const u of urlList) {
      try {
        const parsed = new URL(u);
        const { pathname } = parsed;

        // 로그인 페이지 제외
        if (/login/i.test(pathname)) continue;
        // 메인 페이지 제외 (루트 / 또는 /main.do)
        if (pathname === '/' || pathname === '' || /\/main\.do$/i.test(pathname)) continue;
        // 게시판·공지·갤러리 등 제외
        // /board, /boardCnts, /boardList 등 board 로 시작하는 경로 모두 포함
        if (/\/board/i.test(pathname)) continue;
        if (/\/(bbs|notice|news|gallery|photo|album|file|download|upload)\b/i.test(pathname)) continue;
        // /data 는 루트 첫 세그먼트인 경우만 제외 (/common/data/open.do 같은 경로는 허용)
        if (/^\/data\b/i.test(pathname)) continue;
        // 지도 제외
        if (/\/map\b/i.test(pathname)) continue;
        // 팝업·프린트·RSS 제외
        if (/\/(popup|print|rss)\b/i.test(pathname)) continue;

        // 쿼리 파라미터를 정렬해서 정규화 (순서가 달라도 같은 URL로 처리)
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

    res.json({ items, source, total: items.length, siteName });
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
}
