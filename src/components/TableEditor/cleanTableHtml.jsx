import { getDOMParser } from './utils/htmlCleaners';
import { processTextContentNormal, processTextContentColor } from './utils/textProcessor';
import { processTableOnlyNormal, processTableOnlyColor } from './utils/tableProcessor';
import { convertCircleToArabic, MARKER_TYPES, EXCLUDE_MARKER_REGEXES, RE_WHITESPACE } from './utils/constants';

export { updateStylesOnly } from './utils/styleUpdater';

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<]+|[a-zA-Z0-9.-]+\.(?:com|net|org|kr|io|info|biz|co|go|or|ac|re)(?:\/[^\s<]*)?/ig;

const _processLinks = (container) => {
    container.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href') || '';
        const text = a.textContent.trim();
        if (text === '' && a.querySelectorAll('img, table, iframe').length === 0) { a.remove(); return; }
        if (!href || href.startsWith('file://') || href.startsWith('#') || href.trim() === '') { a.replaceWith(...a.childNodes); return; }
        a.classList.add('bu_link');
        if (!a.hasAttribute('target')) a.setAttribute('target', '_blank');
    });

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    const textNodesToLink = [];
    let textNode;
    while ((textNode = walker.nextNode())) {
        if (textNode.parentNode?.closest && !textNode.parentNode.closest('a')) {
            textNodesToLink.push(textNode);
        }
    }
    textNodesToLink.forEach(node => {
        const text = node.nodeValue;
        URL_REGEX.lastIndex = 0;
        if (!URL_REGEX.test(text)) return;
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        URL_REGEX.lastIndex = 0;
        let match;
        while ((match = URL_REGEX.exec(text)) !== null) {
            let rawUrl = match[0];
            const trailingPunctuation = rawUrl.match(/[.,:;"')\]]+$/);
            const actualUrl = trailingPunctuation ? rawUrl.slice(0, -trailingPunctuation[0].length) : rawUrl;
            const matchEndIndex = match.index + actualUrl.length;
            if (match.index > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            const a = document.createElement('a');
            a.href = /^https?:\/\//i.test(actualUrl) ? actualUrl : `http://${actualUrl}`;
            a.className = 'bu_link';
            a.target = '_blank';
            a.textContent = actualUrl;
            fragment.appendChild(a);
            lastIndex = matchEndIndex;
            if (trailingPunctuation) URL_REGEX.lastIndex = matchEndIndex;
        }
        if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        node.parentNode.replaceChild(fragment, node);
    });
};

const _detectMarkerType = (text) => {
    const s = (text || '').trim();
    if (!s) return null;
    if (EXCLUDE_MARKER_REGEXES.some(r => r.test(s))) return null;
    for (const type in MARKER_TYPES) {
        const m = s.match(MARKER_TYPES[type]);
        if (m && s.substring(m[0].length).trim()) return type;
    }
    return null;
};

const _getDeepestOpenList = (listEl) => {
    let cur = listEl;
    while (true) {
        const lis = Array.from(cur.children).filter(c => c.tagName === 'LI');
        if (!lis.length) break;
        const nested = Array.from(lis[lis.length - 1].children).filter(c => c.tagName === 'UL' || c.tagName === 'OL');
        if (!nested.length) break;
        cur = nested[nested.length - 1];
    }
    return cur;
};

const _findAncestorListByMarker = (startList, rootList, markerType) => {
    let el = startList.parentElement;
    while (el && el !== rootList) {
        if (el.tagName === 'LI') {
            const parent = el.parentElement;
            if (!parent || (parent.tagName !== 'UL' && parent.tagName !== 'OL')) break;
            const firstLi = Array.from(parent.children).find(c => c.tagName === 'LI');
            if (firstLi && _detectMarkerType(firstLi.textContent) === markerType) return parent;
            el = parent.parentElement;
        } else {
            el = el.parentElement;
        }
    }
    return null;
};

export const cleanTableHtml = (htmlString, config, colWidths = '') => {
    if (typeof window === 'undefined' || !document || !htmlString) return htmlString || '';

    const processText = config.isColorMode ? processTextContentColor : processTextContentNormal;
    const processTable = config.tableIsColorMode ? processTableOnlyColor : processTableOnlyNormal;

    const parser = getDOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const resultWrapper = document.createElement('div');
    let currentTextGroup = document.createElement('div');
    let currentTableGroup = document.createElement('div');

    const flushTextGroup = () => {
        if (currentTextGroup.childNodes.length > 0) {
            processText(currentTextGroup, config);
            while (currentTextGroup.firstChild) {
                resultWrapper.appendChild(currentTextGroup.firstChild);
            }
        }
    };

    const flushTableGroup = () => {
        if (currentTableGroup.childNodes.length > 0) {
            const tableConfigs = Array.from(currentTableGroup.children).map(el => ({
                lCfg: el.getAttribute('data-local-config'),
                lCw: el.getAttribute('data-local-colwidths'),
            }));

            const cleanedTableStr = processTable(currentTableGroup.innerHTML, config, colWidths);

            const tempParser = parser.parseFromString(cleanedTableStr, 'text/html');
            const outputChildren = Array.from(tempParser.body.children);

            outputChildren.forEach((child, i) => {
                const cfg = tableConfigs[i];
                if (cfg && cfg.lCfg) {
                    child.setAttribute('data-local-config', cfg.lCfg);
                    if (cfg.lCw) child.setAttribute('data-local-colwidths', cfg.lCw);
                }
            });

            Array.from(tempParser.body.childNodes).forEach(child => {
                resultWrapper.appendChild(child);
            });
            currentTableGroup.innerHTML = '';
        }
    };

    const isMeaninglessNode = (n) => {
        const isEmpty = (t) => t.replace(RE_WHITESPACE, "") === "";
        if (n.nodeType === 3 && isEmpty(n.textContent)) return true;
        if (n.nodeType === 1) {
            if (n.tagName === 'BR') return true;
            if ((n.tagName === 'P' || n.tagName === 'DIV' || n.tagName === 'SPAN') && isEmpty(n.textContent) && n.querySelectorAll('img, iframe, table').length === 0) return true;
        }
        return false;
    };

    Array.from(doc.body.childNodes).forEach(node => {
        if (node.nodeType === 1 && (node.tagName === 'TABLE' || node.querySelector('table'))) {
            flushTextGroup();

            const tableEl = node.tagName === 'TABLE' ? node : node.querySelector('table');
            const isSimpleWrapper = node.tagName === 'TABLE' ||
                tableEl.parentElement === node ||
                (tableEl.parentElement?.tagName === 'DIV' && tableEl.parentElement?.parentElement === node);

            if (!isSimpleWrapper) {
                currentTableGroup.appendChild(node.cloneNode(true));
                return;
            }

            const lCfgFromNode = node.getAttribute?.('data-local-config') || null;
            const lCwFromNode = node.getAttribute?.('data-local-colwidths') || null;
            const tableParent = node.tagName === 'TABLE' ? null : tableEl.parentElement;
            const tablesToProcess = tableParent
                ? Array.from(tableParent.children).filter(c => c.tagName === 'TABLE')
                : [tableEl];

            tablesToProcess.forEach(t => {
                const lCfg = lCfgFromNode || t.getAttribute('data-local-config');
                const lCw = lCwFromNode || t.getAttribute('data-local-colwidths');
                const tdCount = t.querySelectorAll('td, th').length;

                if (tdCount <= 1) {
                    flushTableGroup();
                    const boxDiv = document.createElement('div');
                    boxDiv.className = 'box_st2';
                    const cell = t.querySelector('td, th');
                    if (cell) { while (cell.firstChild) boxDiv.appendChild(cell.firstChild); }
                    else { boxDiv.innerHTML = t.innerHTML; }
                    processText(boxDiv, config);
                    resultWrapper.appendChild(boxDiv);
                } else {
                    const clonedTable = t.cloneNode(true);
                    if (lCfg) clonedTable.setAttribute('data-local-config', lCfg);
                    if (lCw) clonedTable.setAttribute('data-local-colwidths', lCw);
                    currentTableGroup.appendChild(clonedTable);
                }
            });
        } else {
            if (isMeaninglessNode(node) && currentTableGroup.childNodes.length > 0) return;
            flushTableGroup();

            if (node.nodeType === 1 && node.classList?.contains('box_st2')) {
                flushTextGroup();
                resultWrapper.appendChild(node.cloneNode(true));
                return;
            }
            currentTextGroup.appendChild(node.cloneNode(true));
        }
    });

    flushTextGroup();
    flushTableGroup();

    (() => {
        let changed = true;
        while (changed) {
            changed = false;
            const children = Array.from(resultWrapper.children);
            for (let i = 0; i < children.length; i++) {
                const listA = children[i];
                if (listA.tagName !== 'OL' && listA.tagName !== 'UL') continue;

                let tableIdx = -1;
                for (let j = i + 1; j < children.length; j++) {
                    const el = children[j];
                    if (el.tagName === 'TABLE' || (el.nodeType === 1 && el.querySelector && el.querySelector('table'))) {
                        tableIdx = j; break;
                    }
                    if (el.textContent.replace(RE_WHITESPACE, '') !== '') break;
                }
                if (tableIdx === -1) continue;

                const tableEl = children[tableIdx];
                const deepestList = _getDeepestOpenList(listA);
                const deepLis = Array.from(deepestList.children).filter(c => c.tagName === 'LI');
                const lastLi = deepLis[deepLis.length - 1];
                if (!lastLi) continue;

                lastLi.appendChild(tableEl);

                const updated = Array.from(resultWrapper.children);
                const afterEl = updated[tableIdx];
                if (afterEl && (afterEl.tagName === 'OL' || afterEl.tagName === 'UL')) {
                    const firstLiOfB = Array.from(afterEl.children).find(c => c.tagName === 'LI');
                    const bMarker = _detectMarkerType((firstLiOfB || {}).textContent || '');
                    const deepLastMarker = _detectMarkerType((deepLis[deepLis.length - 1] || {}).textContent || '');

                    let target = null;
                    if (bMarker && bMarker === deepLastMarker) {
                        target = deepestList;
                    } else if (bMarker) {
                        target = _findAncestorListByMarker(deepestList, listA, bMarker);
                    }
                    if (!target) target = listA;

                    Array.from(afterEl.children).forEach(li => target.appendChild(li));
                    afterEl.remove();
                }

                changed = true;
                break;
            }
        }
    })();

    resultWrapper.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6').forEach(el => {
        const text = el.textContent.replace(RE_WHITESPACE, '').trim();
        if (text === '' && el.querySelectorAll('img, table, iframe').length === 0) el.remove();
    });

    _processLinks(resultWrapper);

    resultWrapper.querySelectorAll('ul, ol').forEach(list => {
        let prev = list.previousSibling;
        while (prev) {
            if (prev.nodeType === 3 && prev.textContent.replace(RE_WHITESPACE, '') === '') {
                const toRemove = prev; prev = prev.previousSibling; toRemove.remove();
            } else if (prev.nodeType === 1 && prev.tagName === 'BR') {
                const toRemove = prev; prev = prev.previousSibling; toRemove.remove();
            } else { break; }
        }
    });

    resultWrapper.querySelectorAll('li').forEach(li => {
        let last = li.lastChild;
        while (last) {
            if (last.nodeType === 3 && last.textContent.replace(RE_WHITESPACE, '') === '') {
                const toRemove = last; last = last.previousSibling; toRemove.remove();
            } else if (last.nodeType === 1 && last.tagName === 'BR') {
                const toRemove = last; last = last.previousSibling; toRemove.remove();
            } else { break; }
        }
    });

    resultWrapper.querySelectorAll('td, th').forEach(cell => {
        const text = cell.textContent.replace(RE_WHITESPACE, '');
        if (text === '' && cell.querySelectorAll('img, iframe, table').length === 0) cell.innerHTML = '';
    });

    const lastChild = resultWrapper.lastElementChild;
    if (lastChild && lastChild.tagName === 'P' && lastChild.innerHTML.replace(/\s/g, '') === '<br>') lastChild.remove();

    resultWrapper.querySelectorAll('ol li span.num').forEach(span => {
        const original = span.textContent.trim();
        const converted = convertCircleToArabic(original);
        if (converted !== original) span.textContent = converted;
    });

    return resultWrapper.innerHTML;
};
