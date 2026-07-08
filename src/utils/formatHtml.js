const VOID_TAGS = /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)[\s>]/i

export function formatHtml(html) {
  // script/style 블록은 포맷 대상에서 제외하고 원본 그대로 유지
  const preserved = [];
  let processed = html.replace(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/gi, match => {
    preserved.push(match);
    return `\x00${preserved.length - 1}\x00`;
  });

  let indent = 0;
  processed = processed
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map(line => {
      line = line.trim();
      if (!line) return '';
      // '<'로 시작하지 않는 줄(순수 텍스트, 혹은 원본에 있던 개행으로 쪼개진 텍스트+<br> 등)은
      // 태그가 아니므로 들여쓰기 단계를 바꾸지 않는다.
      const isTag = line.startsWith('<');
      const isClosingTag = isTag && line.startsWith('</');
      if (isClosingTag) indent = Math.max(0, indent - 1);
      const result = '    '.repeat(indent) + line;
      const opensNewLevel = isTag && !isClosingTag && !line.endsWith('/>') && !VOID_TAGS.test(line) && !line.includes('</');
      if (opensNewLevel) indent++;
      return result;
    })
    .filter(Boolean)
    .join('\n');

  // 보존된 script/style 블록 원위치 복원
  return processed.replace(/\x00(\d+)\x00/g, (_, i) => preserved[parseInt(i)]);
}
