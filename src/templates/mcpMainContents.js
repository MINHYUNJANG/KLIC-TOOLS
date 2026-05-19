// ─── CSS 파서 / 변환 유틸 ────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * className → 타겟 셀렉터 맵을 CSS 셀렉터 변환에 사용합니다.
 * 각 CSS 규칙의 셀렉터를 파싱해 매핑된 클래스 이름을 타겟 셀렉터로 교체합니다.
 */
function transformCss(css, classMap) {
  if (!classMap.size || !css.trim()) return css;

  // selector { declarations } 형태의 규칙을 순서대로 변환
  // @media 등 at-rule 내부도 처리됩니다
  return css.replace(/([^{}]+?)\{/g, (match, rawSelector) => {
    const trimmed = rawSelector.trim();
    // at-rule 시작(@media, @keyframes 등)은 건드리지 않음
    if (trimmed.startsWith('@')) return match;
    return transformSelector(trimmed, classMap) + ' {';
  });
}

function transformSelector(selector, classMap) {
  // 콤마로 분리된 멀티 셀렉터 처리
  return selector.split(',').map(part => {
    part = part.trim();
    let result = part;

    // 길이 내림차순 정렬 → 더 긴(구체적인) 셀렉터 먼저 처리해 중복 치환 방지
    const sorted = [...classMap.entries()].sort((a, b) => b[0].length - a[0].length);

    for (const [cls, newSel] of sorted) {
      // .classname 뒤에 공백·콤보·pseudo·속성 선택자·끝이 오는 경우에만 치환
      const pattern = new RegExp(
        '(^|[\\s>+~])\\.' + escapeRegex(cls) + '(?=[\\s>+~:[\\].#,{]|$)',
        'g'
      );
      if (pattern.test(result)) {
        result = result.replace(pattern, (_m, pre) => pre + newSel);
        break; // 하나의 part에서 가장 구체적인 매핑 하나만 적용
      }
    }
    return result;
  }).join(',\n');
}

// ─── 공통 추출 유틸 ──────────────────────────────────────────────────────────

function mapElClasses(el, targetSel, classMap) {
  if (!el) return;
  el.classList.forEach(cls => { if (cls) classMap.set(cls, targetSel); });
}

function findHeadingEl(root) {
  return (
    root.querySelector('h1, h2, h3, h4') ||
    root.querySelector('[class*="heading"]') ||
    root.querySelector('[class*="tit"]:not(ul):not(li):not(div)')
  );
}

function detectIsSlider(doc) {
  return !!(
    doc.querySelector('.swiper, .swiper-wrapper, .swiper-container, .swiper-slide') ||
    doc.querySelector('[class*="slide"]') ||
    doc.querySelector('[class*="slider"]') ||
    // 피그마 MCP 패턴: btn-prev + btn-next 둘 다 존재하면 슬라이드로 판단
    (doc.querySelector('[class*="prev"]') && doc.querySelector('[class*="next"]')) ||
    // 변환된 마크업 패턴: .control 안에 버튼 2개 이상
    (doc.querySelector('[class*="control"]')?.querySelectorAll('button').length >= 2)
  );
}

function findMoreHref(doc) {
  for (const a of doc.querySelectorAll('a')) {
    const cls  = (a.getAttribute('class') || '').toLowerCase();
    const text = a.textContent.trim();
    if (cls.includes('more') || text === '더보기' || text === '바로가기' || text.includes('전체보기')) {
      return a.getAttribute('href') || '';
    }
  }
  return '';
}

function extractItemData(el) {
  const anchor = el.tagName === 'A' ? el : el.querySelector('a');
  const href   = anchor?.getAttribute('href') || '';

  const img    = el.querySelector('img');
  let imgSrc   = img?.getAttribute('src') || '';
  let imgAlt   = img?.getAttribute('alt') || '';

  if (!imgSrc) {
    const bgEl = el.querySelector('[style*="background-image"]');
    if (bgEl) {
      const m = (bgEl.getAttribute('style') || '').match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (m) imgSrc = m[1];
    }
  }

  const clone = (anchor || el).cloneNode(true);
  clone.querySelectorAll('img, [aria-hidden="true"], .hid, .hidden').forEach(e => e.remove());
  const text = clone.textContent.replace(/\s+/g, ' ').trim();

  return { href, imgSrc, imgAlt, text };
}

function extractLinkItems(doc) {
  const slides = doc.querySelectorAll('.swiper-slide');
  if (slides.length) return Array.from(slides).map(extractItemData);

  const listItems = doc.querySelectorAll('ul > li');
  if (listItems.length) return Array.from(listItems).map(extractItemData);

  return Array.from(doc.querySelectorAll('a'))
    .filter(a => a.querySelector('img') || a.querySelector('[style*="background-image"]') || a.textContent.trim())
    .map(extractItemData);
}

// ─── 바로가기: 클래스 맵 빌드 ────────────────────────────────────────────────

function buildShortcutClassMap(doc) {
  const map = new Map(); // cls → targetSelector

  const root = doc.body.firstElementChild;
  if (!root) return map;

  // 루트 → .M_link
  mapElClasses(root, '.M_link', map);

  // heading
  const headingEl = findHeadingEl(root);
  if (headingEl) {
    mapElClasses(headingEl, '.M_link .titWrap .heading', map);
    // heading의 부모가 root가 아니면 → .titWrap
    const titWrapEl = headingEl.parentElement;
    if (titWrapEl && titWrapEl !== root) {
      mapElClasses(titWrapEl, '.M_link .titWrap', map);
    }
  }

  // control (슬라이드 이전/다음)
  const controlEl = root.querySelector('[class*="control"], [class*="prev"], [class*="next"], [class*="nav"]');
  if (controlEl) mapElClasses(controlEl, '.M_link .titWrap .control', map);

  // 더보기 링크
  const moreEl = (() => {
    for (const a of root.querySelectorAll('a')) {
      const cls  = (a.getAttribute('class') || '').toLowerCase();
      const text = a.textContent.trim();
      if (cls.includes('more') || text === '더보기' || text.includes('전체보기')) return a;
    }
    return null;
  })();
  if (moreEl) mapElClasses(moreEl, '.M_link .titWrap .btn_more', map);

  // ul 기반 아이템 구조
  const ul = root.querySelector('ul');
  if (ul) {
    const linkWrap = ul.parentElement;
    if (linkWrap && linkWrap !== root) mapElClasses(linkWrap, '.M_link .link', map);
    mapElClasses(ul, '.M_link .link ul', map);

    const firstLi = ul.querySelector(':scope > li');
    if (firstLi) {
      mapElClasses(firstLi, '.M_link .link ul li', map);
      const firstA = firstLi.querySelector('a');
      if (firstA) mapElClasses(firstA, '.M_link .link ul li a', map);

      const imgWrap = firstLi.querySelector('[class*="img"], [class*="thumb"], [class*="icon"], [class*="pic"]');
      if (imgWrap && imgWrap.tagName !== 'IMG') {
        mapElClasses(imgWrap, '.M_link .link ul li a .img', map);
      }

      const textEl = firstLi.querySelector('span, em');
      if (textEl) mapElClasses(textEl, '.M_link .link ul li a span', map);
    }
  }

  return map;
}

// ─── 바로가기: HTML 빌드 ─────────────────────────────────────────────────────

function buildShortcutHtml(doc) {
  const isSlider    = detectIsSlider(doc);
  const moreHref    = findMoreHref(doc);
  const headingEl   = findHeadingEl(doc);
  const headingHTML = headingEl
    ? (headingEl.querySelector('img') ? headingEl.innerHTML.trim() : headingEl.textContent.trim())
    : '<!-- 타이틀명 이미지나 아이콘이 들어갈 경우 해당 이미지 추가 -->';
  const items = extractLinkItems(doc);

  const controlBlock = isSlider
    ? `        <div class="control">
            <button type="button">
                <span class="hid">슬라이드 이전</span>
            </button>
            <button type="button">
                <span class="hid">슬라이드 다음</span>
            </button>
        </div>`
    : `        <a href="${moreHref}" class="btn_more">
            <span class="hid">바로가기 더보기</span>
        </a>`;

  const fallback = [{ href: '', imgSrc: '', imgAlt: '', text: '' }];
  const list = items.length ? items : fallback;

  const listBlock = isSlider
    ? `    <div class="link swiper">
        <div class="swiper">
            <div class="swiper-wrapper">
${list.map(({ href, imgSrc, imgAlt, text }) => `                <div class="swiper-slide">
                    <a href="${href}">
                        <p class="img"><img src="${imgSrc || ''}" alt="${imgAlt || ''}"></p>
                        <span>${text}</span>
                    </a>
                </div>`).join('\n')}
            </div>
        </div>
    </div>`
    : `    <div class="link">
        <ul>
${list.map(({ href, imgSrc, imgAlt, text }) => `            <li>
                <a href="${href}">
                    <p class="img"><img src="${imgSrc || ''}" alt="${imgAlt || ''}"></p>
                    <span>${text}</span>
                </a>
            </li>`).join('\n')}
        </ul>
    </div>`;

  return `<div class="M_link">
    <div class="titWrap">
        <h2 class="heading">
            ${headingHTML}
        </h2>
${controlBlock}
    </div>
${listBlock}
</div>`;
}

// ─── 갤러리: 클래스 맵 빌드 ──────────────────────────────────────────────────

function buildGalleryClassMap(doc) {
  const map = new Map();

  const root = doc.body.firstElementChild;
  if (!root) return map;

  mapElClasses(root, '.M_gallery', map);

  const headingEl = findHeadingEl(root);
  if (headingEl) {
    mapElClasses(headingEl, '.M_gallery .titWrap .heading', map);
    const titWrapEl = headingEl.parentElement;
    if (titWrapEl && titWrapEl !== root) {
      mapElClasses(titWrapEl, '.M_gallery .titWrap', map);
    }
  }

  const controlEl = root.querySelector('[class*="control"], [class*="prev"], [class*="next"], [class*="nav"]');
  if (controlEl) mapElClasses(controlEl, '.M_gallery .titWrap .control', map);

  const moreEl = (() => {
    for (const a of root.querySelectorAll('a')) {
      const cls  = (a.getAttribute('class') || '').toLowerCase();
      const text = a.textContent.trim();
      if (cls.includes('more') || text === '더보기' || text.includes('전체보기')) return a;
    }
    return null;
  })();
  if (moreEl) mapElClasses(moreEl, '.M_gallery .titWrap .btn_more', map);

  const ul = root.querySelector('ul');
  if (ul) {
    const galleryWrap = ul.parentElement;
    if (galleryWrap && galleryWrap !== root) mapElClasses(galleryWrap, '.M_gallery .gallery', map);
    mapElClasses(ul, '.M_gallery .gallery ul', map);

    const firstLi = ul.querySelector(':scope > li');
    if (firstLi) {
      mapElClasses(firstLi, '.M_gallery .gallery ul li', map);
      const firstA = firstLi.querySelector('a');
      if (firstA) mapElClasses(firstA, '.M_gallery .gallery ul li a', map);

      const imgWrap = firstLi.querySelector('[class*="img"], [class*="thumb"], [class*="pic"], [class*="photo"]');
      if (imgWrap && imgWrap.tagName !== 'IMG') {
        mapElClasses(imgWrap, '.M_gallery .gallery ul li a .img', map);
      }

      const textEl = firstLi.querySelector('span, em, strong');
      if (textEl) mapElClasses(textEl, '.M_gallery .gallery ul li a span', map);
    }
  }

  return map;
}

// ─── 갤러리: HTML 빌드 ───────────────────────────────────────────────────────

function buildGalleryHtml(doc) {
  const isSlider    = detectIsSlider(doc);
  const moreHref    = findMoreHref(doc);
  const headingEl   = findHeadingEl(doc);
  const headingHTML = headingEl
    ? (headingEl.querySelector('img') ? headingEl.innerHTML.trim() : headingEl.textContent.trim())
    : '<!-- 타이틀명 이미지나 아이콘이 들어갈 경우 해당 이미지 추가 -->';
  const items = extractLinkItems(doc);

  const controlBlock = isSlider
    ? `        <div class="control">
            <button type="button">
                <span class="hid">슬라이드 이전</span>
            </button>
            <button type="button">
                <span class="hid">슬라이드 다음</span>
            </button>
        </div>`
    : `        <a href="${moreHref}" class="btn_more">
            <span class="hid">갤러리 더보기</span>
        </a>`;

  const fallback = [{ href: '', imgSrc: '', imgAlt: '', text: '' }];
  const list = items.length ? items : fallback;

  const listBlock = isSlider
    ? `    <div class="gallery swiper">
        <div class="swiper">
            <div class="swiper-wrapper">
${list.map(({ href, imgSrc, imgAlt, text }) => `                <div class="swiper-slide">
                    <a href="${href}">
                        <p class="img">${imgSrc ? `<img src="${imgSrc}" alt="${imgAlt || ''}">` : ''}</p>
                        <span>${text}</span>
                    </a>
                </div>`).join('\n')}
            </div>
        </div>
    </div>`
    : `    <div class="gallery">
        <ul>
${list.map(({ href, imgSrc, imgAlt, text }) => `            <li>
                <a href="${href}">
                    <p class="img">${imgSrc ? `<img src="${imgSrc}" alt="${imgAlt || ''}">` : ''}</p>
                    <span>${text}</span>
                </a>
            </li>`).join('\n')}
        </ul>
    </div>`;

  return `<div class="M_gallery">
    <div class="titWrap">
        <h2 class="heading">
            ${headingHTML}
        </h2>
${controlBlock}
    </div>
${listBlock}
</div>`;
}

// ─── 공개 변환 함수 ──────────────────────────────────────────────────────────

/**
 * @returns {{ html: string, css: string }}
 */
export function convertShortcut(html, css) {
  const doc      = new DOMParser().parseFromString(html, 'text/html');
  const classMap = buildShortcutClassMap(doc);

  return {
    html: buildShortcutHtml(doc),
    css:  transformCss(css, classMap),
  };
}

export function convertGallery(html, css) {
  const doc      = new DOMParser().parseFromString(html, 'text/html');
  const classMap = buildGalleryClassMap(doc);

  return {
    html: buildGalleryHtml(doc),
    css:  transformCss(css, classMap),
  };
}

// ─── 콘텐츠 맵 ───────────────────────────────────────────────────────────────

export const CONTENT_CONVERTERS = {
  shortcut: convertShortcut,
  gallery:  convertGallery,
};
