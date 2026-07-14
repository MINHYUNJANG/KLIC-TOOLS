import { useState, useRef, useEffect, useCallback } from 'react';
import { formatHtml } from '../../../../utils/formatHtml';
import { isImageOnlyContent, hasContentImage, getContentImageUrls } from '../../../../utils/ocrSymbol';
import { cleanTableHtml } from '../../../../utils/tableTransform/cleanTableHtml';
import { MARKER_TYPES } from '../../../../utils/tableTransform/constants';
import greeting from '../../../../templates/greeting';
import history from '../../../../templates/history';
import symbol from '../../../../templates/symbol';
import principal from '../../../../templates/principal';
import location from '../../../../templates/location';
import classList from '../../../../templates/classList';
import useToast from '../../../TableEditor/hooks/useToast';
import InspectionHelpModal from '../../menu03/components/InspectionHelpModal';
import JSZip from 'jszip';

// 운영 사이트에서는 common.js/sub_com.js 등 스크립트를 레이아웃에서 공통으로 불러오므로,
// 페이지별 저장 마크업에는 크롤링 원본에 섞여있던 <script>가 남아있으면 안 된다.
function stripScriptTags(html) {
  if (!html || typeof window === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script').forEach(el => el.remove());
  return doc.body.innerHTML;
}

// bullet을 제외한 모든 마커(①②③, 1. 2., 가. 나., Ⅰ.Ⅱ. 등)는 순서가 있는 목록이므로
// order-st + <span class="mrk"> 형태로 마크업한다 (con_com.css guide 기준).
const GWANGJU_LIST_OL_TYPES = Object.keys(MARKER_TYPES).filter(type => type !== 'bullet');

// 광주 "기본" 변환: con_com.css 클래스 체계(표 tbl-st / 리스트 bu-st·order-st / 제목 tit-st)로
// 표·리스트·제목을 일괄 정규화한다. 표/리스트 혼재 순서 처리는 이미 검증된
// 테이블변환(cleanTableHtml) 로직을 그대로 재사용한다.
const GWANGJU_BASIC_CONFIG = {
  wrapperClassName: 'tbl-st',
  tableUlClassName: 'bu-st list',
  tableOlType: GWANGJU_LIST_OL_TYPES,
  tableKeepMarker: false,
  tableType: 'default',
  isWrapDiv: true,
  isVerticalHeader: false,
  headerRows: 1,
  headerCols: 1,
  isColorMode: false,
  isColorClassMode: true,
  tableListStartFrom2: false,
  isMergeTables: false,
  keepMarker: false,
  ulClassName: 'bu-st list',
  olType: GWANGJU_LIST_OL_TYPES,
  listStartFrom2: false,
  tit1: null,
  tit2: null,
  tit3: null,
  tit1Class: 'tit-st section',
  tit2Class: 'tit-st contents',
  tit3Class: 'tit-st unit',
};

// <li> 안에 "①", "1." 같은 마커가 텍스트로 박혀 있으면 cleanTableHtml의 마커 인식
// 로직이 이를 다시 order-st 목록으로 재구성할 수 있도록, 마커가 있는 항목만 골라
// 평문 <p>로 풀어둔다. 마커 없는 순수 리스트는 태그 그대로 둔다
// (cleanTableHtml이 기존 ul/ol 구조를 보존한 채 클래스만 새로 매겨준다).
function hasExplicitMarker(text) {
  const trimmed = (text || '').trim();
  return Object.entries(MARKER_TYPES).some(([type, regex]) => type !== 'bullet' && regex.test(trimmed));
}

function getExplicitMarker(text) {
  const trimmed = (text || '').trim();
  for (const [type, regex] of Object.entries(MARKER_TYPES)) {
    if (type === 'bullet') continue;
    const match = trimmed.match(regex);
    if (match) return { type, match: match[0] };
  }
  return null;
}

// dl은 표변환 로직이 지원하는 출력 태그 목록(ALLOWED_TAGS)에 없어서 그대로 두면 태그만
// 벗겨지고 텍스트가 줄바꿈도 없이 뭉쳐버린다. dl의 dt/dd는 명시적 번호가 없어도 항목이
// 여러 개 나열된 목록이므로, dt(+뒤따르는 dd)를 한 항목으로 묶어 <p>로 풀어내되, 그
// 항목에 마커가 전혀 없으면 "N. "을 텍스트로 주입해 cleanTableHtml의 마커 인식 로직이
// (주변의 다른 마커 항목과 함께) 올바른 중첩까지 포함해 order-st 리스트로 재구성하게
// 맡긴다 — 완성된 <ol>을 미리 만들면 그 지점에서 바깥 리스트의 중첩 흐름이 끊긴다.
function flattenDefinitionLists(container) {
  Array.from(container.querySelectorAll('dl')).forEach(dl => {
    if (dl.closest('table')) return;
    const children = Array.from(dl.children).filter(c => c.tagName === 'DT' || c.tagName === 'DD');
    if (!children.length) { dl.remove(); return; }

    // dt 하나 + 그 바로 다음 dd 하나만 한 항목으로 묶는다. dt 없이 dd만 연달아 나오는
    // 경우(원본에 이미 "1. 2. 3." 처럼 각자 번호가 박혀있는 경우가 많음)는 각 dd를 별개
    // 항목으로 취급해야 하므로, dt의 "첫 dd"가 아니면 항상 새 항목을 시작한다.
    const items = [];
    let current = null;
    children.forEach(child => {
      if (child.tagName === 'DT') {
        current = { dt: child, dds: [] };
        items.push(current);
      } else if (current && current.dt && current.dds.length === 0) {
        current.dds.push(child);
      } else {
        current = { dt: null, dds: [child] };
        items.push(current);
      }
    });

    const frag = document.createDocumentFragment();
    items.forEach((item, idx) => {
      const p = document.createElement('p');
      if (item.dt) {
        const strong = document.createElement('strong');
        while (item.dt.firstChild) strong.appendChild(item.dt.firstChild);
        p.appendChild(strong);
      }
      item.dds.forEach(dd => {
        if (p.childNodes.length > 0) p.appendChild(document.createElement('br'));
        while (dd.firstChild) p.appendChild(dd.firstChild);
      });
      if (!hasExplicitMarker(p.textContent)) {
        p.insertBefore(document.createTextNode(`${idx + 1}. `), p.firstChild);
      }
      frag.appendChild(p);
    });
    dl.replaceWith(frag);
  });
}

function flattenMarkedListItems(html) {
  if (!html || typeof window === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const container = doc.body;

  flattenDefinitionLists(container);

  // li는 마커(①, 1. 등)가 있을 때만 평문 <p>로 풀어서 order-st 재구성 대상이 되게 하고,
  // 마커 없는 순수 리스트는 태그 그대로 둔다(cleanTableHtml이 구조를 보존한 채 클래스만 새로 매김).
  Array.from(container.querySelectorAll('li')).forEach(item => {
    if (item.closest('table')) return;
    if (!hasExplicitMarker(item.textContent)) return;
    const p = document.createElement('p');
    while (item.firstChild) p.appendChild(item.firstChild);
    item.replaceWith(p);
  });

  // li가 하나도 안 남은 ul/ol 래퍼는 걷어내고 남은 자식은 제자리에 둔다.
  Array.from(container.querySelectorAll('ul, ol')).forEach(listEl => {
    if (listEl.closest('table')) return;
    const hasRemainingItems = Array.from(listEl.children).some(c => c.tagName === 'LI');
    if (hasRemainingItems) return;
    listEl.replaceWith(...Array.from(listEl.childNodes));
  });

  return container.innerHTML;
}

// cleanTableHtml은 body의 최상위 자식들을 평평한 블록 시퀀스로 가정하고 순회하므로,
// 크롤링 결과처럼 <div id="content"><div class="help09">...실제 내용...</div></div>처럼
// 감싸는 div가 하나 이상 겹쳐 있으면 표를 포함한 안쪽 wrapper 전체가 "표 노드" 취급되어
// 그 안의 다른 형제 콘텐츠가 통째로 유실된다. 의미 있는 자식이 정확히 하나뿐인 래퍼 div를
// (주석·공백 제외) 만나는 한 계속 파고들어 실제 콘텐츠가 평평하게 나열된 지점을 찾는다.
function findFlatContentRoot(el) {
  let current = el;
  while (true) {
    const meaningfulChildren = Array.from(current.childNodes).filter(n => {
      if (n.nodeType === 8) return false;
      if (n.nodeType === 3 && !n.textContent.trim()) return false;
      return true;
    });
    const onlyChild = meaningfulChildren.length === 1 ? meaningfulChildren[0] : null;
    // table/tbody/tr는 그 자체로 "감싸는 wrapper div"가 아니라 표 구조의 일부라서, 안으로
    // 더 파고들면 cleanTableHtml에 낱개 <tr>만 남겨 표 전체가 깨진다. table을 만나면 멈춘다.
    if (onlyChild?.nodeType === 1 && onlyChild.tagName !== 'TABLE') {
      current = onlyChild;
      continue;
    }
    return current;
  }
}

// 크롤링 결과에 섞여오는 탭 메뉴(예: class="tapMenu"로 감싼 class="TabM_1" li,
// 또는 id="tabNavi")를 guide.html의 표준 탭 마크업(.tab-st depth01)으로 바꾼다.
// 래퍼 클래스명이 사이트마다 "tapMenu"처럼 살짝 다르게 오타나 있기도 해서, li 클래스에
// "tab"이 들어있는지까지 함께 본다.
function isTabLike(el) {
  if (!el || el.nodeType !== 1) return false;
  const cls = el.className || '';
  const id = el.id || '';
  return /tab/i.test(cls) || /tab/i.test(id);
}

// class/id에 "tab"이 전혀 없어도(예: <li class="on"><p><a class="bu_link" href="...">)
// href의 sid= 값을 공유하는 형제 링크들이면 사실상 같은 탭 그룹이다. 그중 하나는 현재
// 탭이라 sid= 없이 자기 id만 가리키는 경우가 많으므로, sid 값 일치가 2개 이상이면 충분하다.
function looksLikeSidTabGroup(items) {
  if (items.length < 2) return false;
  const hasActive = items.some(li => /(^|\s)on(\s|$)/.test(li.className || ''));
  if (!hasActive) return false;
  const sidValues = items
    .map(li => {
      const href = li.querySelector('a[href]')?.getAttribute('href') || '';
      return href.match(/[?&]sid=([^&]+)/i)?.[1] || null;
    })
    .filter(Boolean);
  return sidValues.length >= 2 && new Set(sidValues).size === 1;
}

// cleanTableHtml에 넘기면 새로 만든 tab-st div를 "빈 div"로 오인해 <p>로 풀어버리거나
// 안의 ul을 bu-st 리스트로 재분류해버릴 수 있어, 탭 변환은 cleanTableHtml 실행 전에 하고
// 결과물은 텍스트 플레이스홀더로 감싸 무사히 통과시킨 뒤 실제 탭 마크업으로 되돌린다.
function convertTabMenus(container) {
  const lists = Array.from(container.querySelectorAll('ul, ol'));
  const blocks = [];

  lists.forEach((list, i) => {
    const items = Array.from(list.children).filter(c => c.tagName === 'LI');
    const looksLikeTabs = isTabLike(list) ||
      (items.length > 1 && items.every(li => isTabLike(li))) ||
      looksLikeSidTabGroup(items);
    if (!looksLikeTabs) return;

    const tabItems = items.map(li => {
      const a = li.querySelector('a');
      const active = /(^|\s)on(\s|$)/.test(li.className || '') ||
        /현재\s*페이지/.test((a && a.getAttribute('title')) || '');
      return {
        href: a ? (a.getAttribute('href') || '') : '',
        label: (a ? a.textContent : li.textContent).replace(/\s+/g, ' ').trim(),
        active,
      };
    }).filter(t => t.label);
    if (!tabItems.length) return;

    const placeholder = `@@GWANGJU_TAB_${i}@@`;
    const p = document.createElement('p');
    p.textContent = placeholder;

    // ul 하나만 감싸고 있는 래퍼 div(예: .tapMenu)가 있으면 그 wrapper까지 통째로 교체한다.
    const parent = list.parentElement;
    const disposableWrapper = parent && parent !== container && parent.tagName === 'DIV' &&
      parent.children.length === 1;
    (disposableWrapper ? parent : list).replaceWith(p);

    blocks.push({ placeholder, items: tabItems });
  });

  return blocks;
}

function renderTabBlock({ items }) {
  let activeUsed = false;
  const li = items.map(t => {
    const active = Boolean(t.active && !activeUsed);
    if (active) activeUsed = true;
    const cls = active ? ' class="on"' : '';
    const href = t.href ? ` href="${t.href}"` : '';
    return `<li${cls}><a${href}>${t.label}</a></li>`;
  }).join('');
  return `<div class="tab-st depth01"><ul>${li}</ul></div>`;
}

function unwrapOrderListStrong(container) {
  Array.from(container.querySelectorAll('ol[class*="order-st"] > li > strong')).forEach(strong => {
    const frag = document.createDocumentFragment();
    while (strong.firstChild) frag.appendChild(strong.firstChild);
    strong.replaceWith(frag);
  });
}

// cleanTableHtml은 h3/h4/h5만 tit-st(section/contents/unit)로 정규화해준다. "가) 인성교육
// 내용"처럼 순차 마커가 붙은 h6("나)", "다)" ...로 이어지는 하위 소제목)나 드물게 쓰이는
// h1/h2는 그 대상이 아니라 원래 클래스가 그대로 남는다. con_com.css 타이틀 위계상 h6은
// tit-st item에 해당하므로 미리 정규화해둔다(마커 텍스트 자체는 순서를 보여주므로 유지).
function normalizeExtraHeadings(container) {
  Array.from(container.querySelectorAll('h1, h2')).forEach(h => { h.className = 'tit-st section'; });
  Array.from(container.querySelectorAll('h6')).forEach(h => { h.className = 'tit-st item'; });
}

function promoteInlineFirstNestedListItems(container) {
  Array.from(container.querySelectorAll('li')).forEach(parentLi => {
    const directChildren = Array.from(parentLi.childNodes);
    const nestedListIndex = directChildren.findIndex(node =>
      node.nodeType === 1 && (node.tagName === 'OL' || node.tagName === 'UL')
    );
    if (nestedListIndex < 0) return;

    const nestedList = directChildren[nestedListIndex];
    let breakIndex = -1;
    for (let index = nestedListIndex - 1; index >= 0; index -= 1) {
      const node = directChildren[index];
      if (node.nodeType === 1 && node.tagName === 'BR') {
        breakIndex = index;
        break;
      }
      if (node.nodeType === 1 && /^(OL|UL|P|DIV|TABLE)$/.test(node.tagName)) break;
    }
    if (breakIndex < 0) {
      breakIndex = nestedListIndex - 1;
      while (breakIndex >= 0 && directChildren[breakIndex].nodeType === 3) breakIndex -= 1;
    }

    const inlineNodes = directChildren.slice(breakIndex + 1, nestedListIndex);
    const inlineText = inlineNodes.map(node => node.textContent || '').join('').trim();
    const marker = getExplicitMarker(inlineText);
    if (!marker) return;

    const holder = document.createElement('div');
    inlineNodes.forEach(node => holder.appendChild(node.cloneNode(true)));
    const walker = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
      if (!textNode.textContent.trim()) continue;
      textNode.textContent = textNode.textContent.replace(
        new RegExp(`^\\s*${marker.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
        ''
      );
      break;
    }

    const firstItem = document.createElement('li');
    const markerSpan = document.createElement('span');
    markerSpan.className = 'mrk';
    markerSpan.textContent = marker.match.replace(/[.\s()]/g, '');
    firstItem.appendChild(markerSpan);
    firstItem.appendChild(document.createTextNode(' '));
    while (holder.firstChild) firstItem.appendChild(holder.firstChild);

    if (directChildren[breakIndex]?.nodeType === 1 && directChildren[breakIndex].tagName === 'BR') {
      directChildren[breakIndex].remove();
    }
    inlineNodes.forEach(node => node.remove());
    nestedList.insertBefore(firstItem, nestedList.firstChild);
  });
}

function applyGwangjuBasicMarkup(html) {
  if (!html || typeof window === 'undefined') return html;
  const flattened = flattenMarkedListItems(html);
  const doc = new DOMParser().parseFromString(flattened, 'text/html');
  const wrapper = doc.body.firstElementChild;
  if (!wrapper) return cleanTableHtml(flattened, GWANGJU_BASIC_CONFIG);

  const target = findFlatContentRoot(wrapper);
  normalizeExtraHeadings(target);
  const tabBlocks = convertTabMenus(target);
  let cleaned = cleanTableHtml(target.innerHTML, GWANGJU_BASIC_CONFIG);
  tabBlocks.forEach(block => {
    cleaned = cleaned.replace(`<p>${block.placeholder}</p>`, renderTabBlock(block));
  });
  target.innerHTML = cleaned;
  promoteInlineFirstNestedListItems(target);
  unwrapOrderListStrong(target);
  return doc.body.innerHTML;
}

// auto-markup 결과 HTML의 테이블 구조만 정규화
// applyTableSemantics는 내부에서 메인 document.createElement를 쓰므로
// DOMParser document와 컨텍스트가 달라 래핑이 깨짐 → 직접 구현
function applyTableProcessing(html) {
  if (!html || !html.includes('<table')) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const getMaxColumnCount = table => Array.from(table.rows).reduce((max, row) => {
    const count = Array.from(row.cells).reduce((sum, cell) => {
      return sum + parseInt(cell.getAttribute('colspan') || '1', 10);
    }, 0);
    return Math.max(max, count);
  }, 0);

  const shouldUseWideScroll = table => {
    const maxCols = getMaxColumnCount(table);
    if (maxCols >= 8) return true;
    const headerTextLength = Array.from(table.querySelectorAll('thead th, tr:first-child th, tr:first-child td'))
      .reduce((sum, cell) => sum + cell.textContent.replace(/\s+/g, '').length, 0);
    return maxCols >= 6 && headerTextLength >= 36;
  };

  const applyWideScrollClass = table => {
    const parent = table.parentElement;
    if (parent && parent.tagName === 'DIV' && /\btbl-st\b/.test(parent.className || '')) {
      parent.classList.remove('scroll-w');
      if (!shouldUseWideScroll(table)) {
        if (parent.parentElement?.classList.contains('scroll-wrap')) {
          parent.parentElement.replaceWith(parent);
        }
        return;
      }
      parent.classList.add('scroll-w');
      if (!parent.parentElement?.classList.contains('scroll-wrap')) {
        const scrollWrap = doc.createElement('div');
        scrollWrap.className = 'scroll-wrap';
        parent.parentNode.insertBefore(scrollWrap, parent);
        scrollWrap.appendChild(parent);
      }
    }
  };

  Array.from(doc.querySelectorAll('table')).forEach(table => {
    if (table.closest('table')) return; // 중첩 테이블 제외

    table.removeAttribute('class');

    // div.tbl-st 래핑 보정
    const parent = table.parentElement;
    const parentIsTblSt = parent && parent.tagName === 'DIV' && /\btbl-st\b/.test(parent.className || '');
    if (parentIsTblSt) {
      // 이미 올바른 wrapper div가 있음 — 긴 표면 con_com.css의 가로 스크롤 클래스를 추가
      applyWideScrollClass(table);
    } else if (parent && parent.tagName === 'DIV' && parent.children.length === 1) {
      parent.className = 'tbl-st';
      applyWideScrollClass(table);
    } else {
      const wrapper = doc.createElement('div');
      wrapper.className = 'tbl-st';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
      applyWideScrollClass(table);
    }

    // thead / tbody 분리 + 첫 행 th 변환
    const allRows = Array.from(
      table.querySelectorAll(':scope > tr, :scope > tbody > tr, :scope > thead > tr, :scope > tfoot > tr')
    );
    if (!allRows.length) return;

    const thead = doc.createElement('thead');
    const tbody = doc.createElement('tbody');

    allRows.forEach((row, i) => {
      if (i === 0) {
        Array.from(row.cells).forEach(cell => {
          if (cell.tagName === 'TD') {
            const th = doc.createElement('th');
            th.setAttribute('scope', 'col');
            while (cell.firstChild) th.appendChild(cell.firstChild);
            Array.from(cell.attributes).forEach(a => {
              if (a.name !== 'scope') th.setAttribute(a.name, a.value);
            });
            cell.replaceWith(th);
          } else {
            cell.setAttribute('scope', 'col');
          }
        });
        thead.appendChild(row);
      } else {
        tbody.appendChild(row);
      }
    });

    // caption 자동 생성
    const headerTexts = Array.from(thead.querySelectorAll('th'))
      .map(th => th.textContent.trim()).filter(Boolean);

    const existingCaption = table.querySelector('caption');
    table.innerHTML = '';
    if (existingCaption) {
      table.appendChild(existingCaption);
    } else if (headerTexts.length) {
      const caption = doc.createElement('caption');
      caption.textContent = `${headerTexts.join(', ')}의 정보를 포함한 표입니다.`;
      table.appendChild(caption);
    }
    if (thead.hasChildNodes()) table.appendChild(thead);
    table.appendChild(tbody);
    applyWideScrollClass(table);
  });

  return doc.body.innerHTML;
}

function normalizeGeneratedMarkup(html) {
  if (!html?.trim()) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;

  function replaceHeadingTag(element, tagName) {
    const next = doc.createElement(tagName);
    Array.from(element.attributes).forEach(attr => {
      next.setAttribute(attr.name, attr.value);
    });
    while (element.firstChild) next.appendChild(element.firstChild);
    element.replaceWith(next);
    return next;
  }

  Array.from(body.querySelectorAll('.tit-st.section')).forEach(title => {
    title.classList.remove('section');
    title.classList.add('contents');
    if (title.tagName === 'H3') replaceHeadingTag(title, 'h2');
  });

  const firstElement = Array.from(body.children).find(el => el.textContent.trim() || el.children.length > 0);
  if (
    firstElement?.matches('.tit-st.contents') &&
    ['H3', 'H4'].includes(firstElement.tagName)
  ) {
    replaceHeadingTag(firstElement, 'h2');
  }

  Array.from(body.querySelectorAll('h3.tit-st.contents')).forEach(title => {
    const h2 = doc.createElement('h2');
    Array.from(title.attributes).forEach(attr => {
      if (attr.name !== 'class') h2.setAttribute(attr.name, attr.value);
    });
    h2.className = title.className;
    while (title.firstChild) h2.appendChild(title.firstChild);
    title.replaceWith(h2);
  });

  Array.from(body.querySelectorAll('.tit-st')).forEach(title => {
    const next = title.nextElementSibling;
    if (!next?.classList.contains('indent')) return;

    const indentChildren = Array.from(next.children);
    const firstMeaningful = indentChildren.find(el => el.textContent.trim() || el.children.length > 0);
    const hasTableBlock = firstMeaningful?.classList.contains('tbl-st') ||
      (firstMeaningful?.classList.contains('scroll-wrap') && firstMeaningful.querySelector(':scope > .tbl-st'));
    if (!hasTableBlock) return;

    while (next.firstChild) {
      title.parentNode.insertBefore(next.firstChild, next);
    }
    next.remove();
  });

  promoteInlineFirstNestedListItems(body);
  unwrapOrderListStrong(body);

  return formatHtml(body.innerHTML);
}

const ALL_TEMPLATES = [...greeting, ...history, ...symbol, ...principal, ...location, ...classList];
const CATEGORY_TEMPLATES = { greeting, history, symbol, principal, location, classList };
const MARKUP_HISTORY_STORAGE_KEY = 'klic-school-integrated-markup-history-v1';
const MARKUP_HISTORY_MAX = 50;
const GWANGJU_SAVED_MARKUP_STORAGE_KEY = 'klic-gwangju-saved-markup-by-url-v1';

function readMarkupHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(MARKUP_HISTORY_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => item?.html?.trim()) : [];
  } catch {
    return [];
  }
}

function formatHistoryTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function readGwangjuSavedMarkupByUrl() {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(GWANGJU_SAVED_MARKUP_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}

function shortLabel(url, title) {
  if (title) return title.length > 20 ? title.slice(0, 20) + '…' : title;
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : u.hostname;
  } catch { return url; }
}

function buildIframeDoc(bodyContent, previewStyle = '') {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css">
  <link rel="stylesheet" href="/basic.css">
  <link rel="stylesheet" href="/con_com.css">
  <link rel="stylesheet" href="/theme.css">
  <link rel="stylesheet" href="/sub_com.css">
  ${previewStyle ? `<style>${previewStyle}</style>` : ''}
  <script>
    window.addEventListener('error', function (event) {
      if (event.message && event.message.indexOf("reading 'classList'") > -1) {
        event.preventDefault();
      }
    });
    window.addEventListener('unhandledrejection', function (event) {
      var reason = event.reason;
      var message = reason && (reason.message || String(reason));
      if (message && message.indexOf("reading 'classList'") > -1) {
        event.preventDefault();
      }
    });
  </script>
  <script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
</head>
<body style="padding:1.5rem 2.5rem;">
${bodyContent}
<script>
(function () {
  function textYear(text) {
    var match = String(text || '').match(/\\d{4}/);
    return match ? match[0] : '';
  }

  function initHistoryTypeA(root) {
    if (!window.Swiper) return;
    var historyEl = root.querySelector('.historySwiper');
    var timelineEl = root.querySelector('.timelineSwiper');
    if (!historyEl || !timelineEl) return;
    if (historyEl.dataset.klicHistoryReady === '1') return;
    historyEl.dataset.klicHistoryReady = '1';

    if (historyEl.swiper) historyEl.swiper.destroy(true, true);
    if (timelineEl.swiper) timelineEl.swiper.destroy(true, true);

    var yearSpan = root.querySelector('.history-header .year span') || root.querySelector('.year span');
    var timelineSlides = timelineEl.querySelectorAll('.swiper-slide');
    var historySwiper = new Swiper(historyEl, {
      slidesPerView: 1,
      centeredSlides: false,
      spaceBetween: 0,
      speed: 600,
      observer: true,
      observeParents: true,
      slideToClickedSlide: true,
      breakpoints: {
        768: { slidesPerView: 2, spaceBetween: 24 },
        1025: { slidesPerView: 3, centeredSlides: true, spaceBetween: 40 }
      }
    });
    var timelineSwiper = new Swiper(timelineEl, {
      slidesPerView: Math.min(3, Math.max(timelineSlides.length, 1)),
      centeredSlides: true,
      slideToClickedSlide: true,
      speed: 600,
      observer: true,
      observeParents: true,
      breakpoints: {
        768: { slidesPerView: Math.min(5, Math.max(timelineSlides.length, 1)) },
        1025: { slidesPerView: Math.min(9, Math.max(timelineSlides.length, 1)) }
      }
    });

    function setActive(index) {
      var historySlide = historySwiper.slides[index];
      var year = historySlide ? (historySlide.getAttribute('data-year') || textYear(historySlide.textContent)) : '';
      if (!year && timelineSlides[index]) year = textYear(timelineSlides[index].textContent);
      if (yearSpan && year) yearSpan.textContent = year;
      Array.prototype.forEach.call(timelineSlides, function (slide, slideIndex) {
        slide.classList.toggle('is-active', slideIndex === index);
      });
      if (timelineSwiper && timelineSwiper.activeIndex !== index) timelineSwiper.slideTo(index);
    }

    historySwiper.on('slideChange', function () {
      setActive(historySwiper.realIndex || historySwiper.activeIndex || 0);
    });
    Array.prototype.forEach.call(timelineSlides, function (slide, index) {
      slide.addEventListener('click', function () {
        historySwiper.slideTo(index);
        setActive(index);
      });
      slide.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          historySwiper.slideTo(index);
          setActive(index);
        }
      });
    });

    setActive(0);
    setTimeout(function () {
      historySwiper.update();
      timelineSwiper.update();
    }, 100);
  }

  function initHistorySlides() {
    if (!window.Swiper) return;
    document.querySelectorAll('.history.tyA').forEach(initHistoryTypeA);
  }

  window.addEventListener('load', initHistorySlides);
  document.addEventListener('DOMContentLoaded', initHistorySlides);
  setTimeout(initHistorySlides, 250);
})();
</script>
</body>
</html>`;
}

const INNER_NOISE_KEYWORDS = [
  'header', 'footer', 'gnb', 'lnb', 'snb', 'sidebar',
  'nav', 'navigation', 'menu', 'quick', 'banner', 'ad',
  'location', 'breadcrumb', 'crumb', 'sns', 'snsbox', 'share',
  'print', 'toolbar', 'util', 'floating', 'popup',
  'title_bar', 'titlebar', 'tit_bar', 'titbar',
  'sub_visual', 'page_head', 'cont_head', 'sub_head',
];

function removeInnerNoise(el) {
  el.querySelectorAll('div, nav, ul, ol, p, span, button, a').forEach(child => {
    const id = (child.id || '').toLowerCase();
    const cls = (child.className || '').toLowerCase();
    if (INNER_NOISE_KEYWORDS.some(kw => id.includes(kw) || cls.includes(kw))) {
      child.remove();
    }
  });
}

// 텍스트 패턴 기반 breadcrumb 제거 (HOME > 학교소개 > ... 등)
// 클래스명에 무관하게 "HOME >" 또는 "홈 >" 으로 시작하는 위치 표시 요소를 제거
function removeBreadcrumb(el) {
  el.querySelectorAll('div, nav, ul, ol, p').forEach(child => {
    const text = child.textContent.replace(/\s+/g, ' ').trim();
    if (text.length < 200 && /^(HOME|홈|메인)\s*[>▶›»·]/i.test(text)) {
      child.remove();
    }
  });
}

function extractContent(html, selector = '', baseUrl = '') {
  const absolutizeImages = (doc) => {
    if (!baseUrl) return;
    doc.querySelectorAll('img[src]').forEach(img => {
      try { img.src = new URL(img.getAttribute('src'), baseUrl).href; } catch {}
    });
  };

  let doc;
  if (selector.trim()) {
    doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, noscript, iframe, svg').forEach(el => el.remove());
    absolutizeImages(doc);
    const matched = Array.from(doc.querySelectorAll(selector.trim()));
    if (matched.length > 0) {
      matched.forEach(el => {
        removeInnerNoise(el);
        removeBreadcrumb(el);
        el.querySelectorAll('*').forEach(child => {
          ['style', 'onclick', 'onload', 'onerror'].forEach(attr => child.removeAttribute(attr));
        });
      });
      return formatHtml(matched.map(el => el.outerHTML).join('\n'));
    }
  }
  // 전체 HTML에서 DOM 셀렉터로 먼저 탐색 (<!-- contents --> 커멘트가 여러 개일 때 잘못된 구간이 잡히는 문제 방지)
  doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript, iframe, svg').forEach(el => el.remove());
  absolutizeImages(doc);
  const DOM_SELECTORS = [
    '.greeting',
    '#subContent', '#sub_content',
    '#sub_container', '#subContainer',
    'main',
    '#content', '#contents',
    '.contents', '.content',
    '#container',
    '#contArea', '#cont_area', '#contWrap', '#cont_wrap',
    '#contentArea', '#content_area', '#contentWrap', '#content_wrap',
    '#pageContent', '#page_content',
    '.sub_cont', '.subCont', '.sub_content',
    '#wrap_content', '#wrapContent',
  ];
  let target = null;
  for (const sel of DOM_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el) { target = el; break; }
  }
  if (target) {
    removeInnerNoise(target);
    removeBreadcrumb(target);
    target.querySelectorAll('*').forEach(el => {
      ['style', 'onclick', 'onload', 'onerror'].forEach(attr => el.removeAttribute(attr));
    });
    return formatHtml(target.innerHTML);
  }
  // 폴백: <!-- contents --> 커멘트 구간 추출
  const match = html.match(/<!--\s*contents\s*-->([\s\S]*?)<!--[^>]*contents[^>]*-->/i);
  const sourceHtml = match ? match[1].trim() : html;
  const fallbackDoc = new DOMParser().parseFromString(sourceHtml, 'text/html');
  fallbackDoc.querySelectorAll('script, style, noscript, iframe, svg').forEach(el => el.remove());
  absolutizeImages(fallbackDoc);
  removeInnerNoise(fallbackDoc.body);
  removeBreadcrumb(fallbackDoc.body);
  fallbackDoc.body.querySelectorAll('*').forEach(el => {
    ['style', 'onclick', 'onload', 'onerror'].forEach(attr => el.removeAttribute(attr));
  });
  return formatHtml(fallbackDoc.body.innerHTML);
}

// 푸터 영역만 추출 (푸터메뉴 카테고리 전용)
function extractFooterContent(html, baseUrl = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript, iframe, svg').forEach(el => el.remove());

  if (baseUrl) {
    doc.querySelectorAll('a[href]').forEach(a => {
      try { a.href = new URL(a.getAttribute('href'), baseUrl).href; } catch {}
    });
  }

  const FOOTER_SELECTORS = [
    'footer', '#footer', '.footer', '.fnb',
    '[class*="footer"]', '[id*="footer"]',
    '[class*="fnb"]', '[id*="fnb"]',
  ];

  let footerEl = null;
  for (const sel of FOOTER_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el) { footerEl = el; break; }
  }

  if (!footerEl) return formatHtml(doc.body.innerHTML);

  footerEl.querySelectorAll('*').forEach(el => {
    ['style', 'onclick', 'onload', 'onerror'].forEach(attr => el.removeAttribute(attr));
  });

  return formatHtml(footerEl.innerHTML);
}

function applyMarkupToTemplate(sourceMarkup, templateCode, templateId) {
  const template = ALL_TEMPLATES.find(t => t.id === templateId);
  if (template?.applyMapping) return template.applyMapping(sourceMarkup, templateCode);
  return templateCode;
}

function resizeIframe(iframe) {
  if (!iframe?.contentDocument?.body) return;
  const doc = iframe.contentDocument;
  const height = Math.max(
    doc.body.scrollHeight,
    doc.body.offsetHeight,
    doc.documentElement.scrollHeight,
    doc.documentElement.offsetHeight
  );
  iframe.style.height = height + 'px';
}

const THEMES = [
  { key: 'purple', label: '퍼플' },
  { key: 'blue',   label: '블루' },
  { key: 'green',  label: '그린' },
  { key: 'navy',   label: '네이비' },
  { key: 'mint',   label: '민트' },
  { key: 'orange', label: '오렌지' },
];

// ─── 결과 뷰어 ────────────────────────────────────────────────
function ResultViewer({ markup, onMarkupChange, templateId }) {
  const [tab, setTab] = useState(templateId ? 'preview' : 'code');
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState('');
  const iframeRef = useRef(null);
  const themeRef = useRef('');

  useEffect(() => { themeRef.current = theme; }, [theme]);

  useEffect(() => {
    if (tab !== 'preview' || !iframeRef.current) return;
    const tpl = templateId ? ALL_TEMPLATES.find(t => t.id === templateId) : null;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(buildIframeDoc(markup, tpl?.previewStyle || ''));
    doc.close();

    const applyTheme = () => {
      const body = iframe.contentDocument?.body;
      if (!body) return;
      if (themeRef.current) body.setAttribute('data-theme', themeRef.current);
      else body.removeAttribute('data-theme');
    };

    if (tpl?.previewHeight) {
      iframe.style.height = tpl.previewHeight + 'px';
      applyTheme();
    } else {
      iframe.onload = () => { resizeIframe(iframe); applyTheme(); };
      setTimeout(() => { resizeIframe(iframe); applyTheme(); }, 300);
      setTimeout(() => { resizeIframe(iframe); applyTheme(); }, 1000);
    }
    return () => { iframe.onload = null; };
  }, [tab, markup, templateId]);

  // 테마 변경 시 iframe body에 즉시 적용
  useEffect(() => {
    if (tab !== 'preview') return;
    const body = iframeRef.current?.contentDocument?.body;
    if (!body) return;
    if (theme) body.setAttribute('data-theme', theme);
    else body.removeAttribute('data-theme');
  }, [theme]);

  async function handleCopy() {
    await navigator.clipboard.writeText(markup);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="crawl-result">
      <div className="crawl-result-header">
        <div className="crawl-tabs">
          <button className={`crawl-tab ${tab === 'code' ? 'is-active' : ''}`} onClick={() => setTab('code')}>마크업</button>
          <button className={`crawl-tab crawl-tab--preview ${tab === 'preview' ? 'is-active' : ''}`} onClick={() => setTab('preview')}>미리보기</button>
        </div>
        {tab === 'preview' && (
          <div className="theme-switcher" aria-label="테마 선택">
            <span className="theme-switcher-label">테마</span>
            <div className="theme-swatches" role="radiogroup" aria-label="색상 테마">
              {THEMES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`theme-swatch${theme === key ? ' is-active' : ''}`}
                  data-theme={key}
                  title={label}
                  aria-label={`${label} 테마`}
                  aria-pressed={theme === key}
                  onClick={() => setTheme(prev => prev === key ? '' : key)}
                />
              ))}
            </div>
          </div>
        )}
        <button className="crawl-copy-btn" onClick={handleCopy}>{copied ? '복사됨 ✓' : '복사'}</button>
      </div>
      {tab === 'code' ? (
        <textarea className="crawl-textarea" value={markup} onChange={e => onMarkupChange(e.target.value)} spellCheck={false} />
      ) : (
        <iframe ref={iframeRef} className="crawl-preview" title="미리보기" sandbox="allow-same-origin allow-scripts" />
      )}
    </div>
  );
}

// ─── 셀렉터 재추출 패널 ──────────────────────────────────────
function BatchRetryPanel({ result, onRetry }) {
  const [retryUrl, setRetryUrl] = useState(result.url);
  const [retrySelector, setRetrySelector] = useState(result.selector || '');
  const [loading, setLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');

  async function handleRetry() {
    if (!retryUrl.trim()) return;
    setLoading(true);
    try {
      let html = '';

      if (result.templateId) {
        // 템플릿 모드 재시도
        const tpl = ALL_TEMPLATES.find(t => t.id === result.templateId);
        if (tpl) {
          const fetchRes = await fetch('/api/fetch-markup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: retryUrl.trim() }),
          });
          let fetchData = {};
          try { fetchData = await fetchRes.json(); } catch {}
          if (!fetchRes.ok) throw new Error(fetchData.error || '실패');

          const extracted = extractContent(fetchData.html, retrySelector.trim(), retryUrl.trim());

          if (tpl.category === '상징') {
            // 상징 템플릿: DOM에서 상징 아이템 파싱 가능 여부 먼저 확인
            const { parseSymbolSource } = await import('../../../../templates/symbol.js');
            const docForCheck = new DOMParser().parseFromString(extracted, 'text/html');
            const symbolItems = parseSymbolSource(docForCheck.body);

            if (symbolItems.length > 0) {
              html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
            } else {
              const imgUrls = getContentImageUrls(extracted, retryUrl.trim());
              if (imgUrls.length > 0) {
                setOcrStatus('이미지 OCR 분석 중…');
                try {
                  const SYMBOL_PROMPT = `이 이미지는 학교 상징 페이지입니다. 아래 형식으로 각 항목의 이름과 설명을 추출하세요.

교목 [이름]
[교목 설명 (있는 경우)]
교화 [이름]
[교화 설명 (있는 경우)]
교표
[교표 설명 (있는 경우)]
교기
[교기 설명 (있는 경우)]
교훈: [교훈 내용]
교가: 있음 (교가 악보가 보이는 경우)

규칙: 없는 항목은 완전히 생략하세요. "없음" 같은 값은 절대 쓰지 마세요.`;
                  const ocrRes = await fetch('/api/ocr-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imgUrls[0], prompt: SYMBOL_PROMPT }),
                  });
                  const ocrData = await ocrRes.json();
                  const ocrText = ocrData.text || '';
                  const { parseSymbolOcr, buildSyntheticSymbolHtml, findSongImageFromHtml, extractSongLyricsFromImage } = await import('../../../../utils/ocrSymbol.js');
                  const detectedSongUrl = findSongImageFromHtml(extracted, retryUrl.trim())
                    || (imgUrls.length >= 2 ? imgUrls[imgUrls.length - 1] : '');
                  if (ocrText.trim()) {
                    const { items, sloganText, hasSong } = parseSymbolOcr(ocrText);
                    const songImgUrl = detectedSongUrl || (hasSong ? imgUrls[0] : '');
                    if (items.length > 0) {
                      const songLyrics = songImgUrl ? await extractSongLyricsFromImage(songImgUrl).catch(() => null) : null;
                      html = formatHtml(applyMarkupToTemplate(
                        buildSyntheticSymbolHtml(items, sloganText, songImgUrl, '', songLyrics),
                        tpl.code, tpl.id
                      ));
                    } else {
                      html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                    }
                  } else {
                    html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                  }
                } catch {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                } finally {
                  setOcrStatus('');
                }
              } else {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              }
            }
          } else if (tpl.category === '연혁') {
            const directResult = applyMarkupToTemplate(extracted, tpl.code, tpl.id);
            if (directResult !== tpl.code) {
              html = formatHtml(directResult);
            } else {
              const imgUrls = getContentImageUrls(extracted, retryUrl.trim());
              if (imgUrls.length > 0) {
                setOcrStatus('연혁 이미지 OCR 분석 중…');
                try {
                  const HISTORY_PROMPT = `이 이미지는 학교 연혁(학교 역사) 페이지입니다. 연도별 내용을 아래 형식으로 추출하세요.\n\n2024년\n3. 1 제47회 입학식(신입생 273명)\n2. 9 제45회 졸업식(졸업생 293명)\n2023년\n3. 2 제46회 입학식\n\n규칙:\n- 연도는 반드시 단독 줄에 YYYY년 형식\n- 날짜는 월. 일 형식 (예: 3. 1)\n- 내용은 날짜 뒤에 한 칸 공백 후 작성\n- 설명 없이 데이터만 출력`;
                  const ocrRes = await fetch('/api/ocr-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imgUrls[0], prompt: HISTORY_PROMPT }),
                  });
                  const ocrData = await ocrRes.json();
                  const ocrText = ocrData.text || '';
                  if (ocrText.trim()) {
                    const paragraphs = ocrText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 1).map(l => `<p>${l}</p>`).join('\n');
                    html = formatHtml(applyMarkupToTemplate(`<div>${paragraphs}</div>`, tpl.code, tpl.id));
                  } else {
                    html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                  }
                } catch {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                } finally {
                  setOcrStatus('');
                }
              } else {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              }
            }
          } else if (isImageOnlyContent(extracted)) {
            const imgUrls = getContentImageUrls(extracted, retryUrl.trim());
            if (imgUrls.length > 0) {
              setOcrStatus('이미지 OCR 분석 중…');
              try {
                const ocrRes = await fetch('/api/ocr-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ imageUrl: imgUrls[0] }),
                });
                const ocrData = await ocrRes.json();
                const ocrText = ocrData.text || '';
                if (ocrText.trim()) {
                  const paragraphs = ocrText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 3).map(l => `<p>${l}</p>`).join('\n');
                  html = formatHtml(applyMarkupToTemplate(`<div>${paragraphs}</div>`, tpl.code, tpl.id));
                } else {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                }
              } catch {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              } finally {
                setOcrStatus('');
              }
            } else {
              html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
            }
          } else {
            html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
          }
        }
      } else if (result.category === 'footer') {
        // 푸터메뉴 재시도: 푸터 전용 마크업 규칙 적용
        const res = await fetch('/api/auto-markup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: retryUrl.trim(), context: 'footer' }),
        });
        let data = {};
        try { data = await res.json(); } catch {}
        if (!res.ok) throw new Error(data.detail || '실패');
        html = applyTableProcessing(data.html || '');
      } else {
        // 기타 모드 재시도 (auto-markup)
        const res = await fetch('/api/auto-markup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: retryUrl.trim(), selector: retrySelector.trim() }),
        });
        let data = {};
        try { data = await res.json(); } catch {}
        if (!res.ok) throw new Error(data.detail || '실패');
        html = applyTableProcessing(data.html || '');
      }

      onRetry({ url: retryUrl.trim(), selector: retrySelector.trim(), html: normalizeGeneratedMarkup(html), error: null });
    } catch (e) {
      onRetry({ url: retryUrl.trim(), selector: retrySelector.trim(), html: '', error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="crawl-retry-panel">
      {result.error && <p className="crawl-error">{result.error}</p>}
      <div className="crawl-retry-fields">
        <input
          type="url" className="crawl-input"
          value={retryUrl} onChange={e => setRetryUrl(e.target.value)}
          placeholder="URL"
          disabled={loading}
        />
        <input
          type="text" className="crawl-input crawl-input--selector"
          value={retrySelector} onChange={e => setRetrySelector(e.target.value)}
          placeholder="CSS 선택자 입력 (예: #content, .article-body)"
          onKeyDown={e => e.key === 'Enter' && !loading && handleRetry()}
          disabled={loading}
          autoFocus
        />
        <button className="crawl-btn crawl-btn--retry" onClick={handleRetry} disabled={loading}>
          {loading ? <><span className="crawl-spinner" />{ocrStatus || ''}</> : '재추출'}
        </button>
      </div>
    </div>
  );
}

// ─── 미생성 페이지 패널 ──────────────────────────────────────
function FailedPagesPanel({ failedResults, onRegenerate, regenerating }) {
  const [selectors, setSelectors] = useState({});

  function updateSelector(url, value) {
    setSelectors(prev => ({ ...prev, [url]: value }));
  }

  return (
    <div className="crawl-failed-panel">
      <div className="crawl-failed-header">
        <span className="crawl-failed-title">미생성 페이지 목록</span>
        <span className="crawl-failed-count">{failedResults.length}개</span>
      </div>
      <div className="crawl-failed-list">
        <div className="crawl-failed-list-header">
          <span>URL</span>
          <span>CSS 셀렉터</span>
        </div>
        {failedResults.map((r, i) => (
          <div key={i} className="crawl-failed-item">
            <div className="crawl-failed-item-info">
              <a className="crawl-failed-item-url" href={r.url} target="_blank" rel="noopener noreferrer" title={r.url}>
                {r.url}
              </a>
              <span className="crawl-failed-item-guide">▶ 본문 영역을 자동으로 감지하지 못했습니다. CSS 셀렉터를 직접 입력해주세요.</span>
            </div>
            <input
              type="text"
              className="crawl-failed-selector-input"
              value={selectors[r.url] ?? r.selector ?? ''}
              onChange={e => updateSelector(r.url, e.target.value)}
              placeholder="#content, .article-body"
              disabled={regenerating}
            />
          </div>
        ))}
      </div>
      <div className="crawl-failed-actions">
        <button
          type="button"
          className="crawl-btn crawl-btn--retry"
          onClick={() => onRegenerate(failedResults.map(result => ({
            ...result,
            selector: selectors[result.url] ?? result.selector ?? '',
          })))}
          disabled={regenerating || failedResults.length === 0}
        >
          {regenerating ? <><span className="crawl-spinner" /> 재생성 중...</> : '마크업 재생성'}
        </button>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────
function UrlPreviewPanel({ previewOpen, previewUrl, onClose }) {
  return (
    <>
      {previewOpen && <div className="url-preview-overlay" onClick={onClose} />}
      <div className={`url-preview-panel${previewOpen ? ' is-open' : ''}`}>
        <div className="url-preview-panel-header">
          <span className="url-preview-panel-url">{previewUrl}</span>
          {previewUrl && (
            <a
              className="url-preview-panel-open"
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new window"
              aria-label="Open in new window"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </a>
          )}
          <button className="url-preview-panel-close" onClick={onClose} title="Close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <iframe
          className="url-preview-panel-iframe"
          src={previewUrl || 'about:blank'}
          title="Page preview"
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    </>
  );
}
export default function UrlCrawlMarkup() {
  const [batchRootUrl, setBatchRootUrl] = useState('');
  const [excludeMenuInput, setExcludeMenuInput] = useState('');
  const [schoolRoots, setSchoolRoots] = useState([]);
  const [activeSchoolKey, setActiveSchoolKey] = useState('all');
  const [extractResults, setExtractResults] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [urlItems, setUrlItems] = useState([]); // { id, url, title, category, templateId, selector }
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [addUrlInput, setAddUrlInput] = useState('');
  const [addTitleInput, setAddTitleInput] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [ocrStatus, setOcrStatus] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [activeResultIdx, setActiveResultIdx] = useState(0);
  const [activeResultSchoolKey, setActiveResultSchoolKey] = useState('');
  const [regeneratingFailed, setRegeneratingFailed] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState({ done: 0, total: 0 });
  const [retryingFailedExtract, setRetryingFailedExtract] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteNameLocked, setSiteNameLocked] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const classifyAbortRef = useRef(false);
  const { toast, triggerToast } = useToast();
  const [extractProgress, setExtractProgress] = useState({ step: 0, total: 4, label: '' });
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [typeModalItemId, setTypeModalItemId] = useState(null);
  const [showUrlExportModal, setShowUrlExportModal] = useState(false);
  const [modalCategory, setModalCategory] = useState('other');
  const [modalTemplateId, setModalTemplateId] = useState(null);

  function createSchoolRoot(url, label = '') {
    const cleanUrl = url.trim();
    return {
      key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: cleanUrl,
      label: label.trim(),
    };
  }

  // ─── 투어 ────────────────────────────────────────────────────
  const [tourStep, setTourStep] = useState(-1); // -1 = 비활성
  const [showHelp, setShowHelp] = useState(false);
  const tourRefs = {
    urlInput: useRef(null),
    extractBtn: useRef(null),
    urlList: useRef(null),
    typeBtn: useRef(null),
    generateBtn: useRef(null),
    resultTab: useRef(null),
    downloadBtn: useRef(null),
  };
  const [tourRect, setTourRect] = useState(null);

  // 각 단계: canNext = 다음 버튼 활성 조건, autoOn = 자동 진행 트리거 키, noOverlayBlock = 하이라이트 요소 클릭 허용
  // bullets = 설명 항목 리스트 (desc 대신 사용)
  const TOUR_STEPS = [
    {
      ref: 'urlInput',
      title: '① URL 입력',
      desc: '크롤링할 학교 사이트의 루트 URL을\n아래 입력창에 직접 입력해 보세요.',
      hint: 'URL을 입력한 뒤 [다음]을 눌러주세요',
      position: 'bottom',
      canNext: () => batchRootUrl.trim().length > 0 || schoolRoots.length > 0,
      noOverlayBlock: true,
    },
    {
      ref: 'extractBtn',
      title: '② URL 추출',
      desc: '[URL 추출] 버튼을 직접 클릭해 보세요.\n추출이 완료되면 자동으로 다음 단계로 넘어갑니다.',
      hint: '버튼을 직접 클릭하세요',
      position: 'bottom',
      autoOn: 'extract',
      noOverlayBlock: true,
    },
    {
      ref: 'urlList',
      title: '③ 페이지 목록 & 유형 설정',
      bullets: [
        { icon: '👁', text: '각 행의 미리보기 버튼을 누르면 해당 URL의 실제 페이지를 바로 확인할 수 있습니다.' },
        { icon: '🏷', text: '인사말 · 연혁 · 상징 · 푸터메뉴 페이지는 반드시 우측 유형 버튼을 눌러 해당 유형을 선택해 주세요.' },
        { icon: '📎', text: '위 4가지에 해당하지 않는 페이지는 유형 버튼에서 [기타]를 선택하면 됩니다.' },
        { icon: '☑', text: '체크박스로 마크업을 생성할 페이지를 골라주세요.' },
      ],
      hint: '설정이 끝나면 [다음]을 눌러주세요',
      position: 'top',
      noOverlayBlock: true,
    },
    {
      ref: 'generateBtn',
      title: '④ 마크업 생성',
      desc: '[마크업 생성] 버튼을 직접 클릭해 보세요.\n생성이 완료되면 자동으로 다음 단계로 넘어갑니다.',
      hint: '버튼을 직접 클릭하세요',
      position: 'top',
      autoOn: 'generate',
      noOverlayBlock: true,
    },
    {
      ref: 'resultTab',
      title: '⑤ 결과 확인',
      desc: '생성된 마크업이 탭으로 표시됩니다.\n탭을 클릭해 내용을 확인하고 복사해 보세요.',
      hint: '확인 후 [다음]을 눌러주세요',
      position: 'top',
      noOverlayBlock: true,
    },
    {
      ref: 'downloadBtn',
      title: '⑥ 일괄 다운로드',
      desc: '[다운로드] 버튼으로 모든 마크업을\nZIP 파일로 한 번에 받을 수 있습니다.',
      hint: '완료를 눌러 튜토리얼을 종료하세요',
      position: 'top',
    },
  ];

  const updateTourRect = useCallback((step) => {
    const key = TOUR_STEPS[step]?.ref;
    if (!key) return;
    const el = tourRefs[key]?.current;
    if (!el) { setTourRect(null); return; }
    const r = el.getBoundingClientRect();
    setTourRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [batchRootUrl, schoolRoots.length]);

  useEffect(() => {
    if (tourStep < 0) return;
    updateTourRect(tourStep);
    if (TOUR_STEPS[tourStep]?.ref === 'urlInput') {
      setTimeout(() => tourRefs.urlInput.current?.focus(), 80);
    }
    const onResize = () => updateTourRect(tourStep);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onResize, true); };
  }, [tourStep, updateTourRect]);

  // URL 추출 완료 시 자동 진행
  const prevExtractingRef = useRef(false);
  useEffect(() => {
    if (tourStep < 0) return;
    if (TOUR_STEPS[tourStep]?.autoOn !== 'extract') return;
    if (prevExtractingRef.current && !extracting && urlItems.length > 0) {
      setTimeout(() => tourNextFn(), 300);
    }
    prevExtractingRef.current = extracting;
  }, [extracting]);

  // 마크업 생성 완료 시 자동 진행
  const prevBatchLoadingRef = useRef(false);
  useEffect(() => {
    if (tourStep < 0) return;
    if (TOUR_STEPS[tourStep]?.autoOn !== 'generate') return;
    if (prevBatchLoadingRef.current && !batchLoading && batchResults.length > 0) {
      setTimeout(() => tourNextFn(), 300);
    }
    prevBatchLoadingRef.current = batchLoading;
  }, [batchLoading]);

  useEffect(() => {
    if (activeSchoolKey === 'all') return;
    const activeResult = extractResults.find(result => result.key === activeSchoolKey);
    if (activeResult?.siteName) {
      setSiteName(activeResult.siteName);
      setSiteNameLocked(true);
    }
  }, [activeSchoolKey, extractResults]);

  function startTour() { setTourStep(0); }
  function endTour() { setTourStep(-1); setTourRect(null); }
  function tourNextFn() {
    setTourStep(prev => {
      const next = prev + 1;
      if (next >= TOUR_STEPS.length) { setTourRect(null); return -1; }
      setTimeout(() => updateTourRect(next), 50);
      return next;
    });
  }
  function tourNext() {
    const step = TOUR_STEPS[tourStep];
    if (step?.canNext && !step.canNext()) return;
    tourNextFn();
  }
  function tourPrev() {
    const prev = tourStep - 1;
    if (prev < 0) return;
    setTourStep(prev);
    setTimeout(() => updateTourRect(prev), 50);
  }

  function renderTour() {
    if (tourStep < 0) return null;
    const step = TOUR_STEPS[tourStep];
    const pad = 8;
    const hasRect = tourRect && tourRect.width > 0;
    const clipTop    = hasRect ? tourRect.top - pad : 0;
    const clipLeft   = hasRect ? tourRect.left - pad : 0;
    const clipRight  = hasRect ? tourRect.left + tourRect.width + pad : 0;
    const clipBottom = hasRect ? tourRect.top + tourRect.height + pad : 0;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;

    let tipStyle = {};
    if (hasRect) {
      const tipW = step.bullets ? 340 : 300;
      let tipLeft = tourRect.left + tourRect.width / 2 - tipW / 2;
      tipLeft = Math.max(12, Math.min(tipLeft, vw - tipW - 12));
      if (step.position === 'bottom') {
        tipStyle = { top: clipBottom + 12, left: tipLeft, width: tipW };
      } else {
        tipStyle = { top: clipTop - 12, left: tipLeft, width: tipW, transform: 'translateY(-100%)' };
      }
    } else {
      tipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 300 };
    }

    const isNextDisabled = step.canNext ? !step.canNext() : false;
    const isAutoStep = !!step.autoOn;

    return (
      <div className="tour-overlay" style={{ pointerEvents: step.noOverlayBlock ? 'none' : 'auto' }} onClick={step.noOverlayBlock ? undefined : endTour}>
        {hasRect && (
          <svg className="tour-spotlight" style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none' }}>
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect x={clipLeft} y={clipTop} width={clipRight - clipLeft} height={clipBottom - clipTop} rx="6" fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.45)" mask="url(#tour-mask)" />
            <rect x={clipLeft} y={clipTop} width={clipRight - clipLeft} height={clipBottom - clipTop} rx="6" fill="none" stroke="#4a8af4" strokeWidth="2" />
          </svg>
        )}
        <div className="tour-tip" style={tipStyle} onClick={e => e.stopPropagation()}>
          <div className="tour-tip-header">
            <span className="tour-tip-title">{step.title}</span>
            <button className="tour-tip-close" onClick={endTour}>✕</button>
          </div>
          {isAutoStep && extracting ? (
            <div className="tour-tip-loading">
              <span className="crawl-spinner crawl-spinner--sm" />
              <span>URL을 분석하고 있습니다. 잠시 기다려주세요…</span>
            </div>
          ) : step.bullets ? (
            <ul className="tour-tip-bullets">
              {step.bullets.map((b, i) => (
                <li key={i}><span className="tour-tip-bullet-icon">{b.icon}</span>{b.text}</li>
              ))}
            </ul>
          ) : (
            <p className="tour-tip-desc">{step.desc}</p>
          )}
          {!(isAutoStep && extracting) && step.hint && (
            <p className="tour-tip-hint">{isAutoStep ? '⬆ ' : ''}{step.hint}</p>
          )}
          <div className="tour-tip-footer">
            <span className="tour-tip-progress">{tourStep + 1} / {TOUR_STEPS.length}</span>
            <div className="tour-tip-btns">
              {tourStep > 0 && !isAutoStep && <button className="tour-btn tour-btn--prev" onClick={tourPrev}>이전</button>}
              {!isAutoStep && (
                <button
                  className={`tour-btn tour-btn--next${isNextDisabled ? ' is-disabled' : ''}`}
                  onClick={tourNext}
                  disabled={isNextDisabled}
                >
                  {tourStep === TOUR_STEPS.length - 1 ? '완료' : '다음'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── 소스 직접 입력 모드 ────────────────────────────────────
  const [projectType, setProjectType] = useState('gwangju'); // 'gwangju' | 'chungnam'
  const [gwangjuUrlItems, setGwangjuUrlItems] = useState([{ id: 1, value: '' }]);
  const [gwangjuCrawlProgress, setGwangjuCrawlProgress] = useState({ done: 0, total: 0 });
  const [nextGwangjuUrlId, setNextGwangjuUrlId] = useState(2);
  const [activeGwangjuUrlId, setActiveGwangjuUrlId] = useState(1);
  const [activeGwangjuMenuBySite, setActiveGwangjuMenuBySite] = useState({});
  const [showGwangjuInlineResults, setShowGwangjuInlineResults] = useState(false);
  const [gwangjuMarkupPanelOpen, setGwangjuMarkupPanelOpen] = useState(false);
  const [gwangjuMarkupSource, setGwangjuMarkupSource] = useState('');
  const [gwangjuMarkupSelector, setGwangjuMarkupSelector] = useState('');
  const [gwangjuMarkupSourceUrl, setGwangjuMarkupSourceUrl] = useState('');
  const [gwangjuMarkupLoading, setGwangjuMarkupLoading] = useState(false);
  const [gwangjuMarkupError, setGwangjuMarkupError] = useState('');
  const [gwangjuConvertPanelOpen, setGwangjuConvertPanelOpen] = useState(false);
  const [gwangjuConvertMenuOpen, setGwangjuConvertMenuOpen] = useState(false);
  const [gwangjuConvertSubmenuCategory, setGwangjuConvertSubmenuCategory] = useState(null);
  const [gwangjuConvertedSource, setGwangjuConvertedSource] = useState('');
  const [gwangjuConvertPreviewOpen, setGwangjuConvertPreviewOpen] = useState(false);
  const [gwangjuSavedMarkupByUrl, setGwangjuSavedMarkupByUrl] = useState(() => readGwangjuSavedMarkupByUrl());
  const [mode, setMode] = useState('url'); // 'url' | 'source'
  const [sourceHtml, setSourceHtml] = useState('');
  const [sourceSelector, setSourceSelector] = useState('');
  const [sourceCategory, setSourceCategory] = useState('other');
  const [sourceTemplateId, setSourceTemplateId] = useState(null);
  const [sourceResult, setSourceResult] = useState(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [markupHistory, setMarkupHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyBatchSignatureRef = useRef('');
  const gwangjuSavedMarkupLoadedRef = useRef(false);
  const GWANGJU_MAX_URLS = 10;

  useEffect(() => {
    setMarkupHistory(readMarkupHistory());
  }, []);

  useEffect(() => {
    gwangjuSavedMarkupLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!gwangjuSavedMarkupLoadedRef.current || typeof window === 'undefined') return;
    localStorage.setItem(GWANGJU_SAVED_MARKUP_STORAGE_KEY, JSON.stringify(gwangjuSavedMarkupByUrl));
  }, [gwangjuSavedMarkupByUrl]);

  const persistMarkupHistory = useCallback((entries) => {
    if (typeof window === 'undefined') return;
    const cleanEntries = entries
      .filter(entry => entry?.html?.trim())
      .map(entry => ({
        ...entry,
        id: entry.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        savedAt: entry.savedAt || new Date().toISOString(),
        key: entry.key || `${entry.source || 'markup'}|${entry.url || ''}|${entry.category || ''}|${entry.templateId || ''}|${entry.html}`,
      }));

    if (!cleanEntries.length) return;

    setMarkupHistory(prev => {
      const incomingKeys = new Set(cleanEntries.map(entry => entry.key));
      const next = [
        ...cleanEntries,
        ...prev.filter(entry => !incomingKeys.has(entry.key)),
      ].slice(0, MARKUP_HISTORY_MAX);
      localStorage.setItem(MARKUP_HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (batchLoading) return;
    const entries = batchResults
      .filter(result => result?.html?.trim() && !result.error)
      .map(result => ({
        source: 'batch',
        title: result.title || shortLabel(result.url || '', ''),
        url: result.url || '',
        category: result.category || 'other',
        templateId: result.templateId || null,
        schoolName: result.schoolName || '',
        html: result.html,
        key: `batch|${result.url || ''}|${result.category || ''}|${result.templateId || ''}|${result.html}`,
      }));
    const signature = entries.map(entry => entry.key).join('\n');
    if (!signature || signature === historyBatchSignatureRef.current) return;
    historyBatchSignatureRef.current = signature;
    persistMarkupHistory(entries);
  }, [batchResults, batchLoading, persistMarkupHistory]);

  useEffect(() => {
    if (!sourceResult?.trim()) return;
    const timer = setTimeout(() => {
      persistMarkupHistory([{
        source: 'source',
        title: '직접 입력 마크업',
        category: sourceCategory || 'other',
        templateId: sourceTemplateId || null,
        html: sourceResult,
        key: `source|${sourceCategory || ''}|${sourceTemplateId || ''}|${sourceResult}`,
      }]);
    }, 700);
    return () => clearTimeout(timer);
  }, [sourceResult, sourceCategory, sourceTemplateId, persistMarkupHistory]);

  function loadMarkupHistoryItem(item) {
    if (!item?.html) return;
    setMode('source');
    setSourceCategory(item.category || 'other');
    setSourceTemplateId(item.templateId || null);
    setSourceResult(item.html);
    setHistoryOpen(false);
  }

  function deleteMarkupHistoryItem(id) {
    setMarkupHistory(prev => {
      const next = prev.filter(item => item.id !== id);
      localStorage.setItem(MARKUP_HISTORY_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function clearMarkupHistory() {
    setMarkupHistory([]);
    localStorage.removeItem(MARKUP_HISTORY_STORAGE_KEY);
  }

  function openStyleGuide() {
    const guideUrl = projectType === 'gwangju'
      ? '/api/gwangju-assets/pub/guide.html'
      : '/api/chungnam-assets/pub/guide.jsp';
    window.open(guideUrl, '_blank', 'noopener,noreferrer');
  }

  function addGwangjuUrlInput() {
    if (gwangjuUrlItems.length >= GWANGJU_MAX_URLS) return;
    setGwangjuUrlItems(prev => [...prev, { id: nextGwangjuUrlId, value: '', siteName: '', menus: [], loading: false, error: '' }]);
    setActiveGwangjuUrlId(nextGwangjuUrlId);
    setNextGwangjuUrlId(prev => prev + 1);
  }

  function extractUrlsFromText(value) {
    const text = String(value || '');
    const urls = [
      ...[...text.matchAll(/https?:\/\/[^\s,]+/gi)].map(match => match[0]),
      ...[...text.matchAll(/(?:^|[\s([])([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?=[\s)\],;]|$)/gi)].map(match => match[1]),
    ];
    return [...new Set(urls.map(normalizeGwangjuUrl).filter(Boolean))];
  }

  function normalizeGwangjuUrl(value) {
    const url = String(value || '').trim().replace(/^[([]+|[)\].,;]+$/g, '');
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : `http://${url}`;
  }

  function updateGwangjuUrlInput(id, value) {
    const pastedUrls = extractUrlsFromText(value);
    if (pastedUrls.length > 1) {
      setGwangjuUrlItems(prev => {
        const currentIndex = prev.findIndex(item => item.id === id);
        const baseIndex = currentIndex >= 0 ? currentIndex : prev.length;
        const availableCount = Math.max(GWANGJU_MAX_URLS - (prev.length - 1), 1);
        const limitedUrls = pastedUrls.slice(0, availableCount);
        let nextId = nextGwangjuUrlId;
        const splitItems = limitedUrls.map((url, index) => ({
          id: index === 0 ? id : nextId++,
          value: url,
          siteName: '',
          menus: [],
          loading: false,
          error: '',
        }));
        return [
          ...prev.slice(0, baseIndex),
          ...splitItems,
          ...prev.slice(baseIndex + 1),
        ];
      });
      setActiveGwangjuUrlId(id);
      setNextGwangjuUrlId(prev => prev + Math.min(Math.max(pastedUrls.length - 1, 0), GWANGJU_MAX_URLS - 1));
      return;
    }
    setGwangjuUrlItems(prev => prev.map(item => item.id === id ? { ...item, value, error: '' } : item));
  }

  function removeGwangjuUrlInput(id) {
    setGwangjuUrlItems(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(item => item.id !== id);
      if (activeGwangjuUrlId === id) setActiveGwangjuUrlId(next[0]?.id || 1);
      return next;
    });
  }

  const activeGwangjuUrlItem =
    gwangjuUrlItems.find(item => item.id === activeGwangjuUrlId) || gwangjuUrlItems[0];
  const hasGwangjuCrawlResult = gwangjuUrlItems.some(item =>
    item.loading || item.error || item.menus?.length > 0
  );
  const hasGwangjuUrlInput = gwangjuUrlItems.some(item => item.value?.trim());
  const isGwangjuCrawling = gwangjuUrlItems.some(item => item.loading);
  const firstGwangjuPreviewMenu =
    activeGwangjuUrlItem?.menus?.find(menu => menu.url && menu.depth !== 1) ||
    activeGwangjuUrlItem?.menus?.find(menu => menu.url);
  const activeGwangjuMenuUrl = activeGwangjuMenuBySite[activeGwangjuUrlItem?.id] || firstGwangjuPreviewMenu?.url || '';
  const activeGwangjuMenuLabel =
    activeGwangjuUrlItem?.menus?.find(menu => menu.url === activeGwangjuMenuUrl)?.label ||
    firstGwangjuPreviewMenu?.label ||
    '';
  const gwangjuSaveTargetMenus = gwangjuUrlItems.flatMap(site => (
    site.menus || []
  ).filter(menu => menu.url && menu.depth !== 1));
  const hasGwangjuSavedMarkup = gwangjuSaveTargetMenus.some(menu => gwangjuSavedMarkupByUrl[menu.url]?.source);

  function closeGwangjuMarkupPanels({ force = false } = {}) {
    if (!force && !confirmDiscardGwangjuConvertedSource()) return false;
    resetGwangjuConvertedDraft();
    setGwangjuMarkupPanelOpen(false);
    setGwangjuConvertPanelOpen(false);
    setGwangjuConvertPreviewOpen(false);
    setGwangjuConvertMenuOpen(false);
    setGwangjuConvertSubmenuCategory(null);
    return true;
  }

  function removeGwangjuMenu(siteId, menuToRemove) {
    setGwangjuUrlItems(prev => prev.map(site => {
      if (site.id !== siteId) return site;
      return {
        ...site,
        menus: (site.menus || []).filter(menu => menu !== menuToRemove),
      };
    }));
    if (menuToRemove.url) {
      setGwangjuSavedMarkupByUrl(prev => {
        const next = { ...prev };
        delete next[menuToRemove.url];
        return next;
      });
      setActiveGwangjuMenuBySite(prev => {
        if (prev[siteId] !== menuToRemove.url) return prev;
        const nextMenus = (activeGwangjuUrlItem?.menus || []).filter(menu => menu !== menuToRemove);
        const nextMenu = nextMenus.find(menu => menu.url && menu.depth !== 1) || nextMenus.find(menu => menu.url);
        return { ...prev, [siteId]: nextMenu?.url || '' };
      });
    }
    closeGwangjuMarkupPanels();
  }

  function getGwangjuTabLabel(item, index) {
    if (item.siteName) return item.siteName;
    try {
      return new URL(item.value).hostname.replace(/^www\./, '') || `사이트 ${index + 1}`;
    } catch {
      return item.value?.trim() ? `사이트 ${index + 1}` : `URL ${index + 1}`;
    }
  }

  function getGwangjuSafeFileName(value, fallback = 'page') {
    return String(value || fallback)
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || fallback;
  }

  async function readGwangjuJsonResponse(res, fallbackMessage) {
    const responseText = await res.text();
    try {
      return responseText ? JSON.parse(responseText) : {};
    } catch {
      const message = responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')
        ? 'API가 JSON 대신 HTML 페이지를 반환했습니다. 새로고침 후 다시 시도하세요.'
        : fallbackMessage;
      throw new Error(message);
    }
  }

  async function downloadGwangjuSavedMarkupZip() {
    const zip = new JSZip();
    const usedPaths = new Set();
    let fileCount = 0;

    gwangjuUrlItems.forEach((site, siteIndex) => {
      const schoolName = getGwangjuSafeFileName(getGwangjuTabLabel(site, siteIndex), `site-${siteIndex + 1}`);
      (site.menus || []).forEach((menu, menuIndex) => {
        const saved = menu.url ? gwangjuSavedMarkupByUrl[menu.url] : null;
        if (!saved?.source) return;

        const menuName = getGwangjuSafeFileName(menu.label, `menu-${menuIndex + 1}`);
        let zipPath = `pub/web/${schoolName}/${menuName}.html`;
        let duplicateIndex = 2;
        while (usedPaths.has(zipPath)) {
          zipPath = `pub/web/${schoolName}/${menuName}-${duplicateIndex}.html`;
          duplicateIndex += 1;
        }

        usedPaths.add(zipPath);
        zip.file(zipPath, saved.source);
        fileCount += 1;
      });
    });

    if (!fileCount) return;

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gwangju-markup-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function fetchGwangjuMarkupSource() {
    if (!activeGwangjuMenuUrl) return;
    setGwangjuMarkupPanelOpen(true);
    setGwangjuMarkupLoading(true);
    setGwangjuMarkupError('');
    setGwangjuMarkupSource('');
    setGwangjuMarkupSelector('');
    setGwangjuMarkupSourceUrl(activeGwangjuMenuUrl);
    setGwangjuConvertPanelOpen(false);
    setGwangjuConvertPreviewOpen(false);
    setGwangjuConvertedSource('');

    try {
      const res = await fetch('/api/gwangju-page-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: activeGwangjuMenuUrl }),
      });
      const responseText = await res.text();
      let data = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error('소스 API가 JSON이 아닌 HTML 응답을 반환했습니다. 페이지를 새로고침한 뒤 다시 시도하세요.');
      }
      if (!res.ok) throw new Error(data.error || '소스를 가져오지 못했습니다.');
      setGwangjuMarkupSource(data.html || '');
      setGwangjuMarkupSelector(data.selector || '');
    } catch (error) {
      setGwangjuMarkupError(error.message || '소스를 가져오지 못했습니다.');
    } finally {
      setGwangjuMarkupLoading(false);
    }
  }

  const GWANGJU_CONVERT_CATEGORIES = [
    { key: '인사말', label: '인사말', ready: true },
    { key: '연혁', label: '연혁', ready: false },
    { key: '상징', label: '상징', ready: false },
    { key: '역대교장', label: '역대교장', ready: true },
    { key: '오시는길', label: '오시는길', ready: false },
    { key: '학급목록', label: '학급목록', ready: true },
  ];

  function applyGwangjuConvertTemplate(template) {
    const raw = gwangjuMarkupSource || '';
    const converted = template
      ? applyMarkupToTemplate(raw, template.code, template.id)
      : applyGwangjuBasicMarkup(raw);
    const formatted = formatHtml(stripScriptTags(converted));
    setGwangjuConvertedSource(formatted);
    setGwangjuConvertMenuOpen(false);
    setGwangjuConvertSubmenuCategory(null);
    setGwangjuConvertPanelOpen(true);
  }

  function handleGwangjuConvertCategoryClick(cat) {
    if (!cat.ready) return;
    if (cat.key === 'default') {
      applyGwangjuConvertTemplate(null);
      return;
    }
    setGwangjuConvertSubmenuCategory(prev => (prev === cat.key ? null : cat.key));
  }

  const GWANGJU_PREVIEW_CSS = ['basic.css', 'theme.css', 'layout.css', 'swiper.min.css', 'con_com.css', 'sub_com.css'];
  const GWANGJU_PREVIEW_JS = ['jquery.min.js', 'swiper.min.js', 'common.js', 'con_com.js', 'sub_com.js'];

  function buildGwangjuPreviewDoc(bodyHtml) {
    const links = GWANGJU_PREVIEW_CSS
      .map(name => `<link rel="stylesheet" href="/api/gwangju-assets/css/${name}">`)
      .join('\n');
    const scripts = GWANGJU_PREVIEW_JS
      .map(name => `<script src="/api/gwangju-assets/js/${name}"></script>`)
      .join('\n');
    // 스크립트를 본문보다 먼저 실행해야 크롤링 콘텐츠 안의 인라인 <script>(예: $(...))가
    // jQuery/Swiper 로드 이전에 실행되어 "$ is not defined" 등이 나는 것을 막을 수 있다.
    return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
${links}
</head>
<body style="padding:1rem;">
${scripts}
${bodyHtml || ''}
</body>
</html>`;
  }

  function persistGwangjuConvertedSource(source) {
    if (!activeGwangjuMenuUrl) return;
    setGwangjuSavedMarkupByUrl(prev => {
      const previous = prev[activeGwangjuMenuUrl] || {};
      return {
        ...prev,
        [activeGwangjuMenuUrl]: {
          ...previous,
          source,
          crawledSource: gwangjuMarkupSource || previous.crawledSource || '',
          selector: gwangjuMarkupSelector || previous.selector || '',
          sourceUrl: gwangjuMarkupSourceUrl || activeGwangjuMenuUrl,
          savedAt: new Date().toISOString(),
        },
      };
    });
  }

  function loadGwangjuSavedMarkup(menu, siteId) {
    if (!menu?.url) return;
    const saved = gwangjuSavedMarkupByUrl[menu.url];
    if (!saved?.source) return;
    if (!confirmDiscardGwangjuConvertedSource()) return;
    setActiveGwangjuMenuBySite(prev => ({
      ...prev,
      [siteId]: menu.url,
    }));
    setGwangjuConvertedSource(saved.source);
    setGwangjuMarkupSource(saved.crawledSource || '');
    setGwangjuMarkupSelector(saved.selector || '');
    setGwangjuMarkupSourceUrl(saved.sourceUrl || menu.url);
    setGwangjuMarkupError('');
    setGwangjuMarkupLoading(false);
    setGwangjuMarkupPanelOpen(Boolean(saved.crawledSource || saved.selector));
    setGwangjuConvertPanelOpen(true);
    setGwangjuConvertPreviewOpen(false);
    setGwangjuConvertMenuOpen(false);
    setGwangjuConvertSubmenuCategory(null);
  }

  function updateGwangjuConvertedSource(value) {
    setGwangjuConvertedSource(value);
  }

  function saveGwangjuConvertedSource() {
    persistGwangjuConvertedSource(gwangjuConvertedSource);
  }

  const isGwangjuConvertedSaved = Boolean(
    activeGwangjuMenuUrl &&
    gwangjuConvertedSource &&
    gwangjuSavedMarkupByUrl[activeGwangjuMenuUrl]?.source === gwangjuConvertedSource
  );

  function hasUnsavedGwangjuConvertedSource() {
    return Boolean(activeGwangjuMenuUrl && gwangjuConvertedSource?.trim() && !isGwangjuConvertedSaved);
  }

  function confirmDiscardGwangjuConvertedSource() {
    if (!hasUnsavedGwangjuConvertedSource()) return true;
    return window.confirm('저장하지 않고 닫으면 작성한 마크업이 삭제됩니다. 닫을까요?');
  }

  function resetGwangjuConvertedDraft() {
    if (!hasUnsavedGwangjuConvertedSource()) return;
    const saved = gwangjuSavedMarkupByUrl[activeGwangjuMenuUrl];
    setGwangjuConvertedSource(saved?.source || '');
  }

  function closeGwangjuConvertPanel() {
    if (!confirmDiscardGwangjuConvertedSource()) return;
    resetGwangjuConvertedDraft();
    setGwangjuConvertPanelOpen(false);
    setGwangjuConvertPreviewOpen(false);
    setGwangjuConvertMenuOpen(false);
    setGwangjuConvertSubmenuCategory(null);
  }

  async function crawlGwangjuHeaderMenus(id) {
    setActiveGwangjuUrlId(id);
    const item = gwangjuUrlItems.find(entry => entry.id === id);
    const targetUrl = normalizeGwangjuUrl(item?.value);
    if (!targetUrl) {
      setGwangjuUrlItems(prev => prev.map(entry => (
        entry.id === id ? { ...entry, error: 'URL을 입력하세요.', menus: [] } : entry
      )));
      return;
    }
    if (!isValidUrl(targetUrl)) {
      setGwangjuUrlItems(prev => prev.map(entry => (
        entry.id === id ? { ...entry, error: '올바른 URL 형식이 아닙니다.', menus: [] } : entry
      )));
      return;
    }

    setGwangjuUrlItems(prev => prev.map(entry => (
      entry.id === id ? { ...entry, value: targetUrl } : entry
    )));

    setGwangjuUrlItems(prev => prev.map(entry => (
      entry.id === id ? { ...entry, loading: true, error: '', menus: [] } : entry
    )));

    try {
      const res = await fetch('/api/gwangju-header-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await readGwangjuJsonResponse(res, '메뉴 크롤링에 실패했습니다.');
      if (!res.ok) throw new Error(data.error || '크롤링에 실패했습니다.');

      setGwangjuUrlItems(prev => prev.map(entry => (
        entry.id === id
          ? { ...entry, loading: false, siteName: data.siteName || entry.siteName || '', menus: data.menus || [], error: data.menus?.length ? '' : '대상 메뉴 영역에서 메뉴를 찾지 못했습니다.' }
          : entry
      )));
    } catch (error) {
      setGwangjuUrlItems(prev => prev.map(entry => (
        entry.id === id ? { ...entry, loading: false, error: error.message, menus: [] } : entry
      )));
    }
  }

  function escapeGwangjuHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function openGwangjuWorkWindow() {
    const width = window.screen?.availWidth || 1440;
    const height = window.screen?.availHeight || 900;
    const workWindow = window.open(
      'about:blank',
      '_blank',
      `width=${width},height=${height},left=0,top=0,resizable=yes,scrollbars=yes`
    );
    if (workWindow) {
      try {
        workWindow.moveTo(0, 0);
        workWindow.resizeTo(width, height);
      } catch {}
      workWindow.focus();
    }
    return workWindow;
  }

  function writeGwangjuWorkWindow(workWindow, sites, loading = false) {
    if (!workWindow || workWindow.closed) return;
    const safeSites = sites.map((site, index) => ({
      siteName: site.siteName || getGwangjuTabLabel(site, index),
      value: site.value || '',
      error: site.error || '',
      loading: Boolean(site.loading),
      menus: (site.menus || []).filter(menu => menu.label).map(menu => ({
        label: menu.label,
        url: menu.url || '',
      })),
    }));
    const json = JSON.stringify(safeSites).replace(/</g, '\\u003c');
    const parentStylesheetLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(link => {
        const href = link.href || link.getAttribute('href');
        if (!href) return '';
        const media = link.media ? ` media="${link.media.replace(/"/g, '&quot;')}"` : '';
        return `<link rel="stylesheet" href="${href.replace(/"/g, '&quot;')}"${media}>`;
      })
      .join('\n  ');
    workWindow.document.open();
    workWindow.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>광주학교통합 크롤링 작업창</title>
  ${parentStylesheetLinks}
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, "Malgun Gothic", sans-serif; color: #1a2a4a; background: #f4f6fa; }
    .work-wrap { height: 100vh; display: flex; flex-direction: column; padding: 14px; gap: 10px; }
    .work-head { display: flex; align-items: center; justify-content: space-between; min-height: 42px; }
    .work-title { margin: 0; font-size: 18px; }
    .work-hint { margin: 0; color: #68758a; font-size: 13px; }
    .site-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; border-bottom: 1px solid #dbe2ee; }
    .site-tab { min-height: 34px; padding: 0 12px; border: 1px solid #d8deea; border-radius: 6px; background: #fff; color: #5f6b7d; font-weight: 700; cursor: pointer; white-space: nowrap; }
    .site-tab.active { border-color: #0070c8; color: #0070c8; }
    .workspace { flex: 1; min-height: 0; display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 10px; }
    .menu-list { min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 1px solid #dbe2ee; border-radius: 6px; background: #fff; }
    .menu-btn { min-height: 38px; padding: 8px 10px; border: 1px solid #cfd7e6; border-radius: 6px; background: #fff; color: #1a2a4a; text-align: left; font: inherit; font-weight: 500; cursor: pointer; line-height: 1.35; }
    .menu-btn.active, .menu-btn:hover { border-color: #0070c8; color: #0070c8; background: #f0f8ff; }
    .preview { min-width: 0; min-height: 0; border: 1px solid #dbe2ee; border-radius: 6px; background: #fff; overflow: hidden; }
    iframe { display: block; width: 100%; height: 100%; border: 0; }
    .message { padding: 18px; color: #5f6b7d; }
    .error { color: #d23d3d; }
  </style>
</head>
<body>
  <div class="work-wrap">
    <div class="work-head">
      <h1 class="work-title">광주학교통합 크롤링 작업창</h1>
      <p class="work-hint">${loading ? '크롤링 중입니다.' : '사이트 탭과 메뉴를 선택해 화면을 확인하세요.'}</p>
    </div>
    <div id="siteTabs" class="site-tabs"></div>
    <div class="workspace">
      <div id="menuList" class="menu-list"></div>
      <div id="preview" class="preview"></div>
    </div>
  </div>
  <script>
  (() => {
    const sites = ${json};
    let activeSite = 0;
    const activeMenuBySite = {};
    const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

    function render() {
      const siteTabs = document.getElementById('siteTabs');
      const menuList = document.getElementById('menuList');
      const preview = document.getElementById('preview');
      siteTabs.innerHTML = '';
      menuList.innerHTML = '';
      preview.innerHTML = '';

      if (!sites.length) {
        menuList.innerHTML = '<div class="message">크롤링할 사이트가 없습니다.</div>';
        return;
      }

      sites.forEach((site, index) => {
        const btn = document.createElement('button');
        btn.className = 'site-tab' + (index === activeSite ? ' active' : '');
        btn.type = 'button';
        btn.textContent = site.siteName || site.value || ('사이트 ' + (index + 1));
        btn.onclick = () => { activeSite = index; render(); };
        siteTabs.appendChild(btn);
      });

      const site = sites[activeSite];
      if (site.error) {
        menuList.innerHTML = '<div class="message error">' + esc(site.error) + '</div>';
      }
      if (!site.menus?.length) {
        if (!site.error) menuList.innerHTML = '<div class="message">추출된 메뉴가 없습니다.</div>';
        preview.innerHTML = '<div class="message">미리보기할 메뉴가 없습니다.</div>';
        return;
      }

      const firstUrlMenu = site.menus.find(menu => menu.url) || site.menus[0];
      const activeUrl = activeMenuBySite[activeSite] || firstUrlMenu.url || '';
      site.menus.forEach(menu => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'menu-btn' + (menu.url && menu.url === activeUrl ? ' active' : '');
        btn.textContent = menu.label;
        btn.title = menu.url || menu.label;
        btn.onclick = () => {
          if (menu.url) {
            activeMenuBySite[activeSite] = menu.url;
            render();
          }
        };
        menuList.appendChild(btn);
      });

      if (activeUrl) {
        const iframe = document.createElement('iframe');
        iframe.src = activeUrl;
        iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups allow-downloads';
        iframe.title = firstUrlMenu.label || '메뉴 미리보기';
        preview.appendChild(iframe);
      } else {
        preview.innerHTML = '<div class="message">미리보기할 메뉴 URL이 없습니다.</div>';
      }
    }

    render();
  })();
  </script>
</body>
</html>`);
    workWindow.document.close();
  }

  async function crawlAllGwangjuHeaderMenus() {
    const crawlTargets = gwangjuUrlItems
      .filter(item => item.value?.trim())
      .slice(0, GWANGJU_MAX_URLS)
      .map(item => ({ ...item, value: normalizeGwangjuUrl(item.value) }));
    setShowGwangjuInlineResults(true);
    setGwangjuCrawlProgress({ done: 0, total: crawlTargets.length });

    setGwangjuUrlItems(prev => prev.map(entry => (
      crawlTargets.some(target => target.id === entry.id)
        ? { ...entry, value: normalizeGwangjuUrl(entry.value), loading: true, error: '', menus: [] }
        : entry
    )));

    const crawledItems = await Promise.all(crawlTargets.map(async item => {
      try {
        if (!item.value || !isValidUrl(item.value)) {
          return { ...item, loading: false, error: '올바른 URL 형식이 아닙니다.', menus: [] };
        }
        const res = await fetch('/api/gwangju-header-menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: item.value }),
        });
        const data = await readGwangjuJsonResponse(res, '메뉴 크롤링에 실패했습니다.');
        if (!res.ok) throw new Error(data.error || '크롤링에 실패했습니다.');
        return {
          ...item,
          loading: false,
          siteName: data.siteName || item.siteName || '',
          menus: data.menus || [],
          error: data.menus?.length ? '' : '대상 메뉴 영역에서 메뉴를 찾지 못했습니다.',
        };
      } catch (error) {
        return { ...item, loading: false, error: error.message, menus: [] };
      } finally {
        setGwangjuCrawlProgress(prev => ({ ...prev, done: prev.done + 1 }));
      }
    }));

    setGwangjuUrlItems(prev => prev.map(entry => {
      const crawled = crawledItems.find(item => item.id === entry.id);
      return crawled || entry;
    }));
    if (crawledItems[0]) setActiveGwangjuUrlId(crawledItems[0].id);
  }

  function getRootLabel(root) {
    if (root?.label) return root.label;
    try { return new URL(root.url).hostname; } catch { return root?.url || '학교 URL'; }
  }

  function getActiveSchoolRoot() {
    if (activeSchoolKey === 'all') return null;
    return schoolRoots.find(root => root.key === activeSchoolKey) || null;
  }

  function parseSchoolRootLines(value) {
    return value
      .split(/\n+/)
      .flatMap(line => line.split(/,(?=\s*(?:https?:\/\/|[^,]+?\s*[-–—]\s*https?:\/\/))/))
      .map(raw => raw.trim())
      .filter(Boolean)
      .map(raw => {
        const match = raw.match(/^(.*?)\s*[-–—]\s*(https?:\/\/\S+)$/i);
        if (match) return { label: match[1].trim(), url: match[2].trim() };
        return { label: '', url: raw };
      });
  }

  function parseExcludeKeywords(value) {
    return value
      .split(/[\n,]+/)
      .map(keyword => keyword.trim())
      .filter(Boolean);
  }

  function getRootsForExtraction() {
    const inlineUrls = parseSchoolRootLines(batchRootUrl);

    if (inlineUrls.length > 0) {
      const invalid = inlineUrls.find(item => !isValidUrl(item.url));
      if (invalid) throw new Error(`올바른 URL 형식이 아닙니다: ${invalid.url}`);
      return inlineUrls.map(item => createSchoolRoot(item.url, item.label));
    }

    return schoolRoots;
  }

  async function extractSchoolRoot(root, progressOffset = 0, progressTotal = 4) {
    let resultData = null;
    const excludeKeywords = parseExcludeKeywords(excludeMenuInput);
    const res = await fetch('/api/extract-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: root.url, excludeKeywords }),
    });
    if (!res.ok) {
      let detail = `서버 오류 (${res.status})`;
      try { const d = await res.json(); detail = d.detail || detail; } catch {}
      throw new Error(detail);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let event;
        try { event = JSON.parse(line.slice(6)); } catch { continue; }
        if (event.type === 'progress') {
          setExtractProgress({
            step: progressOffset + event.step,
            total: progressTotal,
            label: `${getRootLabel(root)}: ${event.label || 'URL 추출 중...'}`,
          });
        } else if (event.type === 'result') {
          resultData = event;
          break outer;
        } else if (event.type === 'error') {
          throw new Error(event.detail || '추출 오류');
        }
      }
    }

    if (!resultData) throw new Error('응답을 파싱할 수 없습니다.');
    return resultData;
  }

  // ─── URL 아이템 수정/삭제 ───────────────────────────────────
  function updateItem(id, field, value) {
    setUrlItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  function updateItemCategory(id, category) {
    const templates = CATEGORY_TEMPLATES[category];
    const defaultTemplateId = templates?.[0]?.id ?? null;
    setUrlItems(prev => prev.map(item =>
      item.id === id ? { ...item, category, templateId: defaultTemplateId, selector: '' } : item
    ));
  }

  function removeItem(id) {
    setUrlItems(prev => prev.filter(item => item.id !== id));
  }

  function handleAddManualUrl() {
    const url = addUrlInput.trim();
    if (!url || !isValidUrl(url)) return;
    const activeRoot = getActiveSchoolRoot();
    const newId = urlItems.length > 0 ? Math.max(...urlItems.map(i => i.id)) + 1 : 0;
    setUrlItems(prev => [...prev, {
      id: newId,
      url,
      title: addTitleInput.trim(),
      schoolKey: activeRoot?.key || null,
      schoolName: activeRoot?.label || '',
      rootUrl: activeRoot?.url || '',
      category: null,
      templateId: null,
      selector: '',
      checked: true,
      contentType: 'unknown',
    }]);
    setAddUrlInput('');
    setAddTitleInput('');
  }

  function closeAddUrlForm() {
    setShowAddUrl(false);
    setAddUrlInput('');
    setAddTitleInput('');
  }

  function openPreview(url) {
    if (url?.startsWith('http:') && typeof window !== 'undefined' && window.location.protocol === 'https:') {
      window.open(url, '_blank', 'noopener,noreferrer');
      setPreviewOpen(false);
      return;
    }
    setPreviewUrl(url);
    setPreviewOpen(true);
  }

  function closePreview() {
    setPreviewOpen(false);
  }

  function openTypeModal(item) {
    setTypeModalItemId(item.id);
    setModalCategory(item.category ?? 'other');
    setModalTemplateId(item.templateId);
  }

  function closeTypeModal() {
    setTypeModalItemId(null);
  }

  function handleModalCategorySelect(category) {
    const templates = CATEGORY_TEMPLATES[category];
    setModalCategory(category);
    setModalTemplateId(templates?.[0]?.id ?? null);
  }

  function applyTypeModal() {
    if (typeModalItemId === null) return;
    const templates = CATEGORY_TEMPLATES[modalCategory];
    const templateId = templates ? (modalTemplateId || templates[0]?.id || null) : null;
    setUrlItems(prev => prev.map(item =>
      item.id === typeModalItemId
        ? { ...item, category: modalCategory, templateId, selector: '' }
        : item
    ));
    setTypeModalItemId(null);
  }

  // ─── URL 추출 ─────────────────────────────────────────────
  async function handleExtractUrls() {
    classifyAbortRef.current = true;
    setClassifying(false);
    let roots = [];
    try {
      roots = getRootsForExtraction();
    } catch (e) {
      setExtractError(e.message);
      return;
    }
    if (roots.length === 0) { setExtractError('URL을 입력하거나 학교 URL을 추가해주세요.'); return; }

    setSchoolRoots(roots);
    setExtracting(true); setExtractError(''); setUrlItems([]); setSiteName(''); setSiteNameLocked(false); setExtractResults([]);
    setBatchResults([]);
    setActiveResultIdx(0);
    setExtractProgress({ step: 0, total: roots.length * 4, label: '' });
    try {
      const allItems = [];
      const results = [];
      let nextId = 0;

      for (let rootIndex = 0; rootIndex < roots.length; rootIndex++) {
        const root = roots[rootIndex];
        try {
          const resultData = await extractSchoolRoot(root, rootIndex * 4, roots.length * 4);

          const schoolName = resultData.siteName || getRootLabel(root);
          const newItems = resultData.items.map(item => ({
            id: nextId++,
            url: item.url,
            title: item.title || '',
            schoolKey: root.key,
            schoolName,
            rootUrl: root.url,
            category: null,
            templateId: null,
            selector: '',
            checked: false,
            contentType: 'unknown',
          }));
          allItems.push(...newItems);
          results.push({ key: root.key, rootUrl: root.url, siteName: schoolName, count: newItems.length, error: null });
          setSchoolRoots(prev => prev.map(item => item.key === root.key ? { ...item, label: schoolName } : item));
        } catch (e) {
          results.push({ key: root.key, rootUrl: root.url, siteName: getRootLabel(root), count: 0, error: e.message });
        }
        setExtractResults([...results]);
      }

      if (allItems.length === 0) {
        setExtractError('URL을 추출하지 못했습니다. https:// 형식으로 입력하거나, URL 직접 추가 버튼을 사용해주세요.');
        return;
      }

      const firstSuccess = results.find(result => !result.error && result.count > 0);
      if (firstSuccess) {
        setActiveSchoolKey(firstSuccess.key);
        setSiteName(firstSuccess.siteName);
        setSiteNameLocked(true);
      }
      setUrlItems(allItems);
      classifyUrlItems(allItems);
    } catch (e) {
      setExtractError(`오류: ${e.message}`);
    } finally {
      setExtracting(false);
    }
  }

  async function handleRetryFailedExtracts() {
    const failed = extractResults.filter(result => result.error || result.count === 0);
    if (failed.length === 0) return;

    setRetryingFailedExtract(true);
    setExtracting(true);
    setExtractError('');
    setExtractProgress({ step: 0, total: failed.length * 4, label: '' });

    const newItemsForClassify = [];
    let nextId = urlItems.length > 0 ? Math.max(...urlItems.map(item => item.id)) + 1 : 0;

    try {
      for (let i = 0; i < failed.length; i++) {
        const failedResult = failed[i];
        const existingRoot = schoolRoots.find(root => root.key === failedResult.key);
        const root = existingRoot || {
          key: failedResult.key,
          url: failedResult.rootUrl,
          label: failedResult.siteName,
        };

        try {
          const resultData = await extractSchoolRoot(root, i * 4, failed.length * 4);
          const schoolName = resultData.siteName || getRootLabel(root);
          const newItems = resultData.items.map(item => ({
            id: nextId++,
            url: item.url,
            title: item.title || '',
            schoolKey: root.key,
            schoolName,
            rootUrl: root.url,
            category: null,
            templateId: null,
            selector: '',
            checked: false,
            contentType: 'unknown',
          }));

          newItemsForClassify.push(...newItems);
          setUrlItems(prev => [
            ...prev.filter(item => item.schoolKey !== root.key),
            ...newItems,
          ]);
          setExtractResults(prev => prev.map(result =>
            result.key === root.key
              ? { ...result, siteName: schoolName, count: newItems.length, error: null }
              : result
          ));
          setSchoolRoots(prev => prev.map(item =>
            item.key === root.key ? { ...item, label: schoolName } : item
          ));
          setActiveSchoolKey(root.key);
          setSiteName(schoolName);
          setSiteNameLocked(true);
        } catch (e) {
          setExtractResults(prev => prev.map(result =>
            result.key === root.key ? { ...result, error: e.message } : result
          ));
        }
      }

      if (newItemsForClassify.length > 0) classifyUrlItems(newItemsForClassify);
    } finally {
      setExtracting(false);
      setRetryingFailedExtract(false);
    }
  }

  // ─── URL 페이지 유형 분류 (이미지형 / 텍스트형) ───────────────
  async function classifyUrlItems(items) {
    classifyAbortRef.current = false;
    setClassifying(true);
    setClassifyProgress({ done: 0, total: items.length });
    const CONCURRENCY = 3;
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      if (classifyAbortRef.current) break;
      const batch = items.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(async (item) => {
        try {
          const res = await fetch('/api/fetch-markup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: item.url }),
          });
          if (!res.ok) return { id: item.id, contentType: 'error' };
          const data = await res.json();
          const extracted = extractContent(data.html, '', item.url);
          return { id: item.id, contentType: hasContentImage(extracted) ? 'image' : 'text' };
        } catch {
          return { id: item.id, contentType: 'error' };
        }
      }));
      if (classifyAbortRef.current) break;
      setClassifyProgress({ done: Math.min(i + CONCURRENCY, items.length), total: items.length });
      setUrlItems(prev => {
        const map = Object.fromEntries(results.map(r => [r.id, r.contentType]));
        return prev.map(it => map[it.id] !== undefined ? { ...it, contentType: map[it.id] } : it);
      });
    }
    if (!classifyAbortRef.current) setClassifying(false);
  }

  function toggleAllChecked() {
    const allChecked = urlItems.every(item => item.checked);
    setUrlItems(prev => prev.map(item => ({ ...item, checked: !allChecked })));
  }

  function toggleAllRegularChecked() {
    setUrlItems(prev => {
      const regularOnes = prev.filter(i =>
        i.contentType !== 'image' && (activeSchoolKey === 'all' || i.schoolKey === activeSchoolKey)
      );
      const allChecked = regularOnes.every(i => i.checked);
      return prev.map(item =>
        item.contentType !== 'image' && (activeSchoolKey === 'all' || item.schoolKey === activeSchoolKey)
          ? { ...item, checked: !allChecked }
          : item
      );
    });
  }

  function toggleAllImageChecked() {
    setUrlItems(prev => {
      const imageOnes = prev.filter(i =>
        i.contentType === 'image' && (activeSchoolKey === 'all' || i.schoolKey === activeSchoolKey)
      );
      const allChecked = imageOnes.every(i => i.checked);
      return prev.map(item =>
        item.contentType === 'image' && (activeSchoolKey === 'all' || item.schoolKey === activeSchoolKey)
          ? { ...item, checked: !allChecked }
          : item
      );
    });
  }

  function moveCheckedItemsToContentType(contentType) {
    setUrlItems(prev => prev.map(item => {
      const isVisible = activeSchoolKey === 'all' || item.schoolKey === activeSchoolKey;
      if (!isVisible || !item.checked) return item;
      return { ...item, contentType, checked: false };
    }));
  }

  async function handleCopySelectedUrls() {
    const urls = urlItems.filter(i => i.checked && i.url).map(i => i.url);
    if (!urls.length) return;
    await navigator.clipboard.writeText(urls.join('\n'));
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  async function generateMarkupForResult(result) {
    const url = result.url;
    const selector = result.selector || '';
    let html = '';

    if (result.templateId) {
      const tpl = ALL_TEMPLATES.find(t => t.id === result.templateId);
      if (!tpl) throw new Error('템플릿을 찾을 수 없습니다.');
      const res = await fetch('/api/fetch-markup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data.error || '실패');
      const extracted = extractContent(data.html, selector, url);
      html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
    } else if (result.category === 'footer') {
      const res = await fetch('/api/auto-markup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, context: 'footer', selector }),
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data.detail || '실패');
      html = applyTableProcessing(data.html || '');
    } else {
      const res = await fetch('/api/auto-markup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, selector }),
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) throw new Error(data.detail || '실패');
      html = applyTableProcessing(data.html || '');
    }

    if (!html?.trim()) throw new Error('본문 영역을 자동으로 감지하지 못했습니다.');
    return normalizeGeneratedMarkup(html);
  }

  async function handleRegenerateFailedPages(failedResults) {
    if (!failedResults.length) return;
    setRegeneratingFailed(true);
    try {
      const updated = [...batchResults];
      for (const failed of failedResults) {
        try {
          const html = await generateMarkupForResult(failed);
          const idx = updated.findIndex(result => result.url === failed.url);
          const nextResult = { ...failed, html, error: null };
          if (idx >= 0) updated[idx] = { ...updated[idx], ...nextResult };
          else updated.push(nextResult);
        } catch (e) {
          const idx = updated.findIndex(result => result.url === failed.url);
          const nextResult = { ...failed, html: '', error: e.message };
          if (idx >= 0) updated[idx] = { ...updated[idx], ...nextResult };
          else updated.push(nextResult);
        }
      }
      setBatchResults(updated);
      const firstSuccessIdx = updated.findIndex(result => !result.error && result.html?.trim());
      if (firstSuccessIdx >= 0) {
        setActiveResultIdx(firstSuccessIdx);
        setActiveResultSchoolKey(updated[firstSuccessIdx].schoolKey || 'unknown');
      }
    } finally {
      setRegeneratingFailed(false);
    }
  }

  // ─── 일괄 마크업 생성 ─────────────────────────────────────
  async function handleBatchGenerate() {
    const validItems = urlItems.filter(({ url, checked }) => checked && url && isValidUrl(url));
    if (validItems.length === 0) { setExtractError('유효한 URL이 없습니다.'); return; }
    const SPECIAL_KW = ['연혁', '상징', '인사'];
    const untyped = validItems.filter(item =>
      item.category === null &&
      SPECIAL_KW.some(kw => (item.title || '').includes(kw))
    );
    if (untyped.length > 0) {
      triggerToast(`마크업 유형을 선택해주세요: ${untyped.map(i => `"${i.title}"`).join(', ')}`, 'error');
      return;
    }
    setBatchLoading(true);
    setBatchResults([]);
    setBatchProgress({ done: 0, total: validItems.length });
    setActiveResultIdx(0);
    setActiveResultSchoolKey(validItems[0]?.schoolKey || 'unknown');

    const results = [];
    for (let i = 0; i < validItems.length; i++) {
      const { url, title, category, templateId, selector: itemSelector, schoolKey, schoolName, rootUrl } = validItems[i];
      const tpl = templateId ? ALL_TEMPLATES.find(t => t.id === templateId) : null;
      try {
        let html = '';

        if (tpl) {
          // 템플릿 모드: HTML 가져오기 → 콘텐츠 추출 → 템플릿 적용
          const res = await fetch('/api/fetch-markup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          let data = {};
          try { data = await res.json(); } catch {}
          if (!res.ok) throw new Error(data.error || '실패');
          const extracted = extractContent(data.html, itemSelector, url);

          if (tpl.category === '상징') {
            // 상징 템플릿: DOM에서 상징 아이템 파싱 가능 여부 먼저 확인
            const { parseSymbolSource } = await import('../../../../templates/symbol.js');
            const docForCheck = new DOMParser().parseFromString(extracted, 'text/html');
            const symbolItems = parseSymbolSource(docForCheck.body);

            if (symbolItems.length > 0) {
              // DOM에 파싱 가능한 아이템 있음 → 일반 매핑
              html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
            } else {
              // 아이템 없음 → 서버사이드 Groq Vision OCR 시도
              const imgUrls = getContentImageUrls(extracted, url);
              if (imgUrls.length > 0) {
                setOcrStatus('이미지 OCR 분석 중…');
                try {
                  const SYMBOL_PROMPT = `이 이미지는 학교 상징 페이지입니다. 아래 형식으로 각 항목의 이름과 설명을 추출하세요.

교목 [이름]
[교목 설명 (있는 경우)]
교화 [이름]
[교화 설명 (있는 경우)]
교표
[교표 설명 (있는 경우)]
교기
[교기 설명 (있는 경우)]
교훈: [교훈 내용]
교가: 있음 (교가 악보가 보이는 경우)

규칙: 없는 항목은 완전히 생략하세요. "없음" 같은 값은 절대 쓰지 마세요.`;
                  const ocrRes = await fetch('/api/ocr-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imgUrls[0], prompt: SYMBOL_PROMPT }),
                  });
                  const ocrData = await ocrRes.json();
                  const ocrText = ocrData.text || '';
                  const { parseSymbolOcr, buildSyntheticSymbolHtml, findSongImageFromHtml, extractSongLyricsFromImage } = await import('../../../../utils/ocrSymbol.js');
                  const detectedSongUrl = findSongImageFromHtml(extracted, url)
                    || (imgUrls.length >= 2 ? imgUrls[imgUrls.length - 1] : '');
                  if (ocrText.trim()) {
                    const { items, sloganText, hasSong } = parseSymbolOcr(ocrText);
                    const songImgUrl = detectedSongUrl || (hasSong ? imgUrls[0] : '');
                    if (items.length > 0) {
                      const songLyrics = songImgUrl ? await extractSongLyricsFromImage(songImgUrl).catch(() => null) : null;
                      html = formatHtml(applyMarkupToTemplate(
                        buildSyntheticSymbolHtml(items, sloganText, songImgUrl, '', songLyrics),
                        tpl.code, tpl.id
                      ));
                    } else {
                      html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                    }
                  } else {
                    html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                  }
                } catch {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                } finally {
                  setOcrStatus('');
                }
              } else {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              }
            }
          } else if (tpl.category === '연혁') {
            // 연혁 템플릿: HTML에서 먼저 파싱 시도, 실패 시 이미지 OCR
            const directResult = applyMarkupToTemplate(extracted, tpl.code, tpl.id);
            if (directResult !== tpl.code) {
              html = formatHtml(directResult);
            } else {
              const imgUrls = getContentImageUrls(extracted, url);
              if (imgUrls.length > 0) {
                setOcrStatus('연혁 이미지 OCR 분석 중…');
                try {
                  const HISTORY_PROMPT = `이 이미지는 학교 연혁(학교 역사) 페이지입니다. 연도별 내용을 아래 형식으로 추출하세요.

2024년
3. 1 제47회 입학식(신입생 273명)
2. 9 제45회 졸업식(졸업생 293명)
2023년
3. 2 제46회 입학식

규칙:
- 연도는 반드시 단독 줄에 YYYY년 형식
- 날짜는 월. 일 형식 (예: 3. 1)
- 내용은 날짜 뒤에 한 칸 공백 후 작성
- 설명 없이 데이터만 출력`;
                  const ocrRes = await fetch('/api/ocr-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imgUrls[0], prompt: HISTORY_PROMPT }),
                  });
                  const ocrData = await ocrRes.json();
                  const ocrText = ocrData.text || '';
                  if (ocrText.trim()) {
                    const paragraphs = ocrText
                      .split(/\n+/)
                      .map(line => line.trim())
                      .filter(line => line.length > 1)
                      .map(line => `<p>${line}</p>`)
                      .join('\n');
                    html = formatHtml(applyMarkupToTemplate(`<div>${paragraphs}</div>`, tpl.code, tpl.id));
                  } else {
                    html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                  }
                } catch {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                } finally {
                  setOcrStatus('');
                }
              } else {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              }
            }
          } else if (isImageOnlyContent(extracted)) {
            // 인사말 등 일반 템플릿: 이미지 전용 콘텐츠 → Groq Vision OCR
            const imgUrls = getContentImageUrls(extracted, url);
            if (imgUrls.length > 0) {
              setOcrStatus('이미지 OCR 분석 중…');
              try {
                const ocrRes = await fetch('/api/ocr-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ imageUrl: imgUrls[0] }),
                });
                const ocrData = await ocrRes.json();
                const ocrText = ocrData.text || '';
                if (ocrText.trim()) {
                  const paragraphs = ocrText
                    .split(/\n+/)
                    .map(line => line.trim())
                    .filter(line => line.length > 3)
                    .map(line => `<p>${line}</p>`)
                    .join('\n');
                  html = formatHtml(applyMarkupToTemplate(`<div>${paragraphs}</div>`, tpl.code, tpl.id));
                } else {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                }
              } catch {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              } finally {
                setOcrStatus('');
              }
            } else {
              html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
            }
          } else {
            html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
          }
        } else if (category === 'footer') {
          // 푸터메뉴 모드: 푸터 전용 마크업 규칙(개인정보처리방침 등) 적용
          const res = await fetch('/api/auto-markup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, context: 'footer' }),
          });
          let data = {};
          try { data = await res.json(); } catch {}
          if (!res.ok) throw new Error(data.detail || '실패');
          html = applyTableProcessing(data.html || '');
        } else {
          // 기타 모드: auto-markup
          const res = await fetch('/api/auto-markup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, selector: '' }),
          });
          let data = {};
          try { data = await res.json(); } catch {}
          if (!res.ok) throw new Error(data.detail || '실패');
          html = applyTableProcessing(data.html || '');
        }

        results.push({ url, title, category, templateId, selector: itemSelector, schoolKey, schoolName, rootUrl, html: normalizeGeneratedMarkup(html), error: null });
      } catch (e) {
        results.push({ url, title, category, templateId, selector: itemSelector, schoolKey, schoolName, rootUrl, html: '', error: e.message });
      }
      setBatchProgress({ done: i + 1, total: validItems.length });
      setBatchResults([...results]);
    }
    setBatchLoading(false);
    const firstSuccessIdx = results.findIndex(r => !r.error && r.html?.trim());
    setActiveResultIdx(firstSuccessIdx >= 0 ? firstSuccessIdx : 'failed');
    if (firstSuccessIdx >= 0) setActiveResultSchoolKey(results[firstSuccessIdx].schoolKey || 'unknown');
  }

  // ─── 마크업 ZIP 다운로드 ───────────────────────────────────
  function getSafeDownloadName(value, fallback = '마크업') {
    const safeName = String(value || '')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_');
    return safeName || fallback;
  }

  async function handleDownloadZip() {
    const readyResults = batchResults.filter(r => r.html?.trim() && !r.error);
    if (readyResults.length === 0) return;
    setDownloading(true);
    try {
      const files = readyResults.map(r => ({
        name: r.title || new URL(r.url).pathname.split('/').filter(Boolean).pop() || '마크업',
        schoolName: r.schoolName || siteName || '학교명',
        rootUrl: r.rootUrl || '',
        html: r.html,
      }));
      const rootForName = getActiveSchoolRoot() || schoolRoots[0];
      let hostname = '마크업';
      try {
        hostname = rootForName?.url ? new URL(rootForName.url).hostname : new URL(batchRootUrl.trim()).hostname;
      } catch {}
      const zipName = getSafeDownloadName(siteName, hostname);
      const res = await fetch('/api/batch-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, siteName: zipName }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.detail || '다운로드 실패'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${zipName}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(`다운로드 오류: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  }

  function handleSourceCategoryChange(category) {
    const templates = CATEGORY_TEMPLATES[category];
    setSourceCategory(category);
    setSourceTemplateId(templates?.[0]?.id ?? null);
  }

  // ─── 소스 직접 입력 → 마크업 생성 (URL 배치 모드와 동일한 분기) ─
  async function handleSourceMarkup() {
    if (!sourceHtml.trim()) return;
    setSourceLoading(true);
    setSourceResult(null);
    try {
      const extracted = extractContent(sourceHtml.trim(), sourceSelector.trim(), '');
      let html = '';

      if (['greeting', 'history', 'symbol'].includes(sourceCategory) && sourceTemplateId) {
        const tpl = ALL_TEMPLATES.find(t => t.id === sourceTemplateId);
        if (tpl) {
          if (tpl.category === '상징') {
            const { parseSymbolSource } = await import('../../../../templates/symbol.js');
            const docForCheck = new DOMParser().parseFromString(extracted, 'text/html');
            const symbolItems = parseSymbolSource(docForCheck.body);
            if (symbolItems.length > 0) {
              html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
            } else {
              const imgUrls = getContentImageUrls(extracted, '');
              if (imgUrls.length > 0) {
                try {
                  const SYMBOL_PROMPT = `이 이미지는 학교 상징 페이지입니다. 교목, 교화, 교표, 교기, 교훈, 교가 항목의 이름과 설명을 추출하세요. 없는 항목은 생략하세요.`;
                  const ocrRes = await fetch('/api/ocr-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imgUrls[0], prompt: SYMBOL_PROMPT }),
                  });
                  const ocrData = await ocrRes.json();
                  const ocrText = ocrData.text || '';
                  const { parseSymbolOcr, buildSyntheticSymbolHtml, findSongImageFromHtml, extractSongLyricsFromImage } = await import('../../../../utils/ocrSymbol.js');
                  const detectedSongUrl = findSongImageFromHtml(extracted, '');
                  if (ocrText.trim()) {
                    const { items, sloganText, hasSong } = parseSymbolOcr(ocrText);
                    const songImgUrl = detectedSongUrl || (hasSong ? imgUrls[0] : '');
                    if (items.length > 0) {
                      const songLyrics = songImgUrl ? await extractSongLyricsFromImage(songImgUrl).catch(() => null) : null;
                      html = formatHtml(applyMarkupToTemplate(
                        buildSyntheticSymbolHtml(items, sloganText, songImgUrl, '', songLyrics),
                        tpl.code, tpl.id
                      ));
                    } else {
                      html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                    }
                  } else {
                    html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                  }
                } catch {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                }
              } else {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              }
            }
          } else {
            // 인사말·연혁: 이미지 전용인지 확인 후 템플릿 적용
            if (isImageOnlyContent(extracted)) {
              const imgUrls = getContentImageUrls(extracted, '');
              if (imgUrls.length > 0) {
                try {
                  const ocrRes = await fetch('/api/ocr-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imgUrls[0] }),
                  });
                  const ocrData = await ocrRes.json();
                  const ocrText = ocrData.text || '';
                  if (ocrText.trim()) {
                    const paragraphs = ocrText
                      .split(/\n+/)
                      .map(line => line.trim())
                      .filter(line => line.length > 3)
                      .map(line => `<p>${line}</p>`)
                      .join('\n');
                    html = formatHtml(applyMarkupToTemplate(`<div>${paragraphs}</div>`, tpl.code, tpl.id));
                  } else {
                    html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                  }
                } catch {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                }
              } else {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              }
            } else {
              html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
            }
          }
        }
      } else if (sourceCategory === 'footer') {
        const res = await fetch('/api/auto-markup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: extracted, context: 'footer' }),
        });
        let data = {};
        try { data = await res.json(); } catch {}
        if (!res.ok) throw new Error(data.detail || '실패');
        html = applyTableProcessing(data.html || '');
      } else {
        const res = await fetch('/api/auto-markup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: extracted }),
        });
        let data = {};
        try { data = await res.json(); } catch {}
        if (!res.ok) throw new Error(data.detail || '마크업 변환 실패');
        html = applyTableProcessing(data.html || '');
      }

      setSourceResult(normalizeGeneratedMarkup(html));
    } catch (e) {
      setSourceResult(`<!-- 마크업 생성 중 오류: ${e.message} -->`);
    } finally {
      setSourceLoading(false);
    }
  }

  const visibleUrlItems = activeSchoolKey === 'all'
    ? urlItems
    : urlItems.filter(i => i.schoolKey === activeSchoolKey);
  const imageItems = visibleUrlItems.filter(i => i.contentType === 'image');
  const checkedImageItems = imageItems.filter(i => i.checked);
  const regularItems = visibleUrlItems.filter(i => i.contentType !== 'image');
  const resultSchoolGroups = Array.from(batchResults.reduce((map, result, index) => {
    const key = result.schoolKey || 'unknown';
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: result.schoolName || siteName || '학교명',
        results: [],
      });
    }
    map.get(key).results.push({ ...result, index });
    return map;
  }, new Map()).values());
  const currentResultSchoolKey = activeResultSchoolKey || resultSchoolGroups[0]?.key || '';
  const activeResultSchoolGroup = resultSchoolGroups.find(group => group.key === currentResultSchoolKey) || resultSchoolGroups[0];
  const activeSchoolSuccessResults = activeResultSchoolGroup?.results.filter(r => !r.error && r.html?.trim()) || [];
  const activeSchoolFailedResults = activeResultSchoolGroup?.results.filter(r => r.error || !r.html?.trim()) || [];

  function buildImageUrlExportText(items = allImageItems) {
    const grouped = new Map();
    items.forEach(item => {
      const key = item.schoolKey || item.rootUrl || 'manual';
      if (!grouped.has(key)) {
        const root = schoolRoots.find(school => school.key === item.schoolKey);
        grouped.set(key, {
          schoolName: item.schoolName || root?.label || (root ? getRootLabel(root) : siteName) || '학교명',
          rootUrl: item.rootUrl || root?.url || '',
          items: [],
        });
      }
      grouped.get(key).items.push(item);
    });

    return Array.from(grouped.values()).map(group => {
      const header = `${group.schoolName} - ${group.rootUrl || '-'}`;
      const lines = group.items.map(item => `${item.title || '(제목 없음)'} - ${item.url}`);
      return [header, '이미지형 페이지 url', ...lines].join('\n');
    }).join('\n\n');
  }

  function downloadImageUrlExport() {
    const text = buildImageUrlExportText(checkedImageItems);
    if (!text.trim()) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${getSafeDownloadName(siteName || '이미지형_페이지_URL')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function renderUrlItemRow(item, isLast, isFirst) {
    return (
      <div key={item.id} className={`url-item-row${item.checked ? '' : ' url-item-row--unchecked'}`}>
        <input
          type="checkbox"
          className="url-item-check"
          checked={item.checked}
          onChange={e => updateItem(item.id, 'checked', e.target.checked)}
          disabled={batchLoading}
        />
        <button
          className="url-item-preview-btn"
          onClick={() => openPreview(item.url)}
          title="미리보기"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <div className="url-item-info">
          <span className="url-item-title">{item.title || '—'}</span>
          <span className="url-item-url">{item.url}</span>
        </div>
        <button
          ref={isFirst ? tourRefs.typeBtn : undefined}
          className={`url-item-type-btn${item.category !== null ? ' has-selection' : ''}`}
          onClick={() => openTypeModal(item)}
          disabled={batchLoading}
        >
          <span className="url-item-type-main">
            {{ greeting: '인사말', symbol: '상징', history: '연혁', footer: '푸터메뉴', other: '기타' }[item.category] || '마크업 유형 선택'}
          </span>
          {item.templateId && (
            <span className="url-item-type-sub">
              {ALL_TEMPLATES.find(t => t.id === item.templateId)?.label.replace(/^(인사말|연혁|상징)\s+/, '')}
            </span>
          )}
        </button>
        <button
          className="url-item-remove"
          onClick={() => removeItem(item.id)}
          disabled={batchLoading}
          title="제거"
        >✕</button>
      </div>
    );
  }

  function renderTypeModal() {
    return (
      <div className="url-type-modal" onClick={e => e.stopPropagation()}>
        <div className="url-type-modal-head">
          <span className="url-type-modal-title">마크업 유형 선택</span>
          <button className="url-type-modal-close" onClick={closeTypeModal}>✕</button>
        </div>
        <div className="url-type-modal-body">
          <div className="url-type-modal-cats">
            {[
              { value: 'greeting', label: '인사말' },
              { value: 'symbol', label: '상징' },
              { value: 'history', label: '연혁' },
              { value: 'footer', label: '푸터메뉴' },
              { value: 'other', label: '기타' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`url-type-modal-cat${modalCategory === opt.value ? ' is-active' : ''}`}
                onClick={() => handleModalCategorySelect(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {modalCategory && CATEGORY_TEMPLATES[modalCategory] && (
            <div className="url-type-modal-tpls">
              {CATEGORY_TEMPLATES[modalCategory].map(tpl => (
                <button
                  key={tpl.id}
                  className={`url-type-modal-tpl-card${modalTemplateId === tpl.id ? ' is-active' : ''}`}
                  onClick={() => setModalTemplateId(tpl.id)}
                >
                  {tpl.label.replace(/^(인사말|연혁|상징)\s+/, '')}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="url-type-modal-footer">
          <button className="url-type-modal-cancel" onClick={closeTypeModal}>취소</button>
          <button className="url-type-modal-apply" onClick={applyTypeModal}>적용</button>
        </div>
      </div>
    );
  }

  return (
    <div className="crawl-page">
      {toast.show && <div key={toast.id} className="toast-popup">{toast.message}</div>}
      {(extracting || classifying) && projectType === 'chungnam' && mode === 'url' && (
        <div className="url-extract-overlay">
          <div className="url-extract-overlay-card">
            <p className="url-extract-overlay-label">
              {extracting
                ? (extractProgress.label || 'URL 추출 중…')
                : `페이지 분석 중 (${classifyProgress.done} / ${classifyProgress.total})`}
            </p>
            <div className="url-extract-progress-track">
              <div
                className={`url-extract-progress-fill${extracting && extractProgress.step === 0 ? ' is-indeterminate' : ''}`}
                style={{
                  width: extracting && extractProgress.total > 0
                    ? `${Math.round(extractProgress.step / extractProgress.total * 100)}%`
                    : classifying
                    ? `${Math.round(classifyProgress.done / Math.max(classifyProgress.total, 1) * 100)}%`
                    : undefined,
                }}
              />
            </div>
            {extracting && extractProgress.total > 0 && (
              <p className="url-extract-overlay-pct">
                {Math.round(extractProgress.step / extractProgress.total * 100)}%
              </p>
            )}
            {classifying && (
              <p className="url-extract-overlay-pct">
                {Math.round(classifyProgress.done / Math.max(classifyProgress.total, 1) * 100)}%
              </p>
            )}
          </div>
        </div>
      )}
      {isGwangjuCrawling && projectType === 'gwangju' && (
        <div className="url-extract-overlay">
          <div className="url-extract-overlay-card">
            <p className="url-extract-overlay-label">
              사이트 크롤링 중 ({gwangjuCrawlProgress.done} / {gwangjuCrawlProgress.total})
            </p>
            <div className="url-extract-progress-track">
              <div
                className="url-extract-progress-fill"
                style={{
                  width: `${Math.round(gwangjuCrawlProgress.done / Math.max(gwangjuCrawlProgress.total, 1) * 100)}%`,
                }}
              />
            </div>
            <p className="url-extract-overlay-pct">
              {Math.round(gwangjuCrawlProgress.done / Math.max(gwangjuCrawlProgress.total, 1) * 100)}%
            </p>
          </div>
        </div>
      )}
      <div className="crawl-page-inner">
        <div className="crawl-title-row">
          <h2 className="crawl-title">학교통합 마크업</h2>
          <div className="crawl-title-actions">
            <button
              type="button"
              className="crawl-styleguide-btn"
              onClick={openStyleGuide}
            >
              스타일가이드
            </button>
            <button
              type="button"
              className="crawl-help-btn"
              onClick={() => setShowHelp(true)}
              title="도움말"
              aria-label="학교통합 마크업 사용방법 열기"
            >
              ?
            </button>
          </div>
        </div>

        {showHelp && (
          <InspectionHelpModal
            title="학교통합 마크업 사용 순서"
            onClose={() => setShowHelp(false)}
            steps={[
              { title: '프로젝트 선택', description: '작업할 학교통합 프로젝트 유형을 선택합니다.' },
              { title: '학교 URL 입력', description: '학교명과 학교 루트 URL을 입력한 뒤 메뉴 URL을 추출합니다.' },
              { title: '마크업 유형 지정', description: '인사말·연혁·학교상징 등 특수 페이지는 알맞은 유형과 템플릿을 선택합니다.' },
              { title: '마크업 생성', description: '추출된 URL을 확인하고 선택한 페이지의 마크업 생성을 실행합니다.' },
              { title: '결과 확인 및 저장', description: '코드와 미리보기를 확인한 뒤 필요한 결과를 복사하거나 ZIP으로 다운로드합니다.' },
            ]}
          />
        )}

        {/* ─── 모드 탭 ─── */}
        <div className="crawl-project-switch" aria-label="프로젝트 선택">
          <label className={`crawl-project-option ${projectType === 'gwangju' ? 'is-active' : ''}`}>
            <input
              type="checkbox"
              checked={projectType === 'gwangju'}
              onChange={() => setProjectType('gwangju')}
            />
            <span>광주학교통합</span>
          </label>
          <label className={`crawl-project-option ${projectType === 'chungnam' ? 'is-active' : ''}`}>
            <input
              type="checkbox"
              checked={projectType === 'chungnam'}
              onChange={() => setProjectType('chungnam')}
            />
            <span>충남학교통합</span>
          </label>
        </div>

        {projectType === 'gwangju' && (
          <div className="gwangju-url-panel" aria-label="광주학교통합 URL 입력">
            {gwangjuUrlItems.map((item, index) => (
              <div key={item.id} className="gwangju-url-item">
                <div className="gwangju-url-row">
                  <input
                    className="gwangju-url-input"
                    type="text"
                    placeholder="url을 입력하세요"
                    value={item.value}
                    onChange={e => updateGwangjuUrlInput(item.id, e.target.value)}
                    onFocus={() => setActiveGwangjuUrlId(item.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !item.loading) crawlGwangjuHeaderMenus(item.id);
                    }}
                    disabled={item.loading}
                  />
                  <button
                    type="button"
                    className="gwangju-url-icon-btn gwangju-url-icon-btn--add"
                    onClick={addGwangjuUrlInput}
                    aria-label="URL 입력 추가"
                    title="URL 입력 추가"
                    disabled={item.loading || gwangjuUrlItems.length >= GWANGJU_MAX_URLS}
                  >
                    +
                  </button>
                  {index > 0 && (
                    <button
                      type="button"
                      className="gwangju-url-icon-btn gwangju-url-icon-btn--remove"
                      onClick={() => removeGwangjuUrlInput(item.id)}
                      aria-label="URL 입력 삭제"
                      title="URL 입력 삭제"
                      disabled={item.loading}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
            <p className="gwangju-url-limit-note">※ 최대 10개 URL 크롤링이 가능합니다.</p>
            {hasGwangjuUrlInput && (
              <div className="gwangju-crawl-actions">
                <button
                  type="button"
                  className="gwangju-url-search-btn gwangju-url-search-btn--main"
                  onClick={crawlAllGwangjuHeaderMenus}
                  disabled={isGwangjuCrawling}
                  aria-label="크롤링"
                >
                  {isGwangjuCrawling ? '크롤링 중' : '크롤링'}
                </button>
              </div>
            )}
            {showGwangjuInlineResults && hasGwangjuCrawlResult && (
              <div className="gwangju-site-results gwangju-work-layer">
                <div className="gwangju-work-layer-head">
                  <div>
                    <h2>광주학교통합 크롤링 작업창</h2>
                    <p>{isGwangjuCrawling ? '크롤링 중입니다.' : '사이트 탭과 메뉴를 선택해 화면을 확인하세요.'}</p>
                  </div>
                  <button
                    type="button"
                    className="gwangju-work-layer-close"
                    onClick={() => {
                      if (closeGwangjuMarkupPanels()) setShowGwangjuInlineResults(false);
                    }}
                    aria-label="작업창 닫기"
                  >
                    ×
                  </button>
                </div>
                <div className="gwangju-site-tabs" aria-label="사이트별 크롤링 결과">
                  {gwangjuUrlItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`gwangju-site-tab ${activeGwangjuUrlItem?.id === item.id ? 'is-active' : ''}`}
                      onClick={() => {
                        if (!closeGwangjuMarkupPanels()) return;
                        setActiveGwangjuUrlId(item.id);
                      }}
                      title={item.value || getGwangjuTabLabel(item, index)}
                    >
                      {getGwangjuTabLabel(item, index)}
                      {item.menus?.length > 0 && <span>{item.menus.length}</span>}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="gwangju-file-download-btn"
                    onClick={downloadGwangjuSavedMarkupZip}
                    disabled={!hasGwangjuSavedMarkup}
                  >
                    파일다운로드
                  </button>
                </div>
                <div className="gwangju-site-panel">
                  {activeGwangjuUrlItem?.error && (
                    <p className="gwangju-url-error">{activeGwangjuUrlItem.error}</p>
                  )}
                  {activeGwangjuUrlItem?.loading && (
                    <p className="gwangju-url-status">메뉴를 크롤링하고 있습니다.</p>
                  )}
                  {activeGwangjuUrlItem?.menus?.length > 0 ? (
                    <div className="gwangju-menu-workspace">
                      <div className="gwangju-menu-list" aria-label="크롤링된 메뉴 목록">
                        {activeGwangjuUrlItem.menus.map((menu, menuIndex) => (
                          menu.depth === 1 ? (
                            <h2
                              key={`${menu.label}-${menu.url || menuIndex}`}
                              className="gwangju-menu-depth-title"
                            >
                              {menu.label}
                            </h2>
                          ) : (
                            <div
                              key={`${menu.label}-${menu.url || menuIndex}`}
                              className="gwangju-menu-row"
                            >
                            <button
                              type="button"
                              className={`gwangju-menu-btn ${activeGwangjuMenuUrl === menu.url ? 'is-active' : ''}`}
                              title={menu.url || menu.label}
                              onClick={() => {
                                if (menu.url) {
                                  if (!closeGwangjuMarkupPanels()) return;
                                  setActiveGwangjuMenuBySite(prev => ({
                                    ...prev,
                                    [activeGwangjuUrlItem.id]: menu.url,
                                  }));
                                }
                            }}
                          >
                              <span className="gwangju-menu-btn-label">{menu.label}</span>
                              {menu.url && gwangjuSavedMarkupByUrl[menu.url]?.source && (
                                <span className="gwangju-menu-saved-badge" title="저장됨" aria-label="저장됨">
                                  <svg className="gwangju-menu-icon" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                </span>
                              )}
                            </button>
                            {menu.url && (
                              <button
                                type="button"
                                className="gwangju-menu-load-btn"
                                onClick={() => loadGwangjuSavedMarkup(menu, activeGwangjuUrlItem.id)}
                                disabled={!gwangjuSavedMarkupByUrl[menu.url]?.source}
                                aria-label={`${menu.label} 저장된 마크업 불러오기`}
                                title="저장된 마크업 불러오기"
                              >
                                <svg className="gwangju-menu-icon" viewBox="0 0 24 24" aria-hidden="true">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <path d="M7 10l5 5 5-5" />
                                  <path d="M12 15V3" />
                                </svg>
                              </button>
                            )}
                            <button
                              type="button"
                              className="gwangju-menu-delete-btn"
                              onClick={() => removeGwangjuMenu(activeGwangjuUrlItem.id, menu)}
                              aria-label={`${menu.label} 메뉴 삭제`}
                              title="메뉴 삭제"
                            >
                              ×
                            </button>
                            </div>
                          )
                        ))}
                      </div>
                      <div className="gwangju-menu-preview">
                        <div className="gwangju-preview-toolbar">
                          <button
                            type="button"
                            className="gwangju-markup-btn"
                            onClick={fetchGwangjuMarkupSource}
                            disabled={!activeGwangjuMenuUrl || gwangjuMarkupLoading}
                          >
                            {gwangjuMarkupLoading ? '소스 가져오는 중' : '크롤링하기'}
                          </button>
                        </div>
                        <div className={`gwangju-markup-source-panel ${gwangjuMarkupPanelOpen ? 'is-open' : ''} ${gwangjuConvertPanelOpen ? 'has-convert-panel' : ''}`}>
                          <div className="gwangju-convert-trigger">
                            <button
                              type="button"
                              className="gwangju-basic-pulse-btn"
                              onClick={() => applyGwangjuConvertTemplate(null)}
                              disabled={!gwangjuMarkupSource || gwangjuMarkupLoading}
                              aria-label="기본 마크업 적용"
                            >
                              기본<br />마크업
                            </button>
                            <button
                              type="button"
                              className="gwangju-convert-pulse-btn"
                              onClick={() => setGwangjuConvertMenuOpen(open => !open)}
                              disabled={!gwangjuMarkupSource || gwangjuMarkupLoading}
                              aria-label="디자인 마크업으로 변환"
                              aria-expanded={gwangjuConvertMenuOpen}
                            >
                              디자인<br />마크업
                            </button>
                            {gwangjuConvertMenuOpen && (
                              <div className="gwangju-convert-menu" role="menu" aria-label="변환 템플릿 선택">
                                {GWANGJU_CONVERT_CATEGORIES.map(cat => {
                                  const variants = ALL_TEMPLATES.filter(t => t.category === cat.key);
                                  const hasVariants = variants.length > 0;
                                  const submenuOpen = gwangjuConvertSubmenuCategory === cat.key;
                                  return (
                                    <div key={cat.key} className="gwangju-convert-menu-row">
                                      <button
                                        type="button"
                                        role="menuitem"
                                        className={`gwangju-convert-menu-item ${submenuOpen ? 'is-active' : ''}`}
                                        disabled={!cat.ready}
                                        aria-expanded={hasVariants ? submenuOpen : undefined}
                                        onClick={() => handleGwangjuConvertCategoryClick(cat)}
                                      >
                                        <span>{cat.label}</span>
                                        {!cat.ready && <span className="gwangju-convert-menu-badge">준비중</span>}
                                        {cat.ready && hasVariants && <span className="gwangju-convert-menu-arrow">›</span>}
                                      </button>
                                      {hasVariants && submenuOpen && (
                                        <div className="gwangju-convert-submenu" role="menu" aria-label={`${cat.label} 타입 선택`}>
                                          {variants.map(tpl => (
                                            <button
                                              key={tpl.id}
                                              type="button"
                                              role="menuitem"
                                              className="gwangju-convert-menu-item"
                                              title={tpl.desc}
                                              onClick={() => applyGwangjuConvertTemplate(tpl)}
                                            >
                                              {tpl.label}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="gwangju-markup-source-head">
                            <div>
                              <h3>페이지 소스</h3>
                              <p>{gwangjuMarkupSelector || '#content / #subPage'}</p>
                            </div>
                            <button
                              type="button"
                              className="gwangju-markup-source-close"
                              onClick={() => closeGwangjuMarkupPanels()}
                              aria-label="소스 패널 닫기"
                            >
                              ×
                            </button>
                          </div>
                          {gwangjuMarkupSourceUrl && (
                            <div className="gwangju-markup-source-url" title={gwangjuMarkupSourceUrl}>
                              {gwangjuMarkupSourceUrl}
                            </div>
                          )}
                          {gwangjuMarkupLoading && (
                            <p className="gwangju-markup-source-status">소스를 가져오고 있습니다.</p>
                          )}
                          {gwangjuMarkupError && (
                            <div className="gwangju-markup-source-error-box">
                              <p className="gwangju-markup-source-error">{gwangjuMarkupError}</p>
                              <button
                                type="button"
                                className="gwangju-markup-retry-btn"
                                onClick={fetchGwangjuMarkupSource}
                                disabled={!activeGwangjuMenuUrl || gwangjuMarkupLoading}
                              >
                                재검색
                              </button>
                            </div>
                          )}
                          {!gwangjuMarkupLoading && !gwangjuMarkupError && (
                            <textarea
                              className="gwangju-markup-source-textarea"
                              value={gwangjuMarkupSource}
                              readOnly
                              placeholder="마크업하기를 누르면 #content 또는 #subPage 소스가 표시됩니다."
                            />
                          )}
                        </div>
                        <div className={`gwangju-convert-panel ${gwangjuConvertPanelOpen ? 'is-open' : ''}`}>
                          <div className="gwangju-convert-panel-head">
                            <div>
                              <h3>광주 소스 변환</h3>
                              <p>변환 결과 영역</p>
                            </div>
                            <div className="gwangju-convert-head-actions">
                              <button
                                type="button"
                                className="gwangju-convert-preview-btn"
                                onClick={() => setGwangjuConvertPreviewOpen(true)}
                                disabled={!gwangjuConvertedSource}
                              >
                                미리보기
                              </button>
                              <button
                                type="button"
                                className={`gwangju-convert-save-btn ${isGwangjuConvertedSaved ? 'is-saved' : ''}`}
                                onClick={saveGwangjuConvertedSource}
                                disabled={!activeGwangjuMenuUrl}
                              >
                                {isGwangjuConvertedSaved ? '✓ 저장됨' : '저장'}
                              </button>
                              <button
                              type="button"
                              className="gwangju-markup-source-close"
                              onClick={closeGwangjuConvertPanel}
                              aria-label="변환 패널 닫기"
                            >
                                ×
                              </button>
                            </div>
                          </div>
                          <textarea
                            className="gwangju-convert-textarea"
                            value={gwangjuConvertedSource}
                            onChange={event => updateGwangjuConvertedSource(event.target.value)}
                            placeholder="내일 변환 소스가 이 영역에 연결됩니다."
                          />
                        </div>
                        {gwangjuConvertPreviewOpen && (
                          <div className="gwangju-convert-preview-dim" role="dialog" aria-modal="true">
                            <div className="gwangju-convert-preview-modal">
                              <div className="gwangju-convert-preview-head">
                                <h3>현재 사이트 vs 변환 결과 비교</h3>
                                <button
                                  type="button"
                                  className="gwangju-markup-source-close"
                                  onClick={() => setGwangjuConvertPreviewOpen(false)}
                                  aria-label="미리보기 닫기"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="gwangju-convert-preview-compare">
                                <div className="gwangju-convert-preview-pane">
                                  <p className="gwangju-convert-preview-pane-label">현재 사이트</p>
                                  {activeGwangjuMenuUrl ? (
                                    <iframe
                                      className="gwangju-convert-preview-frame"
                                      title="현재 사이트"
                                      src={activeGwangjuMenuUrl}
                                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
                                    />
                                  ) : (
                                    <p className="gwangju-url-status">비교할 원본 URL이 없습니다.</p>
                                  )}
                                </div>
                                <div className="gwangju-convert-preview-pane">
                                  <p className="gwangju-convert-preview-pane-label">변환 결과</p>
                                  <iframe
                                    className="gwangju-convert-preview-frame"
                                    title="변환 소스 미리보기"
                                    srcDoc={buildGwangjuPreviewDoc(gwangjuConvertedSource)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {activeGwangjuMenuUrl ? (
                          <div className="gwangju-menu-iframe-wrap">
                            <div className="gwangju-menu-iframe-bar">
                              {(activeGwangjuUrlItem?.siteName || getGwangjuTabLabel(activeGwangjuUrlItem, 0))} - {activeGwangjuMenuUrl}
                            </div>
                            <iframe
                              className="gwangju-menu-iframe"
                              src={activeGwangjuMenuUrl}
                              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
                              title={activeGwangjuMenuLabel || '메뉴 미리보기'}
                            />
                          </div>
                        ) : (
                          <p className="gwangju-url-status">미리보기할 메뉴 URL이 없습니다.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    !activeGwangjuUrlItem?.error && !activeGwangjuUrlItem?.loading && (
                      <p className="gwangju-url-status">크롤링 버튼을 누르면 이 사이트의 메뉴가 표시됩니다.</p>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {projectType === 'chungnam' && (
        <>

        <div className="crawl-mode-tabs">
          <button
            className={`crawl-mode-tab ${mode === 'url' ? 'is-active' : ''}`}
            onClick={() => setMode('url')}
          >
            URL 크롤링
          </button>
          <button
            className={`crawl-mode-tab ${mode === 'source' ? 'is-active' : ''}`}
            onClick={() => setMode('source')}
          >
            소스 직접 입력
          </button>
        </div>

        <div className="markup-history-panel">
          <button
            type="button"
            className="crawl-btn markup-history-toggle"
            onClick={() => setHistoryOpen(prev => !prev)}
          >
            이전 마크업{markupHistory.length > 0 ? ` (${markupHistory.length})` : ''}
          </button>
          {historyOpen && (
            <div className="markup-history-list">
              <div className="markup-history-head">
                <strong>자동 저장된 마크업</strong>
                {markupHistory.length > 0 && (
                  <button type="button" onClick={clearMarkupHistory}>전체 삭제</button>
                )}
              </div>
              {markupHistory.length === 0 ? (
                <p className="markup-history-empty">아직 저장된 마크업이 없습니다.</p>
              ) : (
                markupHistory.map(item => (
                  <div key={item.id} className="markup-history-item">
                    <button
                      type="button"
                      className="markup-history-load"
                      onClick={() => loadMarkupHistoryItem(item)}
                    >
                      <span className="markup-history-title">
                        {item.schoolName ? `${item.schoolName} - ` : ''}{item.title || item.url || '마크업'}
                      </span>
                      <span className="markup-history-meta">
                        {formatHistoryTime(item.savedAt)} · {item.category || 'other'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="markup-history-delete"
                      onClick={() => deleteMarkupHistoryItem(item.id)}
                    >
                      삭제
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ─── URL 크롤링 모드 ─── */}
        {mode === 'url' && <>
        <p className="crawl-desc">학교명과 학교 루트 URL을 줄바꿈으로 입력하면 본문을 자동으로 크롤링하여 마크업을 생성합니다.</p>

        <div className="crawl-form">
            <div className="crawl-url-row">
              <textarea
                ref={tourRefs.urlInput}
                className="crawl-input crawl-input--roots"
                placeholder="학교명 - 학교 루트 URL (줄바꿈으로 여러 개 입력)"
                value={batchRootUrl} onChange={e => setBatchRootUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !extracting) handleExtractUrls();
                }}
                disabled={extracting || batchLoading}
              />
              <button ref={tourRefs.extractBtn} className="crawl-btn crawl-btn--extract" onClick={handleExtractUrls} disabled={extracting || batchLoading || (!batchRootUrl.trim() && schoolRoots.length === 0)}>
                {extracting ? <span className="crawl-spinner" /> : 'URL 추출'}
              </button>
              {urlItems.length === 0 && !batchRootUrl.trim() && !extracting && (
                <button
                  className="crawl-btn crawl-btn--add-url-standalone"
                  onClick={() => setShowAddUrl(true)}
                  disabled={batchLoading}
                >
                  + URL 직접 추가
                </button>
              )}
            </div>
            <div className="crawl-exclude-row">
              <textarea
                className="crawl-input crawl-input--exclude"
                placeholder="크롤링 제외 메뉴 입력 (예: 시설안내, 공공데이터 개방 / 줄바꿈 또는 쉼표로 구분)"
                value={excludeMenuInput}
                onChange={e => setExcludeMenuInput(e.target.value)}
                disabled={extracting || batchLoading}
              />
            </div>
            {extractError && <p className="crawl-error">{extractError}</p>}

            {(urlItems.length > 0 || showAddUrl || extractResults.length > 0) && (
              <>
                {extractResults.length > 0 && (
                  <div className="school-result-tabs-row">
                    <button
                      type="button"
                      className={`school-result-tab${activeSchoolKey === 'all' ? ' is-active' : ''}`}
                      onClick={() => setActiveSchoolKey('all')}
                    >
                      전체
                      <span>{urlItems.length}</span>
                    </button>
                    {extractResults.map(result => (
                      <button
                        key={result.key}
                        type="button"
                        className={`school-result-tab${activeSchoolKey === result.key ? ' is-active' : ''}${result.error ? ' is-error' : ''}`}
                        onClick={() => setActiveSchoolKey(result.key)}
                        title={result.error || result.rootUrl}
                      >
                        {result.siteName}
                        <span>{result.error ? '!' : result.count}</span>
                      </button>
                    ))}
                    {extractResults.some(result => result.error || result.count === 0) && (
                      <button
                        type="button"
                        className="school-result-retry-btn"
                        onClick={handleRetryFailedExtracts}
                        disabled={retryingFailedExtract || extracting || batchLoading}
                      >
                        {retryingFailedExtract ? '재추출 중...' : '추출 안 된 학교 재추출'}
                      </button>
                    )}
                  </div>
                )}
                {urlItems.length > 0 && (
                <div className="crawl-batch-urls-header">
                  <div className="crawl-batch-urls-header-left">
                    <input
                      className="url-site-name-input"
                      type="text"
                      placeholder="학교명을 입력하세요."
                      value={siteName}
                      onChange={e => setSiteName(e.target.value)}
                    />
                  </div>
                  <div className="crawl-batch-urls-header-right">
                    {classifying && (
                      <span className="url-classify-inline">
                        <span className="crawl-spinner crawl-spinner--sm" />
                        {classifyProgress.done} / {classifyProgress.total} 분석 중
                      </span>
                    )}
                    <span className="crawl-result-label">
                      {visibleUrlItems.filter(i => i.checked).length} / {visibleUrlItems.length}개 선택
                    </span>
                    <button
                      className="crawl-btn crawl-btn--add-url"
                      onClick={() => showAddUrl ? closeAddUrlForm() : setShowAddUrl(true)}
                      disabled={batchLoading}
                    >
                      {showAddUrl ? '입력 닫기' : '+ URL 추가'}
                    </button>
                  </div>
                </div>
                )}
                <div className="url-sections-row" ref={tourRefs.urlList}>
                  <div className="url-section-col">
                    <div className="url-section-top">
                      <span className="url-text-section-title">텍스트형 페이지</span>
                      <span className="url-text-section-badge">{regularItems.length}</span>
                    </div>
                    <div className="url-text-section">
                      <div className="url-text-section-header">
                        <label className="crawl-check-all url-section-check-all">
                          <input
                            type="checkbox"
                            checked={regularItems.length > 0 && regularItems.every(i => i.checked)}
                            onChange={toggleAllRegularChecked}
                            disabled={batchLoading || regularItems.length === 0}
                          />
                          <span>전체 선택</span>
                        </label>
                      </div>
                      <div className="url-items-list">
                        {regularItems.length > 0
                          ? regularItems.map((item, i) => renderUrlItemRow(item, i >= regularItems.length - 3, i === 0))
                          : <div className="url-section-empty">텍스트형 페이지가 없습니다.</div>}
                      </div>
                      {typeModalItemId !== null && regularItems.some(i => i.id === typeModalItemId) && (
                        <div className="url-type-modal-overlay" onClick={closeTypeModal}>
                          {renderTypeModal()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="url-shuttle-controls" aria-label="페이지 유형 이동">
                    <button
                      type="button"
                      className="url-shuttle-btn"
                      onClick={() => moveCheckedItemsToContentType('image')}
                      disabled={batchLoading || regularItems.every(i => !i.checked)}
                      title="선택 항목을 이미지형으로 이동"
                    >
                      &gt;
                    </button>
                    <button
                      type="button"
                      className="url-shuttle-btn"
                      onClick={() => moveCheckedItemsToContentType('text')}
                      disabled={batchLoading || imageItems.every(i => !i.checked)}
                      title="선택 항목을 텍스트형으로 이동"
                    >
                      &lt;
                    </button>
                  </div>
                  <div className="url-section-col">
                    <div className="url-section-top">
                      <span className="url-image-section-title">이미지형 페이지</span>
                      <span className="url-image-section-badge">{imageItems.length}</span>
                      <button
                        className="url-export-btn"
                        onClick={() => setShowUrlExportModal(true)}
                        disabled={checkedImageItems.length === 0}
                        title="URL 내보내기"
                      >URL 내보내기</button>
                    </div>
                    <div className="url-image-section">
                      <div className="url-image-section-header">
                        <label className="crawl-check-all url-section-check-all">
                          <input
                            type="checkbox"
                            checked={imageItems.length > 0 && imageItems.every(i => i.checked)}
                            onChange={toggleAllImageChecked}
                            disabled={batchLoading || imageItems.length === 0}
                          />
                          <span>전체 선택</span>
                        </label>
                      </div>
                      <div className="url-items-list">
                        {imageItems.length > 0
                          ? imageItems.map((item, i) => renderUrlItemRow(item, i >= imageItems.length - 3))
                          : <div className="url-section-empty">이미지형 페이지가 없습니다.</div>}
                      </div>
                      {typeModalItemId !== null && imageItems.some(i => i.id === typeModalItemId) && (
                        <div className="url-type-modal-overlay" onClick={closeTypeModal}>
                          {renderTypeModal()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {showAddUrl && (
                  <div className="url-add-form">
                    <input
                      className="url-add-input url-add-input--url"
                      type="text"
                      placeholder="URL 입력 (https://...)"
                      value={addUrlInput}
                      onChange={e => setAddUrlInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddManualUrl(); }}
                      autoFocus
                    />
                    <input
                      className="url-add-input url-add-input--title"
                      type="text"
                      placeholder="페이지 제목 (선택)"
                      value={addTitleInput}
                      onChange={e => setAddTitleInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddManualUrl(); }}
                    />
                    <button
                      className="crawl-btn crawl-btn--extract"
                      onClick={handleAddManualUrl}
                      disabled={!addUrlInput.trim() || !isValidUrl(addUrlInput.trim())}
                    >
                      추가
                    </button>
                    <button
                      className="url-item-remove"
                      onClick={closeAddUrlForm}
                      title="닫기"
                    >✕</button>
                  </div>
                )}
                {urlItems.length > 0 && (
                <button
                  ref={tourRefs.generateBtn}
                  className="crawl-btn crawl-btn--batch"
                  onClick={handleBatchGenerate}
                  disabled={batchLoading || urlItems.every(i => !i.checked)}
                >
                  {batchLoading
                    ? <><span className="crawl-spinner" /> {ocrStatus || `${batchProgress.done} / ${batchProgress.total} 처리 중…`}</>
                    : `마크업 생성 (${urlItems.filter(i => i.checked).length}개)`}
                </button>
                )}
              </>
            )}
          </div>

        {/* ─── 일괄 결과 탭 ─── */}
        {batchResults.length > 0 && (
          <div className="crawl-batch-results">
            <div className="crawl-result-school-tabs" ref={tourRefs.resultTab}>
              {resultSchoolGroups.map(group => {
                const failedCount = group.results.filter(r => r.error || !r.html?.trim()).length;
                return (
                  <button
                    key={group.key}
                    type="button"
                    className={`crawl-result-school-tab ${activeResultSchoolGroup?.key === group.key ? 'is-active' : ''}`}
                    onClick={() => {
                      setActiveResultSchoolKey(group.key);
                      const firstSuccess = group.results.find(r => !r.error && r.html?.trim());
                      setActiveResultIdx(firstSuccess ? firstSuccess.index : 'failed');
                    }}
                  >
                    {group.label}
                    <span>{group.results.length}</span>
                    {failedCount > 0 && <span className="crawl-tab-badge crawl-tab-badge--error">{failedCount}</span>}
                  </button>
                );
              })}
            </div>
            <div className="crawl-batch-tabs-row">
              <div className="crawl-batch-tabs">
              {activeSchoolSuccessResults.map((r) => {
                return (
                  <button
                    key={r.index}
                    className={`crawl-batch-tab ${activeResultIdx === r.index ? 'is-active' : ''}`}
                    onClick={() => setActiveResultIdx(r.index)}
                    title={r.url}
                  >
                    {shortLabel(r.url, r.title)}
                    {batchLoading && r.index === batchProgress.done - 1 && (
                      <span className="crawl-tab-badge">✓</span>
                    )}
                  </button>
                );
              })}
              {activeSchoolFailedResults.length > 0 && (
                <button
                  className={`crawl-batch-tab crawl-batch-tab--failed ${activeResultIdx === 'failed' ? 'is-active' : ''}`}
                  onClick={() => setActiveResultIdx('failed')}
                >
                  미생성 페이지
                  <span className="crawl-tab-badge crawl-tab-badge--error">
                    {activeSchoolFailedResults.length}
                  </span>
                </button>
              )}
              </div>
            </div>
            {activeResultIdx === 'failed' ? (
              <FailedPagesPanel
                failedResults={activeSchoolFailedResults}
                onRegenerate={handleRegenerateFailedPages}
                regenerating={regeneratingFailed}
              />
            ) : batchResults[activeResultIdx] && batchResults[activeResultIdx].html?.trim() && (
              <ResultViewer
                markup={batchResults[activeResultIdx].html}
                templateId={batchResults[activeResultIdx].templateId}
                onMarkupChange={html => {
                  const next = [...batchResults];
                  next[activeResultIdx] = { ...next[activeResultIdx], html };
                  setBatchResults(next);
                }}
              />
            )}
            {!batchLoading && batchResults.some(r => r.html?.trim() && !r.error) && (
              <div className="crawl-download-footer">
                <span className="crawl-download-footer-text">
                  생성된 전체 마크업을 학교별 폴더로 묶어 하나의 ZIP 파일로 다운로드합니다.
                </span>
                <button
                  ref={tourRefs.downloadBtn}
                  className="crawl-btn crawl-btn--download"
                  onClick={handleDownloadZip}
                  disabled={downloading}
                  title="생성된 전체 마크업을 ZIP으로 다운로드"
                >
                  {downloading ? <span className="crawl-spinner" /> : '전체 ZIP 다운로드'}
                </button>
              </div>
            )}
          </div>
        )}
        </>}

        {/* ─── 소스 직접 입력 모드 ─── */}
        {mode === 'source' && (
          <div className="crawl-source-mode">
            <p className="crawl-desc">
              CMS·JavaScript로 동적 로딩되어 크롤링이 안 되는 요소도 아래 방법으로 캡처할 수 있습니다.
            </p>
            <div className="crawl-source-guide">
              <div className="crawl-source-guide-item">
                <strong>방법 1 — 페이지 소스 보기 (서버 렌더링 데이터)</strong>
                <span>브라우저에서 <kbd>Ctrl+U</kbd> → 전체 선택 (<kbd>Ctrl+A</kbd>) → 복사 (<kbd>Ctrl+C</kbd>)</span>
              </div>
              <div className="crawl-source-guide-item">
                <strong>방법 2 — 렌더링된 DOM 복사 (JS 동적 데이터 포함)</strong>
                <span><kbd>F12</kbd> → Elements 탭 → <code>&lt;html&gt;</code> 우클릭 → Copy → Copy outerHTML</span>
              </div>
            </div>
            <textarea
              className="crawl-textarea crawl-textarea--source"
              placeholder="복사한 HTML 소스를 여기에 붙여넣으세요..."
              value={sourceHtml}
              onChange={e => setSourceHtml(e.target.value)}
              spellCheck={false}
            />
            <div className="crawl-source-options">
              <div className="crawl-selector-row">
                <input
                  type="text"
                  className="crawl-input crawl-input--selector"
                  placeholder="CSS 선택자 (선택사항, 예: #content, .sub-content)"
                  value={sourceSelector}
                  onChange={e => setSourceSelector(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !sourceLoading && sourceHtml.trim() && handleSourceMarkup()}
                  disabled={sourceLoading}
                />
                <select
                  className="url-item-select"
                  value={sourceCategory}
                  onChange={e => handleSourceCategoryChange(e.target.value)}
                  disabled={sourceLoading}
                >
                  <option value="greeting">인사말</option>
                  <option value="symbol">상징</option>
                  <option value="history">연혁</option>
                  <option value="footer">푸터메뉴</option>
                  <option value="other">기타</option>
                </select>
                <button
                  className="crawl-btn"
                  onClick={handleSourceMarkup}
                  disabled={!sourceHtml.trim() || sourceLoading}
                >
                  {sourceLoading ? <span className="crawl-spinner" /> : '마크업 생성'}
                </button>
              </div>
              {sourceCategory !== 'other' && sourceCategory !== 'footer' && CATEGORY_TEMPLATES[sourceCategory] && (
                <div className="url-item-type-group">
                  {CATEGORY_TEMPLATES[sourceCategory].map(tpl => (
                    <label key={tpl.id} className="url-item-type-label">
                      <input
                        type="radio"
                        name="source-template"
                        value={tpl.id}
                        checked={sourceTemplateId === tpl.id}
                        onChange={() => setSourceTemplateId(tpl.id)}
                        disabled={sourceLoading}
                      />
                      {tpl.label.replace(/^(인사말|연혁|상징)\s+/, '')}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {sourceResult && (
              <>
                <div className="source-result-actions">
                  <button
                    className="crawl-btn crawl-btn--download"
                    onClick={() => {
                      const categoryLabel = { greeting: '인사말', symbol: '상징', history: '연혁', footer: '푸터메뉴', other: '마크업' }[sourceCategory] || '마크업';
                      const fullHtml = `<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${categoryLabel}</title>\n</head>\n<body>\n${sourceResult}\n</body>\n</html>`;
                      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `${categoryLabel}.html`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }}
                  >
                    다운로드
                  </button>
                </div>
                <ResultViewer
                  markup={sourceResult}
                  onMarkupChange={html => setSourceResult(html)}
                  templateId={null}
                />
              </>
            )}
          </div>
        )}
        </>
        )}
      </div>
      {showUrlExportModal && (
        <div className="url-export-modal-overlay" onClick={() => setShowUrlExportModal(false)}>
          <div className="url-export-modal" onClick={e => e.stopPropagation()}>
            <div className="url-export-modal-header">
              <span className="url-export-modal-title">이미지형 페이지 URL 목록</span>
              <button className="url-export-modal-close" onClick={() => setShowUrlExportModal(false)}>✕</button>
            </div>
            <div className="url-export-modal-body">
              <table className="url-export-table">
                <thead>
                  <tr>
                    <th>페이지명</th>
                    <th>URL</th>
                  </tr>
                </thead>
                <tbody>
                  {checkedImageItems.map(item => (
                    <tr key={item.id}>
                      <td className="url-export-table-title">
                        {item.schoolName ? `${item.schoolName} - ` : ''}{item.title || '(제목 없음)'}
                      </td>
                      <td className="url-export-table-url">{item.url}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="url-export-modal-footer">
              <button
                className="crawl-btn crawl-btn--primary url-export-copy-btn"
                onClick={e => {
                  const btn = e.currentTarget;
                  const text = buildImageUrlExportText(checkedImageItems);
                  navigator.clipboard.writeText(text).then(() => {
                    btn.textContent = '복사됨 ✓';
                    setTimeout(() => { btn.textContent = '복사하기'; }, 2000);
                  });
                }}
              >복사하기</button>
              <button
                className="crawl-btn crawl-btn--download url-export-copy-btn"
                onClick={downloadImageUrlExport}
                disabled={checkedImageItems.length === 0}
              >다운로드</button>
            </div>
          </div>
        </div>
      )}
      {renderTour()}
      <UrlPreviewPanel
        previewOpen={previewOpen}
        previewUrl={previewUrl}
        onClose={closePreview}
      />
    </div>
  );
}
