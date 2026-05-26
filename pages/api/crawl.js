import { crawl } from '../../lib/crawler.js';

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
    const { url, selector = '' } = req.body;
    const result = await withTimeout(crawl(url, selector));
    if (!result.success) return res.status(400).json({ detail: result.error });
    res.json(result);
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
}
