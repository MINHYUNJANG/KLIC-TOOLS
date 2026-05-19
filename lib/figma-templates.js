import { pxToRem } from './figma-converter.js';

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function colorToStr(color, opacity = 1) {
  if (!color) return null;
  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  const a = (color.a ?? 1) * opacity;
  if (a >= 0.99) return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}

function toCss(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `  ${k.replace(/([A-Z])/g, m => '-' + m.toLowerCase())}: ${v};`)
    .join('\n');
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 노드에서 시각적 CSS만 추출 (위치/절대좌표 제외)
function visualCss(node, imageFillUrls = {}) {
  const css = {};
  if (!node) return css;

  const fills = (node.fills || []).filter(f => f.visible !== false);

  if (node.type !== 'TEXT') {
    for (const fill of fills) {
      if (fill.type === 'SOLID') {
        css.backgroundColor = colorToStr(fill.color, fill.opacity ?? 1);
        break;
      }
      if (fill.type === 'IMAGE') {
        const url = fill.imageRef ? (imageFillUrls[fill.imageRef] || '') : '';
        if (url) { css.backgroundImage = `url("${url}")`; css.backgroundSize = 'cover'; css.backgroundPosition = 'center'; }
        break;
      }
    }
  }

  const strokes = (node.strokes || []).filter(s => s.visible !== false && s.type === 'SOLID');
  if (strokes.length && node.strokeWeight) {
    css.border = `${node.strokeWeight}px solid ${colorToStr(strokes[0].color)}`;
  }

  if (node.type === 'ELLIPSE') css.borderRadius = '50%';
  else if (node.cornerRadius > 0) css.borderRadius = `${node.cornerRadius}px`;

  // Auto Layout 패딩
  if (node.paddingTop)    css.paddingTop    = `${node.paddingTop}px`;
  if (node.paddingRight)  css.paddingRight  = `${node.paddingRight}px`;
  if (node.paddingBottom) css.paddingBottom = `${node.paddingBottom}px`;
  if (node.paddingLeft)   css.paddingLeft   = `${node.paddingLeft}px`;

  if (node.opacity !== undefined && node.opacity < 0.99) css.opacity = parseFloat(node.opacity.toFixed(2));

  const shadows = (node.effects || []).filter(e =>
    (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') && e.visible !== false
  );
  if (shadows.length) {
    css.boxShadow = shadows.map(s =>
      `${s.type === 'INNER_SHADOW' ? 'inset ' : ''}${s.offset.x}px ${s.offset.y}px ${s.radius}px ${s.spread || 0}px ${colorToStr(s.color)}`
    ).join(', ');
  }

  if (node.type === 'TEXT' && node.style) {
    const s = node.style;
    if (s.fontFamily) css.fontFamily = `"${s.fontFamily}", sans-serif`;
    if (s.fontSize) css.fontSize = `${s.fontSize}px`;
    if (s.fontWeight) css.fontWeight = s.fontWeight;
    if (s.lineHeightPx && s.lineHeightUnit === 'PIXELS') css.lineHeight = `${Math.round(s.lineHeightPx)}px`;
    if (s.letterSpacing && Math.abs(s.letterSpacing) > 0.01) css.letterSpacing = `${s.letterSpacing}px`;
    const TA = { LEFT: 'left', CENTER: 'center', RIGHT: 'right', JUSTIFIED: 'justify' };
    if (s.textAlignHorizontal) css.textAlign = TA[s.textAlignHorizontal] || 'left';
    const tf = fills.find(f => f.type === 'SOLID');
    if (tf) css.color = colorToStr(tf.color, tf.opacity ?? 1);
  }

  return css;
}

function sizePx(node) {
  const b = node?.absoluteBoundingBox;
  if (!b) return {};
  return { width: `${Math.round(b.width)}px`, height: `${Math.round(b.height)}px` };
}

// 두 형제 노드 사이의 픽셀 간격 계산 (bounding box 기반)
function calcSiblingGap(nodeA, nodeB) {
  const a = nodeA?.absoluteBoundingBox;
  const b = nodeB?.absoluteBoundingBox;
  if (!a || !b) return 0;
  const vGap = Math.round(b.y - (a.y + a.height));
  if (vGap > 0) return vGap;
  const hGap = Math.round(b.x - (a.x + a.width));
  if (hGap > 0) return hGap;
  return 0;
}

// ─── 노드 탐색 ─────────────────────────────────────────────────────────────────

function findChild(node, ...names) {
  return (node?.children || []).find(c =>
    c.visible !== false &&
    names.some(n => (c.name || '').toLowerCase().includes(n.toLowerCase()))
  ) || null;
}

function visible(node) {
  return (node?.children || []).filter(c => c && c.visible !== false);
}

function firstText(node) {
  if (!node) return null;
  if (node.type === 'TEXT') return node;
  for (const c of (node.children || [])) {
    const t = firstText(c);
    if (t) return t;
  }
  return null;
}

// ─── 템플릿 감지 ───────────────────────────────────────────────────────────────

export function detectTemplate(rootNode) {
  const name = (rootNode?.name || '').toLowerCase();
  if (name.includes('_link')) return '_link';
  if (name.includes('_gallery') || name.includes('gallery')) return '_gallery';
  // 추후: _meal, _popupzone, _notice, _calendar, visual
  return null;
}

// ─── _link 렌더러 ──────────────────────────────────────────────────────────────

function renderLink(rootNode, imageNodeMap, imageFillUrls) {
  const cssRules = [];
  const rule = (sel, obj) => {
    const s = toCss(obj);
    if (s) cssRules.push(`${sel} {\n${s}\n}`);
  };

  // 주요 노드 찾기
  const topWrap   = findChild(rootNode, 'top-wrap', 'topwrap', 'tit-wrap');
  const titBox    = topWrap ? findChild(topWrap, 'tit-box', 'titbox', 'tit') : null;
  const titleTxt  = firstText(titBox || topWrap);
  const titIcon   = titBox ? findChild(titBox, 'icon', 'img') : null;
  const btnArea   = topWrap ? findChild(topWrap, 'btn-scroll', 'btn-wrap', 'control') : null;
  const buttons   = visible(btnArea);
  const listGroup = findChild(rootNode, 'list-group', 'list', 'link-group');
  const linkItems = visible(listGroup).filter(c =>
    (c.name || '').toLowerCase().includes('link')
  );

  // ── 간격 계산 ────────────────────────────────────────────────────────────────
  const rootIsFlex = !!rootNode.layoutMode;
  const rootItemSpacing = rootIsFlex ? (rootNode.itemSpacing || 0) : 0;
  const titWrapToListGap = rootIsFlex ? 0 : calcSiblingGap(topWrap, listGroup);

  const listIsFlex = !!listGroup?.layoutMode;
  const listItemGap = listIsFlex
    ? (listGroup.itemSpacing || 0)
    : calcSiblingGap(linkItems[0], linkItems[1]);

  const btnIsFlex = !!btnArea?.layoutMode;
  const btnGap = btnIsFlex
    ? (btnArea.itemSpacing || 0)
    : calcSiblingGap(buttons[0], buttons[1]);

  // ── CSS ──────────────────────────────────────────────────────────────────────
  rule('.M_link', {
    ...(rootIsFlex ? {
      display: 'flex',
      flexDirection: rootNode.layoutMode === 'HORIZONTAL' ? 'row' : 'column',
      ...(rootItemSpacing > 0 ? { gap: `${rootItemSpacing}px` } : {}),
    } : {}),
    ...sizePx(rootNode),
    ...visualCss(rootNode, imageFillUrls),
  });

  rule('.M_link .titWrap', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...visualCss(topWrap, imageFillUrls),
  });

  const titIconInMap = titIcon && imageNodeMap[titIcon.id];
  rule('.M_link .heading', {
    ...(titIconInMap ? { display: 'flex', alignItems: 'center', gap: '8px' } : {}),
    ...visualCss(titleTxt, imageFillUrls),
  });
  if (titIconInMap) {
    const ib = titIcon.absoluteBoundingBox;
    rule('.M_link .heading .ico', {
      ...(ib ? { width: `${Math.round(ib.width)}px`, height: `${Math.round(ib.height)}px` } : {}),
      flexShrink: '0',
    });
  }

  rule('.M_link .control', {
    display: 'flex',
    ...(btnGap > 0 ? { gap: `${btnGap}px` } : { gap: '10px' }),
  });

  if (buttons[0]) {
    const b0 = buttons[0];
    const bb = b0.absoluteBoundingBox;
    rule('.M_link .control button', {
      ...(bb ? { width: `${Math.round(bb.width)}px`, height: `${Math.round(bb.height)}px` } : {}),
      ...visualCss(b0, imageFillUrls),
      cursor: 'pointer',
    });
  }

  rule('.M_link .link', {
    ...(titWrapToListGap > 0 ? { marginTop: `${titWrapToListGap}px` } : {}),
    ...visualCss(listGroup, imageFillUrls),
  });
  rule('.M_link .link ul', {
    display: 'flex',
    gap: listItemGap > 0 ? `${listItemGap}px` : '15px',
    listStyle: 'none',
  });

  if (linkItems[0]) {
    const li0 = linkItems[0];
    const lib = li0.absoluteBoundingBox;
    rule('.M_link .link li', {
      ...(lib ? { width: `${Math.round(lib.width)}px` } : {}),
      ...visualCss(li0, imageFillUrls),
    });

    const iconNode = findChild(li0, 'icon', 'img');
    const txtNode0 = visible(li0).find(c => c.type === 'TEXT');
    const liIsFlex = !!li0.layoutMode;
    const liItemGap = liIsFlex
      ? (li0.itemSpacing || 0)
      : calcSiblingGap(iconNode, txtNode0);

    rule('.M_link .link li a', {
      display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none',
      ...(liItemGap > 0 ? { gap: `${liItemGap}px` } : {}),
    });
    if (iconNode) {
      const ib = iconNode.absoluteBoundingBox;
      rule('.M_link .link .img', {
        ...(ib ? { width: `${Math.round(ib.width)}px`, height: `${Math.round(ib.height)}px` } : {}),
        ...visualCss(iconNode, imageFillUrls),
        overflow: 'hidden',
      });
      rule('.M_link .link .img img', { width: '100%', height: '100%', objectFit: 'contain' });
    }

    if (txtNode0) rule('.M_link .link li span', visualCss(txtNode0, imageFillUrls));
  }

  // ── HTML ─────────────────────────────────────────────────────────────────────
  const titleStr = escapeHtml(titleTxt?.characters || '타이틀');

  // 타이틀 아이콘이 imageNodeMap에 있으면 h2 안에 포함
  const titIconSrc = titIcon ? (imageNodeMap[titIcon.id] || '') : '';
  const headingInner = titIconSrc
    ? `\n    <img class="ico" src="${titIconSrc}" alt="">\n    <span>${titleStr}</span>\n  `
    : titleStr;

  const btnCount = buttons.length || 2;
  const btnHtml = Array.from({ length: btnCount }).map(() =>
    `      <button type="button">\n        <span class="hid">해당 버튼 설명</span>\n      </button>`
  ).join('\n');

  const liHtml = linkItems.map(item => {
    const icon = findChild(item, 'icon', 'img');
    const txt  = visible(item).find(c => c.type === 'TEXT');
    const src  = icon ? (imageNodeMap[icon.id] || '') : '';
    const span = escapeHtml(txt?.characters || '바로가기 타이틀');
    return `      <li>
        <a href="">
          <p class="img">
            <img src="${src}" alt="">
          </p>
          <span>${span}</span>
        </a>
      </li>`;
  }).join('\n');

  const html = `<div class="M_link">
  <div class="titWrap">
    <h2 class="heading">${headingInner}</h2>
    <div class="control">
${btnHtml}
    </div>
  </div>
  <div class="link">
    <ul>
${liHtml}
    </ul>
  </div>
</div>`;

  const base = `* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\n`;
  return { html, css: pxToRem(base + cssRules.join('\n\n')) };
}

// ─── _gallery 렌더러 ────────────────────────────────────────────────────────────

function renderGallery(rootNode, imageNodeMap, imageFillUrls) {
  const cssRules = [];
  const rule = (sel, obj) => {
    const s = toCss(obj);
    if (s) cssRules.push(`${sel} {\n${s}\n}`);
  };

  // 주요 노드 찾기
  const topWrap  = findChild(rootNode, 'top-wrap', 'topwrap', 'tit-wrap');
  const titBox   = topWrap ? findChild(topWrap, 'tit-box', 'titbox', 'tit') : null;
  const titleTxt = firstText(titBox || topWrap);
  const titIcon  = titBox ? findChild(titBox, 'ico', 'icon', 'img') : null;
  const btnMore  = topWrap ? findChild(topWrap, 'btn-more', 'btn', 'more') : null;
  const listGroup = findChild(rootNode, 'list-group', 'list-wrap', 'list');
  const listItems = visible(listGroup).filter(c =>
    (c.name || '').toLowerCase().includes('list')
  );

  // ── 간격 계산 ────────────────────────────────────────────────────────────────
  const rootIsFlex = !!rootNode.layoutMode;
  const rootItemSpacing = rootIsFlex ? (rootNode.itemSpacing || 0) : 0;
  const titWrapToListGap = rootIsFlex ? 0 : calcSiblingGap(topWrap, listGroup);

  const listIsFlex = !!listGroup?.layoutMode;
  const listItemGap = listIsFlex
    ? (listGroup.itemSpacing || 0)
    : calcSiblingGap(listItems[0], listItems[1]);

  // ── CSS ──────────────────────────────────────────────────────────────────────
  rule('.M_Gallery', {
    ...(rootIsFlex ? {
      display: 'flex',
      flexDirection: rootNode.layoutMode === 'HORIZONTAL' ? 'row' : 'column',
      ...(rootItemSpacing > 0 ? { gap: `${rootItemSpacing}px` } : {}),
    } : {}),
    ...sizePx(rootNode),
    ...visualCss(rootNode, imageFillUrls),
  });

  rule('.M_Gallery .titWrap', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...visualCss(topWrap, imageFillUrls),
  });

  const titIconInMap = titIcon && imageNodeMap[titIcon.id];
  rule('.M_Gallery .heading', {
    ...(titIconInMap ? { display: 'flex', alignItems: 'center', gap: '8px' } : {}),
    ...visualCss(titleTxt, imageFillUrls),
  });
  if (titIconInMap) {
    const ib = titIcon.absoluteBoundingBox;
    rule('.M_Gallery .heading .ico', {
      ...(ib ? { width: `${Math.round(ib.width)}px`, height: `${Math.round(ib.height)}px` } : {}),
      flexShrink: '0',
    });
  }

  if (btnMore) {
    const bb = btnMore.absoluteBoundingBox;
    rule('.M_Gallery .titWrap > a', {
      ...(bb ? { width: `${Math.round(bb.width)}px`, height: `${Math.round(bb.height)}px` } : {}),
      ...visualCss(btnMore, imageFillUrls),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textDecoration: 'none',
      cursor: 'pointer',
    });
  }

  rule('.M_Gallery .link', {
    ...(titWrapToListGap > 0 ? { marginTop: `${titWrapToListGap}px` } : {}),
    ...visualCss(listGroup, imageFillUrls),
  });
  rule('.M_Gallery .link ul', {
    display: 'flex',
    gap: listItemGap > 0 ? `${listItemGap}px` : '20px',
    listStyle: 'none',
  });

  if (listItems[0]) {
    const li0 = listItems[0];
    const lib = li0.absoluteBoundingBox;
    rule('.M_Gallery .link li', {
      ...(lib ? { width: `${Math.round(lib.width)}px` } : {}),
      ...visualCss(li0, imageFillUrls),
      overflow: 'hidden',
    });
    rule('.M_Gallery .link li a', {
      display: 'flex', flexDirection: 'column', textDecoration: 'none',
    });

    const imgBox = findChild(li0, 'img', 'image', 'thumb');
    const textBox = findChild(li0, 'text', 'txt', 'caption');
    const captionTxt = firstText(textBox || li0);

    const liImgToTextGap = calcSiblingGap(imgBox, textBox);
    if (liImgToTextGap > 0) {
      rule('.M_Gallery .link li a', {
        display: 'flex', flexDirection: 'column', textDecoration: 'none',
        gap: `${liImgToTextGap}px`,
      });
    }

    if (imgBox) {
      const ib = imgBox.absoluteBoundingBox;
      rule('.M_Gallery .link .img', {
        ...(ib ? { width: `${Math.round(ib.width)}px`, height: `${Math.round(ib.height)}px` } : {}),
        ...visualCss(imgBox, imageFillUrls),
        overflow: 'hidden',
      });
      rule('.M_Gallery .link .img img', { width: '100%', height: '100%', objectFit: 'cover' });
    }

    if (textBox) {
      const tb = textBox.absoluteBoundingBox;
      rule('.M_Gallery .link .caption', {
        ...(tb ? { height: `${Math.round(tb.height)}px` } : {}),
        ...visualCss(textBox, imageFillUrls),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });
    }
    if (captionTxt) rule('.M_Gallery .link li span', visualCss(captionTxt, imageFillUrls));
  }

  // ── HTML ─────────────────────────────────────────────────────────────────────
  const titleStr = escapeHtml(titleTxt?.characters || '타이틀');
  const titIconSrc = titIcon ? (imageNodeMap[titIcon.id] || '') : '';
  const headingInner = titIconSrc
    ? `\n    <img class="ico" src="${titIconSrc}" alt="">\n    <span>${titleStr}</span>\n  `
    : titleStr;

  const liHtml = listItems.map(item => {
    const imgBox = findChild(item, 'img', 'image', 'thumb');
    const textBox = findChild(item, 'text', 'txt', 'caption');
    const captionTxt = firstText(textBox || item);
    const src  = imgBox ? (imageNodeMap[imgBox.id] || '') : '';
    const span = escapeHtml(captionTxt?.characters || '갤러리 타이틀');
    return `      <li>
        <a href="">
          <p class="img">
            <img src="${src}" alt="">
          </p>
          <span>${span}</span>
        </a>
      </li>`;
  }).join('\n');

  const html = `<div class="M_Gallery">
  <div class="titWrap">
    <h2 class="heading">${headingInner}</h2>
    <a href="">
      <span class="hid">해당 버튼 설명</span>
    </a>
  </div>
  <div class="link">
    <ul>
${liHtml}
    </ul>
  </div>
</div>`;

  const base = `* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\n`;
  return { html, css: pxToRem(base + cssRules.join('\n\n')) };
}

// ─── 외부 인터페이스 ────────────────────────────────────────────────────────────

const RENDERERS = {
  '_link': renderLink,
  '_gallery': renderGallery,
};

export function applyTemplate(key, rootNode, imageNodeMap, imageFillUrls) {
  return RENDERERS[key]?.(rootNode, imageNodeMap, imageFillUrls) ?? null;
}
