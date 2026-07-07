import * as cheerio from 'cheerio';

function isSafeUrl(url) {
  try {
    const { hostname, protocol } = new URL(url);
    if (!['http:', 'https:'].includes(protocol)) return false;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|::1)/.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isExcludedMenuLink($, el, text, href, url) {
  const $el = $(el);
  const target = normalizeText($el.attr('target')).toLowerCase();
  const onclick = normalizeText($el.attr('onclick')).toLowerCase();
  const rel = normalizeText($el.attr('rel')).toLowerCase();
  const combined = `${text} ${href} ${url} ${onclick}`.toLowerCase();

  if (target === '_blank' || rel.includes('external')) return true;
  if (/window\.open|openpopup|popup|newwindow|새창/.test(combined)) return true;

  if (/(게시판|공지사항|가정통신문|자료실|갤러리|앨범|사진|자유게시|묻고답|질문|답변|q\s*&\s*a|\bqna\b|board|bbs|brd|notibbs|notice|gallery|album|photo|pds|data)/i.test(combined)) {
    return true;
  }

  if (/(통합검색|검색|로그인|로그아웃|회원|회원가입|마이페이지|비밀번호|인증|관리자|login|logout|member|mypage|auth|sso|admin|password|search|find)/i.test(combined)) {
    return true;
  }

  return false;
}

async function fetchHtml(url) {
  let currentUrl = url;
  for (let i = 0; i < 5; i++) {
    const response = await fetch(currentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      throw new Error(`페이지를 가져올 수 없습니다. (${response.status})`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || '';
    let charset = 'utf-8';
    const ctMatch = contentType.match(/charset=([^\s;]+)/i);
    if (ctMatch) charset = ctMatch[1].toLowerCase();

    const preview = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, 4096));
    const metaMatch = preview.match(/<meta[^>]+charset=["']?\s*([^"'\s;>]+)/i);
    if (metaMatch) charset = metaMatch[1].toLowerCase();
    if (['euc-kr', 'ks_c_5601-1987', 'x-windows-949', 'cp949'].includes(charset)) charset = 'euc-kr';

    const html = new TextDecoder(charset, { fatal: false }).decode(buffer);
    const refreshMatch = html.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url=([^"']+)["']/i);
    if (refreshMatch?.[1]) {
      const nextUrl = new URL(refreshMatch[1].trim(), currentUrl).href;
      if (nextUrl !== currentUrl) {
        currentUrl = nextUrl;
        continue;
      }
    }

    return { html, finalUrl: currentUrl };
  }

  throw new Error('페이지 이동이 너무 많습니다.');
}

function extractHeaderMenus(html, pageUrl) {
  const $ = cheerio.load(html);
  const $menuRoots = $('#header, #topMenu, #topmenuNavi, #gnb');
  if (!$menuRoots.length) return [];

  const seen = new Set();
  const menus = [];

  $menuRoots.find('a').each((_, el) => {
    const text = normalizeText($(el).text() || $(el).attr('title') || $(el).attr('aria-label'));
    if (!text || text.length < 2) return;
    if (/^(home|홈|홈으로|통합검색|검색|로그인|로그아웃|회원|회원가입|사이트맵|language|전체메뉴|메뉴|menu|메뉴보기)$/i.test(text)) return;

    const href = normalizeText($(el).attr('href'));
    let url = '';
    if (href && href !== '#' && !href.startsWith('javascript:')) {
      try {
        url = new URL(href, pageUrl).href;
      } catch {}
    }
    if (isExcludedMenuLink($, el, text, href, url)) return;

    const key = `${text}|${url}`;
    if (seen.has(key)) return;
    seen.add(key);

    const $root = $(el).closest('#header, #topMenu, #topmenuNavi, #gnb');
    const rootListDepth = $root.parents('ul, ol').length;
    const linkListDepth = $(el).parents('ul, ol').length;
    const depth = Math.max(1, linkListDepth - rootListDepth);
    menus.push({ label: text, url, depth });
  });

  return menus;
}

function cleanSiteName(value) {
  const text = normalizeText(value)
    .replace(/^\s*\uacf5\ub9bd\s+/, '')
    .replace(/\s*\ud648\ud398\uc774\uc9c0\s*$/i, '')
    .replace(/\s*-\s*.*$/, '')
    .trim();

  const schoolNameMatches = [...text.matchAll(/([\uac00-\ud7a3A-Za-z0-9\u00b7\u318d.]{2,30}(?:\uc720\uce58\uc6d0|\ucd08\ub4f1\ud559\uad50|\uc911\ud559\uad50|\uace0\ub4f1\ud559\uad50|\ud2b9\uc218\ud559\uad50|\ud559\uad50))/g)];
  if (schoolNameMatches.length) return schoolNameMatches[schoolNameMatches.length - 1][1].trim();

  return text;
}

function extractSiteName(html) {
  const $ = cheerio.load(html);
  const candidates = [
    $('meta[property="og:title"]').attr('content'),
    $('meta[property="og:site_name"]').attr('content'),
    $('meta[property="title"]').attr('content'),
    $('meta[name="title"]').attr('content'),
    $('meta[name="subject"]').attr('content'),
    $('title').first().text(),
    $('#header img[alt], #topMenu img[alt], #topmenuNavi img[alt], #gnb img[alt], img[src*="logo"][alt], img[alt*="로고"], img[alt*="유치원"], img[alt*="학교"]')
      .map((_, el) => $(el).attr('alt'))
      .get()
      .find(Boolean),
  ];

  return candidates
    .map(cleanSiteName)
    .find(name => name && !/^(logo|로고|home|홈)$/i.test(name)) || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL을 입력하세요.' });
  if (!isSafeUrl(url)) return res.status(400).json({ error: '허용되지 않는 URL입니다.' });

  try {
    const { html, finalUrl } = await fetchHtml(url);
    const siteName = extractSiteName(html);
    const menus = extractHeaderMenus(html, finalUrl);
    res.json({ siteName, menus });
  } catch (error) {
    res.status(500).json({ error: error.message || '크롤링에 실패했습니다.' });
  }
}
