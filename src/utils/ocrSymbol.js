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
// "키워드: 내용" 형식과 "키워드 내용" 형식 모두 지원
export function parseSymbolOcr(text) {
  const lines = text.split('\n')
    .map(l => l.replace(/^[\s\-\*\/·•○◦▸▷►◆▪▫]+/, '').trim())  // 앞쪽 불릿·기호 제거
    .filter(Boolean);
  const sections = [];
  let current = null;

  for (const line of lines) {
    // "교훈: ..." 또는 "교목/ 은행나무" 등 구분자(: / /) 포함 형식 체크
    const colonMatch = line.match(new RegExp(`^(${ALL_SECTION_KW.join('|')})\\s*[：:/／]\\s*(.+)`));
    if (colonMatch) {
      if (current) sections.push(current);
      current = { keyword: colonMatch[1], title: colonMatch[1], descLines: [colonMatch[2].replace(/^[\s\/\-]+/, '').trim()] };
      continue;
    }

    // 키워드로 시작하는 줄 = 새 섹션 시작
    const kw = ALL_SECTION_KW.find(k =>
      line === k || line.startsWith(k + ' ') || line.startsWith(k + '\t') || line.startsWith(k + ':') || line.startsWith(k + '/')
    );
    if (kw) {
      if (current) sections.push(current);
      const rest = line.slice(kw.length).replace(/^[\s:/\/]+/, '').trim();
      current = { keyword: kw, title: rest ? `${kw} ${rest}` : kw, descLines: [] };
    } else if (current) {
      current.descLines.push(line);
    }
  }
  if (current) sections.push(current);

  const items = [];
  let sloganText = '';
  let hasSong = false;

  // 존재 여부 표시에 불과한 단어 (교표: 있음 등)는 설명으로 사용하지 않음
  const FILLER_WORDS = new Set(['있음', '없음', '있다', '없다', '있습니다', '없습니다', '해당없음', '해당 없음']);

  for (const s of sections) {
    const rawDesc = s.descLines.join(' ').trim();
    const desc = FILLER_WORDS.has(rawDesc) ? '' : rawDesc;
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
      sloganText = desc || s.title.slice('교훈'.length).replace(/^[\s:]+/, '').trim();
    } else if (s.keyword === '교가') {
      hasSong = true;
    }
  }

  return { items, sloganText, hasSong };
}

// 파싱된 아이템을 parseSymbolSource가 처리할 수 있는 synthetic HTML로 변환
// songImgUrl: 교가 악보 이미지 URL (옵셔널)
// symbolImgUrl: 상징 아이템에 사용할 이미지 URL — 통 이미지일 때 원본 이미지 URL을 전달
export function buildSyntheticSymbolHtml(items, sloganText, songImgUrl = '', symbolImgUrl = '') {
  const sloganPart = sloganText
    ? `<div class="slogan"><h4>교훈</h4><p>${sloganText}</p></div>`
    : '';
  const itemsPart = items
    .map(item => {
      const imgTag = symbolImgUrl
        ? `<img src="${symbolImgUrl}" alt="${item.title} 이미지">`
        : '';
      return `<div>${imgTag}<h4>${item.title}</h4><p>${item.desc || ''}</p></div>`;
    })
    .join('');
  const songPart = songImgUrl
    ? `<div class="song"><h4>교가</h4><div><img src="${songImgUrl}" alt="교가 악보"></div></div>`
    : '';
  // songPart는 .symbol 밖에 위치해야 parseSymbolSource가 교가 이미지를 상징 아이템으로 오인하지 않음
  return `<div class="symbol">${sloganPart}${itemsPart}</div>${songPart}`;
}

// 추출된 HTML에서 교가 악보 이미지 URL을 찾아 반환
export function findSongImageFromHtml(html, baseUrl) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // 1순위: class에 "song" 또는 "gyoga" 포함 요소 내 img
  for (const el of doc.querySelectorAll('[class*="song"], [class*="gyoga"], [class*="Song"]')) {
    const img = el.querySelector('img[src]');
    if (img) {
      const src = img.getAttribute('src');
      if (src && !NOISE_IMG.test(src)) {
        try { return new URL(src, baseUrl).href; } catch {}
      }
    }
  }

  // 2순위: "교가" 텍스트를 포함한 짧은 요소 근처의 img 탐색
  const gyogaEls = Array.from(
    doc.querySelectorAll('h2, h3, h4, h5, dt, th, p, span, b, strong')
  ).filter(el => {
    const t = el.textContent.trim();
    return t.includes('교가') && t.length < 10;
  });

  for (const el of gyogaEls) {
    let node = el.parentElement;
    let depth = 0;
    while (node && node !== doc.body && depth < 6) {
      const img = node.querySelector('img[src]');
      if (img) {
        const src = img.getAttribute('src');
        if (src && !NOISE_IMG.test(src)) {
          try { return new URL(src, baseUrl).href; } catch {}
        }
      }
      node = node.parentElement;
      depth++;
    }
  }

  return null;
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
