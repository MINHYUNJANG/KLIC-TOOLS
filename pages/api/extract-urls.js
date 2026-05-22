import * as cheerio from 'cheerio';
import { launchBrowser } from '../../lib/playwright-helper.js';

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

async function extractUrlsFromNav(pageUrl) {
  const origin = new URL(pageUrl).origin;
  let html;
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    html = await page.content();
  } catch {
    const res = await fetch(pageUrl, { signal: AbortSignal.timeout(8000) });
    html = await res.text();
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  const $ = cheerio.load(html);
  // url → { text, depth } — 더 깊이 중첩된(자식) 링크를 우선
  const urlMap = new Map();
  const NAV_SEL = 'nav, #gnb, #lnb, .gnb, .lnb, .nav, .menu, .navigation, header ul, #menu, .top-menu, .site-map';

  const addLink = (a) => {
    try {
      const href = new URL($(a).attr('href'), pageUrl).href;
      if (href.startsWith(origin) && !href.match(/\.(jpg|jpeg|png|gif|pdf|zip|hwp|docx?)(\?|$)/i)) {
        // 하위 링크 텍스트를 제외한 직접 텍스트만 추출
        const text = $(a).clone().find('a').remove().end().text().replace(/\s+/g, ' ').trim()
          || $(a).text().replace(/\s+/g, ' ').trim();
        if (!text) return;

        const depth = $(a).parents().length;
        const existing = urlMap.get(href);
        // 처음 발견이거나, 더 깊은 위치(자식 메뉴)면 덮어쓰기
        if (!existing || depth > existing.depth) {
          urlMap.set(href, { text, depth });
        }
      }
    } catch {}
  };

  $(NAV_SEL).find('a[href]').each((_, a) => addLink(a));
  // NAV_SEL에 없는 사이드메뉴(vNav, depth1 등 학교 CMS별 커스텀 클래스)도 포함하기 위해 항상 전체 스캔
  // addLink 내부에서 urlMap으로 중복 처리하므로 이중 실행 무관
  $('a[href]').each((_, a) => addLink(a));

  // text만 꺼내서 반환
  return new Map([...urlMap.entries()].map(([url, { text }]) => [url, text]));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });
  try {
    const { url } = req.body;
    const origin = new URL(url).origin;
    const homeUrl = origin + '/';

    const [sitemapUrls, mapFromInput, mapFromHome] = await Promise.all([
      extractUrlsFromSitemap(origin),
      extractUrlsFromNav(url),
      homeUrl !== url ? extractUrlsFromNav(homeUrl) : Promise.resolve(new Map()),
    ]);

    const navMap = new Map([...mapFromHome, ...mapFromInput]);

    let urlList;
    let source;
    if (sitemapUrls && sitemapUrls.length > 0) {
      urlList = sitemapUrls;
      source = 'sitemap';
    } else {
      urlList = [...navMap.keys()];
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
        // 게시판·공지·갤러리 등 목록/상세 글 제외
        if (/\/(board|bbs|notice|news|gallery|photo|album|data|file|download|upload)\b/i.test(pathname)) continue;
        // 지도 제외
        if (/map/i.test(pathname)) continue;
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

    res.json({ items, source, total: items.length });
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
}
