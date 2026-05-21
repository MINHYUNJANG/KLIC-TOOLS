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
  const blocks = Array.from(src.querySelectorAll('p, ul'))
    .filter(el => !excludePs.has(el) && !el.closest('.sign') && !el.closest('.box') && !el.closest('.name'))
    .filter(el => {
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
      return `<p>${el.textContent.trim()}</p>`;
    }).join('\n') + '\n';
  }
}

export function mapSign(src, tpl) {
  const srcSign = src.querySelector('.sign') || src.querySelector('p.name') || src.querySelector('.name');
  const tplSign = tpl.querySelector('.sign');
  if (srcSign && tplSign) tplSign.innerHTML = srcSign.innerHTML;
}
