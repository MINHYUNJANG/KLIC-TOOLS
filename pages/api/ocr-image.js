import Groq from 'groq-sdk';

let _client = null;

function getClient() {
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
}

function mimeFromContentType(ct) {
  const t = ct.split(';')[0].trim().toLowerCase();
  if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(t)) return t;
  if (t.includes('png')) return 'image/png';
  if (t.includes('gif')) return 'image/gif';
  if (t.includes('webp')) return 'image/webp';
  return 'image/jpeg';
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl이 필요합니다.' });
  if (!isSafeUrl(imageUrl)) return res.status(400).json({ error: '허용되지 않는 URL입니다.' });

  try {
    const resp = await fetch(imageUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return res.json({ text: '' });

    const mediaType = mimeFromContentType(resp.headers.get('content-type') || 'image/jpeg');
    const buf = await resp.arrayBuffer();
    const imageData = Buffer.from(buf).toString('base64');

    const result = await getClient().chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mediaType};base64,${imageData}` } },
          { type: 'text', text: '이 이미지에 텍스트가 있으면 모두 추출해주세요. 텍스트만 반환하고 설명은 생략하세요. 텍스트가 없으면 빈 문자열을 반환하세요.' },
        ],
      }],
    });

    const text = result.choices[0].message.content.trim();
    const cleanText = ['빈 문자열', '텍스트가 없습니다', '없음', ''].includes(text) ? '' : text;
    return res.json({ text: cleanText });
  } catch (e) {
    return res.status(500).json({ error: e.message, text: '' });
  }
}
