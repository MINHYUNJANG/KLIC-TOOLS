import { getDOMParser } from './htmlCleaners';
import { applyColGroupHelper, applyVerticalHeaders } from './tableFormatters';
import { applyNestedClassesHelper } from './listExtractors';
import { RE_NUMERIC } from './constants';

export const updateStylesOnly = (htmlString, config, colWidths) => {
    if (typeof window === 'undefined' || !document || !htmlString) return htmlString || '';

    const {
        wrapperClassName: wrapperClass,
        tableUlClassName: ulClass,
        isWrapDiv = true,
        isVerticalHeader = false
    } = config;

    try {
        const parser = getDOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const tempDiv = document.createElement('div');
        Array.from(doc.body.childNodes).forEach(node => tempDiv.appendChild(node));

        const allTables = Array.from(tempDiv.querySelectorAll('table'));
        allTables.forEach(table => {
            let searchNode = table;
            if (table.parentElement && table.parentElement.hasAttribute('data-local-config')) {
                searchNode = table.parentElement;
            } else if (table.hasAttribute('data-local-config')) {
                searchNode = table;
            }

            let curWClass = wrapperClass;
            let curWrapDiv = isWrapDiv;
            let curColWidths = colWidths;
            let curIsVertical = isVerticalHeader;

            const localCfgStr = searchNode.getAttribute('data-local-config');
            if (localCfgStr) {
                try {
                    const lCfg = JSON.parse(localCfgStr);
                    curWClass = lCfg.wrapperClassName;
                    curWrapDiv = lCfg.isWrapDiv;
                    curIsVertical = lCfg.isVerticalHeader;
                } catch (e) {}
            }
            const localCwStr = searchNode.getAttribute('data-local-colwidths');
            if (localCwStr) {
                try {
                    const lCw = JSON.parse(localCwStr);
                    curColWidths = lCw.map(w => RE_NUMERIC.test(w.trim()) ? w.trim() + '%' : w).join(',');
                } catch (e) {}
            }

            if (curWrapDiv) {
                table.removeAttribute('class');
                const parent = table.parentElement;
                if (parent && parent.tagName.toLowerCase() === 'div' && parent.className !== 'box_st2' && parent !== tempDiv) {
                    if (curWClass) parent.className = curWClass;
                    else parent.removeAttribute('class');
                } else {
                    const wrapperDiv = document.createElement('div');
                    if (curWClass) wrapperDiv.className = curWClass;
                    table.parentNode.insertBefore(wrapperDiv, table);
                    wrapperDiv.appendChild(table);
                }
            } else {
                if (curWClass) table.className = curWClass;
                else table.removeAttribute('class');
                const parent = table.parentElement;
                if (parent && parent.tagName.toLowerCase() === 'div' && parent.className !== 'box_st2' && parent !== tempDiv) {
                    parent.replaceWith(table);
                }
            }
            applyColGroupHelper(table, curColWidths);
            const allCells = table.querySelectorAll('td, th');
            allCells.forEach(cell => applyNestedClassesHelper(cell, ulClass));
            applyVerticalHeaders(table, curIsVertical);
        });

        return tempDiv.innerHTML;
    } catch (e) { return htmlString; }
};
