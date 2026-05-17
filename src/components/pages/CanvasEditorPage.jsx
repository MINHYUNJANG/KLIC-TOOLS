import { useEffect, useRef, useState } from 'react';
import CANVAS_TEMPLATES from '../../templates/canvas';

const DEFAULT_SIZE = { width: 800, height: 600 };
const RESIZE_HANDLE_SIZE = 12;
const DELETE_BUTTON_SIZE = 22;
const FONT_OPTIONS = ['Pretendard', 'Arial', 'Georgia', 'Times New Roman', 'monospace', 'serif'];
const ICON_OPTIONS = [
  { value: '⭐', label: '스타' },
  { value: '🔥', label: '불꽃' },
  { value: '❤️', label: '하트' },
  { value: '🎵', label: '음표' },
  { value: '🌟', label: '별빛' },
  { value: '🎯', label: '목표' },
  { value: '🎉', label: '축하' },
  { value: '✅', label: '체크' },
  { value: '💡', label: '아이디어' },
];
const MARKUP_CATEGORIES = [
  { value: 'list', label: '리스트' },
  { value: 'table', label: '테이블' },
  { value: 'process', label: '절차' },
  { value: 'box', label: '박스' },
];
const CANVAS_TEMPLATE_CATEGORIES = [
  { value: 'all', label: '전체' },
  { value: 'newsletter', label: '가정통신문' },
  { value: 'visual', label: '비주얼' },
  { value: 'popup', label: '팝업' },
  { value: 'banner', label: '배너' },
  { value: 'document', label: '문서' },
];
const MARKUP_TEMPLATES = {
  list: [
    {
      id: 'list-basic',
      label: '기본 목록',
      preview: 'list-basic',
      html: '<ul class="notice-list">\n  <li>첫 번째 안내 항목</li>\n  <li>두 번째 안내 항목</li>\n  <li>세 번째 안내 항목</li>\n</ul>',
    },
    {
      id: 'list-check',
      label: '체크 목록',
      preview: 'list-check',
      html: '<ul class="check-list">\n  <li>신청서 제출</li>\n  <li>담당자 확인</li>\n  <li>결과 안내</li>\n</ul>',
    },
  ],
  table: [
    {
      id: 'table-basic',
      label: '기본 표',
      preview: 'table-basic',
      html: '<table class="info-table">\n  <thead><tr><th>구분</th><th>내용</th></tr></thead>\n  <tbody>\n    <tr><td>일시</td><td>2026. 05. 16.</td></tr>\n    <tr><td>장소</td><td>강당</td></tr>\n  </tbody>\n</table>',
    },
    {
      id: 'table-schedule',
      label: '일정 표',
      preview: 'table-schedule',
      html: '<table class="schedule-table">\n  <tr><th>시간</th><th>프로그램</th></tr>\n  <tr><td>10:00</td><td>접수</td></tr>\n  <tr><td>10:30</td><td>행사 시작</td></tr>\n</table>',
    },
  ],
  process: [
    {
      id: 'process-steps',
      label: '3단계 절차',
      preview: 'process-steps',
      html: '<ol class="step-list">\n  <li>1단계: 신청</li>\n  <li>2단계: 확인</li>\n  <li>3단계: 완료</li>\n</ol>',
    },
    {
      id: 'process-flow',
      label: '진행 흐름',
      preview: 'process-flow',
      html: '<div class="process-flow">\n  <span>접수</span>\n  <span>검토</span>\n  <span>안내</span>\n</div>',
    },
  ],
  box: [
    {
      id: 'box-notice',
      label: '공지 박스',
      preview: 'box-notice',
      html: '<div class="notice-box">\n  <strong>알림</strong>\n  <p>중요한 안내 내용을 입력하세요.</p>\n</div>',
    },
    {
      id: 'box-highlight',
      label: '강조 박스',
      preview: 'box-highlight',
      html: '<div class="highlight-box">\n  <strong>확인해주세요</strong>\n  <p>가정통신문 또는 팝업에 들어갈 핵심 문구를 입력하세요.</p>\n</div>',
    },
  ],
};
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHexColor(value) {
  const text = String(value || '').trim();
  const match = text.match(/^#?([0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1];
  return `#${hex.toLowerCase()}`;
}

function sanitizeHexColorInput(value) {
  const hex = String(value || '').replace(/[^0-9a-f]/gi, '').slice(0, 6).toLowerCase();
  return `#${hex}`;
}

function hexToRgb(hex) {
  const color = normalizeHexColor(hex);
  if (!color) return null;
  return {
    r: parseInt(color.slice(1, 3), 16),
    g: parseInt(color.slice(3, 5), 16),
    b: parseInt(color.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map(value => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: lightness };
  }

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  if (max === green) hue = (blue - red) / delta + 2;
  if (max === blue) hue = (red - green) / delta + 4;
  return { h: hue / 6, s: saturation, l: lightness };
}

function hslToRgb({ h, s, l }) {
  if (s === 0) {
    const value = l * 255;
    return { r: value, g: value, b: value };
  }

  const hueToRgb = (p, q, t) => {
    let nextT = t;
    if (nextT < 0) nextT += 1;
    if (nextT > 1) nextT -= 1;
    if (nextT < 1 / 6) return p + (q - p) * 6 * nextT;
    if (nextT < 1 / 2) return q;
    if (nextT < 2 / 3) return p + (q - p) * (2 / 3 - nextT) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hueToRgb(p, q, h + 1 / 3) * 255,
    g: hueToRgb(p, q, h) * 255,
    b: hueToRgb(p, q, h - 1 / 3) * 255,
  };
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb) : null;
}

function hslToHex(hsl) {
  return rgbToHex(hslToRgb(hsl));
}

function isRecolorableHsl(hsl) {
  return hsl && hsl.s >= 0.12 && hsl.l > 0.08 && hsl.l < 0.96;
}

function getHtmlPaletteColors(html) {
  const matches = String(html || '').match(/#[0-9a-f]{6}\b/gi) || [];
  return [...new Set(matches.map(color => normalizeHexColor(color)).filter(Boolean))];
}

function inferMarkupPaletteColor(html) {
  const palette = getHtmlPaletteColors(html)
    .map(color => ({ color, hsl: hexToHsl(color) }))
    .filter(({ hsl }) => isRecolorableHsl(hsl))
    .sort((a, b) => (b.hsl.s * (1 - Math.abs(b.hsl.l - 0.5))) - (a.hsl.s * (1 - Math.abs(a.hsl.l - 0.5))));
  return palette[0]?.color || '#0070c8';
}

function recolorHexForPalette(hex, targetColor) {
  const sourceHsl = hexToHsl(hex);
  const targetHsl = hexToHsl(targetColor);
  if (!isRecolorableHsl(sourceHsl) || !targetHsl) return normalizeHexColor(hex) || hex;

  const saturation = clamp(sourceHsl.s * 0.35 + targetHsl.s * 0.65, 0.14, 0.9);
  const lightness = clamp(sourceHsl.l, 0.12, 0.93);
  return hslToHex({ h: targetHsl.h, s: saturation, l: lightness });
}

function recolorMarkupHtml(html, targetColor) {
  return String(html || '').replace(/#[0-9a-f]{6}\b/gi, color => recolorHexForPalette(color, targetColor));
}

function mixHexColor(color, mixColor, amount) {
  const base = hexToRgb(color);
  const mix = hexToRgb(mixColor);
  if (!base || !mix) return color;
  return rgbToHex({
    r: base.r + (mix.r - base.r) * amount,
    g: base.g + (mix.g - base.g) * amount,
    b: base.b + (mix.b - base.b) * amount,
  });
}

function getMarkupPaletteVars(color) {
  const base = normalizeHexColor(color) || '#0070c8';
  return {
    '--markup-primary': base,
    '--markup-primary-soft': mixHexColor(base, '#ffffff', 0.84),
    '--markup-primary-tint': mixHexColor(base, '#ffffff', 0.93),
    '--markup-border': mixHexColor(base, '#64748b', 0.72),
  };
}

function getMarkupPaletteStyleText(color) {
  return Object.entries(getMarkupPaletteVars(color))
    .map(([name, value]) => `${name}:${value}`)
    .join(';');
}

function getMarkupPaletteClass(item) {
  return `klic-palette-${String(item?.id || 'default').replace(/[^a-z0-9_-]/gi, '').slice(0, 12) || 'default'}`;
}

function getMarkupPaletteCss(color, className) {
  const vars = getMarkupPaletteStyleText(color);
  return `.${className}{${vars}}`;
}

function getMarkupDisplayHtml(item) {
  if (!item) return '';
  return recolorMarkupHtml(item.html, item.paletteColor || inferMarkupPaletteColor(item.html));
}

function getFont(item) {
  const style = item.italic ? 'italic' : 'normal';
  const weight = item.bold ? '700' : '400';
  const family = ['serif', 'monospace'].includes(item.font) ? item.font : `"${item.font || 'Pretendard'}", sans-serif`;
  return `${style} ${weight} ${item.size}px ${family}`;
}

function getTextBoundsX(item, width) {
  if (item.align === 'left') return item.x;
  if (item.align === 'right') return item.x - width;
  return item.x - width / 2;
}

function createInitialMarkupForm() {
  return {
    category: 'list',
    templateId: '',
  };
}

function createInitialTextForm() {
  return {
    value: '',
    font: 'Pretendard',
    bold: false,
    italic: false,
    underline: false,
    size: 48,
    color: '#000000',
    x: DEFAULT_SIZE.width / 2,
    y: DEFAULT_SIZE.height / 2,
  };
}

function MarkupRenderContent({ html, paletteClassName, isEditing, onInput, onMouseDown, onBlur }) {
  const contentRef = useRef(null);

  useEffect(() => {
    const element = contentRef.current;
    if (!element || isEditing || element.innerHTML === html) return;
    element.innerHTML = html;
  }, [html, isEditing]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element || !isEditing) return;
    element.focus();
  }, [isEditing]);

  return (
    <div
      ref={contentRef}
      className={`canvas-markup-content markup-render ${paletteClassName || ''}`}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onInput={event => onInput(event.currentTarget.innerHTML)}
      onMouseDown={onMouseDown}
      onBlur={onBlur}
    />
  );
}

function CanvasEditorPage() {
  const canvasRef = useRef(null);
  const foregroundCanvasRef = useRef(null);
  const textEditInputRef = useRef(null);
  const markupItemRefs = useRef({});
  const markupResizeDraftRef = useRef(null);
  const imageInputRef = useRef(null);
  const replaceImageInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState(DEFAULT_SIZE);
  const [canvasSizeForm, setCanvasSizeForm] = useState({
    width: String(DEFAULT_SIZE.width),
    height: String(DEFAULT_SIZE.height),
  });
  const [bgColor, setBgColor] = useState('#ffffff');
  const [bgColorInput, setBgColorInput] = useState('#ffffff');
  const [bgImage, setBgImage] = useState(null);
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [drag, setDrag] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [textEditStyle, setTextEditStyle] = useState(null);
  const [editingMarkupId, setEditingMarkupId] = useState(null);
  const [replaceImageId, setReplaceImageId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [openPanel, setOpenPanel] = useState(null);
  const [workspaceTab, setWorkspaceTab] = useState('canvas');
  const [templateCategory, setTemplateCategory] = useState('all');
  const [textForm, setTextForm] = useState(createInitialTextForm);
  const [textColorInput, setTextColorInput] = useState('#000000');
  const [iconForm, setIconForm] = useState({ value: '', size: 64, x: 400, y: 300 });
  const [imageForm, setImageForm] = useState({ image: null, width: 200, height: 200, x: 400, y: 300 });
  const [markupForm, setMarkupForm] = useState(createInitialMarkupForm);
  const [markupColorInput, setMarkupColorInput] = useState('#0070c8');

  const activeItem = items.find(item => item.id === activeId);
  const editingTextItem = editingTextId ? items.find(item => item.id === editingTextId && item.type === 'text') : null;
  const markupItems = items.filter(item => item.type === 'markup');
  const activeMarkupItem = activeItem?.type === 'markup' ? activeItem : markupItems[0];
  const activeMarkupColor = activeMarkupItem?.paletteColor || inferMarkupPaletteColor(activeMarkupItem?.html);
  const contextMenuItem = contextMenu ? items.find(item => item.id === contextMenu.itemId) : null;
  const selectedMarkupTemplates = MARKUP_TEMPLATES[markupForm.category] || [];
  const selectedCanvasTemplates = templateCategory === 'all'
    ? CANVAS_TEMPLATES
    : CANVAS_TEMPLATES.filter(template => (template.category || 'document') === templateCategory);

  function togglePanel(panel) {
    setOpenPanel(current => (current === panel ? null : panel));
  }

  function getResizeHandleBounds(bounds) {
    return {
      x: bounds.x + bounds.width - RESIZE_HANDLE_SIZE / 2,
      y: bounds.y + bounds.height - RESIZE_HANDLE_SIZE / 2,
      width: RESIZE_HANDLE_SIZE,
      height: RESIZE_HANDLE_SIZE,
    };
  }

  function getDeleteButtonBounds(bounds) {
    return {
      x: bounds.x + bounds.width - DELETE_BUTTON_SIZE / 2,
      y: bounds.y - DELETE_BUTTON_SIZE / 2,
      width: DELETE_BUTTON_SIZE,
      height: DELETE_BUTTON_SIZE,
    };
  }

  function isInsideBounds(x, y, bounds) {
    return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
  }

  function isEditableTarget(target) {
    const tagName = target?.tagName?.toLowerCase();
    return ['input', 'textarea', 'select'].includes(tagName) || target?.isContentEditable;
  }

  function measureItem(ctx, item) {
    if (item.type === 'image' || item.type === 'markup') {
      return {
        x: item.x - item.width / 2,
        y: item.y - item.height / 2,
        width: item.width,
        height: item.height,
      };
    }

    ctx.font = item.type === 'text' ? getFont(item) : `${item.size}px sans-serif`;
    const measure = ctx.measureText(item.value);
    const width = measure.width + 16;
    const height = item.size + 16;
    return {
      x: item.type === 'text' ? getTextBoundsX(item, width) : item.x - width / 2,
      y: item.y - height / 2,
      width,
      height,
    };
  }

  function drawUnderline(ctx, item) {
    const width = ctx.measureText(item.value).width;
    const x = getTextBoundsX(item, width);
    const y = item.y + item.size * 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineWidth = Math.max(1, item.size / 18);
    ctx.strokeStyle = item.color;
    ctx.stroke();
  }

  function drawCanvasItem(ctx, item) {
    if (item.type === 'text') {
      ctx.fillStyle = item.color;
      ctx.font = getFont(item);
      ctx.textAlign = item.align || 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.value, item.x, item.y);
      if (item.underline) drawUnderline(ctx, item);
    }

    if (item.type === 'icon') {
      ctx.fillStyle = item.color || '#111827';
      ctx.font = `${item.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.value, item.x, item.y);
    }

    if (item.type === 'image') {
      ctx.drawImage(item.image, item.x - item.width / 2, item.y - item.height / 2, item.width, item.height);
    }
  }

  function drawCanvas(options = {}) {
    const { showSelection = true } = options;
    const canvas = canvasRef.current;
    const foregroundCanvas = foregroundCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const foregroundCtx = foregroundCanvas?.getContext('2d');
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    if (foregroundCanvas) {
      foregroundCanvas.width = canvasSize.width;
      foregroundCanvas.height = canvasSize.height;
      foregroundCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    }
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (bgImage) {
      const ratio = Math.min(canvasSize.width / bgImage.width, canvasSize.height / bgImage.height);
      const width = bgImage.width * ratio;
      const height = bgImage.height * ratio;
      ctx.drawImage(bgImage, (canvasSize.width - width) / 2, (canvasSize.height - height) / 2, width, height);
    }

    const lastMarkupIndex = items.reduce((lastIndex, item, index) => (item.type === 'markup' ? index : lastIndex), -1);

    items.forEach((item, index) => {
      if (item.id === editingTextId) return;
      const isForegroundItem = foregroundCtx && item.type !== 'markup' && lastMarkupIndex >= 0 && index > lastMarkupIndex;
      const targetCtx = isForegroundItem ? foregroundCtx : ctx;
      drawCanvasItem(targetCtx, item);

      if (showSelection && item.id === activeId && item.type !== 'markup') {
        const bounds = measureItem(targetCtx, item);
        targetCtx.strokeStyle = '#0070c8';
        targetCtx.lineWidth = 2;
        targetCtx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        const deleteButton = getDeleteButtonBounds(bounds);
        targetCtx.fillStyle = '#ef4444';
        targetCtx.strokeStyle = '#ffffff';
        targetCtx.lineWidth = 2;
        targetCtx.beginPath();
        targetCtx.arc(
          deleteButton.x + deleteButton.width / 2,
          deleteButton.y + deleteButton.height / 2,
          deleteButton.width / 2,
          0,
          Math.PI * 2
        );
        targetCtx.fill();
        targetCtx.stroke();
        targetCtx.strokeStyle = '#ffffff';
        targetCtx.lineWidth = 2;
        targetCtx.beginPath();
        targetCtx.moveTo(deleteButton.x + 7, deleteButton.y + 7);
        targetCtx.lineTo(deleteButton.x + deleteButton.width - 7, deleteButton.y + deleteButton.height - 7);
        targetCtx.moveTo(deleteButton.x + deleteButton.width - 7, deleteButton.y + 7);
        targetCtx.lineTo(deleteButton.x + 7, deleteButton.y + deleteButton.height - 7);
        targetCtx.stroke();
        if (item.type === 'icon' || item.type === 'image' || item.type === 'markup') {
          const handle = getResizeHandleBounds(bounds);
          targetCtx.fillStyle = '#ffffff';
          targetCtx.strokeStyle = '#0070c8';
          targetCtx.lineWidth = 2;
          targetCtx.fillRect(handle.x, handle.y, handle.width, handle.height);
          targetCtx.strokeRect(handle.x, handle.y, handle.width, handle.height);
        }
      }
    });
  }

  useEffect(drawCanvas, [canvasSize, bgColor, bgImage, items, activeId, workspaceTab, editingTextId]);

  useEffect(() => {
    if (document.fonts?.ready) document.fonts.ready.then(drawCanvas);
  }, []);

  useEffect(() => {
    const input = textEditInputRef.current;
    if (!input || !editingTextItem) return;
    input.focus();
    input.select();
  }, [editingTextItem?.id]);

  useEffect(() => {
    if (!activeMarkupItem) return;
    setMarkupColorInput(activeMarkupColor);
  }, [activeMarkupItem?.id, activeMarkupColor]);

  useEffect(() => {
    function closeContextMenu() {
      setContextMenu(null);
    }

    function handleContextMenuKeyDown(event) {
      if (event.key === 'Escape') setContextMenu(null);
    }

    window.addEventListener('click', closeContextMenu);
    window.addEventListener('keydown', handleContextMenuKeyDown);
    window.addEventListener('resize', closeContextMenu);
    window.addEventListener('scroll', closeContextMenu, true);
    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('keydown', handleContextMenuKeyDown);
      window.removeEventListener('resize', closeContextMenu);
      window.removeEventListener('scroll', closeContextMenu, true);
    };
  }, []);

  function updateCenteredForms(nextSize) {
    const x = Math.round(nextSize.width / 2);
    const y = Math.round(nextSize.height / 2);
    setTextForm(form => ({ ...form, x, y }));
    setIconForm(form => ({ ...form, x, y }));
    setImageForm(form => ({ ...form, x, y }));
  }

  function updateBgColor(color) {
    setBgColor(color);
    setBgColorInput(color);
    setBgImage(null);
  }

  function updateBgColorFromHex(value) {
    const nextValue = sanitizeHexColorInput(value);
    setBgColorInput(nextValue);
    const color = normalizeHexColor(nextValue);
    if (color) {
      setBgColor(color);
      setBgImage(null);
    }
  }

  function commitBgColorInput() {
    const color = normalizeHexColor(bgColorInput);
    if (color) {
      updateBgColor(color);
      return;
    }
    setBgColorInput(bgColor);
  }

  function updateTextColor(color) {
    setTextColorInput(color);
    updateActiveText({ color });
  }

  function updateTextColorFromHex(value) {
    const nextValue = sanitizeHexColorInput(value);
    setTextColorInput(nextValue);
    const color = normalizeHexColor(nextValue);
    if (color) {
      updateActiveText({ color });
    }
  }

  function commitTextColorInput() {
    const color = normalizeHexColor(textColorInput);
    if (color) {
      updateTextColor(color);
      return;
    }
    setTextColorInput(textForm.color);
  }

  function updateActiveMarkupColor(color) {
    if (!activeMarkupItem) return;
    const nextColor = normalizeHexColor(color);
    if (!nextColor) return;
    setMarkupColorInput(nextColor);
    setItems(prev => prev.map(item => {
      if (item.id !== activeMarkupItem.id) return item;
      return {
        ...item,
        paletteColor: nextColor,
      };
    }));
  }

  function updateMarkupColorFromHex(value) {
    const nextValue = sanitizeHexColorInput(value);
    setMarkupColorInput(nextValue);
    const color = normalizeHexColor(nextValue);
    if (color) {
      updateActiveMarkupColor(color);
    }
  }

  function commitMarkupColorInput() {
    const color = normalizeHexColor(markupColorInput);
    if (color) {
      updateActiveMarkupColor(color);
      return;
    }
    setMarkupColorInput(activeMarkupColor);
  }

  function handleCanvasSizeChange(field, value) {
    setCanvasSizeForm(form => ({ ...form, [field]: value }));
    if (value === '') return;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 100) return;
    const nextSize = {
      ...canvasSize,
      [field]: numericValue,
    };
    setCanvasSize(nextSize);
    updateCenteredForms(nextSize);
  }

  function commitCanvasSize(field) {
    const numericValue = Number(canvasSizeForm[field]);
    if (Number.isFinite(numericValue) && numericValue >= 100) {
      const nextSize = {
        ...canvasSize,
        [field]: numericValue,
      };
      setCanvasSize(nextSize);
      setCanvasSizeForm(form => ({ ...form, [field]: String(numericValue) }));
      updateCenteredForms(nextSize);
      return;
    }
    setCanvasSizeForm(form => ({ ...form, [field]: String(canvasSize[field]) }));
  }

  function loadImageFile(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => callback(image);
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function loadImageSrc(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function syncTextForm(item) {
    if (item?.type !== 'text') return;
    setTextColorInput(item.color);
    setTextForm({
      value: item.value,
      font: item.font || 'Pretendard',
      bold: Boolean(item.bold),
      italic: Boolean(item.italic),
      underline: Boolean(item.underline),
      size: item.size,
      color: item.color,
      x: Math.round(item.x),
      y: Math.round(item.y),
    });
  }

  function syncIconForm(item) {
    if (item?.type !== 'icon') return;
    setIconForm({
      value: item.value,
      size: item.size,
      x: Math.round(item.x),
      y: Math.round(item.y),
    });
  }

  function syncImageForm(item) {
    if (item?.type !== 'image') return;
    setImageForm(form => ({
      ...form,
      image: item.image,
      width: Math.round(item.width),
      height: Math.round(item.height),
      x: Math.round(item.x),
      y: Math.round(item.y),
    }));
  }

  function syncMarkupForm(item) {
    if (item?.type !== 'markup') return;
    setMarkupColorInput(item.paletteColor || inferMarkupPaletteColor(item.html));
    setMarkupForm({
      category: item.category,
      templateId: item.templateId,
    });
  }

  function syncFormFromItem(item) {
    syncTextForm(item);
    syncIconForm(item);
    syncImageForm(item);
    syncMarkupForm(item);
    if (item?.type === 'text') setOpenPanel('text');
    if (item?.type === 'icon') setOpenPanel('icon');
    if (item?.type === 'image') setOpenPanel('image');
    if (item?.type === 'markup') setOpenPanel('markup');
  }

  function updateActiveText(patch) {
    const nextForm = { ...textForm, ...patch };
    setTextForm(nextForm);
    if (activeItem?.type !== 'text') return;
    setItems(prev => prev.map(item => (
      item.id === activeId
        ? {
          ...item,
          value: nextForm.value.trim() ? nextForm.value : '텍스트',
          font: nextForm.font,
          bold: nextForm.bold,
          italic: nextForm.italic,
          underline: nextForm.underline,
          size: Math.max(12, Number(nextForm.size) || 48),
          color: nextForm.color,
          x: clamp(Number(nextForm.x) || canvasSize.width / 2, 0, canvasSize.width),
          y: clamp(Number(nextForm.y) || canvasSize.height / 2, 0, canvasSize.height),
        }
        : item
    )));
  }

  function updateTextValueById(id, value) {
    const target = items.find(item => item.id === id);
    setItems(prev => prev.map(item => (
      item.id === id ? { ...item, value } : item
    )));
    if (target?.type === 'text' && editingTextId === id) {
      setTextEditStyle(getTextEditStyle({ ...target, value }));
    }
    if (activeId === id) {
      setTextForm(form => ({ ...form, value }));
    }
  }

  function finishTextEdit(id, value) {
    if (value.trim() === '') {
      updateTextValueById(id, 'Text');
    }
    setEditingTextId(null);
    setTextEditStyle(null);
  }

  function addText() {
    const item = {
      id: crypto.randomUUID(),
      type: 'text',
      value: textForm.value.trim() ? textForm.value : '텍스트',
      font: textForm.font,
      bold: textForm.bold,
      italic: textForm.italic,
      underline: textForm.underline,
      size: Math.max(12, Number(textForm.size) || 48),
      color: textForm.color,
      x: clamp(Number(textForm.x) || canvasSize.width / 2, 0, canvasSize.width),
      y: clamp(Number(textForm.y) || canvasSize.height / 2, 0, canvasSize.height),
    };
    setItems(prev => [...prev, item]);
    setActiveId(item.id);
  }

  function addIcon() {
    if (!iconForm.value) {
      alert('추가할 아이콘을 선택해주세요.');
      return;
    }
    const item = {
      id: crypto.randomUUID(),
      type: 'icon',
      value: iconForm.value,
      size: Math.max(24, Number(iconForm.size) || 64),
      color: '#111827',
      x: clamp(Number(iconForm.x) || canvasSize.width / 2, 0, canvasSize.width),
      y: clamp(Number(iconForm.y) || canvasSize.height / 2, 0, canvasSize.height),
    };
    setItems(prev => [...prev, item]);
    setActiveId(item.id);
  }

  function addImage() {
    if (!imageForm.image) {
      alert('추가할 이미지를 선택해주세요.');
      return;
    }
    const item = {
      id: crypto.randomUUID(),
      type: 'image',
      image: imageForm.image,
      width: Math.max(50, Number(imageForm.width) || imageForm.image.width),
      height: Math.max(50, Number(imageForm.height) || imageForm.image.height),
      x: clamp(Number(imageForm.x) || canvasSize.width / 2, 0, canvasSize.width),
      y: clamp(Number(imageForm.y) || canvasSize.height / 2, 0, canvasSize.height),
    };
    setItems(prev => [...prev, item]);
    setActiveId(item.id);
  }

  function openReplaceImagePicker(id) {
    const target = items.find(item => item.id === id);
    if (target?.type !== 'image') return;
    setReplaceImageId(id);
    setContextMenu(null);
    if (replaceImageInputRef.current) {
      replaceImageInputRef.current.value = '';
      replaceImageInputRef.current.click();
    }
  }

  function replaceImageById(id, image) {
    const target = items.find(item => item.id === id);
    if (target?.type !== 'image') return;
    setItems(prev => prev.map(item => (
      item.id === id ? { ...item, image, imageSrc: undefined } : item
    )));
    if (activeId === id) {
      setImageForm(form => ({
        ...form,
        image,
        width: Math.round(target.width),
        height: Math.round(target.height),
        x: Math.round(target.x),
        y: Math.round(target.y),
      }));
    }
    setReplaceImageId(null);
  }

  function handleReplaceImageChange(event) {
    const file = event.currentTarget.files?.[0];
    const id = replaceImageId;
    if (!file || !id) {
      setReplaceImageId(null);
      return;
    }
    const input = event.currentTarget;
    loadImageFile(file, image => {
      replaceImageById(id, image);
      input.value = '';
    });
  }

  function addMarkup(template) {
    const item = {
      id: crypto.randomUUID(),
      type: 'markup',
      category: markupForm.category,
      templateId: template.id,
      label: template.label,
      html: template.html,
      paletteColor: inferMarkupPaletteColor(template.html),
      width: markupForm.category === 'table' ? 380 : 340,
      height: markupForm.category === 'process' ? 170 : 190,
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
    };
    setItems(prev => [...prev, item]);
    setActiveId(item.id);
    setWorkspaceTab('canvas');
  }

  async function addCanvasTemplate(template) {
    const nextCanvasSize = template.canvasSize || canvasSize;
    const centerX = nextCanvasSize.width / 2;
    const centerY = nextCanvasSize.height / 2;
    const templateItems = template.items || [
      {
        type: 'markup',
        category: template.markup.category,
        label: template.markup.label,
        html: template.markup.html,
        width: template.markup.width,
        height: template.markup.height,
        x: centerX,
        y: centerY + 35,
      },
      {
        type: 'text',
        value: template.text.value,
        font: 'Pretendard',
        bold: true,
        italic: false,
        underline: false,
        size: template.text.size,
        color: template.text.color,
        x: centerX,
        y: clamp(centerY + template.text.yOffset, 0, nextCanvasSize.height),
      },
      {
        type: 'icon',
        value: template.icon,
        size: 56,
        color: '#111827',
        x: clamp(centerX - 210, 0, nextCanvasSize.width),
        y: clamp(centerY - 155, 0, nextCanvasSize.height),
      },
      ...(template.imageSrc ? [{
        type: 'image',
        imageSrc: template.imageSrc,
        width: 120,
        height: 36,
        x: clamp(centerX + 210, 0, nextCanvasSize.width),
        y: clamp(centerY - 155, 0, nextCanvasSize.height),
      }] : []),
    ];

    const nextItems = [];
    for (const item of templateItems) {
      if (item.type === 'image') {
        try {
          const image = await loadImageSrc(item.imageSrc);
          nextItems.push({ ...item, id: crypto.randomUUID(), image });
        } catch {
          alert('템플릿 이미지를 불러오지 못했습니다.');
          return;
        }
      } else {
        nextItems.push({
          ...item,
          id: crypto.randomUUID(),
          templateId: template.id,
          ...(item.type === 'markup' ? { paletteColor: item.paletteColor || inferMarkupPaletteColor(item.html) } : {}),
        });
      }
    }

    setItems(nextItems);
    setCanvasSize(nextCanvasSize);
    setCanvasSizeForm({ width: String(nextCanvasSize.width), height: String(nextCanvasSize.height) });
    updateBgColor(template.bgColor || '#ffffff');
    setActiveId(nextItems.find(item => item.type === 'markup')?.id || nextItems[0]?.id || null);
    setWorkspaceTab('canvas');
    setOpenPanel(null);
  }

  function updateActiveMarkupHtml(html) {
    if (!activeMarkupItem) return;
    setItems(prev => prev.map(item => (
      item.id === activeMarkupItem.id ? { ...item, html } : item
    )));
  }

  function getMarkupItemStyle(item) {
    return {
      left: `${((item.x - item.width / 2) / canvasSize.width) * 100}%`,
      top: `${((item.y - item.height / 2) / canvasSize.height) * 100}%`,
      width: `${(item.width / canvasSize.width) * 100}%`,
      height: `${(item.height / canvasSize.height) * 100}%`,
      ...getMarkupPaletteVars(item.paletteColor || inferMarkupPaletteColor(item.html)),
    };
  }

  function deleteItemById(id) {
    if (!id) return;
    setItems(prev => prev.filter(item => item.id !== id));
    setActiveId(current => (current === id ? null : current));
    setDrag(current => (current?.id === id ? null : current));
    setEditingTextId(current => (current === id ? null : current));
    if (editingTextId === id) setTextEditStyle(null);
    setReplaceImageId(current => (current === id ? null : current));
    setEditingMarkupId(current => (current === id ? null : current));
    setContextMenu(null);
  }

  function bringItemToFront(id) {
    if (!id) return;
    setItems(prev => {
      const target = prev.find(item => item.id === id);
      if (!target) return prev;
      return [...prev.filter(item => item.id !== id), target];
    });
    setActiveId(id);
    setContextMenu(null);
  }

  function sendItemToBack(id) {
    if (!id) return;
    setItems(prev => {
      const target = prev.find(item => item.id === id);
      if (!target) return prev;
      return [target, ...prev.filter(item => item.id !== id)];
    });
    setActiveId(id);
    setContextMenu(null);
  }

  function openContextMenu(event, item) {
    event.preventDefault();
    event.stopPropagation();
    if (!item) {
      setContextMenu(null);
      return;
    }
    setActiveId(item.id);
    syncFormFromItem(item);
    setContextMenu({
      itemId: item.id,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function getCanvasPosition(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function getCanvasPositionFromClient(clientX, clientY) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function getItemAtPosition(x, y) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const item = items[i];
      const bounds = measureItem(ctx, item);
      if (isInsideBounds(x, y, bounds)) {
        return item;
      }
    }
    return null;
  }

  function getItemAtClientPosition(clientX, clientY) {
    const pos = getCanvasPositionFromClient(clientX, clientY);
    return getItemAtPosition(pos.x, pos.y);
  }

  function handleFrameContextMenu(event) {
    const item = getItemAtClientPosition(event.clientX, event.clientY);
    openContextMenu(event, item);
  }

  function getTextEditStyle(item) {
    const canvas = canvasRef.current;
    if (!canvas) return {};
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvasSize.width;
    const scaleY = rect.height / canvasSize.height;
    const ctx = canvas.getContext('2d');
    const bounds = measureItem(ctx, item);
    return {
      left: `${bounds.x * scaleX}px`,
      top: `${bounds.y * scaleY}px`,
      width: `${bounds.width * scaleX}px`,
      height: `${bounds.height * scaleY}px`,
      font: getFont({ ...item, size: item.size * scaleY }),
      color: item.color,
      textAlign: item.align || 'center',
      textDecoration: item.underline ? 'underline' : 'none',
    };
  }

  function startTextEdit(event) {
    const item = getItemAtClientPosition(event.clientX, event.clientY);
    if (item?.type !== 'text') return;
    event.preventDefault();
    event.stopPropagation();
    setDrag(null);
    setActiveId(item.id);
    syncFormFromItem(item);
    setEditingMarkupId(null);
    setTextEditStyle(getTextEditStyle(item));
    setEditingTextId(item.id);
  }

  function getActiveResizeItemAtPosition(x, y) {
    if (!activeItem || !['icon', 'image', 'markup'].includes(activeItem.type)) return null;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bounds = measureItem(ctx, activeItem);
    const handle = getResizeHandleBounds(bounds);
    return isInsideBounds(x, y, handle) ? activeItem : null;
  }

  function getActiveDeleteItemAtPosition(x, y) {
    if (!activeItem) return null;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bounds = measureItem(ctx, activeItem);
    const deleteButton = getDeleteButtonBounds(bounds);
    return isInsideBounds(x, y, deleteButton) ? activeItem : null;
  }

  function startDrag(event) {
    if (event.button === 2) return;
    event.preventDefault();
    const pos = getCanvasPosition(event);
    const deleteItem = getActiveDeleteItemAtPosition(pos.x, pos.y);
    if (deleteItem) {
      deleteItemById(deleteItem.id);
      return;
    }

    const resizeItem = getActiveResizeItemAtPosition(pos.x, pos.y);
    if (resizeItem) {
      setDrag({
        mode: 'resize',
        id: resizeItem.id,
        startX: pos.x,
        startY: pos.y,
        startSize: resizeItem.size,
        startWidth: resizeItem.width,
        startHeight: resizeItem.height,
      });
      return;
    }

    const item = getItemAtPosition(pos.x, pos.y);
    if (!item) {
      setActiveId(null);
      setEditingTextId(null);
      setTextEditStyle(null);
      setEditingMarkupId(null);
      return;
    }
    setActiveId(item.id);
    setEditingTextId(null);
    setTextEditStyle(null);
    if (item.type !== 'markup') setEditingMarkupId(null);
    syncFormFromItem(item);
    setDrag({ mode: 'move', id: item.id, offsetX: pos.x - item.x, offsetY: pos.y - item.y });
  }

  function startMarkupDrag(event, item) {
    if (event.button === 2) return;
    if (editingMarkupId === item.id) return;
    event.preventDefault();
    event.stopPropagation();
    const pos = getCanvasPosition(event);
    setActiveId(item.id);
    syncFormFromItem(item);
    setDrag({ mode: 'move', id: item.id, offsetX: pos.x - item.x, offsetY: pos.y - item.y });
  }

  function startMarkupEdit(event, item) {
    event.preventDefault();
    event.stopPropagation();
    setActiveId(item.id);
    syncFormFromItem(item);
    setEditingMarkupId(item.id);
  }

  function updateMarkupHtmlById(id, html) {
    setItems(prev => prev.map(item => (
      item.id === id ? { ...item, html } : item
    )));
  }

  function startMarkupResize(event, item) {
    event.preventDefault();
    event.stopPropagation();
    const pos = getCanvasPosition(event);
    setActiveId(item.id);
    markupResizeDraftRef.current = {
      id: item.id,
      width: item.width,
      height: item.height,
    };
    setDrag({
      mode: 'resize',
      id: item.id,
      startX: pos.x,
      startY: pos.y,
      startWidth: item.width,
      startHeight: item.height,
    });
  }

  function downloadDataUrl(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }

  function getItemFilename(item) {
    return `klic-${item.type}-${item.id.slice(0, 8)}.png`;
  }

  function downloadCanvasItemAsImage(item) {
    const sourceCanvas = canvasRef.current;
    if (!sourceCanvas) return;
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    const bounds = measureItem(measureCtx, item);
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.ceil(bounds.width);
    exportCanvas.height = Math.ceil(bounds.height);
    const exportCtx = exportCanvas.getContext('2d');

    if (item.type === 'image') {
      exportCtx.drawImage(item.image, 0, 0, exportCanvas.width, exportCanvas.height);
    } else {
      drawCanvasItem(exportCtx, {
        ...item,
        x: exportCanvas.width / 2,
        y: exportCanvas.height / 2,
      });
    }

    downloadDataUrl(exportCanvas.toDataURL('image/png'), getItemFilename(item));
  }

  function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });
  }

  function getMarkupExportSize(item) {
    const node = markupItemRefs.current[item.id]?.querySelector('.canvas-markup-content');
    const contentHeight = node ? Math.ceil(node.scrollHeight) : item.height;
    const contentWidth = node ? Math.ceil(node.scrollWidth) : item.width;
    return {
      width: Math.max(item.width, contentWidth),
      height: Math.max(item.height, contentHeight),
    };
  }

  async function renderMarkupItemToImage(item, exportSize = getMarkupExportSize(item)) {
    const css = await fetch('/markup_com.css').then(response => response.text());
    const paletteColor = item.paletteColor || inferMarkupPaletteColor(item.html);
    const paletteClassName = getMarkupPaletteClass(item);
    const paletteCss = getMarkupPaletteCss(paletteColor, paletteClassName);
    const wrapper = document.createElement('div');
    wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    wrapper.setAttribute('class', `markup-render ${paletteClassName}`);
    wrapper.setAttribute('style', `width:${exportSize.width}px;min-height:${exportSize.height}px;padding:12px;box-sizing:border-box;overflow:visible;background:transparent;`);
    wrapper.innerHTML = getMarkupDisplayHtml(item);
    const content = new XMLSerializer().serializeToString(wrapper);
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${exportSize.width}" height="${exportSize.height}">
  <foreignObject width="100%" height="100%">
    <style xmlns="http://www.w3.org/1999/xhtml"><![CDATA[${css}\n${paletteCss}]]></style>
    ${content}
  </foreignObject>
</svg>`;
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    return loadImageFromDataUrl(dataUrl);
  }

  async function downloadMarkupItemAsImage(item) {
    const exportSize = getMarkupExportSize(item);
    const image = await renderMarkupItemToImage(item, exportSize);
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportSize.width;
    exportCanvas.height = exportSize.height;
    exportCanvas.getContext('2d').drawImage(image, 0, 0);
    downloadDataUrl(exportCanvas.toDataURL('image/png'), getItemFilename(item));
  }

  async function downloadItemAsImage(id) {
    const item = items.find(candidate => candidate.id === id);
    if (!item) return;
    setContextMenu(null);
    try {
      if (item.type === 'markup') {
        await downloadMarkupItemAsImage(item);
        return;
      }
      downloadCanvasItemAsImage(item);
    } catch (error) {
      alert('선택 요소를 이미지로 저장하지 못했습니다. 다시 시도해 주세요.');
    }
  }

  function moveItemById(id, x, y) {
    const target = items.find(item => item.id === id);
    if (!target) return;
    const nextX = clamp(x, 0, canvasSize.width);
    const nextY = clamp(y, 0, canvasSize.height);
    setItems(prev => prev.map(item => (item.id === id ? { ...item, x: nextX, y: nextY } : item)));
    if (target.type === 'text') {
      setTextForm(form => ({ ...form, x: Math.round(nextX), y: Math.round(nextY) }));
    }
    if (target.type === 'icon') {
      setIconForm(form => ({ ...form, x: Math.round(nextX), y: Math.round(nextY) }));
    }
    if (target.type === 'image') {
      setImageForm(form => ({ ...form, x: Math.round(nextX), y: Math.round(nextY) }));
    }
  }

  function moveDrag(event) {
    if (!drag) return;
    event.preventDefault();
    const pos = getCanvasPosition(event);

    if (drag.mode === 'resize') {
      const deltaX = pos.x - drag.startX;
      const deltaY = pos.y - drag.startY;
      const delta = Math.max(deltaX, deltaY);
      const target = items.find(item => item.id === drag.id);
      if (target?.type === 'icon') {
        const size = Math.max(24, Math.round((drag.startSize || target.size) + delta));
        setIconForm(form => ({ ...form, size }));
        setItems(prev => prev.map(item => (item.id === drag.id ? { ...item, size } : item)));
      }
      if (target?.type === 'image') {
        const width = Math.max(50, Math.round((drag.startWidth || target.width) + deltaX));
        const height = Math.max(50, Math.round((drag.startHeight || target.height) + deltaY));
        setImageForm(form => ({ ...form, width, height }));
        setItems(prev => prev.map(item => (item.id === drag.id ? { ...item, width, height } : item)));
      }
      if (target?.type === 'markup') {
        const width = Math.max(180, Math.round((drag.startWidth || target.width) + deltaX));
        const height = Math.max(120, Math.round((drag.startHeight || target.height) + deltaY));
        markupResizeDraftRef.current = { id: drag.id, width, height };
        const markupNode = markupItemRefs.current[drag.id];
        if (markupNode) {
          markupNode.style.width = `${(width / canvasSize.width) * 100}%`;
          markupNode.style.height = `${(height / canvasSize.height) * 100}%`;
        }
      }
      return;
    }

    const x = clamp(pos.x - drag.offsetX, 0, canvasSize.width);
    const y = clamp(pos.y - drag.offsetY, 0, canvasSize.height);
    moveItemById(drag.id, x, y);
  }

  function endDrag() {
    const markupResizeDraft = markupResizeDraftRef.current;
    if (markupResizeDraft) {
      setItems(prev => prev.map(item => (
        item.id === markupResizeDraft.id
          ? { ...item, width: markupResizeDraft.width, height: markupResizeDraft.height }
          : item
      )));
      markupResizeDraftRef.current = null;
    }
    setDrag(null);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (!activeItem) return;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace', 'Escape'].includes(event.key)) return;
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      if (event.key === 'Escape') {
        setEditingMarkupId(null);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteItemById(activeItem.id);
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      const next = {
        x: activeItem.x,
        y: activeItem.y,
      };
      if (event.key === 'ArrowUp') next.y -= step;
      if (event.key === 'ArrowDown') next.y += step;
      if (event.key === 'ArrowLeft') next.x -= step;
      if (event.key === 'ArrowRight') next.x += step;
      moveItemById(activeItem.id, next.x, next.y);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeItem, canvasSize.width, canvasSize.height, items]);

  async function buildCanvasExportDataUrl() {
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error('캔버스 탭에서 저장을 진행해주세요.');
    }

    drawCanvas({ showSelection: false });
    const markupExports = [];
    for (const item of items) {
      if (item.type !== 'markup') continue;
      const exportSize = getMarkupExportSize(item);
      const image = await renderMarkupItemToImage(item, exportSize);
      markupExports.push({ item, image, exportSize });
    }

    const exportWidth = Math.max(
      canvasSize.width,
      ...markupExports.map(({ item, exportSize }) => Math.ceil(item.x - item.width / 2 + exportSize.width))
    );
    const exportHeight = Math.max(
      canvasSize.height,
      ...markupExports.map(({ item, exportSize }) => Math.ceil(item.y - item.height / 2 + exportSize.height))
    );
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.fillStyle = bgColor;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(canvas, 0, 0);

    for (const { item, image, exportSize } of markupExports) {
      exportCtx.drawImage(image, item.x - item.width / 2, item.y - item.height / 2, exportSize.width, exportSize.height);
    }

    return exportCanvas.toDataURL('image/png');
  }

  async function downloadImage() {
    try {
      const dataUrl = await buildCanvasExportDataUrl();
      downloadDataUrl(dataUrl, 'klic-canvas.png');
    } catch (error) {
      alert('PNG 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      requestAnimationFrame(() => drawCanvas());
    }
  }

  async function downloadCanvasHwpx() {
    try {
      const dataUrl = await buildCanvasExportDataUrl();
      const response = await fetch('/api/download-canvas-hwpx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'HWPX 저장에 실패했습니다.');
      }
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'klic-canvas.hwpx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      alert(`HWPX 저장 중 오류가 발생했습니다. ${error.message}`);
    } finally {
      requestAnimationFrame(() => drawCanvas());
    }
  }

  function downloadMarkupHtml() {
    if (markupItems.length === 0) {
      alert('저장할 마크업이 없습니다.');
      return;
    }
    const paletteCss = markupItems
      .map(item => getMarkupPaletteCss(item.paletteColor || inferMarkupPaletteColor(item.html), getMarkupPaletteClass(item)))
      .join('\n');
    const body = markupItems
      .map(item => getMarkupDisplayHtml(item).trim()
        ? `<div class="markup-render ${getMarkupPaletteClass(item)}">\n${getMarkupDisplayHtml(item).trim()}\n</div>`
        : '')
      .filter(Boolean)
      .join('\n\n');
    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KL캔버스 마크업</title>
  <link rel="stylesheet" href="./markup_com.css">
  <style>
${paletteCss}
  </style>
</head>
<body>
${body}
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kl-canvas-markup.html';
    link.click();
    URL.revokeObjectURL(url);
  }

  function resetCanvas() {
    setCanvasSize(DEFAULT_SIZE);
    setCanvasSizeForm({
      width: String(DEFAULT_SIZE.width),
      height: String(DEFAULT_SIZE.height),
    });
    updateBgColor('#ffffff');
    setItems([]);
    setActiveId(null);
    setEditingTextId(null);
    setTextEditStyle(null);
    setReplaceImageId(null);
    setEditingMarkupId(null);
    setContextMenu(null);
    setDrag(null);
    setTextForm(createInitialTextForm());
    setTextColorInput('#000000');
    setIconForm({ value: '', size: 64, x: 400, y: 300 });
    setImageForm({ image: null, width: 200, height: 200, x: 400, y: 300 });
    setMarkupForm(createInitialMarkupForm());
    setTemplateCategory('all');
    setWorkspaceTab('canvas');
    if (bgInputRef.current) bgInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  }

  return (
    <main className="canvas-editor-page">
      <div className="canvas-editor-header">
        <h2 className="crawl-title">KL캔버스</h2>
        <p className="crawl-desc">
          교사와 교직원이 팝업, 비주얼, 가정통신문, 공지 등에 필요한 이미지와 마크업을 손쉽게 만들 수 있도록 돕는 제작 도구입니다.
        </p>
      </div>

      <div className="canvas-editor-content">
        <aside className="canvas-editor-sidebar">
          <section className={`canvas-panel ${openPanel === 'text' ? 'is-open' : ''}`}>
            <button type="button" className="canvas-panel-toggle" onClick={() => togglePanel('text')} aria-expanded={openPanel === 'text'}>
              <span>텍스트</span>
              <span aria-hidden="true">{openPanel === 'text' ? '−' : '+'}</span>
            </button>
            {openPanel === 'text' && (
              <div className="canvas-panel-body">
                <textarea
                  value={textForm.value}
                  onChange={event => updateActiveText({ value: event.target.value })}
                  placeholder="텍스트 입력"
                  rows={3}
                />
                <label>
                  폰트
                  <select value={textForm.font} onChange={event => updateActiveText({ font: event.target.value })}>
                    {FONT_OPTIONS.map(font => <option key={font} value={font}>{font}</option>)}
                  </select>
                </label>
                <div className="canvas-format-row" aria-label="텍스트 서식">
                  <button type="button" className={textForm.bold ? 'is-active' : ''} onClick={() => updateActiveText({ bold: !textForm.bold })}>B</button>
                  <button type="button" className={textForm.italic ? 'is-active' : ''} onClick={() => updateActiveText({ italic: !textForm.italic })}>I</button>
                  <button type="button" className={textForm.underline ? 'is-active' : ''} onClick={() => updateActiveText({ underline: !textForm.underline })}>U</button>
                </div>
                <div className="canvas-form-grid">
                  <label>크기<input type="number" min="12" value={textForm.size} onChange={event => updateActiveText({ size: event.target.value })} /></label>
                  <label className="canvas-color-picker">
                    색
                    <span className="canvas-color-control">
                      <span className="canvas-color-swatch" style={{ backgroundColor: textForm.color }} />
                      <input type="color" value={textForm.color} onChange={event => updateTextColor(event.target.value)} />
                      <input
                        className="canvas-color-hex-input"
                        type="text"
                        maxLength={7}
                        inputMode="text"
                        pattern="#[0-9a-fA-F]{6}"
                        value={textColorInput}
                        onChange={event => updateTextColorFromHex(event.target.value)}
                        onBlur={commitTextColorInput}
                        spellCheck={false}
                      />
                    </span>
                  </label>
                  <label>X<input type="number" min="0" value={textForm.x} onChange={event => updateActiveText({ x: event.target.value })} /></label>
                  <label>Y<input type="number" min="0" value={textForm.y} onChange={event => updateActiveText({ y: event.target.value })} /></label>
                </div>
                <button type="button" className="canvas-primary-btn" onClick={addText}>텍스트 추가</button>
              </div>
            )}
          </section>

          <section className={`canvas-panel ${openPanel === 'icon' ? 'is-open' : ''}`}>
            <button type="button" className="canvas-panel-toggle" onClick={() => togglePanel('icon')} aria-expanded={openPanel === 'icon'}>
              <span>아이콘</span>
              <span aria-hidden="true">{openPanel === 'icon' ? '−' : '+'}</span>
            </button>
            {openPanel === 'icon' && (
              <div className="canvas-panel-body">
                <div className="canvas-icon-grid" aria-label="아이콘 선택">
                  {ICON_OPTIONS.map(icon => (
                    <button
                      key={icon.label}
                      type="button"
                      className={iconForm.value === icon.value ? 'is-active' : ''}
                      onClick={() => setIconForm(form => ({ ...form, value: icon.value }))}
                      aria-pressed={iconForm.value === icon.value}
                      title={icon.label}
                    >
                      <span>{icon.value}</span>
                    </button>
                  ))}
                </div>
                {iconForm.value && (
                  <div className="canvas-icon-settings">
                    <div className="canvas-icon-form-grid">
                      <label>크기<input type="number" min="24" value={iconForm.size} onChange={event => setIconForm(form => ({ ...form, size: event.target.value }))} /></label>
                      <label>X<input type="number" min="0" value={iconForm.x} onChange={event => setIconForm(form => ({ ...form, x: event.target.value }))} /></label>
                      <label>Y<input type="number" min="0" value={iconForm.y} onChange={event => setIconForm(form => ({ ...form, y: event.target.value }))} /></label>
                    </div>
                    <button type="button" className="canvas-primary-btn" onClick={addIcon}>아이콘 추가</button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className={`canvas-panel ${openPanel === 'image' ? 'is-open' : ''}`}>
            <button type="button" className="canvas-panel-toggle" onClick={() => togglePanel('image')} aria-expanded={openPanel === 'image'}>
              <span>이미지</span>
              <span aria-hidden="true">{openPanel === 'image' ? '−' : '+'}</span>
            </button>
            {openPanel === 'image' && (
              <div className="canvas-panel-body">
                <label>
                  오버레이 이미지
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={event => loadImageFile(event.target.files[0], image => setImageForm(form => ({ ...form, image })))}
                  />
                </label>
                <div className="canvas-form-grid">
                  <label>넓이<input type="number" min="50" value={imageForm.width} onChange={event => setImageForm(form => ({ ...form, width: event.target.value }))} /></label>
                  <label>높이<input type="number" min="50" value={imageForm.height} onChange={event => setImageForm(form => ({ ...form, height: event.target.value }))} /></label>
                  <label>X<input type="number" min="0" value={imageForm.x} onChange={event => setImageForm(form => ({ ...form, x: event.target.value }))} /></label>
                  <label>Y<input type="number" min="0" value={imageForm.y} onChange={event => setImageForm(form => ({ ...form, y: event.target.value }))} /></label>
                </div>
                <button type="button" className="canvas-primary-btn" onClick={addImage}>이미지 추가</button>
              </div>
            )}
          </section>

          <section className={`canvas-panel ${openPanel === 'markup' ? 'is-open' : ''}`}>
            <button type="button" className="canvas-panel-toggle" onClick={() => togglePanel('markup')} aria-expanded={openPanel === 'markup'}>
              <span>마크업</span>
              <span aria-hidden="true">{openPanel === 'markup' ? '−' : '+'}</span>
            </button>
            {openPanel === 'markup' && (
              <div className="canvas-panel-body">
                <label className="canvas-template-category">
                  유형
                  <select
                    value={markupForm.category}
                    onChange={event => setMarkupForm({ category: event.target.value, templateId: '' })}
                  >
                    {MARKUP_CATEGORIES.map(category => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </select>
                </label>
                <div className="canvas-markup-template-grid" aria-label="마크업 모양 선택">
                  {selectedMarkupTemplates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      className={markupForm.templateId === template.id ? 'is-active' : ''}
                      onClick={() => {
                        setMarkupForm(form => ({ ...form, templateId: template.id }));
                        addMarkup(template);
                      }}
                    >
                      <span className={`canvas-markup-thumb canvas-markup-thumb--${template.preview}`} aria-hidden="true">
                        <i /><i /><i /><i /><i /><i />
                      </span>
                      <strong>{template.label}</strong>
                    </button>
                  ))}
                </div>
                {activeMarkupItem && (
                  <label className="canvas-color-picker canvas-markup-color-picker">
                    마크업 색상
                    <span className="canvas-color-control">
                      <span className="canvas-color-swatch" style={{ backgroundColor: activeMarkupColor }} />
                      <input type="color" value={activeMarkupColor} onChange={event => updateActiveMarkupColor(event.target.value)} />
                      <input
                        className="canvas-color-hex-input"
                        type="text"
                        maxLength={7}
                        inputMode="text"
                        pattern="#[0-9a-fA-F]{6}"
                        value={markupColorInput}
                        onChange={event => updateMarkupColorFromHex(event.target.value)}
                        onBlur={commitMarkupColorInput}
                        spellCheck={false}
                      />
                    </span>
                    <span className="canvas-color-hint">선택한 색상 계열로 표, 박스, 강조색을 함께 변경합니다.</span>
                  </label>
                )}
              </div>
            )}
          </section>

          <section className={`canvas-panel ${openPanel === 'template' ? 'is-open' : ''}`}>
            <button type="button" className="canvas-panel-toggle" onClick={() => togglePanel('template')} aria-expanded={openPanel === 'template'}>
              <span>템플릿</span>
              <span aria-hidden="true">{openPanel === 'template' ? '−' : '+'}</span>
            </button>
            {openPanel === 'template' && (
              <div className="canvas-panel-body">
                <label>
                  유형
                  <select
                    value={templateCategory}
                    onChange={event => setTemplateCategory(event.target.value)}
                  >
                    {CANVAS_TEMPLATE_CATEGORIES.map(category => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </select>
                </label>
                <div className="canvas-template-grid" aria-label="캔버스 템플릿 선택">
                  {selectedCanvasTemplates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => addCanvasTemplate(template)}
                      aria-label={template.label}
                    >
                      <span className="canvas-template-thumb" aria-hidden="true">
                        {template.thumbnailSrc ? (
                          <img src={template.thumbnailSrc} alt="" />
                        ) : (
                          <span className="canvas-template-placeholder">
                            <em>no image</em>
                            <b>X</b>
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
                {selectedCanvasTemplates.length === 0 && (
                  <p className="canvas-template-empty">선택한 유형의 템플릿이 없습니다.</p>
                )}
              </div>
            )}
          </section>
        </aside>

        <section className="canvas-workspace">
          <div className="canvas-topbar">
            <label>
              가로
              <input
                type="number"
                min="100"
                value={canvasSizeForm.width}
                onChange={event => handleCanvasSizeChange('width', event.target.value)}
                onBlur={() => commitCanvasSize('width')}
              />
            </label>
            <label>
              세로
              <input
                type="number"
                min="100"
                value={canvasSizeForm.height}
                onChange={event => handleCanvasSizeChange('height', event.target.value)}
                onBlur={() => commitCanvasSize('height')}
              />
            </label>
            <label className="canvas-color-picker">
              배경색
              <span className="canvas-color-control">
                <span className="canvas-color-swatch" style={{ backgroundColor: bgColor }} />
                <input type="color" value={bgColor} onChange={event => updateBgColor(event.target.value)} />
                <input
                  className="canvas-color-hex-input"
                  type="text"
                  maxLength={7}
                  inputMode="text"
                  pattern="#[0-9a-fA-F]{6}"
                  value={bgColorInput}
                  onChange={event => updateBgColorFromHex(event.target.value)}
                  onBlur={commitBgColorInput}
                  spellCheck={false}
                />
              </span>
            </label>
            <label>
              배경 이미지
              <input ref={bgInputRef} type="file" accept="image/*" onChange={event => loadImageFile(event.target.files[0], setBgImage)} />
            </label>
          </div>

          {markupItems.length > 0 && (
            <div className="canvas-workspace-tabs" role="tablist" aria-label="캔버스 보기 전환">
              <button
                type="button"
                className={workspaceTab === 'canvas' ? 'is-active' : ''}
                onClick={() => setWorkspaceTab('canvas')}
              >
                캔버스
              </button>
              <button
                type="button"
                className={workspaceTab === 'markup' ? 'is-active' : ''}
                onClick={() => setWorkspaceTab('markup')}
              >
                마크업
              </button>
            </div>
          )}

          {workspaceTab === 'markup' && activeMarkupItem ? (
            <div className="canvas-markup-editor">
              <div className="canvas-markup-editor-header">
                <strong>{activeMarkupItem.label}</strong>
                <select
                  value={activeMarkupItem.id}
                  onChange={event => setActiveId(event.target.value)}
                >
                  {markupItems.map((item, index) => (
                    <option key={item.id} value={item.id}>{index + 1}. {item.label}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={activeMarkupItem.html}
                onChange={event => updateActiveMarkupHtml(event.target.value)}
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="canvas-stage">
              <div className="canvas-frame" onContextMenu={handleFrameContextMenu}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrag}
                  onDoubleClick={startTextEdit}
                  onMouseMove={moveDrag}
                  onMouseUp={endDrag}
                  onMouseLeave={endDrag}
                  className={drag?.mode === 'resize' ? 'is-resizing' : drag ? 'is-dragging' : ''}
                />
                <canvas
                  ref={foregroundCanvasRef}
                  className="canvas-foreground"
                  aria-hidden="true"
                />
                <input
                  ref={replaceImageInputRef}
                  type="file"
                  accept="image/*"
                  className="canvas-hidden-file-input"
                  onChange={handleReplaceImageChange}
                />
                {editingTextItem && (
                  <input
                    ref={textEditInputRef}
                    className="canvas-text-editor"
                    value={editingTextItem.value}
                    style={textEditStyle || undefined}
                    onChange={event => updateTextValueById(editingTextItem.id, event.target.value)}
                    onMouseDown={event => event.stopPropagation()}
                    onDoubleClick={event => event.stopPropagation()}
                    onBlur={event => finishTextEdit(editingTextItem.id, event.currentTarget.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === 'Escape') {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                  />
                )}
                <div className="canvas-markup-layer" onMouseMove={moveDrag} onMouseUp={endDrag} onMouseLeave={endDrag}>
                  {markupItems.map(item => (
                    <div
                      key={item.id}
                      ref={node => {
                        if (node) markupItemRefs.current[item.id] = node;
                        else delete markupItemRefs.current[item.id];
                      }}
                      className={`canvas-markup-render-item ${item.id === activeId ? 'is-active' : ''} ${editingMarkupId === item.id ? 'is-editing' : ''}`}
                      style={getMarkupItemStyle(item)}
                      onMouseDown={event => startMarkupDrag(event, item)}
                      onContextMenu={handleFrameContextMenu}
                      onDoubleClick={event => startMarkupEdit(event, item)}
                      onMouseMove={moveDrag}
                      onMouseUp={endDrag}
                      onMouseLeave={endDrag}
                    >
                      <style>{getMarkupPaletteCss(item.paletteColor || inferMarkupPaletteColor(item.html), getMarkupPaletteClass(item))}</style>
                      {item.id === activeId && (
                        <>
                          <button
                            type="button"
                            className="canvas-markup-delete"
                            onMouseDown={event => {
                              event.preventDefault();
                              event.stopPropagation();
                              deleteItemById(item.id);
                            }}
                            aria-label="마크업 삭제"
                          >
                            ×
                          </button>
                          <span
                            className="canvas-markup-resize"
                            onMouseDown={event => startMarkupResize(event, item)}
                            aria-hidden="true"
                          />
                        </>
                      )}
                      <MarkupRenderContent
                        html={getMarkupDisplayHtml(item)}
                        paletteClassName={getMarkupPaletteClass(item)}
                        isEditing={editingMarkupId === item.id}
                        onInput={html => updateMarkupHtmlById(item.id, html)}
                        onMouseDown={event => {
                          if (editingMarkupId === item.id) event.stopPropagation();
                        }}
                        onBlur={() => setEditingMarkupId(null)}
                      />
                    </div>
                  ))}
                </div>
                {contextMenuItem && (
                  <div
                    className="canvas-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={event => event.stopPropagation()}
                    onContextMenu={event => event.preventDefault()}
                  >
                    <button type="button" onClick={() => bringItemToFront(contextMenuItem.id)}>
                      맨 앞으로 가져오기
                    </button>
                    <button type="button" onClick={() => sendItemToBack(contextMenuItem.id)}>
                      맨 뒤로 보내기
                    </button>
                    {contextMenuItem.type === 'image' && (
                      <button type="button" onClick={() => openReplaceImagePicker(contextMenuItem.id)}>
                        이미지 변경
                      </button>
                    )}
                    <button type="button" onClick={() => deleteItemById(contextMenuItem.id)}>
                      삭제
                    </button>
                    <button type="button" onClick={() => downloadItemAsImage(contextMenuItem.id)}>
                      선택 요소 PNG 저장
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="canvas-actions">
            <button type="button" onClick={downloadImage}>PNG 저장</button>
            <button type="button" onClick={downloadCanvasHwpx}>HWPX 저장</button>
            {markupItems.length > 0 && (
              <button type="button" onClick={downloadMarkupHtml}>HTML 저장</button>
            )}
            <button type="button" onClick={resetCanvas}>초기화</button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default CanvasEditorPage;
