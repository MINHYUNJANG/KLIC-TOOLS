export function parseMarkup(sourceMarkup, templateCode) {
  const src = new DOMParser().parseFromString(sourceMarkup, 'text/html');
  const tpl = new DOMParser().parseFromString(templateCode, 'text/html');
  src.querySelectorAll('script, style, noscript').forEach(el => el.remove());
  // DOMParser가 템플릿 앞쪽 <script>를 <head>로 올려버리므로 body 앞으로 되돌림
  Array.from(tpl.head.querySelectorAll('script')).forEach(s => {
    tpl.body.insertBefore(s, tpl.body.firstChild);
  });
  return { src, tpl };
}

export function extractBoxLines(srcBox) {
  if (!srcBox) return [];
  return Array.from(srcBox.querySelectorAll('p'))
    .map(p => p.innerHTML.replace(/<(?!\/?strong|\/?br)[^>]*>/gi, '').trim())
    .filter(Boolean);
}

export function mapBodyText(src, tpl, excludePs = new Set()) {
  const tplTxt = tpl.querySelector('.txt-wrap .txt') || tpl.querySelector('.greeting .txt');
  if (!tplTxt) return;

  const BLOCK_TAGS = new Set(['P', 'DIV', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'FIGURE', 'SECTION', 'ARTICLE']);

  // 블록 자식 없는 leaf div: <p> 대신 div에 직접 텍스트가 담긴 구조 대응
  function isLeafDiv(el) {
    return el.tagName === 'DIV' &&
      !Array.from(el.children).some(c => BLOCK_TAGS.has(c.tagName));
  }

  // leaf div → <p> HTML 변환 (<br> 있으면 분리)
  function divToHtml(el) {
    if (!el.querySelector('br')) {
      const text = el.textContent.trim();
      return text ? `<p>${text}</p>` : '';
    }
    return el.innerHTML
      .split(/<br\s*\/?>/gi)
      .map(seg => {
        const text = seg.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
        return text.length > 3 ? `<p>${text}</p>` : '';
      })
      .filter(Boolean)
      .join('\n');
  }

  const blocks = Array.from(src.querySelectorAll('p, ul, div'))
    .filter(el => {
      if (el.tagName === 'DIV' && !isLeafDiv(el)) return false;
      if (excludePs.has(el)) return false;
      if (el.closest('.sign') || el.closest('.box') || el.closest('.name')) return false;
      const text = el.textContent.trim();
      if (/^(HOME|홈|메인)\s*[>▶›»·]/i.test(text)) return false;
      if (el.tagName === 'UL') return el.querySelectorAll('li').length > 0;
      return text.length > 5;
    });

  if (blocks.length > 0) {
    tplTxt.innerHTML = '\n' + blocks.map(el => {
      if (el.tagName === 'UL') {
        const lis = Array.from(el.querySelectorAll('li'))
          .map(li => `<li>${li.textContent.trim()}</li>`)
          .join('\n');
        return `<ul class="bu-st1 list">\n${lis}\n</ul>`;
      }
      if (el.tagName === 'DIV') return divToHtml(el);
      return `<p>${el.textContent.trim()}</p>`;
    }).join('\n') + '\n';
  }
}

export function mapSign(src, tpl) {
  const srcSign = src.querySelector('.sign') || src.querySelector('p.name') || src.querySelector('.name');
  const tplSign = tpl.querySelector('.sign');
  if (srcSign && tplSign) tplSign.innerHTML = srcSign.innerHTML;
}
