import { parseMarkup } from '../utils/templateMapping.js';

const SYMBOL_ITEM_KEYWORDS = ['교표', '교기', '교화', '교목'];
const SYMBOL_EN_MAP = { '교표': 'Emblem', '교기': 'Flag', '교화': 'Flower', '교목': 'Tree' };

function identifySymbolType(el) {
  const text = [
    el.querySelector('h2, h3, h4, h5, dt, strong')?.textContent || '',
    el.querySelector('img')?.alt || '',
  ].join(' ');
  return SYMBOL_ITEM_KEYWORDS.find(kw => text.includes(kw)) || null;
}

function extractSymbolItem(el) {
  const img = el.querySelector('img');
  const heading = el.querySelector('h2, h3, h4, h5, dt, strong');

  // ul > li 구조이면 리스트, 아니면 p/dd 텍스트 (여러 p도 리스트 처리)
  const ul = Array.from(el.querySelectorAll('ul')).find(u => !u.querySelector('img') && u.querySelectorAll('li').length > 0);
  let desc = '';
  let isList = false;
  if (ul) {
    desc = Array.from(ul.querySelectorAll('li')).map(li => `<li>${li.innerHTML.trim()}</li>`).join('\n');
    isList = true;
  } else {
    const ps = Array.from(el.querySelectorAll('p, dd'))
      .filter(p => !p.querySelector('img') && p.textContent.trim().length > 0);
    if (ps.length > 1) {
      desc = ps.map(p => `<li>${p.innerHTML.trim()}</li>`).join('\n');
      isList = true;
    } else if (ps.length === 1) {
      desc = ps[0].innerHTML.trim();
    }
  }

  return {
    src: img?.getAttribute('src') || img?.src || '',
    alt: img?.alt || '',
    title: heading?.textContent.trim() || '',
    desc,
    isList,
    type: identifySymbolType(el),
  };
}

// desc를 list_st1 ul 또는 p로 삽입
function setDescContent(targetEl, item) {
  if (!targetEl) return;
  if (item.isList) {
    const ul = targetEl.ownerDocument.createElement('ul');
    ul.className = 'list_st1';
    ul.innerHTML = item.desc;
    targetEl.replaceWith(ul);
  } else {
    targetEl.innerHTML = item.desc;
  }
}

// 소스 HTML에서 상징 아이템 추출 (구조 자동 감지)
export function parseSymbolSource(src) {
  let items;

  // 구조 1: .symbol > div (img 있는 것)
  items = Array.from(src.querySelectorAll('.symbol > div')).filter(el => el.querySelector('img'));
  if (items.length) return items.map(extractSymbolItem);

  // 구조 2: .symbol li / .symbol_list li
  items = Array.from(src.querySelectorAll('.symbol li, .symbol_list li')).filter(el => el.querySelector('img'));
  if (items.length) return items.map(extractSymbolItem);

  // 구조 3: symbol 계열 클래스/id 컨테이너 내부 자식 탐지
  const containerSelectors = [
    '[class*="symbol_wrap"]', '[class*="symbol_area"]', '[class*="symbol_cont"]',
    '[class*="symbol_info"]', '[class*="symbol_list"]',
    '[class*="symbolWrap"]', '[class*="symbolArea"]', '[class*="symbolCont"]',
    '#symbol', '[id*="symbol_area"]',
  ];
  for (const sel of containerSelectors) {
    const container = src.querySelector(sel);
    if (!container) continue;
    const children = Array.from(
      container.querySelectorAll(':scope > div, :scope > ul > li, :scope > li, :scope > dl')
    ).filter(el => el.querySelector('img'));
    if (children.length >= 2) return children.map(extractSymbolItem);
  }

  // 구조 4: dl 단위로 교표/교기/교화/교목 키워드 포함 탐지
  items = Array.from(src.querySelectorAll('dl')).filter(el =>
    el.querySelector('img') && SYMBOL_ITEM_KEYWORDS.some(kw => el.textContent.includes(kw))
  );
  if (items.length) return items.map(extractSymbolItem);

  // 구조 5: 키워드(교표/교기/교화/교목) heading 기반 탐지 (th 포함, includes 매칭)
  const symbolHeadings = Array.from(src.querySelectorAll('h2, h3, h4, h5, dt, strong, b, th')).filter(h =>
    SYMBOL_ITEM_KEYWORDS.some(kw => h.textContent.trim().includes(kw))
  );
  if (symbolHeadings.length) {
    const blocks = symbolHeadings.map(h => {
      let el = h.parentElement;
      let depth = 0;
      while (el && el !== src.body && depth < 6) {
        if (el.querySelector('img')) return el;
        el = el.parentElement;
        depth++;
      }
      return h.parentElement;
    }).filter(Boolean);

    const deduped = blocks.filter((el, i) => !blocks.some((other, j) => j !== i && el.contains(other)));
    const result = deduped.map(extractSymbolItem).filter(item => item.src || item.title);
    if (result.length) return result;
  }

  // 구조 6: 범용 탐지 — "□ 교목" 같은 prefix 포함 짧은 텍스트 요소 + 인접 이미지
  // p, span, div 등 임의 태그에 키워드가 있고 길이가 짧은(제목 수준) 요소를 탐지
  const genericItems = [];
  const usedContainers = new Set();

  SYMBOL_ITEM_KEYWORDS.forEach(kw => {
    const matchEls = Array.from(
      src.querySelectorAll('p, span, div, td, th, b, strong, h2, h3, h4, h5, dt, li')
    ).filter(el => {
      const t = el.textContent.trim();
      return t.includes(kw) && t.length < 25;
    });
    if (!matchEls.length) return;

    for (const el of matchEls) {
      let container = el.parentElement;
      let depth = 0;
      while (container && container !== src.body && depth < 8) {
        if (container.querySelector('img') && !usedContainers.has(container)) {
          usedContainers.add(container);
          const item = extractSymbolItem(container);
          item.type = kw;
          if (!item.title) item.title = el.textContent.replace(/^[^가-힣]+/, '').trim() || kw;
          genericItems.push(item);
          break;
        }
        container = container.parentElement;
        depth++;
      }
      if (genericItems.some(i => i.type === kw)) break;
    }
  });

  if (genericItems.length >= 1) {
    // 다른 컨테이너를 포함하는 상위 컨테이너 제거
    const containers = Array.from(usedContainers);
    return genericItems.filter((_, i) =>
      !containers.some((other, j) => j !== i && containers[i]?.contains(other))
    );
  }

  return [];
}

// 소스에서 교훈 텍스트를 추출 (다양한 CMS 구조 대응)
function extractSloganText(src) {
  // 1순위: slogan/motto/gyohun 클래스 패턴
  const sloganEl = src.querySelector('.slogan, [class*="slogan"], [class*="motto"], [class*="gyohun"]');
  if (sloganEl) {
    const p = sloganEl.querySelector('p');
    const text = (p || sloganEl).innerHTML.trim();
    if (text) return text;
  }
  // 2순위: "교훈" heading 기반 탐지
  const gyohunH = Array.from(src.querySelectorAll('h2, h3, h4, h5, dt, th'))
    .find(el => el.textContent.trim().includes('교훈'));
  if (gyohunH) {
    if (gyohunH.tagName === 'DT') {
      const dd = gyohunH.nextElementSibling;
      if (dd?.tagName === 'DD') return dd.innerHTML.trim();
    }
    let next = gyohunH.nextElementSibling;
    while (next && next.matches('h2, h3, h4, h5')) next = next.nextElementSibling;
    if (next && !next.matches('h2, h3, h4, h5')) return next.innerHTML.trim();
    const parentPs = Array.from(gyohunH.parentElement.querySelectorAll('p, dd'))
      .filter(p => p.textContent.trim().length > 0 && !p.querySelector('img'));
    if (parentPs.length) return parentPs[0].innerHTML.trim();
  }
  // 3순위: 표 구조 (td/th 쌍)
  for (const cell of src.querySelectorAll('td, th')) {
    if (!cell.textContent.trim().includes('교훈')) continue;
    const next = cell.nextElementSibling;
    if (next) return next.innerHTML.trim();
  }
  // 4순위: p/span/b/strong/div 등 짧은 "교훈" 텍스트 기반 (□ 교훈 같은 prefix 대응)
  const OTHER_SECTION_KW = ['교표', '교기', '교화', '교목', '교가'];
  const gyohunEl = Array.from(src.querySelectorAll('p, span, b, strong, div, li'))
    .find(el => {
      const t = el.textContent.trim();
      return t.includes('교훈') && t.length < 15;
    });
  if (gyohunEl) {
    const parent = gyohunEl.parentElement;
    const siblings = parent ? Array.from(parent.children) : [];
    const startIdx = siblings.indexOf(gyohunEl) + 1;
    const parts = [];
    for (let i = startIdx; i < siblings.length; i++) {
      const sib = siblings[i];
      const t = sib.textContent.trim();
      // 다음 상징 섹션 레이블이 나오면 중단
      if (t.length < 15 && OTHER_SECTION_KW.some(kw => t.includes(kw))) break;
      if (t.length > 0 || sib.querySelector('img')) {
        parts.push(sib.innerHTML.trim() || sib.outerHTML);
      }
    }
    if (parts.length > 0) return parts.join('<br>');
    // 형제가 없으면 부모의 다른 자식 탐색
    const other = siblings.find(c => c !== gyohunEl && (c.textContent.trim().length > 0 || c.querySelector('img')));
    if (other) return other.innerHTML.trim() || other.outerHTML;
  }
  return null;
}

// 소스에 교훈 섹션이 있는지 확인
function hasSloganSection(src) {
  return extractSloganText(src) !== null;
}

// 소스 교훈 텍스트를 템플릿에 매핑 (교훈 없으면 템플릿 기본값 유지)
function mapSloganText(src, tpl) {
  const text = extractSloganText(src);
  if (!text) return;
  const target =
    tpl.querySelector('.symbol-sticky .slogan p') ||
    tpl.querySelector('.box[data-title="학교 교훈"] .inner p.slogan') ||
    tpl.querySelector('.symbol-sticky h4:not([id])') ||
    tpl.querySelector('.box .inner p.slogan');
  if (target) target.innerHTML = text;
}

// 소스에 교가 섹션이 있는지 확인
function hasSongSection(src) {
  const byClass = src.querySelector('.song, .song-wrap, [class*="song"]');
  if (byClass) return true;
  const byHeading = Array.from(src.querySelectorAll('h2, h3, h4, h5, dt, strong, b, th'))
    .find(el => el.textContent.trim().includes('교가'));
  if (byHeading) return true;
  // p/span/li/td 등 비헤딩 레이블 — 짧은 텍스트에 "교가" 포함
  const byLabel = Array.from(src.querySelectorAll('p, span, li, td'))
    .find(el => {
      const t = el.textContent.trim();
      return t.includes('교가') && t.length <= 10;
    });
  return !!byLabel;
}

// 소스 교가 이미지·제목을 템플릿에 매핑
function mapSongSection(src, tpl) {
  // 1순위: 클래스명에 song 포함 + img 존재
  let songEl = Array.from(src.querySelectorAll('[class*="song"], [class*="Song"], [class*="gyoga"]'))
    .find(el => el.querySelector('img'));

  // 2순위: "교가" 텍스트 제목 근처에서 img 포함 조상 탐색
  if (!songEl) {
    const heading = Array.from(src.querySelectorAll('h2, h3, h4, h5, dt, strong, b, th, p, span, li'))
      .find(el => {
        const t = el.textContent.trim();
        return t.includes('교가') && t.length <= 15;
      });
    if (heading) {
      let el = heading.parentElement;
      while (el && el.tagName !== 'BODY') {
        if (el.querySelector('img')) { songEl = el; break; }
        el = el.parentElement;
      }
    }
  }

  console.log('[mapSongSection] songEl:', songEl?.className);
  if (!songEl) return;

  const srcImg = songEl.querySelector('img');
  const tplImg = tpl.querySelector('.song-wrap img');
  console.log('[mapSongSection] srcImg:', srcImg?.getAttribute('src'), '| tplImg:', !!tplImg);

  if (srcImg && tplImg) {
    tplImg.setAttribute('src', srcImg.getAttribute('src') || srcImg.src);
    if (srcImg.alt) tplImg.alt = srcImg.alt;
  }

  const srcTitle = songEl.querySelector('h3, h2, h4')?.textContent.trim();
  const tplH5 = tpl.querySelector('.song-wrap .img h5');
  if (srcTitle && tplH5) tplH5.textContent = srcTitle;

  // 가사 매핑: synthetic HTML의 data-verse1/2 속성에서 읽어 .lyr p 요소에 주입
  const verse1 = songEl.getAttribute('data-verse1') || '';
  const verse2 = songEl.getAttribute('data-verse2') || '';
  if (verse1 || verse2) {
    const lyrEl = tpl.querySelector('.song-wrap .lyr');
    if (lyrEl) {
      const h5Els = lyrEl.querySelectorAll('h5');
      const pEls = lyrEl.querySelectorAll('p');
      const isSingleVerse = verse1 === verse2 || !verse2;
      if (isSingleVerse) {
        // 1절=2절: 첫 h5를 "교가 1·2절"로 변경, 두 번째 h5/p 숨김
        if (h5Els[0]) h5Els[0].textContent = '교가 1·2절';
        if (pEls[0]) pEls[0].textContent = verse1;
        if (h5Els[1]) h5Els[1].remove();
        if (pEls[1]) pEls[1].remove();
      } else {
        if (pEls[0]) pEls[0].textContent = verse1;
        if (pEls[1]) pEls[1].textContent = verse2;
      }
    }
  }
}

// 공통 box 매핑 (.box > p.img + .inner > h4 + p 구조)
function mapSymbolBoxes(items, tpl, containerSelector, src) {
  const container = tpl.querySelector(containerSelector);
  if (!container) return;
  const refBox = container.querySelector('.box:not(.song-wrap)');
  const songWrap = container.querySelector('.box.song-wrap');
  if (!refBox) return;

  Array.from(container.querySelectorAll('.box:not(.song-wrap)')).forEach(b => b.remove());

  items.forEach(item => {
    const box = refBox.cloneNode(true);
    const img = box.querySelector('img');
    if (img) {
      if (item.src) img.src = item.src;
      img.alt = item.alt || item.title + ' 이미지';
    }
    const h4 = box.querySelector('h4');
    if (h4) h4.textContent = item.title;
    setDescContent(box.querySelector('.inner p'), item);
    const bgText = box.querySelector('.bg-text');
    if (bgText) bgText.textContent = SYMBOL_EN_MAP[item.type] || '';
    songWrap ? container.insertBefore(box, songWrap) : container.appendChild(box);
  });

  if (songWrap && !hasSongSection(src)) songWrap.remove();
}

export default [
  {
    id: 'symbol-list',
    category: '상징',
    label: '상징 tyA (리스트형)',
    desc: '세로 나열 + 배경텍스트 + 교가 섹션',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const items = parseSymbolSource(src);
      const hasSong = hasSongSection(src);
      if (!items.length && !hasSong) return templateCode;
      if (items.length) {
        mapSymbolBoxes(items, tpl, '.list-wrap', src);
        if (hasSloganSection(src)) mapSloganText(src, tpl);
      } else {
        tpl.querySelectorAll('.list-wrap .box:not(.song-wrap)').forEach(b => b.remove());
      }
      if (hasSong) mapSongSection(src, tpl);
      return tpl.body.innerHTML;
    },
    code: `<script>
$(function () {
  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.matchMedia({
    "(min-width: 1025px)": function () {

      /* 일반 box */
      $(".symbol .box:not(.song-wrap)").each(function (i) {
        const box = $(this);
        const img = box.find(".img");
        const inner = box.find(".inner");
        const text = box.find(".bg-text");
        const isEven = i % 2 === 1;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: box[0],
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        });

        tl.from(img, { y: 80, opacity: 0, duration: 0.8 })
          .from(inner, { x: isEven ? -60 : 60, opacity: 0, duration: 0.8 }, "-=0.6")
          .from(text, { x: isEven ? -60 : 60, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.6");
      });

      /* song-wrap */
      const $songBox = $(".symbol .box.song-wrap");
      const tlSong = gsap.timeline({
        scrollTrigger: { trigger: $songBox[0], start: "top 80%" }
      });
      tlSong.from($songBox.find(".tit-wrap"), { y: 60, opacity: 0, duration: 0.7 })
            .from($songBox.find(".inner"), { y: 60, opacity: 0, duration: 0.7 }, "-=0.3");
    }
  });
});
<\/script>

<div class="symbol tyA list">
  <div class="symbol-sticky">
    <div class="slogan">
      <h4>교훈</h4>
      <p><strong>○○ &middot; ○○ &middot; ○○</strong>을 가꾸는 <strong>어린이</strong></p>
    </div>
  </div>

  <div class="list-wrap">
    <div class="box">
      <p class="img"><img src="/common/images/sub_com/symbol_temp1.png" alt="교표 이미지"></p>
      <div class="inner">
        <h4>교표</h4>
        <p>○○학교의 교표입니다.</p>
      </div>
      <p class="bg-text">Emblem</p>
    </div>
    <div class="box">
      <p class="img"><img src="/common/images/sub_com/symbol_temp2.png" alt="교기 이미지"></p>
      <div class="inner">
        <h4>교기</h4>
        <p>○○학교의 교기입니다.</p>
      </div>
      <p class="bg-text">Flag</p>
    </div>
    <div class="box">
      <p class="img"><img src="/common/images/sub_com/symbol_temp3.png" alt="교화 이미지"></p>
      <div class="inner">
        <h4>교화 <span>○○</span></h4>
        <p>교화에 대한 설명을 입력하세요.</p>
      </div>
      <p class="bg-text">Flower</p>
    </div>
    <div class="box">
      <p class="img"><img src="/common/images/sub_com/symbol_temp4.png" alt="교목 이미지"></p>
      <div class="inner">
        <h4>교목 <span>○○</span></h4>
        <p>교목에 대한 설명을 입력하세요.</p>
      </div>
      <p class="bg-text">Tree</p>
    </div>
    <div class="box song-wrap">
      <div class="tit-wrap">
        <h4>교가</h4>
        <div class="btn-wrap">
          <button class="btn-st pri">교가듣기</button>
          <button class="btn-st sec">악보다운로드</button>
        </div>
      </div>
      <div class="inner">
        <div class="img"><p class="rsp_img"><img src="/common/images/sub_com/symbol_song.png" alt="악보 이미지"></p></div>
        <div class="lyr">
          <h5>교가 1절</h5>
          <p>가사 1절 내용을 입력하세요.</p>
          <h5>교가 2절</h5>
          <p>가사 2절 내용을 입력하세요.</p>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'symbol-slide',
    category: '상징',
    label: '상징 tyA (슬라이드형)',
    desc: '가로 핀 스크롤 슬라이드 + 교가 섹션',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const items = parseSymbolSource(src);
      const hasSong = hasSongSection(src);
      if (!items.length && !hasSong) return templateCode;
      if (items.length) {
        mapSymbolBoxes(items, tpl, '.h-scroll', src);
        if (hasSloganSection(src)) mapSloganText(src, tpl);
      } else {
        tpl.querySelectorAll('.h-scroll .box').forEach(b => b.remove());
      }
      // 슬라이드형은 song-wrap이 list-wrap 밖에 있음
      if (hasSong) mapSongSection(src, tpl);
      else tpl.querySelectorAll('.box.song-wrap').forEach(el => el.remove());
      return tpl.body.innerHTML;
    },
    code: `<script>
$(function () {
  gsap.registerPlugin(ScrollTrigger);

  const $section = $(".symbol.tyA.slide");
  const $scroll = $(".h-scroll");
  const $wrap = $(".list-wrap");

  function init() {
    ScrollTrigger.getAll().forEach(t => t.kill());
    gsap.set([$scroll, $section, ".symbol-sticky"], { clearProps: "all" });

    const $boxes = $scroll.find(".box");
    const isLowCount = $boxes.length <= 3;

    if (window.innerWidth <= 1240 || isLowCount) {
      isLowCount ? $wrap.addClass("dis-scroll") : $wrap.removeClass("dis-scroll");
      return;
    }

    $scroll.removeClass("dis-scroll");

    const scrollAmount = $scroll[0].scrollWidth - $wrap.outerWidth() + 100;
    if (scrollAmount <= 0) return;

    const mainTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: $section,
        start: "top top",
        end: () => "+=" + scrollAmount,
        scrub: 1,
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        anticipatePin: 1
      }
    });

    mainTimeline.to($scroll, { x: -scrollAmount, ease: "none" });
    mainTimeline.to(".symbol-sticky", { y: 0, ease: "none" }, 0);
  }

  init();

  let resizeTimer;
  $(window).on("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 250);
  });
});
<\/script>

<div class="symbol tyA slide">
  <div class="sybmbol-wrap">
    <div class="symbol-sticky">
      <div class="slogan">
        <h4>교훈</h4>
        <p><strong>○○ &middot; ○○ &middot; ○○</strong>을 가꾸는 <strong>어린이</strong></p>
      </div>
    </div>

    <div class="list-wrap">
      <div class="list-sticky">
        <div class="scroll-wrap">
          <div class="h-scroll">
            <div class="box">
              <p class="img"><img src="/common/images/sub_com/symbol_temp1.png" alt="교표 이미지"></p>
              <div class="inner">
                <h4>교표</h4>
                <p>○○학교의 교표입니다.</p>
              </div>
            </div>
            <div class="box">
              <p class="img"><img src="/common/images/sub_com/symbol_temp2.png" alt="교기 이미지"></p>
              <div class="inner">
                <h4>교기</h4>
                <p>○○학교의 교기입니다.</p>
              </div>
            </div>
            <div class="box">
              <p class="img"><img src="/common/images/sub_com/symbol_temp3.png" alt="교화 이미지"></p>
              <div class="inner">
                <h4>교화 <span>○○</span></h4>
                <p>교화에 대한 설명을 입력하세요.</p>
              </div>
            </div>
            <div class="box">
              <p class="img"><img src="/common/images/sub_com/symbol_temp4.png" alt="교목 이미지"></p>
              <div class="inner">
                <h4>교목 <span>○○</span></h4>
                <p>교목에 대한 설명을 입력하세요.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="box song-wrap">
    <div class="tit-wrap">
      <h4>교가</h4>
      <div class="btn-wrap">
        <button class="btn-st pri">교가듣기</button>
        <button class="btn-st sec">악보다운로드</button>
      </div>
    </div>
    <div class="inner">
      <div class="img"><p class="rsp_img"><img src="/common/images/sub_com/symbol_song.png" alt="악보 이미지"></p></div>
      <div class="lyr">
        <h5>교가 1절</h5>
        <p>가사 1절 내용을 입력하세요.</p>
        <h5>교가 2절</h5>
        <p>가사 2절 내용을 입력하세요.</p>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'symbol-tyB1',
    category: '상징',
    label: '상징 tyB_1',
    desc: '세로 나열 + 펼쳐보기 토글 + 교가',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const items = parseSymbolSource(src);
      const hasSong = hasSongSection(src);
      if (!items.length && !hasSong) return templateCode;
      const container = tpl.querySelector('.symbol.tyB');
      if (!container) return templateCode;
      const songWrap = container.querySelector('.box.song-wrap');
      if (items.length) {
        const sloganBox = Array.from(container.querySelectorAll('.box:not(.song-wrap)')).find(b => !b.querySelector('img'));
        const refBox = Array.from(container.querySelectorAll('.box:not(.song-wrap)')).find(b => b.querySelector('img'));
        if (refBox) {
          Array.from(container.querySelectorAll('.box:not(.song-wrap)')).filter(b => b.querySelector('img')).forEach(b => b.remove());
          items.forEach(item => {
            const box = refBox.cloneNode(true);
            const img = box.querySelector('img');
            if (img) { if (item.src) img.src = item.src; img.alt = item.alt || item.title + ' 이미지'; }
            const h4 = box.querySelector('h4');
            if (h4) h4.textContent = item.title;
            setDescContent(box.querySelector('.text-box p'), item);
            songWrap ? container.insertBefore(box, songWrap) : container.appendChild(box);
          });
        }
        if (hasSloganSection(src)) mapSloganText(src, tpl);
      } else {
        container.querySelectorAll('.box:not(.song-wrap)').forEach(b => b.remove());
      }
      if (hasSong) mapSongSection(src, tpl);
      else if (songWrap) songWrap.remove();
      return tpl.body.innerHTML;
    },
    code: `<script>
$(function () {
  $('.btn-toggle').on('click', function () {
    const $box = $(this).closest('.text-box');
    $box.toggleClass('open');
    $(this).text($box.hasClass('open') ? '접기' : '펼쳐보기');
    $(this).toggleClass('open', $box.hasClass('open'));
  });

  $('.text-box').each(function () {
    const $text = $(this).find('p');
    const $btn = $(this).find('.btn-toggle');
    const lineHeight = parseFloat($text.css('line-height'));
    if ($text[0].scrollHeight <= lineHeight * 3) {
      $btn.hide();
    }
  });
});
<\/script>

<div class="symbol tyB tyB_1">
  <div class="box">
    <div class="inner">
      <p class="slogan">○○ · ○○ · ○○을 가꾸는 어린이</p>
    </div>
  </div>
  <div class="box">
    <p class="img mark"><img src="/common/images/sub_com/symbol_tyB_temp1.png" alt="교표 이미지"></p>
    <div class="inner">
      <h4>교표</h4>
      <div class="text-box">
        <p>교표에 대한 설명을 입력하세요.</p>
        <button class="btn-toggle">펼쳐보기</button>
      </div>
    </div>
  </div>
  <div class="box">
    <p class="img"><img src="/common/images/sub_com/symbol_temp3.png" alt="교화 이미지"></p>
    <div class="inner">
      <h4>교화<span>○○</span></h4>
      <div class="text-box">
        <p>교화에 대한 설명을 입력하세요.</p>
        <button class="btn-toggle">펼쳐보기</button>
      </div>
    </div>
  </div>
  <div class="box">
    <p class="img"><img src="/common/images/sub_com/symbol_temp4.png" alt="교목 이미지"></p>
    <div class="inner">
      <h4>교목<span>○○</span></h4>
      <div class="text-box">
        <p>교목에 대한 설명을 입력하세요.</p>
        <button class="btn-toggle">펼쳐보기</button>
      </div>
    </div>
  </div>
  <div class="box song-wrap">
    <h4>교가</h4>
    <div class="inner">
      <div class="img">
        <h5>○○학교 교가</h5>
        <p class="rsp_img"><img src="/common/images/sub_com/symbol_song.png" alt="악보 이미지"></p>
      </div>
      <div class="song-cont">
        <div class="lyr">
          <h5>교가 1절</h5>
          <p>가사 1절 내용을 입력하세요.</p>
          <h5>교가 2절</h5>
          <p>가사 2절 내용을 입력하세요.</p>
        </div>
        <div class="btn-wrap">
          <button class="btn-st pri">교가듣기</button>
          <button class="btn-st sec">악보다운로드</button>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'symbol-tyB2',
    category: '상징',
    label: '상징 tyB_2',
    desc: '스티키 슬로건 + 카드 나열 + 교가',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const items = parseSymbolSource(src);
      const hasSong = hasSongSection(src);
      if (!items.length && !hasSong) return templateCode;
      if (items.length) {
        mapSymbolBoxes(items, tpl, '.list-wrap', src);
        if (hasSloganSection(src)) mapSloganText(src, tpl);
      } else {
        tpl.querySelectorAll('.list-wrap .box:not(.song-wrap)').forEach(b => b.remove());
      }
      if (hasSong) mapSongSection(src, tpl);
      return tpl.body.innerHTML;
    },
    code: `<script>
$(function () {
  $('.btn-toggle').on('click', function () {
    const $box = $(this).closest('.text-box');
    $box.toggleClass('open');
    $(this).text($box.hasClass('open') ? '접기' : '펼쳐보기');
    $(this).toggleClass('open', $box.hasClass('open'));
  });

  $('.text-box').each(function () {
    const $text = $(this).find('p');
    const $btn = $(this).find('.btn-toggle');
    const lineHeight = parseFloat($text.css('line-height'));
    if ($text[0].scrollHeight <= lineHeight * 3) {
      $btn.hide();
    }
  });
});
<\/script>

<div class="symbol tyB tyB_2">
  <div class="symbol-sticky">
    <h4>○○ · ○○ · ○○을 가꾸는 어린이</h4>
  </div>

  <div class="list-wrap">
    <div class="box">
      <p class="img mark"><img src="/common/images/sub_com/symbol_tyB_temp1.png" alt="교표 이미지"></p>
      <div class="inner">
        <h4>교표</h4>
        <div class="text-box">
          <p>교표에 대한 설명을 입력하세요.</p>
          <button class="btn-toggle">펼쳐보기</button>
        </div>
      </div>
    </div>
    <div class="box">
      <p class="img"><img src="/common/images/sub_com/symbol_temp3.png" alt="교화 이미지"></p>
      <div class="inner">
        <h4>교화<span>○○</span></h4>
        <div class="text-box">
          <p>교화에 대한 설명을 입력하세요.</p>
          <button class="btn-toggle">펼쳐보기</button>
        </div>
      </div>
    </div>
    <div class="box">
      <p class="img"><img src="/common/images/sub_com/symbol_temp4.png" alt="교목 이미지"></p>
      <div class="inner">
        <h4>교목<span>○○</span></h4>
        <div class="text-box">
          <p>교목에 대한 설명을 입력하세요.</p>
          <button class="btn-toggle">펼쳐보기</button>
        </div>
      </div>
    </div>
    <div class="box song-wrap">
      <div class="img">
        <h5>○○학교 교가</h5>
        <p class="rsp_img"><img src="/common/images/sub_com/symbol_song.png" alt="악보 이미지"></p>
      </div>
      <div class="song-cont">
        <h4>교가</h4>
        <div class="lyr">
          <h5>교가 1절</h5>
          <p>가사 1절 내용을 입력하세요.</p>
          <h5>교가 2절</h5>
          <p>가사 2절 내용을 입력하세요.</p>
        </div>
        <div class="btn-wrap">
          <button class="btn-st pri">교가듣기</button>
          <button class="btn-st sec">악보다운로드</button>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'symbol-tyC',
    category: '상징',
    label: '상징 tyC',
    desc: '스티키 타이틀 스크롤스파이 + 교가',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const items = parseSymbolSource(src);
      const hasSong = hasSongSection(src);
      if (!items.length && !hasSong) return templateCode;
      if (items.length) {
        // tyC는 .inner > dl 구조
        const refDl = tpl.querySelector('.box[data-title="학교 상징"] dl');
        const dlContainer = tpl.querySelector('.box[data-title="학교 상징"] .inner');
        if (refDl && dlContainer) {
          dlContainer.innerHTML = '';
          items.forEach(item => {
            const dl = refDl.cloneNode(true);
            const img = dl.querySelector('img');
            if (img) { if (item.src) img.src = item.src; img.alt = item.alt || item.title + ' 이미지'; }
            const h5 = dl.querySelector('h5');
            if (h5) h5.innerHTML = `<span>${item.title}</span>${item.title}`;
            setDescContent(dl.querySelector('dd p'), item);
            dlContainer.appendChild(dl);
          });
        }
        if (hasSloganSection(src)) mapSloganText(src, tpl);
      } else {
        tpl.querySelectorAll('.box[data-title="학교 상징"]').forEach(b => b.remove());
      }
      if (hasSong) mapSongSection(src, tpl);
      else tpl.querySelectorAll('.box.song-wrap').forEach(el => el.remove());
      return tpl.body.innerHTML;
    },
    code: `<script>
$(function () {
  const $sections = $('.box');
  const $title = $('#title');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        $title.text($(entry.target).data('title'));
      }
    });
  }, {
    root: null,
    threshold: 0,
    rootMargin: '-100px 0px -100% 0px'
  });

  $sections.each(function () {
    observer.observe(this);
  });
});
<\/script>

<div class="symbol tyC">
  <div class="symbol-sticky">
    <h4 id="title">학교 교훈</h4>
  </div>

  <div class="list-wrap">
    <div class="box" data-title="학교 교훈">
      <h4>학교 교훈</h4>
      <div class="inner">
        <p class="slogan">
          <strong>○○</strong>을 즐겨하고 <strong>○○</strong>을 행동의 <strong>기준</strong>으로 삼는다.
        </p>
      </div>
    </div>
    <div class="box" data-title="학교 상징">
      <h4>학교 상징</h4>
      <div class="inner">
        <dl>
          <dt><p class="img"><img src="/common/images/sub_com/symbol_tyC_temp1.png" alt="교표 이미지"></p></dt>
          <dd>
            <h5><span>교표</span>교표</h5>
            <p>교표에 대한 설명을 입력하세요.</p>
          </dd>
        </dl>
        <dl>
          <dt><p class="img"><img src="/common/images/sub_com/symbol_temp4.png" alt="교목 이미지"></p></dt>
          <dd>
            <h5><span>교목</span>○○</h5>
            <p>교목에 대한 설명을 입력하세요.</p>
          </dd>
        </dl>
        <dl>
          <dt><p class="img"><img src="/common/images/sub_com/symbol_temp3.png" alt="교화 이미지"></p></dt>
          <dd>
            <h5><span>교화</span>○○</h5>
            <p>교화에 대한 설명을 입력하세요.</p>
          </dd>
        </dl>
      </div>
    </div>
    <div class="box song-wrap" data-title="학교 교가">
      <h4>학교 교가</h4>
      <div class="inner">
        <div class="img">
          <h5>○○학교 교가</h5>
          <p class="rsp_img"><img src="/common/images/sub_com/symbol_song.png" alt="악보 이미지"></p>
        </div>
        <div class="song-cont">
          <div class="lyr">
            <h5>교가 1절</h5>
            <p>가사 1절 내용을 입력하세요.</p>
            <h5>교가 2절</h5>
            <p>가사 2절 내용을 입력하세요.</p>
          </div>
          <div class="btn-wrap">
            <button class="btn-st pri">교가듣기</button>
            <button class="btn-st sec">악보다운로드</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
]
