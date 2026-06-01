import { MARKER_TYPES, EXCLUDE_MARKER_REGEXES, HWP_CHAR_MAP, HWP_CHAR_REGEX, UL_NONE_VALUE, convertCircleToArabic } from './constants';

export const checkTitleMatch = (text, titConfig) => {
    if (!titConfig) return false;
    const safeText = text.trim();

    if (typeof titConfig === 'string') {
        if (titConfig.trim() !== '' && safeText.startsWith(titConfig.trim())) return titConfig.trim();
        return false;
    }

    const { type, val } = titConfig;
    if (type === 'custom' && val && val.trim() !== '') {
        if (safeText.startsWith(val.trim())) return val.trim();
    }

    let match;
    if (type === 'number-dot' && (match = safeText.match(/^\d{1,2}\./))) return match[0];
    if (type === 'number-paren' && (match = safeText.match(/^\d{1,2}\)/))) return match[0];
    if (type === 'circle' && (match = safeText.match(/^[①-⑳㉑-㉟]/))) return match[0];
    if (type === 'hangul-dot' && (match = safeText.match(/^[가-힣ㄱ-ㅎ]\./))) return match[0];
    if (type === 'hangul-paren' && (match = safeText.match(/^[가-힣ㄱ-ㅎ]\)/))) return match[0];
    if (type === 'law-chapter' && (match = safeText.match(/^제\s*\d+\s*[장편관]/))) return match[0];
    if (type === 'law-article' && (match = safeText.match(/^제\s*\d+\s*조/))) return match[0];
    if (type === 'roman' && (match = safeText.match(/^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]|[IVX]+)\./i))) return match[0];

    return false;
};

export const applyNestedClassesHelper = (cell, baseUlClassName, levelOffset = 0) => {
    if (!cell) return;
    const ulBaseName = (baseUlClassName && baseUlClassName !== UL_NONE_VALUE && baseUlClassName.trim()) ? baseUlClassName.trim() : '';
    const olBaseName = 'order-st';

    const processNode = (node) => {
        const tagName = node.tagName.toLowerCase();
        if (tagName !== 'ul' && tagName !== 'ol') return;
        let level = 1;
        let parent = node.parentElement;
        while (parent && parent !== cell) {
            if (parent.tagName.toLowerCase() === tagName) level++;
            parent = parent.parentElement;
        }
        const baseName = (tagName === 'ul') ? ulBaseName : olBaseName;
        const effectiveLevel = (tagName === 'ul') ? level + levelOffset : level;
        if (baseName) {
            const firstSpace = baseName.indexOf(' ');
            if (firstSpace !== -1) {
                node.className = `${baseName.slice(0, firstSpace)}${effectiveLevel}${baseName.slice(firstSpace)}`;
            } else {
                node.className = `${baseName}${effectiveLevel}`;
            }
        }
        else node.removeAttribute('class');
        Array.from(node.children).forEach(li => {
            if (li.tagName === 'LI') {
                Array.from(li.children).forEach(child => {
                    if (child.tagName === 'UL' || child.tagName === 'OL') processNode(child);
                });
            }
        });
    };
    const rootLists = Array.from(cell.childNodes).filter(n => n.tagName === 'UL' || n.tagName === 'OL');
    rootLists.forEach(list => processNode(list));
};

export const processCellContent = (cell, keepMarker, isOuterText = false, tit1 = null, tit2 = null, tit3 = null, olType = [], noUl = false) => {
    const sanitizeSpecialChars = (text) => {
        if (!text) return text;
        return text.replace(HWP_CHAR_REGEX, (match) => {
            const mapped = HWP_CHAR_MAP[match];
            // 셀 처리 시, •/· 로 매핑되는 HWP 전용 문자는 장식 잔재이므로 삭제
            if (mapped === '•' || mapped === '·') return '';
            return mapped || match;
        });
    };

    const getMarkerInfo = (text) => {
        if (isOuterText && (checkTitleMatch(text, tit1) || checkTitleMatch(text, tit2) || checkTitleMatch(text, tit3))) return null;
        const safeText = sanitizeSpecialChars(text);
        if (EXCLUDE_MARKER_REGEXES.some(regex => regex.test(safeText))) return null;
        for (const type in MARKER_TYPES) {
            const match = safeText.match(MARKER_TYPES[type]);
            if (match) {
                if (!safeText.substring(match[0].length).trim()) continue;
                return { type, regex: MARKER_TYPES[type], char: match[0].trim(), rawMarker: match[0].replace(/[.\s()]/g, '') };
            }
        }
        return null;
    };

    const childNodes = Array.from(cell.childNodes);
    const rootNodes = [];
    const contextStack = [];
    let lastLi = null;
    let lastPara = null;
    let lastBuAtte = null;
    let openParenCount = 0;
    let openBracketCount = 0;

    const flushLastPara = () => {
        if (lastPara) {
            if (lastPara.innerHTML.trim() !== '' || lastPara.children.length > 0) rootNodes.push(lastPara);
            lastPara = null;
        }
    };

    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];
        if (node.nodeType === 3 && !node.textContent.trim()) continue;
        if (node.nodeType === 1 && node.tagName !== 'BR' && !node.textContent.trim() && node.children.length === 0) continue;

        if (node.nodeType === 1 && /^H[1-6]$/i.test(node.tagName)) {
            flushLastPara();
            rootNodes.push(node);
            contextStack.length = 0;
            lastLi = null;
            lastBuAtte = null;
            continue;
        }

        if (node.nodeType === 1 && (node.tagName === 'P' || node.tagName === 'DIV' || node.tagName === 'BR')) {
            openParenCount = 0;
            openBracketCount = 0;
        }

        if (node.nodeType === 3 && node.nodeValue) {
            node.nodeValue = sanitizeSpecialChars(node.nodeValue);
        }

        const rawText = node.textContent || '';
        const cleanTextForBreak = rawText.replace(/[\s​-‍﻿\xA0]/g, '');
        const isTitleMatch = isOuterText && (checkTitleMatch(rawText, tit1) || checkTitleMatch(rawText, tit2) || checkTitleMatch(rawText, tit3));

        if (/^(제\d+[장편조관])/.test(cleanTextForBreak) || isTitleMatch) {
            flushLastPara();
            lastLi = null;
            contextStack.length = 0;
            lastBuAtte = null;
            const p = document.createElement('p');
            if (node.nodeType === 3) p.textContent = node.textContent;
            else Array.from(node.childNodes).forEach(child => p.appendChild(child.cloneNode(true)));
            rootNodes.push(p);
            continue;
        }

        const isInsideParen = openParenCount > 0 || openBracketCount > 0;
        const openP = (rawText.match(/\(/g) || []).length;
        const closeP = (rawText.match(/\)/g) || []).length;
        openParenCount = Math.max(0, openParenCount + openP - closeP);
        const openB = (rawText.match(/\[/g) || []).length;
        const closeB = (rawText.match(/\]/g) || []).length;
        openBracketCount = Math.max(0, openBracketCount + openB - closeB);

        const isBuAtte = cleanTextForBreak.startsWith('※') || cleanTextForBreak.startsWith('*');
        if (isBuAtte && !isInsideParen) {
            flushLastPara();
            const p = document.createElement('p');
            p.className = 'bu_atte';
            if (!keepMarker) {
                if (node.nodeType === 3) {
                    p.textContent = rawText.replace(/^[\s​-‍﻿\xA0※*]+/, '');
                } else {
                    Array.from(node.childNodes).forEach(child => p.appendChild(child.cloneNode(true)));
                    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
                    let textNode;
                    while (textNode = walker.nextNode()) {
                        const val = textNode.textContent;
                        if (!val.replace(/[\s​-‍﻿\xA0]/g, '')) continue;
                        if (/^[\s​-‍﻿\xA0]*[※*]/.test(val)) {
                            textNode.textContent = val.replace(/^[\s​-‍﻿\xA0※*]+/, '');
                        }
                        break;
                    }
                }
            } else {
                if (node.nodeType === 3) p.textContent = node.textContent;
                else Array.from(node.childNodes).forEach(child => p.appendChild(child.cloneNode(true)));
            }
            if (lastLi) {
                if (keepMarker) {
                    const lastC = lastLi.lastChild;
                    if (lastC && !(lastC.nodeType === 1 && (lastC.tagName === 'BR' || lastC.tagName === 'P'))) {
                        lastLi.appendChild(document.createElement('br'));
                    }
                }
                lastLi.appendChild(p);
                lastBuAtte = null;
            } else {
                rootNodes.push(p);
                lastLi = null;
                contextStack.length = 0;
                lastBuAtte = p;
            }
            continue;
        }

        const isBlockElement = (node.nodeType === 1 && (node.tagName === 'P' || node.tagName === 'DIV'));
        const markerInfo = isInsideParen ? null : getMarkerInfo(rawText);
        const startsWithSpace = /^[\s​-‍﻿\xA0]+/.test(rawText);

        if (lastBuAtte && startsWithSpace && !markerInfo && !isInsideParen) {
            flushLastPara();
            lastBuAtte.appendChild(document.createElement('br'));
            if (node.nodeType === 3) {
                lastBuAtte.appendChild(document.createTextNode(rawText.replace(/^[\s​-‍﻿\xA0]+/, '')));
            } else {
                const clone = node.cloneNode(true);
                const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
                let textNode;
                while ((textNode = walker.nextNode())) {
                    if (!textNode.textContent.replace(/[\s​-‍﻿\xA0]/g, '')) continue;
                    textNode.textContent = textNode.textContent.replace(/^[\s​-‍﻿\xA0]+/, '');
                    break;
                }
                Array.from(clone.childNodes).forEach(cn => lastBuAtte.appendChild(cn));
            }
            continue;
        }

        if (node.nodeType === 1 && (node.tagName === 'UL' || node.tagName === 'OL')) {
            flushLastPara();
            if (noUl && node.tagName === 'UL') {
                Array.from(node.children).forEach(liNode => {
                    if (liNode.tagName !== 'LI') return;
                    const p = document.createElement('p');
                    while (liNode.firstChild) p.appendChild(liNode.firstChild);
                    if (p.innerHTML.trim()) rootNodes.push(p);
                });
            } else {
                const newList = document.createElement(node.tagName.toLowerCase());
                Array.from(node.children).forEach(liNode => {
                    if (liNode.tagName !== 'LI') return;
                    const newLi = document.createElement('li');
                    while (liNode.firstChild) newLi.appendChild(liNode.firstChild);
                    newList.appendChild(newLi);
                });
                rootNodes.push(newList);
            }
            contextStack.length = 0;
            lastLi = null;
            lastBuAtte = null;
            continue;
        }

        if (markerInfo) {
            flushLastPara();
            lastBuAtte = null;
            const { type: markerType, regex: markerRegex } = markerInfo;
            const isSelectedOl = Array.isArray(olType) && olType.includes(markerType);
            const targetTagName = isSelectedOl ? 'ol' : 'ul';

            if (noUl && targetTagName === 'ul') {
                const p = document.createElement('p');
                const childrenToMove = isBlockElement ? node.childNodes : [node];
                Array.from(childrenToMove).forEach(cn => p.appendChild(cn));
                if (p.innerHTML.trim()) rootNodes.push(p);
                lastLi = null;
                contextStack.length = 0;
                continue;
            }

            const safeNodeText = sanitizeSpecialChars(rawText);
            const match = safeNodeText.match(markerRegex);
            if (match) {
                let charsToRemove = keepMarker ? 0 : match[0].length;
                if (node.nodeType === 3) {
                    const len = node.textContent.length;
                    if (len <= charsToRemove) { node.textContent = ''; charsToRemove = 0; }
                    else { node.textContent = node.textContent.substring(charsToRemove); charsToRemove = 0; }
                } else {
                    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
                    let textNode;
                    while (charsToRemove > 0 && (textNode = walker.nextNode())) {
                        textNode.textContent = sanitizeSpecialChars(textNode.textContent);
                        const len = textNode.textContent.length;
                        if (len <= charsToRemove) { charsToRemove -= len; textNode.textContent = ''; }
                        else { textNode.textContent = textNode.textContent.substring(charsToRemove); charsToRemove = 0; }
                    }
                }
            }
            const li = document.createElement('li');
            if (!keepMarker) {
                if (targetTagName === 'ol') {
                    const spanNum = document.createElement('span');
                    spanNum.className = 'mrk';
                    const rawChar = markerInfo.rawMarker || markerInfo.char.replace(/\s+/g, '');
                    spanNum.textContent = convertCircleToArabic(rawChar);
                    li.appendChild(spanNum);
                    li.appendChild(document.createTextNode(' '));
                } else {
                    if (markerType !== 'bullet' && markerType !== 'special') {
                        li.appendChild(document.createTextNode(markerInfo.char + ' '));
                    }
                }
            }

            const childrenToMove = isBlockElement ? node.childNodes : [node];
            Array.from(childrenToMove).forEach(cn => li.appendChild(cn));

            let currentContext = contextStack.length > 0 ? contextStack[contextStack.length - 1] : null;
            const isSameLevel = currentContext && currentContext.markerType === markerType && currentContext.ul.tagName.toLowerCase() === targetTagName && (markerType !== 'bullet' || currentContext.markerChar === markerInfo.char);
            if (isSameLevel) {
                currentContext.ul.appendChild(li);
            } else {
                let foundParentIndex = -1;
                for (let j = contextStack.length - 2; j >= 0; j--) {
                    if (contextStack[j].markerType === markerType && contextStack[j].ul.tagName.toLowerCase() === targetTagName && (markerType !== 'bullet' || contextStack[j].markerChar === markerInfo.char)) {
                        foundParentIndex = j; break;
                    }
                }
                if (foundParentIndex !== -1) {
                    while (contextStack.length - 1 > foundParentIndex) contextStack.pop();
                    contextStack[contextStack.length - 1].ul.appendChild(li);
                } else {
                    const newList = document.createElement(targetTagName);
                    newList.appendChild(li);
                    if (lastLi) lastLi.appendChild(newList);
                    else if (currentContext) currentContext.ul.appendChild(newList);
                    else rootNodes.push(newList);
                    contextStack.push({ ul: newList, markerType: markerType, markerChar: markerInfo.char });
                }
            }
            lastLi = li;
        } else {
            if (cleanTextForBreak) lastBuAtte = null;
            if (lastLi) {
                flushLastPara();
                lastLi.appendChild(document.createElement('br'));
                const childrenToMove = isBlockElement ? node.childNodes : [node];
                Array.from(childrenToMove).forEach(cn => lastLi.appendChild(cn));
            } else {
                if (isBlockElement) {
                    flushLastPara();
                    const p = document.createElement('p');
                    while (node.firstChild) p.appendChild(node.firstChild);
                    if (p.innerHTML.trim()) rootNodes.push(p);
                } else {
                    if (!lastPara) lastPara = document.createElement('p');
                    lastPara.appendChild(node);
                }
                contextStack.length = 0;
            }
        }
    }

    flushLastPara();
    cell.innerHTML = '';
    rootNodes.forEach(node => cell.appendChild(node));
};

const MSO_LEVEL_MARKERS = ['• ', '- ', '▶ ', '◆ ', '○ '];
const RE_MSO_MARKED = /^[•\-*※○●■▶◆➢→✔✓☑☐★☆❖⦁·]|\d+[.)]/;
const _isNumberedOrCircle = (char) =>
    /\d/.test(char) || /[IVXivx]/.test(char) || /[①-⓿㉐-㉟㊱-㊿]/.test(char);

export const processMsoLists = (container) => {
    // 테이블 셀 내부의 mso-list:Ignore 스팬은 HWP 서식 잔재이므로 내용째 제거
    container.querySelectorAll('td [style*="mso-list:Ignore"], th [style*="mso-list:Ignore"]').forEach(span => span.remove());

    const elements = Array.from(container.querySelectorAll('[style*="mso-list"]'))
        .filter(el => !el.closest('td') && !el.closest('th'));
    if (elements.length === 0) return;

    const listMap = new Map();
    elements.forEach(el => {
        const styleStr = el.getAttribute('style') || '';
        const m = styleStr.match(/mso-list:\s*l(\w+)\s+level(\d+)/i);
        if (!m) return;
        const [, listId, lvStr] = m;
        const level = parseInt(lvStr, 10);
        const ignoreSpan = el.querySelector('[style*="mso-list:Ignore"]');
        const rawChar = ignoreSpan
            ? ignoreSpan.textContent.replace(HWP_CHAR_REGEX, c => HWP_CHAR_MAP[c] || c).replace(/\s/g, '')
            : '';
        if (!listMap.has(listId)) listMap.set(listId, new Map());
        if (!listMap.get(listId).has(level)) listMap.get(listId).set(level, rawChar);
    });

    const overrideMap = new Map();
    listMap.forEach((levelMap, listId) => {
        const chars = Array.from(levelMap.values()).filter(Boolean);
        const unique = new Set(chars);
        if (unique.size === 1 && !_isNumberedOrCircle(Array.from(unique)[0])) {
            const oMap = new Map();
            levelMap.forEach((_, lvl) => oMap.set(lvl, MSO_LEVEL_MARKERS[(lvl - 1) % MSO_LEVEL_MARKERS.length]));
            overrideMap.set(listId, oMap);
        }
    });

    elements.forEach(el => {
        const styleStr = el.getAttribute('style') || '';
        const m = styleStr.match(/mso-list:\s*l(\w+)\s+level(\d+)/i);
        if (!m) return;
        const [, listId, lvStr] = m;
        const level = parseInt(lvStr, 10);
        const ignoreSpan = el.querySelector('[style*="mso-list:Ignore"]');
        let extractedChar = '';
        if (ignoreSpan) {
            extractedChar = ignoreSpan.textContent
                .replace(HWP_CHAR_REGEX, c => HWP_CHAR_MAP[c] || c)
                .replace(/\s/g, '');
            ignoreSpan.remove();
        }
        let marker;
        if (overrideMap.has(listId)) {
            marker = overrideMap.get(listId).get(level) ?? MSO_LEVEL_MARKERS[(level - 1) % MSO_LEVEL_MARKERS.length];
        } else if (extractedChar) {
            marker = extractedChar + ' ';
        } else {
            marker = MSO_LEVEL_MARKERS[(level - 1) % MSO_LEVEL_MARKERS.length];
        }
        const text = el.textContent.trim();
        if (text && !RE_MSO_MARKED.test(text)) {
            el.insertBefore(document.createTextNode(marker), el.firstChild);
        }
    });

    container.querySelectorAll('[style*="mso-list:Ignore"]').forEach(span => {
        span.replaceWith(...span.childNodes);
    });
};
