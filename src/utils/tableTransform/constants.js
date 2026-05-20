export const ALLOWED_TAGS = new Set(['div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption', 'colgroup', 'col', 'a', 'br', 'p', 'ul', 'ol', 'li', 'span', 'strong', 'u', 'em']);

export const RE_NUMERIC = /^[\d.]+$/;
export const RE_WHITESPACE = /[\s ​-‍﻿]/g;

export const convertCircleToArabic = (str) => {
    if (!str) return str;
    return str
        .replace(/[①-⑳]/g, c => String(c.codePointAt(0) - 0x2460 + 1))
        .replace(/[㉑-㉟]/g, c => String(c.codePointAt(0) - 0x3251 + 21))
        .replace(/[㊱-㊿]/g, c => String(c.codePointAt(0) - 0x32B1 + 36))
        .replace(/[➀-➉]/g, c => String(c.codePointAt(0) - 0x2780 + 1))
        .replace(/[❶-❿]/g, c => String(c.codePointAt(0) - 0x2776 + 1))
        .replace(/[➊-➓]/g, c => String(c.codePointAt(0) - 0x278A + 1))
        .replace(/[⓫-⓴]/g, c => String(c.codePointAt(0) - 0x24EB + 11));
};

export const ALLOWED_ATTRIBUTES = new Set(['rowspan', 'colspan', 'href', 'scope', 'class', 'src', 'style']);

export const MARKER_TYPES = {
    'multi-level': /^\s*(?:\d+[.])+\d+[.]?\s*/,
    'roman-dot': /^\s*(?:[IVXivx]+)[.]\s*/,
    'decimal-dot': /^\s*\d{1,2}[.]\s*(?!\d|%)/,
    'hangul-dot': /^\s*(?:[가나다라마바사아자차카타파하]|[ㄱ-ㅎ])[.]\s*/,
    'paren-decimal-single': /^\s*\d{1,2}[)]\s*/,
    'paren-decimal-double': /^\s*\(\d{1,2}\)\s*/,
    'paren-hangul-single': /^\s*(?:[가나다라마바사아자차카타파하]|[ㄱ-ㅎ])[)]\s*/,
    'paren-hangul-double': /^\s*\((?:[가나다라마바사아자차카타파하]|[ㄱ-ㅎ])\)\s*/,
    'paren-english': /^\s*(?:[a-zA-Z][)]|\([a-zA-Z]\))\s*/,
    'square-bracket': /^\s*\[(?:\d{1,2}|[가나다라마바사아자차카타파하]|[ㄱ-ㅎ]|[a-zA-Z])\]\s*/,
    'circle-char': /^\s*[①-⓿㉐-㉟㊱-㊿㈀-㈞⒜-ⓩ❶-➓]\s*/,
    'bullet': /^\s*(?![%!@#$%^&+=~`|\\?])(?:[-*•⦁·ㆍ∙∘–—➢➔➜→✔✓☑☐■∎￭□◆◇○●◎▲△▼▽▶▷◀◁◈▣★☆☞☜・❖✦✧]|\s*[•·‣⁃∙▪●○■-◿☀-⛿✀-➿⬀-⯿←-⇿‐-―・])[.]?\s*/,
    'special': /^\s*(?:[㉠-㉭㈎-㈛㉮-㉻①-⓿❶-➓])\s*/,
};

export const CLEANUP_REGEX = {
    multipleBrs: /(?:<br\s*\/?>\s*(?:&nbsp;| |\s)*){2,}/gi,
    emptyP: /<p>\s*<\/p>/gi,
    brokenQuotes1: /󰡐/g,
    brokenQuotes2: /󰡑/g,
    brToDiv: /<br\s*\/?>\s*<div/gi,
    listBr: /(?:<br\s*\/?>\s*)+(?=<\/?(?:ul|ol|li|p)[^>]*>)/gi,
    startBr: /^\s*<br\s*\/?>/gi,
    endBr: /(?:<br\s*\/?>\s*)+$/gi
};

export const EXCLUDE_MARKER_REGEXES = [
    /^\s*[\d.]+\s*[~∼\-]/,
    /^\s*(?:19|20)\d{2}[.]/,
    /^\s*\d+\.\d+\s*$/,
    /^\s*\(\d+\)\s*$/,
    /^\s*\d+(?:\.\d+)+\s*[%％]/,
    /^\s*[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s]+\s*\d+\s*$/,
    /^\s*\d{1,2}\.\s*\d{1,2}\.?\s*\([월화수목금토일]\)/,
    /^\s*[○●]{2,}/,
    /^\s*㈜/,
    /^\s*\d{2,3}\)\s*\d{3,4}[-\s]\d{4}/
];

export const HWP_CHAR_MAP = {
    '󰡐': '"',
    '󰡑': '"',
    '': '✓',
    '': '■',
    '': '□',
    '': '◆',
    '❖': '◇',
    '': '◈',
    '': '▶',
    '➢': '▷',
    '': '➔',
    '󰋻': '▸',
    '': '●',
    '': '○',
    '': '◎',
    '󰋮': '-',
    '󰋯': '·',
    '' : '·',
    '' : '•'
};
export const HWP_CHAR_REGEX = new RegExp(Object.keys(HWP_CHAR_MAP).join('|'), 'g');

export const UL_NONE_VALUE = '__no_ul__';
export const TABLE_CLASS_SUGGESTIONS = ['tbl-st scroll_gr', 'tbl-st scroll_wide', 'table', 'table_st', 'tbl_type01'];
export const UL_CLASS_SUGGESTIONS = ['list_st', 'listTy0'];
export const OL_OPTIONS = [
    { value: 'decimal-dot', label: '숫자: 1.' },
    { value: 'hangul-dot', label: '한글: 가.' },
    { value: 'paren-decimal-single', label: '숫자: 1)' },
    { value: 'paren-hangul-single', label: '한글: 가)' },
    { value: 'circle-char', label: '원형: ①' },
    { value: 'roman-dot', label: '로마자: Ⅰ.' },
];
export const TIT_OPTIONS = [
    { value: 'custom', label: '직접 입력' },
    { value: 'number-dot', label: '숫자: 1.' },
    { value: 'number-paren', label: '숫자: 1)' },
    { value: 'circle', label: '원형: ①' },
    { value: 'hangul-dot', label: '한글: 가.' },
    { value: 'hangul-paren', label: '한글: 가)' },
    { value: 'roman', label: '로마자: Ⅰ.' },
    { value: 'law-chapter', label: '제n장/편/관' },
    { value: 'law-article', label: '제n조' },
];

export const TARGET_COLORS = [
    { name: 'gray', rgb: [128, 128, 128] },
    { name: 'black', rgb: [0, 0, 0] },
    { name: 'blue', rgb: [0, 0, 255] },
    { name: 'red', rgb: [255, 0, 0] },
    { name: 'navy', rgb: [0, 0, 128] },
    { name: 'org', rgb: [255, 165, 0] },
    { name: 'green', rgb: [0, 128, 0] },
    { name: 'yellow', rgb: [255, 255, 0] },
    { name: 'pur', rgb: [128, 0, 128] },
    { name: 'sky', rgb: [135, 206, 235] },
    { name: 'pink', rgb: [255, 192, 203] }
];
