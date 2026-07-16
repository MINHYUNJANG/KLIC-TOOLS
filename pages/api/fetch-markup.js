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
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL이 필요합니다.' });
  if (!isSafeUrl(url)) return res.status(400).json({ error: '허용되지 않는 URL입니다.' });

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return res.status(response.status).json({ error: `페이지를 가져올 수 없습니다. (${response.status})` });

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
    res.json({ html });
  } catch (err) {
    res.status(500).json({ error: `요청 실패: ${err.message}` });
  }
}
