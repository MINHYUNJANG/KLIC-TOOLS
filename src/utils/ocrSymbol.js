const SYMBOL_TYPES = ['교표', '교기', '교화', '교목'];
const ALL_SECTION_KW = ['교표', '교기', '교화', '교목', '교훈', '교가'];

// 이미지 URL을 프록시 경유 OCR (CORS 우회)
export async function ocrImageUrl(rawUrl) {
  const { default: Tesseract } = await import('tesseract.js');
  const proxied = `/api/proxy-image?url=${encodeURIComponent(rawUrl)}`;
  const result = await Tesseract.recognize(proxied, 'kor+eng', {
    logger: () => {},
  });
  return result.data.text;
}

// OCR 텍스트에서 상징 아이템 + 교훈 파싱
export function parseSymbolOcr(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const sections = [];
  let current = null;

  for (const line of lines) {
    // 키워드로 시작하는 줄 = 새 섹션 시작
    const kw = ALL_SECTION_KW.find(k =>
      line === k || line.startsWith(k + ' ') || line.startsWith(k + '\t') || line.startsWith(k + ':')
    );
    if (kw) {
      if (current) sections.push(current);
      const rest = line.slice(kw.length).replace(/^[\s:]+/, '').trim();
      current = { keyword: kw, title: rest ? `${kw} ${rest}` : kw, descLines: [] };
    } else if (current) {
      current.descLines.push(line);
    }
  }
  if (current) sections.push(current);

  const items = [];
  let sloganText = '';

  for (const s of sections) {
    const desc = s.descLines.join(' ').trim();
    if (SYMBOL_TYPES.includes(s.keyword)) {
      items.push({
        type: s.keyword,
        title: s.title,
        desc,
        src: '',
        alt: '',
        isList: false,
      });
    } else if (s.keyword === '교훈') {
      // "교훈 ○○○" 형태에서 교훈 텍스트 추출
      sloganText = desc || s.title.slice('교훈'.length).replace(/^[\s:]+/, '').trim();
    }
  }

  return { items, sloganText };
}

// 파싱된 아이템을 parseSymbolSource가 처리할 수 있는 synthetic HTML로 변환
export function buildSyntheticSymbolHtml(items, sloganText) {
  const sloganPart = sloganText
    ? `<div class="slogan"><h4>교훈</h4><p>${sloganText}</p></div>`
    : '';
  const itemsPart = items
    .map(item => `<div><h4>${item.title}</h4><p>${item.desc || '내용을 입력하세요.'}</p></div>`)
    .join('');
  return `<div class="symbol">${sloganPart}${itemsPart}</div>`;
}

// 추출된 HTML이 이미지 1장으로만 구성된 콘텐츠인지 판별
export function isImageOnlyContent(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body.textContent.replace(/\s+/g, '').trim();
  const imgs = doc.body.querySelectorAll('img[src]');
  return text.length < 50 && imgs.length > 0;
}

// 콘텐츠에서 노이즈 이미지를 제외한 실제 콘텐츠 이미지 URL 추출
const NOISE_IMG = /btn_|logo|icon|arrow|bg_|background|bullet|blank|pixel|spacer|left_menu|sub_menu|visual/i;

export function getContentImageUrls(html, baseUrl) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('img[src]'))
    .map(img => {
      const src = img.getAttribute('src');
      try { return new URL(src, baseUrl).href; } catch { return null; }
    })
    .filter(url => url && !NOISE_IMG.test(url));
}
