import * as cheerio from 'cheerio';
import { Agent } from 'undici';

// 일부 학교 사이트는 SSL 인증서 체인이 불완전해 Node의 기본 fetch가 거부한다.
// 브라우저는 관대하게 넘어가는 경우가 많으므로, 인증서 오류일 때만 검증을 완화해 재시도한다.
const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

function isCertError(err) {
  const code = err?.cause?.code || err?.code;
  return code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'CERT_HAS_EXPIRED' ||
    code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    code === 'ERR_TLS_CERT_ALTNAME_INVALID';
}

async function safeFetch(url, options = {}) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (isCertError(err)) return fetch(url, { ...options, dispatcher: insecureAgent });
    throw err;
  }
}

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

function isBoardLike(text, href, url) {
  const combined = `${text} ${href} ${url}`.toLowerCase();
  return /(게시판|공지사항|가정통신문|자료실|갤러리|앨범|사진|자유게시|묻고답|질문|답변|q\s*&\s*a|\bqna\b|board|bbs|brd|notibbs|notice|gallery|album|photo|pds|data)/i.test(combined);
}

function isExcludedMenuLink($, el, text, href, url) {
  const $el = $(el);
  const target = normalizeText($el.attr('target')).toLowerCase();
  const onclick = normalizeText($el.attr('onclick')).toLowerCase();
  const rel = normalizeText($el.attr('rel')).toLowerCase();
  const combined = `${text} ${href} ${url} ${onclick}`.toLowerCase();

  if (target === '_blank' || rel.includes('external')) return true;
  if (/window\.open|openpopup|popup|newwindow|새창/.test(combined)) return true;

  if (isBoardLike(text, href, url)) return true;

  if (/(통합검색|검색|로그인|로그아웃|회원|회원가입|마이페이지|비밀번호|인증|관리자|login|logout|member|mypage|auth|sso|admin|password|search|find)/i.test(combined)) {
    return true;
  }

  // 급식/영양 소식, 배너모음처럼 실제 페이지 콘텐츠가 아니라 이미지·첨부 위주인 메뉴는 제외.
  if (/(급식|영양|배너모음|banner)/i.test(`${text} ${href}`.toLowerCase())) return true;

  return false;
}

// 메뉴 링크가 크롤링 대상 사이트와 다른 도메인을 가리키면(외부 포털·기관 링크 등)
// target=_blank 여부와 무관하게 제외한다.
function isDifferentDomain(url, siteHostname) {
  if (!url) return false;
  try {
    return new URL(url).hostname.toLowerCase() !== siteHostname.toLowerCase();
  } catch {
    return false;
  }
}

async function fetchHtml(url) {
  let currentUrl = url;
  for (let i = 0; i < 5; i++) {
    const response = await safeFetch(currentUrl, {
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

function extractHeaderMenus(html, pageUrl, siteHostname) {
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
    if (isDifferentDomain(url, siteHostname)) return;

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

// 메뉴 하나의 실제 페이지 안에 "규정/명단/게시판"처럼 sid=로 서로 연결된 탭이 있는 경우가
// 있다. 탭 컨테이너 id는 사이트마다 다를 수 있어, id 대신 "다른 탭 링크의 sid 값이 현재
// 페이지의 id와 일치"하는 패턴으로 범용적으로 찾는다. 그중 게시판 성격의 탭은 제외한다.
function extractSiblingTabs(html, pageUrl, siteHostname) {
  let currentId;
  try { currentId = new URL(pageUrl).searchParams.get('id'); } catch { return []; }
  if (!currentId) return [];

  const $ = cheerio.load(html);
  const seen = new Set();
  const tabs = [];

  $('a[href]').each((_, el) => {
    const href = normalizeText($(el).attr('href'));
    if (!href || href === '#' || href.startsWith('javascript:')) return;
    let url;
    try { url = new URL(href, pageUrl); } catch { return; }
    if (url.searchParams.get('sid') !== currentId) return;
    if (isDifferentDomain(url.href, siteHostname)) return;

    const text = normalizeText($(el).text() || $(el).attr('title'));
    if (!text || text.length < 2) return;
    if (isBoardLike(text, href, url.href)) return; // 탭 중 게시판은 제외

    const key = `${text}|${url.href}`;
    if (seen.has(key)) return;
    seen.add(key);
    tabs.push({ label: text, url: url.href });
  });

  return tabs;
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await mapper(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// 메뉴마다 실제 페이지를 방문해 형제 탭을 찾아 게시판이 아닌 탭만 원래 메뉴 바로 뒤에
// 한 단계 깊은 depth로 끼워 넣는다. 사이트당 메뉴가 많을 수 있어 동시 요청 수를 제한한다.
async function expandMenusWithTabs(menus, siteHostname) {
  const tabsByIndex = await mapWithConcurrency(menus, 5, async menu => {
    if (!menu.url) return [];
    try {
      const { html, finalUrl } = await fetchHtml(menu.url);
      const tabs = extractSiblingTabs(html, finalUrl, siteHostname);
      return tabs.filter(tab => tab.url !== menu.url);
    } catch {
      return [];
    }
  });

  const seenUrls = new Set(menus.map(m => m.url));
  const expanded = [];
  menus.forEach((menu, idx) => {
    expanded.push(menu);
    tabsByIndex[idx].forEach(tab => {
      if (seenUrls.has(tab.url)) return;
      seenUrls.add(tab.url);
      expanded.push({ label: tab.label, url: tab.url, depth: menu.depth + 1 });
    });
  });
  return expanded;
}

function cleanSiteName(value) {
  return normalizeText(value)
    .replace(/^\s*공립\s+/, '')
    .replace(/\s*홈페이지\s*$/i, '')
    .replace(/\s*-\s*.*$/, '')
    .trim();
}

function extractSchoolSuffixName(value) {
  const text = cleanSiteName(value);
  const schoolNameMatches = [...text.matchAll(/([가-힣A-Za-z0-9·ㆍ.]{2,30}(?:유치원|초등학교|중학교|고등학교|특수학교|학교))/g)];
  return schoolNameMatches.length ? schoolNameMatches[schoolNameMatches.length - 1][1].trim() : '';
}

function extractSiteName(html) {
  const $ = cheerio.load(html);

  // 헤더/로고 영역으로 범위를 제한해야 본문 이미지 alt가 오인식되지 않는다.
  const headerLogoAlt = $('#header img[alt], #topMenu img[alt], #topmenuNavi img[alt], #gnb img[alt], img[src*="logo"][alt]')
    .map((_, el) => $(el).attr('alt'))
    .get()
    .find(Boolean);

  const candidates = [
    headerLogoAlt,
    $('meta[property="og:title"]').attr('content'),
    $('meta[property="og:site_name"]').attr('content'),
    $('meta[property="title"]').attr('content'),
    $('title').first().text(),
    $('meta[name="title"]').attr('content'),
    $('meta[name="subject"]').attr('content'),
  ];

  const isValidName = name => name && !/^(logo|로고|home|홈)$/i.test(name);

  // meta[name=subject] 등은 종종 준말(예: "진남")만 담고 있어, 학교/유치원 접미사가 붙은 완전한 이름을 우선적으로 찾는다.
  const suffixMatch = candidates.map(extractSchoolSuffixName).find(isValidName);
  if (suffixMatch) return suffixMatch;

  return candidates.map(cleanSiteName).find(isValidName) || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL을 입력하세요.' });
  if (!isSafeUrl(url)) return res.status(400).json({ error: '허용되지 않는 URL입니다.' });

  try {
    const { html, finalUrl } = await fetchHtml(url);
    const siteHostname = new URL(finalUrl).hostname;
    const siteName = extractSiteName(html);
    const menus = extractHeaderMenus(html, finalUrl, siteHostname);
    const menusWithTabs = await expandMenusWithTabs(menus, siteHostname);
    res.json({ siteName, menus: menusWithTabs });
  } catch (error) {
    res.status(500).json({ error: error.message || '크롤링에 실패했습니다.' });
  }
}
