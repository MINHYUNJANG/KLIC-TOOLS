// ── 조직도 빌더 (organ.js) ──────────────────────────────────────────────
// 공유 common.js 기반 + 조직도 전용 설정
// templates/organ/ 에서 템플릿 로드
// 연결선은 generateConnectorSVG / updateConnectorSVGs 로 자동 처리

const TEMPLATE_DIR = '/builder/organ/templates/organ/';
const TEMPLATE_MANIFEST = '/builder/organ/templates/organ/manifest.json';
const DESIGN_TEMPLATE_MANIFEST = '/builder/organ/templates/organ/design-template/manifest.json';
const TEMPLATE_FILE_PATTERN = /\.(html|js)$/i;
const loadedTemplateStyles = new Map();
const templateCssText = new Map();
const NO_IMAGE_PATH = '/builder/organ/images/f_logo.png';

const componentTemplates = {};
const ORGAN_TEMPLATE_CATEGORIES = new Set(['box', 'list', 'wing', 'divider']);
let _subBlockQuickPopover = null;

const DESIGN_TEMPLATE_FILTERS = [
	{ id: 'all', label: '전체' },
	{ id: 'school', label: '학교' },
	{ id: 'office', label: '기관' },
];

const state = {
	blocks: [],
	nextBlockId: 1,
	dragPayload: '',
	templateFilter: 'all',
	designTemplateFilter: 'all',
	selectedItem: null,
	overlays: [],
	pageMaxWidth: 0,
	canvasWidth: '1200',
	previewDevice: 'pc',
	connectorStyle: {
		connectorColor: '#888888',
		connectorSize: '1',
		connectorDash: 'solid',
	},
};

function getTemplateCategory(templateId) {
	return componentTemplates[templateId]?.category || '';
}

const canvasGrid       = document.getElementById('canvasGrid');
const canvasPanel      = document.getElementById('canvasPanel');
const optionsPanel     = document.getElementById('optionsPanel');
const markupOutput     = document.getElementById('markupOutput');
const layoutStatus     = document.getElementById('layoutStatus');
const copyState        = document.getElementById('copyState');
const previewToggle    = document.getElementById('previewToggle');
const previewReturn    = document.getElementById('previewReturn');
const savePreviewImageButton   = document.getElementById('savePreviewImage');
const saveFileButton   = document.getElementById('saveFileButton') || document.getElementById('savePdfButton');
const builderRegisterButton = document.getElementById('builderRegisterButton');
const previewMarkupOpenButton  = document.getElementById('previewMarkupOpen');
const markupToggle     = document.getElementById('markupToggle');
const componentList    = document.getElementById('componentList');

// ── 유틸 ──
function escapeHtml(v) {
	return String(v)
		.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
		.replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function formatMultiline(v) { return escapeHtml(v).replace(/\n/g,'<br>'); }
function cloneData(d) { return JSON.parse(JSON.stringify(d)); }

const FONT_SIZES = ['12','13','14','15','16','18','20','22','24'];

// 날개 타입 오른쪽 박스 CSS 오버라이드 규칙 (마크업 생성 시 right-side 분리가 있을 때 추가)
// 폴백은 각 템플릿 기본값으로 고정 — var(--title-*)로 연결하면 왼쪽 변경이 오른쪽에 전파됨
const WING_RIGHT_CSS_OVERRIDES = {
	'wing-001': [
		{ sub: '.organ-right .organ-box',   props: ['background: var(--right-title-bg, #f8f8f8);'] },
		{ sub: '.organ-right .organ-box p', props: ['color: var(--right-title-text, #555555);', 'font-size: var(--right-title-size, 14px);', 'font-weight: var(--right-title-weight, 400);'] },
	],
	'wing-002': [
		{ sub: '.organ-right .organ-box',   props: ['background: var(--right-title-bg, #ffffff);', 'border-color: var(--right-title-border, #cccccc);'] },
		{ sub: '.organ-right .organ-box p', props: ['color: var(--right-title-text, #333333);', 'font-size: var(--right-title-size, 14px);', 'font-weight: var(--right-title-weight, 400);'] },
	],
	'wing-003': [
		{ sub: '.organ-right .organ-box',    props: ['background: var(--right-title-bg, #2a449e);'] },
		{ sub: '.organ-right .organ-title',  props: ['color: var(--right-title-text, #ffffff);', 'font-size: var(--right-title-size, 20px);', 'font-weight: var(--right-title-weight, 700);'] },
		{ sub: '.organ-right .organ-sub',    props: ['color: var(--right-body-text, #c5cdf0);', 'font-size: var(--right-body-size, 12px);', 'font-weight: var(--right-body-weight, 500);'] },
	],
	'wing-004': [
		{ sub: '.organ-right .organ-box',   props: ['background: var(--right-title-bg, #3b9adf);'] },
		{ sub: '.organ-right .organ-box p', props: ['color: var(--right-title-text, #ffffff);', 'font-size: var(--right-title-size, 15px);', 'font-weight: var(--right-title-weight, 600);'] },
	],
	'wing-005': [
		{ sub: '.organ-right .organ-head',   props: ['border-color: var(--right-title-border, #1c3478);'] },
		{ sub: '.organ-right .organ-head p', props: ['color: var(--right-title-text, #1c3478);', 'font-size: var(--right-title-size, 15px);', 'font-weight: var(--right-title-weight, 700);'] },
		{ sub: '.organ-right .organ-body',   props: ['background: var(--right-body-bg, #f5f5f5);'] },
		{ sub: '.organ-right .organ-body p', props: ['color: var(--right-body-text, #333333);', 'font-size: var(--right-body-size, 13px);', 'font-weight: var(--right-body-weight, 400);'] },
	],
	'wing-006': [
		{ sub: '.organ-right .organ-box',   props: ['background: var(--right-title-bg, #ECEDF4);'] },
		{ sub: '.organ-right .organ-box p', props: ['color: var(--right-title-text, #485194);', 'font-size: var(--right-title-size, 14px);', 'font-weight: var(--right-title-weight, 600);'] },
	],
	'wing-007': [
		{ sub: '.organ-right .organ-box',   props: ['background: linear-gradient(to right, var(--right-title-bg, #00b5c8), var(--right-title-bg2, #007fa8));'] },
		{ sub: '.organ-right .organ-box p', props: ['color: var(--right-title-text, #ffffff);', 'font-size: var(--right-title-size, 16px);', 'font-weight: var(--right-title-weight, 700);'] },
	],
	'wing-008': [
		{ sub: '.organ-right .organ-box',   props: ['background: var(--right-title-bg, #2d3d78);'] },
		{ sub: '.organ-right .organ-box p', props: ['color: var(--right-title-text, #ffffff);', 'font-size: var(--right-title-size, 15px);', 'font-weight: var(--right-title-weight, 700);'] },
	],
	'wing-009': [
		{ sub: '.organ-right .organ-box',    props: ['border-color: var(--right-title-border, #1c3478);'] },
		{ sub: '.organ-right .organ-head p', props: ['color: var(--right-title-text, #1c3478);', 'font-size: var(--right-title-size, 15px);', 'font-weight: var(--right-title-weight, 700);'] },
		{ sub: '.organ-right .organ-body',   props: ['background: var(--right-body-bg, #ffffff);'] },
		{ sub: '.organ-right .organ-body p', props: ['color: var(--right-body-text, #1c3478);', 'font-size: var(--right-body-size, 14px);', 'font-weight: var(--right-body-weight, 400);'] },
	],
	'wing-010': [
		{ sub: '.organ-right .organ-box',   props: ['background: var(--right-title-bg, #ffffff);', 'border-color: var(--right-title-border, #4B9FEA);'] },
		{ sub: '.organ-right .organ-box p', props: ['color: var(--right-title-text, #1B6FCC);', 'font-size: var(--right-title-size, 14px);', 'font-weight: var(--right-title-weight, 500);'] },
	],
	'wing-011': [
		{ sub: '.organ-right .organ-head',   props: ['background: var(--right-title-bg, #22C55E);'] },
		{ sub: '.organ-right .organ-head p', props: ['color: var(--right-title-text, #ffffff);', 'font-size: var(--right-title-size, 15px);', 'font-weight: var(--right-title-weight, 700);'] },
		{ sub: '.organ-right .organ-item',   props: ['background: var(--right-body-bg, #ffffff);', 'border-color: var(--right-body-border, #22C55E);', 'color: var(--right-body-text, #374151);', 'font-size: var(--right-body-size, 14px);', 'font-weight: var(--right-body-weight, 400);'] },
	],
};

// 날개 타입 가운데 박스 CSS 오버라이드 규칙 (현재 wing-004 전용)
const WING_CENTER_CSS_OVERRIDES = {
	'wing-004': [
		{ sub: '.organ-center .organ-box',   props: ['background: var(--center-title-bg, #3b9adf);'] },
		{ sub: '.organ-center .organ-box p', props: ['color: var(--center-title-text, #ffffff);', 'font-size: var(--center-title-size, 15px);', 'font-weight: var(--center-title-weight, 600);'] },
	],
};

function createDefaultStyle() {
	return {
		titleBorderColor: '#1d2088',
		titleBackgroundColor: '#1d2088',
		titleTextColor: '#ffffff',
		titleFontWeight: '700',
		bodyBorderColor: '#dfe5ee',
		bodyBackgroundColor: '#ffffff',
		bodyTextColor: '#333333',
		bodyFontWeight: '400',
		connectorColor: '#888888',
		connectorSize: '1',
		connectorDash: 'solid',
		connectorHeight: '50'
	};
}

function getColumnStyle(item) {
	if (!item.style) item.style = createDefaultStyle();
	return item.style;
}

function createDefaultClasses(type) {
	const template = componentTemplates[type];
	if (!template?.classOptions?.length) return {};
	return template.classOptions.reduce((acc, opt) => {
		acc[opt.key] = opt.default || (opt.options?.[0]?.value ?? '');
		return acc;
	}, {});
}

function applyItemClasses(el, item) {
	if (!item.classes) return;
	Object.values(item.classes).forEach(cls => { if (cls) el.classList.add(cls); });
}

function removeClassOptionValues(el, option) {
	if (!option?.options) return;
	option.options.forEach(({ value }) => {
		if (value) el.classList.remove(value);
	});
}

function applyTemplateClassOptions(template, el, item) {
	template.classOptions?.forEach(option => removeClassOptionValues(el, option));
	applyItemClasses(el, item);
}

function columnStyleVars(item) {
	const s = getColumnStyle(item);
	const parts = [
		`--title-border: ${s.titleBorderColor}`,
		s.titleBorderColor2 != null && `--title-border2: ${s.titleBorderColor2}`,
		`--title-bg: ${s.titleBackgroundColor}`,
		s.titleBackgroundColor2 != null && `--title-bg2: ${s.titleBackgroundColor2}`,
		`--title-text: ${s.titleTextColor}`,
		`--title-weight: ${s.titleFontWeight}`,
		`--title-size: ${s.titleFontSize != null ? s.titleFontSize + 'px' : 'initial'}`,
		s.titleMinHeight != null && `--title-height: ${s.titleMinHeight}px`,
		`--body-border: ${s.bodyBorderColor}`,
		`--body-bg: ${s.bodyBackgroundColor}`,
		`--body-text: ${s.bodyTextColor}`,
		`--body-weight: ${s.bodyFontWeight}`,
		`--body-size: ${s.bodyFontSize != null ? s.bodyFontSize + 'px' : 'initial'}`,
		s.bodyMinHeight != null && `--body-height: ${s.bodyMinHeight}px`,
		`--connector-color: ${s.connectorColor}`,
		`--connector-size: ${s.connectorSize}px`,
		`--connector-dash: ${s.connectorDash || 'solid'}`,
		s.connectorHeight != null && `--connector-height: ${s.connectorHeight}px`,
	];
	const sr = item.styleRight;
	if (sr) {
		if (sr.titleBorderColor      != null) parts.push(`--right-title-border: ${sr.titleBorderColor}`);
		if (sr.titleBorderColor2     != null) parts.push(`--right-title-border2: ${sr.titleBorderColor2}`);
		if (sr.titleBackgroundColor  != null) parts.push(`--right-title-bg: ${sr.titleBackgroundColor}`);
		if (sr.titleBackgroundColor2 != null) parts.push(`--right-title-bg2: ${sr.titleBackgroundColor2}`);
		if (sr.titleTextColor        != null) parts.push(`--right-title-text: ${sr.titleTextColor}`);
		if (sr.titleFontWeight       != null) parts.push(`--right-title-weight: ${sr.titleFontWeight}`);
		parts.push(`--right-title-size: ${sr.titleFontSize != null ? sr.titleFontSize + 'px' : 'initial'}`);
		if (sr.titleMinHeight        != null) parts.push(`--right-title-height: ${sr.titleMinHeight}px`);
		if (sr.bodyBorderColor       != null) parts.push(`--right-body-border: ${sr.bodyBorderColor}`);
		if (sr.bodyBackgroundColor   != null) parts.push(`--right-body-bg: ${sr.bodyBackgroundColor}`);
		if (sr.bodyTextColor         != null) parts.push(`--right-body-text: ${sr.bodyTextColor}`);
		if (sr.bodyFontWeight        != null) parts.push(`--right-body-weight: ${sr.bodyFontWeight}`);
		parts.push(`--right-body-size: ${sr.bodyFontSize != null ? sr.bodyFontSize + 'px' : 'initial'}`);
		if (sr.bodyMinHeight         != null) parts.push(`--right-body-height: ${sr.bodyMinHeight}px`);
	}
	const sc = item.styleCenter;
	if (sc) {
		if (sc.titleBackgroundColor  != null) parts.push(`--center-title-bg: ${sc.titleBackgroundColor}`);
		if (sc.titleTextColor        != null) parts.push(`--center-title-text: ${sc.titleTextColor}`);
		if (sc.titleFontWeight       != null) parts.push(`--center-title-weight: ${sc.titleFontWeight}`);
		parts.push(`--center-title-size: ${sc.titleFontSize != null ? sc.titleFontSize + 'px' : 'initial'}`);
		if (sc.titleMinHeight        != null) parts.push(`--center-title-height: ${sc.titleMinHeight}px`);
	}
	return parts.filter(Boolean).join('; ');
}

function buildItemStyle(item) {
	const vars = columnStyleVars(item);
	if (!item.maxWidth) return vars;
	return `${vars};max-width:${item.maxWidth}px`;
}

function toStyleKey(rawKey) {
	return rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function readDefaultStyle(root) {
	return Array.from(root.attributes).reduce((style, attr) => {
		if (!attr.name.startsWith('data-style-')) return style;
		style[toStyleKey(attr.name.replace('data-style-', ''))] = attr.value;
		return style;
	}, {});
}

function setFieldContent(el, value) { el.innerHTML = String(value || ''); }

function stripEditorAttributes(root) {
	Array.from(root.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-'))
			root.removeAttribute(attr.name);
	});
	root.querySelectorAll('[contenteditable]').forEach(e => e.removeAttribute('contenteditable'));
	root.querySelectorAll('[data-block-id]').forEach(e => e.removeAttribute('data-block-id'));
	root.querySelectorAll('[data-column-index]').forEach(e => e.removeAttribute('data-column-index'));
	root.classList.remove('add-row-wrap', 'block-item');
	root.querySelectorAll('.add-row-wrap').forEach(e => e.classList.remove('add-row-wrap'));
	root.querySelectorAll('.block-item').forEach(e => e.classList.remove('block-item'));
}

function renderTemplateElement(template, item, block = null, columnIndex = null, editable = false) {
	const el = template.element.cloneNode(true);
	Array.from(el.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-'))
			el.removeAttribute(attr.name);
	});
	el.querySelectorAll('[data-edit-field]').forEach(field => {
		const fieldName = field.dataset.editField;
		setFieldContent(field, item[fieldName] || '');
		if (editable && block) {
			field.dataset.blockId = block.id;
			field.dataset.columnIndex = String(columnIndex);
			return;
		}
		field.removeAttribute('data-edit-field');
	});
	if (!editable) stripEditorAttributes(el);
	return el;
}

function elementToHtml(el) {
	const w = document.createElement('div');
	w.appendChild(el);
	return w.innerHTML.trim();
}
function htmlToLines(html) { return html.split('\n').map(l => l.trimEnd()); }

function getDefaultData(el) {
	const data = {};
	el.querySelectorAll('[data-edit-field]').forEach(f => { data[f.dataset.editField] = f.innerHTML; });
	return data;
}

function normalizeTemplatePath(path) {
	let normalized;
	if (/^https?:\/\//i.test(path) || path.startsWith('/')) {
		normalized = path;
	} else if (path.startsWith('templates/')) {
		normalized = '/builder/organ/' + path;
	} else {
		normalized = TEMPLATE_DIR + path;
	}
	if (TEMPLATE_FILE_PATTERN.test(normalized)) return normalized;
	return normalized.replace(/\/?$/, '/') + 'index.html';
}

async function discoverTemplatePaths() {
	const [mainPaths, designPaths] = await Promise.all([
		(async () => {
			try {
				const res = await fetch(TEMPLATE_MANIFEST, { cache: 'no-store' });
				if (res.ok) {
					const manifest = await res.json();
					const paths = (Array.isArray(manifest) ? manifest : manifest.templates || [])
						.map(normalizeTemplatePath);
					if (paths.length) return paths;
				}
			} catch (e) {}
			throw new Error(`${TEMPLATE_MANIFEST} 파일을 읽을 수 없습니다.`);
		})(),
		(async () => {
			try {
				const res = await fetch(DESIGN_TEMPLATE_MANIFEST, { cache: 'no-store' });
				if (!res.ok) return [];
				const manifest = await res.json();
				return (Array.isArray(manifest) ? manifest : manifest.templates || [])
					.map(normalizeTemplatePath);
			} catch (e) {
				return [];
			}
		})(),
	]);
	return [...mainPaths, ...designPaths];
}

function getTemplateCssPath(htmlPath)    { return htmlPath.replace(/[^/]+$/, 'style.css'); }
function getTemplateConfigPath(htmlPath) { return htmlPath.replace(/[^/]+$/, 'config.json'); }

async function loadTemplateConfig(htmlPath) {
	try {
		const res = await fetch(getTemplateConfigPath(htmlPath), { cache: 'no-store' });
		if (res.ok) return await res.json();
	} catch (e) {}
	return {};
}

function inferTemplateCategory(htmlPath) {
	if (/\/design-template\//.test(htmlPath)) return 'design-template';
	if (/\/box\//.test(htmlPath)) return 'box';
	if (/\/list\//.test(htmlPath)) return 'list';
	if (/\/wing\//.test(htmlPath)) return 'wing';
	if (/\/divider\//.test(htmlPath)) return 'divider';
	return '';
}

function loadTemplateCss(htmlPath) {
	const cssPath = getTemplateCssPath(htmlPath);
	if (!templateCssText.has(cssPath)) {
		templateCssText.set(cssPath, '');
		fetch(cssPath, { cache: 'no-store' })
			.then(res => res.ok ? res.text() : '')
			.then(text => templateCssText.set(cssPath, text))
			.catch(() => {});
	}
	if (loadedTemplateStyles.has(cssPath)) return loadedTemplateStyles.get(cssPath);
	const promise = new Promise(resolve => {
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = cssPath;
		link.addEventListener('load', resolve, { once: true });
		link.addEventListener('error', resolve, { once: true });
		document.head.appendChild(link);
	});
	loadedTemplateStyles.set(cssPath, promise);
	return promise;
}

async function loadHtmlTemplate(path) {
	const res = await fetch(path, { cache: 'no-store' });
	if (!res.ok) throw new Error(`${path} 파일을 읽을 수 없습니다.`);
	const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
	const el = doc.querySelector('[data-template-id]') || doc.body.firstElementChild;
	if (!el || el.tagName.toLowerCase() !== 'div')
		throw new Error(`${path} 템플릿의 최상위 div가 필요합니다.`);

	const id   = el.dataset.templateId || path.split('/').pop().replace(/\.[^.]+$/, '');
	const name = el.dataset.templateName || id;
	el.dataset.templateId = id;
	const [, config] = await Promise.all([loadTemplateCss(path), loadTemplateConfig(path)]);

	const addRowWrap = el.querySelector('.add-row-wrap') || el;
	const autoDirection = addRowWrap === el ? 'row' : 'column';
	const addDirection  = config.addDirection || autoDirection;
	const isRootWrap    = addRowWrap === el;
	const max           = Number(config.max) || 8;
	const editListEl    = el.querySelector('.edit-list');
	const editListLiTemplate = editListEl ? editListEl.querySelector('li') : null;
	const styleOptions  = config.styleOptions || null;
	const classOptions  = config.classOptions || null;

	return {
		id, name, path, element: el, addRowWrap, isRootWrap, addDirection, max,
		editListLiTemplate, styleOptions, classOptions,
		defaultDashed: 'dashed' in el.dataset,
		category: config.category || inferTemplateCategory(path),
		templateFilters: config.templateFilters || [],
		designSections: config.sections || [],
		getDefaultData:  () => getDefaultData(el),
		getDefaultStyle: () => readDefaultStyle(el),
		render:  (block, item, columnIndex, editable = true) =>
			elementToHtml(renderTemplateElement(componentTemplates[id], item, block, columnIndex, editable)),
		markup:  item => htmlToLines(elementToHtml(renderTemplateElement(componentTemplates[id], item)))
	};
}

async function loadTemplates() {
	const paths = await discoverTemplatePaths();
	for (const path of paths.filter(p => /\.html$/i.test(p))) {
		const t = await loadHtmlTemplate(path);
		componentTemplates[t.id] = t;
	}
}

function renderComponentList() {
	const templates = Object.values(componentTemplates).filter(t => {
		const cat = getTemplateCategory(t.id);
		if (!ORGAN_TEMPLATE_CATEGORIES.has(cat)) return false;
		return state.templateFilter === 'all' || cat === state.templateFilter;
	});

	if (!templates.length) {
		componentList.classList.add('is-empty-state');
		componentList.innerHTML = '<p class="template-empty">해당 필터의 템플릿이 없습니다.</p>';
		return;
	}

	componentList.classList.remove('is-empty-state');
	componentList.innerHTML = templates.map(template => {
		const thumbUrl = template.path.replace(/[^/]+$/, 'screenshot.png');
		return `
		<div class="component-item" draggable="true" data-type="${template.id}">
			<div class="component-thumb">
				<img src="${thumbUrl}" alt="${template.id}" class="component-thumb-img" loading="lazy"
					onerror="this.onerror=null;this.src='${NO_IMAGE_PATH}'">
			</div>
			<button type="button" class="component-add-btn" aria-label="${escapeHtml(template.name || template.id)} 추가">
				<i class="ri-add-line" aria-hidden="true"></i>
			</button>
		</div>`;
	}).join('');
	bindComponentEvents();
}

function bindFilterEvents() {
	KlicBuilderShared.bindFilterEvents({
		onTemplateFilter: filter => {
			state.templateFilter = filter;
			renderComponentList();
		},
		onDesignTemplateFilter: filter => {
			state.designTemplateFilter = filter;
			renderDesignTemplateList();
		}
	});
	KlicBuilderShared.bindScrollableFilters();
}

function switchSidebarTab(tab) {
	KlicBuilderShared.switchSidebarTab(tab);
	if (tab === 'templates') renderDesignTemplateList();
}

function renderDesignTemplateList() {
	const panel = document.getElementById('panelTemplates');
	if (!panel) return;

	// 정적 필터 버튼 active 상태 갱신
	document.querySelectorAll('[data-design-template-filter]').forEach(btn => {
		btn.classList.toggle('is-active', btn.dataset.designTemplateFilter === state.designTemplateFilter);
	});

	const allDesignTemplates = Object.values(componentTemplates).filter(t => t.category === 'design-template');
	const templates = state.designTemplateFilter === 'all'
		? allDesignTemplates
		: allDesignTemplates.filter(t => (t.templateFilters || []).includes(state.designTemplateFilter));

	if (!templates.length) {
		panel.innerHTML = `<p class="template-empty">디자인 템플릿이 없습니다.</p>`;
		return;
	}

	const listHtml = templates.map(t => {
		const thumbUrl = t.path.replace(/[^/]+$/, 'screenshot.png');
		return `
		<div class="component-item" draggable="true" data-type="${escapeHtml(t.id)}" data-is-design-template="true">
			<div class="component-thumb">
				<img src="${thumbUrl}" alt="${escapeHtml(t.name || t.id)}" class="component-thumb-img" loading="lazy"
					onerror="this.onerror=null;this.src='${NO_IMAGE_PATH}'">
			</div>
			<button type="button" class="component-add-btn" aria-label="${escapeHtml(t.name || t.id)} 추가">
				<i class="ri-add-line" aria-hidden="true"></i>
			</button>
		</div>`;
	}).join('');

	panel.innerHTML = `<div class="component-list" id="templateList" aria-label="디자인 템플릿 목록">${listHtml}</div>`;
	bindDesignTemplateItemEvents(panel);
}


function bindDesignTemplateItemEvents(panel) {
	panel.querySelectorAll('[data-is-design-template]').forEach(item => {
		const addBtn = item.querySelector('.component-add-btn');
		if (addBtn) {
			addBtn.addEventListener('click', () => {
				addDesignTemplate(item.dataset.type);
				closeMobileSidebar();
			});
		}
		item.addEventListener('dblclick', () => {
			addDesignTemplate(item.dataset.type);
			closeMobileSidebar();
		});
		item.addEventListener('dragstart', event => {
			state.dragPayload = `new-design-template:${item.dataset.type}`;
			event.dataTransfer.setData('text/plain', state.dragPayload);
			event.dataTransfer.effectAllowed = 'copy';
		});
		item.addEventListener('dragend', () => { state.dragPayload = ''; });
	});
}

// ── SVG 연결선 ──────────────────────────────────────────────────────────────
function generateConnectorSVG(branches, color, thickness, height, dashed = false, gapPx = 0, totalWidthPx = 0) {
	const vbH = Math.max(20, height);
	const mid = vbH / 2;
	const dash = dashed ? ' stroke-dasharray="3 2"' : '';
	const sa = `stroke="${color}" stroke-width="${thickness}" vector-effect="non-scaling-stroke" stroke-linecap="round"${dash}`;

	// 열 중앙 x 좌표 계산 (gap 보정)
	// gap과 totalWidth가 있으면 실제 비율로, 없으면 균등 분할
	function getBranchXs() {
		if (branches <= 1) return [500];
		if (gapPx > 0 && totalWidthPx > 0) {
			const colWidth = (totalWidthPx - (branches - 1) * gapPx) / branches;
			return Array.from({ length: branches }, (_, i) =>
				((colWidth / 2 + i * (colWidth + gapPx)) / totalWidthPx) * 1000
			);
		}
		return Array.from({ length: branches }, (_, i) => (1000 / branches) * (i + 0.5));
	}

	if (branches <= 1) {
		return `<svg viewBox="0 0 1000 ${vbH}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="height:${height}px;display:block;width:100%">
  <line x1="500" y1="0" x2="500" y2="${vbH}" ${sa}/>
</svg>`;
	}

	const xs = getBranchXs();
	const leftX  = xs[0];
	const rightX = xs[xs.length - 1];
	let drops = '';
	xs.forEach(x => {
		drops += `\n  <line class="cn-branch" x1="${x.toFixed(1)}" y1="${mid}" x2="${x.toFixed(1)}" y2="${vbH}" ${sa}/>`;
	});

	return `<svg viewBox="0 0 1000 ${vbH}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="height:${height}px;display:block;width:100%">
  <line class="cn-stem" x1="500" y1="0" x2="500" y2="${mid}" ${sa}/>
  <line class="cn-bar" x1="${leftX.toFixed(1)}" y1="${mid}" x2="${rightX.toFixed(1)}" y2="${mid}" ${sa}/>${drops}
  <line class="cn-stem-full" x1="500" y1="0" x2="500" y2="${vbH}" ${sa}/>
</svg>`;
}

function updateConnectorSVGs() {
	const cs = state.connectorStyle;

	state.blocks.forEach((block, index) => {
		if (getTemplateCategory(block.type) !== 'divider') return;
		const nextBlock = state.blocks[index + 1];
		const nextIsColumnDir = nextBlock && componentTemplates[nextBlock.type]?.addDirection === 'column';
		const branches  = nextBlock && !nextIsColumnDir ? nextBlock.columns : 1;
		const s         = block.items[0]?.style || {};
		const color     = s.connectorColor || cs.connectorColor || '#888888';
		const thickness = parseFloat(s.connectorSize || cs.connectorSize) || 1;
		const height    = parseInt(s.connectorHeight) || 50;
		const section   = document.querySelector(`.builder-block[data-block-id="${block.id}"]`);
		if (!section) return;

		// 다음 블록의 gap과 실제 렌더링 너비 측정
		const gapPx = nextBlock?.gap ?? 0;
		let totalWidthPx = 0;
		if (gapPx > 0 && nextBlock) {
			const nextSection = document.querySelector(`.builder-block[data-block-id="${nextBlock.id}"]`);
			const wrapper = nextSection?.querySelector('.builder-columns, .builder-rows');
			if (wrapper) totalWidthPx = wrapper.getBoundingClientRect().width;
		}

		const connectorEl = section.querySelector('[data-connector]');
		if (connectorEl) {
				const dashed = s.connectorDash === 'dashed';
			connectorEl.innerHTML = generateConnectorSVG(
				branches, color, thickness, height,
				dashed,
				gapPx, totalWidthPx
			);
		}
	});
	updateSubConnectorSVGs();
}

function getSharedConnectorStyle() {
	return {
		color: state.connectorStyle.connectorColor || '#aaaaaa',
		thickness: parseFloat(state.connectorStyle.connectorSize) || 1,
		dashed: state.connectorStyle.connectorDash === 'dashed',
	};
}

function updateConnectorStyle(field, value) {
	state.connectorStyle[field] = value;
	// 마크업 출력용으로 모든 디바이더 아이템 스타일 동기화 (height 제외 — 블록별 개별 조정)
	state.blocks.forEach(block => {
		if (getTemplateCategory(block.type) === 'divider') {
			block.items.forEach(item => { getColumnStyle(item)[field] = value; });
		}
	});
	updateConnectorSVGs();
	updateMarkup();
}

function updateSubConnectorSVGs() {
	const { color, thickness, dashed } = getSharedConnectorStyle();
	document.querySelectorAll('.sub-canvas-connector').forEach(connDiv => {
		const branches = parseInt(connDiv.dataset.branches || '1');
		connDiv.innerHTML = generateSubConnectorSVG(branches, color, thickness, dashed);
	});
}

function generateSubConnectorSVG(branches, color = '#aaaaaa', thickness = 1, dashed = false) {
	const h = 30;
	const mid = h / 2;
	const dash = dashed ? ' stroke-dasharray="3 2"' : '';
	const sa = `stroke="${color}" stroke-width="${thickness}" vector-effect="non-scaling-stroke" stroke-linecap="round"${dash}`;
	// 3개 이상이면 2열로 감싸지므로 커넥터는 2분기로 고정
	const visibleBranches = Math.min(branches, 2);
	if (branches <= 1) {
		return `<svg viewBox="0 0 1000 ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="height:${h}px;display:block;width:100%">
  <line x1="500" y1="0" x2="500" y2="${h}" ${sa}/>
</svg>`;
	}
	const leftX = 1000 / visibleBranches / 2;
	const rightX = 1000 - leftX;
	let drops = '';
	for (let i = 0; i < visibleBranches; i++) {
		const x = (1000 / visibleBranches) * (i + 0.5);
		drops += `\n  <line class="cn-branch" x1="${x.toFixed(1)}" y1="${mid}" x2="${x.toFixed(1)}" y2="${h}" ${sa}/>`;
	}
	return `<svg viewBox="0 0 1000 ${h}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="height:${h}px;display:block;width:100%">
  <line class="cn-stem" x1="500" y1="0" x2="500" y2="${mid}" ${sa}/>
  <line class="cn-bar" x1="${leftX.toFixed(1)}" y1="${mid}" x2="${rightX.toFixed(1)}" y2="${mid}" ${sa}/>${drops}
  <line class="cn-stem-full" x1="500" y1="0" x2="500" y2="${h}" ${sa}/>
</svg>`;
}

function renderSubBlockItemElement(template, item, subBlockId, parentBlockId, parentColumnIndex, columnIndex) {
	const source = template.isRootWrap ? template.element : template.addRowWrap;
	const el = source.cloneNode(true);
	Array.from(el.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-'))
			el.removeAttribute(attr.name);
	});
	el.querySelectorAll('[data-edit-field]').forEach(field => {
		if (template.editListLiTemplate && field.closest('.edit-list')) return;
		setFieldContent(field, item[field.dataset.editField] || '');
		field.dataset.subBlockId = subBlockId;
		field.dataset.parentBlockId = parentBlockId;
		field.dataset.parentColumnIndex = String(parentColumnIndex);
		field.dataset.columnIndex = String(columnIndex);
	});
	if (template.editListLiTemplate) {
		const liTemplate = template.editListLiTemplate;
		el.querySelectorAll('.edit-list').forEach(listEl => {
			const group = listEl.dataset.listGroup || null;
			const pattern = group ? new RegExp(`^${group}_item(\\d+)$`) : /^item(\d+)$/;
			const keys = Object.keys(item)
				.filter(k => pattern.test(k))
				.sort((a, b) => Number(pattern.exec(a)[1]) - Number(pattern.exec(b)[1]));
			listEl.innerHTML = '';
			keys.forEach(key => {
				const li = liTemplate.cloneNode(true);
				li.dataset.editField = key;
				setFieldContent(li, item[key] || '');
				li.dataset.subBlockId = subBlockId;
				li.dataset.parentBlockId = parentBlockId;
				li.dataset.parentColumnIndex = String(parentColumnIndex);
				li.dataset.columnIndex = String(columnIndex);
				li.style.position = 'relative';
				const actions = document.createElement('span');
				actions.className = 'list-row-inline-actions';
				actions.contentEditable = 'false';
				const inlineAdd = document.createElement('button');
				inlineAdd.type = 'button';
				inlineAdd.className = 'list-row-inline-btn list-row-inline-btn--add';
				inlineAdd.setAttribute('aria-label', '항목 추가');
				inlineAdd.setAttribute('contenteditable', 'false');
				inlineAdd.dataset.subBlockId = subBlockId;
				inlineAdd.dataset.parentBlockId = parentBlockId;
				inlineAdd.dataset.parentColumnIndex = String(parentColumnIndex);
				inlineAdd.dataset.columnIndex = String(columnIndex);
				if (group) inlineAdd.dataset.listGroup = group;
				inlineAdd.innerHTML = '<i class="ri-add-line"></i>';
				const inlineRemove = document.createElement('button');
				inlineRemove.type = 'button';
				inlineRemove.className = 'list-row-inline-btn list-row-inline-btn--remove';
				inlineRemove.setAttribute('aria-label', '항목 삭제');
				inlineRemove.setAttribute('contenteditable', 'false');
				inlineRemove.dataset.subBlockId = subBlockId;
				inlineRemove.dataset.parentBlockId = parentBlockId;
				inlineRemove.dataset.parentColumnIndex = String(parentColumnIndex);
				inlineRemove.dataset.columnIndex = String(columnIndex);
				inlineRemove.dataset.subItemKey = key;
				inlineRemove.innerHTML = '<i class="ri-delete-bin-line"></i>';
				actions.appendChild(inlineAdd);
				actions.appendChild(inlineRemove);
				li.appendChild(actions);
				listEl.appendChild(li);
			});
		});
	}
	return el;
}

function renderSubCanvas(subBlocks, parentBlockId, parentColumnIndex, editable = true) {
	const container = document.createElement('div');
	container.className = 'sub-canvas';
	if (editable) {
		container.dataset.parentBlockId = parentBlockId;
		container.dataset.parentColumnIndex = String(parentColumnIndex);
	}
	const connDiv = document.createElement('div');
	connDiv.className = 'sub-canvas-connector';
	connDiv.dataset.branches = subBlocks.length;
	const { color: scColor, thickness: scThickness } = getSharedConnectorStyle();
	connDiv.innerHTML = generateSubConnectorSVG(subBlocks.length, scColor, scThickness);
	container.appendChild(connDiv);
	const row = document.createElement('div');
	row.className = 'sub-canvas-row';
	subBlocks.forEach(subBlock => {
		const template = componentTemplates[subBlock.type];
		if (!template) return;
		const section = document.createElement('section');
		section.className = 'sub-block';
		if (editable) {
			section.dataset.subBlockId = subBlock.id;
			section.dataset.parentBlockId = parentBlockId;
			section.dataset.parentColumnIndex = String(parentColumnIndex);
			const controls = document.createElement('div');
			controls.className = 'sub-block-controls';
			controls.setAttribute('aria-hidden', 'true');
			controls.innerHTML = `<button type="button" class="sub-canvas-add-btn" aria-label="하위 블록 추가" data-parent-block-id="${parentBlockId}" data-parent-column-index="${parentColumnIndex}" data-sub-block-type="${subBlock.type}"><i class="ri-add-line"></i></button><button type="button" class="sub-block-remove-btn" data-remove-sub-block-id="${subBlock.id}" data-parent-block-id="${parentBlockId}" data-parent-column-index="${parentColumnIndex}" aria-label="하위 블록 삭제"><i class="ri-close-line"></i></button>`;
			section.appendChild(controls);
		}
		const columnsClass = template.addDirection === 'row'
			? `builder-columns columns-${subBlock.columns}`
			: `builder-rows rows-${subBlock.columns}`;
		const wrapper = document.createElement('div');
		wrapper.className = columnsClass;
		if (subBlock.gap != null) wrapper.style.setProperty('--block-gap', `${subBlock.gap}px`);
		subBlock.items.forEach((item, idx) => {
			let itemEl;
			if (editable) {
				itemEl = renderSubBlockItemElement(template, item, subBlock.id, parentBlockId, parentColumnIndex, idx);
			} else {
				itemEl = renderAddColumnWrapElement(template, item, null, null, false);
			}
			itemEl.setAttribute('style', buildItemStyle(item));
			itemEl.classList.add(editable ? 'sub-block-item' : 'add-column-wrap');
			if (editable) {
				itemEl.dataset.subBlockId = subBlock.id;
				itemEl.dataset.parentBlockId = parentBlockId;
				itemEl.dataset.parentColumnIndex = String(parentColumnIndex);
				itemEl.dataset.columnIndex = String(idx);
			}
			applyTemplateClassOptions(template, itemEl, item);
			wrapper.appendChild(itemEl);
		});
		section.appendChild(wrapper);
		row.appendChild(section);
	});
	container.appendChild(row);
	return container;
}

// ── 블록 관리 ──
function applyStyleOptionsDefaults(style, styleOptions) {
	['title', 'body'].forEach(target => {
		const fields = styleOptions[target]?.fields;
		if (!fields) return;
		fields.forEach(f => {
			if (!f.key || f.default === undefined) return;
			const sk = `${target}${f.key.charAt(0).toUpperCase()}${f.key.slice(1)}`;
			style[sk] = f.default;
		});
	});
}

function createStyleForType(type) {
	const template = componentTemplates[type];
	const style = {
		...createDefaultStyle(),
		...(template.getDefaultStyle ? template.getDefaultStyle() : {})
	};
	if (template.styleOptions) applyStyleOptionsDefaults(style, template.styleOptions);
	if (template.defaultDashed) style.connectorDash = 'dashed';
	return style;
}

function createBlock(type) {
	const template = componentTemplates[type];
	const defaultData = template.getDefaultData ? template.getDefaultData() : {};
	return {
		id: `block-${state.nextBlockId++}`,
		type,
		columns: 1,
		columnMode: '1',
		marginBottom: 0,
		blockWidth: 0,
		blockAlign: 'center',
		items: [{ ...cloneData(defaultData), style: createStyleForType(type), classes: createDefaultClasses(type) }]
	};
}

function addBlock(type, targetBlockId = null, position = 'after') {
	const block = createBlock(type);
	const targetIndex = targetBlockId ? state.blocks.findIndex(b => b.id === targetBlockId) : -1;
	if (targetIndex >= 0) state.blocks.splice(targetIndex + (position === 'before' ? 0 : 1), 0, block);
	else state.blocks.push(block);
	render();
	const newEl = canvasGrid.querySelector(`[data-block-id="${block.id}"]`);
	if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	selectBlock(block.id);
}

function addDesignTemplate(type, targetBlockId = null, position = 'after') {
	const template = componentTemplates[type];
	const sections = template?.designSections || [];
	if (!sections.length) return;
	const blocks = [];
	for (const section of sections) {
		const sectionType = typeof section === 'string' ? section : section.type;
		if (!componentTemplates[sectionType]) continue;
		const block = createBlock(sectionType);
		if (typeof section === 'object' && section.data && block.items[0]) {
			Object.assign(block.items[0], section.data);
		}
		if (typeof section === 'object' && section.columns) {
			block.columns = Number(section.columns);
			syncBlockItems(block);
		}
		if (typeof section === 'object' && section.blockWidth != null) {
			block.blockWidth = Number(section.blockWidth);
		}
		if (typeof section === 'object' && section.gap != null) {
			block.gap = Number(section.gap);
		}
		if (typeof section === 'object' && section.marginBottom != null) {
			block.marginBottom = Number(section.marginBottom);
		}
		if (typeof section === 'object' && section.style) {
			block.items.forEach(item => Object.assign(item.style, section.style));
		}
		if (typeof section === 'object' && Array.isArray(section.itemStyles)) {
			section.itemStyles.forEach((s, i) => {
				if (s && block.items[i]) Object.assign(block.items[i].style, s);
			});
		}
		if (typeof section === 'object' && Array.isArray(section.itemsData)) {
			section.itemsData.forEach((d, i) => {
				if (d && block.items[i]) Object.assign(block.items[i], d);
			});
		}
		if (typeof section === 'object' && section.classes && block.items[0]) {
			Object.assign(block.items[0].classes, section.classes);
		}
		blocks.push(block);
	}
	if (!blocks.length) return;
	const targetIndex = targetBlockId ? state.blocks.findIndex(b => b.id === targetBlockId) : -1;
	if (targetIndex >= 0) state.blocks.splice(targetIndex + (position === 'before' ? 0 : 1), 0, ...blocks);
	else state.blocks.push(...blocks);
	render();
	const firstBlock = blocks[0];
	const newEl = firstBlock ? canvasGrid.querySelector(`[data-block-id="${firstBlock.id}"]`) : null;
	if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	if (firstBlock) selectBlock(firstBlock.id);
}

function moveBlock(blockId, targetBlockId = null, position = 'after') {
	if (blockId === targetBlockId) return;
	const i = state.blocks.findIndex(b => b.id === blockId);
	if (i < 0) return;
	const [block] = state.blocks.splice(i, 1);
	const ti = targetBlockId ? state.blocks.findIndex(b => b.id === targetBlockId) : -1;
	if (ti >= 0) state.blocks.splice(ti + (position === 'before' ? 0 : 1), 0, block);
	else state.blocks.push(block);
	render();
}

function removeBlock(blockId) {
	if (state.selectedItem?.blockId === blockId) clearOptionsPanel();
	state.blocks = state.blocks.filter(b => b.id !== blockId);
	render();
}

function updateBlockColumns(blockId, count) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	block.columns = Number(count) || 1;
	syncBlockItems(block);
	render();
}

function syncBlockItems(block) {
	const template = componentTemplates[block.type];
	const source = block.items[0] || (template.getDefaultData ? template.getDefaultData() : {});
	while (block.items.length < block.columns) {
		const newItem = { ...cloneData(source), style: createStyleForType(block.type), classes: createDefaultClasses(block.type) };
		delete newItem.subBlocks;
		block.items.push(newItem);
	}
	if (block.items.length > block.columns) block.items = block.items.slice(0, block.columns);
}

function addSubItem(blockId, columnIndex, listGroup) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const item = block.items[columnIndex];
	if (!item) return;
	const prefix = listGroup ? `${listGroup}_item` : 'item';
	const pattern = listGroup ? new RegExp(`^${listGroup}_item(\\d+)$`) : /^item(\d+)$/;
	const maxN = Object.keys(item)
		.reduce((max, k) => { const m = pattern.exec(k); return m ? Math.max(max, Number(m[1])) : max; }, 0);
	item[`${prefix}${maxN + 1}`] = `항목 ${maxN + 1}`;
	render();
	selectBlockItem(blockId, columnIndex);
}

function addSubBlockSubItem(parentBlockId, parentColumnIndex, subBlockId, columnIndex) {
	const block = state.blocks.find(b => b.id === parentBlockId);
	if (!block) return;
	const parentItem = block.items[parentColumnIndex];
	const subBlock = parentItem?.subBlocks?.find(sb => sb.id === subBlockId);
	const item = subBlock?.items[columnIndex];
	if (!item) return;
	const maxN = Object.keys(item)
		.filter(k => /^item\d+$/.test(k))
		.reduce((max, k) => Math.max(max, Number(k.slice(4))), 0);
	item[`item${maxN + 1}`] = `항목 ${maxN + 1}`;
	render();
	selectBlockItem(parentBlockId, parentColumnIndex);
}

function removeSubItem(blockId, columnIndex, key) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const item = block.items[columnIndex];
	if (!item) return;
	const groupMatch = /^(.+)_item\d+$/.exec(key);
	const group = groupMatch ? groupMatch[1] : null;
	const pattern = group ? new RegExp(`^${group}_item\\d+$`) : /^item\d+$/;
	const keys = Object.keys(item).filter(k => pattern.test(k));
	if (keys.length <= 1) return;
	delete item[key];
	render();
	selectBlockItem(blockId, columnIndex);
}

function addSubBlock(blockId, parentColumnIndex, templateType, count = 1) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const item = block.items[parentColumnIndex];
	if (!item) return;
	const template = componentTemplates[templateType];
	if (!template) return;
	if (!item.subBlocks) item.subBlocks = [];
	for (let i = 0; i < Math.max(1, count); i++) {
		const defaultData = template.getDefaultData ? template.getDefaultData() : {};
		item.subBlocks.push({
			id: `sub-${state.nextBlockId++}`,
			type: templateType,
			columns: 1,
			gap: null,
			items: [{ ...cloneData(defaultData), style: createStyleForType(templateType), classes: createDefaultClasses(templateType) }]
		});
	}
	render();
	selectBlockItem(blockId, parentColumnIndex);
}

function removeSubBlockSubItem(parentBlockId, parentColumnIndex, subBlockId, columnIndex, key) {
	const block = state.blocks.find(b => b.id === parentBlockId);
	if (!block) return;
	const parentItem = block.items[parentColumnIndex];
	const subBlock = parentItem?.subBlocks?.find(sb => sb.id === subBlockId);
	const item = subBlock?.items[columnIndex];
	if (!item) return;
	const keys = Object.keys(item).filter(k => /^item\d+$/.test(k));
	if (keys.length <= 1) return;
	delete item[key];
	render();
	selectSubBlockItem(parentBlockId, parentColumnIndex, subBlockId, columnIndex);
}

function removeSubBlock(parentBlockId, parentColumnIndex, subBlockId) {
	const block = state.blocks.find(b => b.id === parentBlockId);
	if (!block) return;
	const item = block.items[parentColumnIndex];
	if (!item?.subBlocks) return;
	item.subBlocks = item.subBlocks.filter(sb => sb.id !== subBlockId);
	if (!item.subBlocks.length) delete item.subBlocks;
	render();
	selectBlockItem(parentBlockId, parentColumnIndex);
}

function getSubBlockQuickPopover() {
	if (_subBlockQuickPopover) return _subBlockQuickPopover;
	_subBlockQuickPopover = document.createElement('div');
	_subBlockQuickPopover.className = 'sub-block-quick-popover';
	_subBlockQuickPopover.innerHTML = `
		<select class="sbq-type-select"><option value="">템플릿 선택</option></select>
		<select class="sbq-count-select">${[1,2,3,4,5,6].map(n => `<option value="${n}">${n}개</option>`).join('')}</select>
		<button type="button" class="sbq-confirm-btn" aria-label="하위 블록 추가"><i class="ri-add-line"></i></button>`;
	document.body.appendChild(_subBlockQuickPopover);
	_subBlockQuickPopover.querySelector('.sbq-confirm-btn').addEventListener('click', () => {
		const type = _subBlockQuickPopover.querySelector('.sbq-type-select').value;
		const count = Number(_subBlockQuickPopover.querySelector('.sbq-count-select').value) || 1;
		if (!type) return;
		addSubBlock(_subBlockQuickPopover.dataset.blockId, Number(_subBlockQuickPopover.dataset.columnIndex), type, count);
		hideSubBlockQuickPopover();
	});
	document.addEventListener('click', event => {
		if (!_subBlockQuickPopover.classList.contains('is-open')) return;
		if (_subBlockQuickPopover.contains(event.target)) return;
		if (event.target.closest('.block-item-add-sub-btn')) return;
		hideSubBlockQuickPopover();
	});
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape') hideSubBlockQuickPopover();
	});
	return _subBlockQuickPopover;
}

function showSubBlockQuickPopover(btn) {
	const popover = getSubBlockQuickPopover();
	const blockId = btn.dataset.blockId;
	const columnIndex = Number(btn.dataset.columnIndex);
	const typeSelect = popover.querySelector('.sbq-type-select');
	typeSelect.innerHTML = '<option value="">하위 블록 선택</option>' +
		Object.values(componentTemplates)
			.filter(t => t.category === 'box' || t.category === 'list')
			.sort((a, b) => a.id.localeCompare(b.id))
			.map(t => `<option value="${t.id}">${escapeHtml(t.id)} ${escapeHtml(t.name)}</option>`)
			.join('');
	const block = state.blocks.find(b => b.id === blockId);
	const item = block?.items[columnIndex];
	if (item?.subBlocks?.length) typeSelect.value = item.subBlocks[item.subBlocks.length - 1].type;
	popover.dataset.blockId = blockId;
	popover.dataset.columnIndex = String(columnIndex);
	popover.classList.add('is-open');
	const rect = btn.getBoundingClientRect();
	const popW = popover.offsetWidth || 280;
	let left = rect.left + rect.width / 2 - popW / 2;
	left = Math.max(8, Math.min(left, window.innerWidth - popW - 8));
	popover.style.top = `${rect.bottom + 6}px`;
	popover.style.left = `${left}px`;
}

function hideSubBlockQuickPopover() {
	_subBlockQuickPopover?.classList.remove('is-open');
}

function updateCanvasSubItem(blockId, columnIndex, key, value) {
	const el = document.querySelector(
		`.block-item[data-block-id="${blockId}"][data-column-index="${columnIndex}"] [data-edit-field="${key}"]`
	);
	if (el) setFieldContent(el, value);
}

async function clearCanvas() {
	if (!state.blocks.length && !state.overlays.length) return;
	const ok = await showConfirmModal({
		title: '캔버스를 초기화할까요?',
		message: '모든 조직도 블록이 삭제됩니다.\n이 작업은 실행취소로 되돌릴 수 없습니다.',
		confirmText: '확인',
		cancelText: '취소'
	});
	if (!ok) return;
	state.blocks = [];
	state.nextBlockId = 1;
	state.dragPayload = '';
	state.overlays = [];
	state.pageMaxWidth = 0;
	renderCanvasPanelUI();
	clearOptionsPanel();
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

// ── 렌더링 ──
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

function blockLayoutStyle(block) {
	const parts = [`margin-bottom:${block.marginBottom || 0}px`];
	const w = block.blockWidth || 0;
	if (w > 0) {
		parts.push(`max-width:${w}px`);
		const a = block.blockAlign || 'center';
		parts.push(`margin-left:${a === 'left' ? '0' : 'auto'}`);
		parts.push(`margin-right:${a === 'right' ? '0' : 'auto'}`);
	}
	return parts.join(';');
}

function applyPageMaxWidth() {
	if (state.previewDevice === 'tablet') {
		canvasGrid.style.maxWidth = '768px';
	} else if (state.previewDevice === 'mobile') {
		canvasGrid.style.maxWidth = '380px';
	} else {
		canvasGrid.style.maxWidth = `${state.canvasWidth}px`;
	}
	canvasGrid.style.marginLeft  = 'auto';
	canvasGrid.style.marginRight = 'auto';
}

function updateCanvasWidth(value) {
	state.canvasWidth = value || '1200';
	document.body.dataset.canvasSize = state.canvasWidth;
	applyPageMaxWidth();
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
	applyPageMaxWidth();
	renderCanvasPanelUI();
	render();
}

function render() {
	const hasBlocks = state.blocks.length > 0;
	layoutStatus.textContent = `${state.blocks.length}개 블록`;
	document.getElementById('builderMain').classList.toggle('has-blocks', hasBlocks);
	canvasGrid.className = hasBlocks ? 'canvas-grid' : 'canvas-grid is-empty';
	applyPageMaxWidth();
	canvasGrid.innerHTML = hasBlocks
		? state.blocks.map(renderBuilderBlock).join('')
		: '<div class="canvas-empty">왼쪽 디자인 블록을 여기로 드래그하세요</div>';
	bindRenderedEvents();
	updateConnectorSVGs();
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

function renderBuilderBlock(block) {
	const template = componentTemplates[block.type];
	const isDivider = getTemplateCategory(block.type) === 'divider';
	return `
		<section class="builder-block${isDivider ? ' builder-block--connector' : ''}" draggable="true" data-block-id="${block.id}" style="${blockLayoutStyle(block)}">
			<div class="block-controls" aria-hidden="true">
				<div class="drag-handle" data-tooltip="이동"><i class="ri-draggable" aria-hidden="true"></i></div>
				<button type="button" class="block-duplicate" data-tooltip="복사" data-duplicate-block-id="${block.id}" aria-label="블록 복사">
					<i class="ri-file-copy-line" aria-hidden="true"></i>
				</button>
				<button type="button" class="block-remove" data-tooltip="삭제" data-remove-block-id="${block.id}" aria-label="블록 삭제">
					<i class="ri-close-line" aria-hidden="true"></i>
				</button>
			</div>
			<div class="${template.addDirection === 'row' ? `builder-columns columns-${block.columns}` : `builder-rows rows-${block.columns}`}"${block.gap != null ? ` style="--block-gap:${block.gap}px"` : ''}>
				${renderRepeatedColumns(block)}
			</div>
		</section>
	`;
}

function renderAddColumnWrapElement(template, item, block, columnIndex, editable) {
	const source = template.isRootWrap ? template.element : template.addRowWrap;
	const el = source.cloneNode(true);
	Array.from(el.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-'))
			el.removeAttribute(attr.name);
	});
	el.querySelectorAll('[data-edit-field]').forEach(field => {
		if (template.editListLiTemplate && field.closest('.edit-list')) return;
		setFieldContent(field, item[field.dataset.editField] || '');
		if (editable && block) {
			field.dataset.blockId = block.id;
			field.dataset.columnIndex = String(columnIndex);
			return;
		}
		field.removeAttribute('data-edit-field');
	});
	if (template.editListLiTemplate) {
		const liTemplate = template.editListLiTemplate;
		el.querySelectorAll('.edit-list').forEach(listEl => {
			const group = listEl.dataset.listGroup || null;
			const pattern = group ? new RegExp(`^${group}_item(\\d+)$`) : /^item(\d+)$/;
			const keys = Object.keys(item)
				.filter(k => pattern.test(k) && item[k])
				.sort((a, b) => Number(pattern.exec(a)[1]) - Number(pattern.exec(b)[1]));
			listEl.innerHTML = '';
			keys.forEach(key => {
				const li = liTemplate.cloneNode(true);
				li.dataset.editField = key;
				setFieldContent(li, item[key] || '');
				if (editable && block) {
					li.dataset.blockId = block.id;
					li.dataset.columnIndex = String(columnIndex);
					li.style.position = 'relative';
					const actions = document.createElement('span');
					actions.className = 'list-row-inline-actions';
					actions.contentEditable = 'false';
					const addBtn = document.createElement('button');
					addBtn.type = 'button';
					addBtn.className = 'list-row-inline-btn list-row-inline-btn--add';
					addBtn.setAttribute('aria-label', '항목 추가');
					addBtn.setAttribute('contenteditable', 'false');
					addBtn.dataset.blockId = block.id;
					addBtn.dataset.columnIndex = String(columnIndex);
					if (group) addBtn.dataset.listGroup = group;
					addBtn.innerHTML = '<i class="ri-add-line"></i>';
					const removeBtn = document.createElement('button');
					removeBtn.type = 'button';
					removeBtn.className = 'list-row-inline-btn list-row-inline-btn--remove';
					removeBtn.setAttribute('aria-label', '항목 삭제');
					removeBtn.setAttribute('contenteditable', 'false');
					removeBtn.dataset.blockId = block.id;
					removeBtn.dataset.columnIndex = String(columnIndex);
					removeBtn.dataset.subItemKey = key;
					removeBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
					actions.appendChild(addBtn);
					actions.appendChild(removeBtn);
					li.appendChild(actions);
				} else {
					li.removeAttribute('data-edit-field');
				}
				listEl.appendChild(li);
			});
		});
	}
	if (!editable) stripEditorAttributes(el);
	return el;
}

function renderRepeatedColumns(block) {
	const template = componentTemplates[block.type];
	if (template.isRootWrap) {
		const itemsHtml = block.items.map((item, idx) => {
			const el = renderAddColumnWrapElement(template, item, block, idx, true);
			el.setAttribute('style', buildItemStyle(item));
			el.style.order = String((idx + 1) * 2 - 1);
			el.classList.add('block-item');
			el.dataset.blockId = block.id;
			el.dataset.columnIndex = String(idx);
			applyTemplateClassOptions(template, el, item);
			return elementToHtml(el);
		}).join('');
		const subCanvasHtml = block.items.map((item, idx) => {
			if (!item.subBlocks?.length) return '';
			const sc = renderSubCanvas(item.subBlocks, block.id, idx, true);
			sc.style.cssText = `grid-column:${idx + 1};grid-row:2;order:${(idx + 1) * 2}`;
			return elementToHtml(sc);
		}).join('');
		return itemsHtml + subCanvasHtml;
	}
	return buildColumnBlock(template, block, true);
}

function buildColumnBlock(template, block, editable) {
	const outer = template.element.cloneNode(true);
	Array.from(outer.attributes).forEach(attr => {
		if (attr.name.startsWith('data-template-') || attr.name.startsWith('data-style-'))
			outer.removeAttribute(attr.name);
	});
	outer.setAttribute('style', buildItemStyle(block.items[0] || {}));
	applyTemplateClassOptions(template, outer, block.items[0] || {});
	if (editable) {
		outer.classList.add('block-item');
		outer.dataset.blockId = block.id;
		outer.dataset.columnIndex = '0';
	} else {
		// 연결선(divider) 블록: 원본 템플릿에는 계산된 SVG가 없으므로,
		// updateConnectorSVGs()가 이미 라이브 캔버스에 그려둔 결과를 그대로 가져와 반영
		// data-connector는 별도 자식이 아니라 divider 루트 요소 자신에 붙는 속성이라 querySelector(self)로는 못 찾으므로
		// [data-block-id][data-connector]로 직접 매칭하고, outer 쪽도 자기 자신/자손 둘 다 확인한다
		const liveConnector = document.querySelector(`[data-block-id="${block.id}"][data-connector]`);
		if (liveConnector) {
			const outerConnector = outer.hasAttribute('data-connector') ? outer : outer.querySelector('[data-connector]');
			if (outerConnector) outerConnector.innerHTML = liveConnector.innerHTML;
		}
	}
	const addRowWrapEl = outer.querySelector('.add-row-wrap');
	if (addRowWrapEl) {
		outer.querySelectorAll('[data-edit-field]').forEach(field => {
			if (addRowWrapEl.contains(field)) return;
			setFieldContent(field, (block.items[0] || {})[field.dataset.editField] || '');
			if (editable) { field.dataset.blockId = block.id; field.dataset.columnIndex = '0'; }
			else field.removeAttribute('data-edit-field');
		});
		const rowContainer = addRowWrapEl.parentElement;
		rowContainer.innerHTML = block.items.map((item, idx) => {
			const el = template.addRowWrap.cloneNode(true);
			el.querySelectorAll('[data-edit-field]').forEach(field => {
				setFieldContent(field, item[field.dataset.editField] || '');
				if (editable) { field.dataset.blockId = block.id; field.dataset.columnIndex = String(idx); }
				else field.removeAttribute('data-edit-field');
			});
			if (!editable) stripEditorAttributes(el);
			return elementToHtml(el);
		}).join('');
	} else {
		outer.querySelectorAll('[data-edit-field]').forEach(field => {
			setFieldContent(field, (block.items[0] || {})[field.dataset.editField] || '');
			if (editable) { field.dataset.blockId = block.id; field.dataset.columnIndex = '0'; }
			else field.removeAttribute('data-edit-field');
		});
	}
	if (!editable) stripEditorAttributes(outer);
	return editable ? elementToHtml(outer) : outer;
}

// ── 드래그앤드롭 ──
function setBlockDropIndicator(block, event) {
	const rect = block.getBoundingClientRect();
	const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
	clearDropIndicators(block);
	block.dataset.dropPosition = position;
	block.classList.add('is-over', `is-over-${position}`);
}
function clearBlockDropIndicator(block) {
	block.classList.remove('is-over', 'is-over-before', 'is-over-after');
	delete block.dataset.dropPosition;
}
function clearDropIndicators(exceptBlock = null) {
	document.querySelectorAll('.builder-block.is-over').forEach(b => {
		if (b !== exceptBlock) clearBlockDropIndicator(b);
	});
	canvasGrid.classList.remove('is-over');
}

function handleCanvasDragOver(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const p = state.dragPayload;
	if (p.startsWith('new-block:') || p.startsWith('existing-block:') || p.startsWith('new-design-template:')) {
		event.preventDefault();
		canvasGrid.classList.add('is-over');
	}
}

function handleCanvasDrop(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
	const targetBlock = event.target.closest('.builder-block');
	const position = targetBlock?.dataset.dropPosition || 'after';
	clearDropIndicators();
	state.dragPayload = '';
	if (payload.startsWith('new-design-template:')) {
		event.preventDefault();
		event.stopPropagation();
		addDesignTemplate(payload.replace('new-design-template:', ''), targetBlock?.dataset.blockId || null, position);
		return;
	}
	if (payload.startsWith('new-block:')) {
		event.preventDefault();
		event.stopPropagation();
		addBlock(payload.replace('new-block:', ''), targetBlock?.dataset.blockId || null, position);
		return;
	}
	if (payload.startsWith('existing-block:')) {
		event.preventDefault();
		event.stopPropagation();
		moveBlock(payload.replace('existing-block:', ''), targetBlock?.dataset.blockId || null, position);
	}
}

function handleBlockDrop(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const payload = state.dragPayload || event.dataTransfer.getData('text/plain');
	if (!payload.startsWith('new-block:') && !payload.startsWith('existing-block:') && !payload.startsWith('new-design-template:')) return;
	event.preventDefault();
	event.stopPropagation();
	const targetBlockId = event.currentTarget.dataset.blockId;
	const position = event.currentTarget.dataset.dropPosition || 'after';
	clearDropIndicators();
	state.dragPayload = '';
	if (payload.startsWith('new-design-template:')) { addDesignTemplate(payload.replace('new-design-template:', ''), targetBlockId, position); return; }
	if (payload.startsWith('new-block:')) { addBlock(payload.replace('new-block:', ''), targetBlockId, position); return; }
	moveBlock(payload.replace('existing-block:', ''), targetBlockId, position);
}

// ── 이벤트 바인딩 ──
// ── 모바일 사이드바 토글 ──
function openMobileSidebar() {
	document.querySelector('.sidebar')?.classList.add('is-mobile-open');
	document.getElementById('sidebarBackdrop')?.classList.add('is-visible');
	const toggle = document.getElementById('sidebarToggle');
	if (toggle) toggle.setAttribute('aria-expanded', 'true');
}

function closeMobileSidebar() {
	document.querySelector('.sidebar')?.classList.remove('is-mobile-open');
	document.getElementById('sidebarBackdrop')?.classList.remove('is-visible');
	const toggle = document.getElementById('sidebarToggle');
	if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function bindComponentEvents() {
	KlicBuilderShared.bindComponentItems({
		canvasGrid,
		getDragPayload: item => `new-block:${item.dataset.type}`,
		onAdd: item => {
			addBlock(item.dataset.type);
			closeMobileSidebar();
		},
		onDragStart: (item, event) => {
			state.dragPayload = `new-block:${item.dataset.type}`;
		},
		onDragEnd: () => { state.dragPayload = ''; }
	});
}

function bindRenderedEvents() {
	document.querySelectorAll('.builder-block').forEach(block => {
		block.addEventListener('dragstart', event => {
			if (document.body.classList.contains('preview-mode')) { event.preventDefault(); return; }
			if (event.target.closest('select,input,button,[contenteditable="true"]')) return;
			state.dragPayload = `existing-block:${block.dataset.blockId}`;
			event.dataTransfer.setData('text/plain', state.dragPayload);
			event.dataTransfer.effectAllowed = 'move';
			requestAnimationFrame(() => block.classList.add('dragging'));
		});
		block.addEventListener('dragover', event => {
			if (document.body.classList.contains('preview-mode')) return;
			const p = state.dragPayload;
			if (p.startsWith('new-block:') || p.startsWith('existing-block:') || p.startsWith('new-design-template:')) {
				event.preventDefault();
				setBlockDropIndicator(block, event);
			}
		});
		block.addEventListener('dragleave', event => { if (!block.contains(event.relatedTarget)) clearBlockDropIndicator(block); });
		block.addEventListener('drop', handleBlockDrop);
		block.addEventListener('dragend', () => { state.dragPayload = ''; block.classList.remove('dragging'); clearDropIndicators(); });
		block.addEventListener('click', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (event.target.closest('[data-remove-block-id],[data-duplicate-block-id]')) return;
			if (event.target.closest('[contenteditable="true"],.block-item')) return;
			selectBlock(block.dataset.blockId);
		});
	});

	document.querySelectorAll('.block-item').forEach(item => {
		item.addEventListener('click', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (event.target.closest('[contenteditable="true"]')) return;
			if (event.target.closest('.block-item-add-sub-btn')) return;
			event.stopPropagation();
			selectBlockItem(item.dataset.blockId, Number(item.dataset.columnIndex));
		});

		const blockId = item.dataset.blockId;
		if (!blockId) return;
		const block = state.blocks.find(b => b.id === blockId);
		if (!block) return;
		const cat = getTemplateCategory(block.type);
		if (cat !== 'box' && cat !== 'list') return;
		const addBtn = document.createElement('button');
		addBtn.type = 'button';
		addBtn.className = 'block-item-add-sub-btn';
		addBtn.setAttribute('aria-label', '하위 블록 추가');
		addBtn.setAttribute('contenteditable', 'false');
		addBtn.dataset.blockId = blockId;
		addBtn.dataset.columnIndex = item.dataset.columnIndex;
		addBtn.innerHTML = '<i class="ri-corner-down-right-line" aria-hidden="true"></i>';
		addBtn.addEventListener('click', event => {
			event.stopPropagation();
			if (_subBlockQuickPopover?.classList.contains('is-open') &&
				_subBlockQuickPopover.dataset.blockId === addBtn.dataset.blockId &&
				_subBlockQuickPopover.dataset.columnIndex === addBtn.dataset.columnIndex) {
				hideSubBlockQuickPopover();
			} else {
				showSubBlockQuickPopover(addBtn);
			}
		});
		item.appendChild(addBtn);
	});
	document.querySelectorAll('[data-remove-block-id]').forEach(btn => {
		btn.addEventListener('click', event => { event.stopPropagation(); removeBlock(btn.dataset.removeBlockId); });
	});
	document.querySelectorAll('[data-duplicate-block-id]').forEach(btn => {
		btn.addEventListener('click', event => { event.stopPropagation(); duplicateBlock(btn.dataset.duplicateBlockId); });
	});
	document.querySelectorAll('[data-edit-field]').forEach(field => {
		field.addEventListener('dblclick', startTextEdit);
	});
	document.querySelectorAll('.sub-block-item').forEach(item => {
		item.addEventListener('click', event => {
			if (document.body.classList.contains('preview-mode')) return;
			if (event.target.closest('[contenteditable="true"]')) return;
			if (event.target.closest('button')) return;
			event.stopPropagation();
			selectSubBlockItem(
				item.dataset.parentBlockId,
				Number(item.dataset.parentColumnIndex),
				item.dataset.subBlockId,
				Number(item.dataset.columnIndex)
			);
		});
	});
	document.querySelectorAll('.list-row-inline-btn--add').forEach(btn => {
		btn.addEventListener('click', event => {
			event.stopPropagation();
			if (btn.dataset.subBlockId) {
				addSubBlockSubItem(btn.dataset.parentBlockId, Number(btn.dataset.parentColumnIndex), btn.dataset.subBlockId, Number(btn.dataset.columnIndex));
			} else {
				addSubItem(btn.dataset.blockId, Number(btn.dataset.columnIndex), btn.dataset.listGroup || null);
			}
		});
	});
	document.querySelectorAll('.list-row-inline-btn--remove').forEach(btn => {
		btn.addEventListener('click', event => {
			event.stopPropagation();
			if (btn.dataset.subBlockId) {
				removeSubBlockSubItem(btn.dataset.parentBlockId, Number(btn.dataset.parentColumnIndex), btn.dataset.subBlockId, Number(btn.dataset.columnIndex), btn.dataset.subItemKey);
			} else {
				removeSubItem(btn.dataset.blockId, Number(btn.dataset.columnIndex), btn.dataset.subItemKey);
			}
		});
	});
	document.querySelectorAll('.sub-block-remove-btn').forEach(btn => {
		btn.addEventListener('click', event => {
			event.stopPropagation();
			removeSubBlock(btn.dataset.parentBlockId, Number(btn.dataset.parentColumnIndex), btn.dataset.removeSubBlockId);
		});
	});
	document.querySelectorAll('.sub-canvas-add-btn').forEach(btn => {
		btn.addEventListener('click', event => {
			event.stopPropagation();
			const type = btn.dataset.subBlockType;
			if (type) addSubBlock(btn.dataset.parentBlockId, Number(btn.dataset.parentColumnIndex), type);
		});
	});
}

function duplicateBlock(blockId) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	const newBlock = { ...cloneData(block), id: `block-${state.nextBlockId++}` };
	const idx = state.blocks.findIndex(b => b.id === blockId);
	state.blocks.splice(idx + 1, 0, newBlock);
	render();
	selectBlock(newBlock.id);
}

// ── 선택 / 옵션 패널 ──
function clearOptionsPanel() {
	state.selectedItem = null;
	document.getElementById('builderMain')?.classList.remove('has-selection');
	document.querySelectorAll('.block-item.is-selected,.builder-block.is-selected')
		.forEach(el => el.classList.remove('is-selected'));
	optionsPanel.innerHTML = `
		<div class="options-panel-empty">
			<i class="ri-cursor-line" aria-hidden="true"></i>
			<p>블록을 클릭하면<br>옵션이 표시됩니다.</p>
		</div>`;
}

function selectBlock(blockId) {
	document.querySelectorAll('.block-item.is-selected,.builder-block.is-selected')
		.forEach(el => el.classList.remove('is-selected'));
	const blockEl = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (blockEl) blockEl.classList.add('is-selected');
	state.selectedItem = { blockId, columnIndex: null };
	document.getElementById('builderMain')?.classList.add('has-selection');
	renderOptionsPanel(blockId, null);
}

function selectBlockItem(blockId, columnIndex) {
	document.querySelectorAll('.block-item.is-selected,.builder-block.is-selected,.sub-block-item.is-selected')
		.forEach(el => el.classList.remove('is-selected'));
	const item = document.querySelector(`.block-item[data-block-id="${blockId}"][data-column-index="${columnIndex}"]`);
	if (item) item.classList.add('is-selected');
	state.selectedItem = { blockId, columnIndex };
	document.getElementById('builderMain')?.classList.add('has-selection');
	renderOptionsPanel(blockId, columnIndex);
}

function updateSubBlockStyle(parentBlockId, parentColumnIndex, subBlockId, subColumnIndex, field, value) {
	const block = state.blocks.find(b => b.id === parentBlockId);
	if (!block) return;
	const subBlock = block.items[parentColumnIndex]?.subBlocks?.find(sb => sb.id === subBlockId);
	const subItem = subBlock?.items[subColumnIndex];
	if (!subItem) return;
	getColumnStyle(subItem)[field] = value;
	const subEl = document.querySelector(
		`.sub-block-item[data-sub-block-id="${subBlockId}"][data-column-index="${subColumnIndex}"]`
	);
	if (subEl) subEl.setAttribute('style', buildItemStyle(subItem));
	updateMarkup();
}

function selectSubBlockItem(parentBlockId, parentColumnIndex, subBlockId, subColumnIndex) {
	document.querySelectorAll('.block-item.is-selected,.builder-block.is-selected,.sub-block-item.is-selected')
		.forEach(el => el.classList.remove('is-selected'));
	const subEl = document.querySelector(
		`.sub-block-item[data-sub-block-id="${subBlockId}"][data-column-index="${subColumnIndex}"]`
	);
	if (subEl) subEl.classList.add('is-selected');
	state.selectedItem = { blockId: parentBlockId, columnIndex: parentColumnIndex };
	document.getElementById('builderMain')?.classList.add('has-selection');
	renderSubBlockOptionsPanel(parentBlockId, parentColumnIndex, subBlockId, subColumnIndex);
}

function renderSubBlockOptionsPanel(parentBlockId, parentColumnIndex, subBlockId, subColumnIndex) {
	const block = state.blocks.find(b => b.id === parentBlockId);
	if (!block) { clearOptionsPanel(); return; }
	const subBlock = block.items[parentColumnIndex]?.subBlocks?.find(sb => sb.id === subBlockId);
	if (!subBlock) { clearOptionsPanel(); return; }
	const subItem = subBlock.items[subColumnIndex];
	if (!subItem) { clearOptionsPanel(); return; }
	const template = componentTemplates[subBlock.type];
	const category = getTemplateCategory(subBlock.type);
	const style = getColumnStyle(subItem);

	// 타이틀/본문 스타일 컨트롤
	let styleSection = '';
	if (category === 'wing') {
		const bodyFields = template.styleOptions?.body?.fields || [];
		const controls = [
			renderSubStyleControls(parentBlockId, parentColumnIndex, subBlockId, subColumnIndex, subBlock.type, style, 'title'),
			bodyFields.length ? renderSubStyleControls(parentBlockId, parentColumnIndex, subBlockId, subColumnIndex, subBlock.type, style, 'body') : ''
		].filter(Boolean).join('');
		styleSection = `
			<strong class="option-group-label">박스 스타일</strong>
			<fieldset class="option-group">${controls}</fieldset>`;
	} else {
		styleSection = `
			<strong class="option-group-label">타이틀</strong>
			<fieldset class="option-group">${renderSubStyleControls(parentBlockId, parentColumnIndex, subBlockId, subColumnIndex, subBlock.type, style, 'title')}</fieldset>
			<strong class="option-group-label">본문</strong>
			<fieldset class="option-group">${renderSubStyleControls(parentBlockId, parentColumnIndex, subBlockId, subColumnIndex, subBlock.type, style, 'body')}</fieldset>`;
	}

	optionsPanel.innerHTML = `
		<div class="options-panel-head">
			<strong>${escapeHtml(template.name || subBlock.type)}</strong>
			<span>하위 블록</span>
		</div>
		<div class="options-panel-groups">
			${styleSection}
		</div>`;

	bindSubStyleFieldEvents(optionsPanel);
}

function renderConnectorControls(block, columnIndex, style) {
	const cs = state.connectorStyle;
	const sizes = [
		{ value: '0.5', label: '가늘게' },
		{ value: '1',   label: '보통' },
		{ value: '2',   label: '굵게' },
		{ value: '3',   label: '더 굵게' }
	];
	const color = style.connectorColor || cs.connectorColor || '#888888';
	const size  = style.connectorSize  || cs.connectorSize  || '1';
	const dash  = style.connectorDash || 'solid';
	const ctx   = `data-block-id="${block.id}" data-column-index="${columnIndex}"`;
	return `
		<label class="style-control" title="색상">
			<span>색상</span>
			<input type="color" value="${color}" data-style-field="connectorColor" ${ctx}>
		</label>
		<label class="style-control" title="굵기">
			<span>굵기</span>
			<select data-style-field="connectorSize" ${ctx}>
				${sizes.map(s => `<option value="${s.value}"${size === s.value ? ' selected' : ''}>${s.label}</option>`).join('')}
			</select>
		</label>
		<label class="style-control" title="선 종류">
			<span>선 종류</span>
			<select data-style-field="connectorDash" ${ctx}>
				<option value="solid"${dash === 'solid' ? ' selected' : ''}>실선</option>
				<option value="dashed"${dash === 'dashed' ? ' selected' : ''}>점선</option>
			</select>
		</label>
		<label class="style-control style-control--wide" title="높이">
			<span>높이</span>
			<div class="options-layout-input">
				<input type="number" min="20" max="300" value="${style.connectorHeight ?? '50'}"
					data-style-field="connectorHeight" data-block-id="${block.id}" data-column-index="${columnIndex}">
				<span>px</span>
			</div>
		</label>`;
}

function renderLineConnectorControls(block, columnIndex, style) {
	const sizes = [
		{ value: '0.5', label: '가늘게' },
		{ value: '1',   label: '보통' },
		{ value: '2',   label: '굵게' },
		{ value: '3',   label: '더 굵게' }
	];
	const dash = style.connectorDash || 'solid';
	const ctx = `data-block-id="${block.id}" data-column-index="${columnIndex}"`;
	return `
		<label class="style-control" title="연결선 색상">
			<span>색상</span>
			<input type="color" value="${style.connectorColor || '#888888'}" data-style-field="connectorColor" ${ctx}>
		</label>
		<label class="style-control" title="연결선 굵기">
			<span>굵기</span>
			<select data-style-field="connectorSize" ${ctx}>
				${sizes.map(s => `<option value="${s.value}"${String(style.connectorSize) === s.value ? ' selected' : ''}>${s.label}</option>`).join('')}
			</select>
		</label>
		<label class="style-control" title="선 종류">
			<span>선 종류</span>
			<select data-style-field="connectorDash" ${ctx}>
				<option value="solid"${dash === 'solid' ? ' selected' : ''}>실선</option>
				<option value="dashed"${dash === 'dashed' ? ' selected' : ''}>점선</option>
			</select>
		</label>`;
}

function renderClassOptionControls(block, columnIndex, item) {
	const template = componentTemplates[block.type];
	if (!template.classOptions?.length || !item) return '';
	return template.classOptions.map(option => {
		const current = item.classes?.[option.key] || option.default || option.options?.[0]?.value || '';
		const label = option.key === 'direction' ? '배치 방향' : (option.label || option.key);
		return `
			<strong class="option-group-label">${label}</strong>
			<div class="option-group-box class-option-box">
				<div class="class-option-segment" role="group" aria-label="${label}">
					${(option.options || []).map(({ value, label }) => {
						const text = option.key === 'direction'
							? ({ left: '왼쪽', right: '오른쪽', both: '양쪽' }[value] || label)
							: label;
						return `<button type="button" class="class-option-btn${current === value ? ' is-active' : ''}"
							data-class-option="${option.key}" data-class-value="${value}"
							data-block-id="${block.id}" data-column-index="${columnIndex}"
							aria-pressed="${current === value ? 'true' : 'false'}">${text}</button>`;
					}).join('')}
				</div>
			</div>`;
	}).join('');
}

function buildStyleControlsHTML(blockType, fieldAttr, ctxAttrs, style, target) {
	const template = componentTemplates[blockType];
	const so     = template.styleOptions?.[target];
	const prefix = target === 'title' ? 'title' : 'body';
	const label  = target === 'title' ? '타이틀' : '본문';
	const fields = so?.fields ?? [
		{ key: 'borderColor',     label: '테두리' },
		{ key: 'backgroundColor', label: '배경' },
		{ key: 'textColor',       label: '글자색' }
	];
	const colorSection = fields.map(f => {
		const sk = `${prefix}${f.key.charAt(0).toUpperCase()}${f.key.slice(1)}`;
		if (f.type === 'number') {
			return `<label class="style-control style-control--wide" title="${label} ${f.label}">
				<span>${f.label}</span>
				<div class="options-layout-input">
					<input type="number" min="${f.min ?? 0}" max="${f.max ?? 300}" value="${style[sk] ?? (f.default ?? '')}"
						${fieldAttr}="${sk}" ${ctxAttrs}>
					<span>px</span>
				</div></label>`;
		}
		return `<label class="style-control" title="${label} ${f.label}">
			<span>${f.label}</span>
			<input type="color" value="${style[sk] || '#000000'}" ${fieldAttr}="${sk}" ${ctxAttrs}>
		</label>`;
	}).join('');
	const fw = style[`${prefix}FontWeight`] || (target === 'title' ? '700' : '400');
	const fs = style[`${prefix}FontSize`] ?? '';
	const fontRow = `
		<div class="style-font-row">
			<label class="style-control" title="${label} 굵기">
				<span>굵기</span>
				<select ${fieldAttr}="${prefix}FontWeight" ${ctxAttrs}>
					<option value="400"${fw==='400'?' selected':''}>R</option>
					<option value="500"${fw==='500'?' selected':''}>M</option>
					<option value="700"${fw==='700'?' selected':''}>B</option>
					<option value="800"${fw==='800'?' selected':''}>E</option>
				</select>
			</label>
			<label class="style-control" title="${label} 사이즈">
				<span>크기</span>
				<select ${fieldAttr}="${prefix}FontSize" ${ctxAttrs}>
					<option value="">-</option>
					${FONT_SIZES.map(s => `<option value="${s}"${fs===s?' selected':''}>${s}</option>`).join('')}
				</select>
			</label>
		</div>`;
	return colorSection + fontRow;
}

function renderStyleControls(block, columnIndex, style, target) {
	return buildStyleControlsHTML(
		block.type,
		'data-style-field',
		`data-block-id="${block.id}" data-column-index="${columnIndex}"`,
		style, target
	);
}

function renderSubStyleControls(parentBlockId, parentColumnIndex, subBlockId, subColumnIndex, subBlockType, style, target) {
	return buildStyleControlsHTML(
		subBlockType,
		'data-sub-style-field',
		`data-parent-block-id="${parentBlockId}" data-parent-column-index="${parentColumnIndex}" data-sub-block-id="${subBlockId}" data-sub-column-index="${subColumnIndex}"`,
		style, target
	);
}

function renderOptionsPanel(blockId, columnIndex) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) { clearOptionsPanel(); return; }
	const template   = componentTemplates[block.type];
	const unit       = template.addDirection === 'row' ? '행' : '열';
	const category   = getTemplateCategory(block.type);
	const isDivider  = category === 'divider';
	const isRowDir   = template.addDirection === 'row';
	const current    = String(block.columns);
	const displayMax = Math.min(template.max, 8);
	const isCustom   = block.columns > 8;
	const optionColumnIndex = columnIndex !== null ? columnIndex : (block.items.length === 1 ? 0 : null);
	const optionItem = optionColumnIndex !== null ? block.items[optionColumnIndex] : null;
	const classOptionSection = optionItem ? renderClassOptionControls(block, optionColumnIndex, optionItem) : '';

	const columnRow = isDivider ? '' : `
		<div class="options-layout-row">
			<span>${unit} 분기수 추가</span>
			<div class="options-column-control">
				<select data-column-mode="${block.id}">
					${Array.from({ length: displayMax }, (_, i) => {
						const val = String(i + 1);
						return `<option value="${val}"${current === val && !isCustom ? ' selected' : ''}>${val}${unit}</option>`;
					}).join('')}
					<option value="custom"${isCustom ? ' selected' : ''}>8개 이상</option>
				</select>
				<input type="number" min="9" value="${isCustom ? current : ''}" class="column-custom-input"${isCustom ? '' : ' hidden'} data-column-mode-custom="${block.id}">
			</div>
		</div>`;

	let styleSection = '';
	if (optionColumnIndex !== null && block.items[optionColumnIndex]) {
		const style = getColumnStyle(block.items[optionColumnIndex]);
		if (isDivider) {
			styleSection = `<strong class="option-group-label">연결선 스타일 (전체 적용)</strong>
				<fieldset class="option-group">${renderConnectorControls(block, optionColumnIndex, style)}</fieldset>`;
		} else if (category === 'wing') {
			const bodyFields = template.styleOptions?.body?.fields || [];
			const leftBoxControls = [
				renderStyleControls(block, optionColumnIndex, style, 'title'),
				bodyFields.length ? renderStyleControls(block, optionColumnIndex, style, 'body') : ''
			].filter(Boolean).join('');
			const sr = optionItem?.styleRight || {};
			const mergedRight = { ...style, ...sr };
			const rightCtxAttrs = `data-block-id="${block.id}" data-column-index="${optionColumnIndex}"`;
			const rightBoxControls = [
				buildStyleControlsHTML(block.type, 'data-right-style-field', rightCtxAttrs, mergedRight, 'title'),
				bodyFields.length ? buildStyleControlsHTML(block.type, 'data-right-style-field', rightCtxAttrs, mergedRight, 'body') : ''
			].filter(Boolean).join('');
			let centerSection = '';
			if (block.type === 'wing-004') {
				const sc = optionItem?.styleCenter || {};
				const mergedCenter = { ...style, ...sc };
				const centerCtxAttrs = `data-block-id="${block.id}" data-column-index="${optionColumnIndex}"`;
				const centerBoxControls = buildStyleControlsHTML(block.type, 'data-center-style-field', centerCtxAttrs, mergedCenter, 'title');
				centerSection = `
				<strong class="option-group-label">가운데 박스</strong>
				<fieldset class="option-group">${centerBoxControls}</fieldset>`;
			}
			styleSection = `
				<strong class="option-group-label">왼쪽 박스</strong>
				<fieldset class="option-group">${leftBoxControls}</fieldset>
				${centerSection}
				<strong class="option-group-label">오른쪽 박스</strong>
				<fieldset class="option-group">${rightBoxControls}</fieldset>
				<strong class="option-group-label">연결선</strong>
				<fieldset class="option-group">${renderLineConnectorControls(block, optionColumnIndex, style)}</fieldset>`;
		} else {
			styleSection = `
				<strong class="option-group-label">타이틀</strong>
				<fieldset class="option-group">${renderStyleControls(block, optionColumnIndex, style, 'title')}</fieldset>
				<strong class="option-group-label">본문</strong>
				<fieldset class="option-group">${renderStyleControls(block, optionColumnIndex, style, 'body')}</fieldset>`;
		}
	}

	const subBlocksSection = '';

	const subItemsSection = '';

	const bw = block.blockWidth || 0;
	const layoutSection = `
		<strong class="option-group-label">블록 설정</strong>
		<div class="option-group-box layout-option-box">
			${columnRow}
			<div class="options-layout-row">
				<span>전체 너비</span>
				<div class="options-layout-input">
					<input type="number" min="0" max="9999" placeholder="자동" value="${bw || ''}" data-width-block-id="${block.id}">
					<span>px</span>
				</div>
			</div>
			${isDivider ? '' : `<div class="options-layout-row">
				<span>분기 간격</span>
				<div class="options-layout-input">
					<input type="number" min="0" max="200" placeholder="기본" value="${block.gap ?? ''}" data-gap-block-id="${block.id}">
					<span>px</span>
				</div>
			</div>`}
			<div class="options-layout-row">
				<span>하단 여백</span>
				<div class="options-layout-input">
					<input type="number" min="0" max="300" value="${block.marginBottom || 0}" data-margin-block-id="${block.id}">
					<span>px</span>
				</div>
			</div>
		</div>`;

	const headSub = columnIndex !== null ? `<span>${columnIndex + 1}${unit}</span>` : '';
	optionsPanel.innerHTML = `
		<div class="options-panel-head">
			<strong>${escapeHtml(block.type)}</strong>${headSub}
		</div>
		<div class="options-panel-groups">
			${layoutSection}
			${subItemsSection}
			${subBlocksSection}
			${classOptionSection}
			${styleSection}
		</div>`;

	bindStyleFieldEvents(optionsPanel);
	bindClassOptionEvents(optionsPanel);
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
			const val = Number(colCustomInput.value);
			if (val >= 9) updateBlockColumns(colCustomInput.dataset.columnModeCustom, val);
		});
	}
	const marginInput = optionsPanel.querySelector('[data-margin-block-id]');
	if (marginInput) marginInput.addEventListener('input', () => updateBlockMargin(marginInput.dataset.marginBlockId, marginInput.value));
	const widthInput = optionsPanel.querySelector('[data-width-block-id]');
	if (widthInput) widthInput.addEventListener('input', () => updateBlockWidth(widthInput.dataset.widthBlockId, widthInput.value));
	const gapInput = optionsPanel.querySelector('[data-gap-block-id]');
	if (gapInput) gapInput.addEventListener('input', () => updateBlockGap(gapInput.dataset.gapBlockId, gapInput.value));
}

function bindStyleFieldEvents(container) {
	container.querySelectorAll('[data-style-field]').forEach(ctrl => {
		const handler = () => updateColumnStyle(ctrl.dataset.blockId, Number(ctrl.dataset.columnIndex), ctrl.dataset.styleField, ctrl.value);
		ctrl.addEventListener('input', handler);
		ctrl.addEventListener('change', handler);
	});
	container.querySelectorAll('[data-right-style-field]').forEach(ctrl => {
		const handler = () => updateRightStyle(ctrl.dataset.blockId, Number(ctrl.dataset.columnIndex), ctrl.dataset.rightStyleField, ctrl.value);
		ctrl.addEventListener('input', handler);
		ctrl.addEventListener('change', handler);
	});
	container.querySelectorAll('[data-center-style-field]').forEach(ctrl => {
		const handler = () => updateCenterStyle(ctrl.dataset.blockId, Number(ctrl.dataset.columnIndex), ctrl.dataset.centerStyleField, ctrl.value);
		ctrl.addEventListener('input', handler);
		ctrl.addEventListener('change', handler);
	});
	container.querySelectorAll('[data-connector-style-field]').forEach(ctrl => {
		const handler = () => updateConnectorStyle(ctrl.dataset.connectorStyleField, ctrl.value);
		ctrl.addEventListener('input', handler);
		ctrl.addEventListener('change', handler);
	});
}

function bindSubStyleFieldEvents(container) {
	container.querySelectorAll('[data-sub-style-field]').forEach(ctrl => {
		const handler = () => updateSubBlockStyle(
			ctrl.dataset.parentBlockId,
			Number(ctrl.dataset.parentColumnIndex),
			ctrl.dataset.subBlockId,
			Number(ctrl.dataset.subColumnIndex),
			ctrl.dataset.subStyleField,
			ctrl.value
		);
		ctrl.addEventListener('input', handler);
		ctrl.addEventListener('change', handler);
	});
}

function bindClassOptionEvents(container) {
	container.querySelectorAll('[data-class-option]').forEach(ctrl => {
		ctrl.addEventListener('click', () => {
			const value = ctrl.dataset.classValue ?? ctrl.value;
			updateItemClassOption(ctrl.dataset.blockId, Number(ctrl.dataset.columnIndex), ctrl.dataset.classOption, value);
			ctrl.parentElement?.querySelectorAll('[data-class-option]').forEach(btn => {
				const isActive = btn === ctrl;
				btn.classList.toggle('is-active', isActive);
				btn.setAttribute('aria-pressed', String(isActive));
			});
		});
	});
}

function updateItemClassOption(blockId, columnIndex, key, value) {
	const block = state.blocks.find(b => b.id === blockId);
	const template = block && componentTemplates[block.type];
	const item = block?.items[columnIndex];
	if (!template || !item) return;
	const option = template.classOptions?.find(opt => opt.key === key);
	if (!option) return;
	if (!item.classes) item.classes = {};
	item.classes[key] = value;

	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	const el = section?.querySelector(`.block-item[data-column-index="${columnIndex}"]`);
	if (el) {
		removeClassOptionValues(el, option);
		if (value) el.classList.add(value);
	}
	updateMarkup();
}

function updateColumnStyle(blockId, columnIndex, field, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !block.items[columnIndex]) return;
	getColumnStyle(block.items[columnIndex])[field] = value;
	updateMarkup();
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (!section) return;
	const items = section.querySelectorAll('.block-item');
	if (items[columnIndex]) items[columnIndex].setAttribute('style', buildItemStyle(block.items[columnIndex]));
	updateConnectorSVGs();
}

function updateRightStyle(blockId, columnIndex, field, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !block.items[columnIndex]) return;
	const item = block.items[columnIndex];
	if (!item.styleRight) item.styleRight = {};
	item.styleRight[field] = value;
	updateMarkup();
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (!section) return;
	const items = section.querySelectorAll('.block-item');
	if (items[columnIndex]) items[columnIndex].setAttribute('style', buildItemStyle(item));
	updateConnectorSVGs();
}

function updateCenterStyle(blockId, columnIndex, field, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block || !block.items[columnIndex]) return;
	const item = block.items[columnIndex];
	if (!item.styleCenter) item.styleCenter = {};
	item.styleCenter[field] = value;
	updateMarkup();
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (!section) return;
	const items = section.querySelectorAll('.block-item');
	if (items[columnIndex]) items[columnIndex].setAttribute('style', buildItemStyle(item));
	updateConnectorSVGs();
}

function updateBlockMargin(blockId, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	block.marginBottom = Math.max(0, Number(value) || 0);
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (section) section.setAttribute('style', blockLayoutStyle(block));
	updateMarkup();
}

function updateBlockWidth(blockId, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	block.blockWidth = Math.max(0, Number(value) || 0);
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	if (section) section.setAttribute('style', blockLayoutStyle(block));
	updateConnectorSVGs();
	updateMarkup();
}

function updateBlockGap(blockId, value) {
	const block = state.blocks.find(b => b.id === blockId);
	if (!block) return;
	block.gap = value === '' ? null : Math.max(0, Number(value) || 0);
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	const wrapper = section?.querySelector('.builder-columns, .builder-rows');
	if (wrapper) {
		if (block.gap != null) wrapper.style.setProperty('--block-gap', `${block.gap}px`);
		else wrapper.style.removeProperty('--block-gap');
	}
	// gap 변경 후 레이아웃이 확정된 다음 프레임에 커넥터 재계산
	requestAnimationFrame(() => {
		updateConnectorSVGs();
		updateMarkup();
	});
}

function updateItemMaxWidth(blockId, columnIndex, value) {
	const block = state.blocks.find(b => b.id === blockId);
	const item = block?.items[columnIndex];
	if (!item) return;
	item.maxWidth = Math.max(0, Number(value) || 0);
	const section = document.querySelector(`.builder-block[data-block-id="${blockId}"]`);
	const el = section?.querySelector(`.block-item[data-column-index="${columnIndex}"]`);
	if (el) el.setAttribute('style', buildItemStyle(item));
	updateConnectorSVGs();
	updateMarkup();
}

// ── 텍스트 편집 ──
let _savedRange = null;
let _savedEditTarget = null;
let _colorPickerOpen = false;

function startTextEdit(event) {
	if (document.body.classList.contains('preview-mode')) return;
	const field = event.currentTarget;
	event.stopPropagation();
	field.setAttribute('contenteditable', 'true');
	field.focus();
	const range = document.createRange();
	range.selectNodeContents(field);
	const sel = window.getSelection();
	sel.removeAllRanges();
	sel.addRange(range);
	field.addEventListener('blur', finishTextEdit, { once: true });
	field.addEventListener('keydown', handleEditKeydown);
}

function handleEditKeydown(event) {
	if (event.key === 'Enter') {
		if (event.altKey) {
			event.preventDefault();
			const sel = window.getSelection();
			if (sel.rangeCount) {
				const range = sel.getRangeAt(0);
				range.deleteContents();
				const br = document.createElement('br');
				range.insertNode(br);
				range.setStartAfter(br);
				range.collapse(true);
				sel.removeAllRanges();
				sel.addRange(range);
			}
		} else {
			event.preventDefault();
			event.currentTarget.blur();
		}
	}
	if (event.key === 'Escape') { event.preventDefault(); render(); }
}

function finishTextEdit(event) {
	if (_colorPickerOpen) { event.currentTarget.addEventListener('blur', finishTextEdit, { once: true }); return; }
	const toolbar = document.getElementById('textFormatToolbar');
	if (toolbar) toolbar.hidden = true;
	const field = event.currentTarget;
	field.removeEventListener('keydown', handleEditKeydown);
	field.removeAttribute('contenteditable');
	const html = field.innerHTML;
	const fieldName = field.dataset.editField;
	if (field.dataset.subBlockId) {
		const parentBlock = state.blocks.find(b => b.id === field.dataset.parentBlockId);
		const parentItem = parentBlock?.items[Number(field.dataset.parentColumnIndex)];
		const subBlock = parentItem?.subBlocks?.find(sb => sb.id === field.dataset.subBlockId);
		const subItem = subBlock?.items[Number(field.dataset.columnIndex)];
		if (subItem) { subItem[fieldName] = html || subItem[fieldName]; render(); }
	} else {
		const block = state.blocks.find(b => b.id === field.dataset.blockId);
		const columnIndex = Number(field.dataset.columnIndex);
		if (!block || !block.items[columnIndex]) return;
		block.items[columnIndex][fieldName] = html || block.items[columnIndex][fieldName];
		render();
	}
}

// ── 마크업 생성 ──
let _currentMarkupTab = 'html';
let _lastFullMarkup   = '';
let _markupTabs       = null;

function splitMarkup(full) {
	const m = full.match(/^(<style>[\s\S]*?<\/style>)\n*/);
	const css  = m ? m[1] : '';
	const html = m ? full.slice(m[0].length) : full;
	return { css, html };
}

function refreshMarkupOutput() {
	if (_markupTabs) _markupTabs.refresh();
	else markupOutput.value = KlicBuilderShared.formatMarkupForTab(_lastFullMarkup, _currentMarkupTab);
}

function updateMarkup() {
	_lastFullMarkup = generateMarkup();
	refreshMarkupOutput();
}

function columnStyleVarsForCSS(item) {
	const s = getColumnStyle(item);
	const parts = [
		`--title-border: ${s.titleBorderColor};`,
		s.titleBorderColor2 != null ? `--title-border2: ${s.titleBorderColor2};` : null,
		`--title-bg: ${s.titleBackgroundColor};`,
		s.titleBackgroundColor2 != null ? `--title-bg2: ${s.titleBackgroundColor2};` : null,
		`--title-text: ${s.titleTextColor};`,
		`--title-weight: ${s.titleFontWeight};`,
		`--title-size: ${s.titleFontSize != null ? s.titleFontSize + 'px' : 'initial'};`,
		s.titleMinHeight != null ? `--title-height: ${s.titleMinHeight}px;` : null,
		`--body-border: ${s.bodyBorderColor};`,
		`--body-bg: ${s.bodyBackgroundColor};`,
		`--body-text: ${s.bodyTextColor};`,
		`--body-weight: ${s.bodyFontWeight};`,
		`--body-size: ${s.bodyFontSize != null ? s.bodyFontSize + 'px' : 'initial'};`,
		s.bodyMinHeight != null ? `--body-height: ${s.bodyMinHeight}px;` : null,
		`--connector-color: ${s.connectorColor};`,
		`--connector-size: ${s.connectorSize}px;`,
		`--connector-dash: ${s.connectorDash || 'solid'};`,
		s.connectorHeight != null ? `--connector-height: ${s.connectorHeight}px;` : null,
	];
	const sr = item.styleRight;
	if (sr) {
		if (sr.titleBorderColor      != null) parts.push(`--right-title-border: ${sr.titleBorderColor};`);
		if (sr.titleBorderColor2     != null) parts.push(`--right-title-border2: ${sr.titleBorderColor2};`);
		if (sr.titleBackgroundColor  != null) parts.push(`--right-title-bg: ${sr.titleBackgroundColor};`);
		if (sr.titleBackgroundColor2 != null) parts.push(`--right-title-bg2: ${sr.titleBackgroundColor2};`);
		if (sr.titleTextColor        != null) parts.push(`--right-title-text: ${sr.titleTextColor};`);
		if (sr.titleFontWeight       != null) parts.push(`--right-title-weight: ${sr.titleFontWeight};`);
		parts.push(`--right-title-size: ${sr.titleFontSize != null ? sr.titleFontSize + 'px' : 'initial'};`);
		if (sr.titleMinHeight        != null) parts.push(`--right-title-height: ${sr.titleMinHeight}px;`);
		if (sr.bodyBorderColor       != null) parts.push(`--right-body-border: ${sr.bodyBorderColor};`);
		if (sr.bodyBackgroundColor   != null) parts.push(`--right-body-bg: ${sr.bodyBackgroundColor};`);
		if (sr.bodyTextColor         != null) parts.push(`--right-body-text: ${sr.bodyTextColor};`);
		if (sr.bodyFontWeight        != null) parts.push(`--right-body-weight: ${sr.bodyFontWeight};`);
		parts.push(`--right-body-size: ${sr.bodyFontSize != null ? sr.bodyFontSize + 'px' : 'initial'};`);
		if (sr.bodyMinHeight         != null) parts.push(`--right-body-height: ${sr.bodyMinHeight}px;`);
	}
	const sc = item.styleCenter;
	if (sc) {
		if (sc.titleBackgroundColor  != null) parts.push(`--center-title-bg: ${sc.titleBackgroundColor};`);
		if (sc.titleTextColor        != null) parts.push(`--center-title-text: ${sc.titleTextColor};`);
		if (sc.titleFontWeight       != null) parts.push(`--center-title-weight: ${sc.titleFontWeight};`);
		parts.push(`--center-title-size: ${sc.titleFontSize != null ? sc.titleFontSize + 'px' : 'initial'};`);
		if (sc.titleMinHeight        != null) parts.push(`--center-title-height: ${sc.titleMinHeight}px;`);
	}
	return parts.filter(Boolean);
}

function stripInlineCssVars(el) {
	[el, ...el.querySelectorAll('[style]')].forEach(node => {
		const s = node.getAttribute('style');
		if (!s) return;
		const kept = s.split(';').map(p => p.trim()).filter(p => p && !p.startsWith('--')).join('; ');
		kept ? node.setAttribute('style', kept) : node.removeAttribute('style');
	});
}

function generateMarkup() {
	if (!state.blocks.length) return '<!-- 조직도 블록을 추가하면 마크업이 생성됩니다. -->';

	// ── 1. 캔버스(#canvasGrid) DOM을 그대로 복제 ──
	// 예전에는 각 블록을 템플릿에서 다시 조립했는데, 그 재조립 로직과 라이브 캔버스 렌더링 로직이
	// 서로 미묘하게 어긋나는 경우(특히 연결선 SVG)가 계속 발생했다.
	// 캔버스에 실제로 그려진 DOM을 그대로 복제해서 편집기 전용 요소만 제거하면 100% 동일한 결과가 보장된다.
	const clone = canvasGrid.cloneNode(true);
	clone.classList.remove('is-empty');

	// ── 2. 사용된 템플릿들의 기본 CSS 수집 (박스 모양 등) ──
	// 서브블록이 몇 단으로 중첩되어 있어도 빠짐없이 잡히도록 블록 트리 전체를 재귀적으로 훑는다
	const usedTemplateIds = new Set();
	const collectTemplateIds = node => {
		if (!node || typeof node !== 'object') return;
		if (typeof node.type === 'string' && componentTemplates[node.type]) {
			usedTemplateIds.add(node.type);
		}
		Object.values(node).forEach(value => {
			if (Array.isArray(value)) value.forEach(collectTemplateIds);
			else if (value && typeof value === 'object') collectTemplateIds(value);
		});
	};
	state.blocks.forEach(collectTemplateIds);
	const templateBaseCss = Array.from(usedTemplateIds)
		.map(id => {
			const tpl = componentTemplates[id];
			if (!tpl || !tpl.path) return '';
			return templateCssText.get(getTemplateCssPath(tpl.path)) || '';
		})
		.filter(Boolean)
		.join('\n\n');

	// 캔버스가 실제로 쓰는 레이아웃 클래스(.builder-columns/.builder-rows/.sub-canvas 등) 기준 구조 CSS.
	// 색상/굵기 등 커스텀 값은 각 요소에 이미 인라인(--title-bg 등)으로 붙어 있으므로 별도 추출 없이 그대로 동작한다.
	const structuralBaseCss = [
		'.block-item, .sub-block-item {display:flex; flex-direction:column; min-width:0; border-radius:8px;}',
		'.builder-columns {display:grid; align-items:stretch; gap:var(--block-gap, 10px); word-break:break-all;}',
		'.builder-columns.columns-1 {grid-template-columns:minmax(0,1fr);}',
		'.builder-columns.columns-2 {grid-template-columns:repeat(2,minmax(0,1fr));}',
		'.builder-columns.columns-3 {grid-template-columns:repeat(3,minmax(0,1fr));}',
		'.builder-columns.columns-4 {grid-template-columns:repeat(4,minmax(0,1fr));}',
		'.builder-columns.columns-5 {grid-template-columns:repeat(5,minmax(0,1fr));}',
		'.builder-columns.columns-6 {grid-template-columns:repeat(6,minmax(0,1fr));}',
		'.builder-rows {display:flex; flex-direction:column; gap:var(--block-gap, 10px);}',
		'.sub-canvas {display:flex; flex-direction:column; align-items:stretch; flex-wrap:wrap; margin-top:calc(-1 * var(--block-gap, 10px));}',
		'.sub-canvas-connector {width:100%;}',
		'.sub-canvas-row {display:flex; flex-wrap:wrap; gap:15px 10px; width:100%;}',
		'.sub-canvas-row > .sub-block {flex:0 1 calc(50% - 5px); min-width:0;}',
		'.sub-block {position:relative; display:flex; flex-direction:column; border-radius:8px;}',
		'.cn-stem-full {display:none;}',
		'@media (max-width: 1024px) and (min-height: 681px) {\n' +
		'\t.sub-canvas .cn-stem, .sub-canvas .cn-bar, .sub-canvas .cn-branch {display:none;}\n' +
		'\t.sub-canvas .cn-stem-full {display:block;}\n' +
		'}',
		'@media (max-width: 1024px) and (min-width: 681px) {\n' +
		'\t.sub-canvas-row > .sub-block {flex:1 1 100%;}\n' +
		'}',
		'@media (max-width: 680px) {\n' +
		'\t.builder-columns, .builder-columns.columns-2, .builder-columns.columns-3, .builder-columns.columns-4, .builder-columns.columns-5, .builder-columns.columns-6 {grid-template-columns:1fr;}\n' +
		'\t.builder-columns {--block-gap:20px !important;}\n' +
		'\t.sub-canvas {grid-column:1!important; grid-row:auto!important;}\n' +
		'\t.cn-stem, .cn-bar, .cn-branch {display:none;}\n' +
		'\t.cn-stem-full {display:block;}\n' +
		'\t.sub-canvas .cn-stem, .sub-canvas .cn-bar, .sub-canvas .cn-branch {display:block;}\n' +
		'\t.sub-canvas .cn-stem-full {display:none;}\n' +
		'}',
		'@media (max-width: 380px) {\n' +
		'\t.sub-canvas-row > .sub-block {flex:1 1 100%;}\n' +
		'\t.sub-canvas .cn-stem, .sub-canvas .cn-bar, .sub-canvas .cn-branch {display:none;}\n' +
		'\t.sub-canvas .cn-stem-full {display:block;}\n' +
		'}'
	].join('\n');

	const combinedCss = [structuralBaseCss, templateBaseCss].filter(Boolean).join('\n\n');
	const styleBlock = combinedCss ? '<style>\n' + combinedCss + '\n</style>' : '';

	// ── 3. 편집기 전용 요소/속성 제거 ──
	clone.querySelectorAll(
		'.block-controls, .sub-block-controls, .list-row-inline-actions, .sub-canvas-add-btn, .sub-block-remove-btn, .block-item-add-sub-btn, .sub-block-li-remove-btn'
	).forEach(el => el.remove());
	clone.querySelectorAll('[draggable]').forEach(el => el.removeAttribute('draggable'));
	[
		'data-block-id', 'data-column-index', 'data-sub-block-id', 'data-parent-block-id',
		'data-parent-column-index', 'data-edit-field', 'data-sub-item-key', 'contenteditable'
	].forEach(attr => {
		clone.querySelectorAll(`[${attr}]`).forEach(el => el.removeAttribute(attr));
	});
	['is-selected', 'is-over', 'is-over-before', 'is-over-after'].forEach(cls => {
		clone.querySelectorAll('.' + cls).forEach(el => el.classList.remove(cls));
	});

	// ── 4. 합치기 ──
	let result = styleBlock ? styleBlock + '\n\n' + clone.innerHTML : clone.innerHTML;
	if (state.pageMaxWidth) {
		result = `<div style="width:100%;max-width:${state.pageMaxWidth}px;margin:0 auto;">\n${result}\n</div>`;
	}
	return stripEditorArtifactsFromMarkup(result);
}

// generateMarkup() 결과에 편집기 전용 요소(항목 추가/삭제 버튼 등)가 어느 경로로든 섞여 들어오는 것을
// 방지하기 위한 최종 안전장치. 개별 렌더 함수의 editable 분기를 다 믿지 않고 마지막에 한 번 더 제거한다.
function stripEditorArtifactsFromMarkup(html) {
	const wrapper = document.createElement('div');
	wrapper.innerHTML = html;
	wrapper.querySelectorAll(
		'.list-row-inline-actions, .sub-block-controls, .block-controls, .block-item-add-sub-btn, .sub-canvas-add-btn, .sub-block-remove-btn'
	).forEach(el => el.remove());
	const editorOnlyAttrs = [
		'contenteditable', 'data-edit-field', 'data-block-id', 'data-column-index',
		'data-sub-block-id', 'data-parent-block-id', 'data-parent-column-index', 'data-sub-item-key'
	];
	editorOnlyAttrs.forEach(attr => {
		wrapper.querySelectorAll(`[${attr}]`).forEach(el => el.removeAttribute(attr));
	});
	// block-item/sub-block-item은 이제 구조 CSS(display:flex 등)가 걸려있는 클래스이므로 제거하지 않는다
	['add-row-wrap', 'add-column-wrap'].forEach(cls => {
		wrapper.querySelectorAll('.' + cls).forEach(el => el.classList.remove(cls));
	});
	return wrapper.innerHTML;
}

// ── 캔버스 패널 ──
function renderCanvasPanelUI() {
	const isDevicePreview = state.previewDevice !== 'pc';
	const sizes = ['1000', '1200', '1400'];

	// 캔버스 크기 선택기 — topbar 내 canvasSizeControl 에 렌더
	const canvasSizeControl = document.getElementById('canvasSizeControl');
	if (canvasSizeControl) {
		canvasSizeControl.innerHTML = `
			<div class="canvas-size-select${isDevicePreview ? ' is-disabled' : ''}" data-canvas-size-menu>
				<button type="button" class="canvas-size-trigger"${isDevicePreview ? ' disabled' : ''} data-canvas-size-trigger>
					<span>캔버스 너비</span>
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
				<p class="canvas-size-disabled-tip">태블릿·모바일 모드에서는<br>설정할 수 없습니다.</p>
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

	canvasPanel.innerHTML = '';
}

// ── 미리보기 / 내보내기 ──
function openMarkup() { KlicBuilderShared.openMarkup(markupToggle); }
function closeMarkup() { KlicBuilderShared.closeMarkup(markupToggle); }
function toggleMarkupPanel() { KlicBuilderShared.toggleMarkupPanel(markupToggle); }

function togglePreview() {
	const isPreview = document.body.classList.toggle('preview-mode');
	previewToggle.setAttribute('aria-pressed', String(isPreview));
	previewToggle.innerHTML = isPreview
		? '<i class="ri-edit-line" aria-hidden="true"></i> 편집하기'
		: '<i class="ri-eye-line" aria-hidden="true"></i> 미리보기';
	render();
}
function returnToCanvas() {
	if (!document.body.classList.contains('preview-mode')) return;
	togglePreview();
}
function openMarkupFromPreview() { openMarkup(); }

function copyMarkup() {
	const text = markupOutput.value;
	copyState.textContent = '';
	KlicBuilderShared.copyText(text, showCopySuccess);
}

function showCopySuccess() {
	copyState.textContent = '마크업이 클립보드에 복사되었습니다.';
	window.setTimeout(() => { copyState.textContent = ''; }, 2200);
}

function registerOrganBuilder() {
	if (!state.blocks.length) { alert('등록할 조직도 블록이 없습니다.'); return; }
	const snapshotData = {
		app: 'klic-organ-builder',
		blocks: state.blocks,
		nextBlockId: state.nextBlockId,
		generatedMarkup: generateMarkup()
	};
	const snapshot = JSON.stringify(snapshotData);
	alert(`전달될 JSON 데이터:\n${JSON.stringify(snapshotData, null, 2)}`);
	if (window.parent && window.parent !== window) {
		window.parent.postMessage({
			type: 'builderHTML',
			builder: 'organ',
			json: snapshot,
			markup: generateMarkup()
		}, '*');
		return;
	}
}

async function savePreviewImage() {
	if (!state.blocks.length) return;
	const lib = window.htmlToImage;
	if (!lib) { alert('이미지 저장 라이브러리를 불러오지 못했습니다.'); return; }
	await document.fonts.ready;

	const btn = savePreviewImageButton;
	btn.disabled = true;

	const captureTarget = document.getElementById('canvasWrapper');
	const canvasGridEl = document.getElementById('canvasGrid');
	if (!captureTarget || !canvasGridEl) {
		alert('이미지 저장 대상 요소를 찾을 수 없습니다.');
		btn.disabled = false;
		return;
	}

	// 뮤테이션 전 원본 인라인 스타일 스냅샷 (finally에서 그대로 복원)
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
		gWidth:    canvasGridEl.style.width,
		gMaxWidth: canvasGridEl.style.maxWidth,
		gGap:      canvasGridEl.style.gap,
	};

	document.body.classList.add('preview-export');

	// 사용자가 선택한 캔버스 폭(state.canvasWidth: 1200/1241/768/380 등) — 값이 없을 때만 기본 1200 사용
	const targetWidth = Number(state.canvasWidth) || 1200;

	// preview-mode min-height:100% 가 preview-export min-height:0 보다 specificity가 높아
	// inline style로 강제 해제해야 블록 높이만 측정됨
	canvasGridEl.style.minHeight = '0';

	// canvas-grid는 CSS상 width:100%라 브라우저 창이 좁으면 설정한 캔버스 폭보다 작게
	// 눌려 렌더링된다. 화면 크기와 무관하게 항상 설정값 그대로 저장되도록 폭을 고정한다.
	canvasGridEl.style.width = `${targetWidth}px`;
	canvasGridEl.style.maxWidth = `${targetWidth}px`;

	// .preview-export .canvas-grid{gap:34px}는 편집 화면(gap 없음)과 달라 조직도 연결선이
	// 그 간격만큼 끊어져 보인다. 높이 측정 전에 먼저 되돌려야 실제 레이아웃대로 측정된다.
	canvasGridEl.style.gap = '0';

	// canvasGrid 실제 크기 측정 (폭·gap 고정 + preview-export CSS 적용 후)
	const gridWidth = canvasGridEl.offsetWidth;
	const gridHeight = canvasGridEl.scrollHeight;

	// DOM 조작 중 레이아웃 변화가 화면에 보이지 않도록 오버레이로 가림
	const captureRect = captureTarget.getBoundingClientRect();
	const coverOverlay = document.createElement('div');
	coverOverlay.style.cssText = `position:fixed;top:${captureRect.top}px;left:${captureRect.left}px;width:${captureRect.width}px;height:${captureRect.height}px;z-index:99999;pointer-events:none;background:#f7f7fa`;
	document.body.appendChild(coverOverlay);

	// canvasWrapper를 canvasGrid와 동일한 크기로 강제 (캡처 영역 = 콘텐츠만)
	captureTarget.style.overflow  = 'visible';
	captureTarget.style.height    = `${gridHeight}px`;
	captureTarget.style.maxHeight = 'none';
	captureTarget.style.width     = `${gridWidth}px`;
	captureTarget.style.maxWidth  = `${gridWidth}px`;
	captureTarget.scrollTop  = 0;
	captureTarget.scrollLeft = 0;
	canvasGridEl.style.margin = '0';

	const guide = captureTarget.querySelector('.canvas-guide');
	if (guide) guide.hidden = true;

	try {
		const pixelRatio = targetWidth / Math.max(1, gridWidth);
		const dataUrl = await lib.toPng(captureTarget, {
			backgroundColor: '#ffffff',
			width: gridWidth,
			height: gridHeight,
			pixelRatio
		});
		const link = document.createElement('a');
		link.href = dataUrl;
		link.download = `org-chart-${Date.now()}.png`;
		link.click();
	} catch (e) {
		console.error(e);
		alert('이미지 저장에 실패했습니다.');
	} finally {
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
		canvasGridEl.style.width = orig.gWidth;
		canvasGridEl.style.maxWidth = orig.gMaxWidth;
		canvasGridEl.style.gap = orig.gGap;
		document.body.classList.remove('preview-export');
		coverOverlay.remove();
		btn.disabled = false;
	}
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

function configureOrganSaveFormats() {
	document.querySelectorAll('input[name="saveFileFormat"]').forEach(input => {
		input.checked = input.value === 'klic';
		input.disabled = input.value === 'klic';
	});
}

function createProjectSnapshot() {
	return {
		schemaVersion: 1,
		app: 'klic-organ-builder',
		savedAt: new Date().toISOString(),
		blocks: cloneData(state.blocks),
		previewDevice: state.previewDevice || 'pc',
		canvasWidth: state.canvasWidth || '1200',
		connectorStyle: cloneData(state.connectorStyle || {}),
		generatedMarkup: generateMarkup()
	};
}

function restoreProjectSnapshot(snapshot) {
	if (!snapshot || !Array.isArray(snapshot.blocks)) {
		throw new Error('Invalid organ builder JSON');
	}
	const blocks = cloneData(snapshot.blocks);
	state.blocks = blocks.filter(block => {
		if (componentTemplates[block.type]) return true;
		console.warn(`지원되지 않는 블록 타입을 건너뜁니다: ${block.type}`);
		return false;
	});
	state.previewDevice = snapshot.previewDevice || 'pc';
	state.canvasWidth = snapshot.canvasWidth || '1200';
	if (snapshot.connectorStyle) state.connectorStyle = cloneData(snapshot.connectorStyle);
	state.selectedItem = null;
	state.dragPayload = '';
	state.nextBlockId = state.blocks.reduce((max, block) => {
		const n = parseInt(String(block.id || '').replace('block-', ''), 10);
		return Number.isNaN(n) ? max : Math.max(max, n + 1);
	}, 1);
	setPreviewDevice(state.previewDevice);
	renderCanvasPanelUI();
	clearOptionsPanel();
	render();
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

function openFileSaveModal() {
	if (!state.blocks.length) { alert('저장할 조직도 블록이 없습니다.'); return; }
	const modal = document.getElementById('saveFileModal');
	if (!modal) return;
	const today = new Date();
	const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
	const nameInput = document.getElementById('saveFileNameInput');
	if (nameInput) nameInput.value = `organ_${dateStr}`;
	configureOrganSaveFormats();
	modal.hidden = false;
	setTimeout(() => {
		if (nameInput) { nameInput.focus(); nameInput.select(); }
	}, 50);
}

function closeFileSaveModal() {
	const modal = document.getElementById('saveFileModal');
	if (modal) modal.hidden = true;
}

async function confirmFileSave() {
	const nameRaw = document.getElementById('saveFileNameInput')?.value.trim();
	const name = nameRaw || 'organ';
	const formats = Array.from(document.querySelectorAll('input[name="saveFileFormat"]:checked')).map(el => el.value);
	if (!formats.length) { alert('저장 형식을 하나 이상 선택하세요.'); return; }

	const btn = document.getElementById('saveFileConfirm');
	const originalHtml = btn?.innerHTML;
	if (btn) {
		btn.disabled = true;
		btn.innerHTML = '<span class="save-btn-spinner"></span> 처리 중...';
	}
	try {
		for (const format of formats) {
			if (format === 'klic') {
				downloadBlob(new Blob([JSON.stringify(createProjectSnapshot(), null, 2)], { type: 'application/json;charset=utf-8' }), `${name}.klic`);
			} else if (format === 'pdf') {
				alert('PDF 저장 기능은 현재 준비 중입니다. .klic 형식으로 저장해주세요.');
			} else if (format === 'html') {
				const fullMarkup = generateMarkup();
				const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(name)}</title>
<link rel="stylesheet" href="/00_common/font/RemixIcon_Fonts_v4.7.0/remixicon.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
</head>
<body>
${fullMarkup}
</body>
</html>`;
				downloadBlob(new Blob([fullHtml], { type: 'text/html;charset=utf-8' }), `${name}.html`);
			}
		}
		closeFileSaveModal();
	} catch (error) {
		console.error(error);
		alert('파일 생성 중 오류가 발생했습니다.');
	} finally {
		if (btn) {
			btn.disabled = false;
			btn.innerHTML = originalHtml;
		}
	}
}

function showTemplateLoadError(error) {
	componentList.innerHTML = `<p class="template-error">${escapeHtml(error.message)}</p>`;
	canvasGrid.innerHTML = '<div class="canvas-empty">템플릿을 불러오지 못했습니다</div>';
}

// ── 인라인 텍스트 포맷 툴바 ──
function createFormatToolbar() {
	const el = document.createElement('div');
	el.id = 'textFormatToolbar';
	el.className = 'text-format-toolbar';
	el.hidden = true;
	el.innerHTML = `
		<button type="button" class="fmt-btn" data-cmd="bold" title="굵게"><b>B</b></button>
		<button type="button" class="fmt-btn" data-cmd="underline" title="밑줄"><u>U</u></button>
		<label class="fmt-color" title="글자색"><input type="color" value="#000000"></label>
		<button type="button" class="fmt-close" title="닫기">×</button>`;
	document.body.appendChild(el);

	const colorInput = el.querySelector('input[type="color"]');
	el.addEventListener('mousedown', e => { if (e.target !== colorInput) e.preventDefault(); saveFormatRange(); });
	el.querySelectorAll('[data-cmd]').forEach(btn => {
		btn.addEventListener('click', () => { restoreFormatRange(); document.execCommand(btn.dataset.cmd); });
	});
	colorInput.addEventListener('mousedown', () => { _colorPickerOpen = true; saveFormatRange(); });
	colorInput.addEventListener('input', () => { restoreFormatRange(); document.execCommand('foreColor', false, colorInput.value); });
	colorInput.addEventListener('change', () => { _colorPickerOpen = false; });
	el.querySelector('.fmt-close').addEventListener('click', () => { el.hidden = true; _colorPickerOpen = false; });
	return el;
}

function saveFormatRange() {
	const sel = window.getSelection();
	if (sel?.rangeCount > 0) {
		_savedRange = sel.getRangeAt(0).cloneRange();
		_savedEditTarget = sel.anchorNode?.parentElement?.closest('[contenteditable="true"]') || null;
	} else { _savedRange = null; _savedEditTarget = null; }
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
	const tw = toolbar.offsetWidth, th = toolbar.offsetHeight;
	let left = rect.left + rect.width / 2 - tw / 2;
	let top  = rect.top - th - 8;
	if (top < 4) top = rect.bottom + 8;
	left = Math.max(4, Math.min(left, window.innerWidth - tw - 4));
	top  = Math.max(4, Math.min(top,  window.innerHeight - th - 4));
	toolbar.style.left = `${left}px`;
	toolbar.style.top  = `${top}px`;
}
function initFormatToolbar() {
	const toolbar = createFormatToolbar();
	document.addEventListener('selectionchange', () => {
		if (document.body.classList.contains('preview-mode')) return;
		const sel = window.getSelection();
		if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
		const anchor = sel.anchorNode?.parentElement?.closest('[contenteditable="true"]');
		if (!anchor) { toolbar.hidden = true; return; }
		saveFormatRange();
		positionFormatToolbar(toolbar, sel.getRangeAt(0).getBoundingClientRect());
	});
}

// ── init ──
async function init() {
	componentList.classList.add('is-empty-state');
	try {
		await loadTemplates();
		renderComponentList();
		renderDesignTemplateList();
	} catch (error) {
		console.error(error);
		showTemplateLoadError(error);
	}

	KlicBuilderShared.bindClearCanvas(clearCanvas);
	KlicBuilderShared.bindOptionsPanelClose(clearOptionsPanel, optionsPanel);
	document.getElementById('copyMarkup')?.addEventListener('click', copyMarkup);

	bindFilterEvents();
	KlicBuilderShared.bindSidebarTabs(switchSidebarTab);
	previewToggle?.addEventListener('click', togglePreview);
	previewReturn?.addEventListener('click', returnToCanvas);
	savePreviewImageButton?.addEventListener('click', savePreviewImage);
	builderRegisterButton?.addEventListener('click', registerOrganBuilder);
	if (saveFileButton) {
		window.__builderSaveFileOpenBound = true;
		saveFileButton.addEventListener('click', openFileSaveModal);
	}
	document.getElementById('saveFileClose')?.addEventListener('click', closeFileSaveModal);
	document.getElementById('saveFileCancel')?.addEventListener('click', closeFileSaveModal);
	document.getElementById('saveFileBackdrop')?.addEventListener('click', closeFileSaveModal);
	document.getElementById('saveFileConfirm')?.addEventListener('click', confirmFileSave);
	bindLoadKlic();
	previewMarkupOpenButton?.addEventListener('click', openMarkupFromPreview);
	markupToggle?.addEventListener('click', toggleMarkupPanel);
	renderCanvasPanelUI();
	clearOptionsPanel();
	document.body.dataset.canvasSize = state.canvasWidth;
	document.body.dataset.previewDevice = state.previewDevice;
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
	document.addEventListener('click', e => {
		if (!e.target.closest('[data-canvas-size-menu]')) {
			document.querySelectorAll('[data-canvas-size-menu].is-open').forEach(m => m.classList.remove('is-open'));
		}
	});
	document.getElementById('markupClose')?.addEventListener('click', closeMarkup);
	document.getElementById('markupBackdrop')?.addEventListener('click', closeMarkup);
	_markupTabs = KlicBuilderShared.bindMarkupTabs({
		output: markupOutput,
		getMarkup: () => _lastFullMarkup,
		onChange: tab => { _currentMarkupTab = tab; }
	});
	document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMarkup(); });

	// 모바일 사이드바 토글
	document.getElementById('sidebarToggle')?.addEventListener('click', () => {
		const sidebar = document.querySelector('.sidebar');
		if (sidebar?.classList.contains('is-mobile-open')) {
			closeMobileSidebar();
		} else {
			openMobileSidebar();
		}
	});
	document.getElementById('sidebarBackdrop')?.addEventListener('click', closeMobileSidebar);

	// 캔버스 빈 영역 클릭 시 옵션창 유지
	canvasGrid.addEventListener('dragleave', event => {
		if (!canvasGrid.contains(event.relatedTarget)) canvasGrid.classList.remove('is-over');
	});
	const canvasWrapper = document.getElementById('canvasWrapper');
	KlicBuilderShared.bindCanvasDropTargets({ canvasGrid, canvasWrapper, onDragOver: handleCanvasDragOver, onDrop: handleCanvasDrop });

	initFormatToolbar();
	initGuidedTour();
	render();
}

// ── 도움말 투어 ──
const ORGAN_TOUR_STEPS = [
	{
		target: '.sidebar',
		title: '조직도 블록 선택',
		desc: '상단 필터에서 원하는 유형(기본형·부서형·좌우형·연결선)을 고른 뒤 블록 카드를 캔버스로 드래그하세요.',
		position: 'right'
	},
	{
		target: '.workspace',
		title: '캔버스에 배치',
		desc: '작업 영역에 블록을 놓으면 조직도가 추가됩니다. 배치된 블록은 다시 드래그해 순서를 바꿀 수 있습니다.',
		position: 'left'
	},
	{
		target: '.builder-block',
		title: '블록 편집 컨트롤',
		desc: '<ul class="tour-ctrl-list"><li><i class="ri-settings-3-line"></i> <b>속성</b> 블록 스타일을 편집합니다.</li><li><i class="ri-file-copy-line"></i> <b>복사</b> 블록을 복제합니다.</li><li><i class="ri-close-line"></i> <b>삭제</b> 블록을 제거합니다.</li></ul>',
		position: 'bottom'
	},
	{
		target: '.right-col',
		title: '스타일 옵션 패널',
		desc: '블록을 클릭하면 오른쪽 패널에서 타이틀·본문 색상, 폰트 크기, 연결선 스타일 등을 실시간으로 편집할 수 있습니다.',
		position: 'left'
	}
];

function initGuidedTour() {
	KlicBuilderShared.initGuidedTour({
		steps: ORGAN_TOUR_STEPS,
		beforeStep: index => {
			if (index !== 1 || state.blocks.length !== 0) return;
			const templateIds = Object.keys(componentTemplates);
			const boxId = templateIds.find(id => componentTemplates[id].category === 'box');
			if (boxId) { state.blocks.push(createBlock(boxId)); render(); }
		}
	});
}

window.addEventListener('DOMContentLoaded', () => {
	init();
	if (window.parent !== window) {
		window.parent.postMessage({ type: 'builderReady' }, '*');
	}
});

window.getBuilderSnapshot = function() {
	return JSON.stringify({
		app: 'klic-organ-builder',
		blocks: state.blocks,
		nextBlockId: state.nextBlockId,
		generatedMarkup: generateMarkup()
	});
};

window.addEventListener('message', function(e) {
	if (e.data && e.data.type === 'loadBuilderSnapshot' && e.data.json) {
		try {
			const snap = JSON.parse(e.data.json);
			if (snap.blocks) { state.blocks = snap.blocks; state.nextBlockId = snap.nextBlockId || state.nextBlockId; render(); }
		} catch(err) { console.error('빌더 스냅샷 복원 실패:', err); }
	}
});

