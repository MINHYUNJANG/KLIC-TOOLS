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
    .map(p => p.textContent.trim())
    .filter(Boolean);
}

export function mapBodyText(src, tpl, excludePs = new Set()) {
  const tplTxt = tpl.querySelector('.txt-wrap .txt') || tpl.querySelector('.greeting .txt');
  if (!tplTxt) return;
  const pTags = Array.from(src.querySelectorAll('p:not(.sign)'))
    .filter(p => !excludePs.has(p))
    .map(p => p.textContent.trim())
    .filter(t => t.length > 5);
  if (pTags.length > 0) {
    tplTxt.innerHTML = '\n' + pTags.map(p => `<p>${p}</p>`).join('\n') + '\n';
  }
}

export function mapSign(src, tpl) {
  const srcSign = src.querySelector('.sign');
  const tplSign = tpl.querySelector('.sign');
  if (srcSign && tplSign) tplSign.innerHTML = srcSign.innerHTML;
}
