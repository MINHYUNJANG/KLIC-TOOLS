/**
 * Figma 노드 트리 → HTML/CSS 프로그래매틱 변환기 (AI 없음)
 * Locofy 방식: 노드 속성을 1:1로 CSS 프로퍼티로 변환
 */

const SKIP_TYPES = new Set([
  'SLICE', 'STICKY', 'CONNECTOR', 'CODE_BLOCK',
  'WIDGET', 'EMBED', 'LINK_UNFURL', 'MEDIA',
]);

function camelToKebab(str) {
  return str.replace(/([A-Z])/g, m => '-' + m.toLowerCase());
}

// px → rem 변환 (기준: 20px = 1rem)
export function pxToRem(css, base = 20) {
  return css.replace(/(\d+(?:\.\d+)?)px/g, (_, n) => {
    const val = parseFloat(n);
    if (val === 0) return '0';
    return parseFloat((val / base).toFixed(4)) + 'rem';
  });
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function colorToStr(color, opacity = 1) {
  if (!color) return null;
  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  const a = (color.a ?? 1) * opacity;
  if (a >= 0.99) return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

function cssToString(css) {
  return Object.entries(css)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `  ${camelToKebab(k)}: ${v};`)
    .join('\n');
}

function getHtmlTag(node) {
  if (node.type !== 'TEXT') return 'div';
  const size = node.style?.fontSize || 16;
  const weight = node.style?.fontWeight || 400;
  if (size >= 28 && weight >= 600) return 'h2';
  if (size >= 22 && weight >= 600) return 'h3';
  if (size >= 18 && weight >= 500) return 'h4';
  return 'p';
}

function buildNodeCss(node, parentNode, imageFillUrls = {}) {
  const css = {};
  const b = node.absoluteBoundingBox;
  const pb = parentNode?.absoluteBoundingBox;
  const parentIsFlex = !!parentNode?.layoutMode;
  const isRoot = !parentNode;

  // ─── 크기 / 위치 ──────────────────────────────────────────────
  if (isRoot) {
    css.position = 'relative';
    if (b) {
      css.width = `${Math.round(b.width)}px`;
      css.minHeight = `${Math.round(b.height)}px`;
    }
  } else if (parentIsFlex) {
    // 플렉스 아이템: layoutSizing으로 크기 결정
    const hw = node.layoutSizingHorizontal || 'FIXED';
    const hv = node.layoutSizingVertical || 'FIXED';
    if (hw === 'FILL') { css.flex = '1'; css.minWidth = '0'; }
    else if (b) css.width = `${Math.round(b.width)}px`;
    if (hv === 'FILL') css.alignSelf = 'stretch';
    else if (b) css.height = `${Math.round(b.height)}px`;
    // 플렉스 아이템이 absolute 자식을 갖는 경우 relative 필요
    if (!node.layoutMode && node.children?.some(c => c.visible !== false)) {
      css.position = 'relative';
    }
  } else {
    // 비-플렉스 부모의 자식 → absolute 위치 지정
    css.position = 'absolute';
    if (b && pb) {
      css.left = `${Math.round(b.x - pb.x)}px`;
      css.top = `${Math.round(b.y - pb.y)}px`;
      css.width = `${Math.round(b.width)}px`;
      css.height = `${Math.round(b.height)}px`;
    }
  }

  // ─── 플렉스 컨테이너 (Auto Layout) ──────────────────────────────
  if (node.layoutMode) {
    css.display = 'flex';
    css.flexDirection = node.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
    if (node.itemSpacing) css.gap = `${node.itemSpacing}px`;
    if (node.paddingTop) css.paddingTop = `${node.paddingTop}px`;
    if (node.paddingRight) css.paddingRight = `${node.paddingRight}px`;
    if (node.paddingBottom) css.paddingBottom = `${node.paddingBottom}px`;
    if (node.paddingLeft) css.paddingLeft = `${node.paddingLeft}px`;
    const J = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', SPACE_BETWEEN: 'space-between' };
    const A = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' };
    if (node.primaryAxisAlignItems) css.justifyContent = J[node.primaryAxisAlignItems] || 'flex-start';
    if (node.counterAxisAlignItems) css.alignItems = A[node.counterAxisAlignItems] || 'flex-start';
    if (node.layoutWrap === 'WRAP') css.flexWrap = 'wrap';
  }

  // ─── 배경 (fills) ─────────────────────────────────────────────
  // TEXT 노드의 fills = 텍스트 색상 → 배경색으로 적용하지 않음
  const fills = (node.fills || []).filter(f => f.visible !== false);
  if (node.type !== 'TEXT') {
    for (const fill of fills) {
      if (fill.type === 'SOLID') {
        css.backgroundColor = colorToStr(fill.color, fill.opacity ?? 1);
        break;
      }
      if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops) {
        const h = fill.gradientHandlePositions;
        let angle = 135;
        if (h?.[0] && h?.[1]) {
          angle = Math.round(Math.atan2(h[1].x - h[0].x, h[0].y - h[1].y) * 180 / Math.PI);
        }
        const stops = fill.gradientStops
          .map(s => `${colorToStr(s.color)} ${(s.position * 100).toFixed(0)}%`)
          .join(', ');
        css.background = `linear-gradient(${angle}deg, ${stops})`;
        break;
      }
      if (fill.type === 'GRADIENT_RADIAL' && fill.gradientStops) {
        const stops = fill.gradientStops
          .map(s => `${colorToStr(s.color)} ${(s.position * 100).toFixed(0)}%`)
          .join(', ');
        css.background = `radial-gradient(circle, ${stops})`;
        break;
      }
      if (fill.type === 'IMAGE') {
        const imgUrl = fill.imageRef ? (imageFillUrls[fill.imageRef] || '') : '';
        if (imgUrl) {
          css.backgroundImage = `url("${imgUrl}")`;
        } else {
          css.backgroundColor = '#e0e0e0';
        }
        css.backgroundSize = 'cover';
        css.backgroundPosition = 'center';
        css.backgroundRepeat = 'no-repeat';
        break;
      }
    }
  }

  // ─── 테두리 ──────────────────────────────────────────────────
  const strokes = (node.strokes || []).filter(s => s.visible !== false && s.type === 'SOLID');
  if (strokes.length > 0 && node.strokeWeight) {
    css.border = `${node.strokeWeight}px solid ${colorToStr(strokes[0].color)}`;
  }

  // ─── 모서리 반경 ─────────────────────────────────────────────
  if (node.type === 'ELLIPSE') {
    css.borderRadius = '50%';
  } else if (node.cornerRadius > 0) {
    css.borderRadius = `${node.cornerRadius}px`;
  } else if (node.rectangleCornerRadii?.some(v => v > 0)) {
    css.borderRadius = node.rectangleCornerRadii.map(v => `${v}px`).join(' ');
  }

  // ─── 투명도 ──────────────────────────────────────────────────
  if (node.opacity !== undefined && node.opacity < 0.99) {
    css.opacity = parseFloat(node.opacity.toFixed(2));
  }

  // ─── 이펙트 (그림자, 블러) ───────────────────────────────────
  const shadows = (node.effects || []).filter(e =>
    (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') && e.visible !== false
  );
  if (shadows.length > 0) {
    css.boxShadow = shadows.map(s => {
      const inset = s.type === 'INNER_SHADOW' ? 'inset ' : '';
      return `${inset}${s.offset.x}px ${s.offset.y}px ${s.radius}px ${s.spread || 0}px ${colorToStr(s.color)}`;
    }).join(', ');
  }
  const blurs = (node.effects || []).filter(e => e.type === 'LAYER_BLUR' && e.visible !== false);
  if (blurs.length > 0) css.filter = `blur(${blurs[0].radius}px)`;

  // ─── 오버플로우 ──────────────────────────────────────────────
  if (node.clipsContent) css.overflow = 'hidden';

  // ─── 타이포그래피 (TEXT) ─────────────────────────────────────
  if (node.type === 'TEXT' && node.style) {
    const s = node.style;
    if (s.fontFamily) css.fontFamily = `"${s.fontFamily}", sans-serif`;
    if (s.fontSize) css.fontSize = `${s.fontSize}px`;
    if (s.fontWeight) css.fontWeight = s.fontWeight;
    if (s.lineHeightPx && s.lineHeightUnit === 'PIXELS') {
      css.lineHeight = `${Math.round(s.lineHeightPx)}px`;
    } else if (s.lineHeightPercentFontSize && s.lineHeightUnit !== 'AUTO') {
      css.lineHeight = `${(s.lineHeightPercentFontSize / 100).toFixed(2)}`;
    }
    if (s.letterSpacing && Math.abs(s.letterSpacing) > 0.01) {
      css.letterSpacing = `${s.letterSpacing}px`;
    }
    const TA = { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' };
    if (s.textAlignHorizontal) css.textAlign = TA[s.textAlignHorizontal] || 'left';
    if (s.textDecoration === 'UNDERLINE') css.textDecoration = 'underline';
    if (s.textDecoration === 'STRIKETHROUGH') css.textDecoration = 'line-through';
    if (s.textCase === 'UPPER') css.textTransform = 'uppercase';
    if (s.textCase === 'LOWER') css.textTransform = 'lowercase';
    const tf = fills.find(f => f.type === 'SOLID');
    if (tf) css.color = colorToStr(tf.color, tf.opacity ?? 1);
    css.whiteSpace = 'pre-wrap';
    css.wordBreak = 'break-word';
  }

  return css;
}

export function convertFigmaNode(rootNode, markupType = 'html', imageFillUrls = {}, pureImageRefs = new Set(), imageNodeMap = {}) {
  const cssRules = [];
  const usedNames = {};
  const isReact = markupType === 'react';

  function makeClass(rawName, nodeType) {
    const base = (rawName || nodeType || 'el')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-0-9]+|[-]+$/g, '')
      .slice(0, 40) || (nodeType || 'el').toLowerCase().replace(/[^a-z]/g, '') || 'el';

    if (!usedNames[base]) { usedNames[base] = 1; return base; }
    return `${base}-${++usedNames[base]}`;
  }

  const mkAttr = (cn) => isReact ? `className="${cn}"` : `class="${cn}"`;

  function processNode(node, parentNode, depth) {
    if (!node || node.visible === false) return '';
    if (SKIP_TYPES.has(node.type)) return '';

    const indent = '  '.repeat(depth);

    // imageNodeMap 우선 확인: 일러스트/이미지 노드 → <img> 렌더링 (자식 탐색 생략)
    if (imageNodeMap[node.id]) {
      const cn = makeClass(node.name, node.type);
      const css = buildNodeCss(node, parentNode, imageFillUrls, true);
      const cssStr = cssToString(css);
      if (cssStr) cssRules.push(`.${cn} {\n${cssStr}\n}`);
      return `${indent}<img ${mkAttr(cn)} src="${imageNodeMap[node.id]}" alt="">`;
    }

    // IMAGE fill + 자식 없음 → <img> (pureImageRefs 방식)
    const imageFill = node.type !== 'TEXT'
      ? (node.fills || []).find(f => f.visible !== false && f.type === 'IMAGE' && f.imageRef)
      : null;
    const visibleChildren = (node.children || [])
      .filter(c => c && c.visible !== false && !SKIP_TYPES.has(c.type));
    const isPureImage = !!(imageFill && visibleChildren.length === 0 && pureImageRefs.has(imageFill.imageRef));

    const cn = makeClass(node.name, node.type);
    const css = buildNodeCss(node, parentNode, imageFillUrls, isPureImage);
    const cssStr = cssToString(css);
    if (cssStr) cssRules.push(`.${cn} {\n${cssStr}\n}`);

    if (isPureImage) {
      const src = imageFillUrls[imageFill.imageRef] || '';
      return `${indent}<img ${mkAttr(cn)} src="${src}" alt="">`;
    }

    const tag = getHtmlTag(node);
    const classAttr = mkAttr(cn);

    if (node.type === 'TEXT') {
      const text = escapeHtml(node.characters || '');
      return `${indent}<${tag} ${classAttr}>${text}</${tag}>`;
    }

    if (!visibleChildren.length) {
      return `${indent}<${tag} ${classAttr}></${tag}>`;
    }

    const childHtml = visibleChildren
      .map(child => processNode(child, node, depth + 1))
      .filter(Boolean)
      .join('\n');

    return `${indent}<${tag} ${classAttr}>\n${childHtml}\n${indent}</${tag}>`;
  }

  const bodyHtml = processNode(rootNode, null, 0);
  const baseCss = `* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\n`;
  const css = pxToRem(baseCss + cssRules.join('\n\n'));

  if (isReact) {
    const jsx = [
      `import React from 'react';`,
      `import './Component.css';`,
      ``,
      `export default function Component() {`,
      `  return (`,
      bodyHtml.split('\n').map(l => '    ' + l).join('\n'),
      `  );`,
      `}`,
    ].join('\n');
    return { jsx, css };
  }

  return { html: bodyHtml, css };
}
