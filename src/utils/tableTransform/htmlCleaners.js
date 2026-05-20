import { ALLOWED_TAGS, ALLOWED_ATTRIBUTES, CLEANUP_REGEX } from './constants';
import { mapColorToClass } from './colorUtils';

let sharedDOMParser = null;
export const getDOMParser = () => {
    if (typeof window === 'undefined') return null;
    if (!sharedDOMParser) sharedDOMParser = new DOMParser();
    return sharedDOMParser;
};

export const traverseAndClean = (element, isColorMode, isColorClassMode = true) => {
    for (let i = element.childNodes.length - 1; i >= 0; i--) {
        const node = element.childNodes[i];
        if (node.nodeType === 8) { node.remove(); continue; }
        if (node.nodeType === 3) {
            const parentTag = element.tagName ? element.tagName.toLowerCase() : '';
            if (parentTag !== 'a') {
                const EMAIL_RE = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
                const text = node.textContent;
                if (EMAIL_RE.test(text)) {
                    EMAIL_RE.lastIndex = 0;
                    const frag = document.createDocumentFragment();
                    let last = 0, m;
                    while ((m = EMAIL_RE.exec(text)) !== null) {
                        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
                        const a = document.createElement('a');
                        a.href = `mailto:${m[1]}`;
                        a.className = 'bu_mail';
                        a.textContent = m[1];
                        frag.appendChild(a);
                        last = m.index + m[0].length;
                    }
                    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
                    node.replaceWith(frag);
                }
            }
            continue;
        }
        if (node.nodeType === 1) traverseAndClean(node, isColorMode, isColorClassMode);
    }

    if (element.nodeType !== 1) return;
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'font') {
        const color = element.getAttribute('color');
        const face = element.getAttribute('face');
        const span = document.createElement('span');
        if (color) span.style.color = color;
        if (face) span.style.fontFamily = face;
        while (element.firstChild) span.appendChild(element.firstChild);
        element.replaceWith(span);
        traverseAndClean(span, isColorMode, isColorClassMode);
        return;
    }

    if (['v', 'w', 'o'].includes(tagName.split(':')[0])) { element.remove(); return; }

    const isHeading = /^h[1-6]$/.test(tagName);
    const isLink = tagName === 'a';

    if (!ALLOWED_TAGS.has(tagName) && !isHeading && !isLink) {
        element.replaceWith(...element.childNodes);
        return;
    }

    if (tagName === 'table') element.removeAttribute('class');
    if (isLink) {
        const href = element.getAttribute('href') || '';
        if (!href || href.startsWith('file://') || href.startsWith('#') || href.trim() === '') {
            element.replaceWith(...element.childNodes);
            return;
        }
        element.classList.add('bu_link');
    }

    const attributes = Array.from(element.attributes);
    attributes.forEach(attr => {
        const attrName = attr.name.toLowerCase();

        if (isLink && (attrName === 'href' || attrName === 'target' || attrName === 'title')) return;
        if (attrName === 'data-local-config' || attrName === 'data-local-colwidths') return;

        if (attrName === 'bgcolor' && !element.style.backgroundColor) element.style.backgroundColor = attr.value;
        if (attrName === 'align' && !element.style.textAlign) element.style.textAlign = attr.value;
        if (attrName === 'valign' && !element.style.verticalAlign) element.style.verticalAlign = attr.value;

        if (!ALLOWED_ATTRIBUTES.has(attrName)) { element.removeAttribute(attrName); return; }

        if (attrName === 'class') {
            const currentClasses = element.getAttribute('class').split(/\s+/);
            const cleanClasses = currentClasses.filter(cls => !/^xl\d+$/.test(cls) && !/^oa\d+$/.test(cls) && !/^\d+$/.test(cls));
            if (cleanClasses.length > 0) element.setAttribute('class', cleanClasses.join(' '));
            else element.removeAttribute('class');
        }
    });

    if (element.hasAttribute('style')) {
        const originalColor = element.style.color;
        const originalBg = element.style.backgroundColor || element.style.background;
        const originalTextAlign = element.style.textAlign;

        element.style.cssText = '';
        element.removeAttribute('style');

        let fallbackStyle = '';

        if (isColorMode) {
            if (originalColor) {
                if (isColorClassMode) {
                    const colorClass = mapColorToClass(originalColor, 'pc_');
                    if (colorClass) element.classList.add(colorClass);
                    else fallbackStyle += `color: ${originalColor}; `;
                } else {
                    fallbackStyle += `color: ${originalColor}; `;
                }
            }
            if (originalBg) {
                fallbackStyle += `background-color: ${originalBg}; `;
            }
        }

        if (originalTextAlign && (tagName === 'td' || tagName === 'th')) {
            const alignMap = { 'left': 'al', 'right': 'ar', 'center': '', 'justify': 'al' };
            const alignClass = alignMap[originalTextAlign.toLowerCase()];
            element.classList.remove('al', 'ac', 'ar');
            if (alignClass) element.classList.add(alignClass);
        }

        if (fallbackStyle.trim()) {
            element.setAttribute('style', fallbackStyle.trim());
        }
    }

    if (tagName === 'span' && !element.hasAttribute('class') && !element.hasAttribute('style')) {
        element.replaceWith(...element.childNodes);
    }
};

export const performCleanup = (container) => {
    if (container.tagName === 'TD' || container.tagName === 'TH') {
        const pList = Array.from(container.querySelectorAll('p')).filter(p => !p.classList.contains('bu_atte'));
        if (pList.length > 0) {
            pList.forEach((p, idx) => { if (idx < pList.length - 1) p.after(document.createElement('br')); });
            pList.forEach(p => p.replaceWith(...p.childNodes));
        }
    }

    ['b', 'i', 'u', 'strong', 'em'].forEach(tag => {
        Array.from(container.querySelectorAll(tag)).forEach(node => {
            if (node.parentNode && node.parentNode.tagName && node.parentNode.tagName.toLowerCase() === tag) {
                while (node.firstChild) node.parentNode.insertBefore(node.firstChild, node);
                node.remove();
            }
        });
    });

    const tagsToMerge = ['span', 'b', 'i', 'u', 'strong', 'em'];
    tagsToMerge.forEach(tagName => {
        const elements = Array.from(container.querySelectorAll(tagName));
        elements.forEach(el => {
            if (!el.parentNode) return;
            if (tagName === 'span' && el.classList.contains('num')) return;

            const elClass = el.getAttribute('class') || '';
            const elStyle = el.getAttribute('style') || '';

            if (tagName === 'span' && !elClass && !elStyle) return;

            let next = el.nextSibling;
            while (next) {
                if (next.nodeType === 3 && /^\s*$/.test(next.textContent)) {
                    let nextNext = next.nextSibling;
                    if (nextNext && nextNext.nodeType === 1 && nextNext.tagName.toLowerCase() === tagName) {
                        const nnClass = nextNext.getAttribute('class') || '';
                        const nnStyle = nextNext.getAttribute('style') || '';
                        if (elClass === nnClass && elStyle === nnStyle) {
                            el.appendChild(next);
                            while (nextNext.firstChild) el.appendChild(nextNext.firstChild);
                            const toRemove = nextNext;
                            next = nextNext.nextSibling;
                            toRemove.remove();
                        } else { break; }
                    } else { break; }
                } else if (next.nodeType === 1 && next.tagName.toLowerCase() === tagName) {
                    const nClass = next.getAttribute('class') || '';
                    const nStyle = next.getAttribute('style') || '';
                    if (elClass === nClass && elStyle === nStyle) {
                        while (next.firstChild) el.appendChild(next.firstChild);
                        const toRemove = next;
                        next = next.nextSibling;
                        toRemove.remove();
                    } else { break; }
                } else { break; }
            }
        });
    });

    ['b', 'i', 'u', 'strong', 'em'].forEach(tag => {
        Array.from(container.querySelectorAll(tag)).forEach(node => {
            if (node.textContent.trim() === '' && node.children.length === 0) node.remove();
        });
    });

    container.innerHTML = container.innerHTML
        .replace(CLEANUP_REGEX.multipleBrs, '<br>')
        .replace(CLEANUP_REGEX.brokenQuotes1, '"')
        .replace(CLEANUP_REGEX.brokenQuotes2, '"')
        .replace(CLEANUP_REGEX.brToDiv, '<div')
        .replace(CLEANUP_REGEX.listBr, '')
        .replace(CLEANUP_REGEX.startBr, '')
        .replace(CLEANUP_REGEX.endBr, '');
};
