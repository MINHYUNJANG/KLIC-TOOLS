/**
 * map.js — KlicTools 오시는길 빌더
 *
 * 1.  상수 & 전역 상태
 * 2.  공통 유틸리티
 * 3.  히스토리 (실행취소)
 * 4.  스타일 헬퍼
 * 5.  템플릿 로더
 * 6.  블록 관리  (CRUD · Mix · List-wrap)
 * 7.  사이드바 & 렌더링 패널
 * 8.  추천 시스템
 * 9. 캔버스 렌더링
 * 10. 옵션 패널 & 스타일 컨트롤
 * 11. 아이콘 드로어
 * 12. 이벤트 바인딩 & 드래그
 * 13. 텍스트 편집 & 포맷 툴바
 * 14. 마크업 생성
 * 15. 오버레이 시스템
 * 16. 미리보기 & 이미지 저장
 * 17. 초기화
 */

// ══════════════════════════════════════════════════════════════
// 1. 상수 & 전역 상태
// ══════════════════════════════════════════════════════════════

const TEMPLATE_DIR = '/builder/map/templates/';
const MAP_TEMPLATE_BASE = '/builder/map/templates/';
const COMMON_TEMPLATE_BASE = '/builder/common/templates/';
const DESIGN_BLOCK_MANIFEST = MAP_TEMPLATE_BASE + 'design_block/manifest.json';
const DESIGN_TEMPLATE_MANIFEST = MAP_TEMPLATE_BASE + 'design_template/manifest.json';
const TEMPLATE_FILE_PATTERN = /\.(html|js)$/i;
const TEMPLATE_IMAGE_PATTERN = /\.(png|jpe?g|webp|gif|svg)$/i;
const loadedTemplateStyles = new Map();

const ICON_MANIFEST = COMMON_TEMPLATE_BASE + 'common/icon/manifest.json';
const CUSTOM_DECORATION_STORAGE_KEY = 'gridbuilder:custom-decorations:v1';
const SHOW_MIX_BLOCKS = false;
let ICON_CATEGORIES = [];

// transport-02 아이콘 선택기용 Remixicon 목록
const TRANSPORT_RI_ICONS = [
	{ cls: 'ri-car-fill',          label: '자동차' },
	{ cls: 'ri-bus-fill',          label: '버스' },
	{ cls: 'ri-bus-2-fill',        label: '광역버스' },
	{ cls: 'ri-taxi-fill',         label: '택시' },
	{ cls: 'ri-subway-fill',       label: '지하철' },
	{ cls: 'ri-train-fill',        label: '기차' },
	{ cls: 'ri-walk-fill',         label: '도보' },
	{ cls: 'ri-footprint-fill',    label: '보행' },
	{ cls: 'ri-bike-fill',         label: '자전거' },
	{ cls: 'ri-e-bike-fill',       label: '전동킥보드' },
	{ cls: 'ri-motorbike-fill',    label: '오토바이' },
	{ cls: 'ri-riding-fill',       label: '라이딩' },
	{ cls: 'ri-ship-fill',         label: '선박' },
	{ cls: 'ri-plane-fill',        label: '비행기' },
	{ cls: 'ri-flight-takeoff-fill', label: '이륙' },
	{ cls: 'ri-parking-fill',      label: '주차장' },
	{ cls: 'ri-parking-box-fill',  label: '주차박스' },
	{ cls: 'ri-roadster-fill',     label: '스포츠카' },
];

async function loadIconCategories() {
	try {
		const res = await fetch(ICON_MANIFEST, { cache: 'no-store' });
		if (res.ok) ICON_CATEGORIES = normalizeIconCategories(await res.json());
	} catch (e) {
		console.warn('아이콘 매니페스트를 불러오지 못했습니다.', e);
	}
}

function normalizeAssetPath(path) {
	if (!path || /^data:/i.test(path) || /^https?:\/\//i.test(path) || path.startsWith('/')) return path;
	if (path.startsWith('templates/common/icon/')) return COMMON_TEMPLATE_BASE + path.slice('templates/'.length);
	if (path.startsWith('templates/')) return MAP_TEMPLATE_BASE + path.slice('templates/'.length);
	return path;
}

function normalizeIconCategories(categories) {
	return (categories || []).map(cat => ({
		...cat,
		icons: (cat.icons || []).map(icon => ({ ...icon, src: normalizeAssetPath(icon.src) })),
		groups: (cat.groups || []).map(group => ({
			...group,
			icons: (group.icons || []).map(icon => ({ ...icon, src: normalizeAssetPath(icon.src) }))
		}))
	}));
}

const componentTemplates = {};

const state = {
	blocks: [],
	nextBlockId: 1,
	dragPayload: '',
	templateFilter: 'all',
	designTemplateFilter: 'all',
	sidebarTab: 'blocks',
	selectedItem: null,
	overlays: [],
	customDecorations: [],
	undoStack: [],
	canvasWidth: '1200',
	previewDevice: 'pc'
};


// manifest.json 로드 시 자동으로 채워짐
const templateCategories = {};
const templateBasePaths = {}; // { 'box-01': 'templates/design_block/box/box-01', ... }
const BLOCK_WIDTH_OPTIONS = ['20%', '25%', '33%', '50%', '66%', '75%', '100%'];

const canvasGrid = document.getElementById('canvasGrid');
const optionsPanel = document.getElementById('optionsPanel');
const canvasPanel = document.getElementById('canvasPanel');
const markupOutput = document.getElementById('markupOutput');
const layoutStatus = document.getElementById('layoutStatus');
const copyState = document.getElementById('copyState');
const previewToggle = document.getElementById('previewToggle');
const previewReturn = document.getElementById('previewReturn');
const savePreviewImageButton = document.getElementById('savePreviewImage');
const saveFileButton = document.getElementById('saveFileButton') || document.getElementById('savePdfButton');
const previewMarkupOpenButton = document.getElementById('previewMarkupOpen');
const markupToggle = document.getElementById('markupToggle');
const builderExpandButton = document.getElementById('builderExpandBtn');
const componentList = document.getElementById('componentList');
let _markupTabs = null;
let _lastFullMarkup = '';

// ══════════════════════════════════════════════════════════════
// 2. 공통 유틸리티
// ══════════════════════════════════════════════════════════════

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

function cloneData(data) {
	return JSON.parse(JSON.stringify(data));
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

function collectStylesheetText() {
	return Array.from(document.styleSheets).map(sheet => {
		try {
			return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
		} catch (error) {
			return '';
		}
	}).filter(Boolean).join('\n\n');
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

function switchFilterTab(filterValue) {
	const btn = document.querySelector(`[data-template-filter="${filterValue}"]`);
	if (!btn) return;
	state.templateFilter = filterValue;
	document.querySelectorAll('[data-template-filter]').forEach(b => b.classList.toggle('is-active', b === btn));
	renderComponentList();
}

// ══════════════════════════════════════════════════════════════
// 3. 히스토리 (실행취소)
// ══════════════════════════════════════════════════════════════

const FONT_SIZES = ['14', '15', '16', '18', '20', '22', '24', '26'];
const MAX_HISTORY = 50;
let _historyGroupPending = false;
let _duplicatingBlock = false;

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

// ══════════════════════════════════════════════════════════════
// 4. 스타일 헬퍼
// ══════════════════════════════════════════════════════════════

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

const ALIGN_TO_JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' };

function columnStyleVars(item) {
	const style = getColumnStyle(item);
	return [
		`--title-border: ${style.titleBorderColor}`,
		`--title-bg: ${style.titleBackgroundColor}`,
		`--title-text: ${style.titleTextColor}`,
		`--title-weight: ${style.titleFontWeight}`,
		style.titleFontSize != null && `--title-size: ${style.titleFontSize}px`,
		style.titleTextAlign && `--title-align: ${style.titleTextAlign}`,
		style.titleTextAlign && `--title-justify: ${ALIGN_TO_JUSTIFY[style.titleTextAlign] || style.titleTextAlign}`,
		`--body-border: ${style.bodyBorderColor}`,
		`--body-bg: ${style.bodyBackgroundColor}`,
		`--body-text: ${style.bodyTextColor}`,
		`--body-weight: ${style.bodyFontWeight}`,
		style.bodyFontSize != null && `--body-size: ${style.bodyFontSize}px`,
		style.bodyTextAlign && `--body-align: ${style.bodyTextAlign}`,
		`--connector-color: ${style.connectorColor}`,
		`--connector-size: ${style.connectorSize}`
	].filter(Boolean).join('; ');
}

function columnMarkupStyle(item) {
	return ` style="${columnStyleVars(item)}"`;
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

// ══════════════════════════════════════════════════════════════
// 5. 템플릿 로더
// ══════════════════════════════════════════════════════════════

function setFieldContent(element, value) {
	element.innerHTML = String(value || '');
}

function stripEditorAttributes(root) {
	Array.from(root.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-')) {
			root.removeAttribute(attr.name);
		}
	});
	root.querySelectorAll('[data-default-field]').forEach(element => element.remove());
	root.querySelectorAll('[data-link-url-field], [data-link-target-field]').forEach(element => {
		element.removeAttribute('data-link-url-field');
		element.removeAttribute('data-link-target-field');
	});
	root.querySelectorAll('[data-link-icon]').forEach(element => element.removeAttribute('data-link-icon'));
	root.querySelectorAll('[contenteditable]').forEach(element => element.removeAttribute('contenteditable'));
	root.querySelectorAll('[data-block-id]').forEach(element => element.removeAttribute('data-block-id'));
	root.querySelectorAll('[data-column-index]').forEach(element => element.removeAttribute('data-column-index'));
	root.classList.remove('add-row-wrap', 'block-item');
	root.querySelectorAll('.add-row-wrap').forEach(element => element.classList.remove('add-row-wrap'));
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
	element.querySelectorAll('[data-link-url-field]').forEach(link => {
		const url = item[link.dataset.linkUrlField] || '#';
		const target = item[link.dataset.linkTargetField] || '_blank';
		link.setAttribute('href', url || '#');
		link.setAttribute('target', target);
		if (target === '_blank') link.setAttribute('rel', 'noopener noreferrer');
		else link.removeAttribute('rel');
	});
	applyLinkPresentation(element, item);

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

function getDefaultData(element) {
	const data = {};
	element.querySelectorAll('[data-edit-field]').forEach(field => {
		data[field.dataset.editField] = field.innerHTML;
	});
	element.querySelectorAll('[data-link-url-field]').forEach(link => {
		data[link.dataset.linkUrlField] = link.getAttribute('href') || '';
		if (link.dataset.linkTargetField) {
			data[link.dataset.linkTargetField] = link.getAttribute('target') || '_blank';
		}
		data.buttonWidth = '100%';
		data.buttonAlign = 'left';
	});
	return data;
}

function normalizeTemplatePath(path) {
	let normalized;
	if (/^https?:\/\//i.test(path) || path.startsWith('/')) {
		normalized = path;
	} else if (path.startsWith('templates/')) {
		normalized = MAP_TEMPLATE_BASE + path.slice('templates/'.length);
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
		normalized = MAP_TEMPLATE_BASE + path.slice('templates/'.length);
	} else {
		normalized = TEMPLATE_DIR + path;
	}
	return normalized.replace(/\/?$/, '');
}

function inferGoalTemplateCategory(path) {
	if (/\/design_template\//.test(path)) return 'design-template';
	const match = path.match(/\/design_block\/([^/]+)\//);
	return match ? match[1] : '';
}

function inferGoalTemplateId(path) {
	const normalized = path.replace(/\\/g, '/');
	const parts = normalized.split('/').filter(Boolean);
	const file = parts.at(-1) || '';
	const folder = parts.at(-2) || '';
	if (/^index\.html$/i.test(file) || !/\.[^.]+$/i.test(file)) return folder;
	return file.replace(/\.[^.]+$/, '');
}

async function discoverTemplatePaths() {
	const manifests = await Promise.all([
		fetchTemplateManifest(DESIGN_BLOCK_MANIFEST, true),
		fetchTemplateManifest(DESIGN_TEMPLATE_MANIFEST, false)
	]);
	const entries = manifests.flat();

	const paths = await Promise.all(entries.map(expandTemplateManifestEntry));
	return paths.flat();
}

async function fetchTemplateManifest(url, required) {
	const response = await fetch(url, { cache: 'no-store' });
	const contentType = response.headers.get('content-type') || '';
	if (!response.ok || contentType.includes('text/html')) {
		if (required) throw new Error(`${url} 파일을 읽을 수 없습니다.`);
		return [];
	}
	try {
		const manifest = await response.json();
		return Array.isArray(manifest) ? manifest : (manifest.groups || []);
	} catch (e) {
		if (required) throw new Error(`${url} JSON 파싱 오류: ${e.message}`);
		return [];
	}
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

function loadTemplateCss(htmlPath) {
	const cssPath = getTemplateCssPath(htmlPath);
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
	const basePath = normalizeTemplateFolder(path.replace(/\/?index\.html$/i, '').replace(/\/[^/]+\.[^.]+$/i, ''));
	templateBasePaths[id] = basePath;
	element.dataset.templateId = id;
	normalizeTemplateAssetPaths(element);
	const [, config] = await Promise.all([loadTemplateCss(path), loadTemplateConfig(path)]);

	const addRowWrap = element.querySelector('.add-row-wrap') || element;
	const autoDirection = addRowWrap === element ? 'row' : 'column';
	const addDirection = config.addDirection || autoDirection;
	const isRootWrap = addDirection === 'row';

	const max = Number(config.max) || 4;

	const editListEl = element.querySelector('.edit-list');
	const editListLiTemplate = editListEl ? editListEl.querySelector('li') : null;

	const styleOptions = config.styleOptions || null;
	const defaultInnerType = config.defaultInnerType || null;
	const cssVarDefaults = readCssVarDefaults(element);
	const recommend = config.recommend || null;
	const templateFilters = config.templateFilters || [];

	return {
		id,
		name,
		path,
		basePath,
		thumbnail: config.thumbnail || null,
		recommend,
		templateFilters,
		element,
		addRowWrap,
		isRootWrap,
		addDirection,
		max,
		editListLiTemplate,
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
	const basePath = normalizeTemplateFolder(path.replace(/\/[^/]+\.[^.]+$/i, ''));
	templateBasePaths[id] = basePath;
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
	const addRowWrap = element.querySelector('.add-row-wrap') || element;
	const addDirection = config.addDirection || 'row';
	const styleOptions = config.styleOptions || null;
	const defaultInnerType = config.defaultInnerType || null;
	const cssVarDefaults = readCssVarDefaults(element);
	const recommend = config.recommend || null;
	const templateFilters = config.templateFilters || [];

	return {
		id,
		name,
		path,
		basePath,
		thumbnail: config.thumbnail || null,
		recommend,
		templateFilters,
		element,
		addRowWrap,
		isRootWrap: addDirection === 'row',
		addDirection,
		max: Number(config.max) || 1,
		editListLiTemplate: null,
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
	const el = element.cloneNode(false);
	el.style.cssText = 'visibility:hidden;position:absolute;pointer-events:none;left:-9999px;';
	document.body.appendChild(el);
	const c = getComputedStyle(el);
	const get = name => c.getPropertyValue(name).trim() || null;
	const map = {
		'--title-border': 'titleBorderColor',
		'--title-bg':     'titleBackgroundColor',
		'--title-text':   'titleTextColor',
		'--title-weight': 'titleFontWeight',
		'--body-border':  'bodyBorderColor',
		'--body-bg':      'bodyBackgroundColor',
		'--body-text':    'bodyTextColor',
		'--body-weight':  'bodyFontWeight',
	};
	const result = {};
	Object.entries(map).forEach(([cssVar, key]) => {
		const val = get(cssVar);
		if (val) result[key] = val;
	});
	document.body.removeChild(el);
	return result;
}

async function loadJsTemplate(path) {
	const before = new Set(Object.keys(componentTemplates));
	const importPath = path.startsWith('/') ? path : `../${path}`;
	await import(`${importPath}?v=${Date.now()}`);
	const added = Object.keys(componentTemplates).filter(id => !before.has(id));
	if (!added.length) throw new Error(`${path} 파일에서 템플릿이 등록되지 않았습니다.`);
}

window.registerDesignTemplate = function registerDesignTemplate(template) {
	if (!template || !template.id) return;
	componentTemplates[template.id] = template;
	if (template.category) templateCategories[template.id] = template.category;
	if (template.basePath) templateBasePaths[template.id] = template.basePath;
};

async function loadTemplates() {
	const paths = await discoverTemplatePaths();
	const htmlPaths = paths.filter(path => /\.html$/i.test(path));
	const imagePaths = paths.filter(path => TEMPLATE_IMAGE_PATTERN.test(path));
	const jsPaths = paths.filter(path => /\.js$/i.test(path));

	for (const path of htmlPaths) {
		const template = await loadHtmlTemplate(path);
		componentTemplates[template.id] = template;
		if ((templateCategories[template.id] || '') === 'design-template') {
			registerDesignTemplateSections(template);
		}
	}

	for (const path of imagePaths) {
		const template = await loadImageTemplate(path);
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
	const style = {
		...createDefaultStyle(),
		...(template.cssVarDefaults || {}),
		...(template.getDefaultStyle ? template.getDefaultStyle() : {})
	};
	if (template.styleOptions) applyStyleOptionsDefaults(style, template.styleOptions);
	return style;
}

function createSectionTemplate(parentTemplate, sectionElement, index) {
	const id = `${parentTemplate.id}__section_${index + 1}`;
	const element = document.createElement('div');
	element.className = parentTemplate.element.className;
	element.dataset.templateId = id;
	element.dataset.templateName = `${parentTemplate.name} ${index + 1}`;
	element.appendChild(sectionElement.cloneNode(true));
	const sectionCategory = sectionElement.querySelector('.map-01') ? 'map' : 'design-template-section';

	return {
		...parentTemplate,
		id,
		name: element.dataset.templateName,
		category: sectionCategory,
		hiddenFromList: true,
		element,
		addRowWrap: element,
		isRootWrap: true,
		addDirection: 'row',
		max: 1,
		editListLiTemplate: null,
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
		templateCategories[sectionTemplate.id] = sectionTemplate.category || 'design-template-section';
		templateBasePaths[sectionTemplate.id] = templateBasePaths[template.id];
		return sectionTemplate.id;
	});
}

// ══════════════════════════════════════════════════════════════
// 6. 블록 관리  (CRUD · Mix · List-wrap)
// ══════════════════════════════════════════════════════════════

function createBlock(type) {
	const template = componentTemplates[type];
	const defaultData = template.getDefaultData ? template.getDefaultData() : {};
	const block = {
		id: `block-${state.nextBlockId++}`,
		type,
		columns: 1,
		columnMode: '1',
		marginBottom: 30,
		blockWidth: '',
		items: [{ ...cloneData(defaultData), style: createStyleForType(type) }]
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
	selectBlock(m[1]);
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
		const newItem = { ...cloneData(source), style: createStyleForType(block.type) };
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

async function clearCanvas() {
	if (!state.blocks.length && !state.overlays.length) return;
	const ok = await showConfirmModal({
		title: '캔버스를 초기화할까요?',
		message: '모든 오시는길 블록과 꾸밈 요소가 삭제됩니다.\n이 작업은 실행취소로 되돌릴 수 없습니다.',
		confirmText: '확인',
		cancelText: '취소'
	});
	if (!ok) return;
	pushHistory();
	state.blocks = [];
	state.nextBlockId = 1;
	state.dragPayload = '';
	state.overlays = [];
	clearOptionsPanel();
	renderOverlayItems();
	render();
}

// ══════════════════════════════════════════════════════════════
// 7. 사이드바 & 렌더링 패널
// ══════════════════════════════════════════════════════════════

// ── 템플릿 경로 헬퍼 ─────────────────────────────────────
function getTemplateBasePath(id) {
	return templateBasePaths[id] || `${TEMPLATE_DIR}${id}`;
}

// ── 썸네일 ──────────────────────────────────────────────
function getThumbUrl(templateId) {
	const template = componentTemplates[templateId];
	if (template?.thumbnail) return normalizeAssetPath(template.thumbnail);
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
		if (template.hiddenFromList) return false;
		if (!SHOW_MIX_BLOCKS && category === 'mix') return false;
		if (category === 'design-template') return false;
		if (category === 'design-template-section') return false;
		if (category === 'decoration') return false; // 꾸밈 스튜디오 탭에서 별도 표시
		if (state.templateFilter === 'all') return true;
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
		if ((templateCategories[template.id] || '') === 'mix') {
			thumb.innerHTML = `<div class="mix-thumb-placeholder">이미지 없음</div>`;
		} else {
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
}

function renderDesignTemplateList() {
	const panel = document.getElementById('panelCustom') || document.getElementById('panelTemplates');
	const list = document.getElementById('customTemplateList') || document.getElementById('designTemplateList') || panel;
	if (!list) return;
	const templates = Object.values(componentTemplates).filter(template =>
		(templateCategories[template.id] || '') === 'design-template'
		&& (state.designTemplateFilter === 'all' || (template.templateFilters || []).includes(state.designTemplateFilter))
	);

	if (!templates.length) {
		panel?.classList.add('sidebar-ready-panel');
		list.classList.add('is-empty-state');
		list.innerHTML = '<p class="template-empty">디자인 템플릿이 없습니다.</p>';
		return;
	}

	panel?.classList.remove('sidebar-ready-panel');
	list.classList.remove('is-empty-state');
	list.classList.add('design-template-list');
	list.innerHTML = templates.map(t => `
			<div class="component-item component-item--design-template" draggable="true" data-type="${escapeAttr(t.id)}">
				<div class="component-thumb" aria-hidden="true">
					<img src="${escapeAttr(getThumbUrl(t.id))}" alt="${escapeAttr(t.id)}" class="component-thumb-img">
				</div>
				<button type="button" class="component-add-btn" aria-label="${escapeAttr(t.id)} 추가">
					<i class="ri-add-line" aria-hidden="true"></i>
				</button>
			</div>
		`).join('');
	bindComponentEvents(list);
}

function renderDecorationPanel() {
	const panelEl = document.getElementById('decorationPanel');
	if (!panelEl) return;

	const decorationTemplates = Object.values(componentTemplates).filter(t =>
		(templateCategories[t.id] || '') === 'decoration'
	);

	const customItemsHtml = renderCustomDecorationItems();

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

// ══════════════════════════════════════════════════════════════
// 8. 추천 시스템
// ══════════════════════════════════════════════════════════════

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
	return false;
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
	const showButton = shouldShowRecommendationPanel() && panel?.dataset.dismissed === 'true' && panel?.dataset.wasOpened === 'true';
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
	if (panel.dataset.dismissed !== 'true') {
		panel.dataset.dismissed = 'false';
		panel.classList.add('is-open');
	} else {
		panel.classList.remove('is-open');
	}
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
	const normalizedSrc = normalizeAssetPath(src);
	item.icon = `<img src="${escapeAttr(normalizedSrc)}" alt="${escapeAttr(name || '아이콘')}" class="block-icon-img">`;
	render();
}

// ══════════════════════════════════════════════════════════════
// 10. 캔버스 렌더링
// ══════════════════════════════════════════════════════════════

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
	const gridHeight = canvasGrid.scrollHeight || canvasGrid.offsetHeight || 0;
	const wrapper = document.getElementById('canvasWrapper');
	const wrapperHeight = wrapper?.clientHeight || 0;
	guide.style.height = `${Math.max(gridHeight, wrapperHeight)}px`;
}

// roughmap 렌더링 전역 유틸
window.renderRoughmap = function (block, ts, key) {
	if (!block || !ts || !key) return;
	const mapArea = block.querySelector('[class$="-map-area"]');
	if (!mapArea) return;

	block.dataset.roughmapTs  = ts;
	block.dataset.roughmapKey = key;

	// 기존 지도 초기화 후 새 컨테이너 생성
	mapArea.innerHTML = `<div id="daumRoughmapContainer${ts}" class="root_daum_roughmap root_daum_roughmap_landing" style="width:100%"></div>`;

	function doRender() {
		try {
			new daum.roughmap.Lander({ timestamp: ts, key: key, mapWidth: '640', mapHeight: '360' }).render();
		} catch (e) {
			console.warn('roughmap render 실패:', e);
		}
	}

	function waitAndRender() {
		if (typeof daum !== 'undefined' && daum.roughmap && typeof daum.roughmap.Lander === 'function') {
			doRender();
		} else {
			setTimeout(waitAndRender, 50);
		}
	}

	waitAndRender();
};

// 공통 roughmap 키 추출 유틸 (locationInsert/locationUpdate.jsp의 getScriptKey 동일 로직)
window.extractRoughmapKeys = function (scriptText) {
	var raw = scriptText
		.replace(/\n/g, '').replace(/\t/g, '').replace(/ /g, '').replace(/"/g, '');
	var tsIdx = raw.indexOf('timestamp:');
	if (tsIdx === -1) return null;
	raw = raw.substring(tsIdx);
	var commaIdx = raw.indexOf(',');
	var keyIdx   = raw.indexOf('key:');
	var key1end  = commaIdx !== -1 ? commaIdx : (keyIdx !== -1 ? keyIdx : raw.length);
	var ts  = raw.substring('timestamp:'.length, key1end);
	var rest = raw.substring(key1end + (commaIdx !== -1 ? 1 : 0));
	var k2idx = rest.indexOf('key:');
	if (k2idx === -1) return null;
	rest = rest.substring(k2idx + 'key:'.length);
	var key = rest.substring(0, rest.indexOf(',') !== -1 ? rest.indexOf(',') : rest.length);
	ts  = ts.replace('timestamp:', '');
	key = key.replace('key:', '');
	return (ts && key) ? { ts: ts, key: key } : null;
};

function renderMapInlineSetup(block) {
	const item = block.items[0] || {};
	const ts = item.roughmapTs || '';
	const key = item.roughmapKey || '';
	const hasExisting = !!(ts && key);
	return `
		<div class="map-inline-setup${hasExisting ? ' has-map' : ''}" data-map-inline-block-id="${block.id}">
			<label class="map-inline-label" for="mapInlineAddress-${block.id}">주소를 입력하세요</label>
			<div class="map-inline-search-row">
				<input type="text" id="mapInlineAddress-${block.id}" class="map-inline-address" placeholder="${hasExisting ? '새 주소를 입력하세요' : '주소를 입력하세요'}" autocomplete="off">
				<button type="button" class="map-inline-search-btn">
					<i class="ri-search-line" aria-hidden="true"></i>
					<span>${hasExisting ? '지도 변경' : '지도 찾기'}</span>
				</button>
			</div>
			<input type="hidden" class="map-inline-ts" value="${escapeAttr(ts)}">
			<input type="hidden" class="map-inline-key" value="${escapeAttr(key)}">
			<span class="map-inline-msg" aria-live="polite"></span>
		</div>
	`;
}

// data-block-id + data-column-index + .block-item 조합은 블록 타입(클래스명)에 상관없이
// 캔버스에 렌더링된 블록의 루트 엘리먼트를 항상 정확히 찾아준다.
// (예전에는 `.${block.type}` 클래스 셀렉터를 사용했는데, 디자인 템플릿 섹션처럼
//  블록 타입명이 실제 렌더링된 클래스와 다른 경우 매칭에 실패했다.)
function findBlockRootEl(blockId, columnIndex = 0) {
	return canvasGrid.querySelector(`[data-block-id="${blockId}"][data-column-index="${columnIndex}"].block-item`);
}

function applyMapKeysToBlock(blockId, ts, key, msgEl = null) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || templateCategories[block.type] !== 'map') return false;
	if (!ts || !key) {
		if (msgEl) msgEl.textContent = 'timestamp와 key를 모두 입력하세요.';
		return false;
	}
	pushHistory();
	if (!block.items[0]) block.items[0] = {};
	block.items[0].roughmapTs = ts;
	block.items[0].roughmapKey = key;
	const layer = document.getElementById('mapPickerLayer');
	if (layer?.dataset.address) block.items[0].roughmapAddr = layer.dataset.address;
	const mapEl = findBlockRootEl(blockId);
	if (mapEl) window.renderRoughmap(mapEl, ts, key);
	const inlinePanel = canvasGrid.querySelector(`[data-map-inline-block-id="${blockId}"]`);
	if (inlinePanel) {
		inlinePanel.classList.add('has-map');
		const tsInput = inlinePanel.querySelector('.map-inline-ts');
		const keyInput = inlinePanel.querySelector('.map-inline-key');
		if (tsInput) tsInput.value = ts;
		if (keyInput) keyInput.value = key;
	}
	updateMarkup();
	if (msgEl) msgEl.textContent = '지도 적용 완료';
	return true;
}

function openKakaoMapSearch(address) {
	const url = address
		? `https://map.kakao.com/?q=${encodeURIComponent(address)}`
		: 'https://map.kakao.com/';
	window.open(url, '_blank', 'noopener,noreferrer');
}

function getKakaoMapSearchUrl(address) {
	return address
		? `https://map.kakao.com/?q=${encodeURIComponent(address)}`
		: 'https://map.kakao.com/';
}

function ensureMapPickerLayer() {
	let layer = document.getElementById('mapPickerLayer');
	if (layer) return layer;
	layer = document.createElement('div');
	layer.id = 'mapPickerLayer';
	layer.className = 'map-picker-layer';
	layer.innerHTML = `
		<div class="map-picker-backdrop" data-map-picker-close></div>
		<div class="map-picker-dialog" role="dialog" aria-modal="true" aria-label="지도블럭 적용하기">
			<div class="map-picker-head">
				<strong>지도블럭 적용하기</strong>
				<div class="map-picker-actions">
					<a class="map-picker-new-tab" href="https://map.kakao.com/" target="_blank" rel="noopener noreferrer">
						<i class="ri-external-link-line" aria-hidden="true"></i>
						<span>새 탭</span>
					</a>
					<button type="button" class="map-picker-close" data-map-picker-close aria-label="닫기">
						<i class="ri-close-line" aria-hidden="true"></i>
					</button>
				</div>
			</div>
			<div class="map-picker-body">
				<div class="map-picker-frame-wrap">
					<iframe class="map-picker-frame" title="지도블럭 적용하기"></iframe>
					<div class="map-picker-frame-note">
						<p>지도가 보이지 않으면 카카오 정책상 iframe이 막힌 상태입니다.</p>
						<a class="map-picker-frame-link" href="https://map.kakao.com/" target="_blank" rel="noopener noreferrer">새 탭에서 열기</a>
					</div>
				</div>
				<aside class="map-picker-result-hint">
					<strong>검색 결과에서 장소를 선택하세요</strong>
					<span>지도에서 <img class="map-picker-share-icon" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'%3E%3Cpath d='M6 5.5H3.5v9h9V12' fill='none' stroke='%23343a40' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M8 10L14 4M10.5 4H14v3.5' fill='none' stroke='%23343a40' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E" alt="공유 아이콘"> 아이콘을 누른 뒤 HTML 태그복사를 누르고, 생성된 소스를 아래 영역에 붙여넣어 지도에 적용하세요.</span>
					<ul>
						<li>검색 결과에서 장소를 선택합니다.</li>
						<li><img class="map-picker-share-icon" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'%3E%3Cpath d='M6 5.5H3.5v9h9V12' fill='none' stroke='%23343a40' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M8 10L14 4M10.5 4H14v3.5' fill='none' stroke='%23343a40' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E" alt="공유 아이콘"> 아이콘을 누른 뒤 HTML 태그복사를 선택합니다.</li>
						<li>복사한 퍼가기 소스를 아래에 붙여넣습니다.</li>
					</ul>
					<button type="button" class="map-picker-paste">
						<i class="ri-clipboard-line" aria-hidden="true"></i>
						<span>복사한 소스 붙여넣기</span>
					</button>
					<textarea class="map-picker-script" rows="5" placeholder="카카오 지도 HTML 퍼가기 소스를 붙여넣으세요."></textarea>
					<div class="map-picker-key-row">
						<input type="text" class="map-picker-ts" placeholder="timestamp">
						<input type="text" class="map-picker-key" placeholder="key">
					</div>
					<button type="button" class="map-picker-apply">이 블록에 지도 적용</button>
					<span class="map-picker-msg" aria-live="polite"></span>
				</aside>
			</div>
		</div>
	`;
	document.body.appendChild(layer);
	layer.querySelectorAll('[data-map-picker-close]').forEach(el => {
		el.addEventListener('click', closeMapPickerLayer);
	});
	return layer;
}

function closeMapPickerLayer() {
	const layer = document.getElementById('mapPickerLayer');
	if (!layer) return;
	layer.classList.remove('is-open');
	document.body.classList.remove('map-picker-open');
}

function openMapPickerLayer(blockId, address) {
	const layer = ensureMapPickerLayer();
	const block = state.blocks.find(b => b.id === blockId);
	const item = block?.items?.[0] || {};
	const url = getKakaoMapSearchUrl(address);
	layer.dataset.blockId = blockId;
	layer.dataset.address = address || '';
	layer.querySelector('.map-picker-frame').src = url;
	layer.querySelector('.map-picker-new-tab').href = url;
	layer.querySelector('.map-picker-frame-link').href = url;
	layer.querySelector('.map-picker-script').value = '';
	layer.querySelector('.map-picker-ts').value = item.roughmapTs || '';
	layer.querySelector('.map-picker-key').value = item.roughmapKey || '';
	layer.querySelector('.map-picker-msg').textContent = '';
	bindMapPickerLayerEvents(layer);
	layer.classList.add('is-open');
	document.body.classList.add('map-picker-open');
}

function bindMapPickerLayerEvents(layer) {
	if (layer.dataset.bound === 'true') return;
	layer.dataset.bound = 'true';
	const scriptInput = layer.querySelector('.map-picker-script');
	const tsInput = layer.querySelector('.map-picker-ts');
	const keyInput = layer.querySelector('.map-picker-key');
	const msg = layer.querySelector('.map-picker-msg');

	function extractIntoInputs(text) {
		const result = window.extractRoughmapKeys(text);
		if (!result) {
			msg.textContent = '퍼가기 소스에서 timestamp/key를 찾지 못했습니다.';
			return false;
		}
		tsInput.value = result.ts;
		keyInput.value = result.key;
		msg.textContent = '소스를 읽었습니다. 지도 적용을 누르세요.';
		return true;
	}

	layer.querySelector('.map-picker-paste')?.addEventListener('click', async () => {
		let text = '';
		try {
			text = await navigator.clipboard.readText();
		} catch (e) {}
		if (!text.trim()) {
			msg.textContent = '아래 입력칸에 퍼가기 소스를 직접 붙여넣으세요.';
			scriptInput.focus();
			return;
		}
		scriptInput.value = text;
		extractIntoInputs(text);
	});
	scriptInput?.addEventListener('input', () => {
		if (scriptInput.value.trim()) extractIntoInputs(scriptInput.value);
	});
	layer.querySelector('.map-picker-apply')?.addEventListener('click', () => {
		if (scriptInput.value.trim()) extractIntoInputs(scriptInput.value);
		const ok = applyMapKeysToBlock(layer.dataset.blockId, tsInput.value.trim(), keyInput.value.trim(), msg);
		if (ok) closeMapPickerLayer();
	});
}

function bindMapInlineSetupEvents(root = document) {
	root.querySelectorAll('[data-map-inline-block-id]').forEach(panel => {
		if (panel.dataset.bound === 'true') return;
		panel.dataset.bound = 'true';
		const blockId = panel.dataset.mapInlineBlockId;
		const addrInput = panel.querySelector('.map-inline-address');
		const tsInput = panel.querySelector('.map-inline-ts');
		const keyInput = panel.querySelector('.map-inline-key');
		const msg = panel.querySelector('.map-inline-msg');

		panel.querySelector('.map-inline-search-btn')?.addEventListener('click', event => {
			event.stopPropagation();
			openMapPickerLayer(blockId, addrInput.value.trim());
			if (msg) msg.textContent = '레이어에서 HTML 퍼가기 소스를 붙여넣으세요.';
		});
		addrInput?.addEventListener('keydown', event => {
			if (event.key !== 'Enter') return;
			event.preventDefault();
			event.stopPropagation();
			openMapPickerLayer(blockId, addrInput.value.trim());
			if (msg) msg.textContent = '레이어에서 HTML 퍼가기 소스를 붙여넣으세요.';
		});
	});
}

function executeRoughmapScripts(container) {
	const inlines = Array.from(container.querySelectorAll('script')).filter(s => !s.src);
	// 로더 중복 제거 (index.html에서 이미 로드)
	container.querySelectorAll('script[src]').forEach(s => s.remove());

	function runInlines() {
		inlines.forEach(old => {
			const s = document.createElement('script');
			if (old.charset) s.charset = old.charset;
			s.textContent = old.textContent;
			old.parentNode?.replaceChild(s, old);
		});
	}

	// Lander가 준비될 때까지 대기
	function waitAndRun() {
		if (typeof daum !== 'undefined' && daum.roughmap && typeof daum.roughmap.Lander === 'function') {
			runInlines();
		} else {
			setTimeout(waitAndRun, 50);
		}
	}

	waitAndRun();
}

function restoreRoughmapBlocks() {
	state.blocks.forEach(block => {
		if (templateCategories[block.type] !== 'map') return;
		const ts  = block.items[0]?.roughmapTs;
		const key = block.items[0]?.roughmapKey;
		if (!ts || !key) return;
		const blockEl = findBlockRootEl(block.id);
		if (blockEl) window.renderRoughmap(blockEl, ts, key);
	});
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
	applyAllTemplateStyles();
	syncCanvasGuideSize();
	updateMarkup();
	executeRoughmapScripts(canvasGrid);
	restoreRoughmapBlocks();
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
	const effectiveMargin = (total <= 1 || idx === total - 1) ? 0 : (block.marginBottom ?? 30);
	return `
		<section class="builder-block" draggable="true" data-block-id="${block.id}" style="margin-bottom:${effectiveMargin}px${block.blockWidth ? `;width:${block.blockWidth}` : ''}">
			<div class="block-controls" aria-hidden="true">
				<div class="drag-handle" draggable="true" data-block-drag-handle data-tooltip="이동"><i class="ri-draggable" aria-hidden="true"></i></div>
				<button type="button" class="block-duplicate" data-tooltip="복사" data-duplicate-block-id="${block.id}" aria-label="블록 복사">
					<i class="ri-file-copy-line" aria-hidden="true"></i>
				</button>
				<button type="button" class="block-remove" data-tooltip="삭제" data-remove-block-id="${block.id}" aria-label="블록 삭제">
					<i class="ri-close-line" aria-hidden="true"></i>
				</button>
			</div>
			<div class="${template.addDirection === 'row' ? `builder-columns columns-${block.columns}` : `builder-rows rows-${block.columns}`}">
				${renderRepeatedColumns(block)}
			</div>
		</section>
	`;
}

function renderAddColumnWrapElement(template, item, block, columnIndex, editable) {
	const source = template.isRootWrap ? template.element : template.addRowWrap;
	const el = source.cloneNode(true);
	Array.from(el.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-')) {
			el.removeAttribute(attr.name);
		}
	});
	el.querySelectorAll('[data-edit-field]').forEach(field => {
		if (field.closest('.edit-list')) return;
		const fieldName = field.dataset.editField;
		setFieldContent(field, item[fieldName] || '');
		if (editable && block) {
			field.dataset.blockId = block.id;
			field.dataset.columnIndex = String(columnIndex);
			return;
		}
		field.removeAttribute('data-edit-field');
	});
	renderEditListsInElement(el, item, block, columnIndex, editable);
	applyRemovableBoxes(el, item, editable ? block : null, columnIndex);
	if (editable && block && templateCategories[block.type] === 'map') {
		const setupTarget = el.querySelector('.map-box') || el.querySelector('.map-wrap') || el.querySelector('.location-template-map') || el.querySelector('.map-01')?.parentElement || el;
		setupTarget.insertAdjacentHTML('afterbegin', renderMapInlineSetup(block));
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

// listKey가 없으면(기본값 '') 기존 단일 리스트(item1, item2 ...)와 동일하게 동작한다.
// listKey가 있으면 하나의 템플릿 안에 여러 개의 .edit-list(각각 data-list-key로 구분)를 둘 수 있다.
function editListFieldPrefix(listKey) {
	return listKey ? `__list_${listKey}_item` : 'item';
}

function getEditListItems(item, listKey = '') {
	const prefix = editListFieldPrefix(listKey);
	const re = new RegExp(`^${prefix}(\\d+)$`);
	return Object.keys(item)
		.filter(k => re.test(k))
		.sort((a, b) => parseInt(a.match(re)[1], 10) - parseInt(b.match(re)[1], 10))
		.map(k => ({ key: k, value: item[k] }));
}

function applyRemovableBoxes(el, item, block, columnIndex) {
	const removedBoxes = Array.isArray(item.removedBoxes) ? item.removedBoxes : [];
	el.querySelectorAll('[data-box-key]').forEach(boxEl => {
		const key = boxEl.dataset.boxKey;
		if (removedBoxes.includes(key)) {
			boxEl.remove();
			return;
		}
		if (block) {
			boxEl.classList.add('has-box-remove');
			boxEl.insertAdjacentHTML('beforeend', `
				<button type="button" class="roadmap-box-remove-btn" data-remove-box-block-id="${escapeAttr(block.id)}" data-remove-box-column-index="${columnIndex}" data-remove-box-key="${escapeAttr(key)}" aria-label="${escapeAttr(key)} 영역 삭제" title="영역 삭제">
					<i class="ri-close-line" aria-hidden="true"></i>
				</button>`);
		}
	});
}

function removeRoadmapBox(blockId, columnIndex, key) {
	const item = findItemByBlockId(blockId, columnIndex);
	if (!item) return;
	pushHistory();
	item.removedBoxes = Array.isArray(item.removedBoxes) ? item.removedBoxes.slice() : [];
	if (!item.removedBoxes.includes(key)) item.removedBoxes.push(key);
	render();
}

// 템플릿 안의 모든 .edit-list(다중 리스트 지원)를 렌더링한다.
// 아직 한 번도 추가/삭제되지 않은 리스트는 원본 정적 마크업을 그대로 유지한다(신규 블록의 기본 예시 데이터).
// 이 경우에도 리스트에 마우스를 올리면 추가/삭제할 수 있도록 bindEditListEvents가 별도로 처리한다.
function renderEditListsInElement(outerEl, item, block, columnIndex, editable) {
	outerEl.querySelectorAll('.edit-list').forEach(editList => {
		const listKey = editList.dataset.listKey || '';
		const entries = getEditListItems(item, listKey);
		if (!entries.length) return;
		const liTemplate = editList.querySelector('li');
		if (!liTemplate) return;
		const liShell = liTemplate.cloneNode(false);
		editList.innerHTML = '';
		entries.forEach(entry => {
			const li = liShell.cloneNode(false);
			li.innerHTML = entry.value;
			if (editable && block) {
				li.dataset.editField = entry.key;
				li.dataset.blockId = block.id;
				li.dataset.columnIndex = String(columnIndex);
				if (listKey) li.dataset.listKey = listKey;
			} else {
				li.removeAttribute('data-edit-field');
			}
			editList.appendChild(li);
		});
	});
}

// blockId/columnIndex에 해당하는, 캔버스에 실제로 그려진 특정 .edit-list DOM을 찾는다.
function findEditListElement(blockId, columnIndex, listKey) {
	const rootEl = findBlockRootEl(blockId, columnIndex);
	if (!rootEl) return null;
	return Array.from(rootEl.querySelectorAll('.edit-list')).find(el => (el.dataset.listKey || '') === (listKey || '')) || null;
}

function addListItem(blockId, columnIndex, listKey, afterFieldKey) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !block.items[columnIndex]) return;
	pushHistory();
	const item = block.items[columnIndex];
	// 아직 배열로 추적되지 않은 정적 리스트라면, 지금 화면에 보이는 예시 항목을 먼저 배열로 전환한다.
	// (요청: 항목을 추가하면 기존 li 구조를 그대로 유지해야 하므로, 빈 '새 항목'으로 시작하지 않는다.)
	if (!getEditListItems(item, listKey).length) {
		const listEl = findEditListElement(blockId, columnIndex, listKey);
		if (listEl) ensureListTracked(item, listEl);
	}
	const entries = getEditListItems(item, listKey);
	const idx = afterFieldKey != null ? entries.findIndex(e => e.key === afterFieldKey) : entries.length - 1;
	const baseValue = entries[idx]?.value ?? entries[entries.length - 1]?.value ?? '새 항목';
	entries.splice(idx + 1, 0, { key: '', value: baseValue });
	const prefix = editListFieldPrefix(listKey);
	entries.forEach((e, i) => { e.key = `${prefix}${i + 1}`; });
	const re = new RegExp(`^${prefix}\\d+$`);
	Object.keys(item).filter(k => re.test(k)).forEach(k => delete item[k]);
	entries.forEach(e => { item[e.key] = e.value; });
	render();
}

function deleteListItem(blockId, columnIndex, listKey, fieldKey) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !block.items[columnIndex]) return;
	const item = block.items[columnIndex];
	// 아직 배열로 추적되지 않은 정적 리스트인 경우, 실제 화면에 그려진 li 개수로 먼저 판단한다.
	// (getEditListItems는 추적 전에는 0을 반환하므로 그 값만으로 삭제 가능 여부를 판단하면 안 된다.)
	const listEl = getEditListItems(item, listKey).length ? null : findEditListElement(blockId, columnIndex, listKey);
	const currentCount = getEditListItems(item, listKey).length || (listEl ? listEl.children.length : 0);
	if (currentCount <= 1) return;
	pushHistory();
	if (listEl) ensureListTracked(item, listEl);
	const entries = getEditListItems(item, listKey);
	const newEntries = entries.filter(e => e.key !== fieldKey);
	const prefix = editListFieldPrefix(listKey);
	newEntries.forEach((e, i) => { e.key = `${prefix}${i + 1}`; });
	const re = new RegExp(`^${prefix}\\d+$`);
	Object.keys(item).filter(k => re.test(k)).forEach(k => delete item[k]);
	newEntries.forEach(e => { item[e.key] = e.value; });
	render();
}

// 아직 배열로 추적되지 않은(item1/item2 ... 이 없는) 정적 리스트를,
// 현재 캔버스에 그려진 DOM(li) 내용을 그대로 가져와 배열로 전환한다.
// 배지 색상처럼 add/delete 없이 발생한 변경(인라인 style)을 저장 가능한 상태로 만들 때 사용한다.
function ensureListTracked(item, listEl) {
	const listKey = listEl.dataset.listKey || '';
	if (getEditListItems(item, listKey).length) return;
	const prefix = editListFieldPrefix(listKey);
	Array.from(listEl.children).forEach((liEl, i) => {
		item[`${prefix}${i + 1}`] = liEl.innerHTML;
	});
}

function renderRepeatedColumns(block) {
	const template = componentTemplates[block.type];

	if (template.isRootWrap) {
		return block.items.map((item, index) => {
			const el = renderAddColumnWrapElement(template, item, block, index, true);
			el.setAttribute('style', columnStyleVars(item));
			if (isLinkTemplate(block.type)) applyLinkPresentation(el, item);
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
	outer.setAttribute('style', columnStyleVars(block.items[0] || {}));
	if (isLinkTemplate(block.type)) applyLinkPresentation(outer, block.items[0] || {});

	if (editable) {
		outer.classList.add('block-item');
		outer.dataset.blockId = block.id;
		outer.dataset.columnIndex = '0';
	}

	const addRowWrapEl = outer.querySelector('.add-row-wrap');
	if (addRowWrapEl) {
		outer.querySelectorAll('[data-edit-field]').forEach(field => {
			if (addRowWrapEl.contains(field)) return;
			const fieldName = field.dataset.editField;
			setFieldContent(field, (block.items[0] || {})[fieldName] || '');
			if (editable) {
				field.dataset.blockId = block.id;
				field.dataset.columnIndex = '0';
			} else {
				field.removeAttribute('data-edit-field');
			}
		});

		const rowContainer = addRowWrapEl.parentElement;
		rowContainer.innerHTML = block.items.map((item, idx) => {
			const el = template.addRowWrap.cloneNode(true);
			el.querySelectorAll('[data-edit-field]').forEach(field => {
				const fieldName = field.dataset.editField;
				setFieldContent(field, item[fieldName] || '');
				if (editable) {
					field.dataset.blockId = block.id;
					field.dataset.columnIndex = String(idx);
				} else {
					field.removeAttribute('data-edit-field');
				}
			});
			if (!editable) stripEditorAttributes(el);
			return elementToHtml(el);
		}).join('');
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

	if (editable && block && templateCategories[block.type] === 'map') {
		const setupTarget = outer.querySelector('.map-box') || outer.querySelector('.map-wrap') || outer.querySelector('.location-template-map') || outer.querySelector('.map-01')?.parentElement || outer;
		setupTarget.insertAdjacentHTML('afterbegin', renderMapInlineSetup(block));
	}

	if (!editable) stripEditorAttributes(outer);
	return editable ? elementToHtml(outer) : outer;
}

// ══════════════════════════════════════════════════════════════
// 11. 옵션 패널 & 스타일 컨트롤
// ══════════════════════════════════════════════════════════════

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


// ══════════════════════════════════════════════════════════════
// 12. 아이콘 드로어
// ══════════════════════════════════════════════════════════════

let _iconDrawerTarget = null;

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

function renderRiIconPicker(blockId, columnIndex, item) {
	const currentCls = (String(item?.riIcon || '')).match(/ri-[a-z0-9-]+/)?.[0] || 'ri-car-fill';
	return `<div class="ri-icon-picker">
		${TRANSPORT_RI_ICONS.map(ic => `<button type="button"
			class="ri-icon-pick-btn${currentCls === ic.cls ? ' is-active' : ''}"
			data-ri-block-id="${escapeAttr(blockId)}" data-ri-col="${columnIndex}" data-ri-cls="${escapeAttr(ic.cls)}"
			title="${escapeAttr(ic.label)}" aria-label="${escapeAttr(ic.label)}">
			<i class="${escapeAttr(ic.cls)}" aria-hidden="true"></i>
			<span>${escapeHtml(ic.label)}</span>
		</button>`).join('')}
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
				const baseW = item.iconWidth || natW;
				const baseH = item.iconHeight || natH;
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

	container.querySelectorAll('.icon-change-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			const blockId = btn.dataset.blockId;
			const colIdx = Number(btn.dataset.columnIndex);
			const mixRef = resolveMixInnerRef(blockId);
			const outerBlockId = mixRef ? mixRef.outerBlock.id : blockId;
			const imgEl = document.querySelector(
				`.builder-block[data-block-id="${outerBlockId}"] .block-item[data-column-index="${colIdx}"] [data-edit-field="icon"] img`
			);
			const { catIndex, groupId } = imgEl ? findIconLocation(imgEl.src) : { catIndex: 0, groupId: null };
			openIconDrawer(catIndex, blockId, colIdx, groupId);
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

	container.querySelectorAll('.ri-icon-pick-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			const blockId = btn.dataset.riBlockId;
			const colIdx = Number(btn.dataset.riCol);
			const cls = btn.dataset.riCls;
			if (!cls) return;
			const item = findItemByBlockId(blockId, colIdx);
			if (!item) return;
			pushHistoryGrouped();
			item.riIcon = `<i class="${cls}"></i>`;
			// 캔버스 DOM 즉시 반영
			const mixRef = resolveMixInnerRef(blockId);
			const outerBlockId = mixRef ? mixRef.outerBlock.id : blockId;
			const iconEl = document.querySelector(
				`.builder-block[data-block-id="${outerBlockId}"] .block-item[data-column-index="${colIdx}"] [data-edit-field="riIcon"]`
			);
			if (iconEl) iconEl.innerHTML = `<i class="${cls}"></i>`;
			// 옵션 패널 버튼 활성 상태 갱신
			container.querySelectorAll('.ri-icon-pick-btn').forEach(b => b.classList.toggle('is-active', b === btn));
			updateMarkup();
		});
	});
}

function openIconDrawer(categoryIndex, blockId, columnIndex, initialGroupId = null) {
	if (!ICON_CATEGORIES.length) return;

	// 빨간 점선 — 기존 제거 후 새 대상에 추가
	document.querySelectorAll('[data-edit-field="icon"].icon-editing').forEach(el => el.classList.remove('icon-editing'));
	const targetIconEl = document.querySelector(
		`.builder-block[data-block-id="${blockId}"] .block-item[data-column-index="${columnIndex}"] [data-edit-field="icon"]`
	);
	if (targetIconEl) targetIconEl.classList.add('icon-editing');

	_iconDrawerTarget = { blockId, columnIndex };

	// ── 트리 렌더링 ──────────────────────────────────
	const treeEl = document.getElementById('iconTree');
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

	document.getElementById('iconDrawer').classList.add('is-open');
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
	const normalizedSrc = normalizeAssetPath(src);
	item.icon = `<img src="${escapeAttr(normalizedSrc)}" alt="${escapeAttr(name || '아이콘')}" class="block-icon-img">`;
	closeIconDrawer();
	render();
}

function closeIconDrawer() {
	document.getElementById('iconDrawer').classList.remove('is-open');
	// 빨간 점선 편집 표시 제거
	document.querySelectorAll('[data-edit-field="icon"].icon-editing').forEach(el => el.classList.remove('icon-editing'));
	_iconDrawerTarget = null;
}

function findIconLocation(src) {
	let path;
	try { path = new URL(src).pathname.replace(/^\//, ''); } catch { path = src; }
	path = normalizeAssetPath(path).replace(/^\//, '');
	for (let i = 0; i < ICON_CATEGORIES.length; i++) {
		const cat = ICON_CATEGORIES[i];
		if (cat.groups && cat.groups.length) {
			for (const g of cat.groups) {
				if ((g.icons || []).some(icon => normalizeAssetPath(icon.src).replace(/^\//, '') === path)) {
					return { catIndex: i, groupId: g.id };
				}
			}
		} else {
			if ((cat.icons || []).some(icon => normalizeAssetPath(icon.src).replace(/^\//, '') === path)) {
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
	const label = so?.label || (target === 'title' ? '타이틀' : target === 'body' ? '내용' : target);

	const defaultColorFields = [
		{ key: 'borderColor',     label: '선' },
		{ key: 'backgroundColor', label: '배경' },
		{ key: 'textColor',       label: '글자' }
	];
	const hideKeys = new Set(so?.hide || []);
	const fields = so?.fields ?? (
		(target === 'title' || target === 'body')
			? defaultColorFields.filter(f => !hideKeys.has(f.key))
			: []
	);

	const colorSection = fields.length ? `
		${fields.map(f => {
			const sk = `${prefix}${f.key.charAt(0).toUpperCase()}${f.key.slice(1)}`;
			return `
		<label class="style-control" title="${label} ${f.label}">
			<span>${f.label}</span>
			<input type="color" value="${style[sk] || '#000000'}" data-style-field="${sk}" data-block-id="${block.id}" data-column-index="${columnIndex}">
		</label>`;
		}).join('')}` : '';

	const fw = style[`${prefix}FontWeight`] || (target === 'title' ? '700' : '400');
	const fs = style[`${prefix}FontSize`] ?? '';
	const ta = style[`${prefix}TextAlign`] ?? '';
	const fontRow = `
		<div class="style-font-row">
			<label class="style-control" title="${label} 굵기">
				<span>굵기</span>
				<select data-style-field="${prefix}FontWeight" data-block-id="${block.id}" data-column-index="${columnIndex}">
					<option value="400"${fw === '400' ? ' selected' : ''}>R</option>
					<option value="500"${fw === '500' ? ' selected' : ''}>M</option>
					<option value="700"${fw === '700' ? ' selected' : ''}>B</option>
					<option value="800"${fw === '800' ? ' selected' : ''}>E</option>
				</select>
			</label>
			<label class="style-control" title="${label} 사이즈">
				<span>사이즈</span>
				<select data-style-field="${prefix}FontSize" data-block-id="${block.id}" data-column-index="${columnIndex}">
					<option value="">-</option>
					${FONT_SIZES.map(s => `<option value="${s}"${fs === s ? ' selected' : ''}>${s}</option>`).join('')}
				</select>
			</label>
		</div>`;

	const alignRow = `
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
					data-column-index="${columnIndex}"
					title="${a.title}">
					<i class="${a.icon}" aria-hidden="true"></i>
				</button>`).join('')}
			</div>
		</div>`;

	return colorSection + fontRow + alignRow;
}

// ══════════════════════════════════════════════════════════════
// 13. 이벤트 바인딩 & 드래그
// ══════════════════════════════════════════════════════════════

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
	bindMapInlineSetupEvents(document);

	document.querySelectorAll('.builder-block').forEach(block => {
		block.addEventListener('dragstart', event => {
			if (document.body.classList.contains('preview-mode')) {
				event.preventDefault();
				return;
			}
			const isHandleDrag = !!event.target.closest('[data-block-drag-handle]');
			const isCtrlDrag = event.ctrlKey || event.metaKey;
			if (event.target.closest('select') || event.target.closest('input') || event.target.closest('textarea') || event.target.closest('button') || event.target.closest('[contenteditable="true"]')) {
				event.preventDefault();
				return;
			}
			if (!isHandleDrag && !isCtrlDrag) {
				event.preventDefault();
				return;
			}
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
				requestAnimationFrame(() => {
					block.classList.add('dragging');
					if (isCtrlDrag) block.classList.add('is-map-ctrl-dragging');
				});
			}
			event.dataTransfer.setData('text/plain', state.dragPayload);
		});
		block.addEventListener('dragover', event => {
			if (document.body.classList.contains('preview-mode')) return;
			const payload = state.dragPayload;
			if (payload.startsWith('new-block:') || payload.startsWith('new-design-template:') || payload.startsWith('existing-block:') || payload.startsWith('copy-block:')) {
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
			block.classList.remove('is-map-ctrl-dragging');
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
			if (event.target.closest('input, textarea, select, button')) return;
			if (event.target.closest('[contenteditable="true"]')) return;
			event.stopPropagation();
			selectBlockItem(item.dataset.blockId, Number(item.dataset.columnIndex));
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
		if (field.closest('.edit-list')) return; // .edit-list의 li는 아래에서 별도로 처리한다.
		field.addEventListener('dblclick', startTextEdit);
	});
	// .edit-list의 li는 아직 배열로 추적되지 않은 정적 항목이어도 더블클릭으로 바로 텍스트를 수정할 수 있게 한다.
	document.querySelectorAll('.edit-list li').forEach(li => {
		li.addEventListener('dblclick', startListItemTextEdit);
	});
	document.querySelectorAll('[data-edit-field="icon"]').forEach(field => {
		field.addEventListener('click', event => {
			if (document.body.classList.contains('preview-mode')) return;
			const item = field.closest('.block-item');
			if (!item) return;
			event.stopPropagation();
			selectBlockItem(item.dataset.blockId, Number(item.dataset.columnIndex));
		});
		field.addEventListener('dblclick', event => {
			if (document.body.classList.contains('preview-mode')) return;
			event.stopPropagation();
			const item = field.closest('.block-item');
			if (!item) return;
			const imgEl = field.querySelector('img');
			const { catIndex, groupId } = imgEl ? findIconLocation(imgEl.src) : { catIndex: 0, groupId: null };
			openIconDrawer(catIndex, item.dataset.blockId, Number(item.dataset.columnIndex), groupId);
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
	bindBadgeColorSwatches();

	// 오시는길 디자인 템플릿: 박스(주소/버스/지하철/자가용 등) 삭제 버튼
	document.querySelectorAll('[data-remove-box-key]').forEach(btn => {
		btn.addEventListener('click', event => {
			event.stopPropagation();
			removeRoadmapBox(btn.dataset.removeBoxBlockId, Number(btn.dataset.removeBoxColumnIndex), btn.dataset.removeBoxKey);
		});
	});

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
	const hasRiIconField = !!template.element?.querySelector('[data-edit-field="riIcon"]');
	const iconSection = hasIconField
		? `<strong class="option-group-label">아이콘</strong>
		<div class="option-group-box">
			${renderIconControls(innerBlockId, col, item)}
		</div>`
		: hasRiIconField
		? `<strong class="option-group-label">아이콘</strong>
		<div class="option-group-box">
			${renderRiIconPicker(innerBlockId, col, item)}
		</div>`
		: '';
	const so = template.styleOptions;
	const styleTargets = so ? Object.keys(so) : ['title', 'body'];
	const styleSection = isDivider
		? `<strong class="option-group-label">연결선 색상 / 크기</strong>
			<fieldset class="option-group">${renderConnectorControls({ id: innerBlockId, type: innerBlock.type, items: innerBlock.items }, col, style)}</fieldset>`
		: `${iconSection}${styleTargets.map(targetKey => {
			const label = so?.[targetKey]?.label || (targetKey === 'title' ? '타이틀' : targetKey === 'body' ? '본문' : targetKey);
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
					${showCustomOption ? `<input type="number" min="6"${isRowDir ? ` max="${template.max}"` : ''} value="${isCustom ? currentCols : ''}" class="column-custom-input"${isCustom ? '' : ' hidden'} data-column-mode-custom="${listBlockId}">` : ''}
				</div>
			</div>
			${showCustomOption ? `<p class="column-limit-msg" hidden>최대 ${colMax}개까지 추가 가능합니다</p>` : ''}
		</div>`;

	const style = getColumnStyle(item);
	const so = template.styleOptions;
	const styleTargets = so ? Object.keys(so) : ['title', 'body'];
	const styleSection = styleTargets.map(targetKey => {
		const label = so?.[targetKey]?.label || (targetKey === 'title' ? '타이틀' : targetKey === 'body' ? '본문' : targetKey);
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
			const max = isRowDir ? template.max : 20;
			let v = parseInt(colCustomInput.value, 10);
			if (!isNaN(v) && v >= 6 && v <= max) updateBlockColumns(colCustomInput.dataset.columnModeCustom, v);
		});
	}
}

function isLinkTemplate(type) {
	return !!componentTemplates[type]?.element?.querySelector('[data-link-url-field]');
}

const LINK_ALIGN_TO_JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' };
const LINK_WIDTH_OPTIONS = ['', '20%', '25%', '33%', '50%'];

function applyLinkPresentation(root, item) {
	const width = item.buttonWidth || '100%';
	const align = item.buttonAlign || 'left';
	root.style.setProperty('--link-button-width', width);
	root.style.setProperty('--link-button-align', width === '100%' ? 'flex-start' : (LINK_ALIGN_TO_JUSTIFY[align] || 'flex-start'));

	const target = item.target || '_blank';
	const icon = root.querySelector('[data-link-icon], .map-link-01-icon');
	if (!icon) return;
	if (target === '_self') {
		icon.textContent = '→';
		return;
	}
	icon.innerHTML = '<i class="ri-file-copy-line"></i>';
}

function renderLinkOptionsPanel(blockId, columnIndex) {
	if (!optionsPanel) return;
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const itemIndex = columnIndex ?? 0;
	const item = block.items[itemIndex];
	if (!item) return;
	const unit = componentTemplates[block.type].addDirection === 'row' ? '개' : '줄';
	const isLastBlock = state.blocks.length <= 1 || state.blocks[state.blocks.length - 1]?.id === block.id;
	const current = String(block.columns);
	const isMultiButton = block.columns > 1;
	const currentWidth = item.buttonWidth || '100%';
	const currentAlign = item.buttonAlign || 'left';
	const columnOptions = Array.from({ length: Math.min(componentTemplates[block.type].max, 5) }, (_, i) => {
		const val = String(i + 1);
		return `<option value="${val}"${current === val ? ' selected' : ''}>${val}${unit}</option>`;
	}).join('');
	const widthOptions = LINK_WIDTH_OPTIONS.map(width => {
		const value = width || '100%';
		const label = width || '기본(100%)';
		return `<option value="${value}"${currentWidth === value ? ' selected' : ''}>${label}</option>`;
	}).join('');
	const alignDisabled = isMultiButton || currentWidth === '100%';
	const alignButtons = [
		['left', 'ri-align-left', '왼쪽'],
		['center', 'ri-align-center', '가운데'],
		['right', 'ri-align-right', '오른쪽']
	].map(([value, icon, label]) => `
		<button type="button" class="style-align-btn link-align-btn${currentAlign === value ? ' is-active' : ''}" title="${label}" aria-label="${label}"
			data-link-align-value="${value}" data-link-block-id="${block.id}" data-link-column-index="${itemIndex}"${alignDisabled ? ' disabled' : ''}>
			<i class="${icon}" aria-hidden="true"></i>
		</button>`).join('');

	optionsPanel.innerHTML = `
		<div class="options-panel-head">
			<strong>지도 링크 버튼</strong>
			<span>${itemIndex + 1}${unit}</span>
		</div>
		<div class="options-panel-groups">
			<strong class="option-group-label">링크 설정</strong>
			<div class="option-group-box">
				<div class="options-layout-row">
					<span>텍스트</span>
					<div class="options-layout-input">
						<input type="text" value="${escapeAttr(item.text || '')}" data-link-field="text" data-link-block-id="${block.id}" data-link-column-index="${itemIndex}">
					</div>
				</div>
				<div class="options-layout-row">
					<span>URL</span>
					<div class="options-layout-input">
						<input type="url" value="${escapeAttr(item.url || '')}" placeholder="https://example.com" data-link-field="url" data-link-block-id="${block.id}" data-link-column-index="${itemIndex}">
					</div>
				</div>
				<div class="options-layout-row">
					<span>Target</span>
					<div class="options-layout-input">
						<select data-link-field="target" data-link-block-id="${block.id}" data-link-column-index="${itemIndex}">
							<option value="_blank"${(item.target || '_blank') === '_blank' ? ' selected' : ''}>새 창(_blank)</option>
							<option value="_self"${item.target === '_self' ? ' selected' : ''}>현재 창(_self)</option>
						</select>
					</div>
				</div>
				<div class="options-layout-row${isMultiButton ? ' is-disabled' : ''}">
					<span>버튼 너비</span>
					<div class="options-layout-input">
						<select data-link-field="buttonWidth" data-link-block-id="${block.id}" data-link-column-index="${itemIndex}"${isMultiButton ? ' disabled' : ''}>
							${widthOptions}
						</select>
					</div>
				</div>
				<div class="options-layout-row${alignDisabled ? ' is-disabled' : ''}">
					<span>정렬</span>
					<div class="options-layout-input">
						<div class="style-align-btns link-align-btns" data-link-align-group="${block.id}-${itemIndex}">
							${alignButtons}
						</div>
					</div>
				</div>
			</div>
			<strong class="option-group-label">블록 설정</strong>
			<div class="option-group-box">
				<div class="options-layout-row${currentWidth !== '100%' ? ' is-disabled' : ''}">
					<span>${unit} 설정</span>
					<div class="options-layout-input">
						<select data-column-mode="${block.id}"${currentWidth !== '100%' ? ' disabled' : ''}>${columnOptions}</select>
					</div>
				</div>
				<div class="options-layout-row${isLastBlock ? ' is-disabled' : ''}">
					<span>하단 여백</span>
					<div class="options-layout-input">
						<input type="number" min="0" max="300" value="${block.marginBottom ?? 30}" data-margin-block-id="${block.id}"${isLastBlock ? ' disabled' : ''}>
						<span>px</span>
					</div>
				</div>
			</div>
		</div>
	`;
	bindLinkFieldEvents(optionsPanel);
	const colSelect = optionsPanel.querySelector('[data-column-mode]');
	if (colSelect) {
		colSelect.addEventListener('change', () => updateBlockColumns(colSelect.dataset.columnMode, colSelect.value));
	}
	const marginInput = optionsPanel.querySelector('[data-margin-block-id]');
	if (marginInput) {
		marginInput.addEventListener('input', () => updateBlockMargin(marginInput.dataset.marginBlockId, marginInput.value));
	}
}

const ROADMAP_BOX_LABELS = { address: '주소', bus: '버스', subway: '지하철', car: '자가용' };

function toggleRoadmapBox(blockId, key, visible) {
	const item = findItemByBlockId(blockId, 0);
	if (!item) return;
	pushHistory();
	const removed = Array.isArray(item.removedBoxes) ? item.removedBoxes.slice() : [];
	item.removedBoxes = visible ? removed.filter(k => k !== key) : (removed.includes(key) ? removed : [...removed, key]);
	render();
}

function renderMapOptionsPanel(blockId) {
	if (!optionsPanel) return;
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;

	const isLastBlock = state.blocks.length <= 1 || state.blocks[state.blocks.length - 1]?.id === block.id;
	const item = block.items[0] || {};
	const mapAddress = item.roughmapAddr || '';
	const mapTimestamp = item.roughmapTs || '';
	const mapKey = item.roughmapKey || '';

	// 오시는길 디자인 템플릿(주소/버스/지하철/자가용 등)처럼 data-box-key 영역을 가진 템플릿이면
	// 옵션 패널에서 영역을 다시 켜고 끌 수 있게 한다. (캔버스에서는 X 버튼으로 끌 수 있다)
	const template = componentTemplates[block.type];
	const boxKeys = template ? Array.from(template.element.querySelectorAll('[data-box-key]')).map(el => el.dataset.boxKey) : [];
	const removedBoxes = Array.isArray(item.removedBoxes) ? item.removedBoxes : [];
	const boxSection = boxKeys.length ? `
		<strong class="option-group-label">영역 표시</strong>
		<div class="option-group-box">
			${boxKeys.map(key => `
				<label class="options-layout-row roadmap-box-toggle">
					<span>${escapeHtml(ROADMAP_BOX_LABELS[key] || key)}</span>
					<input type="checkbox" data-box-toggle-block-id="${escapeAttr(block.id)}" data-box-toggle-key="${escapeAttr(key)}"${removedBoxes.includes(key) ? '' : ' checked'}>
				</label>`).join('')}
		</div>` : '';

	optionsPanel.innerHTML = `
		<div class="options-panel-head"><strong>지도 블록 옵션</strong></div>
		<div class="options-panel-groups">
			<strong class="option-group-label">지도 수정</strong>
			<div class="option-group-box">
				<label class="map-option-address">
					<span>주소</span>
					<input type="text" value="${escapeAttr(mapAddress)}" placeholder="주소를 입력하세요" data-map-address-input="${block.id}">
				</label>
				<button type="button" class="map-change-btn" data-map-block-id="${block.id}">
					<i class="ri-map-pin-line" aria-hidden="true"></i>
					지도 검색/변경
				</button>
				${mapTimestamp && mapKey ? `<p class="map-option-current">timestamp: ${escapeHtml(mapTimestamp)}<br>key: ${escapeHtml(mapKey)}</p>` : ''}
			</div>
			${boxSection}
			<strong class="option-group-label">블럭 설정</strong>
			<div class="option-group-box">
				<div class="options-layout-row">
					<span>너비</span>
					<div class="options-layout-input">
						<select data-width-block-id="${block.id}">
							<option value=""${!block.blockWidth ? ' selected' : ''}>기본</option>
							${BLOCK_WIDTH_OPTIONS.map(w => `<option value="${w}"${block.blockWidth === w ? ' selected' : ''}>${w}</option>`).join('')}
						</select>
					</div>
				</div>
				<div class="options-layout-row${isLastBlock ? ' is-disabled' : ''}">
					<span>하단 여백</span>
					<div class="options-layout-input">
						<input type="number" min="0" max="300" value="${block.marginBottom ?? 30}" data-margin-block-id="${block.id}"${isLastBlock ? ' disabled' : ''}>
						<span>px</span>
					</div>
				</div>
				${isLastBlock ? '<p class="width-limit-msg" style="display:block">마지막 블럭은 하단 여백이 적용되지 않습니다</p>' : ''}
			</div>
		</div>
	`;

	const marginInput = optionsPanel.querySelector('[data-margin-block-id]');
	if (marginInput) {
		marginInput.addEventListener('input', () => updateBlockMargin(marginInput.dataset.marginBlockId, marginInput.value));
	}
	const widthSelect = optionsPanel.querySelector('[data-width-block-id]');
	if (widthSelect) {
		widthSelect.addEventListener('change', () => updateBlockWidth(widthSelect.dataset.widthBlockId, widthSelect.value));
	}
	optionsPanel.querySelector('.map-change-btn')?.addEventListener('click', () => {
		const addrInput = optionsPanel.querySelector(`[data-map-address-input="${block.id}"]`);
		const addr = addrInput ? addrInput.value.trim() : '';
		if (!block.items[0]) block.items[0] = {};
		block.items[0].roughmapAddr = addr;
		openMapPickerLayer(block.id, addr);
	});
	optionsPanel.querySelectorAll('[data-box-toggle-key]').forEach(checkbox => {
		checkbox.addEventListener('change', () => {
			toggleRoadmapBox(checkbox.dataset.boxToggleBlockId, checkbox.dataset.boxToggleKey, checkbox.checked);
		});
	});
}

function renderOptionsPanel(blockId, columnIndex) {
	// map 블록이면 전용 옵션 패널
	if (templateCategories[state.blocks.find(b => b.id === blockId)?.type] === 'map') {
		renderMapOptionsPanel(blockId);
		return;
	}
	// 혼합 내부 블록이면 전용 옵션 패널 표시
	const mixRef = resolveMixInnerRef(blockId);
	if (mixRef) { renderMixInnerOptionsPanel(mixRef, columnIndex ?? 0); return; }
	// title-list list-wrap 내부 블록이면 전용 옵션 패널 표시
	const listRef = resolveListInnerRef(blockId);
	if (listRef) { renderListInnerOptionsPanel(listRef, columnIndex ?? 0); return; }
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) { clearOptionsPanel(); return; }
	if (isLinkTemplate(block.type)) {
		renderLinkOptionsPanel(blockId, columnIndex ?? 0);
		return;
	}
	const template = componentTemplates[block.type];
	const unit = template.addDirection === 'row' ? '행' : '열';
	const isDivider = templateCategories[block.type] === 'divider';
	const hasIconField = !!template.element.querySelector('[data-edit-field="icon"]');
	const hasRiIconField = !!template.element.querySelector('[data-edit-field="riIcon"]');
	const isMapBlock = templateCategories[block.type] === 'map';

	const current = String(block.columns);
	const isRowDir = template.addDirection === 'row';
	const displayMax = isRowDir ? Math.min(template.max, 5) : 5;
	const showCustomOption = !isRowDir || template.max > 5;
	const isCustom = block.columns > 5;
	const columnOptions = [
		...Array.from({ length: displayMax }, (_, i) => {
			const val = String(i + 1);
			return `<option value="${val}"${current === val && !isCustom ? ' selected' : ''}>${val}${unit}</option>`;
		}),
		showCustomOption ? `<option value="custom"${isCustom ? ' selected' : ''}>5개 이상</option>` : ''
	].filter(Boolean).join('');
	const colMax = isRowDir ? template.max : 20;
	const blockSettingSection = `
		<strong class="option-group-label">블럭 설정</strong>
		<div class="option-group-box">
			${isDivider ? '' : `
			${(() => {
				const colRowDisabled = isRowDir && !!block.blockWidth;
				return `<div class="options-layout-row${colRowDisabled ? ' is-disabled' : ''}">
				<span>${unit} 설정</span>
				<div class="options-layout-input">
					<select data-column-mode="${block.id}"${colRowDisabled ? ' disabled' : ''}>${columnOptions}</select>
					${showCustomOption ? `<input type="number" min="6"${isRowDir ? ` max="${template.max}"` : ''} value="${isCustom ? current : ''}" class="column-custom-input"${isCustom ? '' : ' hidden'} data-column-mode-custom="${block.id}">` : ''}
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
						${BLOCK_WIDTH_OPTIONS.map(w => `<option value="${w}"${block.blockWidth === w ? ' selected' : ''}>${w}</option>`).join('')}
					</select>
				</div>
			</div>
			${widthDisabled ? `<p class="width-limit-msg" style="display:block">너비 설정은 1행일 때만 가능합니다</p>` : ''}`;
			})()}`}
			${(() => {
				const isLastBlock = state.blocks.length <= 1 || state.blocks[state.blocks.length - 1]?.id === block.id;
				return `<div class="options-layout-row${isLastBlock ? ' is-disabled' : ''}">
				<span>하단 여백</span>
				<div class="options-layout-input">
					<input type="number" min="0" max="300" value="${block.marginBottom ?? 30}" data-margin-block-id="${block.id}"${isLastBlock ? ' disabled' : ''}>
					<span>px</span>
				</div>
			</div>
			${isLastBlock ? '<p class="width-limit-msg" style="display:block">마지막 블럭은 하단 여백이 적용되지 않습니다</p>' : ''}`;
			})()}
		</div>`;

	let styleSection = '';
	if (columnIndex !== null && block.items[columnIndex]) {
		const colItem = block.items[columnIndex];
		const style = getColumnStyle(colItem);
		const so = template.styleOptions;
		const styleTargets = so ? Object.keys(so) : ['title', 'body'];
		const iconSection = hasIconField
			? `<strong class="option-group-label">아이콘</strong>
			<div class="option-group-box">
				${renderIconControls(block.id, columnIndex, colItem)}
			</div>`
			: hasRiIconField
			? `<strong class="option-group-label">아이콘</strong>
			<div class="option-group-box">
				${renderRiIconPicker(block.id, columnIndex, colItem)}
			</div>`
			: '';
		styleSection = isDivider
			? `<strong class="option-group-label">연결선 색상 / 크기</strong>
				<fieldset class="option-group">
					${renderConnectorControls(block, columnIndex, style)}
				</fieldset>`
			: `${iconSection}${styleTargets.map(targetKey => {
				const targetLabel = so?.[targetKey]?.label
					|| (targetKey === 'title' ? '타이틀' : targetKey === 'body' ? '본문' : targetKey);
				return `
				<strong class="option-group-label">${targetLabel}</strong>
				<fieldset class="option-group">
					${renderStyleControls(block, columnIndex, style, targetKey)}
				</fieldset>`;
			}).join('')}`;
	}

	// 지도 블록 주소 변경 섹션
	const mapSection = isMapBlock ? `
		<strong class="option-group-label">지도</strong>
		<div class="option-group-box">
			<button type="button" class="map-change-btn" data-map-block-id="${block.id}">
				<i class="ri-map-pin-line" aria-hidden="true"></i>
				지도 주소 변경
			</button>
		</div>` : '';

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

	if (!optionsPanel) return;
	const headSub = columnIndex !== null ? `<span>${columnIndex + 1}${unit}</span>` : '';
	optionsPanel.innerHTML = `
		<div class="options-panel-head">
			<strong>${escapeHtml(block.type)}</strong>
			${headSub}
		</div>
		<div class="options-panel-groups">
			${mapSection}
			${blockSettingSection}
			${listWrapSection}
			${styleSection}
		</div>
	`;
	bindStyleFieldEvents(optionsPanel);
	bindIconControls(optionsPanel);
	optionsPanel.querySelector('.map-change-btn')?.addEventListener('click', () => {
		const item = block.items[0] || {};
		const addr = item.roughmapAddr || '';
		openMapPickerLayer(block.id, addr);
	});
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
				<span>캔버스 너비</span>
				<strong>${state.canvasWidth}px</strong>
				<i class="ri-arrow-down-s-line" aria-hidden="true"></i>
			</button>
			<div class="canvas-size-options" role="listbox" aria-label="캔버스 너비">
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
	syncCanvasGuideSize();
}

function setPreviewDevice(device) {
	state.previewDevice = device;
	document.querySelectorAll('.device-btn').forEach(btn => {
		btn.classList.toggle('is-active', btn.dataset.device === device);
	});
	const icon = document.querySelector('.device-dropdown-icon');
	if (icon) {
		icon.className = `${device === 'tablet' ? 'ri-tablet-line' : device === 'mobile' ? 'ri-cellphone-line' : 'ri-computer-line'} device-dropdown-icon`;
	}
	document.body.dataset.previewDevice = device;
	if (device === 'tablet') {
		canvasGrid.style.maxWidth = '768px';
	} else if (device === 'mobile') {
		canvasGrid.style.maxWidth = '380px';
	} else {
		canvasGrid.style.maxWidth = `${state.canvasWidth}px`;
	}
	renderCanvasPanelUI();
}

function bindStyleFieldEvents(container) {
	container.querySelectorAll('input[data-style-field], select[data-style-field]').forEach(control => {
		const handler = () => updateColumnStyle(control.dataset.blockId, Number(control.dataset.columnIndex), control.dataset.styleField, control.value);
		control.addEventListener('input', handler);
		control.addEventListener('change', handler);
	});
	container.querySelectorAll('.style-align-btn').forEach(btn => {
		btn.addEventListener('click', () => {
			updateColumnStyle(btn.dataset.blockId, Number(btn.dataset.columnIndex), btn.dataset.styleField, btn.dataset.alignValue);
			btn.closest('.style-align-btns')?.querySelectorAll('.style-align-btn').forEach(b => {
				b.classList.toggle('is-active', b === btn);
			});
		});
	});
}

function bindLinkFieldEvents(container) {
	container.querySelectorAll('[data-link-field]').forEach(control => {
		const handler = () => updateLinkField(control.dataset.linkBlockId, Number(control.dataset.linkColumnIndex), control.dataset.linkField, control.value);
		control.addEventListener('input', handler);
		control.addEventListener('change', handler);
	});
	container.querySelectorAll('[data-link-align-value]').forEach(button => {
		button.addEventListener('click', () => {
			updateLinkField(button.dataset.linkBlockId, Number(button.dataset.linkColumnIndex), 'buttonAlign', button.dataset.linkAlignValue);
			button.closest('.link-align-btns')?.querySelectorAll('.link-align-btn').forEach(btn => {
				btn.classList.toggle('is-active', btn === button);
			});
		});
	});
}

function updateLinkField(blockId, columnIndex, field, value) {
	const block = state.blocks.find(item => item.id === blockId);
	if (!block || !block.items[columnIndex]) return;
	pushHistoryGrouped();
	const item = block.items[columnIndex];
	item[field] = field === 'text' ? escapeHtml(value) : value;
	if (field === 'buttonWidth' && value === '100%') item.buttonAlign = 'left';
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	const targetItem = section?.querySelector(`.block-item[data-block-id="${blockId}"][data-column-index="${columnIndex}"]`);
	if (targetItem) {
		const root = targetItem.matches('.map-link-01') ? targetItem : targetItem.querySelector('.map-link-01');
		const link = targetItem.querySelector('[data-link-url-field], .map-link-01-button');
		if (field === 'text') {
			const textEl = targetItem.querySelector('[data-edit-field="text"]');
			if (textEl) textEl.textContent = value;
		}
		if (link && (field === 'url' || field === 'target')) {
			const url = item.url || '#';
			const target = item.target || '_blank';
			link.setAttribute('href', url || '#');
			link.setAttribute('target', target);
			if (target === '_blank') link.setAttribute('rel', 'noopener noreferrer');
			else link.removeAttribute('rel');
		}
		if (root) applyLinkPresentation(root, item);
	}
	if (field === 'buttonWidth') {
		const alignDisabled = block.columns > 1 || value === '100%';
		const alignButtons = optionsPanel.querySelectorAll(`[data-link-align-value][data-link-block-id="${blockId}"][data-link-column-index="${columnIndex}"]`);
		alignButtons.forEach(button => {
			button.disabled = alignDisabled;
			button.classList.toggle('is-active', button.dataset.linkAlignValue === (alignDisabled ? 'left' : item.buttonAlign));
		});
		alignButtons[0]?.closest('.options-layout-row')?.classList.toggle('is-disabled', alignDisabled);
		const colSelect = optionsPanel.querySelector(`[data-column-mode="${blockId}"]`);
		const colDisabled = value !== '100%';
		if (colSelect) {
			colSelect.disabled = colDisabled;
			colSelect.closest('.options-layout-row')?.classList.toggle('is-disabled', colDisabled);
		}
	}
	updateMarkup();
}

function updateColumnStyle(blockId, columnIndex, field, value) {
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
			target.setAttribute('style', columnStyleVars(listBlock.items[columnIndex]));
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
			target.setAttribute('style', columnStyleVars(innerBlock.items[columnIndex]));
			applyItemStyles(target, innerBlock.items[columnIndex], componentTemplates[innerBlock.type]);
		}
		return;
	}
	const block = state.blocks.find(item => item.id === blockId);
	if (!block || !block.items[columnIndex]) return;
	pushHistoryGrouped();
	const template = componentTemplates[block.type];
	getColumnStyle(block.items[columnIndex])[field] = value;
	updateMarkup();
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (!section) return;
	const items = Array.from(section.querySelectorAll('.block-item')).filter(el => {
		const bid = el.dataset.blockId || '';
		return !bid.match(/::list::\d+$/) && !bid.match(/::inner::\d+$/);
	});
	if (items[columnIndex]) {
		items[columnIndex].setAttribute('style', columnStyleVars(block.items[columnIndex]));
		applyItemStyles(items[columnIndex], block.items[columnIndex], template);
	}
}

function updateBlockWidth(blockId, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistoryGrouped();
	block.blockWidth = value;
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (section) section.style.width = value || '';
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
	block.marginBottom = Math.min(300, Math.max(0, Number(value) || 0));
	const total = state.blocks.length;
	const isLast = state.blocks[total - 1]?.id === blockId;
	const effectiveMargin = (total <= 1 || isLast) ? 0 : block.marginBottom;
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (section) section.style.marginBottom = `${effectiveMargin}px`;
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

// ══════════════════════════════════════════════════════════════
// 14. 텍스트 편집 & 포맷 툴바
// ══════════════════════════════════════════════════════════════

// .edit-list의 li는 아직 배열로 추적되지 않은 정적 항목일 수 있다.
// 이 경우 편집을 시작하기 전에 (리렌더 없이) blockId/columnIndex/listKey/editField를 미리 채워 넣어서
// 이후 startTextEdit/finishTextEdit이 일반 필드와 동일하게 동작하도록 만든다.
function startListItemTextEdit(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const li = event.currentTarget;
	if (!li.dataset.blockId) {
		const target = resolveListEditTarget(li);
		if (!target) return;
		li.dataset.editField = target.fieldKey;
		li.dataset.blockId = target.blockId;
		li.dataset.columnIndex = String(target.columnIndex);
		if (target.listKey) li.dataset.listKey = target.listKey;
	}
	startTextEdit(event);
}

function startTextEdit(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const field = event.currentTarget;
	if (field.dataset.editField === 'icon' || field.dataset.editField === 'riIcon') return;
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
}

function handleEditKeydown(event) {
	if (event.key === 'Enter') {
		if (event.altKey) {
			event.preventDefault();
			const selection = window.getSelection();
			if (selection.rangeCount) {
				const range = selection.getRangeAt(0);
				range.deleteContents();
				const br = document.createElement('br');
				range.insertNode(br);
				range.setStartAfter(br);
				range.collapse(true);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		} else {
			event.preventDefault();
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
	field.removeAttribute('contenteditable');
	if (field._editCancelled) return;

	// .edit-list의 li: 아직 배열로 추적되지 않았다면(정적 예시 상태) 형제 li들을 먼저 배열로
	// 전환한 뒤(지금 수정한 내용 포함) 해당 필드를 갱신한다.
	const editListEl = field.tagName === 'LI' && field.closest('.edit-list');
	if (editListEl) {
		const html = field.innerHTML;
		const originalHtml = field._editOriginalHtml ?? '';
		if (html === originalHtml) { render(); return; }
		const item = findItemByBlockId(field.dataset.blockId, Number(field.dataset.columnIndex));
		if (!item) { render(); return; }
		pushHistory();
		const listKey = field.dataset.listKey || '';
		if (!getEditListItems(item, listKey).length) ensureListTracked(item, editListEl);
		item[field.dataset.editField] = html;
		render();
		return;
	}

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

// ══════════════════════════════════════════════════════════════
// 15. 마크업 생성
// ══════════════════════════════════════════════════════════════

function updateMarkup() {
	_lastFullMarkup = generateMarkup();
	if (_markupTabs) _markupTabs.refresh();
	else markupOutput.value = _lastFullMarkup;
}

function generateMarkup() {
	if (!state.blocks.length && !state.overlays.length) return '<!-- 디자인 블록을 추가하면 마크업이 생성됩니다. -->';
	const { html: blocksHtml, cssRules } = state.blocks.length ? _generateBlocksMarkup() : { html: '', cssRules: [] };
	const allCssRules = [...cssRules];

	if (!state.overlays.length) {
		const styleBlock = allCssRules.length ? `<style>\n${allCssRules.join('\n\n')}\n</style>` : '';
		return styleBlock ? `${styleBlock}\n\n${blocksHtml}` : blocksHtml;
	}
	allCssRules.push(`@media (max-width: 768px) {\n  .sub-content-decoration {\n    display: none !important;\n  }\n}`);
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
	const wrapHtml = `<div style="position:relative;">\n${indented}\n${overlaysMarkup}\n</div>`;
	const styleBlock = `<style>\n${allCssRules.join('\n\n')}\n</style>`;
	return styleBlock ? `${styleBlock}\n\n${wrapHtml}` : wrapHtml;
}

function createProjectSnapshot() {
	return {
		schemaVersion: 1,
		app: 'klic-map-builder',
		savedAt: new Date().toISOString(),
		blocks: cloneData(state.blocks),
		overlays: cloneData(state.overlays || []),
		previewDevice: state.previewDevice || 'pc',
		canvasWidth: state.canvasWidth || '1200',
		generatedMarkup: generateMarkup()
	};
}

function restoreProjectSnapshot(snapshot) {
	if (!snapshot || !Array.isArray(snapshot.blocks)) {
		throw new Error('Invalid map builder JSON');
	}
	pushHistory();
	const blocks = cloneData(snapshot.blocks);
	const overlays = cloneData(snapshot.overlays || []);
	state.blocks = blocks.filter(block => {
		if (componentTemplates[block.type]) return true;
		console.warn(`지원되지 않는 블록 타입을 건너뜁니다: ${block.type}`);
		return false;
	});
	state.overlays = overlays.filter(overlay => {
		if (overlay.customDecorationId || componentTemplates[overlay.type]) return true;
		console.warn(`지원되지 않는 꾸밈요소 타입을 건너뜁니다: ${overlay.type}`);
		return false;
	});
	state.previewDevice = snapshot.previewDevice || 'pc';
	state.canvasWidth = snapshot.canvasWidth || '1200';
	state.selectedItem = null;
	state.dragPayload = '';
	state.nextBlockId = state.blocks.reduce((max, block) => {
		const n = parseInt(String(block.id || '').replace('block-', ''), 10);
		return Number.isNaN(n) ? max : Math.max(max, n + 1);
	}, 1);
	setPreviewDevice(state.previewDevice);
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

function hasBuilderContent() {
	return !!((state.blocks && state.blocks.length) || (state.overlays && state.overlays.length));
}

window.confirmBuilderExit = function() {
	if (!hasBuilderContent()) return Promise.resolve(true);
	return showConfirmModal({
		title: '빌더를 종료할까요?',
		message: '캔버스에 추가된 블록이 있습니다.\n빌더를 종료하면 작성 중인 빌더 화면이 닫힙니다.',
		confirmText: '종료',
		cancelText: '취소'
	});
};

function findFirstRoughmapKeys(value) {
	if (!value) return null;
	if (Array.isArray(value)) {
		for (const item of value) {
			const found = findFirstRoughmapKeys(item);
			if (found) return found;
		}
		return null;
	}
	if (typeof value === 'object') {
		if (value.roughmapTs && value.roughmapKey) {
			return { ts: String(value.roughmapTs), key: String(value.roughmapKey) };
		}
		for (const child of Object.values(value)) {
			const found = findFirstRoughmapKeys(child);
			if (found) return found;
		}
	}
	return null;
}

function encodeSnapshotComment(snapshot) {
	return btoa(unescape(encodeURIComponent(JSON.stringify(snapshot))));
}

function sanitizeLocationBuilderMarkup(markup) {
	return String(markup || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
}

window.getBuilderSnapshot = function() {
	return createProjectSnapshot();
};

window.restoreMapBuilderSnapshot = function(jsonStr) {
	const snapshot = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
	restoreProjectSnapshot(snapshot);
};

window.getLocationBuilderData = function() {
	const snapshot = createProjectSnapshot();
	const keys = findFirstRoughmapKeys(snapshot.blocks);
	const marker = `<!--KLIC_MAP_BUILDER:${encodeSnapshotComment(snapshot)}-->`;
	const markup = sanitizeLocationBuilderMarkup(snapshot.generatedMarkup);
	return {
		snapshot,
		locationKey1: keys?.ts || '',
		locationKey2: keys?.key || '',
		locationCn: `${markup}\n${marker}`,
		hasMap: !!keys
	};
};

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

function _patchMapBlockElement(outer, block) {
	const ts  = String(block.items[0]?.roughmapTs  || '');
	const key = String(block.items[0]?.roughmapKey || '');
	if (!ts || !key) return;

	outer.dataset.roughmapTs  = ts;
	outer.dataset.roughmapKey = key;

	const container = outer.querySelector('.root_daum_roughmap');
	if (container) container.id = `daumRoughmapContainer${ts}`;

	outer.querySelectorAll('script').forEach(s => {
		if (s.textContent.includes('renderRoughmap') || s.textContent.includes('roughmap')) s.remove();
	});

	const loaderScript = document.createElement('script');
	loaderScript.setAttribute('charset', 'UTF-8');
	loaderScript.setAttribute('class', 'daum_roughmap_loader_script');
	loaderScript.setAttribute('src', 'https://ssl.daumcdn.net/dmaps/map_js_init/roughmapLoader.js');
	outer.appendChild(loaderScript);

	const initScript = document.createElement('script');
	initScript.textContent = `new daum.roughmap.Lander({"timestamp":"${ts}","key":"${key}","mapHeight":"360"}).render();`;
	outer.appendChild(initScript);
}

function _generateBlocksMarkup() {
	const cssRules = [];
	const html = state.blocks.map((block, index) => {
		const blockNum = index + 1;
		const template = componentTemplates[block.type];
		const rootClass = _templateRootClass(template);
		let columns;

		// 지도(map) 카테고리 블록은 타이틀/본문/연결선 스타일 패널 자체가 노출되지 않아
		// --title-*/--body-*/--connector-* 값이 항상 기본값 그대로다. 아무 의미 없는
		// <style> 블록만 마크업에 남는 것을 막기 위해 이 블록들은 CSS 변수 주입을 건너뛴다.
		const isMapBlock = templateCategories[block.type] === 'map';

		if (template.isRootWrap) {
			columns = block.items.map((item, idx) => {
				const el = renderAddColumnWrapElement(template, item, block, idx, false);
				const vars = isMapBlock ? '' : columnStyleVars(item);
				const outerSel = `.sub-content-block.block-${blockNum} .${rootClass}:nth-child(${idx + 1})`;
				if (vars) cssRules.push(_buildStyleRule(outerSel, vars));
				_extractInnerVarStyles(el, outerSel, cssRules);
				applyItemStyles(el, item, template);
				if (isMapBlock) _patchMapBlockElement(el, block);
				return htmlToLines(elementToHtml(el)).map(line => `  ${line}`).join('\n');
			}).join('\n');
		} else {
			const outer = buildColumnBlock(template, block, false);
			const vars = isMapBlock ? '' : (outer.getAttribute('style') || '');
			const outerSel = `.sub-content-block.block-${blockNum} .${rootClass}`;
			if (vars) {
				cssRules.push(_buildStyleRule(outerSel, vars));
			}
			if (isMapBlock || vars) outer.removeAttribute('style');
			_extractInnerVarStyles(outer, outerSel, cssRules);
			applyItemStyles(outer, block.items[0] || {}, template);
			if (isMapBlock) _patchMapBlockElement(outer, block);
			columns = htmlToLines(elementToHtml(outer)).map(line => `  ${line}`).join('\n');
		}

		const isLast = index === state.blocks.length - 1;
		const marginBottom = (state.blocks.length <= 1 || isLast) ? 0 : (block.marginBottom ?? 30);
		const inlineParts = [marginBottom ? `margin-bottom:${marginBottom}px` : '', block.blockWidth ? `width:${block.blockWidth}` : ''].filter(Boolean);
		const marginStyle = inlineParts.length ? ` style="${inlineParts.join(';')}"` : '';
		return [
			`<section class="sub-content-block block-${blockNum} columns-${block.columns}"${marginStyle}>`,
			columns,
			'</section>'
		].join('\n');
	}).join('\n\n');

	return { html, cssRules };
}

// ══════════════════════════════════════════════════════════════
// 16. 오버레이 시스템
// ══════════════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════════════
// 17. 미리보기 & 이미지 저장
// ══════════════════════════════════════════════════════════════

function copyMarkup() {
	const text = markupOutput.value;
	copyState.textContent = '';
	KlicBuilderShared.copyText(text, showCopySuccess);
}

function showCopySuccess() {
	copyState.textContent = '마크업을 클립보드에 복사했습니다.';
	window.setTimeout(() => {
		copyState.textContent = '';
	}, 2200);
}

function openMarkup() {
	KlicBuilderShared.openMarkup(markupToggle);
}

function closeMarkup() {
	KlicBuilderShared.closeMarkup(markupToggle);
}

function toggleMarkupPanel() {
	KlicBuilderShared.toggleMarkupPanel(markupToggle);
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

function setBuilderExpanded(expanded) {
	const isExpanded = !!expanded;
	document.body.classList.toggle('builder-expanded', isExpanded);
	if (builderExpandButton) {
		builderExpandButton.classList.toggle('is-active', isExpanded);
		builderExpandButton.setAttribute('aria-pressed', String(isExpanded));
		builderExpandButton.setAttribute('aria-label', isExpanded ? '빌더 원래대로' : '빌더 넓게보기');
		const icon = builderExpandButton.querySelector('i');
		if (icon) {
			icon.className = isExpanded ? 'ri-collapse-diagonal-line' : 'ri-expand-left-fill';
		}
		const tooltip = builderExpandButton.querySelector('.builder-expand-tooltip');
		if (tooltip) {
			tooltip.textContent = isExpanded ? '빌더 원래대로' : '빌더 넓게보기';
		}
	}
	if (window.parent && window.parent !== window) {
		window.parent.postMessage({ type: 'builderExpandToggle', expanded: isExpanded }, '*');
	}
	requestAnimationFrame(function() {
		syncCanvasGuideSize();
		renderOverlayItems();
	});
}

const MAP_TOUR_STEPS = [
	{
		target: '.sidebar',
		title: '오시는길 구성 선택',
		desc: '지도 블록 카드를 캔버스로 드래그하세요.',
		position: 'right'
	},
	{
		target: '.workspace',
		title: '캔버스에 배치',
		desc: '작업 영역에 블록을 놓으면 오시는길 콘텐츠가 추가됩니다. 배치된 블록은 다시 드래그해 순서를 바꿀 수 있습니다.',
		position: 'left'
	},
	{
		target: '.builder-block',
		title: '블록 편집 컨트롤',
		desc: '<ul class="tour-ctrl-list"><li><i class="ri-settings-3-line"></i> <b>속성</b> 지도와 텍스트 스타일을 편집합니다.</li><li><i class="ri-file-copy-line"></i> <b>복사</b> 블록을 복제합니다.</li><li><i class="ri-close-line"></i> <b>삭제</b> 블록을 제거합니다.</li></ul>',
		position: 'bottom'
	},
	{
		target: '.right-col',
		title: '스타일 옵션 패널',
		desc: '블록을 클릭하면 오른쪽 패널에서 지도 주소, 텍스트, 색상과 간격을 실시간으로 편집할 수 있습니다.',
		position: 'left'
	}
];

function initGuidedTour() {
	KlicBuilderShared.initGuidedTour({
		steps: MAP_TOUR_STEPS,
		beforeStep: index => {
			if (index !== 1 || state.blocks.length !== 0) return;
			const templateIds = Object.keys(componentTemplates);
			const blockId = templateIds.find(id => templateCategories[id] === 'map')
				|| templateIds.find(id => !['design-template', 'design-template-section', 'decoration'].includes(templateCategories[id]));
			if (blockId) { state.blocks.push(createBlock(blockId)); render(); }
		}
	});
}

function openFileSaveModal() {
	if (!state.blocks.length) { alert('저장할 오시는길 콘텐츠가 없습니다.'); return; }
	const today = new Date();
	const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
	const input = document.getElementById('saveFileNameInput');
	if (input) input.value = `location_${dateStr}`;
	document.querySelectorAll('input[name="saveFileFormat"]').forEach(el => {
		el.checked = el.value === 'pdf';
	});
	const modal = document.getElementById('saveFileModal');
	if (modal) modal.hidden = false;
	setTimeout(() => {
		if (input) { input.focus(); input.select(); }
	}, 50);
}

function closeFileSaveModal() {
	const modal = document.getElementById('saveFileModal');
	if (modal) modal.hidden = true;
}

function buildStandaloneHtml(name) {
	const markup = generateMarkup();
	const css = collectStylesheetText();
	return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(name)}</title>
<link rel="stylesheet" href="/00_common/font/RemixIcon_Fonts_v4.7.0/remixicon.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<script charset="UTF-8" src="https://ssl.daumcdn.net/dmaps/map_js_init/roughmapLoader.js"><\/script>
<style>
${css}
</style>
</head>
<body>
${markup}
</body>
</html>`;
}

async function saveMapPdf(name) {
	if (!window.htmlToImage || !window.jspdf) throw new Error('PDF 저장 라이브러리를 불러오지 못했습니다.');
	await document.fonts.ready;
	const target = document.getElementById('canvasGrid');
	if (!target) throw new Error('저장할 캔버스를 찾을 수 없습니다.');
	const dataUrl = await window.htmlToImage.toPng(target, {
		backgroundColor: '#ffffff',
		width: target.offsetWidth,
		height: target.scrollHeight,
		pixelRatio: 2
	});
	const { jsPDF } = window.jspdf;
	const pdf = new jsPDF({ orientation: target.offsetWidth > target.scrollHeight ? 'landscape' : 'portrait', unit: 'px', format: [target.offsetWidth, target.scrollHeight] });
	pdf.addImage(dataUrl, 'PNG', 0, 0, target.offsetWidth, target.scrollHeight);
	pdf.save(`${name}.pdf`);
}

async function confirmFileSave() {
	const nameRaw = document.getElementById('saveFileNameInput')?.value.trim();
	const name = nameRaw || 'location';
	const formats = Array.from(document.querySelectorAll('input[name="saveFileFormat"]:checked')).map(el => el.value);
	if (!formats.length) { alert('저장 형식을 하나 이상 선택하세요.'); return; }
	const btn = document.getElementById('saveFileConfirm');
	const originalHtml = btn?.innerHTML;
	if (btn) {
		btn.disabled = true;
		btn.innerHTML = '<span class="save-btn-spinner"></span> 저장 중...';
	}
	try {
		const html = buildStandaloneHtml(name);
		for (const format of formats) {
			if (format === 'klic') {
				downloadBlob(new Blob([JSON.stringify(createProjectSnapshot(), null, 2)], { type: 'application/json;charset=utf-8' }), `${name}.klic`);
			} else if (format === 'html') {
				downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${name}.html`);
			} else if (format === 'doc') {
				downloadBlob(new Blob([html], { type: 'application/msword;charset=utf-8' }), `${name}.doc`);
			} else if (format === 'pdf') {
				await saveMapPdf(name);
			}
		}
		closeFileSaveModal();
	} catch (error) {
		console.error(error);
		alert(error.message || '파일 저장에 실패했습니다.');
	} finally {
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = originalHtml;
		}
	}
}

function bindFileSaveModal() {
	if (saveFileButton) {
		window.__builderSaveFileOpenBound = true;
		saveFileButton.addEventListener('click', openFileSaveModal);
	}
	document.getElementById('saveFileClose')?.addEventListener('click', closeFileSaveModal);
	document.getElementById('saveFileCancel')?.addEventListener('click', closeFileSaveModal);
	document.getElementById('saveFileBackdrop')?.addEventListener('click', closeFileSaveModal);
	document.getElementById('saveFileConfirm')?.addEventListener('click', confirmFileSave);
}

async function loadProjectKlicFile(file) {
	if (!file) return;
	const text = await file.text();
	restoreProjectSnapshot(JSON.parse(text));
}

function bindLoadKlic() {
	const loadBtn = document.getElementById('loadKlic');
	const loadInput = document.getElementById('klicFileInput');
	loadBtn?.addEventListener('click', () => loadInput?.click());
	loadInput?.addEventListener('change', async () => {
		const file = loadInput.files?.[0];
		if (!file) return;
		try {
			await loadProjectKlicFile(file);
		} catch (error) {
			console.error(error);
			alert('KLIC 파일을 불러오지 못했습니다.');
		} finally {
			loadInput.value = '';
		}
	});
}

async function savePreviewImage() {
	if (!state.blocks.length) return;
	const lib = window.htmlToImage;
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

	// canvasGrid 실제 크기 측정 (preview-export CSS 적용 후)
	const gridWidth = canvasGridEl.offsetWidth;
	const gridHeight = canvasGridEl.scrollHeight;

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
		document.body.classList.remove('preview-export');
		btn.disabled = false;
		if (wasOverlayEdit) {
			document.body.classList.add('overlay-edit');
			renderOverlayItems();
		}
	}
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
		<button type="button" class="list-edit-btn list-add-btn" title="항목 추가 (아래)">
			<i class="ri-add-line" aria-hidden="true"></i>
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
		addListItem(_listEditTarget.blockId, _listEditTarget.columnIndex, _listEditTarget.listKey, _listEditTarget.fieldKey);
		el.hidden = true;
	});
	el.querySelector('.list-del-btn').addEventListener('click', () => {
		if (!_listEditTarget) return;
		deleteListItem(_listEditTarget.blockId, _listEditTarget.columnIndex, _listEditTarget.listKey, _listEditTarget.fieldKey);
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
	let top = rect.top + rect.height / 2 - bh / 2;
	left = Math.min(left, window.innerWidth - bw - 4);
	top = Math.max(4, Math.min(top, window.innerHeight - bh - 4));
	_listEditButtons.style.left = `${left}px`;
	_listEditButtons.style.top = `${top}px`;

	// 아직 배열로 추적되지 않은 정적 리스트는 실제 화면에 그려진 li 개수로 판단한다.
	const itemCount = li.parentElement ? li.parentElement.children.length : 1;
	_listEditButtons.querySelector('.list-del-btn').disabled = itemCount <= 1;
}

// li가 아직 배열로 추적되지 않은 정적 항목이면(data-block-id 없음),
// 상위 블록과 리스트 위치로부터 (아직 존재하지 않는) 필드키를 미리 계산해서 넘긴다.
// addListItem/deleteListItem은 그 필드키를 기준으로 화면에 보이는 li들을 배열로 전환한 뒤 처리한다.
function resolveListEditTarget(li) {
	const editList = li.parentElement;
	if (li.dataset.blockId) {
		return {
			blockId: li.dataset.blockId,
			columnIndex: Number(li.dataset.columnIndex),
			listKey: li.dataset.listKey || editList?.dataset.listKey || '',
			fieldKey: li.dataset.editField
		};
	}
	const root = li.closest('.block-item[data-block-id]');
	if (!root || !editList) return null;
	const listKey = editList.dataset.listKey || '';
	const domIndex = Array.from(editList.children).indexOf(li);
	return {
		blockId: root.dataset.blockId,
		columnIndex: Number(root.dataset.columnIndex),
		listKey,
		fieldKey: `${editListFieldPrefix(listKey)}${domIndex + 1}`
	};
}

function bindEditListEvents() {
	document.querySelectorAll('.edit-list li').forEach(li => {
		li.addEventListener('mouseenter', () => {
			if (document.body.classList.contains('preview-mode')) return;
			const target = resolveListEditTarget(li);
			if (!target) return;
			clearTimeout(_listEditHideTimer);
			_listEditTarget = target;
			positionListEditButtons(li);
		});
		li.addEventListener('mouseleave', () => {
			_listEditHideTimer = setTimeout(() => {
				if (!_listEditButtons.matches(':hover')) _listEditButtons.hidden = true;
			}, 120);
		});
	});
}

// ── 오시는길 뱃지(지선/순환/1/5 등) 배경색·글자색 편집 ─────────
// 뱃지에 마우스를 올리면 뱃지 위에 배경색/글자색 피커가 뜬다(리스트 추가/삭제 버튼과 같은 방식).
const ROADMAP_BADGE_SELECTOR = '.roadmap .box.bus .bus-list > li > em, .roadmap .box.subway > ul > li > em';

let _badgeColorPanel = null;
let _badgeColorTarget = null; // { em, blockId, columnIndex }
let _badgeColorHideTimer = null;

function rgbToHex(rgb) {
	const m = String(rgb || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
	if (!m) return null;
	return '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('');
}

function commitBadgeColor(em, blockId, columnIndex) {
	const item = findItemByBlockId(blockId, columnIndex);
	const listEl = em.closest('.edit-list');
	const li = em.closest('li');
	if (!item || !listEl || !li) return;
	pushHistory();
	if (li.dataset.blockId && li.dataset.editField) {
		// 이미 배열로 추적 중인 항목: 해당 li의 현재 내용을 그대로 저장
		item[li.dataset.editField] = li.innerHTML;
		updateMarkup();
	} else {
		// 아직 정적 예시 상태인 리스트: 지금 화면에 보이는 내용(방금 바꾼 색 포함)을 기준으로 배열로 전환
		ensureListTracked(item, listEl);
		render();
	}
}

function createBadgeColorPanel() {
	const el = document.createElement('div');
	el.id = 'badgeColorPanel';
	el.className = 'badge-color-panel';
	el.hidden = true;
	el.innerHTML = `
		<label class="badge-color-panel-item" title="배경색">
			<span>배경</span>
			<input type="color" class="badge-color-panel-input" data-badge-target="bg">
		</label>
		<label class="badge-color-panel-item" title="글자색">
			<span>글자</span>
			<input type="color" class="badge-color-panel-input" data-badge-target="text">
		</label>
	`;
	document.body.appendChild(el);
	el.addEventListener('mouseenter', () => clearTimeout(_badgeColorHideTimer));
	el.addEventListener('mouseleave', () => {
		_badgeColorHideTimer = setTimeout(() => { el.hidden = true; }, 120);
	});
	el.querySelectorAll('.badge-color-panel-input').forEach(input => {
		input.addEventListener('click', event => event.stopPropagation());
		input.addEventListener('input', () => {
			if (!_badgeColorTarget) return;
			const { em } = _badgeColorTarget;
			if (input.dataset.badgeTarget === 'bg') em.style.backgroundColor = input.value;
			else em.style.color = input.value;
		});
		input.addEventListener('change', () => {
			if (!_badgeColorTarget) return;
			const { em, blockId, columnIndex } = _badgeColorTarget;
			commitBadgeColor(em, blockId, columnIndex);
		});
	});
	return el;
}

function positionBadgeColorPanel(em) {
	_badgeColorPanel.hidden = false;
	const rect = em.getBoundingClientRect();
	const ph = _badgeColorPanel.offsetHeight;
	const pw = _badgeColorPanel.offsetWidth;
	let left = rect.left + rect.width / 2 - pw / 2;
	let top = rect.top - ph - 8;
	if (top < 4) top = rect.bottom + 8; // 화면 맨 위쪽이라 위로 띄울 공간이 없으면 아래로 대체
	left = Math.max(4, Math.min(left, window.innerWidth - pw - 4));
	_badgeColorPanel.style.left = `${left}px`;
	_badgeColorPanel.style.top = `${top}px`;

	const cs = getComputedStyle(em);
	const bgInput = _badgeColorPanel.querySelector('[data-badge-target="bg"]');
	const fgInput = _badgeColorPanel.querySelector('[data-badge-target="text"]');
	if (bgInput) bgInput.value = rgbToHex(cs.backgroundColor) || '#ffffff';
	if (fgInput) fgInput.value = rgbToHex(cs.color) || '#000000';
}

function bindBadgeColorSwatches() {
	if (document.body.classList.contains('preview-mode')) return;
	if (!_badgeColorPanel) _badgeColorPanel = createBadgeColorPanel();
	document.querySelectorAll(ROADMAP_BADGE_SELECTOR).forEach(em => {
		const root = em.closest('.block-item[data-block-id]');
		if (!root) return;
		em.classList.add('roadmap-badge-editable');
		em.addEventListener('mouseenter', () => {
			clearTimeout(_badgeColorHideTimer);
			_badgeColorTarget = { em, blockId: root.dataset.blockId, columnIndex: Number(root.dataset.columnIndex) };
			positionBadgeColorPanel(em);
		});
		em.addEventListener('mouseleave', () => {
			_badgeColorHideTimer = setTimeout(() => {
				if (!_badgeColorPanel.matches(':hover')) _badgeColorPanel.hidden = true;
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

// ══════════════════════════════════════════════════════════════
// 18. 초기화
// ══════════════════════════════════════════════════════════════

function initMapCtrlDragMode() {
	const setReady = active => {
		document.body.classList.toggle('map-ctrl-drag-ready', !!active && !document.body.classList.contains('preview-mode'));
	};
	document.addEventListener('keydown', event => {
		if (event.key === 'Control' || event.key === 'Meta') setReady(true);
	});
	document.addEventListener('keyup', event => {
		if (event.key === 'Control' || event.key === 'Meta') setReady(false);
	});
	window.addEventListener('blur', () => setReady(false));
	document.addEventListener('dragend', () => setReady(false));
}

async function init() {
	loadCustomDecorations();
	componentList.classList.add('is-empty-state');
	try {
		await Promise.all([loadTemplates(), loadIconCategories()]);
		renderDesignTemplateList();
		renderComponentList();
	} catch (error) {
		console.error(error);
		showTemplateLoadError(error);
	}

	KlicBuilderShared.bindClearCanvas(clearCanvas);
	KlicBuilderShared.bindOptionsPanelClose(clearOptionsPanel, optionsPanel);
	document.getElementById('copyMarkup')?.addEventListener('click', copyMarkup);
	_markupTabs = KlicBuilderShared.bindMarkupTabs({
		output: markupOutput,
		getMarkup: () => _lastFullMarkup
	});
	KlicBuilderShared.bindSidebarTabs(tab => {
		state.sidebarTab = tab;
		if (tab === 'custom' || tab === 'templates') renderDesignTemplateList();
		renderRecommendationPanel();
	});
	KlicBuilderShared.bindScrollableFilters();
	KlicBuilderShared.bindFilterEvents({
		onTemplateFilter: value => {
			state.templateFilter = value;
			renderComponentList();
		},
		onDesignTemplateFilter: value => {
			state.designTemplateFilter = value;
			renderDesignTemplateList();
		}
	});
	previewToggle?.addEventListener('click', togglePreview);
	previewReturn?.addEventListener('click', returnToCanvas);
	savePreviewImageButton?.addEventListener('click', savePreviewImage);
	bindFileSaveModal();
	bindLoadKlic();
	previewMarkupOpenButton?.addEventListener('click', openMarkupFromPreview);
	markupToggle?.addEventListener('click', toggleMarkupPanel);
	initGuidedTour();
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
	initMapCtrlDragMode();
	document.getElementById('markupClose').addEventListener('click', closeMarkup);
	document.getElementById('markupBackdrop').addEventListener('click', closeMarkup);
	document.addEventListener('keydown', e => {
		if (e.key === 'Escape') closeMarkup();
		if (e.key === 'Escape' && builderExpandButton?.getAttribute('aria-pressed') === 'true') {
			setBuilderExpanded(false);
		}
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
	canvasGrid.addEventListener('dragleave', event => {
		if (!canvasGrid.contains(event.relatedTarget)) canvasGrid.classList.remove('is-over');
	});
	const canvasWrapper = document.getElementById('canvasWrapper');
	KlicBuilderShared.bindCanvasDropTargets({ canvasGrid, canvasWrapper, onDragOver: handleCanvasDragOver, onDrop: handleCanvasDrop });
	_listEditButtons = createListEditButtons();
	initFormatToolbar();
	document.getElementById('iconDrawerClose')?.addEventListener('click', closeIconDrawer);
	document.getElementById('iconDrawerBackdrop')?.addEventListener('click', closeIconDrawer);
	canvasGrid.style.maxWidth = `${state.canvasWidth}px`;
	document.body.dataset.canvasSize = state.canvasWidth;
	document.body.dataset.previewDevice = 'pc';
	document.getElementById('deviceSwitcher')?.addEventListener('click', e => {
		const trigger = e.target.closest('#deviceDropdownTrigger');
		const menu = document.getElementById('deviceDropdownMenu');
		if (trigger && menu) {
			menu.hidden = !menu.hidden;
			return;
		}
		const btn = e.target.closest('[data-device]');
		if (btn) {
			setPreviewDevice(btn.dataset.device);
			if (menu) menu.hidden = true;
		}
	});
	document.addEventListener('click', e => {
		if (!e.target.closest('#deviceSwitcher')) {
			const menu = document.getElementById('deviceDropdownMenu');
			if (menu) menu.hidden = true;
		}
	});
	renderCanvasPanelUI();
	render();
	if (window.parent && window.parent !== window) {
		window.parent.postMessage({ type: 'builderReady' }, '*');
	}
}

window.addEventListener('DOMContentLoaded', init);

window.addEventListener('message', function(e) {
	if (!e.data) return;
	if (e.data.type === 'restoreMapBuilderSnapshot' && e.data.json) {
		window.restoreMapBuilderSnapshot(e.data.json);
	}
});
