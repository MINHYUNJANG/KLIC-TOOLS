const TEMPLATE_DIR = 'builder/contents/templates/';
const CONTENT_TEMPLATE_BASE = 'builder/contents/templates/';
const COMMON_TEMPLATE_BASE = 'builder/common/templates/';
const TEMPLATE_MANIFEST = CONTENT_TEMPLATE_BASE + 'goal/manifest.json';
const TEMPLATE_FILE_PATTERN = /\.(html|js)$/i;
const TEMPLATE_IMAGE_PATTERN = /\.(png|jpe?g|webp|gif|svg)$/i;
const loadedTemplateStyles = new Map();

const ICON_MANIFEST = COMMON_TEMPLATE_BASE + 'common/icon/manifest.json';
const SHOW_MIX_BLOCKS = false;
let ICON_CATEGORIES = [];

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
	if (path.startsWith('templates/')) return CONTENT_TEMPLATE_BASE + path.slice('templates/'.length);
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
	sidebarTab: 'blocks',
	selectedItem: null,
	overlays: [],
	undoStack: [],
	canvasWidth: '1241',
	previewDevice: 'pc'
};

// Filled automatically when manifest.json is loaded.
const templateCategories = {};
const templateBasePaths = {}; // { 'box-01': 'templates/goal/box/box-01', ... }

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

function switchFilterTab(filterValue) {
	const btn = document.querySelector(`[data-template-filter="${filterValue}"]`);
	if (!btn) return;
	state.templateFilter = filterValue;
	document.querySelectorAll('[data-template-filter]').forEach(b => b.classList.toggle('is-active', b === btn));
	renderComponentList();
}

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

function setFieldContent(element, value) {
	element.innerHTML = String(value || '');
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
	return data;
}

function normalizeTemplatePath(path) {
	let normalized;
	if (/^https?:\/\//i.test(path) || path.startsWith('/')) {
		normalized = path;
	} else if (path.startsWith('templates/')) {
		normalized = CONTENT_TEMPLATE_BASE + path.slice('templates/'.length);
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
		normalized = CONTENT_TEMPLATE_BASE + path.slice('templates/'.length);
	} else {
		normalized = TEMPLATE_DIR + path;
	}
	return normalized.replace(/\/?$/, '');
}

function inferGoalTemplateCategory(path) {
	if (/\/common\/divider\//.test(path)) return 'divider';
	if (/\/common\/decoration\//.test(path)) return 'decoration';
	const match = path.match(/\/goal\/([^/]+)\//);
	return match ? match[1] : '';
}

function inferGoalTemplateId(path) {
	const normalized = path.replace(/\\/g, '/');
	const parts = normalized.split('/').filter(Boolean);
	const file = parts.at(-1) || '';
	const folder = parts.at(-2) || '';
	if (/^index\.html$/i.test(file) || !/\.[^.]+$/i.test(file)) return folder;
	if (/\/common\/decoration\/(kinder|elem|middle|high)\//.test(normalized)) {
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
	const entries = await fetchTemplateManifest(TEMPLATE_MANIFEST, true);

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
	return htmlPath.replace(/[^/]+$/, 'style.css');
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
			node.setAttribute('style', style.replace(/url\((['"]?)(templates\/[^'")]+)\1\)/g, (_, quote, assetPath) => {
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

	return {
		id,
		name,
		path,
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

	return {
		id,
		name,
		path,
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

	for (const path of htmlPaths) {
		const template = await loadHtmlTemplate(path);
		componentTemplates[template.id] = template;
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

function createBlock(type) {
	const template = componentTemplates[type];
	const defaultData = template.getDefaultData ? template.getDefaultData() : {};
	const block = {
		id: `block-${state.nextBlockId++}`,
		type,
		columns: 1,
		columnMode: '1',
		marginBottom: 30,
		blockIndent: false,
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
		blockIndent: !!sourceBlock.blockIndent,
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

// ── 템플릿 경로 헬퍼 ─────────────────────────────────────
function getTemplateBasePath(id) {
	return templateBasePaths[id] || `${TEMPLATE_DIR}${id}`;
}

// ── 썸네일 ──────────────────────────────────────────────
function getThumbUrl(templateId) {
	return `${getTemplateBasePath(templateId)}/screenshot.png`;
}

function renderComponentList() {
	const templates = Object.values(componentTemplates).filter(template => {
		const category = templateCategories[template.id] || 'box';
		if (!SHOW_MIX_BLOCKS && category === 'mix') return false;
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
}

function bindFilterEvents() {
	KlicBuilderShared.bindFilterEvents({
		onTemplateFilter: switchFilterTab
	});
	KlicBuilderShared.bindScrollableFilters();
}

function activateFilterButton(button) {
	if (!button) return;
	if (button.dataset.templateFilter) {
		switchFilterTab(button.dataset.templateFilter);
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
	updateMarkup();
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
	const blockBodyHtml = `
			<div class="${template.addDirection === 'row' ? `builder-columns columns-${block.columns}` : `builder-rows rows-${block.columns}`}">
				${renderRepeatedColumns(block)}
			</div>`;
	const blockContentHtml = block.blockIndent ? `<div class="indent">${blockBodyHtml}</div>` : blockBodyHtml;
	return `
		<section class="builder-block" draggable="true" data-block-id="${block.id}" style="margin-bottom:${effectiveMargin}px${block.blockWidth ? `;width:${block.blockWidth}` : ''}">
			<div class="block-controls" aria-hidden="true">
				<div class="drag-handle" data-tooltip="이동"><i class="ri-draggable" aria-hidden="true"></i></div>
				<button type="button" class="block-duplicate" data-tooltip="복사" data-duplicate-block-id="${block.id}" aria-label="블록 복사">
					<i class="ri-file-copy-line" aria-hidden="true"></i>
				</button>
				<button type="button" class="block-remove" data-tooltip="삭제" data-remove-block-id="${block.id}" aria-label="블록 삭제">
					<i class="ri-close-line" aria-hidden="true"></i>
				</button>
			</div>
			${blockContentHtml}
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
		renderEditListInElement(el, template.editListLiTemplate, item, block, columnIndex, editable);
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

function renderEditListInElement(outerEl, editListLiTemplate, item, block, columnIndex, editable) {
	const editList = outerEl.querySelector('.edit-list');
	if (!editList) return;
	const entries = getEditListItems(item);
	if (!entries.length) return;
	editList.innerHTML = '';
	entries.forEach(entry => {
		const li = editListLiTemplate.cloneNode(false);
		li.innerHTML = entry.value;
		if (editable && block) {
			li.dataset.editField = entry.key;
			li.dataset.blockId = block.id;
			li.dataset.columnIndex = String(columnIndex);
			li.style.position = 'relative';
			const actionsDiv = document.createElement('span');
			actionsDiv.className = 'list-row-inline-actions';
			const addBtn = document.createElement('button');
			addBtn.type = 'button';
			addBtn.className = 'list-row-inline-btn list-row-inline-btn--add';
			addBtn.title = '아래 항목 추가';
			addBtn.dataset.elBlockId = block.id;
			addBtn.dataset.elColumnIndex = String(columnIndex);
			addBtn.dataset.elFieldKey = entry.key;
			addBtn.innerHTML = '<i class="ri-add-line" aria-hidden="true"></i>';
			actionsDiv.appendChild(addBtn);
			const removeBtn = document.createElement('button');
			removeBtn.type = 'button';
			removeBtn.className = 'list-row-inline-btn list-row-inline-btn--remove';
			removeBtn.title = '항목 삭제';
			removeBtn.dataset.elBlockId = block.id;
			removeBtn.dataset.elColumnIndex = String(columnIndex);
			removeBtn.dataset.elFieldKey = entry.key;
			removeBtn.innerHTML = '<i class="ri-delete-bin-line" aria-hidden="true"></i>';
			actionsDiv.appendChild(removeBtn);
			li.appendChild(actionsDiv);
		} else {
			li.removeAttribute('data-edit-field');
		}
		editList.appendChild(li);
	});
}

function addListItem(blockId, columnIndex, afterFieldKey) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !block.items[columnIndex]) return;
	pushHistory();
	const item = block.items[columnIndex];
	const entries = getEditListItems(item);
	const idx = entries.findIndex(e => e.key === afterFieldKey);
	entries.splice(idx + 1, 0, { key: '', value: '새 항목' });
	entries.forEach((e, i) => { e.key = `item${i + 1}`; });
	Object.keys(item).filter(k => /^item\d+$/.test(k)).forEach(k => delete item[k]);
	entries.forEach(e => { item[e.key] = e.value; });
	render();
}

function deleteListItem(blockId, columnIndex, fieldKey) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !block.items[columnIndex]) return;
	const item = block.items[columnIndex];
	const entries = getEditListItems(item);
	if (entries.length <= 1) return;
	pushHistory();
	const newEntries = entries.filter(e => e.key !== fieldKey);
	newEntries.forEach((e, i) => { e.key = `item${i + 1}`; });
	Object.keys(item).filter(k => /^item\d+$/.test(k)).forEach(k => delete item[k]);
	newEntries.forEach(e => { item[e.key] = e.value; });
	render();
}

function renderRepeatedColumns(block) {
	const template = componentTemplates[block.type];

	if (template.isRootWrap) {
		return block.items.map((item, index) => {
			const el = renderAddColumnWrapElement(template, item, block, index, true);
			el.setAttribute('style', columnStyleVars(item));
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
						if (block.type === 'button-00' && templateCategories[ib.type] === 'button') {
							if (innerEl.hasAttribute('style')) innerEl.removeAttribute('style');
							return innerEl.attributes.length === 0 ? innerEl.innerHTML.trim() : elementToHtml(innerEl);
						}
						const mbStyle = ib.marginBottom != null ? ` style="margin-bottom:${ib.marginBottom}px"` : '';
						return `<div class="mix-inner-item"${mbStyle}>${elementToHtml(innerEl)}</div>`;
					}
				}).join('');
			} else if (editable) {
				// 빈 슬롯: 빨간 점선 + 안내 문구
				slotEl.classList.add('mix-slot-empty');
				slotEl.innerHTML = '<div class="mix-slot-placeholder"><i class="ri-add-circle-line"></i> 디자인 블록을 드래그해서 넣으세요.</div>';
			}
			if (!editable && block.type === 'button-00') {
				slotEl.classList.remove('mix-inner-slot');
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
	item.icon = `<img src="${src}" alt="${name}" class="block-icon-img">`;
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

function bindComponentEvents(container = document) {
	KlicBuilderShared.bindComponentItems({
		container,
		canvasGrid,
		getDragPayload: item => {
			const isDecoration = item.dataset.decoration === 'true';
			return isDecoration
				? `overlay-type:${item.dataset.type}`
				: `new-block:${item.dataset.type}`;
		},
		onAdd: item => {
			const isDecoration = item.dataset.decoration === 'true';
			if (isDecoration) {
				const grid = document.getElementById('canvasGrid');
				const wrapper = document.getElementById('canvasWrapper');
				if (grid && wrapper) {
					const gRect = grid.getBoundingClientRect();
					const wRect = wrapper.getBoundingClientRect();
					const x = Math.max(0, (wRect.left + wRect.width / 2) - gRect.left - 60);
					const y = Math.max(0, (wRect.top + wRect.height / 2) - gRect.top - 60);
					addOverlay(item.dataset.type, x, y);
				} else {
					addOverlay(item.dataset.type, 100, 100);
				}
			} else {
				addBlock(item.dataset.type);
			}
		},
		onDragStart: item => {
			const isDecoration = item.dataset.decoration === 'true';
			state.dragPayload = isDecoration
				? `overlay-type:${item.dataset.type}`
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
		field.addEventListener('dblclick', startTextEdit);
	});
	document.querySelectorAll('[data-edit-field="icon"]').forEach(field => {
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
	const unit = template.addDirection === 'row' ? '행' : '열';
	const isDivider = templateCategories[block.type] === 'divider';
	const hasIconField = !!template.element.querySelector('[data-edit-field="icon"]');

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
	const widthOptions = ['20%', '25%', '33%', '50%'];
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
			<div class="options-layout-row">
				<span>들여쓰기</span>
				<div class="options-layout-input">
					<label class="options-check-label">
						<input type="checkbox" data-indent-block-id="${block.id}"${block.blockIndent ? ' checked' : ''}>
						<span>적용</span>
					</label>
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

	const headSub = columnIndex !== null ? `<span>${columnIndex + 1}${unit}</span>` : '';
	optionsPanel.innerHTML = `
		<div class="options-panel-head">
			<strong>${escapeHtml(block.type)}</strong>
			${headSub}
		</div>
		<div class="options-panel-groups">
			${blockSettingSection}
			${listWrapSection}
			${styleSection}
		</div>
	`;
	bindStyleFieldEvents(optionsPanel);
	bindIconControls(optionsPanel);
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
	const indentInput = optionsPanel.querySelector('[data-indent-block-id]');
	if (indentInput) {
		indentInput.addEventListener('change', () => updateBlockIndent(indentInput.dataset.indentBlockId, indentInput.checked));
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
	const sizes = ['1024', '1241', '1440'];
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
	state.canvasWidth = value || '1241';
	document.body.dataset.canvasSize = state.canvasWidth;
	if (state.previewDevice === 'pc') {
		canvasGrid.style.maxWidth = `${state.canvasWidth}px`;
	}
	if (typeof syncCanvasGuideSize === 'function') syncCanvasGuideSize();
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
	block.marginBottom = Math.max(0, Number(value) || 0);
	const total = state.blocks.length;
	const isLast = state.blocks[total - 1]?.id === blockId;
	const effectiveMargin = (total <= 1 || isLast) ? 0 : block.marginBottom;
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (section) section.style.marginBottom = `${effectiveMargin}px`;
	updateMarkup();
}

function updateBlockIndent(blockId, checked) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	pushHistoryGrouped();
	block.blockIndent = !!checked;
	render();
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
		if (event.shiftKey) {
			event.preventDefault();
			event.currentTarget.blur();
		} else {
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
	if (payload.startsWith('overlay-type:')) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
		document.getElementById('canvasWrapper')?.classList.add('is-decoration-over');
		return;
	}
	if (payload.startsWith('new-block:') || payload.startsWith('existing-block:') || payload.startsWith('copy-block:')) {
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
	if (payload.startsWith('overlay-type:')) {
		event.preventDefault();
		event.stopPropagation();
		document.getElementById('canvasWrapper')?.classList.remove('is-decoration-over');
		const grid = document.getElementById('canvasGrid');
		if (grid) {
			const gRect = grid.getBoundingClientRect();
			addOverlay(payload.replace('overlay-type:', ''), event.clientX - gRect.left, event.clientY - gRect.top);
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
	if (!payload.startsWith('new-block:') && !payload.startsWith('existing-block:') && !payload.startsWith('copy-block:')) return;
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
	if (payload.startsWith('copy-block:')) {
		duplicateBlockAt(payload.replace('copy-block:', ''), targetBlockId, position);
		return;
	}
	moveBlock(payload.replace('existing-block:', ''), targetBlockId, position);
}

function updateMarkup() {
	markupOutput.value = generateMarkup();
}

function generateMarkup() {
	if (!state.blocks.length && !state.overlays.length) return '<!-- 디자인 블록을 추가하면 마크업이 생성됩니다. -->';
	const { html: blocksHtml, cssRules } = state.blocks.length ? _generateBlocksMarkup() : { html: '', cssRules: [] };

	if (!state.overlays.length) {
		const styleBlock = cssRules.length ? `<style>\n${cssRules.join('\n\n')}\n</style>` : '';
		return styleBlock ? `${styleBlock}\n\n${blocksHtml}` : blocksHtml;
	}
	cssRules.push(`@media (max-width: 768px) {\n  .sub-content-decoration {\n    display: none !important;\n  }\n}`);
	const overlaysMarkup = state.overlays.map(ov => {
		const template = componentTemplates[ov.type];
		if (!template) return '';
		const lines = template.markup(ov.data || {});
		const inner = lines.map(l => `    ${l}`).join('\n');
		return `  <div class="sub-content-decoration" style="position:absolute;top:${ov.y}px;left:${ov.x}px;">\n${inner}\n  </div>`;
	}).join('\n');
	const indented = blocksHtml.split('\n').map(l => `  ${l}`).join('\n');
	const wrapHtml = `<div style="position:relative;">\n${indented}\n${overlaysMarkup}\n</div>`;
	const styleBlock = `<style>\n${cssRules.join('\n\n')}\n</style>`;
	return styleBlock ? `${styleBlock}\n\n${wrapHtml}` : wrapHtml;
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

function _wrapIndentMarkup(innerHtml) {
	const indented = innerHtml.split('\n').map(l => `  ${l}`).join('\n');
	return `<div class="indent">\n${indented}\n</div>`;
}

function _generateBlocksMarkup() {
	const cssRules = [];
	const html = state.blocks.map((block, index) => {
		const blockNum = index + 1;
		const template = componentTemplates[block.type];
		const rootClass = _templateRootClass(template);
		let columns;

		if (template.isRootWrap) {
			columns = block.items.map((item, idx) => {
				const el = renderAddColumnWrapElement(template, item, block, idx, false);
				const vars = columnStyleVars(item);
				const outerSel = `.sub-content-block.block-${blockNum} .${rootClass}:nth-child(${idx + 1})`;
				if (vars) cssRules.push(_buildStyleRule(outerSel, vars));
				_extractInnerVarStyles(el, outerSel, cssRules);
				applyItemStyles(el, item, template);
				return htmlToLines(elementToHtml(el)).map(line => `  ${line}`).join('\n');
			}).join('\n');
		} else {
			const outer = buildColumnBlock(template, block, false);
			const vars = outer.getAttribute('style') || '';
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
		const inlineParts = [marginBottom ? `margin-bottom:${marginBottom}px` : '', block.blockWidth ? `width:${block.blockWidth}` : ''].filter(Boolean);
		const marginStyle = inlineParts.length ? ` style="${inlineParts.join(';')}"` : '';
		const sectionColumns = block.blockIndent ? _wrapIndentMarkup(columns) : columns;
		return [
			`<section class="sub-content-block block-${blockNum} columns-${block.columns}"${marginStyle}>`,
			sectionColumns,
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

function removeOverlay(id) {
	state.overlays = state.overlays.filter(ov => ov.id !== id);
	syncCanvasPresence();
	if (!state.blocks.length) render();
	renderOverlayItems();
	updateMarkup();
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
			const template = componentTemplates[ov.type];
			if (!template) return '';
			const html = template.render({ id: ov.id }, ov.data || {}, 0, false);
			return `<div class="overlay-item" data-ov-id="${ov.id}" style="top:${ov.y + off.y}px;left:${ov.x + off.x}px;">${html}</div>`;
		}).join('');
		return;
	}
	layer.innerHTML = state.overlays.map(ov => {
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
		if (!state.dragPayload.startsWith('overlay-type:')) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
	});

	layer.addEventListener('drop', event => {
		const payload = state.dragPayload;
		if (!payload.startsWith('overlay-type:')) return;
		event.preventDefault();
		const grid = document.getElementById('canvasGrid');
		if (grid) {
			const gRect = grid.getBoundingClientRect();
			addOverlay(payload.replace('overlay-type:', ''), event.clientX - gRect.left, event.clientY - gRect.top);
		}
		state.dragPayload = '';
	});
}

function copyMarkup() {
	const text = markupOutput.value;
	copyState.textContent = '';
	if (navigator.clipboard && window.isSecureContext) {
		navigator.clipboard.writeText(text).then(showCopySuccess).catch(copyFallback);
		return;
	}
	copyFallback();
}

function copyFallback() {
	markupOutput.focus();
	markupOutput.select();
	document.execCommand('copy');
	showCopySuccess();
}

function showCopySuccess() {
	copyState.textContent = '마크업을 클립보드에 복사했습니다.';
	window.setTimeout(() => {
		copyState.textContent = '';
	}, 2200);
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
	const lib = window.htmlToImage;
	if (!lib) { alert('이미지 저장 라이브러리를 불러오지 못했습니다.'); return; }

	await document.fonts.ready;

	const btn = savePreviewImageButton;
	btn.disabled = true;

	// 캡처 전 오버레이 편집 UI 임시 제거
	const wasOverlayEdit = document.body.classList.contains('overlay-edit');
	if (wasOverlayEdit) document.body.classList.remove('overlay-edit');
	renderOverlayItems();

	const captureTarget = document.getElementById('canvasWrapper') || canvasGrid;

	// 가이드 숨김
	const guide = captureTarget.querySelector('.canvas-guide');
	if (guide) guide.hidden = true;

	// 오버레이 이미지를 data URL로 인라인 (html-to-image 캡처 누락 방지)
	const overlayImgs = [...captureTarget.querySelectorAll('.overlay-layer img')];
	const imgOrigSrcs = overlayImgs.map(img => img.getAttribute('src'));
	await Promise.all(overlayImgs.map(async (img, i) => {
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
		const targetWidth = Number(state.canvasWidth) || 1241;
		const pixelRatio = targetWidth / captureTarget.offsetWidth;
		const dataUrl = await lib.toPng(captureTarget, {
			backgroundColor: '#ffffff',
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
		overlayImgs.forEach((img, i) => { if (imgOrigSrcs[i]) img.src = imgOrigSrcs[i]; });
		if (guide) guide.hidden = false;
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

// ── 리스트 편집 버튼 (인라인 버튼 방식으로 교체됨 — renderEditListInElement 참조) ──
let _listEditButtons = null;
function createListEditButtons() { return null; }
function positionListEditButtons() {}
function bindEditListEvents() {}

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

async function init() {
	componentList.classList.add('is-empty-state');
	try {
		await Promise.all([loadTemplates(), loadIconCategories()]);
		renderComponentList();
	} catch (error) {
		console.error(error);
		showTemplateLoadError(error);
	}

	document.getElementById('clearCanvas').addEventListener('click', clearCanvas);
	document.getElementById('copyMarkup').addEventListener('click', copyMarkup);
	bindFilterEvents();
	KlicBuilderShared.bindSidebarTabs(tab => { state.sidebarTab = tab; });
	previewToggle.addEventListener('click', togglePreview);
	previewReturn.addEventListener('click', returnToCanvas);
	savePreviewImageButton.addEventListener('click', savePreviewImage);
	previewMarkupOpenButton.addEventListener('click', openMarkupFromPreview);
	markupToggle.addEventListener('click', toggleMarkupPanel);
	document.addEventListener('click', event => {
		if (!event.target.closest('[data-canvas-size-menu]')) {
			document.querySelectorAll('[data-canvas-size-menu].is-open').forEach(menu => menu.classList.remove('is-open'));
		}
	});
	document.getElementById('overlayEditToggle')?.addEventListener('click', toggleOverlayEdit);
	document.getElementById('overlayEditDone')?.addEventListener('click', exitOverlayEdit);
	initOverlayLayer();
	initCompactHeader();
	document.getElementById('markupClose').addEventListener('click', closeMarkup);
	document.getElementById('markupBackdrop').addEventListener('click', closeMarkup);
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
	canvasGrid.addEventListener('click', event => {
		if (document.body.classList.contains('preview-mode')) return;
		const addBtn = event.target.closest('.list-row-inline-btn--add[data-el-block-id]');
		if (addBtn) {
			event.stopPropagation();
			addListItem(addBtn.dataset.elBlockId, Number(addBtn.dataset.elColumnIndex), addBtn.dataset.elFieldKey);
			return;
		}
		const removeBtn = event.target.closest('.list-row-inline-btn--remove[data-el-block-id]');
		if (removeBtn) {
			event.stopPropagation();
			deleteListItem(removeBtn.dataset.elBlockId, Number(removeBtn.dataset.elColumnIndex), removeBtn.dataset.elFieldKey);
			return;
		}
	}, true);
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
	document.getElementById('deviceSwitcher').addEventListener('click', e => {
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
}

window.addEventListener('DOMContentLoaded', init);
