import Groq from 'groq-sdk';
import * as cheerio from 'cheerio';

let _client = null;

const MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

const CEREBRAS_MODELS = ['llama3.3-70b', 'llama3.1-8b'];
const MAX_CHARS = 28000;

function getClient() {
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
}

function stripCodeFence(text) {
  return text.trim().replace(/^```(?:html)?\s*\n?(.*?)\n?```\s*$/s, '$1');
}

function truncateMessages(messages) {
  return messages.map(msg => {
    if (msg.role === 'user' && typeof msg.content === 'string' && msg.content.length > MAX_CHARS) {
      return { ...msg, content: msg.content.slice(0, MAX_CHARS) + '\n\n[내용이 너무 길어 일부 생략됨]' };
    }
    return msg;
  });
}

async function cerebrasChat(messages, maxTokens = 8192) {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) throw new Error('CEREBRAS_API_KEY가 설정되지 않았습니다.');

  let lastError;
  for (const model of CEREBRAS_MODELS) {
    for (const msgs of [messages, truncateMessages(messages)]) {
      try {
        const resp = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: msgs, max_tokens: maxTokens }),
        });
        if (!resp.ok) {
          lastError = new Error(`${resp.status}`);
          if ([429, 413].includes(resp.status)) break;
          throw lastError;
        }
        const data = await resp.json();
        return data.choices[0].message.content;
      } catch (e) {
        lastError = e;
      }
    }
  }
  throw new Error(`Cerebras 모든 모델에서 실패했습니다.\n(${lastError})`);
}

// finish_reason === 'length'(토큰 소진)일 때 이어쓰기 요청 (최대 3회)
async function chatWithContinuation(model, messages, maxTokens) {
  const client = getClient();
  let accumulated = '';
  let currentMessages = messages;
  const MAX_CONT = 3;

  for (let attempt = 0; attempt <= MAX_CONT; attempt++) {
    const result = await client.chat.completions.create({ model, max_tokens: maxTokens, messages: currentMessages });
    const choice = result.choices[0];
    accumulated += choice.message.content;

    if (choice.finish_reason !== 'length') break;
    if (attempt === MAX_CONT) break;

    // 잘린 경우: 지금까지 생성된 내용을 assistant 메시지로 붙이고 이어쓰기 요청
    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: choice.message.content },
      { role: 'user', content: '이어서 계속 작성해주세요. 앞 내용과 자연스럽게 연결되도록 HTML만 출력하세요.' },
    ];
  }

  return stripCodeFence(accumulated);
}

async function chat(messages, maxTokens = 16384) {
  const client = getClient();
  let lastError;

  for (const model of MODELS) {
    for (const msgs of [messages, truncateMessages(messages)]) {
      try {
        return await chatWithContinuation(model, msgs, maxTokens);
      } catch (e) {
        lastError = e;
        const status = e?.status ?? e?.statusCode;
        if ([429, 413].includes(status)) break;
        if (status === 400 && String(e).includes('decommissioned')) break;
        throw e;
      }
    }
  }

  // Groq 소진 → Cerebras 폴백
  const status = lastError?.status ?? lastError?.statusCode;
  if ([429, 413].includes(status) && process.env.CEREBRAS_API_KEY) {
    return stripCodeFence(await cerebrasChat(messages, maxTokens));
  }
  if ([429, 413].includes(status)) {
    throw new Error('오늘 사용할 수 있는 AI 토큰이 모두 소진되었습니다.');
  }
  throw new Error(`모든 모델에서 실패했습니다. 잠시 후 다시 시도해주세요.\n(${lastError})`);
}

// ─── 시스템 프롬프트 ──────────────────────────────────────────
const SYSTEM_TEMPLATE = '당신은 HTML 마크업 전문가입니다. 사용자가 제공하는 HTML 템플릿에 크롤링된 데이터를 적절히 배치하여 완성된 HTML을 반환합니다. 반드시 완성된 HTML 코드만 반환하고, 설명은 생략하세요.';

const SYSTEM_AUTO = `당신은 HTML 마크업 전문가입니다.
원문 텍스트를 아래 규칙에 따라 정확히 마크업하여 HTML 소스만 반환합니다. 설명·주석·코드블록 없이 HTML만 출력하세요.

[마크업 규칙]
1. 타이틀은 레벨에 따라 순서대로:
   <h2 class="tit1"></h2>
   <h3 class="tit2"></h3>
   <h4 class="tit3"></h4>

2. 타이틀 하위 내용은 <div class="indent"></div>로 감싸서 들여쓰기

3. 일반 텍스트는 <p></p>

4. 일반 리스트(순서 없음)는 레벨에 따라:
   <ul class="list_st1"></ul>
   <ul class="list_st2"></ul>
   <ul class="list_st3"></ul>
   하위 리스트는 상위 <li> 안에 넣기

5. 숫자가 있는 순서 리스트는:
   <ol class="list_ol1"></ol>
   <ol class="list_ol2"></ol>
   숫자는 <span class="num">1</span> 형식으로 작성
   ①②③ 같은 원문자는 1, 2, 3으로 변환
   숫자 뒤 '.', ',' 등 구두점 제거

6. ○, -, ※ 등 특수문자로 시작하는 리스트 항목은 해당 특수문자 제거 후 <li>에 넣기

7. 테이블:
   - 원본 테이블 HTML이 제공된 경우 그 구조(thead/tbody/th/td/colspan/rowspan 등)를 그대로 유지
   - 반드시 아래 래퍼로 감싸기:
   <div class="tbl-st scroll_gr">
     <table>
       <caption>thead의 th 항목들을 쉼표로 연결하여 "[항목1], [항목2], [항목3]의 정보를 포함한 표입니다." 형식으로 작성</caption>
       <colgroup><col><col>...</colgroup>
       <thead>...</thead>
       <tbody>...</tbody>
     </table>
   </div>
   - td 안에 리스트가 들어가는 경우 해당 td에 class="al" 추가
   - 기존 table 태그의 불필요한 속성(border, cellpadding, style 등)은 제거

8. 개인정보 처리절차 내용은:
   <div class="box_st2"><p class="rsp_img ac"><img src="/00_common/images/sub_com/img_personal1.png" alt=""></p></div>

9. 첫 부분에 "~바랍니다.", "~해주세요" 형태의 공지 문구가 있으면 <div class="box_st2">로 감싸기

10. 원문 텍스트는 절대 수정하지 말 것 (오타 포함 그대로 유지)
    - 단어 하나도 바꾸거나 고치지 말 것
    - 내용을 요약·축약·생략하지 말 것
    - 문단·항목의 순서를 임의로 바꾸지 말 것
    - 원문에 없는 내용을 추가하지 말 것
    - 원문의 모든 텍스트가 빠짐없이 출력에 포함되어야 함

11. section, div로 묶지 말 것 (규칙에 명시된 div 클래스 제외)

12. 모든 소스는 탭(\\t) 들여쓰기로 작성

13. 내용이 아무리 길어도 모든 내용을 한 번에 빠짐없이 출력하세요. 중간에 절대 멈추지 마세요.`;

const SYSTEM_EDIT = `당신은 HTML 마크업 전문가입니다.
사용자가 제공하는 HTML 코드를 지시사항에 따라 수정하여 완성된 HTML 소스만 반환합니다.
설명·주석·코드블록 없이 HTML만 출력하세요.
원문 텍스트는 절대 수정하지 마세요. 요약·축약·생략·순서 변경·내용 추가 금지. 모든 원문 텍스트가 빠짐없이 출력에 포함되어야 합니다.`;

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const CIRCLED_RE = new RegExp(`^([${CIRCLED}])\\s*`);
const NUM_DOT_RE = /^(\d+)[.)]\s*/;

// ─── 후처리: colgroup 자동 생성 + td/th 내 불필요 태그 제거 ──
function postProcessMarkup(html) {
  const $ = cheerio.load(html);

  // 1) ol > li 안에 원문자나 숫자. 이 그대로 남아있으면 <span class="num">으로 교체
  $('ol li').each((_, li) => {
    const $li = $(li);
    if ($li.find('> span.num').length) return;
    const inner = ($li.html() || '').trim();
    const cm = inner.match(CIRCLED_RE);
    if (cm) {
      const num = CIRCLED.indexOf(cm[1]) + 1;
      $li.html(`<span class="num">${num}</span>${inner.replace(CIRCLED_RE, '')}`);
      return;
    }
    const nm = inner.match(NUM_DOT_RE);
    if (nm) {
      $li.html(`<span class="num">${nm[1]}</span>${inner.replace(NUM_DOT_RE, '')}`);
    }
  });

  // p 그룹을 ol로 변환하는 공통 함수
  function convertPGroupToOl($parent, matchFn, startVal) {
    const children = $parent.children().toArray();
    let i = 0;
    while (i < children.length) {
      const $first = $(children[i]);
      if (!$first.is('p')) { i++; continue; }
      const firstHtml = ($first.html() || '').trim();
      if (!matchFn(firstHtml, startVal)) { i++; continue; }

      const group = [];
      let j = i, expected = startVal;
      while (j < children.length) {
        const $p = $(children[j]);
        if (!$p.is('p')) break;
        const ph = ($p.html() || '').trim();
        if (!matchFn(ph, expected)) break;
        const inner = ph.replace(CIRCLED_RE, '').replace(NUM_DOT_RE, '');
        group.push({ $el: $p, inner, num: typeof expected === 'number' ? expected : CIRCLED.indexOf(expected) + 1 });
        expected = typeof expected === 'number' ? expected + 1 : CIRCLED[CIRCLED.indexOf(expected) + 1];
        j++;
      }

      if (group.length >= 1) {
        const liHtml = group.map(g => `<li><span class="num">${g.num}</span>${g.inner}</li>`).join('');
        $first.before(`<ol class="list_ol1">${liHtml}</ol>`);
        group.forEach(g => g.$el.remove());
        i = j;
      } else {
        i++;
      }
    }
  }

  // 2) 연속된 <p>①...</p> 그룹 → <ol class="list_ol1">
  $('*').each((_, parent) => {
    convertPGroupToOl($(parent),
      (html, exp) => { const m = html.match(CIRCLED_RE); return m && m[1] === exp; },
      CIRCLED[0]
    );
  });

  // 3) 연속된 <p>1. ...</p> 그룹 → <ol class="list_ol1">
  $('*').each((_, parent) => {
    convertPGroupToOl($(parent),
      (html, exp) => { const m = html.match(NUM_DOT_RE); return m && parseInt(m[1]) === exp; },
      1
    );
  });

  // 4) ol > li > ol (중첩) → list_ol2
  $('ol li > ol').each((_, ol) => {
    $(ol).attr('class', 'list_ol2');
  });

  // 5) .indent 내 단독 strong p, 조항(제N조) p → h3.tit2
  $('.indent > p').each((_, p) => {
    const $p = $(p);
    const $ch = $p.children();
    const isOnlyStrong = $ch.length === 1 && $ch.first().is('strong') && ($p.text().trim() === $ch.first().text().trim());
    const isClause = /^제\s*\d+\s*조/.test($p.text().trim());
    if (isOnlyStrong || isClause) {
      $p.replaceWith(`<h3 class="tit2">${$p.html()}</h3>`);
    }
  });

  $('table').each((_, table) => {
    const $table = $(table);
    let maxCols = 0;

    $table.find('tr').each((_, row) => {
      let colCount = 0;
      $(row).find('td, th').each((_, cell) => {
        colCount += parseInt($(cell).attr('colspan') || '1', 10);
      });
      maxCols = Math.max(maxCols, colCount);
    });

    if (maxCols > 0) {
      $table.find('colgroup').remove();
      const width = Math.round(100 / maxCols);
      let cg = '<colgroup>';
      for (let k = 0; k < maxCols; k++) cg += `<col style="width:${width}%">`;
      cg += '</colgroup>';
      $table.prepend(cg);
    }

    // tbody 안에 th만 있는 tr이 있으면 thead로 이동
    $table.find('tbody').each((_, tbody) => {
      const $tbody = $(tbody);
      const headerRows = [];
      const $rows = $tbody.find('> tr');
      for (let r = 0; r < $rows.length; r++) {
        const $row = $($rows[r]);
        const cells = $row.find('td, th');
        const allTh = cells.length > 0 && cells.toArray().every(c => c.tagName === 'th');
        if (allTh) headerRows.push($row);
        else break;
      }
      if (headerRows.length > 0 && !$table.find('thead').length) {
        const $thead = $('<thead></thead>');
        headerRows.forEach($row => { $thead.append($row.clone()); $row.remove(); });
        const $colgroup = $table.find('colgroup');
        if ($colgroup.length) $colgroup.after($thead);
        else $table.prepend($thead);
        if ($tbody.find('> tr').length === 0) $tbody.remove();
      }
    });

    // thead: td → th 변환 + scope="col" 추가
    $table.find('thead tr').each((_, row) => {
      $(row).find('td, th').each((_, cell) => {
        const $cell = $(cell);
        if (cell.tagName.toLowerCase() === 'td') {
          const $th = $('<th></th>');
          $th.attr('scope', 'col');
          ['colspan', 'rowspan', 'class', 'id'].forEach(a => {
            const v = $cell.attr(a);
            if (v) $th.attr(a, v);
          });
          $th.html($cell.html() || '');
          $cell.replaceWith($th);
        } else {
          if (!$cell.attr('scope')) $cell.attr('scope', 'col');
        }
      });
    });

    // tbody: 첫 번째 셀이 th면 scope="row", 나머지 th는 td로 변환
    $table.find('tbody tr').each((_, row) => {
      $(row).find('td, th').each((idx, cell) => {
        const $cell = $(cell);
        if (cell.tagName.toLowerCase() === 'th') {
          if (idx === 0) {
            if (!$cell.attr('scope')) $cell.attr('scope', 'row');
          } else {
            const $td = $('<td></td>');
            ['colspan', 'rowspan', 'class', 'id'].forEach(a => {
              const v = $cell.attr(a);
              if (v) $td.attr(a, v);
            });
            $td.html($cell.html() || '');
            $cell.replaceWith($td);
          }
        }
      });
    });

    $table.find('td, th').each((_, cell) => {
      $(cell).find('p').each((_, p) => $(p).replaceWith($(p).contents()));
      $(cell).find('span').each((_, span) => {
        if (!$(span).attr('class')) $(span).replaceWith($(span).contents());
      });
    });
  });

  // 최상위 table에 직접 붙은 tbl-st 클래스를 wrapper div로 이동
  $('table').each((_, table) => {
    const $table = $(table);
    if ($table.parents('table').length > 0) return;
    $table.removeAttr('class');
    const $parent = $table.parent();
    if (!$parent.is('div') || !/\btbl-st\b/.test($parent.attr('class') || '')) {
      $table.wrap('<div class="tbl-st scroll_gr"></div>');
    }
  });

  const result = ($('body').html() || html).replace(/[ \t]{2,}/g, ' ');
  return tabIndent(result);
}

// ─── 탭 들여쓰기 ──────────────────────────────────────────────
function tabIndent(html) {
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const INLINE = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data',
    'dfn', 'em', 'i', 'kbd', 'mark', 'q', 'rp', 'rt', 'ruby',
    's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time',
    'u', 'var', 'wbr']);
  const COLLAPSE = new Set(['th', 'td', 'caption', 'li', 'p', 'h2', 'h3', 'h4', 'dt', 'dd']);

  const tokens = [];
  for (const m of html.matchAll(/(<!--[\s\S]*?-->|<[^>]+>|[^<]+)/g)) {
    if (m[1].trim()) tokens.push(m[1]);
  }

  const lines = [];
  let depth = 0;
  let i = 0;

  while (i < tokens.length) {
    const s = tokens[i].trim();

    if (/^<\//.test(s)) {
      depth = Math.max(0, depth - 1);
      lines.push('\t'.repeat(depth) + s);
      i++;
      continue;
    }

    if (s.startsWith('<!--')) {
      lines.push('\t'.repeat(depth) + s);
      i++;
      continue;
    }

    const tagM = s.match(/^<(\w+)/);
    if (tagM) {
      const tn = tagM[1].toLowerCase();

      if (VOID.has(tn) || s.endsWith('/>')) {
        lines.push('\t'.repeat(depth) + s);
        i++;
        continue;
      }

      if (COLLAPSE.has(tn)) {
        let j = i + 1, nested = 0;
        const parts = [];
        let hasBlock = false, foundClose = false;

        while (j < tokens.length) {
          const t = tokens[j].trim();
          const cm = t.match(/^<\/(\w+)/);
          const om = t.match(/^<(\w+)/);

          if (cm) {
            const cn = cm[1].toLowerCase();
            if (nested === 0 && cn === tn) { foundClose = true; break; }
            nested--;
            parts.push(t);
          } else if (om) {
            const cn = om[1].toLowerCase();
            if (!INLINE.has(cn) && !VOID.has(cn)) hasBlock = true;
            if (!VOID.has(cn) && !t.endsWith('/>')) nested++;
            parts.push(t);
          } else {
            parts.push(t);
          }
          j++;
        }

        if (foundClose && !hasBlock) {
          lines.push('\t'.repeat(depth) + s + parts.join('') + tokens[j].trim());
          i = j + 1;
          continue;
        }
      }

      lines.push('\t'.repeat(depth) + s);
      depth++;
      i++;
      continue;
    }

    if (s) lines.push('\t'.repeat(depth) + s);
    i++;
  }

  return lines.join('\n');
}

// ─── HTML 내 학교명 주입 (테이블 경로용) ─────────────────────
function injectSchoolNameInHtml(html, name) {
  if (!name) return html;
  const n = name;
  return html
    .replace(/>(에서 )/g, `>${n}$1`)
    .replace(/>(가 개인정보)/g, `>${n}$1`)
    .replace(/>(는 (?:파기|정보주체|이용자|위탁|개인정보|관리|전담|기술|암호))/g, `>${n}$1`)
    .replace(/>(의 개인정보 보호책임자)/g, `>${n}$1`)
    .replace(new RegExp(`([${CIRCLED}]\\s+)(는 |가 |은 )`, 'g'), `$1${n}$2`)
    .replace(/(는|은)( 에 대해)/g, `$1 ${n}에 대해`);
}

// ─── HTML 클린 (테이블 전처리용) ──────────────────────────────
function cleanHtml(html) {
  const $ = cheerio.load(html);
  $('script, style').remove();
  $('*').contents().each(function () {
    if (this.nodeType === 8) $(this).remove();
  });
  const keepAttrs = new Set(['colspan', 'rowspan', 'scope', 'headers', 'class', 'id', 'href', 'src', 'alt']);
  $('*').each((_, el) => {
    for (const attr of Object.keys(el.attribs || {})) {
      if (!keepAttrs.has(attr)) $(el).removeAttr(attr);
    }
  });
  return ($('body').html() || html)
    .replace(/\n\s*\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// ─── 공개 API ─────────────────────────────────────────────────
export async function editMarkup(html, instruction) {
  const prompt = `다음 HTML을 아래 지시사항에 따라 수정해주세요.\n\n[지시사항]\n${instruction}\n\n[HTML]\n${html}`;
  const result = await chat([
    { role: 'system', content: SYSTEM_EDIT },
    { role: 'user', content: prompt },
  ]);
  return postProcessMarkup(result);
}

export function mapToTemplate(templateHtml, crawledData) {
  const images = crawledData.images || [];
  let imageSection = '';
  if (images.length) {
    const lines = images.map(img =>
      `- src: ${img.src}\n  alt: ${img.alt}\n  OCR 텍스트: ${img.ocr_text}`
    );
    imageSection = '\n\n이미지 OCR 결과:\n' + lines.join('\n');
  }

  const prompt = `다음 HTML 템플릿에 크롤링된 데이터를 배치해주세요.\n\n[HTML 템플릿]\n${templateHtml}\n\n[크롤링된 데이터]\n텍스트:\n${crawledData.text}${imageSection}\n\n원본 HTML:\n${crawledData.html}\n\n템플릿의 구조를 유지하면서 크롤링된 데이터를 적절한 위치에 배치한 완성된 HTML을 반환해주세요.`;

  return chat([
    { role: 'system', content: SYSTEM_TEMPLATE },
    { role: 'user', content: prompt },
  ]);
}

// ─── 대용량 테이블 페이지용 직접 변환 (AI 없음) ─────────────────
// AI 청킹은 컨텍스트 단절로 구조가 깨지므로, 테이블이 많은 페이지는
// Cheerio로 직접 KLIC 클래스 매핑 → postProcessMarkup 으로 표 정규화
function directMarkupHtml(html) {
  const $ = cheerio.load(html);

  function processEl(el) {
    const tag = (el.tagName || '').toLowerCase();
    if (!tag) return '';
    const $el = $(el);

    // 빈 요소 제거 (테이블·이미지 없는 경우)
    if (!$el.text().trim() && !$el.find('table, img').length) return '';

    // 헤딩 → KLIC 클래스
    if (tag === 'h1' || tag === 'h2') return `<h2 class="tit1">${$el.html()}</h2>`;
    if (tag === 'h3')                  return `<h3 class="tit2">${$el.html()}</h3>`;
    if (tag === 'h4' || tag === 'h5' || tag === 'h6')
                                       return `<h4 class="tit3">${$el.html()}</h4>`;

    // 테이블 → tbl-st scroll_gr 래퍼
    if (tag === 'table') return `<div class="tbl-st scroll_gr">${$.html(el)}</div>`;

    // p → 그대로 유지
    if (tag === 'p') return $el.text().trim() ? `<p>${$el.html()}</p>` : '';

    // ul / ol → 그대로 유지
    if (tag === 'ul' || tag === 'ol') return $.html(el);

    // div·section 등 컨테이너: 자식 요소를 재귀 처리
    if (['div', 'section', 'article', 'main', 'aside', 'figure'].includes(tag)) {
      // 자식에 테이블이 바로 있으면 children 을 개별 처리
      const childParts = $el.children().toArray().map(processEl).filter(Boolean);
      // 자식이 전부 테이블/헤딩이면 flat 출력, 아니면 텍스트도 p로 감쌈
      return childParts.join('\n');
    }

    // 그 외 인라인·텍스트 포함 요소
    const text = $el.text().trim();
    return text ? `<p>${text}</p>` : '';
  }

  const parts = $('body').children().toArray().map(processEl).filter(Boolean);
  return parts.join('\n');
}

export async function autoMarkup(crawledData) {
  const rawHtml = crawledData.html || '';
  const text = crawledData.text || '';

  const $ = cheerio.load(rawHtml);
  const tableCount = $('table').length;
  const hasTable = tableCount > 0;

  const images = crawledData.images || [];
  const ocrLines = images.map(img => img.ocr_text).filter(Boolean);
  const ocrSection = ocrLines.length ? '\n\n[이미지 OCR 텍스트]\n' + ocrLines.join('\n') : '';

  if (hasTable) {
    const cleaned = injectSchoolNameInHtml(cleanHtml(rawHtml), crawledData.school_name);

    // 테이블이 많거나 내용이 길면 AI 없이 직접 변환
    if (tableCount > 4 || cleaned.length > 8000) {
      return postProcessMarkup(directMarkupHtml(cleaned));
    }

    // 테이블이 적고 내용이 짧으면 AI 단일 호출
    const result = await chat([
      { role: 'system', content: SYSTEM_AUTO },
      { role: 'user', content:
          '다음 원본 HTML을 마크업 규칙에 따라 변환해주세요.\n' +
          '테이블은 반드시 원본 구조(th, td, rowspan, colspan 등)를 그대로 유지하고 규칙의 래퍼 클래스만 적용하세요.\n' +
          '테이블을 절대 리스트나 p 태그로 변환하지 마세요.\n' +
          '원문 텍스트는 절대 수정·요약·생략·재배치하지 말고 모든 내용을 빠짐없이 그대로 출력하세요.\n\n' +
          `[원본 HTML]\n${cleaned}${ocrSection}`,
      },
    ], 32768);
    return postProcessMarkup(result);
  }

  const result = await chat([
    { role: 'system', content: SYSTEM_AUTO },
    { role: 'user', content:
        '다음 원문을 마크업해주세요.\n' +
        '원문 텍스트는 절대 수정·요약·생략·재배치하지 말고 모든 내용을 빠짐없이 그대로 출력하세요.\n\n' +
        text + ocrSection,
    },
  ], 32768);
  return postProcessMarkup(result);
}
