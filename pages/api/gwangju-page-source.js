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

async function fetchHtml(url) {
  const response = await fetch(url, {
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

  return new TextDecoder(charset, { fatal: false }).decode(buffer);
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
    const html = await fetchHtml(url);
    const $ = cheerio.load(html, { decodeEntities: false });
    const selectors = ['#content', '#subPage'];
    const selector = selectors.find(item => $(item).first().length);

    if (!selector) {
      return res.status(404).json({ error: '#content 또는 #subPage 영역을 찾지 못했습니다.' });
    }

    const $source = $(selector).first().clone();
    absolutizeSource($, $source, url);

    res.json({
      selector,
      html: $.html($source),
    });
  } catch (error) {
    res.status(500).json({ error: error.message || '소스 크롤링에 실패했습니다.' });
  }
}
