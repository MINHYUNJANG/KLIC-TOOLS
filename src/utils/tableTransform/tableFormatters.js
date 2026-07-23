import { RE_NUMERIC } from './constants';

export const applyColGroupHelper = (table, colWidths) => {
    const oldColgroup = table.querySelector('colgroup');
    if (oldColgroup) oldColgroup.remove();

    const colGroup = document.createElement('colgroup');
    const widthArray = colWidths ? colWidths.split(',').map(w => w.trim()) : [];

    if (widthArray.length === 1 && widthArray[0] === 'auto-calc') {
        let maxCols = 0;
        Array.from(table.rows).forEach(row => {
            let currentCols = 0;
            Array.from(row.cells).forEach(cell => {
                if (cell.style.display === 'none') return;
                currentCols += parseInt(cell.getAttribute('colspan') || '1', 10);
            });
            if (currentCols > maxCols) maxCols = currentCols;
        });
        if (maxCols > 0) {
            const col = document.createElement('col');
            col.setAttribute('span', maxCols);
            col.style.width = `calc(100% / ${maxCols})`;
            colGroup.appendChild(col);
        }
    } else {
        const hasValidWidth = widthArray.some(w => w !== '');
        if (hasValidWidth) {
            widthArray.forEach(width => {
                const col = document.createElement('col');
                if (width) { col.style.width = RE_NUMERIC.test(width) ? `${width}%` : width; }
                colGroup.appendChild(col);
            });
        }
    }

    if (colGroup.hasChildNodes()) {
        const caption = table.querySelector('caption');
        if (caption) caption.after(colGroup);
        else table.prepend(colGroup);
    }
};

export const applyVerticalHeaders = (table, isVerticalHeader) => {
    table.querySelectorAll('th').forEach(th => {
        const colspan = parseInt(th.getAttribute('colspan') || '1', 10);
        if (colspan > 1) return;

        if (isVerticalHeader) {
            if (!th.hasAttribute('data-origin-html')) th.setAttribute('data-origin-html', th.innerHTML);
            th.innerHTML = th.getAttribute('data-origin-html');
            th.querySelectorAll('br').forEach(br => br.remove());
            const walker = document.createTreeWalker(th, NodeFilter.SHOW_TEXT, null, false);
            const textNodes = [];
            let n;
            while (n = walker.nextNode()) {
                if (n.nodeValue.replace(/\s+/g, '').length > 0) textNodes.push(n);
            }
            for (let i = 0; i < textNodes.length; i++) {
                const txtNode = textNodes[i];
                const chars = txtNode.nodeValue.replace(/\s+/g, '').split('');
                const frag = document.createDocumentFragment();
                chars.forEach((char, idx) => {
                    frag.appendChild(document.createTextNode(char));
                    if (idx < chars.length - 1 || i < textNodes.length - 1) {
                        frag.appendChild(document.createElement('br'));
                    }
                });
                txtNode.replaceWith(frag);
            }
        } else {
            if (th.hasAttribute('data-origin-html')) {
                th.innerHTML = th.getAttribute('data-origin-html');
                th.removeAttribute('data-origin-html');
            } else {
                th.querySelectorAll('br').forEach(br => br.remove());
            }
        }
    });
};

const getMaxColumnCount = (table) => {
    return Array.from(table.rows).reduce((max, row) => {
        const count = Array.from(row.cells).reduce((sum, cell) => {
            return sum + parseInt(cell.getAttribute('colspan') || '1', 10);
        }, 0);
        return Math.max(max, count);
    }, 0);
};

const shouldUseWideScroll = (table) => {
    const maxCols = getMaxColumnCount(table);
    if (maxCols >= 8) return true;

    const headerTextLength = Array.from(table.querySelectorAll('thead th, tr:first-child th, tr:first-child td'))
        .reduce((sum, cell) => sum + cell.textContent.replace(/\s+/g, '').length, 0);
    return maxCols >= 6 && headerTextLength >= 36;
};

const applyWideScrollClass = (table) => {
    const parent = table.parentElement;
    if (!parent || parent.tagName.toLowerCase() !== 'div') return;
    const isInner = /\btbl-scroll-inner\b/.test(parent.className || '');
    const outer = isInner ? parent.parentElement : parent;
    if (!outer || outer.tagName.toLowerCase() !== 'div' || !/\btbl-st\b/.test(outer.className || '')) return;

    if (!shouldUseWideScroll(table)) {
        outer.classList.remove('scroll-w');
        if (isInner) {
            outer.insertBefore(table, parent);
            parent.remove();
        }
        return;
    }
    outer.classList.add('scroll-w');
    if (!isInner) {
        const inner = document.createElement('div');
        inner.className = 'tbl-scroll-inner';
        outer.insertBefore(inner, table);
        inner.appendChild(table);
    }
};

export const applyTableSemantics = (table, wClass, type, isNested, isWrapDiv, headerRows, headerCols, colWidths) => {
    // 이전 변환에서 생긴 tbl-scroll-inner 래핑이 있으면, 재변환 시 클래스가 잘못된
    // div(안쪽 tbl-scroll-inner)에 적용되지 않도록 먼저 원래의 단일 래퍼 상태로 되돌린다.
    // (가로 스크롤 필요 여부는 이 함수 끝의 applyWideScrollClass가 다시 계산해 붙인다.)
    const scrollInnerParent = table.parentElement;
    if (scrollInnerParent && scrollInnerParent.tagName.toLowerCase() === 'div' && /\btbl-scroll-inner\b/.test(scrollInnerParent.className || '')) {
        const outerWrapper = scrollInnerParent.parentElement;
        outerWrapper.insertBefore(table, scrollInnerParent);
        scrollInnerParent.remove();
    }

    if (isWrapDiv) {
        table.removeAttribute('class');
        const parent = table.parentElement;
        if (parent && parent.tagName.toLowerCase() === 'div' && parent.className !== 'box_st2') {
            if (wClass) parent.className = wClass;
            else parent.removeAttribute('class');
        } else {
            const wrapperDiv = document.createElement('div');
            if (wClass) wrapperDiv.className = wClass;
            table.parentNode.insertBefore(wrapperDiv, table);
            wrapperDiv.appendChild(table);
        }
    } else {
        if (wClass) table.className = wClass;
        else table.removeAttribute('class');
        const parent = table.parentElement;
        if (parent && parent.tagName.toLowerCase() === 'div' && parent.className !== 'box_st2') {
            parent.replaceWith(table);
        }
    }

    const newThead = document.createElement('thead');
    const newTbody = document.createElement('tbody');
    const allRows = Array.from(table.rows);

    if (type === 'row') {
        const grid = [];
        allRows.forEach((row, rowIndex) => {
            grid[rowIndex] = grid[rowIndex] || [];
            let colIndex = 0;
            Array.from(row.cells).forEach(cell => {
                while (grid[rowIndex][colIndex]) colIndex++;
                const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
                const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
                for (let r = 0; r < rowspan; r++) {
                    for (let c = 0; c < colspan; c++) {
                        if (!grid[rowIndex + r]) grid[rowIndex + r] = [];
                        grid[rowIndex + r][colIndex + c] = true;
                    }
                }
                cell._logicalCol = colIndex;
                colIndex += colspan;
            });
        });

        let currentHeaderCols = isNested ? 1 : parseInt(headerCols, 10);
        if (isNaN(currentHeaderCols) || currentHeaderCols < 0) currentHeaderCols = 1;

        let finalLeftHeaderCols = 0;
        if (currentHeaderCols > 0) {
            let currentColIndex = 0;
            for (let step = 0; step < currentHeaderCols; step++) {
                let maxSpan = 1;
                let foundCell = false;
                allRows.forEach(row => {
                    Array.from(row.cells).forEach(cell => {
                        if (cell._logicalCol === currentColIndex) {
                            foundCell = true;
                            const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
                            if (colspan > maxSpan) maxSpan = colspan;
                        }
                    });
                });
                if (!foundCell) break;
                currentColIndex += maxSpan;
            }
            finalLeftHeaderCols = currentColIndex;
        }

        allRows.forEach((row) => {
            const cells = Array.from(row.cells);
            cells.forEach((cell) => {
                if (cell._logicalCol < finalLeftHeaderCols) {
                    if (cell.tagName.toLowerCase() === 'td') {
                        const th = document.createElement('th');
                        th.setAttribute('scope', 'row');
                        while (cell.firstChild) th.appendChild(cell.firstChild);
                        for (const attr of cell.attributes) th.setAttribute(attr.name, attr.value);
                        cell.replaceWith(th);
                    } else {
                        cell.setAttribute('scope', 'row');
                    }
                } else {
                    if (cell.tagName.toLowerCase() === 'th') {
                        const td = document.createElement('td');
                        while (cell.firstChild) td.appendChild(cell.firstChild);
                        for (const attr of cell.attributes) {
                            if (attr.name.toLowerCase() !== 'scope') td.setAttribute(attr.name, attr.value);
                        }
                        cell.replaceWith(td);
                    } else {
                        cell.removeAttribute('scope');
                    }
                }
                delete cell._logicalCol;
            });
            newTbody.appendChild(row);
        });
    } else {
        let currentHeaderRows = isNested ? 1 : parseInt(headerRows, 10);
        if (isNaN(currentHeaderRows) || currentHeaderRows < 0) currentHeaderRows = 1;

        let finalHeaderRowCount = 0;
        if (currentHeaderRows > 0) {
            let currentRowIndex = 0;
            for (let step = 0; step < currentHeaderRows; step++) {
                if (currentRowIndex >= allRows.length) break;
                let maxSpan = 1;
                if (allRows[currentRowIndex]) {
                    maxSpan = Math.max(...Array.from(allRows[currentRowIndex].cells).map(c => parseInt(c.getAttribute('rowspan')) || 1));
                }
                currentRowIndex += maxSpan;
            }
            finalHeaderRowCount = Math.min(currentRowIndex, allRows.length);
        }

        allRows.forEach((row, index) => {
            const target = index < finalHeaderRowCount ? newThead : newTbody;
            Array.from(row.cells).forEach(cell => {
                if (index < finalHeaderRowCount) {
                    if (cell.tagName.toLowerCase() === 'td') {
                        const th = document.createElement('th');
                        th.setAttribute('scope', 'col');
                        while (cell.firstChild) th.appendChild(cell.firstChild);
                        for (const attr of cell.attributes) th.setAttribute(attr.name, attr.value);
                        cell.replaceWith(th);
                    } else {
                        cell.setAttribute('scope', 'col');
                    }
                } else {
                    if (cell.tagName.toLowerCase() === 'th') {
                        const td = document.createElement('td');
                        while (cell.firstChild) td.appendChild(cell.firstChild);
                        for (const attr of cell.attributes) {
                            if (attr.name.toLowerCase() !== 'scope') td.setAttribute(attr.name, attr.value);
                        }
                        cell.replaceWith(td);
                    } else {
                        cell.removeAttribute('scope');
                    }
                }
            });
            target.appendChild(row);
        });
    }

    const existingCaption = table.querySelector('caption');
    if (existingCaption) {
        existingCaption.innerHTML = existingCaption.innerHTML
            .replace(/&nbsp;/gi, ' ')
            .replace(/ /g, ' ');
    }
    table.innerHTML = '';
    if (existingCaption) table.appendChild(existingCaption);
    else {
        if (newThead.hasChildNodes() || type === 'row') {
            const headers = type === 'row' ? newTbody.querySelectorAll('th') : newThead.querySelectorAll('th');
            const headerTexts = Array.from(headers).map(th => th.textContent.replace(/ /g, ' ').trim()).filter(Boolean);
            if (headerTexts.length > 0) {
                const caption = document.createElement('caption');
                caption.textContent = `${headerTexts.join(', ')}의 정보를 포함한 표입니다.`;
                table.appendChild(caption);
            }
        }
    }

    if (newThead.hasChildNodes()) table.appendChild(newThead);
    table.appendChild(newTbody);
    applyColGroupHelper(table, colWidths);
    applyWideScrollClass(table);
};
