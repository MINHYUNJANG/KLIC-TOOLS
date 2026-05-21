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
      if (line.startsWith('</')) indent = Math.max(0, indent - 1);
      const result = '  '.repeat(indent) + line;
      if (!line.startsWith('</') && !line.endsWith('/>') && !VOID_TAGS.test(line) && !line.includes('</')) indent++;
      return result;
    })
    .filter(Boolean)
    .join('\n');

  // 보존된 script/style 블록 원위치 복원
  return processed.replace(/\x00(\d+)\x00/g, (_, i) => preserved[parseInt(i)]);
}
