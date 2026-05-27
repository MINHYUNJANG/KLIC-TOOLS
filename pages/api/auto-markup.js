import { crawl } from '../../lib/crawler.js';
import { autoMarkup, footerAutoMarkup } from '../../lib/ai-mapper.js';

const TIMEOUT_MS = 120000;

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')), TIMEOUT_MS)
    ),
  ]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });
  try {
    const { url, selector = '', html: directHtml = '', context = '' } = req.body;

    let crawled;
    if (directHtml) {
      crawled = { success: true, html: directHtml, text: '', images: [], school_name: '' };
    } else {
      crawled = await withTimeout(crawl(url, selector));
      if (!crawled.success) return res.status(400).json({ detail: crawled.error });
    }

    const markupFn = context === 'footer' ? footerAutoMarkup : autoMarkup;
    const html = await withTimeout(markupFn(crawled));
    res.json({ html, crawled });
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
}
