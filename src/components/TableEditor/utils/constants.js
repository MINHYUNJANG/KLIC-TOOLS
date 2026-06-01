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
export const TABLE_CLASS_SUGGESTIONS = ['tbl-st scroll-w', 'tbl-st scroll_wide', 'table', 'table_st', 'tbl_type01'];
export const UL_CLASS_SUGGESTIONS = ['bu-st list', 'listTy0'];
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

export const GUIDE_MESSAGES = {
    modeSelect: `[색상 모드]\n 활성화 시 컨텐츠 내의 색상 데이터를 가져옵니다.`,
    classUlConfig: `[리스트 클래스 설정]\n리스트(ul)에 적용할 클래스명을 지정합니다.\n선택 안함으로 설정시 p태그로 반환됩니다.`,
    classOlConfig: `[숫자 리스트 형식 설정]\n숫자 리스트(ol)에 적용할 형식을 지정합니다.\n숫자, 한글 형식등 (다중선택 가능)`,
    noList: `[기호 유지]\nul/li로 변환 시 원본 특수문자나 번호를\n지우지 않고 그대로 유지합니다.`,
    List2: `[리스트 시작]\n리스트 클래스 2부터 시작\n예:(bu-st2 list)`,
    editorConfig: `[에디터]\n한글(HWP), 엑셀, 워드 등에 있는 표를 복사하여\n아래 빈 화면에 붙여 넣습니다.\n'</>' 아이콘을 눌러 코드를 직접 수정할 수 있습니다.`,
    contBtn: `[컨텐츠 설정]\n컨텐츠의 타이틀, 리스트를 설정 합니다.`,
    allTableBtn: `[테이블 전역 설정]\n테이블 전역 설정을 합니다.`,
    Hwp: `[한글뷰어]\nSVG기반으로 테이블데이터 복사는 불가능합니다.`,
    Psd: `[포토샵 & 일러스트]\n포토샵 & 일러스트 뷰어`,
    copyBtn: `완성된 HTML 코드를\n클립보드에 복사합니다.`,
    removeBtn: `에디터 안의 내용을\n모두 지웁니다.`,
    cleanBtn: `불필요한 태그를 정리하고\n표준 HTML로 변환합니다.`,
    aiCleanBtn: `ai로 간단한\n수정을 할 수 있습니다.\n(무료버전)`,
    tableBtn: `선택한 테이블의\n 세부 설정을\n할 수 있습니다.`,
    HeaderTop: `[헤더 방향]\n표의 기준 헤더 방향을 정합니다.(상단)`,
    HeaderLeft: `[헤더 방향]\n표의 기준 헤더 방향을 정합니다.(좌측)`,
    HeaderConfig: `[테이블 행열 설정]\n표의 기준 헤더 범위를 정합니다.\n(0 = tbody만 출력, 기본값 : 1)\ncol,rowspan까지 포함한 범위입니다.`,
    classTableConfig: `[클래스 설정]\n표(table)에 적용할 클래스명을 지정합니다.`,
    divType: `[테이블 기본 설정]\n테이블을 DIV로 감쌀지 선택합니다.\n해제시 table태그만 나옵니다.`,
    verticalHeader: `[테이블 기본 설정]\n제목(TH) 칸의 글자를\n세로로 한 줄씩 출력합니다.`,
    colWidth: `[열 너비 제어]\n각 칸의 너비를 직접 지정하거나,\n[자동 계산]으로 균등 분할합니다.\n기본값 : auto`,
    tit1: `[제목]\n타이틀1(h3)의 범위 및 클래스명을 지정합니다.`,
    tit2: `[제목]\n타이틀2(h4)의 범위 및 클래스명을 지정합니다.`,
    tit3: `[제목]\n타이틀3(h5)의 범위 및 클래스명을 지정합니다.`,
    color: `[색상모드]\n체크시 = 클래스 pc_색상\n해제시 = style ="color:색상"\n범위 값에 없는 색상은 전부 style처리`,
};
