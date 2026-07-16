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
  // 3뎁스 메뉴 텍스트 앞에 원본 사이트가 붙여둔 "- " 표시는 들여쓰기를 흉내낸
  // 장식일 뿐 실제 메뉴명이 아니므로 제거한다.
  return String(value || '').replace(/\s+/g, ' ').trim().replace(/^-+\s*/, '');
}

// 주의: href/url에 대해 "board"/"bbs"/"brd"/"pds"/"data"처럼 범용적인 경로 문자열까지
// 게시판 신호로 취급하면, 학교 CMS 전체가 게시판 엔진(xboard/board.php 등) 위에서
// 동작하는 사이트에서 "교사마당/학부모마당/행정마당"류의 실제 메뉴 콘텐츠까지
// 통째로 제외되는 오탐이 발생한다(예: hdps.gen.kg.kr). 실제 "다건의 글 목록형"
// 게시판인지는 메뉴 이름(텍스트)에 가장 먼저, 가장 명확하게 드러나므로 텍스트
// 키워드를 우선 판별하고, URL만으로 판별할 때는 게시판 성격이 뚜렷한 강한
// 신호(공지/갤러리/앨범/사진/qna)만 남긴다.
function isBoardLike(text, href, url) {
  if (/(게시판|공지사항|가정통신문|자료실|갤러리|앨범|사진|자유게시|묻고답|질문|답변|q\s*&\s*a|\bqna\b)/i.test(text)) return true;
  const urlCombined = `${href} ${url}`.toLowerCase();
  if (/(notice|gallery|album|photo|\bqna\b)/i.test(urlCombined)) return true;
  // board.php?id=.../bbs.php?id=... 형태는 tbnum=·page_code=처럼 사이트마다 다른
  // 콘텐츠 배포 방식과 달리, "id="가 게시글 번호를 뜻하는 가장 흔한 게시판 스크립트
  // 관례라서 게시판으로 판단해 제외한다.
  if (isBoardEngineUrl(url) && /[?&]id=/i.test(url)) return true;
  return false;
}

function isExcludedMenuLink($, el, text, href, url, preserveBoardHeading = false) {
  const $el = $(el);
  const target = normalizeText($el.attr('target')).toLowerCase();
  const onclick = normalizeText($el.attr('onclick')).toLowerCase();
  const rel = normalizeText($el.attr('rel')).toLowerCase();
  const combined = `${text} ${href} ${url} ${onclick}`.toLowerCase();

  if (target === '_blank' || rel.includes('external')) return true;
  if (/window\.open|openpopup|popup|newwindow|새창/.test(combined)) return true;

  // xboard/board.php, bbs.php 등 게시판 엔진 주소는 depth·라벨 텍스트와 무관하게
  // 무조건 제외한다. 일부 학교 사이트는 실제 콘텐츠 페이지도 게시판 엔진으로
  // 서비스하지만(예: hdps.gen.kg.kr), 게시판 엔진 URL을 메뉴로 그대로 가져오면
  // 게시글까지 함께 열람하게 되는 결과라 사용 목적(정적 마크업 변환)에 맞지 않는다.
  if (isBoardEngineUrl(url)) return true;

  if (!preserveBoardHeading && isBoardLike(text, href, url)) return true;

  if (/(통합검색|검색|로그인|로그아웃|회원|회원가입|마이페이지|비밀번호|인증|관리자|login|logout|member|mypage|auth|sso|password|search|find)/i.test(combined)) {
    return true;
  }
  if (/(?:^|[/.?=&_-])admin(?:login|index|\/|\.php|$)|administrator(?:\/|login)/i.test(combined)) {
    return true;
  }

  // 급식/영양 소식, 배너모음처럼 실제 페이지 콘텐츠가 아니라 이미지·첨부 위주인 메뉴는 제외.
  if (/(급식|영양|배너모음|banner)/i.test(`${text} ${href}`.toLowerCase())) return true;

  // 연간학사일정은 달력형 위젯이라 마크업 변환 대상이 아니다.
  if (/연간\s*학사\s*일정|학사\s*일정/i.test(text)) return true;

  // 글자크기 조절, 인쇄, 즐겨찾기 등 실제 페이지가 아니라 헤더에 흔히 함께 붙어있는
  // 유틸리티 도구모음(util bar) 항목은 메뉴로 취급하지 않는다.
  if (/^(글자\s*크기|글자\s*크게|글자\s*작게|글씨\s*크기|글씨\s*크게|글씨\s*작게|폰트\s*크기|텍스트\s*크기|화면\s*크기|확대|축소|인쇄|즐겨찾기|스크랩|공유하기|화면낭독|음성지원|고대비|다국어|language|font\s*size)$/i.test(text)) {
    return true;
  }

  return false;
}

// 실제 페이지 내용이 로그인 폼이거나 로그인 페이지로 리다이렉트된 경우, 그 메뉴는
// 마크업 변환 대상이 될 수 없으므로 크롤링에서 제외한다.
// 주의: "아이디...비밀번호" 근접 매칭은 헤더 메뉴의 "아이디찾기/비밀번호발급" 링크
// 텍스트만으로도 오탐되어(사이트 전체 페이지가 로그인 필요로 오판됨) 제거했다.
// 대신 xboard 등에서 흔한 "document.location.replace(...mode=login...)" 형태의
// JS 클라이언트 리다이렉트를 로그인 페이지 신호로 추가했다.
// 추가 주의: `input[type="password"]` 존재 여부만으로 판단하는 것도 마찬가지로
// 오탐이 심하다 — 상당수 학교 사이트가 모든 페이지의 헤더/사이드에 "빠른 로그인"
// 레이어(예: id="new_mainlog_cont")와 숨겨진 회원가입 팝업 폼을 항상 함께 렌더링해서,
// 실제로는 평범한 콘텐츠 페이지인데도 비밀번호 입력창이 있다는 이유만으로 사이트
// 전체 메뉴가 로그인 페이지로 오판되어 통째로 제외되는 사례(hdps.gen.kg.kr)가
// 있어 제거했다. 실제 "이 페이지 자체가 로그인 페이지"인 경우는 URL 패턴/JS
// 리다이렉트/명시적 안내 문구로 충분히 잡힌다.
function isLoginPage($, finalUrl, html) {
  if (/login|signin|member\/login|memberLogin/i.test(finalUrl)) return true;
  if (/location\s*\.\s*(?:replace|href)\s*\(\s*['"][^'"]*mode=login/i.test(html)) return true;
  const bodyText = normalizeText($('body').text()).slice(0, 800);
  if (/로그인\s*(이|을)\s*(필요|해주세요)|로그인\s*후\s*(이용|열람)/.test(bodyText)) return true;
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

    // 일부 사이트는 응답 헤더/메타 태그가 실제 바이트 인코딩과 다르게(잘못) utf-8을
    // 선언해두는 경우가 있다(예: 헤더는 euc-kr인데 메타 태그만 utf-8로 잘못 박혀있는 경우).
    // utf-8로 판단됐을 때 실제로 유효한 utf-8 바이트열인지 검증해, 아니면 euc-kr로 재시도한다.
    // 주의: "완전히 유효한가"만 보면 안 된다 — 스크립트·바이너리 조각에 섞인 바이트 하나만
    // 깨져도 문서 전체가 사실은 정상 utf-8인데 통째로 euc-kr로 오판되어 오히려 멀쩡한
    // 페이지를 깨뜨린다(jihan.gen.kg.kr에서 실제 재현됨). 대신 utf-8로 느슨하게 디코딩했을
    // 때 나오는 대체문자(U+FFFD) 비율이 낮으면(잡음 수준) utf-8을 유지하고, 문서 전체가
    // 깨질 정도로 비율이 높을 때만(예: kj-art.gen.hs.kr처럼 실제로는 euc-kr인 경우) 전환한다.
    if (charset === 'utf-8') {
      const lenient = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      const replacementCount = (lenient.match(/�/g) || []).length;
      if (replacementCount >= 3 && replacementCount / lenient.length > 0.01) {
        charset = 'euc-kr';
      }
    }

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
    if (/^(home|홈|홈으로|통합검색|검색|로그인|로그아웃|회원|회원가입|사이트맵|language|전체메뉴|메뉴|menu|메뉴보기|더\s*보기)$/i.test(text)) return;

    const href = normalizeText($(el).attr('href'));
    let url = '';
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      try {
        url = new URL(href, pageUrl).href;
      } catch {}
    }

    const $root = $(el).closest('#header, #topMenu, #topmenuNavi, #gnb');
    const rootListDepth = $root.parents('ul, ol').length;
    const linkListDepth = $(el).parents('ul, ol').length;
    const depth = Math.max(1, linkListDepth - rootListDepth);
    if (isExcludedMenuLink($, el, text, href, url, depth === 1)) return;
    if (isDifferentDomain(url, siteHostname)) return;

    const key = `${text}|${url}`;
    if (seen.has(key)) return;
    seen.add(key);

    menus.push({ label: text, url, depth });
  });

  return menus;
}

function extractFooterPolicyMenus(html, pageUrl, siteHostname) {
  const $ = cheerio.load(html);
  const $footerRoots = $('#footer, footer, .footer, .footer_link, .f-menu, .fnb');
  if (!$footerRoots.length) return [];

  const policyPattern = /개인정보\s*(?:처리|보호)?\s*방침|영상정보\s*(?:처리기기)?\s*(?:운영\s*[·ㆍ및]?\s*관리\s*)?방침|저작권\s*(?:보호\s*)?(?:정책|지침|방침)|이메일\s*무단\s*수집\s*거부/i;
  const seen = new Set();
  const menus = [];

  $footerRoots.find('a').each((_, el) => {
    const text = normalizeText($(el).text() || $(el).attr('title') || $(el).attr('aria-label'));
    if (!text || !policyPattern.test(text)) return;

    const href = normalizeText($(el).attr('href'));
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    let url;
    try {
      url = new URL(href, pageUrl).href;
    } catch {
      return;
    }
    if (isDifferentDomain(url, siteHostname)) return;

    const key = `${text}|${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    menus.push({ label: text, url, depth: 2 });
  });

  return menus;
}

// xboard/board.php, bbs.php 등 게시판 엔진 URL인지 판별한다. 게시판 목록/글 페이지는
// 방문해서 "형제 탭"을 뒤져봐야 나오는 것이 실제로는 게시글 제목·글쓴이 검색 링크 등
// 게시판 내용 그 자체라서, 메뉴 크롤링 결과에 게시글이 수십 개씩 끼어드는 원인이 된다.
// 메뉴 항목 자체(예: 게시판으로 서비스되는 "입학안내")는 계속 크롤링하되, 그 안에서
// 형제 탭을 찾겠다고 게시판 페이지를 추가로 열어보는 것만 막는다.
function isBoardEngineUrl(url) {
  if (!url) return false;
  try {
    return /\/(?:x?board|bbs)\.php$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

// 메뉴 하나의 실제 페이지 안에 "규정/명단/게시판"처럼 sid=로 서로 연결된 탭이 있는 경우가
// 있다. 사이트마다 URL 파라미터 방식이 달라서(id=35&sid=35 처럼 sid를 쓰는 곳도 있고,
// page_code=education_12_05 / education_12_04 처럼 접두사만 공유하는 곳도 있다) URL
// 패턴으로 판별하지 않고, 링크(또는 그 조상)의 class/id에 "tab"이 들어있는지로 범용적으로
// 탭 목록을 찾는다. 그중 게시판 성격의 탭과 현재 페이지 자기 자신은 제외한다.
function isInsideTabContainer($, el) {
  let node = el;
  for (let depth = 0; node && depth < 6; depth++) {
    const cls = ($(node).attr && $(node).attr('class')) || '';
    const id = ($(node).attr && $(node).attr('id')) || '';
    if (/tab/i.test(cls) || /tab/i.test(id)) return true;
    node = node.parent;
  }
  return false;
}

function extractSiblingTabs(html, pageUrl, siteHostname) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const tabs = [];

  $('a[href]').each((_, el) => {
    if (!isInsideTabContainer($, el)) return;

    const href = normalizeText($(el).attr('href'));
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    let url;
    try { url = new URL(href, pageUrl); } catch { return; }
    url.hash = ''; // 페이지 내 바로가기 앵커(#chapter2 등)는 별도 탭이 아니라 같은 페이지다.
    // 주의: 예전에는 "현재 탭(자기 자신)"을 여기서 걸러냈지만, 일부 사이트는 자기 자신을
    // 가리키는 탭에 메뉴명보다 더 구체적인 라벨을 쓴다(예: 메뉴명 "운영위원회" → 탭 라벨
    // "규정"). URL이 같아도 그 라벨은 실제 콘텐츠가 무엇인지 알려주는 유의미한 정보라서
    // 여기서 제외하지 않고, 호출부(expandMenusWithTabs)에서 라벨이 다를 때만 살린다.
    if (isDifferentDomain(url.href, siteHostname)) return;

    const text = normalizeText($(el).text() || $(el).attr('title'));
    if (!text || text.length < 2) return;
    if (/^더\s*보기$/i.test(text)) return; // 게시판 위젯의 "더보기"는 탭이 아니라 목록 링크일 뿐이다.
    if (isBoardLike(text, href, url.href)) return; // 탭 중 게시판은 제외
    if (isBoardEngineUrl(url.href)) return; // xboard/board.php 등 게시판 엔진 주소 자체도 제외
    // 게시판이 아닌 페이지(예: 메인 홈페이지의 "최근 게시글" 위젯)에도 게시글로
    // 바로 연결되는 링크가 tab류 컨테이너 안에 섞여 있는 경우가 있다. number=(글
    // 번호)나 searchword=/keyset=(글쓴이 검색) 파라미터가 있으면 게시글 자체를
    // 가리키는 링크이므로, 발견된 페이지가 게시판이 아니어도 탭으로 취급하지 않는다.
    if (/[?&](?:number|searchword|keyset)=/i.test(url.search)) return;

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
  const infoByIndex = await mapWithConcurrency(menus, 5, async menu => {
    if (!menu.url) return { tabs: [], isLogin: false };
    if (isBoardEngineUrl(menu.url)) return { tabs: [], isLogin: false }; // 게시판 페이지는 열어보지 않는다
    try {
      const { html, finalUrl } = await fetchHtml(menu.url);
      const $ = cheerio.load(html);
      if (isLoginPage($, finalUrl, html)) return { tabs: [], isLogin: true };
      const tabs = extractSiblingTabs(html, finalUrl, siteHostname);
      return { tabs, isLogin: false };
    } catch {
      return { tabs: [], isLogin: false };
    }
  });

  const seenUrls = new Set(menus.map(m => m.url));
  const expanded = [];
  menus.forEach((menu, idx) => {
    if (infoByIndex[idx].isLogin) return; // 로그인이 필요한 메뉴는 제외
    expanded.push(menu);
    infoByIndex[idx].tabs.forEach(tab => {
      if (tab.url === menu.url) {
        // 자기 자신을 가리키는 탭: 라벨이 메뉴명과 실질적으로 같으면(정보 가치가 없으므로)
        // 건너뛰고, 다르면(예: "운영위원회" → "규정") 같은 URL이라도 그 탭 라벨을 그대로
        // 살려 첫 번째 하위 메뉴로 추가한다.
        if (tab.label === menu.label) return;
        expanded.push({ label: tab.label, url: tab.url, depth: menu.depth + 1 });
        return;
      }
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
    const footerPolicyMenus = extractFooterPolicyMenus(html, finalUrl, siteHostname);
    const menusWithTabs = await expandMenusWithTabs(menus, siteHostname);
    const existingUrls = new Set(menusWithTabs.map(menu => menu.url).filter(Boolean));
    const uniqueFooterPolicyMenus = footerPolicyMenus.filter(menu => !existingUrls.has(menu.url));
    const allMenus = uniqueFooterPolicyMenus.length
      ? [...menusWithTabs, { label: '이용안내', url: '', depth: 1 }, ...uniqueFooterPolicyMenus]
      : menusWithTabs;
    res.json({ siteName, menus: allMenus });
  } catch (error) {
    res.status(500).json({ error: error.message || '크롤링에 실패했습니다.' });
  }
}
