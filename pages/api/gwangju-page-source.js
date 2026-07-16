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

// id="subPage"뿐 아니라 id="subpage", id="SubPage" 등 대소문자가 다른 사이트도 있어
// 정확히 일치하는 걸 먼저 찾고, 없으면 대소문자 무시하고 한 번 더 찾는다.
function findContentTarget($) {
  const names = ['content', 'subPage'];
  for (const name of names) {
    const $exact = $(`#${name}`).first();
    if ($exact.length) return { selector: `#${name}`, $el: $exact };
  }

  const lowerNames = names.map(n => n.toLowerCase());
  let result = null;
  $('[id]').each((_, el) => {
    if (result) return;
    const idVal = $(el).attr('id') || '';
    if (lowerNames.includes(idVal.toLowerCase())) {
      result = { selector: `#${idVal}`, $el: $(el) };
    }
  });
  return result;
}

function absolutizeSource($, $root, pageUrl) {
  $root.find('[src]').addBack('[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (!src) return;
    try {
      $(el).attr('src', new URL(src, pageUrl).href);
    } catch {}
  });

  $root.find('[href]').addBack('[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    try {
      $(el).attr('href', new URL(href, pageUrl).href);
    } catch {}
  });
}

function removeMobileDuplicateMarkup($, $root) {
  const mobileOnlySelectors = [
    '.m_view',
    '.m-view',
    '.mo_view',
    '.mo-view',
    '.m_only',
    '.m-only',
    '.mo_only',
    '.mo-only',
    '.mobile_view',
    '.mobile-view',
    '.mobile_only',
    '.mobile-only',
    '[data-device="mobile"]',
    '[data-view="mobile"]',
    '[data-display="mobile"]',
  ];

  $root.find(mobileOnlySelectors.join(', ')).remove();

  // 클래스 토큰의 대소문자 차이도 대응한다. "mobile-menu"처럼 기능 자체가
  // 모바일인 요소까지 넓게 지우지 않고, view/only 조합만 모바일 중복으로 본다.
  $root.find('[class]').each((_, el) => {
    const classNames = String($(el).attr('class') || '').split(/\s+/);
    if (classNames.some(name => /^(?:m|mo|mobile)[_-](?:view|only)$/i.test(name))) {
      $(el).remove();
    }
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL을 입력하세요.' });
  if (!isSafeUrl(url)) return res.status(400).json({ error: '허용되지 않는 URL입니다.' });

  try {
    const { html, finalUrl } = await fetchHtml(url);
    const $ = cheerio.load(html, { decodeEntities: false });
    const target = findContentTarget($);

    if (!target) {
      return res.status(404).json({ error: '#content 또는 #subPage 영역을 찾지 못했습니다.' });
    }

    const $source = target.$el.clone();
    $source.find('#subTop, #leftMn, .guide_box, .subConBox .leftMn, .leftquick, .btn_top').remove();
    removeMobileDuplicateMarkup($, $source);
    absolutizeSource($, $source, finalUrl);

    res.json({
      selector: target.selector,
      html: $.html($source),
    });
  } catch (error) {
    res.status(500).json({ error: error.message || '소스 크롤링에 실패했습니다.' });
  }
}
