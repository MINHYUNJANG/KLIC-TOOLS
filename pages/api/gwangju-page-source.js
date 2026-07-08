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
    $source.find('#subTop, #leftMn, .guide_box').remove();
    absolutizeSource($, $source, finalUrl);

    res.json({
      selector: target.selector,
      html: $.html($source),
    });
  } catch (error) {
    res.status(500).json({ error: error.message || '소스 크롤링에 실패했습니다.' });
  }
}
