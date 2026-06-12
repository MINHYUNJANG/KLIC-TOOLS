import { parseMarkup } from '../utils/templateMapping.js';

// li에서 날짜 요소(strong/span/em)를 제외한 본문 텍스트 추출
function extractLiText(li) {
  const clone = li.cloneNode(true);
  const dateEl = Array.from(clone.querySelectorAll(':scope > strong, :scope > span, :scope > em, :scope > b')).find(el =>
    /^\d{1,2}[.\-\/]\d{0,2}|^\d{1,2}월/.test(el.textContent.trim())
  );
  if (dateEl) dateEl.remove();
  const p = clone.querySelector('p');
  if (p) return p.textContent.trim();
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

// li에서 날짜 부분 추출 (strong > span > em 우선, 날짜 패턴 검증)
function extractLiDate(li) {
  const el = li.querySelector(':scope > strong, :scope > span, :scope > em, :scope > b');
  if (!el) return '';
  const text = el.textContent.trim();
  return /^\d{1,2}[.\-\/]?\d{0,2}|^\d{1,2}월/.test(text) ? text : '';
}

// .date_list ul/li 구조 파싱 → [{ year, items: [{date, text}] }]
function parseListSource(src) {
  const groups = new Map();
  const order = [];
  src.querySelectorAll('.date_list li').forEach(li => {
    const dateSpan = li.querySelector('span');
    if (!dateSpan) return;
    const fullDate = dateSpan.textContent.trim();
    const year = fullDate.match(/\d{4}/)?.[0];
    if (!year) return;
    const date = fullDate.replace(/^\d{4}\./, '');
    const text = [...li.childNodes]
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent.trim())
      .filter(Boolean)
      .join(' ');
    if (!text) return;
    if (!groups.has(year)) { groups.set(year, []); order.push(year); }
    groups.get(year).push({ date, text });
  });
  return order.map(year => ({ year, items: groups.get(year) }));
}

// table 행 배열을 받아 [{ year, items }] 반환
function parseTableRows(rows) {
  const groups = new Map();
  const order = [];
  let lastYear = '';

  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('th, td'));
    if (!cells.length) return;
    const c0 = cells[0].textContent.trim();

    // 3컬럼 이상: 연도 | 날짜 | 내용
    if (cells.length >= 3) {
      const yearMatch = c0.match(/\d{4}/);
      if (yearMatch) {
        lastYear = yearMatch[0];
        if (!groups.has(lastYear)) { groups.set(lastYear, []); order.push(lastYear); }
      }
      if (!lastYear) return;
      const date = cells[1].textContent.trim();
      const text = cells.slice(2).map(c => c.textContent.trim()).filter(Boolean).join(' ');
      if (text) groups.get(lastYear).push({ date, text });
      return;
    }

    // 1컬럼: 연도 헤더 행
    if (cells.length === 1) {
      const yearMatch = c0.match(/\d{4}/);
      if (yearMatch) {
        lastYear = yearMatch[0];
        if (!groups.has(lastYear)) { groups.set(lastYear, []); order.push(lastYear); }
      }
      return;
    }

    // 2컬럼: 날짜 | 내용
    if (/^\d{4}$/.test(c0)) {
      lastYear = c0;
      if (!groups.has(lastYear)) { groups.set(lastYear, []); order.push(lastYear); }
      const text = cells[1].textContent.trim();
      if (text) groups.get(lastYear).push({ date: '', text });
      return;
    }
    const yearFromDate = c0.match(/(\d{4})/)?.[0];
    if (yearFromDate) {
      if (!groups.has(yearFromDate)) { groups.set(yearFromDate, []); order.push(yearFromDate); }
      lastYear = yearFromDate;
    }
    if (!lastYear) return;
    const text = cells[1]?.textContent.trim();
    if (text) groups.get(lastYear).push({ date: c0, text });
  });

  return order.map(year => ({ year, items: groups.get(year) })).filter(g => g.items.length);
}

// 진단: parseHistorySource가 빈 결과를 낼 때 원인 로그 (개발/진단용)
function debugHistorySource(src) {
  const body = src.body || src;
  console.group('[history] parseHistorySource 진단');
  console.log('본문 텍스트 (앞 500자):', body.textContent.replace(/\s+/g, ' ').trim().slice(0, 500));
  console.log('dl 수:', body.querySelectorAll('dl').length, '/ dt 수:', body.querySelectorAll('dt').length);
  console.log('li 수:', body.querySelectorAll('li').length);
  console.log('table 수:', body.querySelectorAll('table').length);
  console.log('[class*=year] 수:', body.querySelectorAll('[class*="year"]').length);
  console.log('innerHTML (앞 1000자):', body.innerHTML.slice(0, 1000));
  console.groupEnd();
}

// dl 또는 table 구조 모두 파싱 → [{ year, items: [{date, text}] }]
function parseHistorySource(src) {
  // 1. dl 구조: dt에 연도, dd > ul > li 또는 dd 직접 항목
  const specific = Array.from(src.querySelectorAll('.history_wrap dl, .history_area dl'));
  const dls = specific.length
    ? specific
    : Array.from(src.querySelectorAll('dl')).filter(dl => /\d{4}/.test(dl.querySelector('dt')?.textContent || ''));
  if (dls.length) {
    const groups = dls.map(dl => {
      const year = dl.querySelector('dt')?.textContent.match(/\d{4}/)?.[0] || '';
      const liItems = Array.from(dl.querySelectorAll('dd li'));
      const items = liItems.length
        ? liItems.map(li => ({
            date: extractLiDate(li),
            text: li.querySelector('p')?.textContent.trim() || extractLiText(li),
          }))
        : Array.from(dl.querySelectorAll('dd')).map(dd => ({
            date: '',
            text: dd.textContent.replace(/\s+/g, ' ').trim(),
          }));
      return { year, items: items.filter(i => i.text) };
    }).filter(g => g.year && g.items.length);
    if (groups.length) return groups;
  }

  // 2. .date_list ul/li 구조
  if (src.querySelector('.date_list')) return parseListSource(src);

  // 3. ul > li 연도 그룹 구조 (li 직계 자식에 4자리 연도 텍스트 있는 것)
  const yearGroupLis = Array.from(src.querySelectorAll('li')).filter(li => {
    const yearEl = li.querySelector(':scope > strong, :scope > span, :scope > h2, :scope > h3, :scope > h4, :scope > p, :scope > b, :scope > em, :scope > div');
    return yearEl && /^\d{4}[년\s.]*$/.test(yearEl.textContent.trim());
  });
  if (yearGroupLis.length) {
    const groups = yearGroupLis.map(li => {
      const yearEl = li.querySelector(':scope > strong, :scope > span, :scope > h2, :scope > h3, :scope > h4, :scope > p, :scope > b, :scope > em, :scope > div');
      const year = yearEl.textContent.match(/\d{4}/)[0];
      const items = Array.from(li.querySelectorAll('li')).map(sub => ({
        date: extractLiDate(sub),
        text: sub.querySelector('p')?.textContent.trim() || extractLiText(sub),
      })).filter(item => item.text);
      return { year, items };
    }).filter(g => g.items.length);
    if (groups.length) return groups;
  }

  // 4. 연도 heading + 인접 리스트 구조 (h 태그나 클래스명 기반)
  const yearHeadings = Array.from(src.querySelectorAll('h2, h3, h4, h5, [class*="year"], [class*="tit"]')).filter(el =>
    /^\d{4}[년\s.]*$/.test(el.textContent.trim()) && !el.closest('table')
  );
  if (yearHeadings.length) {
    const groups = yearHeadings.map(heading => {
      const year = heading.textContent.match(/\d{4}/)[0];
      let sibling = heading.nextElementSibling;
      while (sibling && !sibling.querySelector('li') && !['UL', 'OL'].includes(sibling.tagName)) {
        sibling = sibling.nextElementSibling;
      }
      if (!sibling) sibling = heading.parentElement?.nextElementSibling;
      const items = sibling ? Array.from(sibling.querySelectorAll('li')).map(li => ({
        date: extractLiDate(li),
        text: li.querySelector('p')?.textContent.trim() || extractLiText(li),
      })).filter(item => item.text) : [];
      return { year, items };
    }).filter(g => g.items.length);
    if (groups.length) return groups;
  }

  // 5. table 구조 (class 무관 확장)
  const tableResult = parseTableSource(src);
  if (tableResult.length) return tableResult;

  // 6. li 각 항목에 연도+날짜+내용이 하나로 합쳐진 구조 ("2024. 03. 01 입학식" 패턴)
  const flatLis = Array.from(src.querySelectorAll('li')).filter(li =>
    !li.querySelector('ul, ol') && /\d{4}[.\s년]/.test(li.textContent.trim())
  );
  if (flatLis.length >= 2) {
    const groups = new Map();
    const order = [];
    flatLis.forEach(li => {
      const raw = li.textContent.replace(/\s+/g, ' ').trim();
      const m = raw.match(/^(\d{4})[년.\s]\s*(\d{1,2}[월.\s](?:\d{1,2}[일.\s]?)?)?\s*(.+)/);
      if (!m) return;
      const year = m[1];
      const date = (m[2] || '').trim().replace(/\s+/g, '');
      const text = m[3].trim();
      if (!text || text.length < 2) return;
      if (!groups.has(year)) { groups.set(year, []); order.push(year); }
      groups.get(year).push({ date, text });
    });
    const flatResult = order.map(y => ({ year: y, items: groups.get(y) })).filter(g => g.items.length);
    if (flatResult.length) return flatResult;
  }

  // 7. dt/dd 직접 나열 구조 (dt에 날짜, dd에 내용 직접 — 중첩 ul 없음)
  const directDts = Array.from(src.querySelectorAll('dl > dt')).filter(dt => /\d{4}/.test(dt.textContent));
  if (directDts.length >= 2) {
    const groups = new Map();
    const order = [];
    directDts.forEach(dt => {
      const raw = dt.textContent.replace(/\s+/g, ' ').trim();
      const year = raw.match(/\d{4}/)?.[0];
      if (!year) return;
      const date = raw.replace(/\d{4}[.\s년]*/, '').trim();
      let node = dt.nextElementSibling;
      while (node && node.tagName === 'DD') {
        const text = node.textContent.replace(/\s+/g, ' ').trim();
        if (text) {
          if (!groups.has(year)) { groups.set(year, []); order.push(year); }
          groups.get(year).push({ date, text });
        }
        node = node.nextElementSibling;
      }
    });
    const ddResult = order.map(y => ({ year: y, items: groups.get(y) })).filter(g => g.items.length);
    if (ddResult.length) return ddResult;
  }

  // 8. p 태그에 연도+내용이 한 줄에 합쳐진 패턴 ("2024. 03. 01 입학식")
  const flatPs = Array.from(src.querySelectorAll('p')).filter(p =>
    /\d{4}[.\s년]/.test(p.textContent.trim()) && p.textContent.trim().length > 6 && !p.querySelector('ul, ol')
  );
  if (flatPs.length >= 2) {
    const groups = new Map();
    const order = [];
    flatPs.forEach(p => {
      const raw = p.textContent.replace(/\s+/g, ' ').trim();
      const m = raw.match(/^(\d{4})[년.\s]\s*(\d{1,2}[월.\s](?:\d{1,2}[일.\s]?)?)?\s*(.+)/);
      if (!m) return;
      const year = m[1];
      const date = (m[2] || '').trim().replace(/\s+/g, '');
      const text = m[3].trim();
      if (!text || text.length < 2) return;
      if (!groups.has(year)) { groups.set(year, []); order.push(year); }
      groups.get(year).push({ date, text });
    });
    const pResult = order.map(y => ({ year: y, items: groups.get(y) })).filter(g => g.items.length);
    if (pResult.length) return pResult;
  }

  // 9. OCR 결과 형식 — <p>2024년</p> 연도 마커 + 후속 <p> 항목들
  // OCR로 추출된 텍스트는 줄마다 <p> 태그가 되므로, 연도만 있는 p를 기준점으로 하위 p들을 그룹화
  const allPs = Array.from(src.querySelectorAll('p')).filter(p => !p.querySelector('ul, ol'));
  const yearPMarkers = allPs
    .map((p, i) => ({ i, year: p.textContent.trim().match(/^(\d{4})[년\s.]*$/)?.[1] }))
    .filter(x => x.year);

  if (yearPMarkers.length >= 1) {
    const groups = [];
    for (let k = 0; k < yearPMarkers.length; k++) {
      const { year, i } = yearPMarkers[k];
      const nextYearIdx = k + 1 < yearPMarkers.length ? yearPMarkers[k + 1].i : allPs.length;
      const items = [];
      for (let j = i + 1; j < nextYearIdx; j++) {
        const raw = allPs[j].textContent.replace(/\s+/g, ' ').trim();
        if (raw.length < 2) continue;
        const dateM = raw.match(/^(\d{1,2}[.\-\/월]\s*\d{0,2}[.\-\/일]?\s*)(.+)/);
        items.push(dateM
          ? { date: dateM[1].trim(), text: dateM[2].trim() }
          : { date: '', text: raw });
      }
      if (items.length) groups.push({ year, items });
    }
    if (groups.length) return groups;
  }

  // 10. OCR 단일 텍스트 블록 — 연도/날짜/내용이 한 덩어리로 뭉쳐진 경우 줄 분리
  const bodyEl = src.body || src;
  const rawText = bodyEl.innerHTML
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#\d]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ');
  const textLines = rawText.split(/\n/).map(l => l.trim()).filter(l => l.length > 1);

  const lineGroups = new Map();
  const lineOrder = [];
  let curYear = '';
  for (const line of textLines) {
    const pureYear = line.match(/^(\d{4})[년\s.]*$/);
    if (pureYear) {
      curYear = pureYear[1];
      if (!lineGroups.has(curYear)) { lineGroups.set(curYear, []); lineOrder.push(curYear); }
      continue;
    }
    const yearInline = line.match(/^(\d{4})[년.\s]\s*(.{2,})/);
    if (yearInline) {
      const y = yearInline[1];
      curYear = y;
      if (!lineGroups.has(y)) { lineGroups.set(y, []); lineOrder.push(y); }
      const rest = yearInline[2];
      const dm = rest.match(/^(\d{1,2}[.\-\/월]\d{0,2}[.\-\/일]?\s*)(.+)/);
      lineGroups.get(y).push(dm ? { date: dm[1].trim(), text: dm[2].trim() } : { date: '', text: rest.trim() });
      continue;
    }
    if (!curYear) continue;
    const dm = line.match(/^(\d{1,2}[.\-\/月월]\s*\d{0,2}[.\-\/日일]?\s*)(.+)/);
    if (dm && dm[2].trim().length > 1) {
      lineGroups.get(curYear)?.push({ date: dm[1].trim(), text: dm[2].trim() });
    } else if (line.length > 3 && /[가-힣]{2,}/.test(line)) {
      lineGroups.get(curYear)?.push({ date: '', text: line });
    }
  }
  const lineResult = lineOrder.map(y => ({ year: y, items: lineGroups.get(y) })).filter(g => g.items?.length);
  if (lineResult.length) return lineResult;

  return [];
}

// 병렬 컬럼 패턴 파싱: 날짜 셀 / 내용 셀이 각각 <br>로 구분된 2열 1행 구조
function parseParallelColumns(dateCell, contentCell) {
  const dates = dateCell.innerHTML.split(/<br\s*\/?>/i)
    .map(s => s.replace(/<[^>]+>/g, '').replace(/[·•]/g, '').replace(/\s+/g, ' ').trim())
    .filter(s => /\d{4}/.test(s));
  if (dates.length < 2) return [];

  const contents = contentCell.innerHTML.split(/<br\s*\/?>/i)
    .map(s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!contents.length) return [];

  const groups = new Map();
  const order = [];
  dates.forEach((dateStr, i) => {
    const text = contents[i] || '';
    if (!text) return;
    const yearMatch = dateStr.match(/\d{4}/);
    if (!yearMatch) return;
    const year = yearMatch[0];
    const date = dateStr.replace(/^\d{4}[.\s]*/, '').trim();
    if (!groups.has(year)) { groups.set(year, []); order.push(year); }
    groups.get(year).push({ date, text });
  });
  return order.map(year => ({ year, items: groups.get(year) })).filter(g => g.items.length);
}

// table 구조 파싱 → [{ year, items: [{date, text}] }]
function parseTableSource(src) {
  // 특정 래퍼 우선, 없으면 연도 데이터 포함한 첫 번째 테이블
  const specificTable = src.querySelector('.bbs_ListA table');
  const anyTable = !specificTable
    ? Array.from(src.querySelectorAll('table')).find(t =>
        /\d{4}/.test(t.textContent) && t.querySelectorAll('td').length >= 2
      )
    : null;
  const table = specificTable || anyTable;
  if (!table) return [];

  const rows = Array.from(table.querySelectorAll('tbody tr, thead tr, tr')).filter(r => r.querySelector('td, th'));

  // 병렬 컬럼 패턴: 1행에 날짜/내용이 <br>로 나열된 구조
  if (rows.length === 1) {
    const cells = Array.from(rows[0].querySelectorAll('th, td'));
    if (cells.length === 2) {
      const result = parseParallelColumns(cells[0], cells[1]);
      if (result.length) return result;
    }
  }

  return parseTableRows(rows);
}

// 연도 목록을 10년 단위 섹션으로 묶음 (tyB용: "XXXX ~ YYYY" 라벨)
function groupIntoSections(groups) {
  const decadeMap = new Map();
  const decadeOrder = [];
  groups.forEach(g => {
    const decade = String(Math.floor(parseInt(g.year) / 10) * 10);
    if (!decadeMap.has(decade)) { decadeMap.set(decade, []); decadeOrder.push(decade); }
    decadeMap.get(decade).push(g);
  });
  return decadeOrder.map((decade, i) => {
    const gs = decadeMap.get(decade);
    const years = gs.map(g => parseInt(g.year));
    const min = Math.min(...years);
    const max = Math.max(...years);
    const label = i === 0 ? `${max} ~ 현재` : `${min} ~ ${max}`;
    return { label, groups: gs };
  });
}

// 연도 목록을 시대 단위로 묶음 (tyC용: "현재", "2010년대", "2000년대 이전" 라벨)
function groupIntoErasC(groups) {
  const decadeMap = new Map();
  const decadeOrder = [];
  groups.forEach(g => {
    const year = parseInt(g.year);
    const key = year < 2000 ? 'pre2000' : String(Math.floor(year / 10) * 10);
    if (!decadeMap.has(key)) { decadeMap.set(key, []); decadeOrder.push(key); }
    decadeMap.get(key).push(g);
  });
  return decadeOrder.map((key, i) => {
    const label = i === 0 ? '현재' : key === 'pre2000' ? '2000년대 이전' : `${key}년대`;
    return { label, groups: decadeMap.get(key) };
  });
}

export default [
  {
    id: 'history-tyA',
    category: '연혁',
    label: '연혁 tyA',
    desc: '스크롤 연동 Swiper 연혁 + 연도 타임라인',
    previewHeight: 600,
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const groups = parseHistorySource(src);
      if (!groups.length) { debugHistorySource(src); return templateCode; }

      // 1. 첫 번째 연도 → .year span
      const yearSpan = tpl.querySelector('.history.tyA .year span');
      if (yearSpan) yearSpan.textContent = groups[0].year;

      // 2 & 3. 각 그룹 → swiper-slide 재생성
      const swiperWrapper = tpl.querySelector('.historySwiper .swiper-wrapper');
      if (swiperWrapper) {
        swiperWrapper.innerHTML = groups.map(({ year, items }) => {
          const rows = items.map(({ date, text }) =>
            [date ? `  <strong>${date}</strong>` : '', `  ${text ? `<p>${text}</p>` : '<p></p>'}`]
              .filter(Boolean).join('\n')
          ).join('\n');
          return `<div class="swiper-slide" data-year="${year}">\n${rows}\n</div>`;
        }).join('\n');
      }

      // timeline 재생성
      const timelineWrapper = tpl.querySelector('.timelineSwiper .swiper-wrapper');
      if (timelineWrapper) {
        timelineWrapper.innerHTML = groups
          .map(({ year }) => `<div class="swiper-slide" tabindex="0">${year}</div>`)
          .join('\n');
      }

      return tpl.body.innerHTML;
    },
    code: `<script>
$(function () {
  $(".history.tyA").each(function () {
    let $history = $(this);
    let historyEl = $history.find(".historySwiper")[0];
    let timelineEl = $history.find(".timelineSwiper")[0];
    if (!historyEl || !timelineEl || !window.Swiper) return;

    let historySwiper = new Swiper(historyEl, {
      slidesPerView: 1,
      centeredSlides: false,
      spaceBetween: 0,
      speed: 600,
      slideToClickedSlide: true,
      observer: true,
      observeParents: true,
      breakpoints: {
        768: {
          slidesPerView: 2,
          spaceBetween: 24
        },
        1025: {
          slidesPerView: 3,
          centeredSlides: true,
          spaceBetween: 40
        }
      }
    });

    let timelineCount = $history.find(".timelineSwiper .swiper-slide").length || 1;
    let timelineSwiper = new Swiper(timelineEl, {
      slidesPerView: Math.min(3, timelineCount),
      centeredSlides: true,
      slideToClickedSlide: true,
      speed: 600,
      observer: true,
      observeParents: true,
      breakpoints: {
        768: {
          slidesPerView: Math.min(5, timelineCount)
        },
        1025: {
          slidesPerView: Math.min(9, timelineCount)
        }
      }
    });

    function getYear(index) {
      let $slide = $history.find(".historySwiper .swiper-slide").eq(index);
      let year = $slide.attr("data-year") || "";
      if (!year) year = (($slide.text() || "").match(/\\d{4}/) || [""])[0];
      if (!year) year = (($history.find(".timelineSwiper .swiper-slide").eq(index).text() || "").match(/\\d{4}/) || [""])[0];
      return year;
    }

    function setActive(index) {
      let year = getYear(index);
      if (year) $history.find(".year span").text(year);
      $history.find(".timelineSwiper .swiper-slide").removeClass("is-active").eq(index).addClass("is-active");
      if (timelineSwiper.activeIndex !== index) timelineSwiper.slideTo(index);
    }

    historySwiper.on("slideChange", function () {
      setActive(historySwiper.realIndex || historySwiper.activeIndex || 0);
    });

    $history.find(".timelineSwiper .swiper-slide").each(function (index) {
      $(this).on("click keydown", function (event) {
        if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        historySwiper.slideTo(index);
        setActive(index);
      });
    });

    function setHistoryHeight() {
      let slideCount = $history.find(".historySwiper .swiper-slide").length;
      let perSlide = window.innerHeight * 0.9;
      $history.css("height", Math.max(slideCount, 1) * perSlide + "px");
    }

    let historyStart;
    let historyEnd;
    function setScrollRange() {
      historyStart = $history.offset().top;
      historyEnd = historyStart + $history.outerHeight() - $(window).height();
    }

    function refresh() {
      setHistoryHeight();
      setScrollRange();
      historySwiper.update();
      timelineSwiper.update();
    }

    setActive(0);
    refresh();
    $(window).on("resize", refresh);
    $(window).on("scroll", function () {
      let scrollTop = $(window).scrollTop();
      if (scrollTop < historyStart || scrollTop > historyEnd || historyEnd <= historyStart) return;
      let progress = (scrollTop - historyStart) / (historyEnd - historyStart);
      let index = Math.round(Math.max(0, Math.min(1, progress)) * (historySwiper.slides.length - 1));
      historySwiper.slideTo(index);
    });
  });
});
<\/script>

<div class="history tyA">
  <div class="history-sticky">
    <!-- 중앙 year -->
    <div class="history-header">
      <p class="txt a-l"><strong>함께</strong> 걸어온 <strong>발걸음</strong>,</p>
      <div class="year">
        <span>2026</span>
      </div>
      <p class="txt a-r">오늘의 <strong>학교</strong>를 <strong>이루다</strong></p>
    </div>

    <!-- 연혁 콘텐츠 swiper -->
    <div class="list swiper historySwiper">
      <div class="swiper-wrapper">
        <div class="swiper-slide" data-year="2026">
          <strong>02.07 - 02.08</strong>
          <p>연혁 내용이 들어갑니다. 연혁 내용이 들어갑니다. 연혁 내용이 들어갑니다.</p>
          <strong>02.07 - 02.08</strong>
          <p>연혁 내용이 들어갑니다.</p>
          <strong>02.07 - 02.08</strong>
          <p>연혁 내용이 들어갑니다.</p>
        </div>
        <div class="swiper-slide" data-year="2025">
          <strong>02.07 - 02.08</strong>
          <p>연혁 내용이 들어갑니다.</p>
          <strong>02.07 - 02.08</strong>
          <p>연혁 내용이 들어갑니다.</p>
        </div>
        <div class="swiper-slide" data-year="2024">
          <strong>02.07 - 02.08</strong>
          <p>연혁 내용이 들어갑니다.</p>
        </div>
        <div class="swiper-slide" data-year="2023">
          <strong>02.07 - 02.08</strong>
          <p>연혁 내용이 들어갑니다.</p>
        </div>
        <div class="swiper-slide" data-year="2022">
          <strong>02.07 - 02.08</strong>
          <p>연혁 내용이 들어갑니다.</p>
        </div>
        <div class="swiper-slide" data-year="2021">
          <strong>02.07 - 02.08</strong>
          <p>연혁 내용이 들어갑니다.</p>
        </div>
        <div class="swiper-slide" data-year="2020">
          <strong>02.07 - 02.08</strong>
          <p>연혁 내용이 들어갑니다.</p>
        </div>
      </div>
    </div>

    <!-- 하단 연도 swiper -->
    <div class="timeline">
      <div class="swiper timelineSwiper">
        <div class="swiper-wrapper">
          <div class="swiper-slide" tabindex="0">2026</div>
          <div class="swiper-slide" tabindex="0">2025</div>
          <div class="swiper-slide" tabindex="0">2024</div>
          <div class="swiper-slide" tabindex="0">2023</div>
          <div class="swiper-slide" tabindex="0">2022</div>
          <div class="swiper-slide" tabindex="0">2021</div>
          <div class="swiper-slide" tabindex="0">2020</div>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'history-tyB',
    category: '연혁',
    label: '연혁 tyB',
    desc: '스티키 연도 탭 + 스크롤 스파이 + 프로그레스바',
    previewHeight: 700,
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const groups = parseHistorySource(src);
      if (!groups.length) { debugHistorySource(src); return templateCode; }

      const sections = groupIntoSections(groups);

      // 연도 탭 재생성
      const yearUl = tpl.querySelector('.history.tyB .year ul');
      if (yearUl) {
        yearUl.innerHTML = sections.map((s, i) =>
          `<li><a href="javascript:void(0);" data-target="history${i + 1}">${s.label}</a></li>`
        ).join('\n');
      }
      const yearTitle = tpl.querySelector('.history.tyB .year-title');
      if (yearTitle && sections.length) yearTitle.textContent = sections[0].label;

      // list-wrap 재생성
      const listWrap = tpl.querySelector('.history.tyB .list-wrap');
      if (listWrap) {
        const progress = listWrap.querySelector('.progress')?.outerHTML
          || '<p class="progress"><span></span></p>';
        const listHtml = sections.map((s, i) => {
          const dlHtml = s.groups.map(({ year, items }) => {
            const liHtml = items.map(({ date, text }) =>
              `<li><strong>${date}</strong><div class="inr"><p>${text}</p></div></li>`
            ).join('\n');
            return `<dl>\n<dt>${year}</dt>\n<dd>\n<ul class="bu-st3 list">\n${liHtml}\n</ul>\n</dd>\n</dl>`;
          }).join('\n');
          return `<div class="list" id="history${i + 1}">\n${dlHtml}\n</div>`;
        }).join('\n');
        listWrap.innerHTML = progress + listHtml;
      }

      return tpl.body.innerHTML;
    },
    code: `<script>
$(function () {
  const $win = $(window);
  const $sections = $('.history.tyB .list-wrap > .list[id]');
  const $title = $('.history.tyB .year-title');
  const $links = $('.history.tyB .year li > a');
  const $progress = $('.history.tyB .progress span');

  const btnCount = $links.length || 1;
  const basePercent = 100 / btnCount;

  let isClickScrolling = false;
  let clickTargetId = null;

  $('.history.tyB .year li > a').on('click', function (e) {
    e.preventDefault();
    const targetId = $(this).attr('data-target');
    const $target = $('#' + targetId);
    if (!$target.length) return;

    isClickScrolling = true;
    clickTargetId = targetId;

    $links.parent().removeClass('on');
    $(this).parent().addClass('on');
    $title.text($(this).text());

    const targetTop = $target.offset().top - 80;
    const maxScroll = $(document).height() - $win.height();
    const finalTop = Math.min(targetTop, maxScroll);

    $('html, body').stop().animate({ scrollTop: finalTop }, 500, function () {
      isClickScrolling = false;
      clickTargetId = null;
      update();
    });
  });

  let ticking = false;
  $win.on('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
      ticking = true;
    }
  });

  function update() {
    const scrollTop = $win.scrollTop();
    const winH = $win.height();
    let currentId = null;

    if (isClickScrolling && clickTargetId) {
      currentId = clickTargetId;
    } else {
      $sections.each(function () {
        const top = $(this).offset().top - 120;
        if (scrollTop >= top) currentId = $(this).attr('id');
      });
      if (!currentId && $sections.length) currentId = $sections.first().attr('id');
      if (scrollTop + winH >= $(document).height() - 5) currentId = $sections.last().attr('id');
    }

    $links.parent().removeClass('on');
    $links.each(function () {
      if ($(this).attr('data-target') == currentId) {
        $(this).parent().addClass('on');
        $title.text($(this).text());
      }
    });

    if ($sections.length) {
      const firstTop = $sections.first().offset().top - 80;
      const lastTop = $sections.last().offset().top - 80;
      const total = lastTop - firstTop;
      let ratio = 0;
      if (total > 0) {
        ratio = (scrollTop - firstTop) / total;
        ratio = Math.max(0, Math.min(1, ratio));
      }
      let percent = basePercent + ratio * (100 - basePercent);
      if (currentId === $sections.last().attr('id') || scrollTop + winH >= $(document).height() - 5) {
        percent = 100;
      }
      $progress.css('height', percent + '%');
    }
  }

  update();
});
<\/script>

<div class="history tyB"><!-- 이미지 있을 시 'ty-img'-->
  <!-- !!! 연혁 Type B는 각 탭의 연혁 리스트 영역마다 데이터양의 길이가 100vh 정도 일 경우에 추천드립니다. !!! -->
  <div class="container">
    <!-- 이미지 있을 시 -->
    <!-- <div class="obj"><img src="/common/images/sub_com/history_B_bg.png" alt=""></div> -->
    <div class="inner">
      <div class="history-sticky">
        <div class="history-header">
          <h4>학생을 위한 좋은 학교<br><strong>케이엘 학교</strong></h4>
          <strong class="year-title">2020 ~ 현재</strong>
          <div class="year">
            <ul>
              <li><a href="javascript:void(0);" data-target="history1">2020 ~ 현재</a></li>
              <li><a href="javascript:void(0);" data-target="history2">2010 ~ 2019</a></li>
              <li><a href="javascript:void(0);" data-target="history3">2000 ~ 2009</a></li>
              <li><a href="javascript:void(0);" data-target="history4">1990 ~ 1999</a></li>
              <li><a href="javascript:void(0);" data-target="history5">이전 ~ 1989</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div class="list-wrap">
        <p class="progress"><span></span></p>

        <div class="list" id="history1">
          <dl>
            <dt>2025</dt>
            <dd>
              <ul class="bu-st3 list">
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
              </ul>
            </dd>
          </dl>
          <dl>
            <dt>2024</dt>
            <dd>
              <ul class="bu-st3 list">
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
              </ul>
            </dd>
          </dl>
          <dl>
            <dt>2023</dt>
            <dd>
              <ul class="bu-st3 list">
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
              </ul>
            </dd>
          </dl>
        </div>

        <div class="list" id="history2">
          <dl>
            <dt>2012</dt>
            <dd>
              <ul class="bu-st3 list">
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
              </ul>
            </dd>
          </dl>
          <dl>
            <dt>2011</dt>
            <dd>
              <ul class="bu-st3 list">
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
              </ul>
            </dd>
          </dl>
          <dl>
            <dt>2010</dt>
            <dd>
              <ul class="bu-st3 list">
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
              </ul>
            </dd>
          </dl>
        </div>

        <div class="list" id="history3">
          <dl>
            <dt>2002</dt>
            <dd>
              <ul class="bu-st3 list">
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
              </ul>
            </dd>
          </dl>
          <dl>
            <dt>2001</dt>
            <dd>
              <ul class="bu-st3 list">
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
              </ul>
            </dd>
          </dl>
          <dl>
            <dt>2000</dt>
            <dd>
              <ul class="bu-st3 list">
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
              </ul>
            </dd>
          </dl>
        </div>

        <div class="list" id="history4">
          <dl>
            <dt>1999</dt>
            <dd>
              <ul class="bu-st3 list">
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
              </ul>
            </dd>
          </dl>
        </div>

        <div class="list" id="history5">
          <dl>
            <dt>1989 - 이전</dt>
            <dd>
              <ul class="bu-st3 list">
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
                <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
              </ul>
            </dd>
          </dl>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'history-tyC',
    category: '연혁',
    label: '연혁 tyC',
    desc: '스티키 연도 탭 + 스크롤 스파이 + dl 페이드인',
    previewHeight: 700,
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const groups = parseHistorySource(src);
      if (!groups.length) { debugHistorySource(src); return templateCode; }

      const sections = groupIntoErasC(groups);

      // 탭 재생성
      const tabUl = tpl.querySelector('.history.tyC .year ul');
      if (tabUl) {
        tabUl.innerHTML = sections.map((s, i) =>
          `<li${i === 0 ? ' class="on"' : ''}><a href="" data-target="history${i + 1}">${s.label}</a></li>`
        ).join('\n');
      }

      // list-wrap 재생성
      const listWrap = tpl.querySelector('.history.tyC .list-wrap');
      if (listWrap) {
        listWrap.innerHTML = sections.map((s, i) => {
          const dlHtml = s.groups.map(({ year, items }) => {
            const liHtml = items.map(({ date, text }) =>
              `<li><strong>${date}</strong><div class="inr"><p>${text}</p></div></li>`
            ).join('\n');
            return `<dl>\n<dt>${year}</dt>\n<dd>\n<ul>\n${liHtml}\n</ul>\n</dd>\n</dl>`;
          }).join('\n');
          return `<div class="list" id="history${i + 1}">\n${dlHtml}\n</div>`;
        }).join('\n');
      }

      return tpl.body.innerHTML;
    },
    code: `<script>
$(window).on('load', function () {
  const $win = $(window);
  const $sections = $('.history.tyC .list-wrap > .list[id]');
  const $title = $('.history.tyC .year-title');
  const $links = $('.history.tyC .year li > a');

  let isClickScrolling = false;
  let clickTargetId = null;

  $('.history.tyC .year li > a').on('click', function (e) {
    const targetId = $(this).attr('data-target');
    const $target = $('#' + targetId);
    if (!$target.length) return;

    isClickScrolling = true;
    clickTargetId = targetId;

    $links.parent().removeClass('on');
    $(this).parent().addClass('on');
    $title.text($(this).text());

    const targetTop = $target.offset().top - 180;
    const maxScroll = $(document).height() - $win.height();
    const finalTop = Math.min(targetTop, maxScroll);

    $('html, body').stop().animate({ scrollTop: finalTop }, 500, function () {
      isClickScrolling = false;
      clickTargetId = null;
      update();
    });
    e.preventDefault();
  });

  let ticking = false;
  $win.on('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(() => { update(); ticking = false; });
      ticking = true;
    }
  });

  function update() {
    const scrollTop = $win.scrollTop();
    const winH = $win.height();
    let currentId = null;

    if (isClickScrolling && clickTargetId) {
      currentId = clickTargetId;
    } else {
      $sections.each(function () {
        if (scrollTop >= $(this).offset().top - 200) currentId = $(this).attr('id');
      });
      if (!currentId && $sections.length) currentId = $sections.first().attr('id');
      if (scrollTop + winH >= $(document).height() - 5) currentId = $sections.last().attr('id');
    }

    $links.parent().removeClass('on');
    $links.each(function () {
      if ($(this).attr('data-target') == currentId) {
        $(this).parent().addClass('on');
        $title.text($(this).text());
      }
    });

    $('.history.tyC .list dl').each(function () {
      const $dl = $(this);
      const isLast = $dl.is(':last-child');
      const isPageEnd = scrollTop + winH >= $(document).height() - 5;
      if (scrollTop + winH * 0.2 >= $dl.offset().top || (isLast && isPageEnd)) {
        $dl.addClass('active');
      } else {
        $dl.removeClass('active');
      }
    });

    if (scrollTop + winH >= $(document).height() - 5) {
      $('.history.tyC .list dl').last().addClass('active');
    }
  }

  update();
});
<\/script>

<div class="history tyC">
  <div class="container">
    <div class="history-sticky">
      <div class="history-header">
        <h4><span>History</span></h4>
        <div class="year">
          <div class="tab-st cntnts">
            <ul>
              <li class="on"><a href="" data-target="history1">현재</a></li>
              <li><a href="" data-target="history2">2010년대</a></li>
              <li><a href="" data-target="history3">2000년대</a></li>
              <li><a href="" data-target="history4">2000년대 이전</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="list-wrap">
      <div class="list" id="history1">
        <dl>
          <dt>2025</dt>
          <dd>
            <ul>
              <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
              <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
            </ul>
          </dd>
        </dl>
        <dl>
          <dt>2024</dt>
          <dd>
            <ul>
              <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
            </ul>
          </dd>
        </dl>
      </div>
      <div class="list" id="history2">
        <dl>
          <dt>2012</dt>
          <dd>
            <ul>
              <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
            </ul>
          </dd>
        </dl>
      </div>
      <div class="list" id="history3">
        <dl>
          <dt>2002</dt>
          <dd>
            <ul>
              <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
            </ul>
          </dd>
        </dl>
      </div>
      <div class="list" id="history4">
        <dl>
          <dt>1999</dt>
          <dd>
            <ul>
              <li><strong>08.20</strong><div class="inr"><p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p></div></li>
            </ul>
          </dd>
        </dl>
      </div>
    </div>
  </div>
</div>`,
  },
]
