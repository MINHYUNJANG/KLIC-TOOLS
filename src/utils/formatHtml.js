const VOID_TAGS = /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)[\s/>]/i;
const TOKEN_RE = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g;

export function formatHtml(html) {
  // script/style 블록은 포맷 대상에서 제외하고 원본 그대로 유지
  const preserved = [];
  const processed = html.replace(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/gi, match => {
    preserved.push(match);
    return `\x00${preserved.length - 1}\x00`;
  });

  const tokens = processed.match(TOKEN_RE) || [];
  const lines = [];
  let indent = 0;
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    if (!tok.startsWith('<')) {
      const text = tok.trim();
      if (text) lines.push('    '.repeat(indent) + text);
      i++;
      continue;
    }

    if (tok.startsWith('<!--')) {
      lines.push('    '.repeat(indent) + tok.trim());
      i++;
      continue;
    }

    if (tok.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      lines.push('    '.repeat(indent) + tok);
      i++;
      continue;
    }

    if (VOID_TAGS.test(tok) || /\/>\s*$/.test(tok)) {
      lines.push('    '.repeat(indent) + tok);
      i++;
      continue;
    }

    // 태그명 뒤에 텍스트만 오고 곧바로 같은 태그가 닫히는 단순 리프 요소(예: <td>내용</td>)는
    // 한 줄로 유지한다. 그래야 표/목록처럼 리프 요소가 많은 마크업이 장황해지지 않는다.
    // 그 외의 경우, 특히 "<strong>라벨</strong> 값</li>"처럼 자기 태그는 닫혔지만 뒤에
    // 조상 태그의 닫는 태그가 이어붙는 줄은 </li> 몫의 들여쓰기 감소가 누락되던 버그가
    // 있었는데, 토큰 단위로 처리하면서 자연히 해결됐다.
    const name = (tok.match(/^<([a-zA-Z0-9]+)/) || [])[1]?.toLowerCase();
    const next1 = tokens[i + 1];
    const next2 = tokens[i + 2];
    const isSimpleLeaf = name && next1 && !next1.startsWith('<') &&
      next2 && next2.toLowerCase() === `</${name}>`;
    if (isSimpleLeaf) {
      lines.push('    '.repeat(indent) + tok + next1.trim() + next2);
      i += 3;
      continue;
    }

    lines.push('    '.repeat(indent) + tok);
    indent++;
    i++;
  }

  // 보존된 script/style 블록 원위치 복원
  return lines.join('\n').replace(/\x00(\d+)\x00/g, (_, idx) => preserved[parseInt(idx)]);
}
