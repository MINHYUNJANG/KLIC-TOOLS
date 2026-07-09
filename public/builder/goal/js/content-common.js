const TEMPLATE_DIR = '/builder/goal/templates/';
const COMMON_TEMPLATE_BASE = '/builder/common/templates/';
const DESIGN_BLOCK_MANIFEST = `${TEMPLATE_DIR}design_block/manifest.json`;
const DESIGN_TEMPLATE_MANIFEST = `${TEMPLATE_DIR}design_template/manifest.json`;
const DECORATION_MANIFEST = `${TEMPLATE_DIR}common/decoration/manifest.json`;
const TEMPLATE_FILE_PATTERN = /\.(html|js)$/i;
const TEMPLATE_IMAGE_PATTERN = /\.(png|jpe?g|webp|gif|svg)$/i;
const loadedTemplateStyles = new Map();
const HTML_TO_IMAGE_SRC = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js';

const ICON_MANIFEST = `${COMMON_TEMPLATE_BASE}common/icon/manifest.json`;
const CUSTOM_DECORATION_STORAGE_KEY = 'gridbuilder:custom-decorations:v1';
const SHOW_MIX_BLOCKS = true;
let ICON_CATEGORIES = [];
let iconCategoriesPromise = null;

async function loadIconCategories() {
	if (iconCategoriesPromise) return iconCategoriesPromise;
	iconCategoriesPromise = (async () => {
	try {
		const res = await fetch(ICON_MANIFEST, { cache: 'no-store' });
		if (res.ok) ICON_CATEGORIES = normalizeIconCategories(await res.json());
	} catch (e) {
		console.warn('아이콘 매니페스트를 불러오지 못했습니다.', e);
	}
	return ICON_CATEGORIES;
	})();
	return iconCategoriesPromise;
}

function normalizeAssetPath(path) {
	if (!path || /^data:/i.test(path) || /^https?:\/\//i.test(path) || path.startsWith('/')) return path;
	if (path.startsWith('templates/')) return `/builder/goal/${path}`;
	return path;
}

function normalizeBuilderAssetPath(path) {
	if (!path || /^data:/i.test(path) || /^https?:\/\//i.test(path)) return path;
	if (path.startsWith('/builder/common/')) return path;
	if (path.startsWith('/builder/goal/')) return path;
	if (path.startsWith('/images/')) return `/builder/goal${path}`;
	if (path.startsWith('/templates/common/icon/')) return `${COMMON_TEMPLATE_BASE}${path.slice('/templates/'.length)}`;
	if (path.startsWith('templates/common/icon/')) return `${COMMON_TEMPLATE_BASE}${path.slice('templates/'.length)}`;
	if (path.startsWith('/templates/')) return `/builder/goal${path}`;
	if (path.startsWith('templates/')) return `/builder/goal/${path}`;
	return path;
}

function normalizeIconMarkup(value) {
	if (!value) return '';
	const wrapper = document.createElement('div');
	wrapper.innerHTML = String(value);
	wrapper.querySelectorAll('img[src]').forEach(img => {
		img.setAttribute('src', normalizeBuilderAssetPath(img.getAttribute('src')));
		if (!img.classList.contains('block-icon-img')) img.classList.add('block-icon-img');
	});
	return wrapper.innerHTML;
}

function normalizeIconCategories(categories) {
	return (categories || []).map(cat => ({
		...cat,
		icons: (cat.icons || []).map(icon => ({ ...icon, src: normalizeBuilderAssetPath(icon.src) })),
		groups: (cat.groups || []).map(group => ({
			...group,
			icons: (group.icons || []).map(icon => ({ ...icon, src: normalizeBuilderAssetPath(icon.src) }))
		}))
	}));
}

const componentTemplates = {};

const state = {
	blocks: [],
	nextBlockId: 1,
	dragPayload: '',
	templateFilter: 'all',
	templateSubFilter: '',
	designTemplateFilter: 'all',
	sidebarTab: 'blocks',
	decorationFilter: 'all',
	selectedItem: null,
	overlays: [],
	customDecorations: [],
	undoStack: [],
	canvasWidth: '1200',
	previewDevice: 'pc'
};

// 꾸밈 스튜디오 필터 목록
const DECORATION_FILTERS = [
	{ id: 'all', label: '전체' },
	{ id: 'kindergarten', label: '유치원' },
	{ id: 'elementary', label: '초등학교' },
	{ id: 'middle', label: '중학교' },
	{ id: 'high', label: '고등학교' },
	{ id: 'illustration', label: '일러스트' },
	{ id: 'deco-sticker', label: '데코 스티커' },
	{ id: 'etc', label: '기타' },
];

// 꾸밈 템플릿별 카테고리 매핑 (추후 확장)
const DECORATION_CATEGORIES = {
	'deco-01': 'kindergarten',
	'deco-02': 'kindergarten',
	'deco-03': 'elementary',
	'deco-04': 'middle',
	'deco-05': 'high',
	'deco-06': 'illustration',
};

const DESIGN_TEMPLATE_FILTERS = [
	{ id: 'all', label: '전체' },
	{ id: 'recommended', label: '추천템플릿' },
	{ id: 'education-goal', label: '교육목표' },
	{ id: 'policy-direction', label: '정책방향' },
	{ id: 'vision', label: '비전' },
	{ id: 'etc', label: '기타' },
];

function getDecorationCategory(templateId) {
	if (/^kinder-\d+/.test(templateId)) return 'kindergarten';
	if (/^elem-\d+/.test(templateId)) return 'elementary';
	if (/^middle-\d+/.test(templateId)) return 'middle';
	if (/^high-\d+/.test(templateId)) return 'high';
	if (/^illust-\d+/.test(templateId)) return 'illustration';
	return DECORATION_CATEGORIES[templateId] || 'etc';
}

// manifest.json 로드 시 자동으로 채워짐
const templateCategories = {};
const templateBasePaths = {}; // { 'box-01': 'templates/design_block/box/box-01', ... }

// 템플릿(componentTemplates) 로딩 완료 시점을 기다릴 수 있게 하는 신호.
// 부모 창이 iframe 로드 직후 postMessage로 스냅샷을 밀어넣을 때, 아직 템플릿 fetch가
// 끝나지 않은 상태에서 render()가 돌면 componentTemplates[block.type]이 undefined가 된다.
let resolveTemplatesReady;
const templatesReady = new Promise(resolve => { resolveTemplatesReady = resolve; });

const canvasGrid = document.getElementById('canvasGrid');
const optionsPanel = document.getElementById('optionsPanel');
const canvasPanel = document.getElementById('canvasPanel');
const markupOutput = document.getElementById('markupOutput');
const layoutStatus = document.getElementById('layoutStatus');
const copyState = document.getElementById('copyState');
const previewToggle = document.getElementById('previewToggle');
const previewReturn = document.getElementById('previewReturn');
const savePreviewImageButton = document.getElementById('savePreviewImage');
const previewMarkupOpenButton = document.getElementById('previewMarkupOpen');
const markupToggle = document.getElementById('markupToggle');
const componentList = document.getElementById('componentList');

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function escapeAttr(value) {
	return escapeHtml(value);
}

function formatMultiline(value) {
	return escapeHtml(value).replace(/\n/g, '<br>');
}

function cloneData(data) {
	return JSON.parse(JSON.stringify(data));
}

// 혼합 블록 내부 참조 해석 (복합 ID: "outerBlockId::inner::idx")
function resolveMixInnerRef(blockId) {
	const m = typeof blockId === 'string' && blockId.match(/^(.+)::inner::(\d+)$/);
	if (!m) return null;
	const outerBlock = state.blocks.find(b => b.id === m[1]);
	if (!outerBlock || !Array.isArray(outerBlock.innerBlocks)) return null;
	const innerIdx = parseInt(m[2], 10);
	const innerBlock = outerBlock.innerBlocks[innerIdx];
	if (!innerBlock) return null;
	return { outerBlock, innerIdx, innerBlock };
}

function resolveListInnerRef(blockId) {
	const m = typeof blockId === 'string' && blockId.match(/^(.+)::list::(\d+)$/);
	if (!m) return null;
	const outerBlock = state.blocks.find(b => b.id === m[1]);
	if (!outerBlock) return null;
	const colIdx = parseInt(m[2], 10);
	const item = outerBlock.items[colIdx];
	if (!item || !item.listBlock) return null;
	return { outerBlock, listBlock: item.listBlock, colIdx };
}

function findItemByBlockId(blockId, columnIndex) {
	const mixRef = resolveMixInnerRef(blockId);
	if (mixRef) return mixRef.innerBlock.items[columnIndex] ?? null;
	const listRef = resolveListInnerRef(blockId);
	if (listRef) return listRef.listBlock.items[columnIndex] ?? null;
	const block = state.blocks.find(b => b.id === blockId);
	return block?.items[columnIndex] ?? null;
}

function hasListWrap(blockType) {
	const template = componentTemplates[blockType];
	return !!(template && template.element.querySelector('.list-wrap'));
}

const CONTENT_CATEGORIES = new Set(['box', 'list', 'title-horizontal', 'title-vertical', 'mix', 'title-list', 'arrow']);

function switchFilterTab(filterValue) {
	const btn = document.querySelector(`[data-template-filter="${filterValue}"]`);
	if (!btn) return;
	state.templateFilter = filterValue;
	state.templateSubFilter = '';
	document.querySelectorAll('[data-template-filter]').forEach(b => b.classList.toggle('is-active', b === btn));
	const subWrap = document.getElementById('contentSubfilterWrap');
	if (subWrap) {
		subWrap.hidden = filterValue !== 'content';
		subWrap.querySelectorAll('[data-content-subfilter]').forEach(b => {
			b.classList.toggle('is-active', b.dataset.contentSubfilter === '');
		});
	}
	renderComponentList();
}

const FONT_SIZES = ['14', '15', '16', '18', '20', '22', '24', '26'];
const MAX_HISTORY = 50;
const EDIT_LIST_MAX_DEPTH = 3;
const LIST_STYLE_OPTIONS = [
	{ value: '',        label: '기본' },
	{ value: 'disc',    label: '● 채운 원' },
	{ value: 'num', label: '1. 숫자' },
	{ value: 'dash',    label: '– 대시' },
	{ value: 'kor',    label: '가. 한글' },
	{ value: 'custom',  label: '✏ 직접입력' },
];
let _historyGroupPending = false;
let _duplicatingBlock = false;
let _bodyTabState = {}; // { [blockId::target]: 'all' | number }

function pushHistory() {
	state.undoStack.push(cloneData(state.blocks));
	if (state.undoStack.length > MAX_HISTORY) state.undoStack.shift();
}

function pushHistoryGrouped() {
	if (_historyGroupPending) return;
	_historyGroupPending = true;
	pushHistory();
	setTimeout(() => { _historyGroupPending = false; }, 500);
}

function undo() {
	if (!state.undoStack.length) return;
	state.blocks = state.undoStack.pop();
	state.nextBlockId = state.blocks.reduce((max, b) => {
		const n = parseInt(b.id.replace('block-', ''), 10);
		return isNaN(n) ? max : Math.max(max, n + 1);
	}, 1);
	state.selectedItem = null;
	clearOptionsPanel();
	render();
}

function createDefaultStyle() {
	return {
		titleBorderColor: '#dfe5ee',
		titleBackgroundColor: '#7989a2',
		titleTextColor: '#ffffff',
		titleFontWeight: '700',
		bodyBorderColor: '#dfe5ee',
		bodyBackgroundColor: '#ffffff',
		bodyTextColor: '#101010',
		bodyFontWeight: '400',
		subBorderColor: '#dfe5ee',
		subBackgroundColor: '#ffffff',
		subTextColor: '#101010',
		subFontWeight: '400',
		connectorColor: '#333333',
		connectorSize: '1'
	};
}

function getColumnStyle(item) {
	if (!item.style) {
		item.style = createDefaultStyle();
	}
	return item.style;
}


const _STYLE_BUILTINS = new Set(['title', 'body', 'sub', 'connector']);
const DEFAULT_TARGET_LABELS = { title: '타이틀', body: '본문', sub: '서브' };

// 스타일 객체에서 커스텀 타겟(title/body/sub 외) 자동 감지
function getCustomStyleTargets(style) {
	return [...new Set(
		Object.keys(style)
			.map(k => k.match(/^([a-z][a-zA-Z0-9]+)(BorderColor|BackgroundColor|TextColor|FontWeight|FontSize|TextAlign)$/)?.[1])
			.filter(t => t && !_STYLE_BUILTINS.has(t))
	)];
}

function columnStyleVars(item) {
	const s = getColumnStyle(item);
	return [
		// title
		`--title-border: ${s.titleBorderColor}`,
		`--title-bg: ${s.titleBackgroundColor}`,
		s.titleBackgroundColor1 && `--title-bg1: ${s.titleBackgroundColor1}`,
		s.titleBackgroundColor2 && `--title-bg2: ${s.titleBackgroundColor2}`,
		`--title-text: ${s.titleTextColor}`,
		// body — explicit 시 사용자 값, default 있으면 그 값, 둘 다 없으면 emit 안 함 (CSS 파일 기본값 보존)
		s.bodyBorderExplicit ? `--body-border: ${s.bodyBorderColor}` : s._bodyBorderDefault ? `--body-border: ${s._bodyBorderDefault}` : null,
		s.bodyBgExplicit ? `--body-bg: ${s.bodyBackgroundColor}` : s._bodyBgDefault ? `--body-bg: ${s._bodyBgDefault}` : null,
		s.bodyBackgroundColor1 && `--body-bg1: ${s.bodyBackgroundColor1}`,
		s.bodyBackgroundColor2 && `--body-bg2: ${s.bodyBackgroundColor2}`,
		s.bodyTextExplicit ? `--body-text: ${s.bodyTextColor}` : s._bodyTextDefault ? `--body-text: ${s._bodyTextDefault}` : null,
		// sub
		`--sub-border: ${s.subBorderColor}`,
		`--sub-bg: ${s.subBackgroundColor}`,
		(s.subTextExplicit || s._subTextDefault) && `--sub-text: ${s.subTextExplicit ? s.subTextColor : s._subTextDefault}`,
		// 공통
		`--connector-color: ${s.connectorColor}`,
		`--connector-size: ${s.connectorSize}`,
		// 커스텀 타겟 — 값이 설정된 경우만 emit
		...getCustomStyleTargets(s).flatMap(t => [
			s[`${t}BorderColor`]     && `--${t}-border: ${s[`${t}BorderColor`]}`,
			s[`${t}BackgroundColor`] && `--${t}-bg: ${s[`${t}BackgroundColor`]}`,
			s[`${t}TextColor`]       && `--${t}-text: ${s[`${t}TextColor`]}`,
		]),
	].filter(Boolean).join('; ');
}

// CSS export 경로 전용 — 폰트 CSS 변수
function columnFontVars(item) {
	const s = getColumnStyle(item);
	const builtinFontVars = [
		`--title-weight: ${s.titleFontWeight}`,
		s.titleFontSize != null && `--title-size: ${s.titleFontSize}px`,
		s.titleTextAlign && `--title-align: ${s.titleTextAlign}`,
		`--body-weight: ${s.bodyFontWeight}`,
		s.bodyFontSize != null && `--body-size: ${s.bodyFontSize}px`,
		s.bodyTextAlign && `--body-align: ${s.bodyTextAlign}`,
		`--sub-weight: ${s.subFontWeight}`,
		s.subFontSize != null && `--sub-size: ${s.subFontSize}px`,
		s.subTextAlign && `--sub-align: ${s.subTextAlign}`,
	];
	const customFontVars = getCustomStyleTargets(s).flatMap(t => [
		s[`${t}FontWeight`]  && `--${t}-weight: ${s[`${t}FontWeight`]}`,
		s[`${t}FontSize`] != null && `--${t}-size: ${s[`${t}FontSize`]}px`,
		s[`${t}TextAlign`]   && `--${t}-align: ${s[`${t}TextAlign`]}`,
	]);
	return [...builtinFontVars, ...customFontVars].filter(Boolean).join('; ');
}

// data-edit-field 요소에 폰트 클래스 직접 적용
// skipInsideSelector: 해당 셀렉터 안에 있는 필드는 건너뜀 (add-wrap 중복 적용 방지)
function applyFieldStyleClasses(container, item, skipInsideSelector = null) {
	const s = getColumnStyle(item);
	container.querySelectorAll('[data-edit-field]').forEach(field => {
		if (field.closest('.edit-list')) return;
		if (skipInsideSelector && field.closest(skipInsideSelector)) return;
		const f = field.dataset.editField;
		const fw = s[`${f}FontWeight`];
		const fs = s[`${f}FontSize`];
		const ta = s[`${f}TextAlign`];
		const toRemove = Array.from(field.classList).filter(c => /^fw\d+$/.test(c) || /^fs\d+$/.test(c) || /^ta-(left|center|right)$/.test(c));
		if (toRemove.length) field.classList.remove(...toRemove);
		if (fw) field.classList.add(`fw${fw}`);
		if (fs != null) field.classList.add(`fs${fs}`);
		if (ta) field.classList.add(`ta-${ta}`);
	});
}

// DOM 요소에 색상 CSS 변수 적용
function applyColumnStyle(el, item) {
	el.setAttribute('style', columnStyleVars(item));
}

function toStyleKey(rawKey) {
	return rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function readDefaultStyle(root) {
	return Array.from(root.attributes).reduce((style, attr) => {
		if (!attr.name.startsWith('data-style-')) return style;
		style[toStyleKey(attr.name.replace('data-style-', ''))] = attr.value;
		return style;
	}, {});
}

function setFieldContent(element, value) {
	element.innerHTML = element?.dataset?.editField === 'icon'
		? normalizeIconMarkup(value)
		: String(value || '');
}

function stripEditorAttributes(root) {
	Array.from(root.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-')) {
			root.removeAttribute(attr.name);
		}
	});
	root.querySelectorAll('[contenteditable]').forEach(element => element.removeAttribute('contenteditable'));
	root.querySelectorAll('[data-block-id]').forEach(element => element.removeAttribute('data-block-id'));
	root.querySelectorAll('[data-column-index]').forEach(element => element.removeAttribute('data-column-index'));
	root.classList.remove('add-wrap', 'block-item');
	root.querySelectorAll('.add-wrap').forEach(element => element.classList.remove('add-wrap'));
	root.querySelectorAll('.block-item').forEach(element => element.classList.remove('block-item'));
}

function renderTemplateElement(template, item, block = null, columnIndex = null, editable = false) {
	const element = template.element.cloneNode(true);
	Array.from(element.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-')) {
			element.removeAttribute(attr.name);
		}
	});
	element.querySelectorAll('[data-edit-field]').forEach(field => {
		const fieldName = field.dataset.editField;
		setFieldContent(field, item[fieldName] || '');
		if (fieldName === 'icon' && (item.iconWidth || item.iconHeight)) {
			const img = field.querySelector('.block-icon-img');
			if (img) {
				if (item.iconWidth) { img.style.width = `${item.iconWidth}px`; img.style.maxWidth = 'none'; }
				if (item.iconHeight) { img.style.height = `${item.iconHeight}px`; }
			}
		}
		if (editable && block) {
			field.dataset.blockId = block.id;
			field.dataset.columnIndex = String(columnIndex);
			return;
		}
		field.removeAttribute('data-edit-field');
	});

	if (!editable) {
		stripEditorAttributes(element);
	}

	return element;
}

function elementToHtml(element) {
	const wrapper = document.createElement('div');
	wrapper.appendChild(element);
	return wrapper.innerHTML.trim();
}

function htmlToLines(html) {
	return html.split('\n').map(line => line.trimEnd());
}

function extractEditListLevelData(listEl, parentKey, data) {
	Array.from(listEl.children).filter(el => el.tagName === 'LI').forEach((li, i) => {
		const key = parentKey ? `${parentKey}_${i + 1}` : `item${i + 1}`;
		const nestedList = Array.from(li.children).find(el => el.classList.contains('edit-list'));
		if (nestedList) {
			const liClone = li.cloneNode(true);
			Array.from(liClone.children).filter(el => el.classList.contains('edit-list')).forEach(el => el.remove());
			data[key] = liClone.innerHTML.trim();
			extractEditListLevelData(nestedList, key, data);
		} else {
			data[key] = li.innerHTML;
		}
	});
}

function getDefaultData(element) {
	const data = {};
	element.querySelectorAll('[data-edit-field]').forEach(field => {
		if (field.closest('.edit-list')) return;
		data[field.dataset.editField] = field.dataset.editField === 'icon'
			? normalizeIconMarkup(field.innerHTML)
			: field.innerHTML;
	});
	const editList = element.querySelector('.edit-list');
	if (editList) {
		extractEditListLevelData(editList, null, data);
	}
	return data;
}

function normalizeTemplatePath(path) {
	let normalized;
	if (/^https?:\/\//i.test(path) || path.startsWith('/')) {
		normalized = path;
	} else if (path.startsWith('templates/')) {
		normalized = `/builder/goal/${path}`;
	} else {
		normalized = TEMPLATE_DIR + path;
	}
	if (TEMPLATE_FILE_PATTERN.test(normalized) || TEMPLATE_IMAGE_PATTERN.test(normalized)) return normalized;
	return normalized.replace(/\/?$/, '/') + 'index.html';
}

function normalizeTemplateFolder(path) {
	let normalized;
	if (/^https?:\/\//i.test(path) || path.startsWith('/')) {
		normalized = path;
	} else if (path.startsWith('templates/')) {
		normalized = `/builder/goal/${path}`;
	} else {
		normalized = TEMPLATE_DIR + path;
	}
	return normalized.replace(/\/?$/, '');
}

function inferGoalTemplateCategory(path) {
	if (/\/design_template\//.test(path)) return 'design-template';
	if (/\/common\/divider\//.test(path)) return 'divider';
	if (/\/common\/decoration\//.test(path)) return 'decoration';
	const contentMatch = path.match(/\/design_block\/content\/([^/]+)\//);
	if (contentMatch) return contentMatch[1];
	const match = path.match(/\/design_block\/([^/]+)\//);
	return match ? match[1] : '';
}

function inferGoalTemplateId(path) {
	const normalized = path.replace(/\\/g, '/');
	const parts = normalized.split('/').filter(Boolean);
	const file = parts.at(-1) || '';
	const folder = parts.at(-2) || '';
	if (/^index\.html$/i.test(file) || !/\.[^.]+$/i.test(file)) return folder;
	if (/\/common\/decoration\/(kinder|elem|middle|high|illust|deco)\//.test(normalized)) {
		const n = file.replace(/\.[^.]+$/i, '').padStart(2, '0');
		return `${folder}-${n}`;
	}
	return file.replace(/\.[^.]+$/, '');
}

function parseDirectoryListing(html) {
	const doc = new DOMParser().parseFromString(html, 'text/html');
	return Array.from(doc.querySelectorAll('a[href]'))
		.map(link => link.getAttribute('href'))
		.filter(Boolean)
		.map(href => href.split('?')[0].split('#')[0].replace(/\\/g, '/'))
		.filter(href => !href.startsWith('/') && !href.includes('..'))
		.filter(href => TEMPLATE_FILE_PATTERN.test(href) || TEMPLATE_IMAGE_PATTERN.test(href) || /\/$/.test(href))
		.map(normalizeTemplatePath);
}

async function discoverTemplatePaths() {
	const manifests = await Promise.all([
		fetchTemplateManifest(DESIGN_BLOCK_MANIFEST, true),
		fetchTemplateManifest(DESIGN_TEMPLATE_MANIFEST, false),
		fetchTemplateManifest(DECORATION_MANIFEST, false)
	]);
	const entries = manifests.flat();

	const paths = await Promise.all(entries.map(expandTemplateManifestEntry));
	return paths.flat();
}

async function fetchTemplateManifest(url, required) {
	const response = await fetch(url, { cache: 'no-store' });
	if (!response.ok) {
		if (required) throw new Error(`${url} 파일을 읽을 수 없습니다.`);
		return [];
	}
	const manifest = await response.json();
	return Array.isArray(manifest) ? manifest : (manifest.groups || []);
}

async function expandTemplateManifestEntry(entry) {
	if (typeof entry === 'string') {
		const path = normalizeTemplatePath(entry);
		const id = inferGoalTemplateId(path);
		const category = inferGoalTemplateCategory(path);
		if (id && category) {
			templateCategories[id] = category;
			templateBasePaths[id] = normalizeTemplateFolder(path.replace(/\/?index\.html$/i, '').replace(/\/[^/]+\.[^.]+$/i, ''));
		}
		return [path];
	}

	if (entry.type === 'image-set') {
		const groupBasePath = normalizeTemplateFolder(entry.path || entry.id);
		const config = await loadTemplateConfig(`${groupBasePath}/index.html`);
		return (config.images || []).map(image => {
			const path = normalizeTemplatePath(`${groupBasePath}/${image}`);
			const id = inferGoalTemplateId(path);
			const category = inferGoalTemplateCategory(path);
			if (id && category) {
				templateCategories[id] = category;
				templateBasePaths[id] = groupBasePath;
			}
			return path;
		});
	}

	const paths = [];
	const groupBasePath = normalizeTemplateFolder(entry.path || entry.id);
	for (const id of (entry.items || [])) {
		templateCategories[id] = entry.id;
		templateBasePaths[id] = `${groupBasePath}/${id}`;
		paths.push(`${groupBasePath}/${id}/index.html`);
	}
	return paths;
}

function getTemplateCssPath(htmlPath) {
	const cssPath = htmlPath.replace(/[^/]+$/, 'style.css');
	const commonStylePattern = /^\/builder\/(?:goal|map)\/templates\/common\/(?:decoration\/(?:elem\/elem-0[1-5]|high\/high-0[1-5]|kinder\/kinder-0[1-5]|middle\/middle-0[1-5])|divider\/div-0[2-5])\/style\.css$/;

	if (commonStylePattern.test(cssPath)) {
		return cssPath.replace(/^\/builder\/(?:goal|map)\/templates\/common\//, '/builder/common/css/templates/common/');
	}

	return cssPath;
}

function getTemplateConfigPath(htmlPath) {
	return htmlPath.replace(/[^/]+$/, 'config.json');
}

async function loadTemplateConfig(htmlPath) {
	try {
		const res = await fetch(getTemplateConfigPath(htmlPath), { cache: 'no-store' });
		if (res.ok) return await res.json();
	} catch (e) {}
	return {};
}

function normalizeTemplateAssetPaths(element) {
	element.querySelectorAll('img[src]').forEach(img => {
		img.setAttribute('src', normalizeAssetPath(img.getAttribute('src')));
	});
	element.querySelectorAll('[style]').forEach(node => {
		const style = node.getAttribute('style');
		if (style && style.includes('url(')) {
			node.setAttribute('style', style.replace(/url\((['"]?)(\/?templates\/[^'")]+)\1\)/g, (_, quote, assetPath) => {
				return `url(${quote}${normalizeAssetPath(assetPath)}${quote})`;
			}));
		}
	});
}

const templateCssTextCache = new Map();

function loadTemplateCss(htmlPath) {
	const cssPath = getTemplateCssPath(htmlPath);
	if (!templateCssTextCache.has(cssPath)) {
		templateCssTextCache.set(cssPath, '');
		fetch(cssPath, { cache: 'no-store' })
			.then(res => res.ok ? res.text() : '')
			.catch(() => '')
			.then(text => templateCssTextCache.set(cssPath, text));
	}
	if (loadedTemplateStyles.has(cssPath)) return loadedTemplateStyles.get(cssPath);

	const promise = new Promise(resolve => {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = cssPath;
		link.dataset.templateStyle = cssPath;
		link.addEventListener('load', resolve, { once: true });
		link.addEventListener('error', resolve, { once: true });
		document.head.appendChild(link);
	});
	loadedTemplateStyles.set(cssPath, promise);
	return promise;
}

async function loadHtmlTemplate(path) {
	const response = await fetch(path, { cache: 'no-store' });
	if (!response.ok) throw new Error(`${path} 파일을 읽을 수 없습니다.`);
	const source = await response.text();
	const doc = new DOMParser().parseFromString(source, 'text/html');
	const element = doc.querySelector('[data-template-id]') || doc.body.firstElementChild;
	if (!element || element.tagName.toLowerCase() !== 'div') {
		throw new Error(`${path} 템플릿은 최상위 div가 필요합니다.`);
	}

	const id = element.dataset.templateId || path.split('/').pop().replace(/\.[^.]+$/, '');
	const name = element.dataset.templateName || id;
	element.dataset.templateId = id;
	normalizeTemplateAssetPaths(element);
	const [, config] = await Promise.all([loadTemplateCss(path), loadTemplateConfig(path)]);

	const addDirection = config.addDirection || 'row';
	const addWrapEls = element.querySelectorAll('.add-wrap');
	const addWrapEl = addWrapEls[0] || null;
	const addRowWrap = addWrapEl || element;
	// add-wrap 없는 row 모드만 전체 복제 (isRootWrap = true)
	const isRootWrap = addDirection === 'row' && !addWrapEl;
	// 템플릿에 미리 나눠진 add-wrap 수 → 초기 행 수
	const defaultColumns = addWrapEls.length > 1 ? addWrapEls.length : 1;
	// 각 position의 기본 데이터 (아이콘 경로 등 유지용)
	const addWrapDefaultData = addWrapEls.length > 1
		? Array.from(addWrapEls).map(el => getDefaultData(el))
		: [];

	const max = Number(config.max) || 4;

	const editListEl = element.querySelector('.edit-list');
	const editListTemplates = [];
	if (editListEl) {
		let _curUl = editListEl;
		while (_curUl && editListTemplates.length < 3) {
			const _liEl = Array.from(_curUl.children).find(el => el.tagName === 'LI') ?? null;
			editListTemplates.push({ ulEl: _curUl, liEl: _liEl });
			if (!_liEl) break;
			_curUl = Array.from(_liEl.children).find(el => el.classList.contains('edit-list')) ?? null;
		}
	}
	const editListLiTemplate = editListTemplates[0]?.liEl ?? null;

	const styleOptions = config.styleOptions || null;
	const defaultInnerType = config.defaultInnerType || null;
	const cssVarDefaults = readCssVarDefaults(element);
	const recommend = config.recommend || null;
	const templateFilters = config.templateFilters || [];

	return {
		id,
		name,
		path,
		recommend,
		templateFilters,
		element,
		addRowWrap,
		isRootWrap,
		addDirection,
		max,
		defaultColumns,
		addWrapDefaultData,
		editListLiTemplate,
		editListTemplates,
		styleOptions,
		defaultInnerType,
		cssVarDefaults,
		getDefaultData: () => getDefaultData(element),
		getDefaultStyle: () => readDefaultStyle(element),
		render: (block, item, columnIndex, editable = true) => elementToHtml(renderTemplateElement(componentTemplates[id], item, block, columnIndex, editable)),
		markup: item => htmlToLines(elementToHtml(renderTemplateElement(componentTemplates[id], item)))
	};
}

async function loadImageTemplate(path) {
	const id = inferGoalTemplateId(path);
	const folder = path.split('/').filter(Boolean).at(-2) || id;
	const name = id;
	const element = document.createElement('div');
	element.className = folder;
	element.dataset.templateId = id;
	element.dataset.templateName = name;

	const img = document.createElement('img');
	img.className = `${folder}-char`;
	img.src = normalizeAssetPath(path);
	img.alt = '';
	element.appendChild(img);

	const [, config] = await Promise.all([loadTemplateCss(path), loadTemplateConfig(path)]);
	const addDirection = config.addDirection || 'row';
	const addRowWrap = element.querySelector('.add-wrap') || element;
	const styleOptions = config.styleOptions || null;
	const defaultInnerType = config.defaultInnerType || null;
	const cssVarDefaults = readCssVarDefaults(element);
	const recommend = config.recommend || null;
	const templateFilters = config.templateFilters || [];

	return {
		id,
		name,
		path,
		recommend,
		templateFilters,
		element,
		addRowWrap,
		isRootWrap: true,
		addDirection,
		max: Number(config.max) || 1,
		editListLiTemplate: null,
		editListTemplates: [],
		styleOptions,
		defaultInnerType,
		cssVarDefaults,
		getDefaultData: () => ({}),
		getDefaultStyle: () => readDefaultStyle(element),
		render: (block, item, columnIndex, editable = true) => elementToHtml(renderTemplateElement(componentTemplates[id], item, block, columnIndex, editable)),
		markup: item => htmlToLines(elementToHtml(renderTemplateElement(componentTemplates[id], item)))
	};
}

function readCssVarDefaults(element) {
	// 템플릿 요소
	const el = element.cloneNode(false);
	el.style.cssText = 'visibility:hidden;position:absolute;pointer-events:none;left:-9999px;';
	document.body.appendChild(el);
	// baseline: 클래스 없는 div → :root 등 전역 상속값 파악용
	const base = document.createElement('div');
	base.style.cssText = 'visibility:hidden;position:absolute;pointer-events:none;left:-9999px;';
	document.body.appendChild(base);

	const c = getComputedStyle(el);
	const bc = getComputedStyle(base);
	const get = name => c.getPropertyValue(name).trim() || null;
	const getBase = name => bc.getPropertyValue(name).trim() || null;
	const map = {
		'--title-border': 'titleBorderColor',
		'--title-bg':     'titleBackgroundColor',
		'--title-bg1':    'titleBackgroundColor1',
		'--title-bg2':    'titleBackgroundColor2',
		'--title-text':   'titleTextColor',
		'--title-weight': 'titleFontWeight',
		'--body-border':  'bodyBorderColor',
		'--body-bg':      'bodyBackgroundColor',
		'--body-bg1':     'bodyBackgroundColor1',
		'--body-bg2':     'bodyBackgroundColor2',
		'--body-text':    'bodyTextColor',
		'--body-weight':  'bodyFontWeight',
		'--sub-border':   'subBorderColor',
		'--sub-bg':       'subBackgroundColor',
		'--sub-text':     'subTextColor',
		'--sub-weight':   'subFontWeight',
	};
	const result = {};
	Object.entries(map).forEach(([cssVar, key]) => {
		const val = get(cssVar);
		// baseline과 다를 때만 저장 (템플릿이 직접 정의한 값)
		if (val && val !== getBase(cssVar)) result[key] = val;
	});
	document.body.removeChild(el);
	document.body.removeChild(base);
	return result;
}

async function loadJsTemplate(path) {
	const before = new Set(Object.keys(componentTemplates));
	await import(`../${path}?v=${Date.now()}`);
	const added = Object.keys(componentTemplates).filter(id => !before.has(id));
	if (!added.length) throw new Error(`${path} 파일에서 템플릿이 등록되지 않았습니다.`);
}

window.registerDesignTemplate = function registerDesignTemplate(template) {
	if (!template || !template.id) return;
	componentTemplates[template.id] = template;
};

async function loadTemplates() {
	const paths = await discoverTemplatePaths();
	const htmlPaths = paths.filter(path => /\.html$/i.test(path));
	const imagePaths = paths.filter(path => TEMPLATE_IMAGE_PATTERN.test(path));
	const jsPaths = paths.filter(path => /\.js$/i.test(path));

	const htmlTemplates = await Promise.all(htmlPaths.map(loadHtmlTemplate));
	for (const template of htmlTemplates) {
		componentTemplates[template.id] = template;
		if ((templateCategories[template.id] || '') === 'design-template') {
			registerDesignTemplateSections(template);
		}
	}

	const imageTemplates = await Promise.all(imagePaths.map(loadImageTemplate));
	for (const template of imageTemplates) {
		componentTemplates[template.id] = template;
	}

	for (const path of jsPaths) {
		await loadJsTemplate(path);
	}
}

function applyStyleOptionsDefaults(style, styleOptions) {
	Object.keys(styleOptions).forEach(target => {
		const fields = styleOptions[target]?.fields;
		if (!fields) return;
		fields.forEach(f => {
			if (!f.key || f.default === undefined) return;
			const styleKey = `${target}${f.key.charAt(0).toUpperCase()}${f.key.slice(1)}`;
			style[styleKey] = f.default;
		});
	});
}

function createStyleForType(type) {
	const template = componentTemplates[type];
	const cssDefaults = template.cssVarDefaults || {};
	const style = {
		...createDefaultStyle(),
		...cssDefaults,
		...(template.getDefaultStyle ? template.getDefaultStyle() : {})
	};
	if (template.styleOptions) applyStyleOptionsDefaults(style, template.styleOptions);
	// template CSS 기본값 저장 (columnStyleVars에서 initial 여부 판단에 사용)
	style._bodyBgDefault = cssDefaults.bodyBackgroundColor ?? null;
	style._bodyBorderDefault = cssDefaults.bodyBorderColor ?? null;
	style._bodyTextDefault = cssDefaults.bodyTextColor ?? null;
	style._subTextDefault = cssDefaults.subTextColor ?? null;
	return style;
}

function createSectionTemplate(parentTemplate, sectionElement, index) {
	const id = `${parentTemplate.id}__section_${index + 1}`;
	const element = document.createElement('div');
	element.className = parentTemplate.element.className;
	element.dataset.templateId = id;
	element.dataset.templateName = `${parentTemplate.name} ${index + 1}`;
	element.appendChild(sectionElement.cloneNode(true));

	return {
		...parentTemplate,
		id,
		name: element.dataset.templateName,
		element,
		addRowWrap: element,
		isRootWrap: true,
		addDirection: 'row',
		max: 1,
		editListLiTemplate: null,
		editListTemplates: [],
		getDefaultData: () => getDefaultData(element),
		getDefaultStyle: () => readDefaultStyle(element),
		render: (block, item, columnIndex, editable = true) => elementToHtml(renderTemplateElement(componentTemplates[id], item, block, columnIndex, editable)),
		markup: item => htmlToLines(elementToHtml(renderTemplateElement(componentTemplates[id], item)))
	};
}

function registerDesignTemplateSections(template) {
	const sections = Array.from(template.element.children).filter(child => child.nodeType === 1);
	template.designSectionTypes = sections.map((section, index) => {
		const sectionTemplate = createSectionTemplate(template, section, index);
		componentTemplates[sectionTemplate.id] = sectionTemplate;
		templateCategories[sectionTemplate.id] = 'design-template-section';
		templateBasePaths[sectionTemplate.id] = templateBasePaths[template.id];
		return sectionTemplate.id;
	});
}

function createBlock(type) {
	const template = componentTemplates[type];
	const defaultData = template.getDefaultData ? template.getDefaultData() : {};
	const preDefCount = template.defaultColumns || 1;
	let initialItems;
	if (preDefCount > 1 && template.element) {
		const addWrapEls = Array.from(template.element.querySelectorAll('.add-wrap'));
		initialItems = addWrapEls.map(el => ({
			...cloneData(defaultData),
			...getDefaultData(el),
			style: createStyleForType(type)
		}));
	} else {
		initialItems = [{ ...cloneData(defaultData), style: createStyleForType(type) }];
	}
	const block = {
		id: `block-${state.nextBlockId++}`,
		type,
		columns: preDefCount,
		columnMode: String(preDefCount),
		marginBottom: 30,
		blockWidth: '',
		listStyles: (() => {
			const tpls = componentTemplates[type]?.editListTemplates || [];
			return ['', '', ''].map((_, i) => {
				const ulEl = tpls[i]?.ulEl;
				if (!ulEl) return '';
				const lsCls = Array.from(ulEl.classList).find(c => c.startsWith('ls-'));
				return lsCls ? lsCls.slice(3) : '';
			});
		})(),
		bulletColors: ['', '', ''],
		listFormats: ['', '', ''],
		items: initialItems
	};
	// 혼합 블록: 내부 블록 배열 초기화
	if (templateCategories[type] === 'mix') {
		block.innerBlocks = [];
	}
	// title-list 블록: list-wrap 상태 초기화 (기본 예)
	if (templateCategories[type] === 'title-list' && template.element.querySelector('.list-wrap')) {
		block.useList = true;
		block.items.forEach(item => { item.listBlock = null; });
	}
	return block;
}

function addBlock(type, targetBlockId = null, position = 'after') {
	pushHistory();
	const block = createBlock(type);
	const targetIndex = targetBlockId ? state.blocks.findIndex(item => item.id === targetBlockId) : -1;
	if (targetIndex >= 0) state.blocks.splice(targetIndex + (position === 'before' ? 0 : 1), 0, block);
	else state.blocks.push(block);
	render();
	const newEl = canvasGrid.querySelector(`[data-block-id="${block.id}"]`);
	if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	selectBlock(block.id);
}

function addDesignTemplate(type, targetBlockId = null, position = 'after') {
	const template = componentTemplates[type];
	const sectionTypes = template?.designSectionTypes || [];
	if (!sectionTypes.length) {
		addBlock(type, targetBlockId, position);
		return;
	}
	pushHistory();
	const blocks = sectionTypes.map(sectionType => createBlock(sectionType));
	const targetIndex = targetBlockId ? state.blocks.findIndex(item => item.id === targetBlockId) : -1;
	if (targetIndex >= 0) {
		state.blocks.splice(targetIndex + (position === 'before' ? 0 : 1), 0, ...blocks);
	} else {
		state.blocks.push(...blocks);
	}
	render();
	const firstBlock = blocks[0];
	const newEl = firstBlock ? canvasGrid.querySelector(`[data-block-id="${firstBlock.id}"]`) : null;
	if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	if (firstBlock) selectBlock(firstBlock.id);
}

function moveBlock(blockId, targetBlockId = null, position = 'after') {
	if (blockId === targetBlockId) return;
	pushHistory();
	const currentIndex = state.blocks.findIndex(block => block.id === blockId);
	if (currentIndex < 0) return;
	const [block] = state.blocks.splice(currentIndex, 1);
	const targetIndex = targetBlockId ? state.blocks.findIndex(item => item.id === targetBlockId) : -1;
	if (targetIndex >= 0) state.blocks.splice(targetIndex + (position === 'before' ? 0 : 1), 0, block);
	else state.blocks.push(block);
	render();
}

function removeBlock(blockId) {
	pushHistory();
	if (state.selectedItem?.blockId === blockId) clearOptionsPanel();
	state.blocks = state.blocks.filter(block => block.id !== blockId);
	render();
}

// 혼합 블록에 허용되는 카테고리 (모듈 스코프)
const MIX_ALLOWED = new Set(['box', 'list', 'title-horizontal', 'title-vertical', 'divider']);

// 혼합 블록에 내부 블록 추가
function addMixInnerBlock(blockId, innerType) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const innerTemplate = componentTemplates[innerType];
	if (!innerTemplate) return;
	pushHistory();
	const innerData = innerTemplate.getDefaultData ? innerTemplate.getDefaultData() : {};
	if (!Array.isArray(block.innerBlocks)) block.innerBlocks = [];
	block.innerBlocks.push({
		type: innerType,
		marginBottom: 30,
		items: [{ ...cloneData(innerData), style: createStyleForType(innerType) }]
	});
	render();
	selectBlock(blockId);
}

// 혼합 블록 내부 순서 변경
function moveMixInnerBlock(blockId, fromIdx, toIdx) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !Array.isArray(block.innerBlocks)) return;
	if (fromIdx < 0 || toIdx < 0 || fromIdx >= block.innerBlocks.length || toIdx >= block.innerBlocks.length) return;
	pushHistory();
	const [moved] = block.innerBlocks.splice(fromIdx, 1);
	block.innerBlocks.splice(toIdx, 0, moved);
	render();
	selectBlock(blockId);
}

// 혼합 블록에 기존 캔버스 블록을 이동 (드래그 앤 드롭)
function addMixInnerBlockFromExisting(mixBlockId, sourceBlockId) {
	const mixBlock = state.blocks.find(b => b.id === mixBlockId);
	const sourceBlock = state.blocks.find(b => b.id === sourceBlockId);
	if (!mixBlock || !sourceBlock) return;
	if (!MIX_ALLOWED.has(templateCategories[sourceBlock.type])) return;
	pushHistory();
	if (!Array.isArray(mixBlock.innerBlocks)) mixBlock.innerBlocks = [];
	mixBlock.innerBlocks.push({
		type: sourceBlock.type,
		marginBottom: sourceBlock.marginBottom ?? 30,
		items: cloneData(sourceBlock.items || [])
	});
	state.blocks = state.blocks.filter(b => b.id !== sourceBlockId);
	render();
	selectBlock(mixBlockId);
}

// 혼합 블록에서 내부 블록 제거
function removeMixInnerBlock(blockId, innerIdx) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !Array.isArray(block.innerBlocks)) return;
	pushHistory();
	block.innerBlocks.splice(innerIdx, 1);
	render();
	selectBlock(blockId);
}

// title-list 블록 list-wrap 리스트 설정 (새 블록 드래그)
function setListWrapBlock(listWrapId, type) {
	const m = typeof listWrapId === 'string' && listWrapId.match(/^(.+)::list::(\d+)$/);
	if (!m) return;
	const outerBlock = state.blocks.find(b => b.id === m[1]);
	if (!outerBlock) return;
	const colIdx = parseInt(m[2], 10);
	if (!outerBlock.items[colIdx]) return;
	const innerTemplate = componentTemplates[type];
	if (!innerTemplate) return;
	pushHistory();
	const innerData = innerTemplate.getDefaultData ? innerTemplate.getDefaultData() : {};
	outerBlock.items[colIdx].listBlock = {
		type,
		columns: 1,
		items: [{ ...cloneData(innerData), style: createStyleForType(type) }]
	};
	render();
	selectBlock(m[1]);
}

// title-list 블록 list-wrap에 기존 캔버스 블록 이동
function setListWrapFromExisting(listWrapId, sourceBlockId) {
	const m = typeof listWrapId === 'string' && listWrapId.match(/^(.+)::list::(\d+)$/);
	if (!m) return;
	const outerBlock = state.blocks.find(b => b.id === m[1]);
	const sourceBlock = state.blocks.find(b => b.id === sourceBlockId);
	if (!outerBlock || !sourceBlock) return;
	const colIdx = parseInt(m[2], 10);
	if (!outerBlock.items[colIdx]) return;
	if (templateCategories[sourceBlock.type] !== 'list') return;
	pushHistory();
	outerBlock.items[colIdx].listBlock = { type: sourceBlock.type, columns: sourceBlock.items.length || 1, items: cloneData(sourceBlock.items || []) };
	state.blocks = state.blocks.filter(b => b.id !== sourceBlockId);
	render();
	selectBlock(m[1]);
}

// title-list 블록 list-wrap 리스트 제거
function clearListWrapBlock(listWrapId) {
	const m = typeof listWrapId === 'string' && listWrapId.match(/^(.+)::list::(\d+)$/);
	if (!m) return;
	const outerBlock = state.blocks.find(b => b.id === m[1]);
	const colIdx = parseInt(m[2], 10);
	if (!outerBlock || !outerBlock.items[colIdx]) return;
	pushHistory();
	outerBlock.items[colIdx].listBlock = null;
	render();
	selectBlock(blockId);
}

// title-list 블록 리스트 사용 여부 토글
function updateBlockUseList(blockId, useList) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistory();
	block.useList = useList;
	render();
	selectBlock(blockId);
}

function duplicateBlock(blockId) {
	duplicateBlockAt(blockId, blockId, 'after');
}

function duplicateBlockAt(blockId, targetBlockId, position = 'after') {
	if (_duplicatingBlock) return;
	const index = state.blocks.findIndex(b => b.id === blockId);
	if (index < 0) return;
	_duplicatingBlock = true;
	pushHistory();
	const cloned = cloneData(state.blocks[index]);
	cloned.id = `block-${state.nextBlockId++}`;
	const targetIndex = targetBlockId
		? state.blocks.findIndex(b => b.id === targetBlockId)
		: state.blocks.length - 1;
	if (targetIndex >= 0) {
		state.blocks.splice(targetIndex + (position === 'before' ? 0 : 1), 0, cloned);
	} else {
		state.blocks.push(cloned);
	}
	render();
	_duplicatingBlock = false;
	const newEl = canvasGrid.querySelector(`[data-block-id="${cloned.id}"]`);
	if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	selectBlock(cloned.id);
}

function updateBlockColumns(blockId, count) {
	const listRef = resolveListInnerRef(blockId);
	if (listRef) {
		const { listBlock } = listRef;
		pushHistory();
		listBlock.columns = Number(count) || 1;
		syncListBlockItems(listBlock);
		render();
		return;
	}
	const block = state.blocks.find(item => item.id === blockId);
	if (!block) return;
	pushHistory();
	block.columns = Number(count) || 1;
	syncBlockItems(block);
	render();
}

function syncBlockItems(block) {
	const template = componentTemplates[block.type];
	const source = block.items[0] || (template.getDefaultData ? template.getDefaultData() : {});
	const hasTitleListWrap = templateCategories[block.type] === 'title-list' && template.element?.querySelector('.list-wrap');
	while (block.items.length < block.columns) {
		const idx = block.items.length;
		const posDefaults = template.addWrapDefaultData?.[idx] || {};
		const newItem = { ...cloneData(source), ...posDefaults, style: createStyleForType(block.type) };
		if (hasTitleListWrap) newItem.listBlock = null;
		block.items.push(newItem);
	}
	if (block.items.length > block.columns) block.items = block.items.slice(0, block.columns);
}

function syncListBlockItems(listBlock) {
	const template = componentTemplates[listBlock.type];
	const source = listBlock.items[0] || (template?.getDefaultData ? template.getDefaultData() : {});
	while (listBlock.items.length < listBlock.columns) {
		listBlock.items.push({ ...cloneData(source), style: createStyleForType(listBlock.type) });
	}
	if (listBlock.items.length > listBlock.columns) listBlock.items = listBlock.items.slice(0, listBlock.columns);
}

function clearCanvas() {
	pushHistory();
	state.blocks = [];
	state.nextBlockId = 1;
	state.dragPayload = '';
	state.overlays = [];
	clearOptionsPanel();
	renderOverlayItems();
	render();
}

function showConfirmModal({ title, message, confirmText = '확인', cancelText = '취소' }) {
	return new Promise(resolve => {
		const layer = document.createElement('div');
		layer.className = 'klic-confirm-layer';
		layer.innerHTML = `
			<div class="klic-confirm-backdrop" data-confirm-cancel></div>
			<div class="klic-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="klicConfirmTitle">
				<div class="klic-confirm-icon"><i class="ri-error-warning-line" aria-hidden="true"></i></div>
				<strong id="klicConfirmTitle">${escapeHtml(title)}</strong>
				<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
				<div class="klic-confirm-actions">
					<button type="button" class="ghost-button" data-confirm-cancel>${escapeHtml(cancelText)}</button>
					<button type="button" class="primary-button" data-confirm-ok>${escapeHtml(confirmText)}</button>
				</div>
			</div>`;
		const close = value => {
			document.removeEventListener('keydown', onKeydown);
			layer.remove();
			resolve(value);
		};
		const onKeydown = event => {
			if (event.key === 'Escape') close(false);
		};
		layer.querySelectorAll('[data-confirm-cancel]').forEach(el => el.addEventListener('click', () => close(false)));
		layer.querySelector('[data-confirm-ok]')?.addEventListener('click', () => close(true));
		document.addEventListener('keydown', onKeydown);
		document.body.appendChild(layer);
		layer.querySelector('[data-confirm-ok]')?.focus();
	});
}

function bindBuilderExitConfirm() {
	if (window.__goalBuilderExitConfirmBound === true) return;
	window.__goalBuilderExitConfirmBound = true;
	const getBuilderExitText = () => {
		const rawTitle = document.querySelector('.topbar-title-link strong')?.textContent?.trim() || '교육목표 빌더';
		const title = rawTitle.replace(/\s*빌더\s*$/, '');
		return {
			title: `${title} 빌더를 종료할까요?`,
			message: `${title} 빌더로 작성된 내용이 있습니다.\n다른 편집기로 수정하면 빌더 구조가 삭제되어 복원할 수 없습니다.`
		};
	};
	const confirmExit = async href => {
		if (!((state.blocks && state.blocks.length) || (state.overlays && state.overlays.length))) {
			if (href) window.location.href = href;
			else if (window.parent !== window) window.parent.postMessage({ type: 'builderExitConfirmed' }, '*');
			else window.history.back();
			return true;
		}
		const text = getBuilderExitText();
		const ok = await showConfirmModal({
			title: text.title,
			message: text.message,
			confirmText: '종료',
			cancelText: '취소'
		});
		if (!ok) return false;
		if (href) window.location.href = href;
		else if (window.parent !== window) window.parent.postMessage({ type: 'builderExitConfirmed' }, '*');
		else window.history.back();
		return true;
	};
	window.confirmBuilderExit = confirmExit;
	window.showGoalBuilderExitConfirm = confirmExit;
	const handleExitClick = event => {
		const target = event.target.closest('.topbar-title-link, .topbar-brand a, [data-builder-exit], #builderClose, #builderExit');
		if (!target) return;
		const href = target.getAttribute('href');
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
		confirmExit(href);
	};
	document.addEventListener('click', handleExitClick, true);
	if (window.parent !== window) {
		window.parent.postMessage({ type: 'builderExitConfirmReady' }, '*');
	}
	window.addEventListener('message', event => {
		if (!event.data || !['builderExitRequest', 'requestBuilderExit', 'confirmBuilderExit'].includes(event.data.type)) return;
		confirmExit(event.data.href || '');
	});
}

// ── 템플릿 경로 헬퍼 ─────────────────────────────────────
function getTemplateBasePath(id) {
	return templateBasePaths[id] || `${TEMPLATE_DIR}${id}`;
}

// ── 썸네일 ──────────────────────────────────────────────
function getThumbUrl(templateId) {
	return `${getTemplateBasePath(templateId)}/screenshot.png`;
}

function getDecorationImageUrl(template) {
	const img = template?.element?.querySelector('img[src]');
	return img ? normalizeAssetPath(img.getAttribute('src')) : `${getTemplateBasePath(template.id)}/char.png`;
}

function loadCustomDecorations() {
	try {
		const raw = localStorage.getItem(CUSTOM_DECORATION_STORAGE_KEY);
		const items = raw ? JSON.parse(raw) : [];
		state.customDecorations = Array.isArray(items)
			? items.filter(item => item && item.id && item.src)
			: [];
	} catch (error) {
		state.customDecorations = [];
	}
}

function saveCustomDecorations() {
	localStorage.setItem(CUSTOM_DECORATION_STORAGE_KEY, JSON.stringify(state.customDecorations));
}

function getCustomDecoration(id) {
	return state.customDecorations.find(item => item.id === id);
}

function renderDecorationUploadControls() {
	return `
		<div class="decoration-upload">
			<input type="file" id="customDecorationUpload" accept="image/*" hidden>
			<button type="button" class="decoration-upload-button" id="customDecorationUploadButton">
				<i class="ri-upload-2-line" aria-hidden="true"></i>
				꾸밈요소 업로드
			</button>
		</div>
	`;
}

function renderCustomDecorationItems() {
	return state.customDecorations.map(item => `
		<div class="component-item component-item--decoration component-item--custom-decoration"
			draggable="true"
			data-decoration="true"
			data-custom-decoration-id="${escapeAttr(item.id)}">
			<div class="component-thumb" aria-hidden="true">
				<img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.name || '사용자 꾸밈요소')}" class="component-thumb-img">
			</div>
			<button type="button" class="custom-decoration-remove" data-custom-decoration-remove="${escapeAttr(item.id)}" aria-label="사용자 꾸밈요소 삭제">
				<i class="ri-close-line" aria-hidden="true"></i>
			</button>
			<button type="button" class="component-add-btn" aria-label="${escapeAttr(item.name || item.id)} 추가">
				<i class="ri-add-line" aria-hidden="true"></i>
			</button>
		</div>
	`).join('');
}

function bindDecorationUploadEvents() {
	const input = document.getElementById('customDecorationUpload');
	const button = document.getElementById('customDecorationUploadButton');
	if (!input || !button) return;
	button.addEventListener('click', () => input.click());
	input.addEventListener('change', () => {
		const files = Array.from(input.files || []).filter(file => file.type.startsWith('image/'));
		if (!files.length) return;
		files.forEach(file => {
			const reader = new FileReader();
			reader.onload = () => {
				state.customDecorations.unshift({
					id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
					name: file.name.replace(/\.[^.]+$/, ''),
					src: String(reader.result || '')
				});
				saveCustomDecorations();
				renderDecorationPanel();
			};
			reader.readAsDataURL(file);
		});
		input.value = '';
	});
}

function renderComponentList() {
	const templates = Object.values(componentTemplates).filter(template => {
		const category = templateCategories[template.id] || 'box';
		if (!SHOW_MIX_BLOCKS && category === 'mix') return false;
		if (category === 'design-template') return false;
		if (category === 'design-template-section') return false;
		if (category === 'decoration') return false; // 꾸밈 스튜디오 탭에서 별도 표시
		if (state.templateFilter === 'all') return true;
		if (state.templateFilter === 'content') {
			if (!CONTENT_CATEGORIES.has(category)) return false;
			return state.templateSubFilter ? category === state.templateSubFilter : true;
		}
		return category === state.templateFilter;
	});

	if (!templates.length) {
		componentList.classList.add('is-empty-state');
		componentList.innerHTML = '<p class="template-empty">해당 필터의 디자인 블록이 없습니다.</p>';
		bindComponentEvents(componentList);
		return;
	}

	componentList.classList.remove('is-empty-state');
	componentList.innerHTML = templates.map(t => `
		<div class="component-item" draggable="true" data-type="${t.id}">
			<div class="component-thumb component-thumb--loading" aria-hidden="true"></div>
			<button type="button" class="component-add-btn" aria-label="${t.id} 추가">
				<i class="ri-add-line" aria-hidden="true"></i>
			</button>
		</div>`).join('');
	bindComponentEvents(componentList);

	for (const template of templates) {
		const item = componentList.querySelector(`[data-type="${template.id}"]`);
		if (!item) continue;
		const thumb = item.querySelector('.component-thumb');
		thumb.classList.remove('component-thumb--loading');
		const img = document.createElement('img');
		img.src = getThumbUrl(template.id);
		img.alt = template.id;
		img.className = 'component-thumb-img';
		img.onerror = () => {
			thumb.innerHTML = '<div class="mix-thumb-placeholder">이미지 없음</div>';
		};
		thumb.appendChild(img);
	}
}

function renderDesignTemplateList() {
	const panel = document.getElementById('panelTemplates');
	if (!panel) return;
	const filterBar = document.querySelector('[data-tab-filter="templates"] .design-template-filters');
	if (filterBar) {
		filterBar.innerHTML = DESIGN_TEMPLATE_FILTERS.map(filter => `
			<button type="button" class="${state.designTemplateFilter === filter.id ? 'is-active' : ''}"
				data-design-template-filter="${escapeAttr(filter.id)}">${escapeHtml(filter.label)}</button>
		`).join('');
		bindDesignTemplateFilterEvents(filterBar.closest('.filter-scroll-shell') || filterBar);
	}
	const templates = Object.values(componentTemplates).filter(template => {
		if ((templateCategories[template.id] || '') !== 'design-template') return false;
		if (state.designTemplateFilter === 'all') return true;
		const filters = Array.isArray(template.templateFilters) ? template.templateFilters : [];
		return filters.includes(state.designTemplateFilter);
	});

	const filtersHtml = `<div class="filter-scroll-shell">
		<div class="component-filters design-template-filters" aria-label="디자인 템플릿 필터">
			${DESIGN_TEMPLATE_FILTERS.map(filter => `
				<button type="button" class="${state.designTemplateFilter === filter.id ? 'is-active' : ''}"
					data-design-template-filter="${escapeAttr(filter.id)}">${escapeHtml(filter.label)}</button>
			`).join('')}
		</div>
	</div>`;

	if (!templates.length) {
		panel.classList.add('is-empty-state');
		panel.innerHTML = `${filtersHtml}<p class="template-empty">디자인 템플릿이 없습니다.</p>`;
		bindDesignTemplateFilterEvents(panel);
		return;
	}

	panel.classList.remove('is-empty-state', 'sidebar-ready-panel');
	panel.innerHTML = `${filtersHtml}<div class="component-list design-template-list" id="designTemplateList" aria-label="디자인 템플릿 목록">
		${templates.map(t => `
			<div class="component-item component-item--design-template" draggable="true" data-type="${escapeAttr(t.id)}">
				<div class="component-thumb" aria-hidden="true">
					<img src="${escapeAttr(getThumbUrl(t.id))}" alt="${escapeAttr(t.id)}" class="component-thumb-img">
				</div>
				<button type="button" class="component-add-btn" aria-label="${escapeAttr(t.id)} 추가">
					<i class="ri-add-line" aria-hidden="true"></i>
				</button>
			</div>
		`).join('')}
	</div>`;
	bindDesignTemplateFilterEvents(panel);
	bindComponentEvents(panel);
}

function bindDesignTemplateFilterEvents(panel) {
	KlicBuilderShared.bindScrollableFilters(panel);
	KlicBuilderShared.bindFilterEvents({
		container: panel,
		onDesignTemplateFilter: filter => {
			state.designTemplateFilter = filter;
			renderDesignTemplateList();
		}
	});
}

function renderDecorationPanel() {
	// ── 필터 탭 ──
	const filtersEl = document.getElementById('decoFilters');
	if (filtersEl) {
		filtersEl.innerHTML = DECORATION_FILTERS.map(f => `
			<button type="button" class="deco-filter-btn${state.decorationFilter === f.id ? ' is-active' : ''}"
				data-deco-filter="${escapeHtml(f.id)}">${escapeHtml(f.label)}</button>
		`).join('');
		const panel = document.getElementById('panelDecoration') || filtersEl.parentElement || document;
		KlicBuilderShared.bindScrollableFilters(panel);
		KlicBuilderShared.bindFilterEvents({
			container: panel,
			onDecoFilter: filter => {
				state.decorationFilter = filter;
				renderDecorationPanel();
			}
		});
	}

	// ── 아이템 그리드 ──
	const panelEl = document.getElementById('decorationPanel');
	if (!panelEl) return;

	const decorationTemplates = Object.values(componentTemplates).filter(t => {
		if ((templateCategories[t.id] || '') !== 'decoration') return false;
		if (state.decorationFilter === 'all') return true;
		return getDecorationCategory(t.id) === state.decorationFilter;
	});

	const showCustom = state.decorationFilter === 'all' || state.decorationFilter === 'etc';
	const customItemsHtml = showCustom ? renderCustomDecorationItems() : '';

	if (!decorationTemplates.length && !customItemsHtml) {
		panelEl.classList.add('is-empty');
		panelEl.innerHTML = '<p class="template-empty deco-empty">꾸밈요소가 없습니다.</p>';
	} else {
		panelEl.classList.remove('is-empty');
		panelEl.innerHTML = customItemsHtml + decorationTemplates.map(t => `
			<div class="component-item component-item--decoration" draggable="true" data-type="${t.id}" data-decoration="true">
				<div class="component-thumb component-thumb--loading" aria-hidden="true"></div>
				<button type="button" class="component-add-btn" aria-label="${t.id} 추가">
					<i class="ri-add-line" aria-hidden="true"></i>
				</button>
			</div>`).join('');
	}

	// ── 업로드 버튼 (맨 아래 고정) ──
	const uploadEl = document.getElementById('decoUploadArea');
	if (uploadEl) {
		uploadEl.innerHTML = '';
		uploadEl.hidden = true;
	}

	bindComponentEvents(panelEl);

	for (const t of decorationTemplates) {
		const item = panelEl.querySelector(`[data-type="${t.id}"]`);
		if (!item) continue;
		const thumb = item.querySelector('.component-thumb');
		thumb.classList.remove('component-thumb--loading');
		thumb.innerHTML = `<img src="${escapeAttr(getDecorationImageUrl(t))}" alt="${t.id}" class="component-thumb-img">`;
	}
}

function getTemplateRecommend(templateOrId) {
	const template = typeof templateOrId === 'string' ? componentTemplates[templateOrId] : templateOrId;
	return template?.recommend || {};
}

function asRecommendTokens(value) {
	if (!value) return [];
	if (Array.isArray(value)) return value.map(item => String(item).toLowerCase());
	return [String(value).toLowerCase()];
}

function getCanvasRecommendTokens() {
	const tokens = [];
	state.blocks.forEach(block => {
		const meta = getTemplateRecommend(block.type);
		tokens.push(
			...asRecommendTokens(meta.category),
			...asRecommendTokens(meta.colors),
			...asRecommendTokens(meta.tone),
			...asRecommendTokens(meta.style),
			...asRecommendTokens(meta.keywords),
			...asRecommendTokens(meta.matchWith)
		);
	});
	return tokens;
}

function getCanvasPrimaryColors() {
	return state.blocks
		.map(block => asRecommendTokens(getTemplateRecommend(block.type).colors)[0])
		.filter(Boolean);
}

function scoreRecommendedTemplate(template) {
	const meta = getTemplateRecommend(template);
	const tokens = getCanvasRecommendTokens();
	const primaryColors = getCanvasPrimaryColors();
	const colors = asRecommendTokens(meta.colors);
	const ownTokens = [
		...asRecommendTokens(meta.category),
		...colors,
		...asRecommendTokens(meta.tone),
		...asRecommendTokens(meta.style),
		...asRecommendTokens(meta.keywords),
		...asRecommendTokens(meta.matchWith)
	];
	const overlap = ownTokens.reduce((score, token) => score + (tokens.includes(token) ? 1 : 0), 0);
	const primaryColorScore = primaryColors.includes(colors[0]) ? 100 : (colors.some(color => primaryColors.includes(color)) ? 20 : 0);
	const category = templateCategories[template.id] || '';
	const alreadyUsed = state.blocks.some(block => block.type === template.id);
	const usedCategoryCount = state.blocks.filter(block => (templateCategories[block.type] || '') === category).length;
	return primaryColorScore + overlap * 10 + (alreadyUsed ? -12 : 0) + (usedCategoryCount ? 1 : 5);
}

function getRecommendedBlocks(limit = 12) {
	return Object.values(componentTemplates)
		.filter(template => {
			const category = templateCategories[template.id] || 'box';
			if (!SHOW_MIX_BLOCKS && category === 'mix') return false;
			return category !== 'decoration' && category !== 'design-template' && category !== 'design-template-section' && category !== 'divider';
		})
		.sort((a, b) => scoreRecommendedTemplate(b) - scoreRecommendedTemplate(a) || a.id.localeCompare(b.id))
		.slice(0, limit);
}

function getRecommendedDecorations(limit = 12) {
	return Object.values(componentTemplates)
		.filter(template => (templateCategories[template.id] || '') === 'decoration')
		.sort((a, b) => scoreRecommendedTemplate(b) - scoreRecommendedTemplate(a) || a.id.localeCompare(b.id))
		.slice(0, limit);
}

function getRecommendedIcons(limit = 18) {
	const tokens = getCanvasRecommendTokens();
	const icons = ICON_CATEGORIES.flatMap(cat => {
		const catTokens = [cat.id, cat.label].filter(Boolean).map(item => String(item).toLowerCase());
		if (cat.groups?.length) {
			return cat.groups.flatMap(group => (group.icons || []).map(icon => ({
				...icon,
				_scoreTokens: [...catTokens, group.id, group.label, icon.name].filter(Boolean).map(item => String(item).toLowerCase())
			})));
		}
		return (cat.icons || []).map(icon => ({
			...icon,
			_scoreTokens: [...catTokens, icon.name].filter(Boolean).map(item => String(item).toLowerCase())
		}));
	});
	return icons
		.sort((a, b) => {
			const score = icon => icon._scoreTokens.reduce((sum, token) => sum + (tokens.some(base => token.includes(base) || base.includes(token)) ? 1 : 0), 0);
			return score(b) - score(a) || String(a.name || '').localeCompare(String(b.name || ''));
		})
		.slice(0, limit);
}

function getPanelCenterPoint() {
	const grid = document.getElementById('canvasGrid');
	const wrapper = document.getElementById('canvasWrapper');
	if (!grid || !wrapper) return { x: 100, y: 100 };
	const gRect = grid.getBoundingClientRect();
	const wRect = wrapper.getBoundingClientRect();
	return {
		x: Math.max(0, (wRect.left + wRect.width / 2) - gRect.left - 60),
		y: Math.max(0, (wRect.top + wRect.height / 2) - gRect.top - 60)
	};
}

function createRecommendationPanel() {
	let panel = document.getElementById('recommendPanel');
	if (panel) return panel;
	panel = document.createElement('aside');
	panel.id = 'recommendPanel';
	panel.className = 'recommend-panel';
	panel.dataset.recommendTab = 'blocks';
	panel.dataset.initialOffset = 'true';
	panel.innerHTML = `
		<div class="recommend-panel-head" data-recommend-drag-handle>
			<strong>추천디자인</strong>
			<button type="button" class="recommend-close" aria-label="추천디자인 닫기">
				<i class="ri-close-line" aria-hidden="true"></i>
			</button>
		</div>
		<div class="filter-scroll-shell recommend-tab-shell">
			<div class="component-filters recommend-tabs" role="tablist">
				<button type="button" class="is-active" data-recommend-tab="blocks">디자인블록</button>
				<button type="button" data-recommend-tab="decorations">꾸밈스튜디오</button>
			</div>
		</div>
		<div class="recommend-list"></div>
	`;
	document.body.appendChild(panel);
	bindRecommendationPanel(panel);
	return panel;
}

function bindRecommendationPanel(panel) {
	panel.querySelector('.recommend-close')?.addEventListener('click', () => {
		panel.dataset.dismissed = 'true';
		panel.dataset.wasOpened = 'true';
		panel.classList.remove('is-open');
		updateRecommendFab();
	});
	panel.querySelectorAll('[data-recommend-tab]').forEach(button => {
		button.addEventListener('click', () => {
			panel.dataset.recommendTab = button.dataset.recommendTab;
			panel.querySelectorAll('[data-recommend-tab]').forEach(btn => {
				btn.classList.toggle('is-active', btn === button);
			});
			renderRecommendationPanel();
		});
	});

	const handle = panel.querySelector('[data-recommend-drag-handle]');
	let dragging = false;
	let startX = 0;
	let startY = 0;
	let startLeft = 0;
	let startTop = 0;
	handle?.addEventListener('pointerdown', event => {
		if (event.button !== 0 || event.target.closest('button')) return;
		dragging = true;
		startX = event.clientX;
		startY = event.clientY;
		const rect = panel.getBoundingClientRect();
		startLeft = rect.left;
		startTop = rect.top;
		panel.classList.add('is-dragging');
		handle.setPointerCapture?.(event.pointerId);
	});
	handle?.addEventListener('pointermove', event => {
		if (!dragging) return;
		const width = panel.offsetWidth;
		const height = panel.offsetHeight;
		const left = Math.max(8, Math.min(window.innerWidth - width - 8, startLeft + event.clientX - startX));
		const top = Math.max(8, Math.min(window.innerHeight - height - 8, startTop + event.clientY - startY));
		panel.style.left = `${left}px`;
		panel.style.top = `${top}px`;
		panel.style.right = 'auto';
		panel.dataset.userPosition = 'true';
	});
	const stopDrag = event => {
		if (!dragging) return;
		dragging = false;
		panel.classList.remove('is-dragging');
		handle.releasePointerCapture?.(event.pointerId);
	};
	handle?.addEventListener('pointerup', stopDrag);
	handle?.addEventListener('pointercancel', stopDrag);
}

function shouldShowRecommendationPanel() {
	// 추천디자인 기능 임시 비활성화
	return false;
	// return state.sidebarTab === 'blocks' && state.blocks.length >= 2 && !document.body.classList.contains('preview-mode');
}

function positionRecommendationPanel(panel) {
	if (!panel || panel.dataset.userPosition === 'true') return;
	const anchor = document.querySelector('.right-col') || document.getElementById('canvasWrapper');
	if (!anchor) return;
	const rect = anchor.getBoundingClientRect();
	const width = panel.offsetWidth || 272;
	const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left - width - 8));
	let top = Math.max(8, rect.top);
	if (panel.dataset.initialOffset === 'true') {
		top = top + 10;
		delete panel.dataset.initialOffset;
	}
	panel.style.left = `${left}px`;
	panel.style.top = `${top}px`;
	panel.style.right = 'auto';
	panel.dataset.hasPosition = 'true';
}

function updateRecommendFab() {
	const button = document.getElementById('recommendPanelOpen');
	if (!button) return;
	const panel = document.getElementById('recommendPanel');
	const panelOpen = panel?.classList.contains('is-open');
	const showButton = shouldShowRecommendationPanel() && !panelOpen;
	button.hidden = !showButton;
}

function openRecommendationPanel() {
	const panel = createRecommendationPanel();
	panel.dataset.dismissed = 'false';
	panel.dataset.wasOpened = 'true';
	panel.classList.add('is-open');
	if (panel.dataset.hasPosition !== 'true') {
		positionRecommendationPanel(panel);
	}
	renderRecommendationPanel();
	updateRecommendFab();
}

function renderRecommendationPanel() {
	const shouldShow = shouldShowRecommendationPanel();
	if (!shouldShow) {
		const panel = document.getElementById('recommendPanel');
		if (panel) {
			panel.classList.remove('is-open');
		}
		updateRecommendFab();
		return;
	}
	const panel = createRecommendationPanel();
	panel.classList.remove('is-open');
	panel.dataset.dismissed = 'true';
	updateRecommendFab();

	const list = panel.querySelector('.recommend-list');
	if (!list) return;
	const tab = panel.dataset.recommendTab === 'decorations' ? 'decorations' : 'blocks';
	panel.dataset.recommendTab = tab;
	if (panel.dataset.initialOffset === 'true') {
		positionRecommendationPanel(panel);
	}
	if (tab === 'decorations') {
		const decorations = getRecommendedDecorations();
		list.innerHTML = decorations.length ? decorations.map(template => `
			<button type="button" class="recommend-item component-item component-item--decoration" data-recommend-decoration="${escapeAttr(template.id)}">
				<span class="component-thumb">
					<img src="${escapeAttr(getDecorationImageUrl(template))}" alt="${escapeAttr(template.id)}" class="component-thumb-img">
				</span>
				<span class="component-add-btn" aria-hidden="true">
					<i class="ri-add-line" aria-hidden="true"></i>
				</span>
			</button>
		`).join('') : '<p class="recommend-empty">추천 꾸밈요소가 없습니다.</p>';
		list.querySelectorAll('[data-recommend-decoration]').forEach(button => {
			button.addEventListener('click', event => {
				event.preventDefault();
				event.stopPropagation();
				const pos = getPanelCenterPoint();
				addOverlay(button.dataset.recommendDecoration, pos.x, pos.y);
			});
		});
		return;
	}
	const blocks = getRecommendedBlocks();
	list.innerHTML = blocks.map(template => `
		<button type="button" class="recommend-item component-item" data-recommend-block="${escapeAttr(template.id)}">
			<span class="component-thumb">
				<img src="${escapeAttr(getThumbUrl(template.id))}" alt="${escapeAttr(template.id)}" class="component-thumb-img">
			</span>
			<span class="component-add-btn" aria-hidden="true">
				<i class="ri-add-line" aria-hidden="true"></i>
			</span>
		</button>
	`).join('');
	list.querySelectorAll('[data-recommend-block]').forEach(button => {
		button.addEventListener('click', event => {
			event.preventDefault();
			addBlock(button.dataset.recommendBlock);
			const panel = document.getElementById('recommendPanel');
			if (panel) panel.classList.add('is-open');
		});
	});
}

function applyRecommendedIcon(src, name) {
	const selected = state.selectedItem;
	if (!selected || selected.columnIndex === null) return;
	const item = findItemByBlockId(selected.blockId, selected.columnIndex);
	if (!item || !Object.prototype.hasOwnProperty.call(item, 'icon')) return;
	pushHistory();
	item.icon = `<img src="${escapeAttr(src)}" alt="${escapeAttr(name || '아이콘')}" class="block-icon-img">`;
	render();
}

function switchSidebarTab(tab) {
	state.sidebarTab = tab;
	document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
		btn.classList.toggle('is-active', btn.dataset.sidebarTab === tab);
	});
	const panelTemplates = document.getElementById('panelTemplates');
	const panelBlocks = document.getElementById('panelBlocks');
	const panelCustom = document.getElementById('panelCustom');
	if (panelTemplates) panelTemplates.classList.toggle('is-hidden', tab !== 'templates');
	if (panelBlocks) panelBlocks.classList.toggle('is-hidden', tab !== 'blocks');
	if (panelCustom) panelCustom.classList.toggle('is-hidden', tab !== 'custom');
	renderRecommendationPanel();
}

function openDecoStudio() {
	if (state.previewDevice !== 'pc') return;
	document.body.classList.add('deco-studio-open');
	renderDecorationPanel();
}

function closeDecoStudio() {
	document.querySelector('.sidebar')?.classList.remove('deco-studio-open');
	document.body.classList.remove('deco-studio-open');
}

function relocateDecoStudioDrawer() {
	const drawer = document.getElementById('decoStudioDrawer');
	if (drawer && drawer.parentElement !== document.body) {
		document.body.appendChild(drawer);
	}
}

function initDecoStudio() {
	const drawer = document.getElementById('decoStudioDrawer');
	if (!drawer) return;
	const head = drawer.querySelector('.deco-studio-head');
	const resizeHandle = document.getElementById('decoResizeW');

	let drag = null, resize = null;

	function ensurePositioned() {
		if (drawer.classList.contains('is-dragged')) return;
		const rect = drawer.getBoundingClientRect();
		drawer.classList.add('is-dragged');
		drawer.style.left   = rect.left   + 'px';
		drawer.style.top    = rect.top    + 'px';
		drawer.style.right  = 'auto';
		drawer.style.bottom = 'auto';
		drawer.style.height = rect.height + 'px';
	}

	// ── 드래그 ──
	head.addEventListener('mousedown', e => {
		if (e.button !== 0 || e.target.closest('button')) return;
		ensurePositioned();
		const rect = drawer.getBoundingClientRect();
		drag = { ox: e.clientX - rect.left, oy: e.clientY - rect.top };
		drawer.style.transition = 'none';
		e.preventDefault();
	});

	// ── 좌측 리사이즈 ──
	if (resizeHandle) {
		resizeHandle.addEventListener('mousedown', e => {
			if (e.button !== 0) return;
			ensurePositioned();
			const rect = drawer.getBoundingClientRect();
			resize = { sx: e.clientX, sw: rect.width, re: rect.right };
			resizeHandle.classList.add('is-resizing');
			drawer.style.transition = 'none';
			e.preventDefault();
			e.stopPropagation();
		});
	}

	document.addEventListener('mousemove', e => {
		if (drag) {
			drawer.style.left = (e.clientX - drag.ox) + 'px';
			drawer.style.top  = (e.clientY - drag.oy) + 'px';
		}
		if (resize) {
			const dx = resize.sx - e.clientX;
			const w  = Math.max(240, Math.min(600, resize.sw + dx));
			drawer.style.width = w + 'px';
			drawer.style.left  = (resize.re - w) + 'px';
		}
	});

	document.addEventListener('mouseup', () => {
		drag = null;
		if (resize) {
			resizeHandle?.classList.remove('is-resizing');
			resize = null;
		}
	});
}

function updateDecoStudioAvailability() {
	const button = document.getElementById('decoStudioOpen');
	const recommendButton = document.getElementById('recommendPanelOpen');
	const disabled = state.previewDevice !== 'pc';
	if (button) {
		button.classList.toggle('is-disabled', disabled);
		button.setAttribute('aria-disabled', String(disabled));
		button.setAttribute(
			'aria-label',
			disabled ? '태블릿·모바일 모드에서는\n꾸밈 스튜디오를 사용할 수 없습니다' : '꾸밈 스튜디오 열기'
		);
	}
	if (disabled) closeDecoStudio();

	// update tooltip fixed-position vars when disabled so it can escape overflow clipping
	try {
		const btn = document.getElementById('decoStudioOpen');
		if (btn && disabled) {
			setDecoTooltipFixedPosition(btn);
			document.documentElement.classList.add('deco-tooltip-fixed');
		} else {
			document.documentElement.classList.remove('deco-tooltip-fixed');
		}
	} catch (e) { /* ignore */ }
}

function setDecoTooltipFixedPosition(btn) {
    const rect = btn.getBoundingClientRect();
    const top = rect.top + rect.height / 2;
    const left = rect.left - 12; // place tooltip to left of button
    document.documentElement.style.setProperty('--deco-tooltip-top', `${top}px`);
    document.documentElement.style.setProperty('--deco-tooltip-left', `${left}px`);
}

window.addEventListener('resize', () => {
    const btn = document.getElementById('decoStudioOpen');
    if (btn && btn.getAttribute('aria-disabled') === 'true') setDecoTooltipFixedPosition(btn);
});

// Ensure hover shows tooltip for disabled deco button by adding a class and reusing the existing pseudo-element style.
function attachDecoTooltipHover() {
	const btn = document.getElementById('decoStudioOpen');
	if (!btn) return;
	btn.addEventListener('mouseenter', () => {
		if (btn.getAttribute('aria-disabled') === 'true') {
			setDecoTooltipFixedPosition(btn);
			document.documentElement.classList.add('deco-tooltip-hover');
		}
	});
	btn.addEventListener('mouseleave', () => {
		document.documentElement.classList.remove('deco-tooltip-hover');
	});
}

// try attach immediately; if scripts run before DOM ready, defer
if (document.readyState === 'complete' || document.readyState === 'interactive') {
	attachDecoTooltipHover();
} else {
	window.addEventListener('DOMContentLoaded', attachDecoTooltipHover);
}

function bindFilterEvents() {
	const sidebar = document.querySelector('.sidebar') || document;
	KlicBuilderShared.bindFilterEvents({
		container: sidebar,
		onBlockFilter: switchFilterTab
	});
	KlicBuilderShared.bindScrollableFilters(sidebar);

	const subWrap = document.getElementById('contentSubfilterWrap');
	if (subWrap) {
		subWrap.addEventListener('click', e => {
			const btn = e.target.closest('[data-content-subfilter]');
			if (!btn) return;
			state.templateSubFilter = btn.dataset.contentSubfilter;
			subWrap.querySelectorAll('[data-content-subfilter]').forEach(b => {
				b.classList.toggle('is-active', b === btn);
			});
			renderComponentList();
		});
	}
}

function activateFilterButton(button) {
	if (!button) return;
	if (button.dataset.templateFilter) {
		switchFilterTab(button.dataset.templateFilter);
		return;
	}
	if (button.dataset.decoFilter) {
		state.decorationFilter = button.dataset.decoFilter;
		renderDecorationPanel();
	}
}

function initFilterScrollUI() {
	document.querySelectorAll('.filter-scroll-shell').forEach(shell => {
		const scroller = shell.querySelector('.component-filters, .deco-filters');
		if (!scroller || scroller.dataset.scrollUiBound === 'true') return;
		scroller.dataset.scrollUiBound = 'true';

		const updateEdges = () => {
			const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
			shell.classList.toggle('is-start', scroller.scrollLeft <= 1);
			shell.classList.toggle('is-end', scroller.scrollLeft >= max - 1);
			shell.classList.toggle('is-scrollable', max > 1);
		};

		let dragging = false;
		let didDrag = false;
		let startX = 0;
		let startLeft = 0;
		let pressButton = null;
		let suppressNextClick = false;

		scroller.addEventListener('pointerdown', event => {
			if (event.button !== 0) return;
			dragging = true;
			didDrag = false;
			startX = event.clientX;
			startLeft = scroller.scrollLeft;
			pressButton = event.target.closest('[data-template-filter], [data-deco-filter]');
			scroller.setPointerCapture?.(event.pointerId);
		});
		scroller.addEventListener('pointermove', event => {
			if (!dragging) return;
			const delta = event.clientX - startX;
			if (!didDrag && Math.abs(delta) < 5) return;
			didDrag = true;
			scroller.classList.add('is-dragging');
			event.preventDefault();
			scroller.scrollLeft = startLeft - (event.clientX - startX);
		});
		const stopDrag = event => {
			if (!dragging) return;
			const clickedButton = !didDrag ? pressButton : null;
			if (!didDrag && pressButton) {
				suppressNextClick = true;
			}
			dragging = false;
			pressButton = null;
			scroller.classList.remove('is-dragging');
			scroller.releasePointerCapture?.(event.pointerId);
			if (clickedButton) activateFilterButton(clickedButton);
		};
		scroller.addEventListener('click', event => {
			if (suppressNextClick) {
				event.preventDefault();
				event.stopPropagation();
				suppressNextClick = false;
				return;
			}
			if (!didDrag) return;
			event.preventDefault();
			event.stopPropagation();
			didDrag = false;
		}, true);
		scroller.addEventListener('dragstart', event => event.preventDefault());
		scroller.addEventListener('pointerup', stopDrag);
		scroller.addEventListener('pointercancel', stopDrag);
		scroller.addEventListener('mouseleave', () => {
			dragging = false;
			didDrag = false;
			pressButton = null;
			scroller.classList.remove('is-dragging');
		});
		scroller.addEventListener('wheel', event => {
			if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
			event.preventDefault();
			scroller.scrollLeft += event.deltaY;
		}, { passive: false });
		scroller.addEventListener('scroll', updateEdges);
		new ResizeObserver(updateEdges).observe(scroller);
		requestAnimationFrame(updateEdges);
	});
}


function applyItemStyles(container, item, template) {
	const so = template?.styleOptions;
	if (!so) return;
	const style = getColumnStyle(item);
	Object.entries(so).forEach(([targetKey, targetConfig]) => {
		if (targetKey === 'title' || targetKey === 'body') return;
		const cssClass = targetConfig.cssClass;
		if (!cssClass) return;
		container.querySelectorAll(cssClass).forEach(el => {
			(targetConfig.fields || []).forEach(f => {
				const val = style[`${targetKey}${f.key.charAt(0).toUpperCase()}${f.key.slice(1)}`];
				if (val == null) return;
				if (f.key === 'backgroundColor') el.style.backgroundColor = val;
				else if (f.key === 'textColor') el.style.color = val;
				else if (f.key === 'borderColor') el.style.borderColor = val;
			});
			const fw = style[`${targetKey}FontWeight`];
			const fs = style[`${targetKey}FontSize`];
			if (fw) el.style.fontWeight = fw;
			if (fs) el.style.fontSize = `${fs}px`;
		});
	});
}

function reapplyAllIconSizes() {
	state.blocks.forEach(block => {
		block.items.forEach((item, colIdx) => {
			if (!item.iconWidth && !item.iconHeight) return;
			applyIconSizeToDom(block.id, colIdx, item.iconWidth, item.iconHeight);
		});
	});
}

function applyAllTemplateStyles() {
	state.blocks.forEach(block => {
		const template = componentTemplates[block.type];
		const blockEl = document.querySelector(`.builder-block[data-block-id="${block.id}"]`);
		if (!blockEl) return;
		// 외부 블록 아이템 스타일 적용 (list-wrap 내부 .block-item 제외)
		const outerItems = Array.from(blockEl.querySelectorAll('.block-item')).filter(el => {
			const bid = el.dataset.blockId || '';
			return !bid.match(/::list::\d+$/);
		});
		block.items.forEach((item, idx) => {
			if (outerItems[idx]) applyItemStyles(outerItems[idx], item, template);
		});
		// title-list 블록 list-wrap 내부 스타일 적용 (행별 독립)
		if (block.useList) {
			const listWraps = Array.from(blockEl.querySelectorAll('.list-wrap'));
			listWraps.forEach((listWrap, wrapIdx) => {
				const rowItem = block.items[wrapIdx];
				if (!rowItem || !rowItem.listBlock) return;
				const listTemplate = componentTemplates[rowItem.listBlock.type];
				if (!listTemplate) return;
				const innerItems = listWrap.querySelectorAll('.block-item');
				rowItem.listBlock.items.forEach((lb_item, idx) => {
					if (innerItems[idx]) applyItemStyles(innerItems[idx], lb_item, listTemplate);
				});
			});
		}
	});
}

function updateItemColorStyleTag() {
	const styleEl = document.getElementById('klicItemColors');
	if (!styleEl) return;
	document.head.appendChild(styleEl); // 템플릿 CSS link보다 뒤에 위치하도록 이동
	const rules = [];
	state.blocks.forEach(block => {
		const template = componentTemplates[block.type];
		if (!template || template.isRootWrap) return;
		if (!template.element.querySelector('.add-wrap')) return;
		block.items.forEach((item, idx) => {
			const props = [];
			if (item.itemBg)     props.push(`--body-bg: ${item.itemBg}`);
			if (item.itemText)   props.push(`--body-text: ${item.itemText}`);
			if (item.itemBorder) props.push(`--body-border: ${item.itemBorder}`);
			if (props.length) {
				rules.push(`div[data-item-block-id="${block.id}"][data-item-idx="${idx}"] { ${props.join('; ')} }`);
			}
		});
	});
	styleEl.textContent = rules.join('\n');
}

function syncCanvasPresence() {
	const hasBlocks = state.blocks.length > 0;
	const hasOverlays = state.overlays.length > 0;
	layoutStatus.textContent = hasOverlays
		? `${state.blocks.length}개 블록 · ${state.overlays.length}개 꾸밈요소`
		: `${state.blocks.length}개 블록`;
	const builderMain = document.getElementById('builderMain');
	builderMain.classList.toggle('has-blocks', hasBlocks);
	builderMain.classList.toggle('has-overlays', hasOverlays);
	builderMain.classList.toggle('has-selection', !!state.selectedItem);
	return { hasBlocks, hasOverlays };
}

function syncCanvasGuideSize() {
	const guide = document.querySelector('.canvas-guide');
	if (!guide || !canvasGrid) return;
	const wrapper = document.getElementById('canvasWrapper');
	if (!wrapper) return;
	const wrapperHeight = wrapper.clientHeight;
	const gridBottom = canvasGrid.offsetTop + canvasGrid.offsetHeight;
	guide.style.height = `calc(${Math.max(gridBottom, wrapperHeight)}px + 2.5rem)`;
}

function render() {
	const { hasBlocks, hasOverlays } = syncCanvasPresence();
	canvasGrid.className = hasBlocks ? 'canvas-grid' : 'canvas-grid is-empty';
	canvasGrid.innerHTML = hasBlocks
		? state.blocks.map((block, idx) => renderBuilderBlock(block, idx, state.blocks.length)).join('')
		: hasOverlays
			? ''
		: '<div class="canvas-empty">왼쪽 디자인 블록을 여기로 드래그하세요</div>';
	bindRenderedEvents();
	updateItemColorStyleTag();
	applyAllTemplateStyles();
	reapplyAllIconSizes();
	syncCanvasGuideSize();
	updateMarkup();
	renderRecommendationPanel();
	if (state.selectedItem) {
		const { blockId, columnIndex } = state.selectedItem;
		const block = state.blocks.find(b => b.id === blockId);
		if (block && (columnIndex === null || block.items[columnIndex])) {
			if (columnIndex !== null) {
				const el = document.querySelector(`.block-item[data-block-id="${blockId}"][data-column-index="${columnIndex}"]`);
				if (el) el.classList.add('is-selected');
			} else {
				const blockEl = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
				if (blockEl) blockEl.classList.add('is-selected');
			}
			renderOptionsPanel(blockId, columnIndex);
		} else {
			clearOptionsPanel();
		}
	}
}

function renderBuilderBlock(block, idx = 0, total = 1) {
	const template = componentTemplates[block.type];
	if (!template) {
		console.warn(`알 수 없는 블록 타입이라 렌더링을 건너뜁니다: "${block.type}" (block-id: ${block.id})`);
		return '';
	}
	const effectiveMargin = (total <= 1 || idx === total - 1) ? 0 : (block.marginBottom ?? 30);
	return `
		<section class="builder-block" draggable="true" data-block-id="${block.id}" style="margin-bottom:${effectiveMargin}px${block.blockWidth ? `;--block-width:${block.blockWidth}` : ''}">
			<div class="block-controls" aria-hidden="true">
				<div class="drag-handle" data-tooltip="이동"><i class="ri-draggable" aria-hidden="true"></i></div>
				<button type="button" class="block-duplicate" data-tooltip="복사" data-duplicate-block-id="${block.id}" aria-label="블록 복사">
					<i class="ri-file-copy-line" aria-hidden="true"></i>
				</button>
				<button type="button" class="block-remove" data-tooltip="삭제" data-remove-block-id="${block.id}" aria-label="블록 삭제">
					<i class="ri-close-line" aria-hidden="true"></i>
				</button>
			</div>
			<div class="${template.isRootWrap ? (template.addDirection === 'row' ? `builder-columns columns-${block.columns}` : `builder-rows rows-${block.columns}`) : ''}">
				${renderRepeatedColumns(block)}
			</div>
		</section>
	`;
}

function renderAddColumnWrapElement(template, item, block, columnIndex, editable) {
	const source = template.addRowWrap;
	const el = source.cloneNode(true);
	Array.from(el.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-')) {
			el.removeAttribute(attr.name);
		}
	});
	el.querySelectorAll('[data-edit-field]').forEach(field => {
		if (template.editListLiTemplate && field.closest('.edit-list')) return;
		const fieldName = field.dataset.editField;
		setFieldContent(field, item[fieldName] || '');
		if (editable && block) {
			field.dataset.blockId = block.id;
			field.dataset.columnIndex = String(columnIndex);
			return;
		}
		field.removeAttribute('data-edit-field');
	});
	if (template.editListLiTemplate) {
		renderEditListInElement(el, template.editListTemplates, item, block, columnIndex, editable);
	}
	// title-list: list-wrap .inner 표시/숨김 처리
	if (block && templateCategories[block.type] === 'title-list') {
		const listWrapEl = el.querySelector('.list-wrap');
		if (listWrapEl) {
			const listWrapId = `${block.id}::list::${columnIndex}`;
			if (editable) listWrapEl.dataset.listBlockId = listWrapId;
			const innerEl = listWrapEl.querySelector('.inner');
			const rowListBlock = item.listBlock ?? null;
			if (!block.useList) {
				if (innerEl) innerEl.remove();
			} else if (rowListBlock) {
				const listTemplate = componentTemplates[rowListBlock.type];
				if (listTemplate) {
					const fakeBlock = {
						id: listWrapId,
						type: rowListBlock.type,
						columns: rowListBlock.items.length || 1,
						items: rowListBlock.items
					};
					const rendered = buildColumnBlock(listTemplate, fakeBlock, editable);
					const renderedHtml = typeof rendered === 'string' ? rendered : elementToHtml(rendered);
					listWrapEl.innerHTML = editable
						? `<div class="inner list-wrap-inner">
							<button type="button" class="list-wrap-remove" data-list-block-id="${listWrapId}" aria-label="리스트 제거"><i class="ri-close-line"></i></button>
							${renderedHtml}
						</div>`
						: `<div class="inner">${renderedHtml}</div>`;
				}
			} else if (!editable) {
				if (innerEl) innerEl.innerHTML = '';
			}
		}
	}
	if (!editable) stripEditorAttributes(el);
	return el;
}

function getEditListItems(item) {
	return Object.keys(item)
		.filter(k => /^item\d+$/.test(k))
		.sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4)))
		.map(k => ({ key: k, value: item[k] }));
}

function getSubListItems(item, parentKey) {
	const prefix = parentKey + '_';
	return Object.keys(item)
		.filter(k => k.startsWith(prefix) && /^\d+$/.test(k.slice(prefix.length)))
		.sort((a, b) => parseInt(a.slice(prefix.length)) - parseInt(b.slice(prefix.length)))
		.map(k => ({ key: k, value: item[k] }));
}

function collectSubTree(item, key) {
	return {
		value: item[key],
		children: getSubListItems(item, key).map(sub => collectSubTree(item, sub.key))
	};
}

function writeSubTree(item, tree, newKey) {
	item[newKey] = tree.value;
	tree.children.forEach((child, i) => writeSubTree(item, child, `${newKey}_${i + 1}`));
}

function renderListLevel(ulEl, templates, depth, item, parentKey, block, columnIndex, editable) {
	const liTemplate = (templates[depth] ?? templates[templates.length - 1])?.liEl;
	if (!liTemplate) return;
	const entries = parentKey === null ? getEditListItems(item) : getSubListItems(item, parentKey);
	if (!entries.length) return;
	ulEl.innerHTML = '';
	const nextTpl = depth + 1 < EDIT_LIST_MAX_DEPTH
		? (templates[depth + 1] ?? templates[templates.length - 1] ?? null)
		: null;
	entries.forEach(entry => {
		const li = liTemplate.cloneNode(false);
		const subEntries = nextTpl ? getSubListItems(item, entry.key) : [];
		if (nextTpl && subEntries.length > 0) {
			const textSpan = document.createElement('span');
			textSpan.className = 'list-item-text';
			textSpan.innerHTML = entry.value;
			if (editable && block) {
				textSpan.dataset.editField = entry.key;
				textSpan.dataset.blockId = block.id;
				textSpan.dataset.columnIndex = String(columnIndex);
			}
			li.appendChild(textSpan);
			const nestedUl = nextTpl.ulEl.cloneNode(false);
			nestedUl.dataset.depth = String(depth + 2);
			const lsN = block?.listStyles?.[depth + 1] || '';
			if (lsN) nestedUl.classList.add(`ls-${lsN}`);
			renderListLevel(nestedUl, templates, depth + 1, item, entry.key, block, columnIndex, editable);
			li.appendChild(nestedUl);
			if (editable && block) {
				li.dataset.editField = entry.key;
				li.dataset.blockId = block.id;
				li.dataset.columnIndex = String(columnIndex);
			}
		} else {
			const leafSpan = document.createElement('span');
			leafSpan.className = 'list-item-text';
			leafSpan.innerHTML = entry.value;
			if (editable && block) {
				leafSpan.dataset.editField = entry.key;
				leafSpan.dataset.blockId = block.id;
				leafSpan.dataset.columnIndex = String(columnIndex);
				li.dataset.editField = entry.key;
				li.dataset.blockId = block.id;
				li.dataset.columnIndex = String(columnIndex);
			}
			li.appendChild(leafSpan);
		}
		// li 템플릿의 비(非)-목록 자식 요소 복제 (블록 단위 편집 필드 포함)
		Array.from(liTemplate.children).forEach(child => {
			if (child.classList.contains('edit-list')) return;
			const cloned = child.cloneNode(true);
			[cloned, ...Array.from(cloned.querySelectorAll('[data-edit-field]'))].forEach(f => {
				if (!f.dataset.editField) return;
				setFieldContent(f, item[f.dataset.editField] || '');
				if (editable && block) {
					f.dataset.blockId = block.id;
					f.dataset.columnIndex = String(columnIndex);
				} else {
					f.removeAttribute('data-edit-field');
				}
			});
			li.appendChild(cloned);
		});
		ulEl.appendChild(li);
	});
}

function renderEditListInElement(outerEl, editListTemplates, item, block, columnIndex, editable) {
	const editList = outerEl.querySelector('.edit-list');
	if (!editList || !editListTemplates?.length) return;
	if (!getEditListItems(item).length) return;
	editList.dataset.depth = '1';
	const ls = block?.listStyles?.[0] || block?.listStyle || '';
	if (ls) editList.classList.add(`ls-${ls}`);
	// 뎁스별 색상 변수 모두 루트 ul에 설정 (상속으로 하위 ul까지 도달)
	const colors = block?.bulletColors || ['', '', ''];
	[1, 2, 3].forEach(d => {
		const c = colors[d - 1] || (d === 1 ? block?.bulletColor || '' : '');
		if (c) editList.style.setProperty(`--ls-color-${d}`, c);
		else editList.style.removeProperty(`--ls-color-${d}`);
	});
	// 뎁스별 커스텀 마커 prefix/suffix 변수 설정
	const formats = block?.listFormats || ['', '', ''];
	[1, 2, 3].forEach(d => {
		const { prefix: p, suffix: s } = parseListFormat(formats[d - 1] || '');
		if (p) editList.style.setProperty(`--ls-prefix-${d}`, `"${p}"`);
		else editList.style.removeProperty(`--ls-prefix-${d}`);
		if (s) editList.style.setProperty(`--ls-suffix-${d}`, `"${s}"`);
		else editList.style.removeProperty(`--ls-suffix-${d}`);
	});
	renderListLevel(editList, editListTemplates, 0, item, null, block, columnIndex, editable);
}

function addChildListItem(blockId, columnIndex, parentFieldKey) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !block.items[columnIndex]) return;
	pushHistory();
	const item = block.items[columnIndex];
	const currentChildren = getSubListItems(item, parentFieldKey);
	item[`${parentFieldKey}_${currentChildren.length + 1}`] = '새 항목';
	// 해당 depth가 처음 열릴 때 템플릿 기본 스타일/색상 자동 적용
	const newDepth = parentFieldKey.split('_').length; // item1 → 1, item1_1 → 2
	const template = componentTemplates[block.type];
	const tpls = template?.editListTemplates || [];
	const tplUl = (tpls[newDepth] ?? tpls[tpls.length - 1])?.ulEl;
	if (tplUl && !block.listStyles[newDepth]) {
		const lsCls = Array.from(tplUl.classList).find(c => c.startsWith('ls-'));
		if (lsCls) block.listStyles[newDepth] = lsCls.slice(3);
	}
	render();
}

function addListItem(blockId, columnIndex, afterFieldKey) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !block.items[columnIndex]) return;
	pushHistory();
	const item = block.items[columnIndex];
	const isSubItem = /^item\d+(_\d+)+$/.test(afterFieldKey);
	if (isSubItem) {
		const parentKey = afterFieldKey.slice(0, afterFieldKey.lastIndexOf('_'));
		const siblings = getSubListItems(item, parentKey);
		const withTrees = siblings.map(s => collectSubTree(item, s.key));
		const idx = siblings.findIndex(s => s.key === afterFieldKey);
		withTrees.splice(idx + 1, 0, { value: '새 항목', children: [] });
		Object.keys(item).filter(k => k.startsWith(parentKey + '_')).forEach(k => delete item[k]);
		withTrees.forEach((t, i) => writeSubTree(item, t, `${parentKey}_${i + 1}`));
	} else {
		const tops = getEditListItems(item);
		const withTrees = tops.map(t => collectSubTree(item, t.key));
		const idx = tops.findIndex(t => t.key === afterFieldKey);
		withTrees.splice(idx + 1, 0, { value: '새 항목', children: [] });
		Object.keys(item).filter(k => /^item\d+(_\d+)*$/.test(k)).forEach(k => delete item[k]);
		withTrees.forEach((t, i) => writeSubTree(item, t, `item${i + 1}`));
	}
	render();
}

function deleteListItem(blockId, columnIndex, fieldKey) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !block.items[columnIndex]) return;
	const item = block.items[columnIndex];
	const isSubItem = /^item\d+(_\d+)+$/.test(fieldKey);
	if (isSubItem) {
		const parentKey = fieldKey.slice(0, fieldKey.lastIndexOf('_'));
		const siblings = getSubListItems(item, parentKey);
		pushHistory();
		if (siblings.length <= 1) {
			// 마지막 sub-item: 부모 li의 중첩 ul 자체를 제거
			Object.keys(item).filter(k => k.startsWith(parentKey + '_')).forEach(k => delete item[k]);
		} else {
			const remaining = siblings.filter(s => s.key !== fieldKey).map(s => collectSubTree(item, s.key));
			Object.keys(item).filter(k => k.startsWith(parentKey + '_')).forEach(k => delete item[k]);
			remaining.forEach((t, i) => writeSubTree(item, t, `${parentKey}_${i + 1}`));
		}
	} else {
		const outerEntries = getEditListItems(item);
		if (outerEntries.length <= 1) return;
		pushHistory();
		const remaining = outerEntries.filter(e => e.key !== fieldKey).map(e => collectSubTree(item, e.key));
		Object.keys(item).filter(k => /^item\d+(_\d+)*$/.test(k)).forEach(k => delete item[k]);
		remaining.forEach((t, i) => writeSubTree(item, t, `item${i + 1}`));
	}
	render();
}

function renderRepeatedColumns(block) {
	const template = componentTemplates[block.type];

	if (template.isRootWrap) {
		return block.items.map((item, index) => {
			const el = renderAddColumnWrapElement(template, item, block, index, true);
			const templateEl = el.querySelector('[data-template-id]') || el;
			applyColumnStyle(templateEl, item);
			applyFieldStyleClasses(el, item);
			el.classList.add('block-item');
			el.dataset.blockId = block.id;
			el.dataset.columnIndex = String(index);
			return elementToHtml(el);
		}).join('');
	}

	return buildColumnBlock(template, block, true);
}

function buildColumnBlock(template, block, editable) {
	const outer = template.element.cloneNode(true);
	Array.from(outer.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-')) {
			outer.removeAttribute(attr.name);
		}
	});
	applyColumnStyle(outer, block.items[0] || {});
	// list/box의 columns-N 처럼, mix류(.add-wrap 반복)도 개수별 반응형 CSS를 걸 수 있도록 item-N 부여
	outer.classList.add(`item-${block.items.length}`);
	// config.json의 addDirection(row/column)을 그대로 노출 — row/column별로 다른 공통 CSS(구분선 등)를 걸 수 있게
	outer.classList.add(`item-${template.addDirection === 'row' ? 'row' : 'column'}`);

	if (editable) {
		outer.classList.add('block-item');
		outer.dataset.blockId = block.id;
		outer.dataset.columnIndex = '0';
	}

	const addColEls = Array.from(outer.querySelectorAll('.add-wrap'));
	const addColEl = addColEls[0] || null;
	if (addColEl) {
		outer.querySelectorAll('[data-edit-field]').forEach(field => {
			if (addColEls.some(el => el === field || el.contains(field))) return;
			const fieldName = field.dataset.editField;
			setFieldContent(field, (block.items[0] || {})[fieldName] || '');
			if (editable) {
				field.dataset.blockId = block.id;
				field.dataset.columnIndex = '0';
			} else {
				field.removeAttribute('data-edit-field');
			}
		});

		const fragment = document.createDocumentFragment();
		block.items.forEach((item, idx) => {
			const el = template.addRowWrap.cloneNode(true);
			el.querySelectorAll('[data-edit-field]').forEach(field => {
				if (template.editListLiTemplate && field.closest('.edit-list')) return;
				const fieldName = field.dataset.editField;
				setFieldContent(field, item[fieldName] || '');
				if (editable) {
					field.dataset.blockId = block.id;
					field.dataset.columnIndex = String(idx);
				} else {
					field.removeAttribute('data-edit-field');
				}
			});
			if (template.editListLiTemplate) {
				renderEditListInElement(el, template.editListTemplates, item, block, idx, editable);
			}
			if (editable) {
				el.dataset.itemBlockId = block.id;
				el.dataset.itemIdx = String(idx);
			}
			// Apply per-item CSS vars to each row element
			applyColumnStyle(el, item);
			if (editable) applyFieldStyleClasses(el, item);
			if (!editable) stripEditorAttributes(el);
			fragment.appendChild(el);
		});
		addColEl.replaceWith(fragment);
		// 미리 나눠진 나머지 add-wrap 제거
		addColEls.slice(1).forEach(el => el.remove());
	} else {
		outer.querySelectorAll('[data-edit-field]').forEach(field => {
			const fieldName = field.dataset.editField;
			setFieldContent(field, (block.items[0] || {})[fieldName] || '');
			if (editable) {
				field.dataset.blockId = block.id;
				field.dataset.columnIndex = '0';
			} else {
				field.removeAttribute('data-edit-field');
			}
		});
		if (editable) applyFieldStyleClasses(outer, block.items[0] || {});
	}

	// 혼합 블록: .mix-inner-slot 처리 (복수 내부 블록 지원)
	if (block && templateCategories[block.type] === 'mix') {
		const slotEl = outer.querySelector('.mix-inner-slot');
		if (slotEl) {
			const innerBlocks = block.innerBlocks || [];
			if (innerBlocks.length > 0) {
				slotEl.innerHTML = innerBlocks.map((ib, idx) => {
					const innerTemplate = componentTemplates[ib.type];
					if (!innerTemplate) return '';
					if (editable) {
						// 복합 ID로 editable 렌더링 → 텍스트 편집·색상 옵션 활성화
						const innerBlockId = `${block.id}::inner::${idx}`;
						const fakeBlock = { id: innerBlockId, type: ib.type, columns: ib.items.length || 1, items: ib.items };
						const innerHtml = buildColumnBlock(innerTemplate, fakeBlock, true);
						const mbStyle = ib.marginBottom != null ? ` style="margin-bottom:${ib.marginBottom}px"` : '';
						return `<div class="mix-inner-item" draggable="true" data-mix-block-id="${block.id}" data-mix-inner-idx="${idx}"${mbStyle}>
							<div class="mix-inner-drag-handle" title="드래그해서 순서 변경"><i class="ri-draggable"></i></div>
							<button type="button" class="mix-inner-remove" data-mix-block-id="${block.id}" data-mix-inner-idx="${idx}" aria-label="내부 블록 제거"><i class="ri-close-line"></i></button>
							${innerHtml}
						</div>`;
					} else {
						const fakeBlock = { id: `${block.id}-inner-${idx}`, type: ib.type, columns: ib.items.length || 1, items: ib.items };
						const innerEl = buildColumnBlock(innerTemplate, fakeBlock, false);
						const mbStyle = ib.marginBottom != null ? ` style="margin-bottom:${ib.marginBottom}px"` : '';
						return `<div class="mix-inner-item"${mbStyle}>${elementToHtml(innerEl)}</div>`;
					}
				}).join('');
			} else if (editable) {
				// 빈 슬롯: 빨간 점선 + 안내 문구
				slotEl.classList.add('mix-slot-empty');
				slotEl.innerHTML = '<div class="mix-slot-placeholder"><i class="ri-add-circle-line"></i> 디자인 블록을 드래그해서 넣으세요.</div>';
			}
			if (editable) {
				slotEl.dataset.mixBlockId = block.id;
			}
		}
	}

	// title-list 블록: .list-wrap 처리 (column-direction 템플릿용, items[0] 기준)
	if (block && templateCategories[block.type] === 'title-list') {
		const listWrapEl = outer.querySelector('.list-wrap');
		if (listWrapEl) {
			const listWrapId = `${block.id}::list::0`;
			if (editable) listWrapEl.dataset.listBlockId = listWrapId;
			const innerEl = listWrapEl.querySelector('.inner');
			const rowListBlock = block.items[0]?.listBlock ?? null;
			if (!block.useList) {
				if (innerEl) innerEl.remove();
			} else if (rowListBlock) {
				const listTemplate = componentTemplates[rowListBlock.type];
				if (listTemplate) {
					const fakeBlock = {
						id: listWrapId,
						type: rowListBlock.type,
						columns: rowListBlock.items.length || 1,
						items: rowListBlock.items
					};
					const renderedHtml = buildColumnBlock(listTemplate, fakeBlock, editable);
					const rendered = typeof renderedHtml === 'string' ? renderedHtml : elementToHtml(renderedHtml);
					listWrapEl.innerHTML = editable
						? `<div class="inner list-wrap-inner">
							<button type="button" class="list-wrap-remove" data-list-block-id="${listWrapId}" aria-label="리스트 제거"><i class="ri-close-line"></i></button>
							${rendered}
						</div>`
						: `<div class="inner">${rendered}</div>`;
				}
			} else if (!editable) {
				if (innerEl) innerEl.innerHTML = '';
			}
		}
	}

	if (!editable) stripEditorAttributes(outer);
	return editable ? elementToHtml(outer) : outer;
}

function renderColumnOptions(block, item, columnIndex) {
	const style = getColumnStyle(item);
	const isDivider = templateCategories[block.type] === 'divider';
	if (isDivider) {
		return `
			<div class="column-options" aria-label="연결선 스타일 옵션">
				<select class="option-select" data-option-target>
					<option value="">옵션선택</option>
					<option value="connector">연결선옵션</option>
				</select>
				<div class="option-groups" hidden>
					<fieldset class="option-group" data-option-panel="connector" hidden>
						<legend>연결선옵션</legend>
						${renderConnectorControls(block, columnIndex, style)}
					</fieldset>
				</div>
			</div>
		`;
	}
	return `
		<div class="column-options" aria-label="${columnIndex + 1}단 스타일 옵션">
			<select class="option-select" data-option-target>
				<option value="">옵션선택</option>
				<option value="title">타이틀옵션</option>
				<option value="body">본문옵션</option>
			</select>
			<div class="option-groups" hidden>
				<fieldset class="option-group" data-option-panel="title" hidden>
					<legend>타이틀옵션</legend>
					${renderStyleControls(block, columnIndex, style, 'title')}
				</fieldset>
				<fieldset class="option-group" data-option-panel="body" hidden>
					<legend>본문옵션</legend>
					${renderStyleControls(block, columnIndex, style, 'body')}
				</fieldset>
			</div>
		</div>
	`;
}


let _iconDrawerTarget = null;
let _iconDrawerDelegatesBound = false;

function renderIconControls(blockId, columnIndex, item) {
	const w = item?.iconWidth ?? '';
	const h = item?.iconHeight ?? '';
	const locked = item?.iconLocked !== false;
	return `
	<div class="icon-control-panel">
	<div class="icon-size-row">
		<span class="icon-dim-label">가로</span>
		<input type="number" min="1" max="999" class="icon-size-input"
			data-icon-dim="width" data-block-id="${blockId}" data-column-index="${columnIndex}"
			value="${w}" placeholder="-" max="120">
		<span class="icon-dim-unit">px</span>
		<button type="button" class="icon-lock-btn${locked ? ' is-locked' : ''}"
			data-block-id="${blockId}" data-column-index="${columnIndex}"
			title="${locked ? '비율 고정 해제' : '비율 고정'}">
			<i class="${locked ? 'ri-lock-line' : 'ri-lock-unlock-line'}" aria-hidden="true"></i>
		</button>
		<span class="icon-dim-label">세로</span>
		<input type="number" min="1" max="999" class="icon-size-input"
			data-icon-dim="height" data-block-id="${blockId}" data-column-index="${columnIndex}"
			value="${h}" placeholder="-" max="120">
		<span class="icon-dim-unit">px</span>
	</div>
	<button type="button" class="icon-change-btn"
		data-block-id="${blockId}" data-column-index="${columnIndex}">
		<i class="ri-image-edit-line" aria-hidden="true"></i>
		아이콘 변경
	</button>
	</div>`;
}

function applyIconSizeToDom(blockId, colIdx, w, h) {
	const mixRef = resolveMixInnerRef(blockId);
	let imgEl;
	if (mixRef) {
		const section = document.querySelector(`.builder-block[data-block-id="${mixRef.outerBlock.id}"]`);
		const innerItem = section?.querySelector(`.mix-inner-item[data-mix-inner-idx="${mixRef.innerIdx}"]`);
		imgEl = innerItem?.querySelectorAll('.block-item')[colIdx]?.querySelector('.block-icon-img');
	} else {
		const blockEl = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
		imgEl = blockEl?.querySelector(`.block-item[data-column-index="${colIdx}"] .block-icon-img`)
			?? blockEl?.querySelector(`[data-edit-field="icon"][data-column-index="${colIdx}"] .block-icon-img`);
	}
	if (!imgEl) return;
	imgEl.style.width = w ? `${w}px` : '';
	imgEl.style.height = h ? `${h}px` : '';
	imgEl.style.maxWidth = (w || h) ? 'none' : '';
}

function getIconNaturalSize(blockId, colIdx) {
	const { imgEl } = getIconEditContext(blockId, colIdx);
	return {
		width: imgEl?.naturalWidth || 0,
		height: imgEl?.naturalHeight || 0
	};
}

function getIconRenderedSize(blockId, colIdx) {
	const { imgEl } = getIconEditContext(blockId, colIdx);
	if (!imgEl) return { width: 0, height: 0 };
	const rect = imgEl.getBoundingClientRect();
	return {
		width: Math.round(rect.width) || 0,
		height: Math.round(rect.height) || 0
	};
}

function syncIconSizeInputs(container, item) {
	const wInput = container.querySelector('.icon-size-input[data-icon-dim="width"]');
	const hInput = container.querySelector('.icon-size-input[data-icon-dim="height"]');
	if (wInput) wInput.value = item.iconWidth ?? '';
	if (hInput) hInput.value = item.iconHeight ?? '';
}

function getIconRestoreSize(blockId, colIdx, previousWidth, previousHeight) {
	const rendered = getIconRenderedSize(blockId, colIdx);
	const { width: natW, height: natH } = getIconNaturalSize(blockId, colIdx);
	return {
		width: previousWidth ?? (rendered.width && rendered.width <= 120 ? rendered.width : undefined) ?? (natW && natW <= 120 ? natW : undefined),
		height: previousHeight ?? (rendered.height && rendered.height <= 120 ? rendered.height : undefined) ?? (natH && natH <= 120 ? natH : undefined)
	};
}

function storeIconSizeRestorePoint(panel, item) {
	if (!panel || panel.dataset.restoreReady === 'true') return;
	panel.dataset.restoreReady = 'true';
	panel.dataset.restoreWidth = item.iconWidth ?? '';
	panel.dataset.restoreHeight = item.iconHeight ?? '';
}

function clearIconSizeRestorePoint(panel) {
	if (!panel) return;
	delete panel.dataset.restoreReady;
	delete panel.dataset.restoreWidth;
	delete panel.dataset.restoreHeight;
}

function readIconSizeRestorePoint(panel, blockId, colIdx, fallbackWidth, fallbackHeight) {
	if (!panel || panel.dataset.restoreReady !== 'true') {
		return getIconRestoreSize(blockId, colIdx, fallbackWidth, fallbackHeight);
	}
	const width = panel.dataset.restoreWidth === '' ? undefined : Number(panel.dataset.restoreWidth);
	const height = panel.dataset.restoreHeight === '' ? undefined : Number(panel.dataset.restoreHeight);
	return getIconRestoreSize(blockId, colIdx, width, height);
}

function getIconEditContext(blockId, colIdx) {
	const mixRef = resolveMixInnerRef(blockId);
	let blockEl;
	let scope;
	if (mixRef) {
		blockEl = document.querySelector(`.builder-block[data-block-id="${mixRef.outerBlock.id}"]`);
		scope = blockEl?.querySelector(`.mix-inner-item[data-mix-inner-idx="${mixRef.innerIdx}"]`);
	} else {
		blockEl = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
		scope = blockEl;
	}
	const itemEl = scope?.querySelector(`.block-item[data-column-index="${colIdx}"]`);
	const fieldEl = itemEl?.querySelector('[data-edit-field="icon"]')
		?? scope?.querySelector(`[data-edit-field="icon"][data-column-index="${colIdx}"]`);
	const imgEl = fieldEl?.querySelector('.block-icon-img');
	return { fieldEl, imgEl };
}

function showIconSizeLimitNotice(host, restore) {
	if (!host) {
		restore();
		return;
	}
	host.classList.add('icon-size-warning-host');
	host.querySelector('.icon-size-warning-layer')?.remove();
	const layer = document.createElement('div');
	layer.className = 'icon-size-warning-layer';
	layer.innerHTML = `
		<div class="icon-size-warning-box">
			<strong>아이콘 크기 제한</strong>
			<p>아이콘은 가로 120px, 세로 120px 이하로만 가능합니다.</p>
			<button type="button">확인</button>
		</div>
	`;
	host.appendChild(layer);
	const button = layer.querySelector('button');
	const confirm = event => {
		event.stopPropagation();
		layer.remove();
		host.classList.remove('icon-size-warning-host');
		restore();
	};
	button?.addEventListener('click', confirm, { once: true });
	layer.addEventListener('keydown', event => {
		if (event.key !== 'Enter') return;
		event.preventDefault();
		button?.click();
	});
	button?.focus();
}

function bindIconControls(container) {
	container.querySelectorAll('.icon-size-input').forEach(input => {
		input.addEventListener('focus', () => {
			const blockId = input.dataset.blockId;
			const colIdx = Number(input.dataset.columnIndex);
			const item = findItemByBlockId(blockId, colIdx);
			if (!item) return;
			storeIconSizeRestorePoint(input.closest('.icon-control-panel'), item);
		});
		input.addEventListener('blur', () => {
			if (!document.querySelector('.icon-size-warning-layer')) {
				clearIconSizeRestorePoint(input.closest('.icon-control-panel'));
			}
		});
		input.addEventListener('input', () => {
			const blockId = input.dataset.blockId;
			const colIdx = Number(input.dataset.columnIndex);
			const dim = input.dataset.iconDim;
			const noticeHost = input.closest('.icon-control-panel');
			const rawVal = input.value !== '' ? Number(input.value) : undefined;
			const item = findItemByBlockId(blockId, colIdx);
			if (!item) return;
			const previousWidth = item.iconWidth;
			const previousHeight = item.iconHeight;
			const restorePrevious = () => {
				const restoreSize = readIconSizeRestorePoint(noticeHost, blockId, colIdx, previousWidth, previousHeight);
				item.iconWidth = restoreSize.width;
				item.iconHeight = restoreSize.height;
				syncIconSizeInputs(container, item);
				applyIconSizeToDom(blockId, colIdx, item.iconWidth, item.iconHeight);
				updateMarkup();
				clearIconSizeRestorePoint(noticeHost);
			};
			const { imgEl } = getIconEditContext(blockId, colIdx);
			const natW = imgEl?.naturalWidth || 0;
			const natH = imgEl?.naturalHeight || 0;
			if (rawVal > 120) {
				showIconSizeLimitNotice(noticeHost, restorePrevious);
				return;
			}
			const val = rawVal !== undefined ? Math.max(1, rawVal) : undefined;
			const locked = item.iconLocked !== false;
			let nextWidth = item.iconWidth;
			let nextHeight = item.iconHeight;
			if (locked && val) {
				const baseW = natW || item.iconWidth;
				const baseH = natH || item.iconHeight;
				if (dim === 'width') {
					nextWidth = val;
					if (baseW && baseH) {
						nextHeight = Math.round(val * baseH / baseW);
					}
				} else {
					nextHeight = val;
					if (baseW && baseH) {
						nextWidth = Math.round(val * baseW / baseH);
					}
				}
			} else {
				if (dim === 'width') nextWidth = val;
				else nextHeight = val;
			}
			if ((nextWidth || 0) > 120 || (nextHeight || 0) > 120) {
				showIconSizeLimitNotice(noticeHost, restorePrevious);
				return;
			}
			item.iconWidth = nextWidth;
			item.iconHeight = nextHeight;
			if (locked && val) {
				syncIconSizeInputs(container, item);
			}
			applyIconSizeToDom(blockId, colIdx, item.iconWidth, item.iconHeight);
			updateMarkup();
		});
	});

	container.querySelectorAll('.icon-lock-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			const blockId = btn.dataset.blockId;
			const colIdx = Number(btn.dataset.columnIndex);
			const item = findItemByBlockId(blockId, colIdx);
			if (!item) return;
			item.iconLocked = item.iconLocked === false ? true : false;
			const locked = item.iconLocked !== false;
			if (locked) {
				const previousWidth = item.iconWidth;
				const previousHeight = item.iconHeight;
				const { width: natW, height: natH } = getIconNaturalSize(blockId, colIdx);
				const baseW = natW || item.iconWidth;
				const baseH = natH || item.iconHeight;
				if (baseW && baseH) {
					if (item.iconWidth) {
						item.iconHeight = Math.round(item.iconWidth * baseH / baseW);
					} else if (item.iconHeight) {
						item.iconWidth = Math.round(item.iconHeight * baseW / baseH);
					}
					if ((item.iconWidth || 0) > 120 || (item.iconHeight || 0) > 120) {
						item.iconWidth = previousWidth;
						item.iconHeight = previousHeight;
						showIconSizeLimitNotice(btn.closest('.icon-control-panel'), () => {
							item.iconWidth = previousWidth;
							item.iconHeight = previousHeight;
							syncIconSizeInputs(container, item);
							applyIconSizeToDom(blockId, colIdx, item.iconWidth, item.iconHeight);
							updateMarkup();
						});
					} else {
						syncIconSizeInputs(container, item);
						applyIconSizeToDom(blockId, colIdx, item.iconWidth, item.iconHeight);
						updateMarkup();
					}
				}
			}
			btn.classList.toggle('is-locked', locked);
			const icon = btn.querySelector('i');
			if (icon) icon.className = locked ? 'ri-lock-line' : 'ri-lock-unlock-line';
			btn.title = locked ? '비율 고정 해제' : '비율 고정';
		});
	});

	container.querySelectorAll('.icon-size-input').forEach(input => {
		if (input.value !== '') return;
		const blockId = input.dataset.blockId;
		const colIdx = Number(input.dataset.columnIndex);
		const dim = input.dataset.iconDim;
		const mixRef = resolveMixInnerRef(blockId);
		let imgEl;
		if (mixRef) {
			const section = document.querySelector(`.builder-block[data-block-id="${mixRef.outerBlock.id}"]`);
			const innerItem = section?.querySelector(`.mix-inner-item[data-mix-inner-idx="${mixRef.innerIdx}"]`);
			imgEl = innerItem?.querySelectorAll('.block-item')[colIdx]?.querySelector('.block-icon-img');
		} else {
			imgEl = document.querySelector(
				`.builder-block[data-block-id="${blockId}"] .block-item[data-column-index="${colIdx}"] .block-icon-img`
			);
		}
		if (!imgEl) return;
		const setNaturalPlaceholder = () => {
			const size = dim === 'width' ? imgEl.naturalWidth : imgEl.naturalHeight;
			if (size) input.placeholder = size;
		};
		if (imgEl.complete && imgEl.naturalWidth) {
			setNaturalPlaceholder();
		} else {
			imgEl.addEventListener('load', setNaturalPlaceholder, { once: true });
		}
	});
}

function openIconDrawerForField(field) {
	if (!field || document.body.classList.contains('preview-mode')) return;
	const blockItem = field.closest('.block-item');
	const blockId = field.dataset.blockId || blockItem?.dataset.blockId;
	const columnIndex = Number(field.dataset.columnIndex ?? blockItem?.dataset.columnIndex ?? 0);
	if (!blockId || Number.isNaN(columnIndex)) return;
	const imgEl = field.querySelector('img');
	const { catIndex, groupId } = imgEl ? findIconLocation(imgEl.src) : { catIndex: 0, groupId: null };
	openIconDrawer(catIndex, blockId, columnIndex, groupId);
}

function openIconDrawerFromButton(btn) {
	if (!btn || document.body.classList.contains('preview-mode')) return;
	const blockId = btn.dataset.blockId;
	const colIdx = Number(btn.dataset.columnIndex);
	if (!blockId || Number.isNaN(colIdx)) return;
	let iconLocation = { catIndex: 0, groupId: null };
	try {
		const { imgEl } = getIconEditContext(blockId, colIdx);
		if (imgEl) iconLocation = findIconLocation(imgEl.src);
	} catch (error) {
		console.warn('아이콘 위치를 찾지 못해 기본 목록을 엽니다.', error);
	}
	const { catIndex, groupId } = iconLocation;
	openIconDrawer(catIndex, blockId, colIdx, groupId);
}

function bindIconDrawerDelegates() {
	if (_iconDrawerDelegatesBound) return;
	_iconDrawerDelegatesBound = true;
	document.addEventListener('click', event => {
		const btn = event.target.closest('.icon-change-btn');
		if (!btn) return;
		event.preventDefault();
		event.stopPropagation();
		openIconDrawerFromButton(btn);
	}, true);
	document.addEventListener('dblclick', event => {
		const field = event.target.closest('[data-edit-field="icon"]');
		if (!field) return;
		event.preventDefault();
		event.stopPropagation();
		openIconDrawerForField(field);
	}, true);
}

async function openIconDrawer(categoryIndex, blockId, columnIndex, initialGroupId = null) {
	const drawer = document.getElementById('iconDrawer');
	const treeEl = document.getElementById('iconTree');
	const area = document.getElementById('iconGridArea');
	if (!drawer || !treeEl || !area) {
		console.warn('아이콘 패널 DOM을 찾을 수 없습니다.');
		return;
	}
	drawer.classList.add('is-open');
	drawer.querySelector('.icon-drawer-panel')?.classList.add('is-open');
	treeEl.innerHTML = '';
	area.innerHTML = '<p class="icon-grid-empty">아이콘 목록을 불러오는 중입니다.</p>';
	if (!ICON_CATEGORIES.length) await loadIconCategories();
	if (!ICON_CATEGORIES.length) {
		treeEl.innerHTML = '';
		area.innerHTML = '<p class="icon-grid-empty">아이콘 목록을 불러오지 못했습니다.</p>';
		return;
	}

	// 빨간 점선 — 기존 제거 후 새 대상에 추가
	document.querySelectorAll('[data-edit-field="icon"].icon-editing').forEach(el => el.classList.remove('icon-editing'));
	const targetIconEl = document.querySelector(
		`.builder-block[data-block-id="${blockId}"] [data-edit-field="icon"][data-block-id="${blockId}"][data-column-index="${columnIndex}"]`
	) || document.querySelector(
		`.builder-block[data-block-id="${blockId}"] .block-item[data-column-index="${columnIndex}"] [data-edit-field="icon"]`
	);
	if (targetIconEl) targetIconEl.classList.add('icon-editing');

	_iconDrawerTarget = { blockId, columnIndex };

	// ── 트리 렌더링 ──────────────────────────────────
	treeEl.innerHTML = ICON_CATEGORIES.map((cat, i) => {
		const hasGroups = cat.groups && cat.groups.length;
		return `
		<div class="icon-tree-cat${i === categoryIndex ? ' is-open' : ''}" data-cat-index="${i}">
			<button type="button" class="icon-tree-cat-btn">
				<span class="icon-tree-cat-label">${escapeHtml(cat.label)}</span>
				${hasGroups ? '<i class="ri-arrow-right-s-line icon-tree-arrow" aria-hidden="true"></i>' : ''}
			</button>
			${hasGroups ? `
			<ul class="icon-tree-group-list">
				${cat.groups.map(g => `
				<li>
					<button type="button" class="icon-tree-group-btn" data-cat-index="${i}" data-group-id="${escapeHtml(g.id)}">
						${escapeHtml(g.label)}
					</button>
				</li>`).join('')}
			</ul>` : ''}
		</div>`;
	}).join('');

	// 카테고리 토글
	treeEl.querySelectorAll('.icon-tree-cat-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			const catEl = btn.closest('.icon-tree-cat');
			const wasOpen = catEl.classList.contains('is-open');
			treeEl.querySelectorAll('.icon-tree-cat').forEach(el => el.classList.remove('is-open'));
			if (!wasOpen) {
				catEl.classList.add('is-open');
				const ci = Number(catEl.dataset.catIndex);
				const cat = ICON_CATEGORIES[ci];
				// 그룹 유무와 관계없이 카테고리 전체 아이콘 표시
				const allIcons = cat.groups
					? (cat.groups).flatMap(g => g.icons || [])
					: (cat.icons || []);
				renderIconGrid(allIcons);
			} else {
				clearIconGrid();
			}
		});
	});

	// 그룹 클릭 → 아이콘 그리드 표시
	treeEl.querySelectorAll('.icon-tree-group-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			treeEl.querySelectorAll('.icon-tree-group-btn').forEach(b => b.classList.remove('is-active'));
			btn.classList.add('is-active');
			const ci = Number(btn.dataset.catIndex);
			const gid = btn.dataset.groupId;
			const cat = ICON_CATEGORIES[ci];
			const group = cat.groups.find(g => g.id === gid);
			if (group) renderIconGrid(group.icons || []);
		});
	});

	// 초기 열린 카테고리 자동 처리
	if (categoryIndex >= 0) {
		const openCat = treeEl.querySelector(`.icon-tree-cat[data-cat-index="${categoryIndex}"]`);
		if (openCat) openCat.classList.add('is-open');
		const cat = ICON_CATEGORIES[categoryIndex];
		if (cat) {
			if (initialGroupId && cat.groups) {
				// 특정 그룹이 지정된 경우: 해당 그룹 선택 + 그리드 표시
				const groupBtn = treeEl.querySelector(`.icon-tree-group-btn[data-cat-index="${categoryIndex}"][data-group-id="${initialGroupId}"]`);
				if (groupBtn) groupBtn.classList.add('is-active');
				const group = cat.groups.find(g => g.id === initialGroupId);
				renderIconGrid(group ? group.icons || [] : []);
			} else {
				// 카테고리 타이틀만 열릴 때: 전체 아이콘 표시
				const allIcons = cat.groups
					? cat.groups.flatMap(g => g.icons || [])
					: (cat.icons || []);
				renderIconGrid(allIcons);
			}
		}
	}

	drawer.classList.add('is-open');
	drawer.querySelector('.icon-drawer-panel')?.classList.add('is-open');
}

function renderIconGrid(icons) {
	const area = document.getElementById('iconGridArea');
	if (!icons.length) {
		area.innerHTML = '<p class="icon-grid-empty">아이콘이 없습니다.</p>';
		return;
	}
	area.innerHTML = `<div class="icon-drawer-grid">
		${icons.map(icon => `
		<button type="button" class="icon-drawer-item" data-src="${escapeHtml(icon.src)}" data-name="${escapeHtml(icon.name || '')}">
			<img src="${escapeHtml(icon.src)}" alt="${escapeHtml(icon.name || '')}">
			<span>${escapeHtml(icon.name || '')}</span>
		</button>`).join('')}
	</div>`;
	area.querySelectorAll('.icon-drawer-item').forEach(btn => {
		btn.addEventListener('click', () => applyIconFromDrawer(btn.dataset.src, btn.dataset.name));
	});
}

function clearIconGrid() {
	const area = document.getElementById('iconGridArea');
	area.innerHTML = '<p class="icon-grid-empty">왼쪽에서 카테고리를 선택하세요.</p>';
}

function applyIconFromDrawer(src, name) {
	if (!_iconDrawerTarget) return;
	const { blockId, columnIndex } = _iconDrawerTarget;
	const item = findItemByBlockId(blockId, columnIndex);
	if (!item) return;
	pushHistory();
	item.icon = `<img src="${escapeAttr(normalizeBuilderAssetPath(src))}" alt="${escapeAttr(name || '아이콘')}" class="block-icon-img">`;
	closeIconDrawer();
	render();
}

function closeIconDrawer() {
	const drawer = document.getElementById('iconDrawer');
	drawer?.classList.remove('is-open');
	drawer?.querySelector('.icon-drawer-panel')?.classList.remove('is-open');
	// 빨간 점선 편집 표시 제거
	document.querySelectorAll('[data-edit-field="icon"].icon-editing').forEach(el => el.classList.remove('icon-editing'));
	_iconDrawerTarget = null;
}

function findIconLocation(src) {
	let path;
	try { path = new URL(src).pathname.replace(/^\//, ''); } catch { path = src; }
	path = normalizeBuilderAssetPath(path).replace(/^\//, '');
	for (let i = 0; i < ICON_CATEGORIES.length; i++) {
		const cat = ICON_CATEGORIES[i];
		if (cat.groups && cat.groups.length) {
			for (const g of cat.groups) {
				if ((g.icons || []).some(icon => normalizeBuilderAssetPath(icon.src).replace(/^\//, '') === path)) {
					return { catIndex: i, groupId: g.id };
				}
			}
		} else {
			if ((cat.icons || []).some(icon => normalizeBuilderAssetPath(icon.src).replace(/^\//, '') === path)) {
				return { catIndex: i, groupId: null };
			}
		}
	}
	return { catIndex: 0, groupId: null };
}

function renderConnectorControls(block, columnIndex, style) {
	const sizes = [
		{ value: '0.75', label: '소' },
		{ value: '1',    label: '중' },
		{ value: '1.5',  label: '대' },
		{ value: '2',    label: '특대' }
	];
	return `
		<label class="style-control" title="색상">
			<span>색상</span>
			<input type="color" value="${style.connectorColor}" data-style-field="connectorColor" data-block-id="${block.id}" data-column-index="${columnIndex}">
		</label>
		<label class="style-control" title="크기">
			<span>크기</span>
			<select data-style-field="connectorSize" data-block-id="${block.id}" data-column-index="${columnIndex}">
				${sizes.map(s => `<option value="${s.value}"${style.connectorSize === s.value ? ' selected' : ''}>${s.label}</option>`).join('')}
			</select>
		</label>
	`;
}

function renderStyleControls(block, columnIndex, style, target) {
	const template = componentTemplates[block.type];
	const so = template.styleOptions?.[target];
	const prefix = target;
	const label = so?.label || DEFAULT_TARGET_LABELS[target] || target;

	const hideKeys = new Set(so?.hide || []);

	// isRootWrap: 각 block-item이 독립 타이틀을 가지므로 title도 전체/개별 탭 지원
	// non-isRootWrap(mix): title은 공유 필드이므로 제외
	const isMultiItem = block.items.length > 1 && (target !== 'title' || template.isRootWrap);
	const tabKey = block.id;
	let tabState = isMultiItem ? (_bodyTabState[tabKey] ?? 'all') : null;
	// clamp invalid tab index
	if (tabState !== null && tabState !== 'all' && tabState >= block.items.length) tabState = 'all';

	const effectiveStyle = (isMultiItem && tabState !== 'all')
		? getColumnStyle(block.items[tabState] || {})
		: style;
	const ctrlColIdx = (isMultiItem && tabState !== 'all') ? tabState : columnIndex;
	const applyAll = isMultiItem && tabState === 'all';
	const applyAttr = applyAll ? ' data-apply-all="true"' : '';

	const isGradient = effectiveStyle[`${prefix}BackgroundColor1`] != null;
	const defaultColorFields = [
		{ key: 'borderColor',     label: '선' },
		...(isGradient
			? [{ key: 'backgroundColor1', label: '배경 시작색' }, { key: 'backgroundColor2', label: '배경 끝색' }]
			: [{ key: 'backgroundColor', label: '배경' }]
		),
		{ key: 'textColor',       label: '글자' }
	];
	const fields = so?.fields ?? defaultColorFields.filter(f => !hideKeys.has(f.key));

	const colorSection = fields.length ? `
		${fields.map(f => {
			const sk = `${prefix}${f.key.charAt(0).toUpperCase()}${f.key.slice(1)}`;
			return `
		<label class="style-control" title="${label} ${f.label}">
			<span>${f.label}</span>
			<input type="color" value="${effectiveStyle[sk] || '#000000'}" data-style-field="${sk}" data-block-id="${block.id}" data-column-index="${ctrlColIdx}"${applyAttr}>
		</label>`;
		}).join('')}` : '';

	const showFw = !hideKeys.has('fontWeight');
	const showFs = !hideKeys.has('fontSize');
	const showTa = !hideKeys.has('textAlign');

	const fw = effectiveStyle[`${prefix}FontWeight`] || (target === 'title' ? '700' : '400');
	const fs = effectiveStyle[`${prefix}FontSize`] ?? '';
	const ta = effectiveStyle[`${prefix}TextAlign`] ?? '';

	const fontRow = (showFw || showFs) ? `
		<div class="style-font-row">
			${showFw ? `<label class="style-control" title="${label} 굵기">
				<span>굵기</span>
				<select data-style-field="${prefix}FontWeight" data-block-id="${block.id}" data-column-index="${ctrlColIdx}"${applyAttr}>
					<option value="400"${fw === '400' ? ' selected' : ''}>R</option>
					<option value="500"${fw === '500' ? ' selected' : ''}>M</option>
					<option value="700"${fw === '700' ? ' selected' : ''}>B</option>
					<option value="800"${fw === '800' ? ' selected' : ''}>E</option>
				</select>
			</label>` : ''}
			${showFs ? `<label class="style-control" title="${label} 사이즈">
				<span>사이즈</span>
				<select data-style-field="${prefix}FontSize" data-block-id="${block.id}" data-column-index="${ctrlColIdx}"${applyAttr}>
					<option value="">-</option>
					${FONT_SIZES.map(s => `<option value="${s}"${fs === s ? ' selected' : ''}>${s}</option>`).join('')}
				</select>
			</label>` : ''}
		</div>` : '';

	const alignRow = showTa ? `
		<div class="style-align-row">
			<span>정렬</span>
			<div class="style-align-btns">
				${[
					{ value: 'left',   icon: 'ri-align-left',   title: '왼쪽' },
					{ value: 'center', icon: 'ri-align-center',  title: '가운데' },
					{ value: 'right',  icon: 'ri-align-right',   title: '오른쪽' }
				].map(a => `<button type="button"
					class="style-align-btn${ta === a.value ? ' is-active' : ''}"
					data-style-field="${prefix}TextAlign"
					data-align-value="${a.value}"
					data-block-id="${block.id}"
					data-column-index="${ctrlColIdx}"
					${applyAttr}
					title="${a.title}">
					<i class="${a.icon}" aria-hidden="true"></i>
				</button>`).join('')}
			</div>
		</div>` : '';

	return colorSection + fontRow + alignRow;
}

function renderListStyleControls(block, maxDepth = EDIT_LIST_MAX_DEPTH, liveColors = []) {
	const styles = block.listStyles || ['', '', ''];
	const overrides = block.bulletColors || ['', '', ''];
	const formats = block.listFormats || ['', '', ''];
	const depthLabels = ['1뎁스', '2뎁스', '3뎁스'];
	return depthLabels.slice(0, maxDepth).map((label, i) => {
		const opts = LIST_STYLE_OPTIONS.map(o =>
			`<option value="${o.value}"${(styles[i] || '') === o.value ? ' selected' : ''}>${o.label}</option>`
		).join('');
		const color = overrides[i] || liveColors[i] || '#000000';
		const isCustom = (styles[i] || '') === 'custom';
		const fmt = escapeHtml(formats[i] || '');
		const { prefix: previewP, suffix: previewS } = parseListFormat(formats[i] || '');
		const customControls = isCustom ? `
			<div class="list-custom-marker-wrap">
				<input type="text" class="text-input" placeholder="예: 2-{n}.  또는  제{n}조"
					value="${fmt}" style="width:100%;margin-top:4px"
					data-list-format-block-id="${block.id}" data-list-depth="${i}">
				<p class="list-custom-preview" data-list-preview="${block.id}-${i}">
					${escapeHtml(previewP)}1${escapeHtml(previewS)}&nbsp;&nbsp;${escapeHtml(previewP)}2${escapeHtml(previewS)}&nbsp;&nbsp;${escapeHtml(previewP)}3${escapeHtml(previewS)}…
				</p>
			</div>` : '';
		return `<div class="style-align-row">
			<span>${label}</span>
			<select style="flex:1" data-list-style-block-id="${block.id}" data-list-depth="${i}">${opts}</select>
			<input type="color" style="width:32px;height:28px;flex:none;padding:2px 3px;cursor:pointer" value="${color}"
				data-bullet-color-block-id="${block.id}" data-bullet-color-depth="${i}" title="${label} 불릿 색상">
		</div>${customControls}`;
	}).join('');
}

function bindComponentEvents(container = document) {
	KlicBuilderShared.bindComponentItems({
		container,
		canvasGrid,
		getDragPayload: item => {
			const isDecoration = item.dataset.decoration === 'true';
			const category = templateCategories[item.dataset.type] || '';
			const customDecorationId = item.dataset.customDecorationId || '';
			if (category === 'design-template') return `new-design-template:${item.dataset.type}`;
			return isDecoration
				? (customDecorationId ? `overlay-custom:${customDecorationId}` : `overlay-type:${item.dataset.type}`)
				: `new-block:${item.dataset.type}`;
		},
		onAdd: item => {
			const isDecoration = item.dataset.decoration === 'true';
			const category = templateCategories[item.dataset.type] || '';
			const customDecorationId = item.dataset.customDecorationId || '';
			if (category === 'design-template') {
				addDesignTemplate(item.dataset.type);
			} else if (isDecoration) {
				const grid = document.getElementById('canvasGrid');
				const wrapper = document.getElementById('canvasWrapper');
				if (grid && wrapper) {
					const gRect = grid.getBoundingClientRect();
					const wRect = wrapper.getBoundingClientRect();
					const x = Math.max(0, (wRect.left + wRect.width / 2) - gRect.left - 60);
					const y = Math.max(0, (wRect.top + wRect.height / 2) - gRect.top - 60);
					customDecorationId ? addCustomOverlay(customDecorationId, x, y) : addOverlay(item.dataset.type, x, y);
				} else {
					customDecorationId ? addCustomOverlay(customDecorationId, 100, 100) : addOverlay(item.dataset.type, 100, 100);
				}
			} else {
				addBlock(item.dataset.type);
			}
		},
		onDragStart: item => {
			const isDecoration = item.dataset.decoration === 'true';
			const category = templateCategories[item.dataset.type] || '';
			const customDecorationId = item.dataset.customDecorationId || '';
			state.dragPayload = category === 'design-template'
				? `new-design-template:${item.dataset.type}`
				: isDecoration
				? (customDecorationId ? `overlay-custom:${customDecorationId}` : `overlay-type:${item.dataset.type}`)
				: `new-block:${item.dataset.type}`;
			const dragCat = templateCategories[item.dataset.type] || '';
			if (['box', 'list', 'title-horizontal', 'title-vertical', 'divider'].includes(dragCat)) {
				document.body.classList.add('is-mix-dragging');
			}
		},
		onDragEnd: () => {
			state.dragPayload = '';
			document.getElementById('canvasWrapper')?.classList.remove('is-decoration-over');
			document.body.classList.remove('is-mix-dragging');
		}
	});

	/* Legacy component binding moved to KlicBuilderShared.bindComponentItems.
	container.querySelectorAll('.component-item').forEach(item => {
		const isDecoration = item.dataset.decoration === 'true';
		const customDecorationId = item.dataset.customDecorationId || '';
		const addItemToCanvas = () => {
			if (isDecoration) {
				const grid = document.getElementById('canvasGrid');
				const wrapper = document.getElementById('canvasWrapper');
				if (grid && wrapper) {
					const gRect = grid.getBoundingClientRect();
					const wRect = wrapper.getBoundingClientRect();
					const x = Math.max(0, (wRect.left + wRect.width / 2) - gRect.left - 60);
					const y = Math.max(0, (wRect.top + wRect.height / 2) - gRect.top - 60);
					customDecorationId ? addCustomOverlay(customDecorationId, x, y) : addOverlay(item.dataset.type, x, y);
				} else {
					customDecorationId ? addCustomOverlay(customDecorationId, 100, 100) : addOverlay(item.dataset.type, 100, 100);
				}
			} else {
				addBlock(item.dataset.type);
			}
		};
		item.addEventListener('dragstart', event => {
			state.dragPayload = isDecoration
				? (customDecorationId ? `overlay-custom:${customDecorationId}` : `overlay-type:${item.dataset.type}`)
				: `new-block:${item.dataset.type}`;
			event.dataTransfer.setData('text/plain', state.dragPayload);
			event.dataTransfer.effectAllowed = 'copy';
			// mix 슬롯 허용 타입 드래그 시 빨간 점선 표시
			const dragCat = templateCategories[item.dataset.type] || '';
			if (['box', 'list', 'title-horizontal', 'title-vertical', 'divider'].includes(dragCat)) {
				document.body.classList.add('is-mix-dragging');
			}
		});
		item.addEventListener('dragend', () => {
			state.dragPayload = '';
			canvasGrid.classList.remove('is-over');
			document.getElementById('canvasWrapper')?.classList.remove('is-decoration-over');
			document.body.classList.remove('is-mix-dragging');
		});
		item.addEventListener('dblclick', event => {
			if (event.target.closest('button')) return;
			event.preventDefault();
			addItemToCanvas();
		});
		item.querySelector('.component-add-btn').addEventListener('click', event => {
			event.stopPropagation();
			addItemToCanvas();
		});
	});*/

	document.querySelectorAll('[data-custom-decoration-remove]').forEach(button => {
		button.addEventListener('click', event => {
			event.stopPropagation();
			const id = button.dataset.customDecorationRemove;
			state.customDecorations = state.customDecorations.filter(item => item.id !== id);
			state.overlays = state.overlays.filter(overlay => overlay.customDecorationId !== id);
			syncCanvasPresence();
			saveCustomDecorations();
			renderComponentList();
			renderOverlayItems();
			updateMarkup();
		});
	});
}

function bindRenderedEvents() {
	document.querySelectorAll('.builder-block').forEach(block => {
		block.addEventListener('dragstart', event => {
			if (document.body.classList.contains('preview-mode')) {
				event.preventDefault();
				return;
			}
			if (event.target.closest('select') || event.target.closest('input') || event.target.closest('button') || event.target.closest('[contenteditable="true"]')) return;
			if (event.altKey) {
				state.dragPayload = `copy-block:${block.dataset.blockId}`;
				event.dataTransfer.effectAllowed = 'copy';
				requestAnimationFrame(() => {
					block.classList.add('dragging');
					block.classList.add('is-copy-dragging');
				});
			} else {
				state.dragPayload = `existing-block:${block.dataset.blockId}`;
				event.dataTransfer.effectAllowed = 'move';
				requestAnimationFrame(() => block.classList.add('dragging'));
			}
			event.dataTransfer.setData('text/plain', state.dragPayload);
		});
		block.addEventListener('dragover', event => {
			if (document.body.classList.contains('preview-mode')) return;
			const payload = state.dragPayload;
			if (payload.startsWith('new-block:') || payload.startsWith('existing-block:') || payload.startsWith('copy-block:')) {
				event.preventDefault();
				setBlockDropIndicator(block, event);
			}
		});
		block.addEventListener('dragleave', event => {
			if (!block.contains(event.relatedTarget)) clearBlockDropIndicator(block);
		});
		block.addEventListener('drop', handleBlockDrop);
		block.addEventListener('dragend', () => {
			state.dragPayload = '';
			block.classList.remove('dragging');
			block.classList.remove('is-copy-dragging');
			clearDropIndicators();
		});
		block.addEventListener('click', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (event.target.closest('[data-remove-block-id]')) return;
			if (event.target.closest('[data-duplicate-block-id]')) return;
			if (event.target.closest('[contenteditable="true"]')) return;
			if (event.target.closest('.block-item')) return;
			selectBlock(block.dataset.blockId);
		});
	});

	document.querySelectorAll('.block-item').forEach(item => {
		item.addEventListener('click', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (event.target.closest('[contenteditable="true"]')) return;
			event.stopPropagation();
			const blockId = item.dataset.blockId;
			const colIdx = Number(item.dataset.columnIndex);
			// isRootWrap 블록: 클릭한 항목 인덱스로 탭 동기화
			const block = state.blocks.find(b => b.id === blockId);
			if (block && componentTemplates[block.type]?.isRootWrap && block.items.length > 1) {
				_bodyTabState[blockId] = colIdx;
				document.querySelectorAll(`.block-item[data-block-id].is-item-selected`).forEach(el => el.classList.remove('is-item-selected'));
				item.classList.add('is-item-selected');
			}
			selectBlockItem(blockId, colIdx);
		});
	});
	document.querySelectorAll('[data-item-block-id]').forEach(itemEl => {
		itemEl.addEventListener('click', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (event.target.closest('[contenteditable="true"]')) return;
			event.stopPropagation();
			document.querySelectorAll('[data-item-block-id].is-item-selected').forEach(el => el.classList.remove('is-item-selected'));
			itemEl.classList.add('is-item-selected');
			const blockId = itemEl.dataset.itemBlockId;
			const itemIdx = parseInt(itemEl.dataset.itemIdx);
			_bodyTabState[blockId] = itemIdx;
			selectBlockItem(blockId, 0);
		});
	});
	document.querySelectorAll('[data-duplicate-block-id]').forEach(button => {
		button.addEventListener('click', event => {
			event.stopPropagation();
			duplicateBlock(button.dataset.duplicateBlockId);
		});
	});
	document.querySelectorAll('[data-remove-block-id]').forEach(button => {
		button.addEventListener('click', event => {
			event.stopPropagation();
			removeBlock(button.dataset.removeBlockId);
		});
	});
	document.querySelectorAll('[data-edit-field]').forEach(field => {
		field.addEventListener('dblclick', startTextEdit);
	});
	document.querySelectorAll('[data-edit-field="icon"]').forEach(field => {
		field.addEventListener('dblclick', event => {
			if (document.body.classList.contains('preview-mode')) return;
			event.stopPropagation();
			openIconDrawerForField(field);
		});
	});
	// 혼합 블록 inner slot 드래그 이벤트
	document.querySelectorAll('.mix-inner-slot[data-mix-block-id]').forEach(slot => {
		slot.addEventListener('dragover', event => {
			const payload = state.dragPayload;
			if (payload.startsWith('new-block:')) {
				const newType = payload.replace('new-block:', '');
				if (!MIX_ALLOWED.has(templateCategories[newType])) return;
			} else if (payload.startsWith('existing-block:')) {
				const srcId = payload.replace('existing-block:', '');
				const srcBlock = state.blocks.find(b => b.id === srcId);
				if (!srcBlock || !MIX_ALLOWED.has(templateCategories[srcBlock.type])) return;
			} else {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = payload.startsWith('new-block:') ? 'copy' : 'move';
			slot.classList.add('mix-slot-over');
		});
		slot.addEventListener('dragleave', event => {
			if (!slot.contains(event.relatedTarget)) {
				slot.classList.remove('mix-slot-over');
			}
		});
		slot.addEventListener('drop', event => {
			const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
			if (payload.startsWith('new-block:')) {
				const newType = payload.replace('new-block:', '');
				if (!MIX_ALLOWED.has(templateCategories[newType])) return;
				event.preventDefault();
				event.stopPropagation();
				slot.classList.remove('mix-slot-over');
				clearDropIndicators();
				state.dragPayload = '';
				addMixInnerBlock(slot.dataset.mixBlockId, newType);
			} else if (payload.startsWith('existing-block:')) {
				const srcId = payload.replace('existing-block:', '');
				const srcBlock = state.blocks.find(b => b.id === srcId);
				if (!srcBlock || !MIX_ALLOWED.has(templateCategories[srcBlock.type])) return;
				event.preventDefault();
				event.stopPropagation();
				slot.classList.remove('mix-slot-over');
				clearDropIndicators();
				state.dragPayload = '';
				addMixInnerBlockFromExisting(slot.dataset.mixBlockId, srcId);
			}
		});
	});
	// 혼합 블록 내부 제거 버튼
	document.querySelectorAll('.mix-inner-remove').forEach(btn => {
		btn.addEventListener('click', event => {
			event.stopPropagation();
			removeMixInnerBlock(btn.dataset.mixBlockId, Number(btn.dataset.mixInnerIdx));
		});
	});
	// 혼합 블록 내부 아이템 드래그 재정렬
	let _mixDragFrom = null;

	document.querySelectorAll('.mix-inner-item[draggable]').forEach(item => {
		item.addEventListener('dragstart', event => {
			// 버튼·입력·편집 영역에서는 드래그 시작 차단
			if (event.target.closest('button, input, select, textarea, [contenteditable="true"]')) {
				event.preventDefault();
				return;
			}
			_mixDragFrom = { outerBlockId: item.dataset.mixBlockId, fromIdx: Number(item.dataset.mixInnerIdx) };
			state.dragPayload = `mix-inner-reorder:${item.dataset.mixBlockId}:${item.dataset.mixInnerIdx}`;
			event.dataTransfer.effectAllowed = 'move';
			event.stopPropagation();
			requestAnimationFrame(() => item.classList.add('mix-item-dragging'));
		});
		item.addEventListener('dragend', () => {
			item.classList.remove('mix-item-dragging');
			document.querySelectorAll('.mix-inner-item.mix-item-over').forEach(el => el.classList.remove('mix-item-over'));
			if (state.dragPayload.startsWith('mix-inner-reorder:')) state.dragPayload = '';
			_mixDragFrom = null;
		});
		item.addEventListener('dragover', event => {
			if (!state.dragPayload.startsWith('mix-inner-reorder:')) return;
			const fromId = _mixDragFrom?.outerBlockId;
			if (fromId !== item.dataset.mixBlockId) return;
			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = 'move';
			document.querySelectorAll('.mix-inner-item.mix-item-over').forEach(el => el.classList.remove('mix-item-over'));
			item.classList.add('mix-item-over');
		});
		item.addEventListener('dragleave', event => {
			if (!item.contains(event.relatedTarget)) item.classList.remove('mix-item-over');
		});
		item.addEventListener('drop', event => {
			if (!state.dragPayload.startsWith('mix-inner-reorder:')) return;
			event.preventDefault();
			event.stopPropagation();
			item.classList.remove('mix-item-over');
			const toIdx = Number(item.dataset.mixInnerIdx);
			if (_mixDragFrom && _mixDragFrom.fromIdx !== toIdx) {
				moveMixInnerBlock(_mixDragFrom.outerBlockId, _mixDragFrom.fromIdx, toIdx);
			}
			state.dragPayload = '';
			_mixDragFrom = null;
		});
	});
	bindEditListEvents();

	// title-list .list-wrap 드래그 & 클릭 이벤트
	document.querySelectorAll('.list-wrap[data-list-block-id]').forEach(slot => {
		const listWrapId = slot.dataset.listBlockId; // "outerBlockId::list::N"
		const outerBlockId = listWrapId.replace(/::list::\d+$/, '');
		// 빈 슬롯 클릭 → 리스트 필터 탭으로 이동
		slot.addEventListener('click', event => {
			event.stopPropagation();
			if (event.target.closest('.list-wrap-remove') || event.target.closest('.list-wrap-inner')) return;
			switchFilterTab('list');
			selectBlock(outerBlockId);
		});
		// list-wrap 내부 제거 버튼
		const removeBtn = slot.querySelector('.list-wrap-remove');
		if (removeBtn) {
			removeBtn.addEventListener('click', event => {
				event.stopPropagation();
				clearListWrapBlock(listWrapId);
			});
		}
		// list 카테고리 블록만 드롭 허용 (placeholder 상태일 때만 가로챔)
		slot.addEventListener('dragover', event => {
			if (document.body.classList.contains('preview-mode')) return;
			// 이미 리스트 블록이 연결된 경우 일반 블록 드롭/재배치로 위임
			if (!slot.querySelector('.list-wrap-placeholder')) return;
			const payload = state.dragPayload;
			if (payload.startsWith('new-block:')) {
				if (templateCategories[payload.replace('new-block:', '')] !== 'list') return;
			} else if (payload.startsWith('existing-block:')) {
				const src = state.blocks.find(b => b.id === payload.replace('existing-block:', ''));
				if (!src || templateCategories[src.type] !== 'list') return;
			} else {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			slot.classList.add('list-wrap-over');
		});
		slot.addEventListener('dragleave', event => {
			if (!slot.contains(event.relatedTarget)) slot.classList.remove('list-wrap-over');
		});
		slot.addEventListener('drop', event => {
			if (document.body.classList.contains('preview-mode')) return;
			// 이미 리스트 블록이 연결된 경우 일반 드롭으로 위임
			if (!slot.querySelector('.list-wrap-placeholder')) return;
			const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
			slot.classList.remove('list-wrap-over');
			if (payload.startsWith('new-block:')) {
				const newType = payload.replace('new-block:', '');
				if (templateCategories[newType] !== 'list') return;
				event.preventDefault();
				event.stopPropagation();
				clearDropIndicators();
				state.dragPayload = '';
				setListWrapBlock(slot.dataset.listBlockId, newType);
			} else if (payload.startsWith('existing-block:')) {
				const srcId = payload.replace('existing-block:', '');
				const src = state.blocks.find(b => b.id === srcId);
				if (!src || templateCategories[src.type] !== 'list') return;
				event.preventDefault();
				event.stopPropagation();
				clearDropIndicators();
				state.dragPayload = '';
				setListWrapFromExisting(slot.dataset.listBlockId, srcId);
			}
		});
	});
}

function setBlockDropIndicator(block, event) {
	const position = 'after';
	clearDropIndicators(block);
	block.dataset.dropPosition = position;
	block.classList.add('is-over', `is-over-${position}`);
}

function clearBlockDropIndicator(block) {
	block.classList.remove('is-over', 'is-over-before', 'is-over-after');
	delete block.dataset.dropPosition;
}

function clearDropIndicators(exceptBlock = null) {
	document.querySelectorAll('.builder-block.is-over').forEach(block => {
		if (block !== exceptBlock) clearBlockDropIndicator(block);
	});
	canvasGrid.classList.remove('is-over');
}

function clearOptionsPanel() {
	state.selectedItem = null;
	document.getElementById('builderMain')?.classList.remove('has-selection');
	document.querySelectorAll('.block-item.is-selected').forEach(el => el.classList.remove('is-selected'));
	document.querySelectorAll('.builder-block.is-selected').forEach(el => el.classList.remove('is-selected'));
	optionsPanel.innerHTML = `
		<div class="options-panel-empty">
			<i class="ri-cursor-line" aria-hidden="true"></i>
			<p>항목을 클릭하면<br>스타일을 편집할 수 있습니다.</p>
		</div>
	`;
}

function selectBlock(blockId) {
	document.querySelectorAll('.block-item.is-selected').forEach(el => el.classList.remove('is-selected'));
	document.querySelectorAll('.builder-block.is-selected').forEach(el => el.classList.remove('is-selected'));
	const blockEl = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (blockEl) blockEl.classList.add('is-selected');
	state.selectedItem = { blockId, columnIndex: null };
	document.getElementById('builderMain')?.classList.add('has-selection');
	renderOptionsPanel(blockId, null);
}

function selectBlockItem(blockId, columnIndex) {
	document.querySelectorAll('.block-item.is-selected').forEach(el => el.classList.remove('is-selected'));
	document.querySelectorAll('.builder-block.is-selected').forEach(el => el.classList.remove('is-selected'));
	const item = document.querySelector(`.block-item[data-block-id="${blockId}"][data-column-index="${columnIndex}"]`);
	if (item) item.classList.add('is-selected');
	state.selectedItem = { blockId, columnIndex };
	document.getElementById('builderMain')?.classList.add('has-selection');
	renderOptionsPanel(blockId, columnIndex);
}

function renderMixInnerOptionsPanel(mixRef, columnIndex) {
	const { outerBlock, innerIdx, innerBlock } = mixRef;
	const innerBlockId = `${outerBlock.id}::inner::${innerIdx}`;
	const col = columnIndex ?? 0;
	const item = innerBlock.items[col];
	if (!item) return;
	const template = componentTemplates[innerBlock.type];
	if (!template) return;
	const style = getColumnStyle(item);
	const isDivider = templateCategories[innerBlock.type] === 'divider';
	const hasIconField = !!template.element?.querySelector('[data-edit-field="icon"]');
	const iconSection = hasIconField ? `
		<strong class="option-group-label">아이콘</strong>
		<div class="option-group-box">
			${renderIconControls(innerBlockId, col, item)}
		</div>` : '';
	const so = template.styleOptions;
	const styleTargets = so ? Object.keys(so) : ['title', 'body'];
	const styleSection = isDivider
		? `<strong class="option-group-label">연결선 색상 / 크기</strong>
			<fieldset class="option-group">${renderConnectorControls({ id: innerBlockId, type: innerBlock.type, items: innerBlock.items }, col, style)}</fieldset>`
		: `${iconSection}${styleTargets.map(targetKey => {
			const label = so?.[targetKey]?.label || DEFAULT_TARGET_LABELS[targetKey] || targetKey;
			return `<strong class="option-group-label">${label}</strong>
				<fieldset class="option-group">${renderStyleControls({ id: innerBlockId, type: innerBlock.type, items: innerBlock.items }, col, style, targetKey)}</fieldset>`;
		}).join('')}`;
	optionsPanel.innerHTML = `
		<div class="options-panel-header">
			<strong class="options-panel-title">내부 블록 옵션</strong>
		</div>
		<div class="options-panel-body">
			<strong class="option-group-label">블럭 설정</strong>
			<div class="option-group-box">
				<div class="options-layout-row">
					<span>하단 여백</span>
					<div class="options-layout-input">
						<input type="number" min="0" max="300" value="${innerBlock.marginBottom ?? 30}"
							data-mix-inner-margin="${innerIdx}" data-mix-outer-id="${outerBlock.id}">
						<span>px</span>
					</div>
				</div>
			</div>
			${styleSection}
		</div>`;
	bindStyleFieldEvents(optionsPanel);
	bindIconControls(optionsPanel);
	const marginInput = optionsPanel.querySelector('[data-mix-inner-margin]');
	if (marginInput) {
		marginInput.addEventListener('input', () => {
			updateMixInnerMargin(marginInput.dataset.mixOuterId, Number(marginInput.dataset.mixInnerMargin), marginInput.value);
		});
	}
}

function renderListInnerOptionsPanel(listRef, columnIndex) {
	const { outerBlock, listBlock, colIdx } = listRef;
	const listBlockId = `${outerBlock.id}::list::${colIdx}`;
	const col = columnIndex ?? 0;
	const item = listBlock.items[col];
	if (!item) return;
	const template = componentTemplates[listBlock.type];
	if (!template) return;

	const unit = template.addDirection === 'row' ? '행' : '열';
	const isRowDir = template.addDirection === 'row';
	const currentCols = listBlock.columns ?? listBlock.items.length ?? 1;
	const displayMax = isRowDir ? Math.min(template.max, 5) : 5;
	const showCustomOption = !isRowDir || template.max > 5;
	const isCustom = currentCols > 5;
	const columnOptions = [
		...Array.from({ length: displayMax }, (_, i) => {
			const val = String(i + 1);
			return `<option value="${val}"${String(currentCols) === val && !isCustom ? ' selected' : ''}>${val}${unit}</option>`;
		}),
		showCustomOption ? `<option value="custom"${isCustom ? ' selected' : ''}>5개 이상</option>` : ''
	].filter(Boolean).join('');
	const colMax = isRowDir ? template.max : 20;
	const blockSettingSection = `
		<strong class="option-group-label">블럭 설정</strong>
		<div class="option-group-box">
			<div class="options-layout-row">
				<span>${unit} 설정</span>
				<div class="options-layout-input">
					<select data-column-mode="${listBlockId}">${columnOptions}</select>
					${showCustomOption ? `<input type="number" min="6" max="${colMax}" value="${isCustom ? currentCols : ''}" class="column-custom-input"${isCustom ? '' : ' hidden'} data-column-mode-custom="${listBlockId}">` : ''}
				</div>
			</div>
			${showCustomOption ? `<p class="column-limit-msg" hidden>최대 ${colMax}개까지 추가 가능합니다</p>` : ''}
		</div>`;

	const style = getColumnStyle(item);
	const so = template.styleOptions;
	const styleTargets = so ? Object.keys(so) : ['title', 'body'];
	const styleSection = styleTargets.map(targetKey => {
		const label = so?.[targetKey]?.label || DEFAULT_TARGET_LABELS[targetKey] || targetKey;
		return `<strong class="option-group-label">${label}</strong>
			<fieldset class="option-group">${renderStyleControls({ id: listBlockId, type: listBlock.type, items: listBlock.items }, col, style, targetKey)}</fieldset>`;
	}).join('');

	optionsPanel.innerHTML = `
		<div class="options-panel-head">
			<strong>리스트 블록</strong>
			<span>${escapeHtml(listBlock.type)}</span>
		</div>
		<div class="options-panel-groups">
			${blockSettingSection}
			${styleSection}
		</div>`;
	bindStyleFieldEvents(optionsPanel);
	const colSelect = optionsPanel.querySelector('[data-column-mode]');
	const colCustomInput = optionsPanel.querySelector('[data-column-mode-custom]');
	if (colSelect) {
		colSelect.addEventListener('change', () => {
			const val = colSelect.value;
			if (val === 'custom') {
				if (colCustomInput) { colCustomInput.hidden = false; colCustomInput.focus(); }
				const limitMsg = optionsPanel.querySelector('.column-limit-msg');
				if (limitMsg) limitMsg.hidden = false;
			} else {
				if (colCustomInput) { colCustomInput.hidden = true; colCustomInput.value = ''; }
				const limitMsg = optionsPanel.querySelector('.column-limit-msg');
				if (limitMsg) limitMsg.hidden = true;
				updateBlockColumns(colSelect.dataset.columnMode, val);
			}
		});
	}
	if (colCustomInput) {
		colCustomInput.addEventListener('input', () => {
			const max = Number(colCustomInput.max);
			const raw = Number(colCustomInput.value);
			const limitMsg = optionsPanel.querySelector('.column-limit-msg');
			if (raw > max) {
				if (limitMsg) limitMsg.hidden = false;
			} else {
				if (limitMsg) limitMsg.hidden = true;
				if (raw >= 6) updateBlockColumns(colCustomInput.dataset.columnModeCustom, raw);
			}
		});
	}
}

function updateItemColorSection(blockId, itemIdx) {
	const section = document.getElementById('itemColorSection');
	if (!section) return;
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const item = block.items[itemIdx];
	if (!item) return;
	const resetBtn = document.getElementById('itemColorResetBtn');
	if (resetBtn) {
		resetBtn.dataset.blockId = blockId;
		resetBtn.dataset.itemIdx = String(itemIdx);
		resetBtn.hidden = false;
	}
	const template = componentTemplates[block.type];
	const bodyHide = new Set(template?.styleOptions?.body?.hide || []);
	const fields = [
		{ key: 'borderColor',     label: '선',   field: 'itemBorder', fallback: '#dddddd' },
		{ key: 'backgroundColor', label: '배경', field: 'itemBg',     fallback: '#ffffff' },
		{ key: 'textColor',       label: '글자', field: 'itemText',   fallback: '#101010' },
	].filter(f => !bodyHide.has(f.key));
	section.innerHTML = fields.map(f => `
		<label class="style-control" title="${f.label}">
			<span>${f.label}</span>
			<input type="color" value="${item[f.field] || f.fallback}"
				data-item-color-field="${f.field}" data-block-id="${blockId}" data-item-idx="${itemIdx}">
		</label>`).join('');
}

function resetStyleTarget(blockId, columnIndex, target, applyAll = false) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const defaultStyle = createStyleForType(block.type);
	const resetItem = (item) => {
		if (!item || !item.style) return;
		Object.keys(item.style)
			.filter(k => k.startsWith(target))
			.forEach(k => { item.style[k] = defaultStyle[k]; });
		if (target === 'body') {
			delete item.style.bodyBgExplicit;
			delete item.style.bodyBorderExplicit;
			delete item.style.bodyTextExplicit;
		}
		if (target === 'sub') {
			delete item.style.subTextExplicit;
		}
	};
	if (applyAll) {
		block.items.forEach(item => resetItem(item));
	} else {
		resetItem(block.items[columnIndex]);
	}
	if (target === 'body') {
		block.items.forEach(it => { delete it.itemBg; delete it.itemText; delete it.itemBorder; });
		updateItemColorStyleTag();
	}
	pushHistory();
	render();
}

function renderOptionsPanel(blockId, columnIndex) {
	// 혼합 내부 블록이면 전용 옵션 패널 표시
	const mixRef = resolveMixInnerRef(blockId);
	if (mixRef) { renderMixInnerOptionsPanel(mixRef, columnIndex ?? 0); return; }
	// title-list list-wrap 내부 블록이면 전용 옵션 패널 표시
	const listRef = resolveListInnerRef(blockId);
	if (listRef) { renderListInnerOptionsPanel(listRef, columnIndex ?? 0); return; }
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) { clearOptionsPanel(); return; }
	const template = componentTemplates[block.type];
	// non-isRootWrap 블록은 외부 block-item이 하나뿐이므로 columnIndex를 0으로 기본 처리
	if (columnIndex === null && !template.isRootWrap && block.items.length > 0) {
		columnIndex = 0;
	}
	const unit = template.addDirection === 'row' ? '행' : '열';
	const isDivider = templateCategories[block.type] === 'divider';
	const hasIconField = !!template.element.querySelector('[data-edit-field="icon"]');

	const current = String(block.columns);
	const isRowDir = template.addDirection === 'row';
	const displayMax = isRowDir ? template.max : 5;
	const showCustomOption = !isRowDir;
	const isCustom = !isRowDir && block.columns > 5;
	const columnOptions = [
		...Array.from({ length: displayMax }, (_, i) => {
			const val = String(i + 1);
			return `<option value="${val}"${current === val && !isCustom ? ' selected' : ''}>${val}${unit}</option>`;
		}),
		showCustomOption ? `<option value="custom"${isCustom ? ' selected' : ''}>5개 이상</option>` : ''
	].filter(Boolean).join('');
	const colMax = isRowDir ? template.max : 20;
	const widthOptions = ['20%', '25%', '33%', '50%'];
	const isTitleCategory = templateCategories[block.type] === 'title';
	const blockSettingSection = `
		<strong class="option-group-label">블럭 설정</strong>
		<div class="option-group-box">
			${isDivider ? '' : `
			${isTitleCategory ? '' : (() => {
				const colRowDisabled = isRowDir && !!block.blockWidth;
				return `<div class="options-layout-row${colRowDisabled ? ' is-disabled' : ''}">
				<span>${unit} 설정</span>
				<div class="options-layout-input">
					<select data-column-mode="${block.id}"${colRowDisabled ? ' disabled' : ''}>${columnOptions}</select>
					${showCustomOption ? `<input type="number" min="6" max="${colMax}" value="${isCustom ? current : ''}" class="column-custom-input"${isCustom ? '' : ' hidden'} data-column-mode-custom="${block.id}">` : ''}
				</div>
			</div>
			${showCustomOption ? `<p class="column-limit-msg" hidden>최대 ${colMax}개까지 추가 가능합니다</p>` : ''}`;
			})()}
			${(() => {
				const widthDisabled = isRowDir && block.columns !== 1;
				return `<div class="options-layout-row${widthDisabled ? ' is-disabled' : ''}">
				<span>너비</span>
				<div class="options-layout-input">
					<select data-width-block-id="${block.id}"${widthDisabled ? ' disabled' : ''}>
						<option value=""${!block.blockWidth ? ' selected' : ''}>기본</option>
						${widthOptions.map(w => `<option value="${w}"${block.blockWidth === w ? ' selected' : ''}>${w}</option>`).join('')}
					</select>
				</div>
			</div>
			${widthDisabled ? `<p class="width-limit-msg" style="display:block">너비 설정은 1행일 때만 가능합니다</p>` : ''}`;
			})()}`}
			<div class="options-layout-row">
				<span>하단 여백</span>
				<div class="options-layout-input">
					<input type="number" min="0" max="300" value="${block.marginBottom ?? 30}" data-margin-block-id="${block.id}">
					<span>px</span>
				</div>
			</div>
		</div>`;

	let styleSection = '';
	if (columnIndex !== null && block.items[columnIndex]) {
		const colItem = block.items[columnIndex];
		const style = getColumnStyle(colItem);
		const so = template.styleOptions;
		const styleTargets = so ? Object.keys(so) : ['title', 'body'];
		const iconSection = hasIconField ? `
			<strong class="option-group-label">아이콘</strong>
			<div class="option-group-box">
				${renderIconControls(block.id, columnIndex, colItem)}
			</div>` : '';
		// isRootWrap: title도 각 아이템 독립 → 탭 지원 / mix: title은 공유 필드 → 탭 제외
		const hasItemTab = block.items.length > 1 && styleTargets.some(t => t !== 'title' || template.isRootWrap);
		let itemTabState = hasItemTab ? (_bodyTabState[block.id] ?? 'all') : null;
		if (itemTabState !== null && itemTabState !== 'all' && itemTabState >= block.items.length) itemTabState = 'all';
		const tabBtns = hasItemTab
			? ['all', ...block.items.map((_, i) => i)].map(t =>
				'<button type="button" class="style-tab-btn' + (itemTabState === t ? ' is-active' : '') + '"'
				+ ' data-body-tab="' + t + '" data-tab-block-id="' + block.id + '">'
				+ (t === 'all' ? '전체' : String(t + 1)) + '</button>'
			).join('')
			: '';
		const tabRowHtml = hasItemTab
			? '<div class="style-tab-row">' + tabBtns + '</div>'
			: '';

		const styleTargetBlocks = styleTargets.map(targetKey => {
			const targetLabel = so?.[targetKey]?.label || DEFAULT_TARGET_LABELS[targetKey] || targetKey;
			const isMultiTarget = block.items.length > 1 && (targetKey !== 'title' || template.isRootWrap);
			const ts = isMultiTarget ? itemTabState : null;
			const resetColIdx = (ts !== null && ts !== 'all') ? ts : columnIndex;
			const resetApplyAll = (ts === 'all') ? ' data-apply-all="true"' : '';
			return '<div class="option-group-label item-color-label">'
				+ '<span>' + targetLabel + '</span>'
				+ '<button type="button" class="ghost-button item-color-reset-btn"'
				+ ' data-style-reset="' + targetKey + '"'
				+ ' data-block-id="' + block.id + '"'
				+ ' data-column-index="' + resetColIdx + '"'
				+ resetApplyAll
				+ ' aria-label="' + targetLabel + ' 초기화">'
				+ '<i class="ri-reset-left-line" aria-hidden="true"></i>'
				+ '</button></div>'
				+ '<fieldset class="option-group">'
				+ renderStyleControls(block, columnIndex, style, targetKey)
				+ '</fieldset>';
		}).join('');

		styleSection = isDivider
			? '<strong class="option-group-label">연결선 색상 / 크기</strong>'
				+ '<fieldset class="option-group">'
				+ renderConnectorControls(block, columnIndex, style)
				+ '</fieldset>'
			: iconSection + tabRowHtml + styleTargetBlocks;
	}

	// title-list 리스트 연결 섹션
	const showListWrap = templateCategories[block.type] === 'title-list' && hasListWrap(block.type);
	const listWrapSection = showListWrap ? `
		<strong class="option-group-label">리스트 연결</strong>
		<div class="option-group-box">
			<div class="options-layout-row">
				<span>리스트 사용</span>
				<div class="list-use-radios">
					<label class="list-use-radio${block.useList ? ' is-active' : ''}">
						<input type="radio" name="list-use-${block.id}" value="yes" data-list-use-block-id="${block.id}"${block.useList ? ' checked' : ''}> 예
					</label>
					<label class="list-use-radio${!block.useList ? ' is-active' : ''}">
						<input type="radio" name="list-use-${block.id}" value="no" data-list-use-block-id="${block.id}"${!block.useList ? ' checked' : ''}> 아니요
					</label>
				</div>
			</div>
			${block.useList ? (() => {
				const connectedCount = block.items.filter(it => it.listBlock).length;
				if (connectedCount > 0) {
					return `<p class="list-block-info">${connectedCount}/${block.items.length}개 연결됨</p>`;
				}
				return `<p class="list-wrap-hint">리스트타입 블록을 드래그해서 연결하세요.</p>`;
			})() : ''}
		</div>` : '';

	const hasEditList = !!template.editListLiTemplate;
	const templateDepths = template.editListTemplates?.length || 0;
	const dataDepths = hasEditList ? getMaxEditListDepthForBlock(block) + 1 : 0;
	const editListDepths = Math.min(EDIT_LIST_MAX_DEPTH, Math.max(templateDepths, dataDepths));
	const liveColors = (() => {
		if (!hasEditList) return ['', '', ''];
		const blockEl = document.querySelector(`.builder-block[data-block-id="${block.id}"]`);
		const rootUl = blockEl?.querySelector('.edit-list[data-depth="1"]');
		if (!rootUl) return ['', '', ''];
		const cs = getComputedStyle(rootUl);
		return [1, 2, 3].map(d => cs.getPropertyValue(`--ls-color-${d}`).trim());
	})();
	const listStyleSection = hasEditList ? `
		<div class="option-group-label item-color-label">
			<span>리스트</span>
			<button type="button" class="ghost-button item-color-reset-btn"
				data-list-reset-block-id="${block.id}"
				aria-label="리스트 스타일 초기화">
				<i class="ri-reset-left-line" aria-hidden="true"></i>
			</button>
		</div>
		<fieldset class="option-group">
			${renderListStyleControls(block, editListDepths, liveColors)}
		</fieldset>` : '';

	const headSub = columnIndex !== null ? `<span>${columnIndex + 1}${unit}</span>` : '';
	optionsPanel.innerHTML = `
		<div class="options-panel-head">
			<strong>${escapeHtml(block.type)}</strong>
			${headSub}
		</div>
		<div class="options-panel-groups">
			${blockSettingSection}
			${listWrapSection}
			${listStyleSection}
			${styleSection}
		</div>
	`;
	bindStyleFieldEvents(optionsPanel);
	optionsPanel.querySelectorAll('.style-tab-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			const blockId = btn.dataset.tabBlockId;
			const rawTab = btn.dataset.bodyTab;
			const tabVal = rawTab === 'all' ? 'all' : Number(rawTab);
			_bodyTabState[blockId] = tabVal;
			const blk = state.blocks.find(b => b.id === blockId);
			const isRootWrap = componentTemplates[blk?.type]?.isRootWrap;
			// 캔버스의 is-item-selected 동기화
			document.querySelectorAll('[data-item-block-id].is-item-selected, .block-item[data-block-id].is-item-selected').forEach(el => el.classList.remove('is-item-selected'));
			if (tabVal !== 'all') {
				// non-isRootWrap: add-wrap row 하이라이트
				const addWrapTarget = document.querySelector(`[data-item-block-id="${blockId}"][data-item-idx="${tabVal}"]`);
				if (addWrapTarget) addWrapTarget.classList.add('is-item-selected');
				// isRootWrap: block-item 하이라이트 + is-selected 이동
				const rootWrapTarget = document.querySelector(`.block-item[data-block-id="${blockId}"][data-column-index="${tabVal}"]`);
				if (rootWrapTarget) {
					rootWrapTarget.classList.add('is-item-selected');
					if (isRootWrap) {
						document.querySelectorAll('.block-item.is-selected').forEach(el => el.classList.remove('is-selected'));
						rootWrapTarget.classList.add('is-selected');
						if (state.selectedItem && state.selectedItem.blockId === blockId) {
							state.selectedItem.columnIndex = tabVal;
						}
					}
				}
			}
			const reColIdx = (isRootWrap && tabVal !== 'all') ? tabVal : (state.selectedItem?.columnIndex ?? 0);
			renderOptionsPanel(blockId, reColIdx);
		});
	});
	bindIconControls(optionsPanel);
	optionsPanel.querySelectorAll('select[data-list-style-block-id]').forEach(sel => {
		sel.addEventListener('change', () => {
			updateListStyle(sel.dataset.listStyleBlockId, Number(sel.dataset.listDepth), sel.value);
		});
	});
	optionsPanel.querySelectorAll('[data-bullet-color-block-id]').forEach(input => {
		input.addEventListener('input', () => {
			updateBulletColor(input.dataset.bulletColorBlockId, Number(input.dataset.bulletColorDepth), input.value);
		});
	});
	// 커스텀 마커 format 입력 이벤트
	optionsPanel.querySelectorAll('[data-list-format-block-id]').forEach(input => {
		input.addEventListener('input', () => {
			const blockId = input.dataset.listFormatBlockId;
			const depth = Number(input.dataset.listDepth);
			const format = input.value;
			updateListFormat(blockId, depth, format);
			// 패턴 미리보기 실시간 업데이트
			const preview = optionsPanel.querySelector(`[data-list-preview="${blockId}-${depth}"]`);
			if (preview) {
				const { prefix: p, suffix: s } = parseListFormat(format);
				preview.textContent = `${p}1${s}  ${p}2${s}  ${p}3${s}…`;
			}
		});
	});
	const listResetBtn = optionsPanel.querySelector('[data-list-reset-block-id]');
	if (listResetBtn) {
		listResetBtn.addEventListener('click', () => {
			resetListStyle(listResetBtn.dataset.listResetBlockId);
		});
	}
	const colSelect = optionsPanel.querySelector('[data-column-mode]');
	const colCustomInput = optionsPanel.querySelector('[data-column-mode-custom]');
	if (colSelect) {
		colSelect.addEventListener('change', () => {
			if (colSelect.value === 'custom') {
				if (colCustomInput) { colCustomInput.hidden = false; colCustomInput.focus(); }
			} else {
				if (colCustomInput) colCustomInput.hidden = true;
				updateBlockColumns(colSelect.dataset.columnMode, colSelect.value);
			}
		});
	}
	if (colCustomInput) {
		colCustomInput.addEventListener('input', () => {
			const raw = Number(colCustomInput.value);
			const max = Number(colCustomInput.max);
			const limitMsg = optionsPanel.querySelector('.column-limit-msg');
			if (raw > max) {
				if (limitMsg) limitMsg.hidden = false;
			} else {
				if (limitMsg) limitMsg.hidden = true;
				if (raw >= 6) updateBlockColumns(colCustomInput.dataset.columnModeCustom, raw);
			}
		});
	}
	const marginInput = optionsPanel.querySelector('[data-margin-block-id]');
	if (marginInput) {
		marginInput.addEventListener('input', () => updateBlockMargin(marginInput.dataset.marginBlockId, marginInput.value));
	}
	const widthSelect = optionsPanel.querySelector('[data-width-block-id]');
	if (widthSelect) {
		widthSelect.addEventListener('change', () => updateBlockWidth(widthSelect.dataset.widthBlockId, widthSelect.value));
	}
	// title-list 리스트 사용 라디오
	optionsPanel.querySelectorAll('[data-list-use-block-id]').forEach(radio => {
		radio.addEventListener('change', () => {
			if (radio.checked) updateBlockUseList(radio.dataset.listUseBlockId, radio.value === 'yes');
		});
	});
	// title-list 리스트 제거 버튼 (옵션 패널)
	const listClearBtn = optionsPanel.querySelector('.list-wrap-clear-btn');
	if (listClearBtn) {
		listClearBtn.addEventListener('click', () => clearListWrapBlock(listClearBtn.dataset.listBlockId));
	}
}

function renderCanvasPanelUI() {
	const isDevicePreview = state.previewDevice !== 'pc';
	const canvasSizeControl = document.getElementById('canvasSizeControl');
	if (canvasPanel) canvasPanel.innerHTML = '';
	if (!canvasSizeControl) return;
	const sizes = ['1000', '1200', '1400'];
	canvasSizeControl.innerHTML = `
		<div class="canvas-size-select${isDevicePreview ? ' is-disabled' : ''}" data-canvas-size-menu>
			<button type="button" class="canvas-size-trigger" data-canvas-size-trigger${isDevicePreview ? ' disabled' : ''}>
				<span>캔버스 크기설정</span>
				<strong>${state.canvasWidth}px</strong>
				<i class="ri-arrow-down-s-line" aria-hidden="true"></i>
			</button>
			<div class="canvas-size-options" role="listbox" aria-label="캔버스 크기">
				${sizes.map(s => `
					<button type="button" class="canvas-size-option${state.canvasWidth === s ? ' is-active' : ''}" data-canvas-size-value="${s}" role="option" aria-selected="${state.canvasWidth === s}">
						<span>${s}px</span>
						<i class="ri-check-line" aria-hidden="true"></i>
					</button>`).join('')}
			</div>
			<p class="canvas-size-disabled-tip">태블릿·모바일 모드에서는 설정할 수 없습니다.</p>
		</div>`;
	if (!isDevicePreview) {
		const menu = canvasSizeControl.querySelector('[data-canvas-size-menu]');
		canvasSizeControl.querySelector('[data-canvas-size-trigger]')?.addEventListener('click', event => {
			event.stopPropagation();
			menu.classList.toggle('is-open');
		});
		canvasSizeControl.querySelectorAll('[data-canvas-size-value]').forEach(button => {
			button.addEventListener('click', event => {
				event.stopPropagation();
				menu.classList.remove('is-open');
				updateCanvasWidth(button.dataset.canvasSizeValue);
				renderCanvasPanelUI();
			});
		});
	}
}

function updateCanvasWidth(value) {
	state.canvasWidth = value || '1200';
	document.body.dataset.canvasSize = state.canvasWidth;
	if (state.previewDevice === 'pc') {
		canvasGrid.style.maxWidth = `${state.canvasWidth}px`;
	}
}

function setPreviewDevice(device) {
	state.previewDevice = device;
	document.querySelectorAll('.device-btn').forEach(btn => {
		btn.classList.toggle('is-active', btn.dataset.device === device);
	});
	document.body.dataset.previewDevice = device;
	if (device === 'tablet') {
		canvasGrid.style.maxWidth = '768px';
	} else if (device === 'mobile') {
		canvasGrid.style.maxWidth = '380px';
	} else {
		canvasGrid.style.maxWidth = `${state.canvasWidth}px`;
	}
	renderCanvasPanelUI();
	updateDecoStudioAvailability();
}

function bindStyleFieldEvents(container) {
	container.querySelectorAll('input[data-style-field], select[data-style-field]').forEach(control => {
		const handler = () => updateColumnStyle(control.dataset.blockId, Number(control.dataset.columnIndex), control.dataset.styleField, control.value, control.dataset.applyAll === 'true');
		control.addEventListener('input', handler);
		control.addEventListener('change', handler);
	});
	container.querySelectorAll('.style-align-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			updateColumnStyle(btn.dataset.blockId, Number(btn.dataset.columnIndex), btn.dataset.styleField, btn.dataset.alignValue, btn.dataset.applyAll === 'true');
			btn.closest('.style-align-btns')?.querySelectorAll('.style-align-btn').forEach(b => {
				b.classList.toggle('is-active', b === btn);
			});
		});
	});
}

function updateColumnStyle(blockId, columnIndex, field, value, applyAll = false) {
	const listRef = resolveListInnerRef(blockId);
	if (listRef) {
		// title-list list-wrap 내부 블록 스타일 업데이트
		const { outerBlock, listBlock, colIdx } = listRef;
		if (!listBlock.items[columnIndex]) return;
		pushHistoryGrouped();
		getColumnStyle(listBlock.items[columnIndex])[field] = value;
		updateMarkup();
		const section = document.querySelector(`.builder-block[data-block-id="${outerBlock.id}"]`);
		const listWraps = section ? Array.from(section.querySelectorAll('.list-wrap')) : [];
		const listWrap = listWraps[colIdx];
		if (!listWrap) return;
		const innerItems = listWrap.querySelectorAll('.block-item');
		const target = innerItems[columnIndex];
		if (target) {
			applyColumnStyle(target, listBlock.items[columnIndex]);
			applyFieldStyleClasses(target, listBlock.items[columnIndex]);
			applyItemStyles(target, listBlock.items[columnIndex], componentTemplates[listBlock.type]);
		}
		return;
	}
	const mixRef = resolveMixInnerRef(blockId);
	if (mixRef) {
		// 혼합 내부 블록 스타일 업데이트
		const { outerBlock, innerIdx, innerBlock } = mixRef;
		if (!innerBlock.items[columnIndex]) return;
		pushHistoryGrouped();
		getColumnStyle(innerBlock.items[columnIndex])[field] = value;
		updateMarkup();
		const section = document.querySelector(`.builder-block[data-block-id="${outerBlock.id}"]`);
		if (!section) return;
		const innerItem = section.querySelector(`.mix-inner-item[data-mix-inner-idx="${innerIdx}"]`);
		if (!innerItem) return;
		const itemEls = innerItem.querySelectorAll('.block-item');
		const target = itemEls[columnIndex] || innerItem.querySelector('.block-item');
		if (target) {
			applyColumnStyle(target, innerBlock.items[columnIndex]);
			applyFieldStyleClasses(target, innerBlock.items[columnIndex]);
			applyItemStyles(target, innerBlock.items[columnIndex], componentTemplates[innerBlock.type]);
		}
		return;
	}
	const block = state.blocks.find(item => item.id === blockId);
	if (!block) return;
	pushHistoryGrouped();
	const template = componentTemplates[block.type];
	const applyStyle = (item) => {
		const cs = getColumnStyle(item);
		cs[field] = value;
		if (field === 'bodyBackgroundColor') cs.bodyBgExplicit = true;
		if (field === 'bodyBorderColor') cs.bodyBorderExplicit = true;
		if (field === 'bodyTextColor') cs.bodyTextExplicit = true;
		if (field === 'subTextColor') cs.subTextExplicit = true;
	};
	if (applyAll) {
		block.items.forEach(applyStyle);
	} else {
		if (!block.items[columnIndex]) return;
		applyStyle(block.items[columnIndex]);
	}
	updateMarkup();
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (!section) return;
	if (!template.isRootWrap && section.querySelector('[data-item-block-id]')) {
		// Non-isRootWrap: update individual row elements
		const updateRowEl = (idx) => {
			const rowEl = section.querySelector(`[data-item-block-id="${blockId}"][data-item-idx="${idx}"]`);
			if (rowEl) {
				applyColumnStyle(rowEl, block.items[idx]);
				applyFieldStyleClasses(rowEl, block.items[idx]);
			}
		};
		if (applyAll) {
			block.items.forEach((_, idx) => updateRowEl(idx));
		} else {
			updateRowEl(columnIndex);
		}
		const outerItem = section.querySelector(`.block-item[data-block-id="${blockId}"]`);
		if (outerItem) {
			applyColumnStyle(outerItem, block.items[0] || {});
			// add-wrap 내부 필드는 updateRowEl에서 이미 처리하므로 건너뜀
			applyFieldStyleClasses(outerItem, block.items[0] || {}, '[data-item-block-id]');
		}
	} else {
		const items = Array.from(section.querySelectorAll('.block-item')).filter(el => {
			const bid = el.dataset.blockId || '';
			return !bid.match(/::list::\d+$/) && !bid.match(/::inner::\d+$/);
		});
		const updateItem = (itemEl, idx) => {
			const templateEl = itemEl.querySelector('[data-template-id]') || itemEl;
			applyColumnStyle(templateEl, block.items[idx]);
			applyFieldStyleClasses(itemEl, block.items[idx]);
			applyItemStyles(itemEl, block.items[idx], template);
		};
		if (applyAll) {
			items.forEach((itemEl, idx) => { if (block.items[idx]) updateItem(itemEl, idx); });
		} else if (items[columnIndex]) {
			updateItem(items[columnIndex], columnIndex);
		}
	}
}

function updateBlockWidth(blockId, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistoryGrouped();
	block.blockWidth = value;
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (section) {
		if (value) section.style.setProperty('--block-width', value);
		else section.style.removeProperty('--block-width');
	}
	updateMarkup();
	const colSelect = optionsPanel.querySelector(`[data-column-mode="${blockId}"]`);
	if (colSelect) {
		const disabled = !!value;
		colSelect.disabled = disabled;
		colSelect.closest('.options-layout-row')?.classList.toggle('is-disabled', disabled);
	}
}

function updateBlockMargin(blockId, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistoryGrouped();
	block.marginBottom = Math.max(0, Number(value) || 0);
	const total = state.blocks.length;
	const isLast = state.blocks[total - 1]?.id === blockId;
	const effectiveMargin = (total <= 1 || isLast) ? 0 : block.marginBottom;
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (section) section.style.marginBottom = `${effectiveMargin}px`;
	updateMarkup();
}

function getMaxEditListDepthForBlock(block) {
	let max = 0;
	block.items.forEach(item => {
		Object.keys(item).forEach(k => {
			if (/^item\d+(_\d+)*$/.test(k)) {
				const d = (k.match(/_/g) || []).length;
				if (d > max) max = d;
			}
		});
	});
	return max; // 0 = 1뎁스만, 1 = 2뎁스까지, 2 = 3뎁스까지
}

function getEditListDepth(el) {
	let depth = 0;
	let parent = el.parentElement;
	while (parent) {
		if (parent.classList.contains('edit-list')) depth++;
		parent = parent.parentElement;
	}
	return depth;
}

function parseListFormat(format) {
	const idx = format.indexOf('{n}');
	if (idx === -1) return { prefix: format, suffix: '' };
	return { prefix: format.slice(0, idx), suffix: format.slice(idx + 3) };
}

function updateListStyle(blockId, depth, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistoryGrouped();
	if (!block.listStyles) block.listStyles = ['', '', ''];
	block.listStyles[depth] = value;
	const blockEl = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (blockEl) {
		blockEl.querySelectorAll('.edit-list').forEach(el => {
			if (getEditListDepth(el) !== depth) return;
			const toRemove = Array.from(el.classList).filter(c => c.startsWith('ls-') && c !== 'ls-bg');
			if (toRemove.length) el.classList.remove(...toRemove);
			if (value) el.classList.add(`ls-${value}`);
		});
	}
	renderOptionsPanel(blockId, state.selectedItem?.columnIndex ?? null);
	updateMarkup();
}

function updateBulletColor(blockId, depth, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistoryGrouped();
	if (!block.bulletColors) block.bulletColors = ['', '', ''];
	block.bulletColors[depth] = value;
	const blockEl = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (blockEl) {
		// 루트 ul에만 세팅 — 상속으로 하위 depth까지 도달
		blockEl.querySelectorAll('.edit-list[data-depth="1"]').forEach(rootUl => {
			if (value) rootUl.style.setProperty(`--ls-color-${depth + 1}`, value);
			else rootUl.style.removeProperty(`--ls-color-${depth + 1}`);
		});
	}
	updateMarkup();
}

function updateListFormat(blockId, depth, format) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistoryGrouped();
	if (!block.listFormats) block.listFormats = ['', '', ''];
	block.listFormats[depth] = format;
	const { prefix, suffix } = parseListFormat(format);
	const blockEl = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (blockEl) {
		blockEl.querySelectorAll('.edit-list[data-depth="1"]').forEach(rootUl => {
			if (prefix) rootUl.style.setProperty(`--ls-prefix-${depth + 1}`, `"${prefix}"`);
			else rootUl.style.removeProperty(`--ls-prefix-${depth + 1}`);
			if (suffix) rootUl.style.setProperty(`--ls-suffix-${depth + 1}`, `"${suffix}"`);
			else rootUl.style.removeProperty(`--ls-suffix-${depth + 1}`);
		});
	}
	updateMarkup();
}

function resetListStyle(blockId) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistory();
	block.listStyles = ['', '', ''];
	block.bulletColors = ['', '', ''];
	block.listFormats = ['', '', ''];
	const blockEl = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (blockEl) {
		blockEl.querySelectorAll('.edit-list').forEach(el => {
			const toRemove = Array.from(el.classList).filter(c => c.startsWith('ls-'));
			if (toRemove.length) el.classList.remove(...toRemove);
		});
		blockEl.querySelectorAll('.edit-list[data-depth="1"]').forEach(rootUl => {
			[1, 2, 3].forEach(d => {
				rootUl.style.removeProperty(`--ls-color-${d}`);
				rootUl.style.removeProperty(`--ls-prefix-${d}`);
				rootUl.style.removeProperty(`--ls-suffix-${d}`);
			});
		});
	}
	renderOptionsPanel(blockId, state.selectedItem?.columnIndex ?? null);
	updateMarkup();
}

function updateMixInnerMargin(outerBlockId, innerIdx, value) {
	const outerBlock = state.blocks.find(b => b.id === outerBlockId);
	if (!outerBlock || !Array.isArray(outerBlock.innerBlocks)) return;
	const innerBlock = outerBlock.innerBlocks[innerIdx];
	if (!innerBlock) return;
	pushHistoryGrouped();
	innerBlock.marginBottom = Math.max(0, Number(value) || 0);
	const section = document.querySelector(`.builder-block[data-block-id="${outerBlockId}"]`);
	const innerItem = section?.querySelector(`.mix-inner-item[data-mix-inner-idx="${innerIdx}"]`);
	if (innerItem) innerItem.style.marginBottom = `${innerBlock.marginBottom}px`;
	updateMarkup();
}

function startTextEdit(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const field = event.currentTarget;
	if (field.dataset.editField === 'icon') return;
	// 중첩 edit-list를 포함한 outer li는 li 자체를 편집 대상으로 삼지 않음 (내부 span이 처리)
	if (field.tagName === 'LI' && field.querySelector('.edit-list')) return;
	event.stopPropagation();
	field._editOriginalHtml = field.innerHTML;
	field.setAttribute('contenteditable', 'true');
	field.focus();
	const range = document.createRange();
	range.selectNodeContents(field);
	const selection = window.getSelection();
	selection.removeAllRanges();
	selection.addRange(range);
	field.addEventListener('blur', finishTextEdit, { once: true });
	field.addEventListener('keydown', handleEditKeydown);
	field.addEventListener('paste', handleEditPaste);
}

function _getFieldBlockWrapper(field) {
	// field 바로 아래에 단일 블록 래퍼(<p> 등)만 있는 경우 태그명 반환
	const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
	const first = field.firstElementChild;
	if (first && BLOCK_TAGS.has(first.tagName) && field.children.length === 1) {
		return first.tagName.toLowerCase();
	}
	return null;
}

function handleEditPaste(event) {
	event.preventDefault();
	const text = (event.clipboardData || window.clipboardData).getData('text/plain');
	const field = event.currentTarget;
	const selection = window.getSelection();
	if (!selection.rangeCount) return;

	// 삭제 전 블록 래퍼 구조 기억 (예: <div data-edit-field="title"><p>…</p></div>)
	const wrapperTag = _getFieldBlockWrapper(field);

	selection.deleteFromDocument();

	// field가 완전히 비워지고 원본에 블록 래퍼가 있었다면 복원
	if (wrapperTag && !field.firstChild) {
		const wrapEl = document.createElement(wrapperTag);
		wrapEl.textContent = text;
		field.appendChild(wrapEl);
		const newRange = document.createRange();
		newRange.selectNodeContents(wrapEl);
		newRange.collapse(false);
		selection.removeAllRanges();
		selection.addRange(newRange);
	} else {
		selection.getRangeAt(0).insertNode(document.createTextNode(text));
		selection.collapseToEnd();
	}
}

function handleEditKeydown(event) {
	if (event.key === 'Enter') {
		event.preventDefault();
		if (event.shiftKey) {
			const selection = window.getSelection();
			if (selection.rangeCount) {
				const range = selection.getRangeAt(0);
				range.deleteContents();
				const br = document.createElement('br');
				range.insertNode(br);
				range.setStartAfter(br);
				range.collapse(true);
				// contenteditable에서 마지막 <br>은 시각적으로 표시되지 않으므로
				// 커서 뒤에 의미있는 노드가 없으면 trailing <br>을 추가
				let next = br.nextSibling;
				while (next && next.nodeType === Node.TEXT_NODE && next.textContent === '') {
					next = next.nextSibling;
				}
				if (!next) {
					const trailing = document.createElement('br');
					range.insertNode(trailing);
					range.setStartBefore(trailing);
					range.collapse(true);
				}
				selection.removeAllRanges();
				selection.addRange(range);
			}
		} else {
			event.currentTarget.blur();
		}
	}
	if (event.key === 'Escape') {
		event.preventDefault();
		event.currentTarget._editCancelled = true;
		render();
	}
}

function finishTextEdit(event) {
	if (_colorPickerOpen) {
		event.currentTarget.addEventListener('blur', finishTextEdit, { once: true });
		return;
	}
	const field = event.currentTarget;
	field.removeEventListener('keydown', handleEditKeydown);
	field.removeEventListener('paste', handleEditPaste);
	field.removeAttribute('contenteditable');
	if (field._editCancelled) return;
	const columnIndex = Number(field.dataset.columnIndex);
	// 혼합 내부 블록 / title-list list-wrap 참조 여부 확인
	const mixRef = resolveMixInnerRef(field.dataset.blockId);
	const listRef = !mixRef ? resolveListInnerRef(field.dataset.blockId) : null;
	const targetItems = mixRef ? mixRef.innerBlock.items
		: listRef ? listRef.listBlock.items
		: state.blocks.find(b => b.id === field.dataset.blockId)?.items;
	if (!targetItems || !targetItems[columnIndex]) return;
	const html = field.innerHTML;
	const fieldName = field.dataset.editField;
	const originalHtml = field._editOriginalHtml ?? targetItems[columnIndex][fieldName] ?? '';
	if (html && html !== originalHtml) {
		pushHistory();
		targetItems[columnIndex][fieldName] = html;
	}
	render();
}

function handleCanvasDragOver(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const payload = state.dragPayload;
	if (payload.startsWith('overlay-type:') || payload.startsWith('overlay-custom:')) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
		document.getElementById('canvasWrapper')?.classList.add('is-decoration-over');
		return;
	}
	if (payload.startsWith('new-block:') || payload.startsWith('new-design-template:') || payload.startsWith('existing-block:') || payload.startsWith('copy-block:')) {
		event.preventDefault();
		canvasGrid.classList.add('is-over');
	}
}

function handleCanvasDrop(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
	if (!payload) return;
	clearDropIndicators();
	state.dragPayload = '';
	if (payload.startsWith('overlay-type:') || payload.startsWith('overlay-custom:')) {
		event.preventDefault();
		event.stopPropagation();
		document.getElementById('canvasWrapper')?.classList.remove('is-decoration-over');
		const grid = document.getElementById('canvasGrid');
		if (grid) {
			const gRect = grid.getBoundingClientRect();
			if (payload.startsWith('overlay-custom:')) {
				addCustomOverlay(payload.replace('overlay-custom:', ''), event.clientX - gRect.left, event.clientY - gRect.top);
			} else {
				addOverlay(payload.replace('overlay-type:', ''), event.clientX - gRect.left, event.clientY - gRect.top);
			}
		}
		return;
	}
	const targetBlock = event.target.closest('.builder-block');
	const position = targetBlock ? targetBlock.dataset.dropPosition || 'after' : 'after';
	if (payload.startsWith('new-block:')) {
		event.preventDefault();
		event.stopPropagation();
		addBlock(payload.replace('new-block:', ''), targetBlock ? targetBlock.dataset.blockId : null, position);
		return;
	}
	if (payload.startsWith('new-design-template:')) {
		event.preventDefault();
		event.stopPropagation();
		addDesignTemplate(payload.replace('new-design-template:', ''), targetBlock ? targetBlock.dataset.blockId : null, position);
		return;
	}
	if (payload.startsWith('existing-block:')) {
		event.preventDefault();
		event.stopPropagation();
		moveBlock(payload.replace('existing-block:', ''), targetBlock ? targetBlock.dataset.blockId : null, position);
		return;
	}
	if (payload.startsWith('copy-block:')) {
		event.preventDefault();
		event.stopPropagation();
		duplicateBlockAt(payload.replace('copy-block:', ''), targetBlock ? targetBlock.dataset.blockId : null, position);
	}
}

function handleBlockDrop(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
	if (!payload.startsWith('new-block:') && !payload.startsWith('new-design-template:') && !payload.startsWith('existing-block:') && !payload.startsWith('copy-block:')) return;
	event.preventDefault();
	event.stopPropagation();
	const targetBlockId = event.currentTarget.dataset.blockId;
	const position = event.currentTarget.dataset.dropPosition || 'after';
	clearDropIndicators();
	state.dragPayload = '';
	if (payload.startsWith('new-block:')) {
		addBlock(payload.replace('new-block:', ''), targetBlockId, position);
		return;
	}
	if (payload.startsWith('new-design-template:')) {
		addDesignTemplate(payload.replace('new-design-template:', ''), targetBlockId, position);
		return;
	}
	if (payload.startsWith('copy-block:')) {
		duplicateBlockAt(payload.replace('copy-block:', ''), targetBlockId, position);
		return;
	}
	moveBlock(payload.replace('existing-block:', ''), targetBlockId, position);
}

function updateMarkup() {
	const { html, css, full } = generateMarkupParts();
	document.getElementById('markupOutputHtml').value = html;
	document.getElementById('markupOutputCss').value = css || '/* CSS 없음 */';
	markupOutput.value = full;
}

function _getUsedTemplateBaseCss() {
	const seen = new Set();
	const parts = [];
	const collectType = (type) => {
		if (!type || !componentTemplates[type] || seen.has(type)) return;
		seen.add(type);
		const htmlPath = `${getTemplateBasePath(type)}/index.html`;
		const cssPath = getTemplateCssPath(htmlPath);
		if (seen.has(cssPath)) return;
		seen.add(cssPath);
		const text = templateCssTextCache.get(cssPath);
		if (text) parts.push(text);
	};
	state.blocks.forEach(block => {
		collectType(block.type);
		(block.innerBlocks || []).forEach(ib => collectType(ib.type));
	});
	state.overlays.forEach(ov => {
		if (!ov.customDecorationId) collectType(ov.type);
	});
	return parts;
}

function generateMarkupParts() {
	const empty = '<!-- 디자인 블록을 추가하면 마크업이 생성됩니다. -->';
	if (!state.blocks.length && !state.overlays.length) {
		return { html: empty, css: '', full: empty };
	}

	const { html: blocksHtml, cssRules: _blockCssRules } = state.blocks.length ? _generateBlocksMarkup() : { html: '', cssRules: [] };
	const cssRules = [..._getUsedTemplateBaseCss(), ..._blockCssRules];

	let htmlOnly;
	if (!state.overlays.length) {
		htmlOnly = blocksHtml;
	} else {
		cssRules.push(`@media (max-width: 768px) {\n  .sub-content-decoration {\n    display: none !important;\n  }\n}`);
		const overlaysMarkup = state.overlays.map(ov => {
			if (ov.customDecorationId) {
				const item = getCustomDecoration(ov.customDecorationId);
				if (!item) return '';
				return `  <div class="sub-content-decoration" style="position:absolute;top:${ov.y}px;left:${ov.x}px;">\n    <img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.name || '사용자 꾸밈요소')}" style="display:block;max-width:160px;height:auto;">\n  </div>`;
			}
			const template = componentTemplates[ov.type];
			if (!template) return '';
			const lines = template.markup(ov.data || {});
			const inner = lines.map(l => `    ${l}`).join('\n');
			return `  <div class="sub-content-decoration" style="position:absolute;top:${ov.y}px;left:${ov.x}px;">\n${inner}\n  </div>`;
		}).join('\n');
		const indented = blocksHtml.split('\n').map(l => `  ${l}`).join('\n');
		htmlOnly = `<div style="position:relative;">\n${indented}\n${overlaysMarkup}\n</div>`;
	}

	const cssOnly = cssRules.join('\n\n');
	const styleBlock = cssOnly ? `<style>\n${cssOnly}\n</style>` : '';
	const full = styleBlock ? `${styleBlock}\n\n${htmlOnly}` : htmlOnly;

	return { html: htmlOnly, css: cssOnly, full };
}

function generateMarkup() {
	return generateMarkupParts().full;
}

function _buildStyleRule(selector, vars) {
	const declarations = vars.split(';').map(s => s.trim()).filter(Boolean);
	return `${selector} {\n  ${declarations.join(';\n  ')};\n}`;
}

function _templateRootClass(template) {
	return template.element.classList[0] || template.id;
}

function _extractInnerVarStyles(el, baseSelector, cssRules) {
	el.querySelectorAll('[style]').forEach(inner => {
		const style = inner.getAttribute('style') || '';
		if (!style.includes('--')) return;
		const cls = Array.from(inner.classList)
			.find(c => !['inner', 'block-item', 'list-wrap-inner', 'template-title', 'template-body'].includes(c));
		if (!cls) return;
		cssRules.push(_buildStyleRule(`${baseSelector} .${cls}`, style));
		inner.removeAttribute('style');
	});
}

const _LIST_STYLE_EXPORT_CSS = {
	disc:    'list-style-type:disc !important;list-style-position:inside !important',
	circle:  'list-style-type:circle !important;list-style-position:inside !important',
	square:  'list-style-type:square !important;list-style-position:inside !important',
	num: 'list-style-type:decimal !important;list-style-position:inside !important',
	dash:    'list-style-type:none !important',
	custom:  'list-style-type:none !important',
};

function _generateBlocksMarkup() {
	const cssRules = [];
	if (state.blocks.some(b => b.blockWidth)) {
		cssRules.push('.sub-content-block { width: var(--block-width, auto); }');
	}
	const usedListStyles = [...new Set(state.blocks.flatMap(b => b.listStyles || []).filter(Boolean))];
	usedListStyles.forEach(style => {
		if (_LIST_STYLE_EXPORT_CSS[style]) {
			cssRules.push(`.edit-list.ls-${style} > li { ${_LIST_STYLE_EXPORT_CSS[style]}; }`);
		}
	});
	if (usedListStyles.includes('dash')) {
		[1, 2, 3].forEach(d => {
			cssRules.push(`.edit-list[data-depth="${d}"].ls-dash > li::before { content: ""; position: absolute; left: 0; top: 0.65rem; width: 6px; border-top: 1px solid var(--ls-color-${d}, currentColor); }`);
		});
	}
	const markerStyles = ['disc', 'circle', 'square'].filter(s => usedListStyles.includes(s));
	if (markerStyles.length) {
		[1, 2, 3].forEach(d => {
			cssRules.push(markerStyles.map(s => `.edit-list[data-depth="${d}"].ls-${s} > li::marker`).join(', ') + ` { color: var(--ls-color-${d}, currentColor); }`);
		});
	}
	if (usedListStyles.includes('num')) {
		[1, 2, 3].forEach(d => {
			cssRules.push(`.edit-list[data-depth="${d}"].ls-num > li::marker { color: var(--ls-color-${d}, currentColor); font-weight: bold; }`);
		});
	}
	if (usedListStyles.includes('custom')) {
		[1, 2, 3].forEach(d => {
			cssRules.push(`.edit-list[data-depth="${d}"].ls-custom > li::marker { content: var(--ls-prefix-${d},"") counter(list-item) var(--ls-suffix-${d},". "); color: var(--ls-color-${d}, currentColor); font-weight: bold; }`);
		});
	}
	const html = state.blocks.map((block, index) => {
		const blockNum = index + 1;
		const template = componentTemplates[block.type];
		const rootClass = _templateRootClass(template);
		let columns;

		if (template.isRootWrap) {
			columns = block.items.map((item, idx) => {
				const el = renderAddColumnWrapElement(template, item, block, idx, false);
				const vars = [columnStyleVars(item), columnFontVars(item)].filter(Boolean).join('; ');
				const outerSel = `.sub-content-block.block-${blockNum} .${rootClass}:nth-child(${idx + 1})`;
				if (vars) cssRules.push(_buildStyleRule(outerSel, vars));
				_extractInnerVarStyles(el, outerSel, cssRules);
				applyItemStyles(el, item, template);
				return htmlToLines(elementToHtml(el)).map(line => `  ${line}`).join('\n');
			}).join('\n');
		} else {
			const outer = buildColumnBlock(template, block, false);
			const fontVars = columnFontVars(block.items[0] || {});
			const vars = [outer.getAttribute('style') || '', fontVars].filter(Boolean).join('; ');
			const outerSel = `.sub-content-block.block-${blockNum} .${rootClass}`;
			if (vars) {
				cssRules.push(_buildStyleRule(outerSel, vars));
				outer.removeAttribute('style');
			}
			_extractInnerVarStyles(outer, outerSel, cssRules);
			applyItemStyles(outer, block.items[0] || {}, template);
			columns = htmlToLines(elementToHtml(outer)).map(line => `  ${line}`).join('\n');
		}

		const marginBottom = block.marginBottom ?? 30;
		if (block.blockWidth) cssRules.push(_buildStyleRule(`.sub-content-block.block-${blockNum}`, `--block-width:${block.blockWidth}`));
		const inlineParts = [marginBottom ? `margin-bottom:${marginBottom}px` : ''].filter(Boolean);
		const marginStyle = inlineParts.length ? ` style="${inlineParts.join(';')}"` : '';
		return [
			`<section class="sub-content-block block-${blockNum} columns-${block.columns}"${marginStyle}>`,
			columns,
			'</section>'
		].join('\n');
	}).join('\n\n');

	return { html, cssRules };
}

// ── 오버레이 시스템 ────────────────────────────────────────────

let _overlayNextId = 1;
let _overlayDrag = null;
let _overlayDragOffset = { x: 0, y: 0 };

function addOverlay(type, x, y) {
	const template = componentTemplates[type];
	if (!template) return;
	const data = template.getDefaultData ? template.getDefaultData() : {};
	state.overlays.push({ id: `ov-${_overlayNextId++}`, type, x: Math.round(x), y: Math.round(y), data });
	syncCanvasPresence();
	if (!state.blocks.length) render();
	renderOverlayItems();
	updateMarkup();
}

function addCustomOverlay(customDecorationId, x, y) {
	if (!getCustomDecoration(customDecorationId)) return;
	state.overlays.push({
		id: `ov-${_overlayNextId++}`,
		type: 'custom-decoration',
		customDecorationId,
		x: Math.round(x),
		y: Math.round(y)
	});
	syncCanvasPresence();
	if (!state.blocks.length) render();
	renderOverlayItems();
	updateMarkup();
}

function removeOverlay(id) {
	state.overlays = state.overlays.filter(ov => ov.id !== id);
	syncCanvasPresence();
	if (!state.blocks.length) render();
	renderOverlayItems();
	updateMarkup();
}

function renderCustomOverlayImage(overlay) {
	const item = getCustomDecoration(overlay.customDecorationId);
	if (!item) return '';
	return `<img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.name || '사용자 꾸밈요소')}" class="custom-overlay-img">`;
}

function getGridOffset() {
	const grid = document.getElementById('canvasGrid');
	const wrapper = document.getElementById('canvasWrapper');
	if (!grid || !wrapper) return { x: 0, y: 0 };
	const gRect = grid.getBoundingClientRect();
	const wRect = wrapper.getBoundingClientRect();
	return { x: gRect.left - wRect.left, y: gRect.top - wRect.top + wrapper.scrollTop };
}

function renderOverlayItems() {
	const layer = document.getElementById('overlayLayer');
	if (!layer) return;
	const off = getGridOffset();
	if (document.body.classList.contains('preview-mode')) {
		layer.innerHTML = state.overlays.map(ov => {
			if (ov.customDecorationId) {
				const html = renderCustomOverlayImage(ov);
				if (!html) return '';
				return `<div class="overlay-item" data-ov-id="${ov.id}" style="top:${ov.y + off.y}px;left:${ov.x + off.x}px;">${html}</div>`;
			}
			const template = componentTemplates[ov.type];
			if (!template) return '';
			const html = template.render({ id: ov.id }, ov.data || {}, 0, false);
			return `<div class="overlay-item" data-ov-id="${ov.id}" style="top:${ov.y + off.y}px;left:${ov.x + off.x}px;">${html}</div>`;
		}).join('');
		return;
	}
	layer.innerHTML = state.overlays.map(ov => {
		if (ov.customDecorationId) {
			const html = renderCustomOverlayImage(ov);
			if (!html) return '';
			return `<div class="overlay-item is-editable" data-ov-id="${ov.id}"
				style="top:${ov.y + off.y}px;left:${ov.x + off.x}px;">
				<button type="button" class="overlay-remove-btn" data-ov-id="${ov.id}" aria-label="삭제">×</button>
				${html}</div>`;
		}
		const template = componentTemplates[ov.type];
		if (!template) return '';
		const html = template.render({ id: ov.id }, ov.data || {}, 0, false);
		return `<div class="overlay-item is-editable" data-ov-id="${ov.id}"
			style="top:${ov.y + off.y}px;left:${ov.x + off.x}px;">
			<button type="button" class="overlay-remove-btn" data-ov-id="${ov.id}" aria-label="삭제">×</button>
			${html}</div>`;
	}).join('');
	bindOverlayItemEvents();
}

function bindOverlayItemEvents() {
	document.querySelectorAll('.overlay-remove-btn').forEach(btn => {
		btn.addEventListener('click', e => { e.stopPropagation(); removeOverlay(btn.dataset.ovId); });
	});
	document.querySelectorAll('.overlay-item.is-editable').forEach(item => {
		item.addEventListener('mousedown', onOverlayItemMouseDown);
	});
}

function onOverlayItemMouseDown(event) {
	if (event.target.closest('.overlay-remove-btn')) return;
	event.preventDefault();
	const item = event.currentTarget;
	_overlayDrag = state.overlays.find(ov => ov.id === item.dataset.ovId);
	if (!_overlayDrag) return;
	const itemRect = item.getBoundingClientRect();
	_overlayDragOffset = { x: event.clientX - itemRect.left, y: event.clientY - itemRect.top };
	document.addEventListener('mousemove', onOverlayMouseMove);
	document.addEventListener('mouseup', onOverlayMouseUp);
}

function onOverlayMouseMove(event) {
	if (!_overlayDrag) return;
	const grid = document.getElementById('canvasGrid');
	if (!grid) return;
	const gRect = grid.getBoundingClientRect();
	_overlayDrag.x = Math.round(event.clientX - gRect.left - _overlayDragOffset.x);
	_overlayDrag.y = Math.round(event.clientY - gRect.top - _overlayDragOffset.y);
	const off = getGridOffset();
	const item = document.querySelector(`.overlay-item[data-ov-id="${_overlayDrag.id}"]`);
	if (item) { item.style.left = (_overlayDrag.x + off.x) + 'px'; item.style.top = (_overlayDrag.y + off.y) + 'px'; }
}

function onOverlayMouseUp() {
	if (_overlayDrag) updateMarkup();
	_overlayDrag = null;
	document.removeEventListener('mousemove', onOverlayMouseMove);
	document.removeEventListener('mouseup', onOverlayMouseUp);
}

function toggleOverlayEdit() {
	const isNowEdit = document.body.classList.toggle('overlay-edit');
	const toggleBtn = document.getElementById('overlayEditToggle');
	if (toggleBtn) {
		toggleBtn.innerHTML = isNowEdit
			? '<i class="ri-magic-line" aria-hidden="true"></i> 꾸밈 편집 중'
			: '<i class="ri-magic-line" aria-hidden="true"></i> 꾸밈 편집';
	}
	renderOverlayItems();
}

function exitOverlayEdit() {
	if (!document.body.classList.contains('overlay-edit')) return;
	document.body.classList.remove('overlay-edit');
	const toggleBtn = document.getElementById('overlayEditToggle');
	if (toggleBtn) toggleBtn.innerHTML = '<i class="ri-magic-line" aria-hidden="true"></i> 꾸밈 편집';
	renderOverlayItems();
}

function populateOverlayDrawer() {
	const list = document.getElementById('overlayDrawerList');
	if (!list) return;
	const decorations = Object.values(componentTemplates).filter(t =>
		(templateCategories[t.id] || '') === 'decoration'
	);
	if (!decorations.length) {
		list.innerHTML = '<p class="overlay-drawer-empty">등록된 꾸밈 요소가 없습니다.</p>';
		return;
	}
	list.innerHTML = decorations.map(t => `
		<div class="overlay-drawer-item" draggable="true" data-overlay-type="${t.id}"></div>`).join('');

	decorations.forEach(async t => {
		const item = list.querySelector(`[data-overlay-type="${t.id}"]`);
		if (!item) return;
		item.innerHTML = `<img src="${escapeAttr(getDecorationImageUrl(t))}" alt="${escapeAttr(t.name)}">`;
	});

	list.querySelectorAll('.overlay-drawer-item').forEach(item => {
		item.addEventListener('dragstart', event => {
			state.dragPayload = 'overlay-type:' + item.dataset.overlayType;
			event.dataTransfer.effectAllowed = 'copy';
		});
	});
}

function initCompactHeader() {
	const sentinel = document.getElementById('headerSentinel');
	const topbar = document.querySelector('.topbar');
	if (!sentinel || !topbar) return;

	const updateHeaderHeight = () => {
		document.documentElement.style.setProperty('--header-h', topbar.offsetHeight + 'px');
	};
	new ResizeObserver(updateHeaderHeight).observe(topbar);
	updateHeaderHeight();

	new IntersectionObserver(([entry]) => {
		if (document.body.classList.contains('preview-mode')) return;
		const compact = !entry.isIntersecting;
		document.body.classList.toggle('header-compact', compact);
	}, { threshold: 0 }).observe(sentinel);
}

function initOverlayLayer() {
	const layer = document.getElementById('overlayLayer');
	const wrapper = document.getElementById('canvasWrapper');
	if (!layer || !wrapper) return;

	layer.addEventListener('dragover', event => {
		if (!state.dragPayload.startsWith('overlay-type:') && !state.dragPayload.startsWith('overlay-custom:')) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
	});

	layer.addEventListener('drop', event => {
		const payload = state.dragPayload;
		if (!payload.startsWith('overlay-type:') && !payload.startsWith('overlay-custom:')) return;
		event.preventDefault();
		const grid = document.getElementById('canvasGrid');
		if (grid) {
			const gRect = grid.getBoundingClientRect();
			if (payload.startsWith('overlay-custom:')) {
				addCustomOverlay(payload.replace('overlay-custom:', ''), event.clientX - gRect.left, event.clientY - gRect.top);
			} else {
				addOverlay(payload.replace('overlay-type:', ''), event.clientX - gRect.left, event.clientY - gRect.top);
			}
		}
		state.dragPayload = '';
	});
}

function getActiveMarkupTextarea() {
	const activeTab = document.querySelector('.markup-tab.is-active, .markup-tab-btn.is-active');
	const tab = activeTab?.dataset.markupTab || 'all';
	if (tab === 'html') return document.getElementById('markupOutputHtml');
	if (tab === 'css') return document.getElementById('markupOutputCss');
	return markupOutput;
}

function copyMarkup() {
	const textarea = getActiveMarkupTextarea();
	const text = textarea.value;
	copyState.textContent = '';
	if (navigator.clipboard && window.isSecureContext) {
		navigator.clipboard.writeText(text).then(showCopySuccess).catch(() => {
			textarea.focus();
			textarea.select();
			document.execCommand('copy');
			showCopySuccess();
		});
		return;
	}
	textarea.focus();
	textarea.select();
	document.execCommand('copy');
	showCopySuccess();
}

function showCopySuccess() {
	copyState.textContent = '마크업을 클립보드에 복사했습니다.';
	window.setTimeout(() => {
		copyState.textContent = '';
	}, 2200);
}

function switchMarkupTab(tab) {
	const normalizedTab = tab === 'full' ? 'all' : tab;
	document.querySelectorAll('.markup-tab, .markup-tab-btn').forEach(btn => {
		const buttonTab = btn.dataset.markupTab === 'full' ? 'all' : btn.dataset.markupTab;
		const active = buttonTab === normalizedTab;
		btn.classList.toggle('is-active', active);
		btn.setAttribute('aria-selected', String(active));
	});
	document.getElementById('markupOutputHtml').hidden = normalizedTab !== 'html';
	document.getElementById('markupOutputCss').hidden = normalizedTab !== 'css';
	markupOutput.hidden = normalizedTab !== 'all';
}

function openMarkup() {
	document.body.classList.add('markup-open');
	markupToggle.setAttribute('aria-expanded', 'true');
}

function closeMarkup() {
	document.body.classList.remove('markup-open');
	markupToggle.setAttribute('aria-expanded', 'false');
}

function toggleMarkupPanel() {
	document.body.classList.contains('markup-open') ? closeMarkup() : openMarkup();
}

function togglePreview() {
	const isPreview = document.body.classList.toggle('preview-mode');
	previewToggle.setAttribute('aria-pressed', String(isPreview));
	previewToggle.innerHTML = isPreview
		? '<i class="ri-edit-line" aria-hidden="true"></i> 편집하기'
		: '<i class="ri-eye-line" aria-hidden="true"></i> 미리보기';
	const toolbar = document.getElementById('textFormatToolbar');
	if (toolbar) toolbar.hidden = true;
	if (isPreview) {
		exitCompactHeader();
		renderOverlayItems();
	} else {
		renderOverlayItems();
	}
	render();
}

function exitCompactHeader() {
	if (!document.body.classList.contains('header-compact')) return;
	document.body.classList.remove('header-compact');
}

function returnToCanvas() {
	if (!document.body.classList.contains('preview-mode')) return;
	exitOverlayEdit();
	togglePreview();
}

function openMarkupFromPreview() {
	openMarkup();
}

function collectStylesheetText() {
	return Array.from(document.styleSheets).map(sheet => {
		try {
			return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
		} catch (error) {
			return '';
		}
	}).join('\n');
}

function downloadBlob(blob, filename) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

async function savePreviewImage() {
	if (!state.blocks.length) return;
	const lib = await ensureHtmlToImage();
	if (!lib) { alert('이미지 저장 라이브러리를 불러오지 못했습니다.'); return; }

	await document.fonts.ready;

	const btn = savePreviewImageButton;
	btn.disabled = true;

	// 캡처 전 오버레이 편집 UI 임시 제거
	const wasOverlayEdit = document.body.classList.contains('overlay-edit');
	if (wasOverlayEdit) document.body.classList.remove('overlay-edit');
	renderOverlayItems();

	const captureTarget = document.getElementById('canvasWrapper');
	const canvasGridEl = document.getElementById('canvasGrid');
	if (!captureTarget || !canvasGridEl) {
		alert('이미지 저장 대상 요소를 찾을 수 없습니다.');
		btn.disabled = false;
		return;
	}

	document.body.classList.add('preview-export');

	// preview-mode min-height:100% 가 preview-export min-height:0 보다 specificity가 높아
	// inline style로 강제 해제해야 블록 높이만 측정됨
	canvasGridEl.style.minHeight = '0';

	// canvasGrid 실제 크기 측정 (preview-export CSS 적용 후)
	const gridWidth = canvasGridEl.offsetWidth;
	const gridHeight = canvasGridEl.scrollHeight;

	// DOM 조작 중 레이아웃 변화가 화면에 보이지 않도록 오버레이로 가림
	const captureRect = captureTarget.getBoundingClientRect();
	const coverOverlay = document.createElement('div');
	coverOverlay.style.cssText = `position:fixed;top:${captureRect.top}px;left:${captureRect.left}px;width:${captureRect.width}px;height:${captureRect.height}px;z-index:99999;pointer-events:none;background:#f7f7fa`;
	document.body.appendChild(coverOverlay);

	// canvasWrapper를 canvasGrid와 동일한 크기로 강제 (캡처 영역 = 콘텐츠만)
	const orig = {
		wOverflow: captureTarget.style.overflow,
		wHeight:   captureTarget.style.height,
		wMaxHeight: captureTarget.style.maxHeight,
		wWidth:    captureTarget.style.width,
		wMaxWidth: captureTarget.style.maxWidth,
		wScrollTop: captureTarget.scrollTop,
		wScrollLeft: captureTarget.scrollLeft,
		gMargin:   canvasGridEl.style.margin,
		gMinHeight: canvasGridEl.style.minHeight,
	};
	captureTarget.style.overflow  = 'visible';
	captureTarget.style.height    = `${gridHeight}px`;
	captureTarget.style.maxHeight = 'none';
	captureTarget.style.width     = `${gridWidth}px`;
	captureTarget.style.maxWidth  = `${gridWidth}px`;
	captureTarget.scrollTop  = 0;
	captureTarget.scrollLeft = 0;
	canvasGridEl.style.margin = '0';

	// 가이드 숨김
	const guide = captureTarget.querySelector('.canvas-guide');
	if (guide) guide.hidden = true;

	// 오버레이 이미지를 data URL로 인라인 (html-to-image 캡처 누락 방지)
	const exportImgs = [...captureTarget.querySelectorAll('img')];
	const imgOrigSrcs = exportImgs.map(img => img.getAttribute('src'));
	await Promise.all(exportImgs.map(async (img) => {
		try {
			const resp = await fetch(img.src);
			const blob = await resp.blob();
			const dataUrl = await new Promise(resolve => {
				const reader = new FileReader();
				reader.onload = () => resolve(reader.result);
				reader.onerror = () => resolve(null);
				reader.readAsDataURL(blob);
			});
			if (dataUrl) img.src = dataUrl;
		} catch (e) {}
	}));

	try {
		const targetWidth = Number(state.canvasWidth) || 1200;
		const pixelRatio = targetWidth / Math.max(1, gridWidth);
		const dataUrl = await lib.toPng(captureTarget, {
			backgroundColor: '#ffffff',
			width: gridWidth,
			height: gridHeight,
			pixelRatio
		});
		const link = document.createElement('a');
		link.href = dataUrl;
		link.download = `grid-builder-${Date.now()}.png`;
		link.click();
	} catch (e) {
		console.error(e);
		alert('이미지 저장에 실패했습니다.');
	} finally {
		// 이미지 src 복원
		exportImgs.forEach((img, i) => { if (imgOrigSrcs[i]) img.src = imgOrigSrcs[i]; });
		if (guide) guide.hidden = false;
		captureTarget.style.overflow  = orig.wOverflow;
		captureTarget.style.height    = orig.wHeight;
		captureTarget.style.maxHeight = orig.wMaxHeight;
		captureTarget.style.width     = orig.wWidth;
		captureTarget.style.maxWidth  = orig.wMaxWidth;
		captureTarget.scrollTop  = orig.wScrollTop;
		captureTarget.scrollLeft = orig.wScrollLeft;
		canvasGridEl.style.margin = orig.gMargin;
		canvasGridEl.style.minHeight = orig.gMinHeight;
		document.body.classList.remove('preview-export');
		coverOverlay.remove();
		btn.disabled = false;
		if (wasOverlayEdit) {
			document.body.classList.add('overlay-edit');
			renderOverlayItems();
		}
	}
}

function downloadBlob(content, filename, type) {
	const blob = new Blob([content], { type });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

function saveKlic() {
	if (!state.blocks.length && !state.overlays.length) {
		alert('저장할 콘텐츠가 없습니다.');
		return;
	}
	const modal = document.getElementById('saveKlicModal');
	const input = document.getElementById('saveKlicName');
	input.value = `klic-builder-${new Date().toISOString().slice(0, 10)}`;
	modal.hidden = false;
	requestAnimationFrame(() => { input.focus(); input.select(); });
}

function closeSaveKlicModal() {
	document.getElementById('saveKlicModal').hidden = true;
}

function confirmSaveKlic() {
	const rawName = document.getElementById('saveKlicName').value.trim() || `klic-builder-${Date.now()}`;
	const name = rawName.replace(/\.(klic|html?)$/i, '');

	const data = {
		format: 'klic-builder',
		version: '1',
		state: {
			blocks: cloneData(state.blocks),
			overlays: cloneData(state.overlays),
			canvasWidth: state.canvasWidth,
			nextBlockId: state.nextBlockId
		}
	};
	downloadBlob(JSON.stringify(data, null, 2), `${name}.klic`, 'application/octet-stream');

	const fullMarkup = generateMarkupParts().full;
	downloadBlob(fullMarkup, `${name}.html`, 'text/html; charset=utf-8');

	closeSaveKlicModal();
}

async function confirmFileSave() {
	const nameRaw = document.getElementById('saveFileNameInput')?.value.trim() || '';
	const name = nameRaw || '저장';
	const formats = Array.from(document.querySelectorAll('input[name="saveFileFormat"]:checked')).map(el => el.value);

	if (!formats.length) { alert('저장 형식을 하나 이상 선택하세요.'); return; }

	const btn = document.getElementById('saveFileConfirm');
	const btnOrigHtml = btn ? btn.innerHTML : '';
	if (btn) {
		btn.disabled = true;
		btn.innerHTML = '<span class="save-btn-spinner"></span> 처리 중...';
	}

	try {
		for (const format of formats) {
			if (format === 'klic') {
				const data = {
					format: 'klic-builder',
					version: '1',
					state: {
						blocks: cloneData(state.blocks),
						overlays: cloneData(state.overlays),
						canvasWidth: state.canvasWidth,
						nextBlockId: state.nextBlockId
					}
				};
				downloadBlob(JSON.stringify(data, null, 2), `${name}.klic`, 'application/octet-stream');
			} else if (format === 'pdf') {
				alert('PDF 저장 기능은 현재 준비 중입니다. .klic 형식으로 저장해주세요.');
			}
		}
		document.getElementById('saveFileModal').hidden = true;
	} finally {
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = btnOrigHtml;
		}
	}
}

function loadKlic() {
	document.getElementById('klicFileInput').click();
}

function handleKlicFile(file) {
	if (!file) return;
	const reader = new FileReader();
	reader.onload = e => {
		try {
			const data = JSON.parse(e.target.result);
			if (data.format !== 'klic-builder') {
				alert('올바른 .klic 파일이 아닙니다.');
				return;
			}
			const s = data.state || {};
			pushHistory();
			state.blocks = Array.isArray(s.blocks) ? s.blocks : [];
			state.overlays = Array.isArray(s.overlays) ? s.overlays : [];
			state.nextBlockId = Number(s.nextBlockId) || 1;
			state.canvasWidth = s.canvasWidth || '1200';
			state.selectedItem = null;
			updateCanvasWidth(state.canvasWidth);
			clearOptionsPanel();
			render();
			renderOverlayItems();
			updateMarkup();
		} catch (err) {
			alert('.klic 파일을 불러오지 못했습니다.');
		}
	};
	reader.readAsText(file);
}

function ensureHtmlToImage() {
	if (window.htmlToImage) return Promise.resolve(window.htmlToImage);
	if (window.__htmlToImageLoading) return window.__htmlToImageLoading;

	window.__htmlToImageLoading = new Promise(resolve => {
		const script = document.createElement('script');
		script.src = HTML_TO_IMAGE_SRC;
		script.async = true;
		script.onload = () => resolve(window.htmlToImage || null);
		script.onerror = () => resolve(null);
		document.head.appendChild(script);
	});
	return window.__htmlToImageLoading;
}

function showTemplateLoadError(error) {
	componentList.innerHTML = `<p class="template-error">${escapeHtml(error.message)}</p>`;
	canvasGrid.innerHTML = '<div class="canvas-empty">템플릿을 불러오지 못했습니다</div>';
}

// ── 리스트 편집 버튼 ─────────────────────────────────────
let _listEditButtons = null;
let _listEditTarget = null;
let _listEditHideTimer = null;

function createListEditButtons() {
	const el = document.createElement('div');
	el.id = 'listEditButtons';
	el.className = 'list-edit-buttons';
	el.hidden = true;
	el.innerHTML = `
		<button type="button" class="list-edit-btn list-add-btn" title="같은 뎁스 항목 추가 (아래)">
			<i class="ri-add-line" aria-hidden="true"></i>
		</button>
		<button type="button" class="list-edit-btn list-add-child-btn" title="하위 항목 추가" hidden>
			<i class="ri-corner-down-right-line" aria-hidden="true"></i>
		</button>
		<button type="button" class="list-edit-btn list-del-btn" title="항목 삭제">
			<i class="ri-delete-bin-line" aria-hidden="true"></i>
		</button>
	`;
	document.body.appendChild(el);

	el.addEventListener('mouseenter', () => clearTimeout(_listEditHideTimer));
	el.addEventListener('mouseleave', () => {
		_listEditHideTimer = setTimeout(() => { el.hidden = true; }, 120);
	});
	el.querySelector('.list-add-btn').addEventListener('click', () => {
		if (!_listEditTarget) return;
		addListItem(_listEditTarget.blockId, _listEditTarget.columnIndex, _listEditTarget.fieldKey);
		el.hidden = true;
	});
	el.querySelector('.list-add-child-btn').addEventListener('click', () => {
		if (!_listEditTarget) return;
		addChildListItem(_listEditTarget.blockId, _listEditTarget.columnIndex, _listEditTarget.fieldKey);
		el.hidden = true;
	});
	el.querySelector('.list-del-btn').addEventListener('click', () => {
		if (!_listEditTarget) return;
		deleteListItem(_listEditTarget.blockId, _listEditTarget.columnIndex, _listEditTarget.fieldKey);
		el.hidden = true;
	});
	return el;
}

function positionListEditButtons(li) {
	_listEditButtons.hidden = false;
	const rect = li.getBoundingClientRect();
	const bh = _listEditButtons.offsetHeight;
	const bw = _listEditButtons.offsetWidth;
	let left = rect.right + 6;
	let top = rect.top;
	left = Math.min(left, window.innerWidth - bw - 4);
	top = Math.max(4, Math.min(top, window.innerHeight - bh - 4));
	_listEditButtons.style.left = `${left}px`;
	_listEditButtons.style.top = `${top}px`;

	const block = state.blocks.find(b => b.id === li.dataset.blockId);
	const columnIndex = Number(li.dataset.columnIndex);
	const fieldKey = li.dataset.editField;
	const isSubItem = fieldKey && /^item\d+(_\d+)+$/.test(fieldKey);

	// 삭제 버튼: depth-1(최상위) 아이템이 1개 남았을 때만 비활성
	const delDisabled = !isSubItem && block && fieldKey
		? getEditListItems(block.items[columnIndex] || {}).length <= 1
		: false;
	_listEditButtons.querySelector('.list-del-btn').disabled = delDisabled;

	// 하위 추가 버튼: 다음 뎁스 템플릿이 있을 때만 노출
	const addChildBtn = _listEditButtons.querySelector('.list-add-child-btn');
	if (block && fieldKey) {
		const template = componentTemplates[block.type];
		const depth = fieldKey.split('_').length - 1;
		const hasNextLevel = (template?.editListTemplates?.length ?? 0) > 0 && depth + 1 < EDIT_LIST_MAX_DEPTH;
		addChildBtn.hidden = !hasNextLevel;
	} else {
		addChildBtn.hidden = true;
	}
}

function bindEditListEvents() {
	document.querySelectorAll('.edit-list li[data-block-id]').forEach(li => {
		li.addEventListener('mouseenter', () => {
			if (document.body.classList.contains('preview-mode')) return;
			clearTimeout(_listEditHideTimer);
			_listEditTarget = {
				blockId: li.dataset.blockId,
				columnIndex: Number(li.dataset.columnIndex),
				fieldKey: li.dataset.editField
			};
			positionListEditButtons(li);
		});
		li.addEventListener('mouseleave', () => {
			_listEditHideTimer = setTimeout(() => {
				if (!_listEditButtons.matches(':hover')) _listEditButtons.hidden = true;
			}, 120);
		});
	});
}

// ── 인라인 텍스트 포맷 툴바 ───────────────────────────────
let _savedRange = null;
let _savedEditTarget = null;
let _colorPickerOpen = false;
let _toolbarPinned = false; // 닫기버튼 클릭 전까지 툴바 고정

function createFormatToolbar() {
	const el = document.createElement('div');
	el.id = 'textFormatToolbar';
	el.className = 'text-format-toolbar';
	el.hidden = true;
	el.innerHTML = `
		<button type="button" class="fmt-btn" data-cmd="bold" title="굵게"><b>B</b></button>
		<button type="button" class="fmt-btn" data-cmd="underline" title="밑줄"><u>U</u></button>
		<label class="fmt-color" title="글자색"><input type="color" value="#000000"></label>
		<span class="fmt-divider" aria-hidden="true"></span>
		<button type="button" class="fmt-btn fmt-close" title="닫기" aria-label="닫기"><i class="ri-close-line" aria-hidden="true"></i></button>
	`;
	document.body.appendChild(el);

	const colorInput = el.querySelector('input[type="color"]');

	el.addEventListener('mousedown', e => {
		if (e.target !== colorInput) e.preventDefault();
		saveFormatRange();
	});

	el.querySelectorAll('[data-cmd]').forEach(btn => {
		btn.addEventListener('click', () => {
			restoreFormatRange();
			document.execCommand(btn.dataset.cmd);
			updateFormatState(el);
		});
	});

	el.querySelector('.fmt-close').addEventListener('click', () => {
		_toolbarPinned = false;
		el.hidden = true;
	});

	colorInput.addEventListener('mousedown', () => {
		_colorPickerOpen = true;
		saveFormatRange();
	});

	colorInput.addEventListener('input', () => {
		restoreFormatRange();
		document.execCommand('foreColor', false, colorInput.value);
		saveFormatRange(); // execCommand 이후 DOM이 바뀌므로 range 갱신
	});

	colorInput.addEventListener('change', () => {
		_colorPickerOpen = false;
		_toolbarPinned = true; // 색상 조정 후 툴바 고정 (닫기버튼으로만 해제)
		if (_savedEditTarget && _savedRange) {
			const wasEditable = _savedEditTarget.getAttribute('contenteditable') === 'true';
			if (!wasEditable) _savedEditTarget.setAttribute('contenteditable', 'true');
			restoreFormatRange();
			document.execCommand('foreColor', false, colorInput.value);
			if (!wasEditable) {
				const html = _savedEditTarget.innerHTML;
				const block = state.blocks.find(b => b.id === _savedEditTarget.dataset.blockId);
				const columnIndex = Number(_savedEditTarget.dataset.columnIndex);
				if (block && block.items[columnIndex]) {
					block.items[columnIndex][_savedEditTarget.dataset.editField] = html;
				}
				_savedEditTarget.removeAttribute('contenteditable');
				_savedRange = null;
				_savedEditTarget = null;
				el.hidden = true;
				_toolbarPinned = false;
				render();
			} else {
				saveFormatRange(); // wasEditable: range 갱신으로 재조작 가능하게
			}
		}
	});

	return el;
}

function saveFormatRange() {
	const sel = window.getSelection();
	if (sel?.rangeCount > 0) {
		_savedRange = sel.getRangeAt(0).cloneRange();
		_savedEditTarget = sel.anchorNode?.parentElement?.closest('[contenteditable="true"]') || null;
	} else {
		_savedRange = null;
		_savedEditTarget = null;
	}
}

function restoreFormatRange() {
	if (!_savedRange) return;
	if (_savedEditTarget) _savedEditTarget.focus();
	const sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange(_savedRange);
}

function positionFormatToolbar(toolbar, rect) {
	toolbar.hidden = false;
	const tw = toolbar.offsetWidth;
	const th = toolbar.offsetHeight;
	let left = rect.left + rect.width / 2 - tw / 2;
	let top = rect.top - th - 8;
	if (top < 4) top = rect.bottom + 8;
	left = Math.max(4, Math.min(left, window.innerWidth - tw - 4));
	top = Math.max(4, Math.min(top, window.innerHeight - th - 4));
	toolbar.style.left = `${left}px`;
	toolbar.style.top = `${top}px`;
}

function updateFormatState(toolbar) {
	toolbar.querySelector('[data-cmd="bold"]').classList.toggle('is-active', document.queryCommandState('bold'));
	toolbar.querySelector('[data-cmd="underline"]').classList.toggle('is-active', document.queryCommandState('underline'));
}

function initFormatToolbar() {
	const toolbar = createFormatToolbar();

	document.addEventListener('selectionchange', () => {
		if (document.body.classList.contains('preview-mode')) return;
		const sel = window.getSelection();
		if (!sel || sel.isCollapsed || !sel.toString().trim()) {
			setTimeout(() => {
				if (!toolbar.matches(':hover') && !_colorPickerOpen && !_toolbarPinned) toolbar.hidden = true;
			}, 120);
			return;
		}
		const anchor = sel.anchorNode?.parentElement?.closest('[contenteditable="true"]');
		if (!anchor) {
			if (!_colorPickerOpen && !_toolbarPinned) toolbar.hidden = true;
			return;
		}
		_toolbarPinned = false; // 새로운 텍스트 선택 시 핀 해제
		saveFormatRange();
		positionFormatToolbar(toolbar, sel.getRangeAt(0).getBoundingClientRect());
		updateFormatState(toolbar);
	});
}

const GOAL_TOUR_STEPS = [
	{
		target: '.sidebar-tabs',
		title: '빌더 모드 선택',
		desc: '디자인 템플릿, 디자인 블록, 직접 만들기 탭을 전환하며 필요한 교육목표 구성을 고를 수 있습니다.',
		position: 'bottom'
	},
	{
		target: '[data-tab-filter="blocks"]',
		title: '디자인 블록 필터',
		desc: '타이틀과 본문 유형을 필터링해 필요한 블록만 빠르게 찾습니다.',
		position: 'bottom'
	},
	{
		target: '.canvas-wrapper',
		title: '캔버스 편집',
		desc: '왼쪽의 블록을 드래그하거나 추가 버튼을 눌러 캔버스에 배치하고 내용을 바로 편집합니다.',
		position: 'left'
	},
	{
		target: '#canvasSizeControl',
		title: '캔버스 크기',
		desc: 'PC 작업 기준 캔버스 폭을 1000, 1200, 1400px 중에서 선택합니다.',
		position: 'bottom'
	},
	{
		target: '.right-col',
		title: '상세 옵션',
		desc: '블록을 선택하면 색상, 글자, 간격 같은 세부 스타일을 오른쪽 패널에서 조정합니다.',
		position: 'left'
	}
];

function initGuidedTour() {
	KlicBuilderShared.initGuidedTour({
		steps: GOAL_TOUR_STEPS,
		beforeStep: index => {
			if (index !== 4 || state.blocks.length !== 0) return;
			const templateIds = Object.keys(componentTemplates);
			const blockId = templateIds.find(id => !['design-template', 'design-template-section', 'decoration'].includes(templateCategories[id]));
			if (blockId) {
				state.blocks.push(createBlock(blockId));
				render();
			}
		}
	});
}

async function init() {
	relocateDecoStudioDrawer();
	bindIconDrawerDelegates();
	initDecoStudio();
	loadCustomDecorations();
	componentList.classList.add('is-empty-state');
	try {
		const iconPromise = loadIconCategories();
		await loadTemplates();
		renderDesignTemplateList();
		renderComponentList();
		iconPromise.catch(error => console.warn('Icon manifest load failed:', error));
	} catch (error) {
		console.error(error);
		showTemplateLoadError(error);
	} finally {
		resolveTemplatesReady();
	}

	document.getElementById('clearCanvas').addEventListener('click', clearCanvas);
	document.getElementById('copyMarkup').addEventListener('click', copyMarkup);
	bindFilterEvents();
	KlicBuilderShared.bindSidebarTabs(tab => {
		state.sidebarTab = tab;
		renderRecommendationPanel();
	});
	previewToggle.addEventListener('click', togglePreview);
	previewReturn.addEventListener('click', returnToCanvas);
	savePreviewImageButton.addEventListener('click', savePreviewImage);
	previewMarkupOpenButton?.addEventListener('click', openMarkupFromPreview);
	document.getElementById('saveKlic')?.addEventListener('click', saveKlic);
	document.getElementById('saveFileButton')?.addEventListener('click', saveKlic);
	bindBuilderExitConfirm();
	document.getElementById('saveKlicClose')?.addEventListener('click', closeSaveKlicModal);
	document.getElementById('saveKlicCancel')?.addEventListener('click', closeSaveKlicModal);
	document.getElementById('saveKlicBackdrop')?.addEventListener('click', closeSaveKlicModal);
	document.getElementById('saveKlicConfirm')?.addEventListener('click', confirmSaveKlic);
	document.getElementById('saveKlicName')?.addEventListener('keydown', e => {
		if (e.key === 'Enter') confirmSaveKlic();
		if (e.key === 'Escape') closeSaveKlicModal();
	});
	document.getElementById('saveFileConfirm')?.addEventListener('click', confirmFileSave);
	document.getElementById('loadKlic')?.addEventListener('click', loadKlic);
	document.getElementById('klicFileInput')?.addEventListener('change', e => {
		handleKlicFile(e.target.files?.[0]);
		e.target.value = '';
	});
	markupToggle.addEventListener('click', toggleMarkupPanel);
	document.getElementById('decoStudioOpen')?.addEventListener('click', openDecoStudio);
	document.getElementById('decoStudioClose')?.addEventListener('click', closeDecoStudio);
	document.getElementById('recommendPanelOpen')?.addEventListener('click', openRecommendationPanel);
	updateRecommendFab();
	document.addEventListener('click', event => {
		if (!event.target.closest('[data-canvas-size-menu]')) {
			document.querySelectorAll('[data-canvas-size-menu].is-open').forEach(menu => menu.classList.remove('is-open'));
		}
	});
	window.addEventListener('resize', () => {
		positionRecommendationPanel(document.getElementById('recommendPanel'));
		syncCanvasGuideSize();
	});
	document.getElementById('overlayEditToggle')?.addEventListener('click', toggleOverlayEdit);
	document.getElementById('overlayEditDone')?.addEventListener('click', exitOverlayEdit);
	initOverlayLayer();
	initCompactHeader();
	document.addEventListener('input', event => {
		const input = event.target.closest('[data-item-color-field]');
		if (!input) return;
		const blockId = input.dataset.blockId;
		const itemIdx = parseInt(input.dataset.itemIdx);
		const field = input.dataset.itemColorField;
		const block = state.blocks.find(b => b.id === blockId);
		if (!block || !block.items[itemIdx]) return;
		block.items[itemIdx][field] = input.value;
		updateItemColorStyleTag();
	});
	document.addEventListener('change', event => {
		if (event.target.closest('[data-item-color-field]')) pushHistory();
	});
	document.addEventListener('click', event => {
		const styleResetBtn = event.target.closest('[data-style-reset]');
		if (styleResetBtn) {
			resetStyleTarget(
				styleResetBtn.dataset.blockId,
				parseInt(styleResetBtn.dataset.columnIndex),
				styleResetBtn.dataset.styleReset,
				styleResetBtn.dataset.applyAll === 'true'
			);
			return;
		}
		const btn = event.target.closest('[data-item-color-reset]');
		if (!btn) return;
		const blockId = btn.dataset.blockId;
		const itemIdx = parseInt(btn.dataset.itemIdx);
		const block = state.blocks.find(b => b.id === blockId);
		if (!block || !block.items[itemIdx]) return;
		delete block.items[itemIdx].itemBg;
		delete block.items[itemIdx].itemText;
		delete block.items[itemIdx].itemBorder;
		updateItemColorStyleTag();
		renderItemColorPanel(blockId, itemIdx);
		pushHistory();
	});
	document.getElementById('markupClose').addEventListener('click', closeMarkup);
	document.getElementById('markupBackdrop').addEventListener('click', closeMarkup);
	document.querySelectorAll('.markup-tab, .markup-tab-btn').forEach(btn => {
		btn.addEventListener('click', () => switchMarkupTab(btn.dataset.markupTab));
	});
	document.addEventListener('keydown', e => {
		if (e.key === 'Escape') closeMarkup();
		if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
			const active = document.activeElement;
			if (active?.getAttribute('contenteditable') === 'true') return;
			if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
			e.preventDefault();
			undo();
		}
		if (e.key === 'Delete' || e.key === 'Backspace') {
			const active = document.activeElement;
			if (active?.getAttribute('contenteditable') === 'true') return;
			if (active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA') return;
			const selectedBlockId = state.selectedItem?.blockId;
			if (!selectedBlockId) return;
			// ::list::N 또는 ::inner::N 같은 내부 참조면 삭제 무시
			if (selectedBlockId.includes('::')) return;
			e.preventDefault();
			removeBlock(selectedBlockId);
		}
	});
	canvasGrid.addEventListener('click', event => {
		// 빈 영역 클릭 시 옵션창 유지 — clearCanvas() 호출 시에만 초기화
	});
	canvasGrid.addEventListener('dragleave', event => {
		if (!canvasGrid.contains(event.relatedTarget)) canvasGrid.classList.remove('is-over');
	});
	const canvasWrapper = document.getElementById('canvasWrapper');
	KlicBuilderShared.bindCanvasDropTargets({ canvasGrid, canvasWrapper, onDragOver: handleCanvasDragOver, onDrop: handleCanvasDrop });
	_listEditButtons = createListEditButtons();
	initFormatToolbar();
	document.getElementById('iconDrawerClose').addEventListener('click', closeIconDrawer);
	document.getElementById('iconDrawerBackdrop').addEventListener('click', closeIconDrawer);
	canvasGrid.style.maxWidth = `${state.canvasWidth}px`;
	document.body.dataset.canvasSize = state.canvasWidth;
	document.body.dataset.previewDevice = 'pc';
	updateDecoStudioAvailability();
	document.getElementById('deviceSwitcher').addEventListener('click', e => {
		const btn = e.target.closest('[data-device]');
		if (btn) setPreviewDevice(btn.dataset.device);
	});
	renderCanvasPanelUI();
	initGuidedTour();
	render();
}

window.addEventListener('DOMContentLoaded', bindBuilderExitConfirm, { once: true });
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('DOMContentLoaded', function() {
	// 빌더 초기화 완료 신호를 부모 창에 전달 (템플릿 로딩까지 끝난 뒤에 보내야
	// 부모가 이 신호를 받고 바로 loadBuilderSnapshot을 보내도 componentTemplates가 비어있지 않음)
	if (window.parent !== window) {
		templatesReady.then(() => {
			window.parent.postMessage({ type: 'builderReady' }, '*');
		});
	}
});

window.restoreBuilderSnapshot = async function(jsonStr) {
	try {
		const snapshot = JSON.parse(jsonStr);
		if (!snapshot) return;
		await templatesReady;
		state.blocks = cloneData(snapshot.blocks || []);
		state.overlays = cloneData(snapshot.overlays || []);
		if (snapshot.canvasWidth) state.canvasWidth = snapshot.canvasWidth;
		if (snapshot.nextBlockId) state.nextBlockId = snapshot.nextBlockId;
		render();
	} catch(e) {
		console.error('빌더 스냅샷 복원 실패:', e);
	}
};

// 부모 창에서 JSON 로드 메시지 수신
window.addEventListener('message', function(e) {
	if (e.data && e.data.type === 'loadBuilderSnapshot' && e.data.json) {
		window.restoreBuilderSnapshot(e.data.json);
	}
});

window.getBuilderSnapshot = function() {
	return JSON.stringify({
		blocks: cloneData(state.blocks),
		overlays: cloneData(state.overlays),
		canvasWidth: state.canvasWidth,
		nextBlockId: state.nextBlockId,
		generatedMarkup: generateMarkup()
	});
};
