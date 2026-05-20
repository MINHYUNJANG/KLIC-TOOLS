import { traverseAndClean } from './htmlCleaners';
import { applyNestedClassesHelper, processCellContent, checkTitleMatch, processMsoLists } from './listExtractors';
import { performCleanup } from './htmlCleaners';
import { UL_NONE_VALUE } from './constants';

const processTextContentBase = (containerDOM, config, isColorMode, isColorClassMode) => {
    if (!containerDOM || !config) return;

    const { keepMarker, ulClassName: ulClass, olType, tit1, tit2, tit3, tit1Class, tit2Class, tit3Class, listStartFrom2 } = config;
    const noUl = ulClass === UL_NONE_VALUE;

    processMsoLists(containerDOM);
    processCellContent(containerDOM, keepMarker, true, tit1, tit2, tit3, olType, noUl);
    applyNestedClassesHelper(containerDOM, ulClass, listStartFrom2 ? 1 : 0);
    performCleanup(containerDOM);

    Array.from(containerDOM.children).forEach(child => {
        const tagName = child.tagName.toLowerCase();

        if (tagName === 'h3') { if (tit1Class) child.className = tit1Class; else child.removeAttribute('class'); }
        else if (tagName === 'h4') { if (tit2Class) child.className = tit2Class; else child.removeAttribute('class'); }
        else if (tagName === 'h5') { if (tit3Class) child.className = tit3Class; else child.removeAttribute('class'); }
        else if (tagName === 'p' || tagName === 'div') {
            const rawText = child.textContent.trim();
            const match1 = checkTitleMatch(rawText, tit1);
            const match2 = checkTitleMatch(rawText, tit2);
            const match3 = checkTitleMatch(rawText, tit3);

            const removeTitleMarker = (element, markerStr) => {
                if (keepMarker) return;
                let charsToRemove = markerStr.length;
                const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
                let textNode;
                while (charsToRemove > 0 && (textNode = walker.nextNode())) {
                    const text = textNode.textContent;
                    const spaceMatch = text.match(/^[\s​-‍﻿\xA0]+/);
                    const startIdx = spaceMatch ? spaceMatch[0].length : 0;
                    const textToProcess = text.substring(startIdx);
                    if (textToProcess.length === 0) continue;
                    if (textToProcess.length <= charsToRemove) {
                        textNode.textContent = text.substring(0, startIdx);
                        charsToRemove -= textToProcess.length;
                    } else {
                        textNode.textContent = text.substring(0, startIdx) + textToProcess.substring(charsToRemove);
                        charsToRemove = 0;
                    }
                }
                const trimWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
                let firstText;
                while ((firstText = trimWalker.nextNode())) {
                    if (firstText.textContent.trim() === '') continue;
                    firstText.textContent = firstText.textContent.replace(/^[\s​-‍﻿\xA0]+/, '');
                    break;
                }
            };
            const isPreservedMarker = (markerText) => {
                if (!markerText) return false;
                const safeStr = markerText.replace(/[\s​-‍﻿\xA0]/g, '');
                return /^제\d+[장편조관]/.test(safeStr) || /^([ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]|[IVX]+)\./i.test(safeStr);
            };
            if (match1) {
                const h3 = document.createElement('h3');
                if (tit1Class) h3.className = tit1Class;
                h3.innerHTML = child.innerHTML;
                if (!isPreservedMarker(match1)) removeTitleMarker(h3, match1);
                child.replaceWith(h3);
            } else if (match2) {
                const h4 = document.createElement('h4');
                if (tit2Class) h4.className = tit2Class;
                h4.innerHTML = child.innerHTML;
                if (!isPreservedMarker(match2)) removeTitleMarker(h4, match2);
                child.replaceWith(h4);
            } else if (match3) {
                const h5 = document.createElement('h5');
                if (tit3Class) h5.className = tit3Class;
                h5.innerHTML = child.innerHTML;
                if (!isPreservedMarker(match3)) removeTitleMarker(h5, match3);
                child.replaceWith(h5);
            }
        }
    });

    traverseAndClean(containerDOM, isColorMode, isColorClassMode);
};

export const processTextContentNormal = (containerDOM, config) => {
    processTextContentBase(containerDOM, config, false, false);
};

export const processTextContentColor = (containerDOM, config) => {
    processTextContentBase(containerDOM, config, true, config.isColorClassMode);
};
