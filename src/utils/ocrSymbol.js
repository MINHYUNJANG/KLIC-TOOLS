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
// songLyrics: { verse1, verse2 } — 교가 가사 (옵셔널)
export function buildSyntheticSymbolHtml(items, sloganText, songImgUrl = '', symbolImgUrl = '', songLyrics = null) {
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
  const lyricsAttrs = songLyrics && (songLyrics.verse1 || songLyrics.verse2)
    ? ` data-verse1="${_escAttr(songLyrics.verse1)}" data-verse2="${_escAttr(songLyrics.verse2)}"`
    : '';
  const songPart = songImgUrl
    ? `<div class="song"${lyricsAttrs}><h4>교가</h4><div><img src="${songImgUrl}" alt="교가 악보"></div></div>`
    : '';
  // songPart는 .symbol 밖에 위치해야 parseSymbolSource가 교가 이미지를 상징 아이템으로 오인하지 않음
  return `<div class="symbol">${sloganPart}${itemsPart}</div>${songPart}`;
}

function _escAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 교가 악보 이미지에서 Groq Vision으로 가사를 추출
// 반환: { verse1: string, verse2: string } 또는 null (실패 시)
export async function extractSongLyricsFromImage(songImgUrl) {
  if (!songImgUrl) return null;
  const prompt = `이 이미지는 학교 교가 악보입니다. 한국어 가사만 정확하게 추출하세요.

【악보 구조】
- 악보는 위에서 아래로 여러 줄(시스템)로 구성됩니다.
- 각 악보 줄 아래에 한국어 가사가 2행으로 인쇄되어 있습니다:
  · 첫 번째 행(윗줄) = 1절 가사
  · 두 번째 행(아랫줄) = 2절 가사
- 모든 악보 줄의 첫 번째 행을 위에서 아래로 순서대로 이어붙이면 → 1절 전체 가사
- 모든 악보 줄의 두 번째 행을 위에서 아래로 순서대로 이어붙이면 → 2절 전체 가사

【추출 규칙】
- 음표·박자표·조표·쉼표·음악 기호는 모두 무시하세요.
- 한국어 가사 텍스트만 추출하세요.
- 단어 연결용 하이픈(-)은 제거하세요.
- 가사가 1행만 있는 경우(1절만 존재): verse1과 verse2에 동일한 가사를 넣으세요.

반드시 아래 JSON 형식으로만 응답하세요 (코드블록 없이, 순수 JSON만):
{"verse1": "1절 전체 가사", "verse2": "2절 전체 가사"}
가사를 읽을 수 없거나 없는 경우: {"verse1": "", "verse2": ""}`;

  try {
    const res = await fetch('/api/ocr-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: songImgUrl, prompt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = (data.text || '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (typeof parsed.verse1 !== 'string') return null;
    const verse1 = parsed.verse1.trim();
    const verse2 = (typeof parsed.verse2 === 'string' ? parsed.verse2 : parsed.verse1).trim();
    if (!verse1 && !verse2) return null;
    return { verse1, verse2: verse2 || verse1 };
  } catch {
    return null;
  }
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

// 추출된 HTML이 이미지 1장으로만 구성된 콘텐츠인지 판별 (OCR 처리용)
export function isImageOnlyContent(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const text = doc.body.textContent.replace(/\s+/g, '').trim();
  const imgs = doc.body.querySelectorAll('img[src]');
  return text.length < 50 && imgs.length > 0;
}

// 콘텐츠에서 노이즈 이미지를 제외한 실제 콘텐츠 이미지 URL 추출
const NOISE_IMG = /btn_|logo|icon|arrow|bg_|background|bullet|blank|pixel|spacer|left_menu|sub_menu|visual/i;

// 콘텐츠에 실제 이미지가 1개 이상 있는지 판별 (URL 이미지형/텍스트형 분류용)
export function hasContentImage(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const imgs = doc.body.querySelectorAll('img[src]');
  for (const img of imgs) {
    const src = img.getAttribute('src') || '';
    if (src && !NOISE_IMG.test(src)) return true;
  }
  return false;
}

export function getContentImageUrls(html, baseUrl) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.querySelectorAll('img[src]'))
    .map(img => {
      const src = img.getAttribute('src');
      try { return new URL(src, baseUrl).href; } catch { return null; }
    })
    .filter(url => url && !NOISE_IMG.test(url));
}
