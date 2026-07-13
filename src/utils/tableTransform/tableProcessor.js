import { getDOMParser, traverseAndClean, performCleanup } from './htmlCleaners';
import { applyTableSemantics, applyVerticalHeaders } from './tableFormatters';
import { applyNestedClassesHelper, processCellContent, processMsoLists } from './listExtractors';
import { UL_NONE_VALUE, RE_NUMERIC } from './constants';

const processTableOnlyBase = (tableDocHtml, config, colWidths, isColorMode, isColorClassMode) => {
    if (typeof window === 'undefined' || !document || !tableDocHtml) return tableDocHtml || '';

    const parser = getDOMParser();
    const doc = parser.parseFromString(tableDocHtml, 'text/html');
    const tempDiv = document.createElement('div');

    Array.from(doc.body.childNodes).forEach(node => tempDiv.appendChild(node));

    restoreOriginHtml(tempDiv);
    processMsoLists(tempDiv);
    splitParagraphsWithBr(tempDiv);
    traverseAndClean(tempDiv, isColorMode, isColorClassMode);
    applyTableFormats(tempDiv, { ...config, isColorMode, isColorClassMode }, colWidths);
    removeHwpArtifacts(tempDiv);
    return tempDiv.innerHTML;
};

export const processTableOnlyNormal = (tableDocHtml, config, colWidths) => {
    return processTableOnlyBase(tableDocHtml, config, colWidths, false, false);
};

export const processTableOnlyColor = (tableDocHtml, config, colWidths) => {
    return processTableOnlyBase(tableDocHtml, config, colWidths, true, config.tableIsColorClassMode);
};

export const mergeAdjacentTable = (baseTable, nextTable) => {
    if (!baseTable || !nextTable) return false;

    const baseBody = baseTable.tBodies?.[0] || baseTable;
    const nextRows = Array.from(nextTable.rows || []);
    if (!baseBody || nextRows.length === 0) return false;

    nextRows.forEach(row => baseBody.appendChild(row.cloneNode(true)));
    return true;
};

const restoreOriginHtml = (container) => {
    container.querySelectorAll('[data-origin-html]').forEach(el => {
        el.innerHTML = el.getAttribute('data-origin-html');
        el.removeAttribute('data-origin-html');
    });
};

const splitParagraphsWithBr = (container) => {
    const blocks = Array.from(container.querySelectorAll('p'));
    blocks.forEach(block => {
        if (block.querySelector('br')) {
            const tagName = block.tagName.toLowerCase();
            let attrs = '';
            for (let i = 0; i < block.attributes.length; i++) {
                const attr = block.attributes[i];
                attrs += ` ${attr.name}="${attr.value}"`;
            }
            const openTag = `<${tagName}${attrs}>`;
            const closeTag = `</${tagName}>`;
            const newInner = block.innerHTML.replace(/<br\s*\/?>/gi, `${closeTag}${openTag}`);
            const temp = document.createElement('div');
            temp.innerHTML = `${openTag}${newInner}${closeTag}`;
            block.replaceWith(...temp.childNodes);
        }
    });
};

const applyTableFormats = (container, config, colWidths) => {
    const {
        wrapperClassName: wrapperClass,
        tableUlClassName: ulClass,
        tableOlType: olType,
        tableKeepMarker: keepMarker,
        tableType, isWrapDiv, isVerticalHeader, headerRows, headerCols, isColorMode, isColorClassMode, tableListStartFrom2
    } = config;

    const allTables = Array.from(container.querySelectorAll('table')).reverse();
    allTables.forEach(table => {
        if (!table.parentNode) return;

        if (table.parentElement === container) {
            const safeWrapper = document.createElement('div');
            container.insertBefore(safeWrapper, table);
            safeWrapper.appendChild(table);
        }
        const isNested = !!table.parentElement.closest('table');

        let curWClass = wrapperClass;
        let curType = isNested ? 'default' : tableType;
        let curWrapDiv = isWrapDiv;
        let curHeaderRows = headerRows;
        let curHeaderCols = headerCols;
        let curColWidths = colWidths;
        let curIsVertical = isVerticalHeader;

        let searchNode = table;
        if (table.parentElement && table.parentElement.hasAttribute('data-local-config')) {
            searchNode = table.parentElement;
        } else if (table.hasAttribute('data-local-config')) {
            searchNode = table;
        }

        const localCfgStr = searchNode.getAttribute('data-local-config');
        if (localCfgStr) {
            try {
                const lCfg = JSON.parse(localCfgStr);
                curWClass = lCfg.wrapperClassName;
                curType = lCfg.tableType;
                curWrapDiv = lCfg.isWrapDiv;
                curHeaderRows = lCfg.headerRows;
                curHeaderCols = lCfg.headerCols;
                curIsVertical = lCfg.isVerticalHeader;
            } catch(e) {}
        }
        const localCwStr = searchNode.getAttribute('data-local-colwidths');
        if (localCwStr) {
            try {
                const lCw = JSON.parse(localCwStr);
                curColWidths = lCw.map(w => RE_NUMERIC.test(w.trim()) ? w.trim() + '%' : w).join(',');
            } catch(e) {}
        }

        applyTableSemantics(table, curWClass, curType, isNested, curWrapDiv, curHeaderRows, curHeaderCols, curColWidths);

        Array.from(table.rows).forEach(row => {
            Array.from(row.cells).forEach(cell => {
                if (!cell.closest('thead') && (cell.tagName === 'TD' || cell.tagName === 'TH')) {
                    const noUl = ulClass === UL_NONE_VALUE;
                    processCellContent(cell, keepMarker, false, null, null, null, olType, noUl);
                    applyNestedClassesHelper(cell, ulClass, tableListStartFrom2 ? 1 : 0);
                }
                if (!cell.querySelector('table') && !cell.textContent.trim()) cell.innerHTML = '';

                performCleanup(cell);
                traverseAndClean(cell, isColorMode, isColorClassMode);

                const hasUl = (ulClass && ulClass.trim()) ? cell.querySelector(`ul[class*="${ulClass.trim()}"]`) : false;
                const hasOl = cell.querySelector('ol[class*="list_ol"]');
                const hasAtte = cell.querySelector('.bu_atte');

                if (hasUl || hasOl || hasAtte) {
                    cell.classList.remove('ac', 'ar');
                    cell.classList.add('al');
                }
            });
        });
        applyVerticalHeaders(table, curIsVertical);
    });
};

const removeHwpArtifacts = (container) => {
    const hwpArtifacts = container.querySelectorAll('.hwp_editor_board_content');
    hwpArtifacts.forEach(el => el.innerHTML.trim() === '' ? el.remove() : el.replaceWith(...el.childNodes));
};
