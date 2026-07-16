import Groq from 'groq-sdk';
import * as cheerio from 'cheerio';

let _client = null;

const MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
];

const CEREBRAS_MODELS = ['gpt-oss-120b', 'zai-glm-4.7'];
const MAX_CHARS = 28000;
const CEREBRAS_MAX_TOKENS = 8192;  // Cerebras 모델 최대 출력 토큰 한계
const CEREBRAS_MAX_CHARS = 12000;  // Cerebras 컨텍스트 초과 방지용 입력 제한

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

function getMaxTableColumnCount($, table) {
  return Math.max(0, ...$(table).find('tr').toArray().map(row =>
    $(row).children('th, td').toArray().reduce((sum, cell) => {
      const span = parseInt($(cell).attr('colspan') || '1', 10);
      return sum + (Number.isFinite(span) && span > 0 ? span : 1);
    }, 0)
  ));
}

function shouldUseWideTableScroll($, table) {
  const maxCols = getMaxTableColumnCount($, table);
  if (maxCols >= 8) return true;
  const headerTextLength = $(table)
    .find('thead th, tr:first-child th, tr:first-child td')
    .toArray()
    .reduce((sum, cell) => sum + $(cell).text().replace(/\s+/g, '').length, 0);
  return maxCols >= 6 && headerTextLength >= 36;
}

function tableWrapperClass($, table) {
  return shouldUseWideTableScroll($, table) ? 'tbl-st scroll-w' : 'tbl-st';
}

function tableWrapperClassFromHtml(tableHtml) {
  const $tableDoc = cheerio.load(tableHtml || '', { decodeEntities: false });
  const table = $tableDoc('table').first().get(0);
  return table ? tableWrapperClass($tableDoc, table) : 'tbl-st';
}

// 크롤링 원본 표는 rowspan/colspan이 실제 행·열 수와 맞지 않아 화면에서 밀리거나
// 깨져 보이는 경우가 있다(예: rowspan이 남은 행 수보다 큼, 일부 행에 셀이 누락돼
// 다른 행보다 짧음). rowspan이 실제로 점유하는 열까지 추적해 표의 진짜 그리드를
// 재구성한 뒤, 남은 행 수를 넘는 rowspan은 클램프하고, 다른 행보다 짧은 행은 끝에
// 빈 셀을 채워 표 구조를 바로잡는다. 반환값은 보정된 표의 실제 최대 열 수.
function normalizeTableGrid($, table) {
  const $table = $(table);
  const rows = $table.find(':scope > tr, :scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr').toArray();
  if (!rows.length) return 0;

  const totalRows = rows.length;
  const occupied = rows.map(() => new Set());
  const rowWidths = [];

  rows.forEach((row, rowIndex) => {
    const cells = $(row).children('th, td').toArray();
    let col = 0;
    cells.forEach(cell => {
      while (occupied[rowIndex].has(col)) col++;

      let colspan = parseInt($(cell).attr('colspan') || '1', 10);
      if (!Number.isFinite(colspan) || colspan < 1) colspan = 1;
      let rowspan = parseInt($(cell).attr('rowspan') || '1', 10);
      if (!Number.isFinite(rowspan) || rowspan < 1) rowspan = 1;

      const maxRowspan = totalRows - rowIndex;
      if (rowspan > maxRowspan) {
        rowspan = maxRowspan;
        $(cell).attr('rowspan', String(rowspan));
      }
      if (rowspan <= 1) $(cell).removeAttr('rowspan');

      for (let r = rowIndex + 1; r < rowIndex + rowspan && r < totalRows; r++) {
        for (let c = col; c < col + colspan; c++) occupied[r].add(c);
      }

      col += colspan;
    });
    rowWidths.push(col);
  });

  // 각 행의 실제 커버리지 = 실제 셀들이 도달한 위치(rowWidths)와, rowspan으로 점유된
  // 열 중 실제 셀 뒤로 남는 부분(occupied 최댓값+1) 중 더 큰 쪽. 실제 셀 진행 중에
  // 이미 건너뛴 점유 열은 rowWidths에 반영되어 있으므로 단순히 개수를 더하면
  // 이중으로 계산된다 — 뒤쪽에 남는(실제 셀보다 더 먼 위치의) 점유 열만 추가로 본다.
  const covered = rows.map((_, i) => {
    const occ = occupied[i];
    const maxOccupiedEnd = occ.size ? Math.max(...occ) + 1 : 0;
    return Math.max(rowWidths[i], maxOccupiedEnd);
  });
  const maxCols = Math.max(0, ...covered);

  rows.forEach((row, rowIndex) => {
    const missing = maxCols - covered[rowIndex];
    for (let i = 0; i < missing; i++) $(row).append('<td></td>');
  });

  return maxCols;
}

async function cerebrasChat(messages, maxTokens = CEREBRAS_MAX_TOKENS) {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) throw new Error('CEREBRAS_API_KEY가 설정되지 않았습니다.');

  // Cerebras는 max_tokens 8192 초과 불가, 입력도 컨텍스트 초과 방지용 별도 truncate
  const cappedTokens = Math.min(maxTokens, CEREBRAS_MAX_TOKENS);
  const truncateForCerebras = (msgs) => msgs.map(msg => {
    if (msg.role === 'user' && typeof msg.content === 'string' && msg.content.length > CEREBRAS_MAX_CHARS) {
      return { ...msg, content: msg.content.slice(0, CEREBRAS_MAX_CHARS) + '\n\n[내용이 너무 길어 일부 생략됨]' };
    }
    return msg;
  });

  let lastError;
  for (const model of CEREBRAS_MODELS) {
    for (const msgs of [truncateForCerebras(messages), truncateForCerebras(truncateMessages(messages))]) {
      try {
        const resp = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: msgs, max_tokens: cappedTokens }),
        });
        if (!resp.ok) {
          let body = '';
          try { body = await resp.text(); } catch {}
          console.error(`[Cerebras] ${model} → HTTP ${resp.status}: ${body.slice(0, 300)}`);
          lastError = new Error(`${resp.status}: ${body.slice(0, 200)}`);
          if ([400, 404, 413, 429].includes(resp.status)) break;
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
        console.warn(`[Groq] ${model} → HTTP ${status ?? 'unknown'}: ${String(e).slice(0, 200)}`);
        if (status === 413) continue;
        if (status === 429) break;
        if (status === 400 && (String(e).includes('decommissioned') || String(e).includes('context_length_exceeded') || String(e).includes('too many tokens'))) break;
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
0. 서브 네비게이션(위치 표시줄·브레드크럼·LNB·현재 위치 경로 텍스트 등)은 마크업에서 완전히 제외할 것

1. 타이틀은 계층에 따라:
   <h3 class="tit-st section"></h3>   ← 최상위 타이틀
   <h4 class="tit-st contents"></h4>  ← 2단계 타이틀
   <h5 class="tit-st unit"></h5>      ← 3단계 타이틀
   <h6 class="tit-st item"></h6>      ← 4단계 타이틀

   [타이틀 판단 기준 - 내용·클래스 분석]
   - 소스 HTML 태그보다 내용과 문맥을 우선하여 타이틀 여부를 판단할 것
   - class에 'tit' 또는 'title'이 포함된 요소(예: tit_list, tit_st, title_wrap 등)는 반드시 타이틀로 간주하여 계층에 맞는 헤딩으로 변환
   - 짧은 단독 텍스트(약 50자 이하)이고 앞뒤에 본문 내용이 이어지는 구조이면 타이틀로 판단
   - 문서 전체에서 가장 상위 제목(페이지 주제) → h3.tit-st section
   - 그 아래 각 섹션 제목들 → h4.tit-st contents
   - "OO학교 개인정보처리방침" 형태의 타이틀은 소스 태그 무관하게 항상 h3.tit-st section
   - "주요 개인정보 처리 표시(라벨링)", "목차" 등 단독 섹션 구분 텍스트 → h4.tit-st contents

2. h4(tit-st contents) 타이틀 바로 아래의 모든 내용은 <div class="indent"></div>로 감싸기

3. 일반 텍스트는 <p></p>

4. 일반 리스트(순서 없음)는 레벨에 따라:
   <ul class="bu-st1 list"></ul>  ← 1단계
   <ul class="bu-st2 list"></ul>  ← 2단계
   <ul class="bu-st3 list"></ul>  ← 3단계
   <ul class="bu-st4 list"></ul>  ← 4단계
   하위 리스트는 상위 <li> 안에 넣기

5. 숫자가 있는 순서 리스트는:
   <ol class="order-st1"></ol>  ← 1단계
   <ol class="order-st2"></ol>  ← 2단계
   <ol class="order-st3"></ol>  ← 3단계
   숫자는 <span class="mrk">1</span> 형식으로 작성
   ①②③ 같은 원문자는 1, 2, 3으로 변환
   원문에 있던 "1.", "1)" 같은 원래 번호 표기는 <span class="mrk">로 옮겼으므로 항목 내용
   맨 앞에서 완전히 삭제할 것 (예: "1. 제목" → <span class="mrk">1</span>제목, "1. "이
   본문에 그대로 남아 숫자가 두 번 나오면 안 됨)

6. ○, -, ※ 등 특수문자로 시작하는 리스트 항목은 해당 특수문자 제거 후 <li>에 넣기

7. 테이블:
   - 원본 테이블 HTML이 제공된 경우 그 구조(thead/tbody/th/td/colspan/rowspan 등)를 그대로 유지
   - 반드시 아래 래퍼로 감싸기:
   <div class="tbl-st scroll-w">
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

9. 개인정보처리방침 최상위 타이틀(h3.tit-st.section) 바로 아래 안내 문장:
   <div class="box-st emp"><p>문단1<br>문단2</p></div>
   - 여러 문단은 <br>로 연결하여 하나의 <p> 안에 넣기 (p에 class 없음)
   - "~바랍니다.", "~해주세요" 형태의 공지 문구도 동일하게 box-st emp 처리

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
const HANGUL_MARKERS = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
const MARKER_RE = /^(\d+|[가-힣])[.)]\s*/;
const OL_CLASSES = ['order-st1', 'order-st2', 'order-st3'];

function prevMarker(marker) {
  if (/^\d+$/.test(marker)) {
    const n = parseInt(marker, 10) - 1;
    return n >= 1 ? String(n) : null;
  }
  const idx = HANGUL_MARKERS.indexOf(marker);
  return idx > 0 ? HANGUL_MARKERS[idx - 1] : null;
}

// 연도·전화번호 등 우연히 숫자/가나다로 시작하는 일반 텍스트가 순번 리스트로 오인되지
// 않도록, "1" 또는 "가"로 시작해서 순차 증가하는 진짜 순번인지 검증할 때 사용
function isStartMarker(marker) {
  return marker === '1' || marker === HANGUL_MARKERS[0];
}
function nextMarker(marker) {
  if (/^\d+$/.test(marker)) return String(parseInt(marker, 10) + 1);
  const idx = HANGUL_MARKERS.indexOf(marker);
  return idx >= 0 && idx + 1 < HANGUL_MARKERS.length ? HANGUL_MARKERS[idx + 1] : null;
}

// 상위 li 안에서 첫 번째 하위 번호만 텍스트로 남은 경우(예: 중첩 ol이 2부터 시작하고
// "1. ..." 텍스트가 상위 li에 그대로 남는 경우) 바로 뒤 ol의 첫 li로 이동
// 중첩 ol 바로 앞의 <br>이 아니라, ol의 첫 li 마커보다 하나 앞선 마커로 시작하는
// 텍스트 노드를 역순으로 찾아서 이동 대상을 정확히 판별한다
function pullLooseTextBeforeNestedOl($) {
  $('li').each((_, li) => {
    const $li = $(li);
    $li.children('ol').each((_, ol) => {
      const children = $li.contents().toArray();
      const olIndex = children.indexOf(ol);
      if (olIndex <= 0) return;

      const $ol = $(ol);
      const firstMarker = $ol.children('li').first().children('span.mrk').first().text().trim();
      const expected = firstMarker ? prevMarker(firstMarker) : null;
      if (!expected) return;

      let start = -1;
      for (let idx = olIndex - 1; idx >= 0; idx--) {
        const node = children[idx];
        if (node.type !== 'text') continue;
        const m = node.data.replace(/^\s+/, '').match(MARKER_RE);
        if (m) {
          if (m[1] === expected) start = idx;
          break;
        }
      }
      if (start === -1) return;

      const segmentNodes = children.slice(start, olIndex);
      const segmentHtml = segmentNodes.map((node, i) => {
        if (node.type !== 'text') return $.html(node);
        return i === 0 ? node.data.replace(/^\s+/, '') : node.data;
      }).join('');
      const m = segmentHtml.match(MARKER_RE);
      if (!m) return;

      const marker = m[1];
      const body = segmentHtml.slice(m[0].length).trim();
      if (!body) return;

      $ol.prepend(`<li><span class="mrk">${marker}</span>${body}</li>`);
      segmentNodes.forEach(node => $(node).remove());
    });
  });
}

// .tbl-st 내 table td의 정렬 클래스(center/left/right)를 프로젝트 표준 클래스(ac/al/ar)로 변환
const ALIGN_CLASS_MAP = { center: 'ac', left: 'al', right: 'ar' };
function normalizeTableAlignClasses($) {
  $('.tbl-st table td[class]').each((_, td) => {
    const $td = $(td);
    const classes = ($td.attr('class') || '').split(/\s+/).filter(Boolean).map(c => ALIGN_CLASS_MAP[c] || c);
    $td.attr('class', classes.join(' '));
  });

  // 아이콘(img) + 라벨 텍스트가 같은 td에 함께 있는 표(라벨링/목차 요약표 등)는
  // cleanHtml에서 원본 인라인 style이 모두 제거되어 아이콘이 원본 크기로 커지고
  // 텍스트와 높이가 어긋난다. 좌측 정렬 + 아이콘 고정 크기·수직 중앙 정렬을 강제한다.
  $('.tbl-st table td').each((_, td) => {
    const $td = $(td);
    const $imgs = $td.find('img');
    if (!$imgs.length || !$td.text().trim()) return;
    if (!$td.attr('class')) $td.attr('class', 'al');
    $imgs.attr('style', 'width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;');
  });
}

// ─── 후처리: colgroup 자동 생성 + td/th 내 불필요 태그 제거 ──
function postProcessMarkup(html) {
  const $ = cheerio.load(html);

  // 1) ol > li 안에 원문자나 숫자. 이 그대로 남아있으면 <span class="num">으로 교체
  $('ol li').each((_, li) => {
    const $li = $(li);
    const $mrk = $li.children('span.mrk').first();
    if ($mrk.length) {
      // span.mrk가 이미 있어도 그 안의 내용 자체가 원문자(①②③...)로 안 바뀐 채
      // 남아있는 경우가 있다(예: 원본이 첫 항목만 "①"을 쓰고 이후는 "2." "3."처럼
      // 아라비아 숫자를 섞어 쓰는 경우, 항목마다 따로 처리되며 첫 항목만 변환이 빠짐).
      // 원문자면 번호로 바꿔서 같은 목록 안에서 표기가 일관되게 한다.
      const mrkText = $mrk.text().trim();
      const idx = CIRCLED.indexOf(mrkText);
      const num = idx >= 0 ? String(idx + 1) : mrkText;
      if (idx >= 0) $mrk.text(num);
      // AI 변환 경로 등에서 span.mrk는 만들어졌지만 원문의 "1. " 같은 원래 번호 표기가
      // 본문 맨 앞에 그대로 남아 숫자가 두 번(마커 + 텍스트) 나오는 경우가 있다 —
      // mrk 바로 뒤 내용이 같은 번호로 다시 시작하면 그 중복 접두사를 제거한다.
      const $rest = $li.clone();
      $rest.children('span.mrk').first().remove();
      const restHtml = $rest.html() || '';
      const dupRe = new RegExp(`^(?:\\s|<br\\s*/?>)*${num}\\s*[.)]\\s*`);
      if (num && dupRe.test(restHtml)) {
        $li.html(`<span class="mrk">${num}</span>${restHtml.replace(dupRe, '')}`);
      }
      return;
    }
    const inner = ($li.html() || '').trim();
    const cm = inner.match(CIRCLED_RE);
    if (cm) {
      const num = CIRCLED.indexOf(cm[1]) + 1;
      $li.html(`<span class="mrk">${num}</span>${inner.replace(CIRCLED_RE, '')}`);
      return;
    }
    const nm = inner.match(NUM_DOT_RE);
    if (nm) {
      $li.html(`<span class="mrk">${nm[1]}</span>${inner.replace(NUM_DOT_RE, '')}`);
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
        const liHtml = group.map(g => `<li><span class="mrk">${g.num}</span>${g.inner}</li>`).join('');
        $first.before(`<ol class="order-st1">${liHtml}</ol>`);
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

  // 3.5) 상위 li 안에서 첫 번째 하위 번호만 텍스트로 남은 경우 바로 뒤 ol의 첫 li로 이동
  pullLooseTextBeforeNestedOl($);

  // 3.6) order-st li 안에 <br>로 이어져 "1. ..." "2. ..." 형태의 하위 번호가 일반
  //      텍스트로만 남아있으면 order-st2 중첩 리스트로 변환한다. 번호형 항목 각각에
  //      제목 뒤 <br>로 이어지는 설명 문단이 딸려있어도(예: "1. 파기절차<br>설명...
  //      <br>2. 파기방법<br>설명...") 다음 번호가 나오기 전까지는 같은 항목의 본문으로
  //      묶는다. (예: 상위 항목 설명 뒤에 번호만 붙은 채 딸려오는 경우 — 번호가 있는데도
  //      일반 리스트로도 안 만들어지고 그냥 묻히는 문제 방지)
  $('ol[class*="order-st"] > li').each((_, li) => {
    const $li = $(li);
    if ($li.children('ol').length) return; // 이미 하위 리스트가 있으면 건드리지 않음
    const html = $li.html() || '';
    const segments = html.split(/<br\s*\/?>/i);
    if (segments.length < 2) return;

    // "1."로 시작하는 첫 세그먼트를 순번 시작점으로 본다 (맨 앞이면 상위 리드 텍스트가
    // 없다는 뜻이라 이 규칙 대상이 아니다 — 그 경우는 3.9의 ul 승격 등 다른 경로에서 처리).
    const startIdx = segments.findIndex(seg => {
      const m = seg.trim().match(NUM_DOT_RE);
      return m && parseInt(m[1], 10) === 1;
    });
    if (startIdx < 1) return;

    const items = [];
    let i = startIdx;
    let expected = 1;
    while (i < segments.length) {
      const seg = segments[i].trim();
      const m = seg.match(NUM_DOT_RE);
      if (!m || parseInt(m[1], 10) !== expected) break;
      const title = seg.replace(NUM_DOT_RE, '');
      const bodyParts = [];
      let j = i + 1;
      while (j < segments.length) {
        const nextSeg = segments[j].trim();
        const nm = nextSeg.match(NUM_DOT_RE);
        if (nm && parseInt(nm[1], 10) === expected + 1) break;
        bodyParts.push(nextSeg);
        j++;
      }
      items.push({ num: expected, title, body: bodyParts.join('<br>') });
      expected++;
      i = j;
    }
    if (items.length < 2) return; // 진짜 순번 목록(2개 이상)일 때만 승격

    const leadHtml = segments.slice(0, startIdx).join('<br>').trim();
    const trailingSegs = segments.slice(i);
    const trailingHtml = trailingSegs.length ? trailingSegs.join('<br>').trim() : '';
    const subItemsHtml = items
      .map(it => `<li><span class="mrk">${it.num}</span>${it.title}${it.body ? '<br>' + it.body : ''}</li>`)
      .join('');

    $li.html(`${leadHtml}<ol class="order-st2">${subItemsHtml}</ol>${trailingHtml ? '<br>' + trailingHtml : ''}`);
  });

  // 3.9) 원문이 순서 리스트를 <ul>로 잘못 마크업해서 li마다 "1." "2." 또는 "①②③"
  //      번호가 텍스트로 그대로 남아있는 경우(학교 사이트에 흔함), 번호를 span.mrk로
  //      추출하고 ol.order-st1로 승격한다. li 전체가 1(또는 ①)부터 순차 증가하는
  //      진짜 순번일 때만 승격해 우연히 숫자로 시작하는 일반 목록은 건드리지 않는다.
  $('ul').each((_, ul) => {
    const $ul = $(ul);
    const liArr = $ul.children('li').toArray();
    if (liArr.length < 2) return;

    const asCircled = liArr.map(li => {
      const m = $(li).text().trim().match(CIRCLED_RE);
      return m ? CIRCLED.indexOf(m[1]) + 1 : null;
    });
    const asArabic = liArr.map(li => {
      const m = $(li).text().trim().match(NUM_DOT_RE);
      return m ? parseInt(m[1], 10) : null;
    });
    const isSequential = nums => nums.every((n, idx) => n === idx + 1);

    let re = null;
    if (asCircled.every(n => n !== null) && isSequential(asCircled)) re = CIRCLED_RE;
    else if (asArabic.every(n => n !== null) && isSequential(asArabic)) re = NUM_DOT_RE;
    if (!re) return;

    liArr.forEach((li, idx) => {
      const $li = $(li);
      const html = ($li.html() || '').trim();
      $li.html(`<span class="mrk">${idx + 1}</span>${html.replace(re, '')}`);
    });
    $ul.replaceWith(`<ol class="order-st1">${$ul.html()}</ol>`);
  });

  // 4) ul/ol 계층별 클래스 자동 할당 (tab-st 내부 ul은 탭 내비게이션이므로 건드리지 않음)
  // 이미 bu-st1~4가 명시적으로 지정된 ul(예: 이전 개인정보처리방침 목록처럼 중첩 깊이와
  // 무관하게 의미상 2단계로 취급해야 하는 목록)은 앞선 단계의 판단을 존중해 건드리지 않는다.
  const UL_CLASSES = ['bu-st1', 'bu-st2', 'bu-st3', 'bu-st4'];
  const LIST_NUM_RE = /list_0*([1-4])(?!\d)/i;
  $('ul').each((_, ul) => {
    if ($(ul).parent().hasClass('tab-st')) return;
    if (/\bbu-st[1-4]\b/.test($(ul).attr('class') || '')) return;
    const m = ($(ul).attr('class') || '').match(LIST_NUM_RE);
    if (m) {
      $(ul).attr('class', `bu-st${m[1]} list`);
    } else {
      $(ul).attr('class', UL_CLASSES[Math.min($(ul).parents('ul').length, 3)] + ' list');
    }
  });
  $('ol').each((_, ol) => {
    const $ol = $(ol);
    const firstMarker = $ol.children('li').first().children('span.mrk').first().text().trim();
    if (/^[가-힣]$/.test(firstMarker)) {
      $ol.attr('class', 'order-st3');
    } else if ($ol.parents('ol').length > 0) {
      $ol.attr('class', 'order-st2');
    } else {
      $ol.attr('class', OL_CLASSES[Math.min($ol.parents('ol').length, 2)]);
    }
  });
  $('ol[class*="order-st"] > li > strong').each((_, strong) => {
    const $strong = $(strong);
    $strong.replaceWith($strong.contents());
  });

  // 4.5) h3.tit-st.section이 없을 때 개인정보처리방침 p → h3.tit-st section 승격 (AI 누락 폴백)
  //      "본 개인정보처리방침을 통해 ~ 안내드리겠습니다" 같은 본문 문장이 오탐되지
  //      않도록, "개인정보처리방침" 문구가 텍스트 끝부분(약간의 후행 기호만 허용)에
  //      와야 진짜 페이지 타이틀로 인정한다.
  if (!$('h3.section, h3.tit-st').length) {
    $('p').filter((_, p) => {
      const t = $(p).text().trim();
      if (t.length >= 100) return false;
      const m = t.match(/개인정보\s*(?:처리|보호)\s*방침/);
      if (!m) return false;
      const tail = t.slice(m.index + m[0].length);
      return tail.replace(/[\s\-–·.·]/g, '').length <= 3;
    }).first().each((_, p) => {
      const $p = $(p);
      $p.replaceWith(`<h3 class="tit-st section">${$p.html()}</h3>`);
    });
  }

  // 5) 조항(제N조) p → h4.tit-st contents (최상위 + .indent 내부 모두 처리)
  //    .indent 내 단독 strong p도 동일하게 변환
  $('p').each((_, p) => {
    const $p = $(p);
    const $ch = $p.children();
    const text = $p.text().trim();
    const isClause = /^제\s*\d+\s*조/.test(text) && text.length < 80;
    const isOnlyStrong = $p.closest('.indent').length > 0 &&
      $ch.length === 1 && $ch.first().is('strong') && text === $ch.first().text().trim();
    if (isClause || isOnlyStrong) {
      $p.replaceWith(`<h4 class="tit-st contents">${$p.html()}</h4>`);
    }
  });

  // 5.5) "제N조"만 있는 단독 타이틀 바로 뒤에 같은 레벨의 타이틀이 이어지면(원문이
  //      조항 번호<a name>와 조항명을 서로 다른 태그로 나눠둔 경우) 하나의 타이틀로
  //      합친다. 조항 번호만으로는 온전한 제목이 아니므로 둘을 나눠 씌우지 않는다.
  const CLAUSE_ONLY_RE = /^제\s*\d+\s*조[.)]?$/;
  $('h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    if (!/tit-st/.test(cls)) return;
    if (!CLAUSE_ONLY_RE.test($el.text().trim())) return;
    const tag = (el.tagName || '').toLowerCase();
    const $next = $el.next();
    if (!$next.length) return;
    const nextTag = ($next.get(0)?.tagName || '').toLowerCase();
    if (nextTag !== tag || !/tit-st/.test($next.attr('class') || '')) return;
    $el.html(`${$el.html()} ${$next.html()}`);
    $next.remove();
  });

  // 6) h4.contents 직후 요소들을 .indent로 감싸기 (AI 미처리 또는 직접변환 경로 대비)
  //    단, "주요 개인정보 처리 표시(라벨링)"·"목차" 아이콘 요약표는 전체 너비로
  //    보여줘야 하므로 indent(좌측 여백)를 적용하지 않는다.
  const NO_INDENT_HEADING_RE = /^주요\s*개인정보\s*처리\s*표시(?:\s*\(라벨링\))?$|^목차$/;
  $('h4.contents').each((_, h4) => {
    const $h4 = $(h4);
    if ($h4.next().hasClass('indent')) return;
    if (NO_INDENT_HEADING_RE.test($h4.text().trim())) return;
    // box-st(박스)·tbl-st(표)는 그 자체로 이미 시각적으로 구분되므로 .indent 좌측
    // 여백을 추가로 씌울 필요가 없다.
    if (/\b(?:box-st|tbl-st)\b/.test($h4.next().attr('class') || '')) return;

    const toWrap = [];
    let $cur = $h4.next();
    while ($cur.length) {
      const tn = ($cur.get(0)?.tagName || '').toLowerCase();
      const cls = $cur.attr('class') || '';
      if (['h3', 'h4', 'h5', 'h6'].includes(tn) && cls.includes('tit-st')) break;
      toWrap.push($cur.get(0));
      $cur = $cur.next();
    }

    if (toWrap.length) {
      const $indent = $('<div class="indent"></div>');
      $(toWrap[0]).before($indent);
      toWrap.forEach(el => $indent.append(el));
    }
  });

  // 6-0.5) .indent 안의 유일한 내용이 box-st·tbl-st인 경우 래퍼를 벗긴다. [데이터표_N]
  //        플레이스홀더가 먼저 .indent로 감싸진 뒤 실제 표로 치환되는 경로(footerAutoMarkup)
  //        때문에 생기는 이중 래핑을 정리한다.
  $('.indent').each((_, div) => {
    const $div = $(div);
    const $children = $div.children();
    if ($children.length !== 1) return;
    if (!/\b(?:box-st|tbl-st)\b/.test($children.attr('class') || '')) return;
    $div.replaceWith($children);
  });

  // 7) 헤딩 내 img·아이콘 요소 제거 (장식용 아이콘 → 텍스트만 유지)
  //    단, "목차" 요약표(라벨링) 관례를 쓰는 개인정보처리방침 페이지는 각 조항 제목
  //    앞에도 목차와 동일한 아이콘이 붙어 있으므로 지우지 않고 작게 정렬해 유지한다.
  const hasIconLabelingConvention = $('h2, h3, h4, h5, h6').toArray().some(el => $(el).text().trim() === '목차');
  $('h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
    if (hasIconLabelingConvention && $el.find('img').length) {
      $el.find('img').attr('style', 'width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;');
    } else {
      $el.find('img, [class*="icon"], [class*="ico"]').remove();
    }
    $el.find('span, i').each((_, child) => {
      if (!$(child).text().trim()) $(child).remove();
    });
  });

  // 8) 개인정보처리방침 h3.section 바로 아래 p 태그들 → <div class="box-st emp"><p>...<br>..</p></div>
  $('h3.section').each((_, h3) => {
    const $h3 = $(h3);
    if (!/(개인정보\s*(?:처리|보호)\s*방침)/.test($h3.text())) return;
    let $cur = $h3.next();
    // box-st emp가 바로 다음이면 이미 처리됨
    if ($cur.is('.box-st.emp')) return;
    // p가 아닌 비헤딩 요소(라벨링 박스 등) 건너뛰기
    while ($cur.length && !$cur.is('p') && !$cur.is('h3,h4,h5,h6,.box-st.emp,.indent')) {
      $cur = $cur.next();
    }
    if (!$cur.length || !$cur.is('p')) return;

    const toWrap = [];
    while ($cur.length) {
      const tn = ($cur.get(0)?.tagName || '').toLowerCase();
      if (/^h[3-6]$/.test(tn) || $cur.hasClass('indent') || $cur.is('.box-st.emp')) break;
      if (tn === 'p') toWrap.push($cur.get(0));
      else break;
      $cur = $cur.next();
    }

    if (toWrap.length) {
      const merged = toWrap.map(el => ($(el).html() || '').trim()).join('<br>');
      $(toWrap[0]).before(`<div class="box-st emp"><p>${merged}</p></div>`);
      toWrap.forEach(el => $(el).remove());
    }
  });

  // 9) a/button만 담은 래퍼 div → class="btns", 내부 a/button → class="btn-st pri"
  // 이미 btns(.only 등)로 분류된 래퍼나 이미 btn-st가 붙은 링크(예: btn-st file
  // 다운로드 버튼)는 앞선 단계의 판단을 존중해 건드리지 않는다.
  $('div').each((_, div) => {
    const $div = $(div);
    if ($div.parents('table, td, th').length) return;
    if (/\bbtns\b/.test($div.attr('class') || '')) return;
    const children = $div.children().toArray();
    if (!children.length) return;
    if (!children.every(el => ['a', 'button'].includes((el.tagName || '').toLowerCase()))) return;
    $div.attr('class', 'btns');
    children.forEach(el => {
      if (!/\bbtn-st\b/.test($(el).attr('class') || '')) $(el).attr('class', 'btn-st pri');
    });
  });

  // 10) box 관련 클래스(box, _box, box_, wrap_box 등) → class="box-st info"
  // 이미 적용된 커스텀 클래스(box-st, tit-st, tbl-st 등)는 건드리지 않음
  // cStyle2는 사이트 고유 클래스명이지만 실제로는 박스 스타일을 넣은 것이라 동일하게 처리
  // i(아이콘) 태그는 ri-share-box-line처럼 이름에 우연히 "box"가 들어간 remixicon
  // 클래스가 많아 이 휴리스틱과 충돌하므로 대상에서 제외한다.
  const CUSTOM_CLS_RE = /\b(?:box-st|tit-st|tbl-st|bu-st|order-st|btn-st|txt-st|btns|indent)\b/;
  const BOX_CLS_RE = /(?:^|[-_])box(?:[-_]|$)|^cStyle2$/i;
  $('[class]').not('i').each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    if (CUSTOM_CLS_RE.test(cls)) return;
    if (cls.split(/\s+/).some(c => BOX_CLS_RE.test(c))) {
      $el.attr('class', 'box-st info');
    }
  });

  // 10.5) 아이콘(img) + 텍스트가 함께 있는 li(사이트별 커스텀 아이콘 라벨링 목록 등)는
  //       KLIC 컨벤션에 없는 래퍼 div/span 클래스를 걷어내고, 아이콘 크기를 표 안의
  //       라벨링 아이콘과 동일하게 통일한다.
  $('li').each((_, li) => {
    const $li = $(li);
    const $imgs = $li.find('img');
    if (!$imgs.length || !$li.text().trim()) return;
    $li.find('div, span').each((_, el) => {
      const $el = $(el);
      if (!CUSTOM_CLS_RE.test($el.attr('class') || '')) {
        $el.replaceWith($el.contents());
      }
    });
    $li.find('img').attr('style', 'width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;');
  });

  // 11) 텍스트 내 URL → <a class="txt-st link" target="_blank">
  // href/src 속성 안의 URL은 건드리지 않음 (첫 번째 그룹으로 보호)
  const URL_WRAP_RE = /(?:<a\b[^>]*>[^<]*<\/a>|href=["'][^"']*["']|src=["'][^"']*["'])|(https?:\/\/[^\s<>"'()[\]]+|www\.[a-zA-Z0-9][a-zA-Z0-9.\-]*[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9.\-]*\.(?:go|or|co|re|ac|ne)\.kr(?:\/[^\s<>"'()[\]]*)?)/gi;
  $('p, li, td, th, caption').each((_, el) => {
    const $el = $(el);
    if ($el.closest('.tab-st').length) return;
    const html = $el.html() || '';
    const newHtml = html.replace(URL_WRAP_RE, (match, url) => {
      if (!url) return match;
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      return `<a href="${href}" class="txt-st link" target="_blank" title="새창 이동">${url}</a>`;
    });
    if (newHtml !== html) $el.html(newHtml);
  });

  // 12) 기존 <a href="외부URL"> 태그 → txt-st link 클래스 + target/title 정규화
  // btn-st(버튼 링크) 및 tab-st 내부 링크는 건드리지 않음
  $('a[href]').each((_, el) => {
    const $el = $(el);
    if (/\bbtn-st\b/.test($el.attr('class') || '')) return;
    if ($el.closest('.tab-st').length) return;
    const href = ($el.attr('href') || '').trim();
    if (!/^https?:\/\//i.test(href) && !/^www\./i.test(href)) return;
    $el.attr('class', 'txt-st link');
    $el.attr('target', '_blank');
    $el.attr('title', '새창 이동');
  });

  $('table').each((_, table) => {
    const $table = $(table);
    // 크롤링 원본 표는 rowspan/colspan이 실제 구조와 맞지 않아(예: rowspan이 남은 행
    // 수보다 크거나, 일부 행에 셀이 누락돼 다른 행보다 짧음) 화면에 밀리거나 깨져
    // 보이는 경우가 있다. colspan 합만 보던 기존 maxCols 계산 방식은 rowspan으로 인해
    // 이미 채워진 열까지는 반영하지 못했으므로, rowspan을 실제 열 점유로 추적해 각 행의
    // 진짜 커버리지를 계산하고 이를 기준으로 잘못된 rowspan은 남은 행 수에 맞게 줄이고,
    // 다른 행보다 짧은 행에는 끝에 빈 셀을 채워 표 구조를 다시 그린다.
    const maxCols = normalizeTableGrid($, table);

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
    // 단, 행 전체가 th로만 구성된 경우(예: 라벨링 요약표의 분류명 행)는 전부 실제
    // 헤더 셀이므로 td로 강등하지 않고 그대로 유지한다.
    $table.find('tbody tr').each((_, row) => {
      const $row = $(row);
      const allTh = $row.find('td').length === 0 && $row.find('th').length > 1;
      $row.find('td, th').each((idx, cell) => {
        const $cell = $(cell);
        if (cell.tagName.toLowerCase() === 'th') {
          if (idx === 0 || allTh) {
            if (!$cell.attr('scope')) $cell.attr('scope', allTh ? 'col' : 'row');
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

  // 최상위 table에 직접 붙은 tbl-st 클래스를 wrapper div로 이동.
  // 가로 스크롤이 필요한 넓은 표는 스타일가이드 컨벤션대로 바깥 tbl-st scroll-w +
  // 안쪽 tbl-scroll-inner(단독 클래스, tbl-st 없음) 2중 래핑 구조로 만든다.
  $('table').each((_, table) => {
    const $table = $(table);
    if ($table.parents('table').length > 0) return;
    $table.removeAttr('class');
    let $parent = $table.parent();
    const isInner = $parent.is('div') && /\btbl-scroll-inner\b/.test($parent.attr('class') || '');
    const $outer = isInner ? $parent.parent() : $parent;
    const wrapperClass = tableWrapperClass($, table);

    if ($outer.is('div') && /\btbl-st\b/.test($outer.attr('class') || '')) {
      $outer.attr('class', wrapperClass);
      if (wrapperClass === 'tbl-st') {
        if (isInner) { $parent.replaceWith(table); }
      } else if (!isInner) {
        $table.wrap('<div class="tbl-scroll-inner"></div>');
      }
    } else if (wrapperClass === 'tbl-st') {
      $table.wrap('<div class="tbl-st"></div>');
    } else {
      $table.wrap('<div class="tbl-scroll-inner"></div>');
      $table.parent().wrap(`<div class="${wrapperClass}"></div>`);
    }
  });
  normalizeTableAlignClasses($);

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
  const COLLAPSE = new Set(['th', 'td', 'caption', 'li', 'p', 'h2', 'h3', 'h4', 'h5', 'h6', 'dt', 'dd']);

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

// 크롤링 원본은 예전에 작성됐거나 마크업이 잘못된 경우가 있어, 원래 하나로 이어지는
// 순번 목록(①②③... 또는 1.2.3...)이 중간에 표·박스 같은 "본문을 끊지 않는" 요소 때문에
// dl.cStyle이 여러 개로 쪼개져 있는 경우가 있다(예: ① 문단 → 관련 표 → ②③ 문단이
// 이어지는 위탁업무 안내). dl.cStyle 변환은 각 dl을 독립적으로 처리하므로 이런 경우
// 번호가 ①에서 끊기고 ②③은 번호 없는 별도 목록으로 떨어져 나간다. 표·박스·이미지 등으로만
// 분리된 인접 dl.cStyle들의 dt 번호가 그 사이를 넘어 실제로 1(또는 ①)부터 순차 증가하면,
// 하나의 dl로 합치고(중간 요소는 그 앞 dt의 하위 콘텐츠로 이동) 번호가 끊기지 않게 한다.
function mergeInterruptedNumberedDlGroups($) {
  const isSequential = nums => nums.length > 0 && nums.every((n, idx) => n === idx + 1);
  const consumed = new Set();

  $('dl.cStyle').each((_, dl) => {
    if (consumed.has(dl)) return;
    const $dl = $(dl);

    // dl.cStyle과 그 사이 "본문을 끊지 않는" 형제 요소(표·박스·이미지 등)를 순서대로 모은다.
    // 실제 새 문단(텍스트가 있는 p 등)이 나오면 그룹 확장을 멈춘다.
    const group = [{ type: 'dl', el: dl }];
    let pendingInterrupts = [];
    let cursor = $dl.next();
    while (cursor.length) {
      if (cursor.is('dl.cStyle')) {
        pendingInterrupts.forEach(el => group.push({ type: 'interrupt', el }));
        group.push({ type: 'dl', el: cursor.get(0) });
        pendingInterrupts = [];
        cursor = cursor.next();
        continue;
      }
      const tag = (cursor.get(0).tagName || '').toLowerCase();
      const isBenign = tag === 'table' || tag === 'img' || tag === 'br' ||
        cursor.hasClass('box-st') || cursor.hasClass('cStyle');
      if (!isBenign) break;
      pendingInterrupts.push(cursor.get(0));
      cursor = cursor.next();
    }

    const dlEls = group.filter(g => g.type === 'dl').map(g => g.el);
    if (dlEls.length < 2) return; // 끊긴 게 아니라 원래 하나뿐이면 기존 로직에 맡긴다

    // 그룹을 가로지르는 전체 dt 마커가 실제로 1(또는 ①)부터 순차 증가하는 진짜 순번인지
    // 확인한다 — 단일 dl 변환 로직과 동일하게, 번호 없는 dt(예: 끝의 "※ 안내문구")가
    // 섞여 있어도 번호 매겨진 것들끼리만 이어지면 충분하다.
    const allDts = dlEls.flatMap(d => $(d).children('dt').toArray());
    const asCircled = allDts.map(dt => {
      const m = $(dt).text().trim().match(CIRCLED_RE);
      return m ? CIRCLED.indexOf(m[1]) + 1 : null;
    });
    const asArabic = allDts.map(dt => {
      const m = $(dt).text().trim().match(NUM_DOT_RE);
      return m ? parseInt(m[1], 10) : null;
    });
    const circledOnly = asCircled.filter(n => n !== null);
    const arabicOnly = asArabic.filter(n => n !== null);
    if (!((circledOnly.length >= 2 && isSequential(circledOnly)) ||
          (arabicOnly.length >= 2 && isSequential(arabicOnly)))) {
      return; // 진짜 이어지는 순번이 아니면(우연히 인접한 별개의 dl) 손대지 않는다
    }

    // 첫 dl 자리에 그룹 전체(중간 요소 포함)를 순서대로 이어붙인 뒤, 나머지 dl과
    // 중간 요소는 원래 자리에서 제거한다("이 자리" 자체가 사라지고 첫 dl로 옮겨짐).
    group.forEach(g => {
      if (g.el === dl) return;
      if (g.type === 'dl') {
        $(g.el).children().each((_, child) => { $dl.append(child); });
        $(g.el).remove();
      } else {
        $dl.append(g.el);
      }
    });

    dlEls.forEach(d => consumed.add(d));
  });
}

// ─── HTML 클린 (테이블 전처리용) ──────────────────────────────
function cleanHtml(html) {
  const $ = cheerio.load(html);
  $('script, style').remove();
  $('*').contents().each(function () {
    if (this.nodeType === 8) $(this).remove();
  });
  // 화면에 보이지 않는(hide/hidden/blind 등) 요소는 실제 서비스에서도 안 쓰므로
  // 마크업 변환 전에 통째로 제거한다.
  const HIDDEN_CLS_RE = /\b(?:hide|hid|hidden|blind|screen_out|sr-only)\b/i;
  $('[class]').each((_, el) => {
    if (HIDDEN_CLS_RE.test($(el).attr('class') || '')) $(el).remove();
  });
  // #subtop(서브비주얼/타이틀 영역)은 본문 콘텐츠가 아니라 마크업 변환 대상이 아니다.
  $('#subtop').remove();
  // .psi_scroll(표 좌우 스크롤 안내 문구)도 본문 콘텐츠가 아니므로 제거한다.
  $('.psi_scroll').remove();
  // "[개인정보처리방침 필수항목①]"류 대괄호 안내문 — 원문자 하나만 가리키는 단일 항목
  // 표시는 소제목이므로, p(예: p.bu_ment) 등 헤딩이 아닌 태그로 마크업된 경우 h6.cStyle인
  // 경우와 동일하게 소제목으로 인식되도록 h6.cStyle로 승격한다(뒤 단계에서
  // h6.tit-st.item으로 일괄 매핑됨). 반대로 "[…필수항목①,②,③]"처럼 원문자 여러 개를
  // 한꺼번에 가리키는 경우는 여러 항목을 묶어 참조하는 안내문일 뿐 소제목이 아니므로,
  // h6.cStyle로 마크업돼 있어도 p.bu_ment로 되돌린다(아래 두 번째 규칙).
  const MANDATORY_ITEM_RE = /^\[[^\]]*필수항목[^\]]*\]$/;
  const CIRCLED_COUNT_RE = new RegExp(`[${CIRCLED}]`, 'g');
  const countCircled = text => (text.match(CIRCLED_COUNT_RE) || []).length;
  $('*').not('h1,h2,h3,h4,h5,h6,script,style,table,thead,tbody,tr,th,td,ul,ol,li,a,dl,dt,dd').each((_, el) => {
    const $el = $(el);
    if ($el.find('h1,h2,h3,h4,h5,h6,table,ul,ol,dl').length) return;
    const text = $el.text().trim();
    if (!MANDATORY_ITEM_RE.test(text) || countCircled(text) >= 2) return;
    $el.replaceWith(`<h6 class="cStyle">${($el.html() || text).trim()}</h6>`);
  });
  $('h1,h2,h3,h4,h5,h6').filter((_, el) => /\bcStyle\b/.test($(el).attr('class') || '')).each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (!MANDATORY_ITEM_RE.test(text) || countCircled(text) < 2) return;
    $el.replaceWith(`<p class="bu_ment">${($el.html() || text).trim()}</p>`);
  });
  // cStyle2는 사이트 고유 클래스명이지만 실제로는 박스 스타일을 넣은 것이므로, 뒤 단계에서
  // 클래스가 없는 일반 요소로 취급돼 풀어헤쳐지기 전에 box-st info로 먼저 바꿔둔다.
  // box-st는 관례상 div에만 쓰이고, 뒤 단계(directMarkupHtml)의 p 태그 처리는 class를
  // 보존하지 않고 통째로 버리므로, 원본이 p 등 다른 태그여도 div로 바꿔서 살아남게 한다.
  // 이때 원본이 div가 아니면(예: <p class="cStyle2">텍스트</p>) 내용이 태그 없는
  // 텍스트 노드로 남는데, box-st div 재귀 처리는 자식 "요소"만 찾으므로 텍스트만 있으면
  // 통째로 사라진다 — 그래서 원래 태그로 다시 한번 감싸 자식 요소가 있도록 만든다.
  $('.cStyle2').each((_, el) => {
    const $el = $(el);
    const tag = (el.tagName || '').toLowerCase();
    const inner = $el.html() || '';
    const content = tag === 'div' ? inner : `<${tag}>${inner}</${tag}>`;
    $el.replaceWith(`<div class="box-st info">${content}</div>`);
  });
  // 크롤링 원본은 예전에 작성됐거나 마크업이 잘못된 경우가 있어, 원래 하나로 이어지는
  // 순번 목록(①②③...)이 중간에 표·박스 같은 요소 때문에 dl.cStyle이 여러 개로 쪼개져
  // 있기도 하다(예: ① 문단 → <table>부가 자료 → ②③ 문단이 이어지는 위탁업무 안내).
  // dl.cStyle 변환은 각 dl을 독립적으로 처리하므로 이런 경우 번호가 ①에서 끊기고
  // ②③은 별도의(번호 없는) 목록으로 떨어져 나간다. 실제 dl.cStyle 변환에 앞서, 표·박스
  // 등 "본문을 끊지 않는" 요소로만 분리된 인접 dl.cStyle들을 먼저 하나로 합쳐서(중간
  // 요소는 그 앞 항목의 하위 내용으로 옮겨) 번호가 끊기지 않게 만든다.
  mergeInterruptedNumberedDlGroups($);

  // dl.cStyle는 사이트 고유 클래스명이지만 실제로는 일반 목록(라벨-값 나열 또는 단순
  // 링크 나열)이다. 단, dt 전체가 ①②③... 또는 1.2.3...으로 1부터 순차 증가하는 진짜
  // 순번이면 순서가 있는 목록이므로 번호를 span.mrk로 보존해 ol.order-st1로 만든다
  // (날짜처럼 우연히 숫자로 시작하는 텍스트는 순차 증가하지 않으므로 여기 걸리지 않음).
  // 순번이 아니면 dt+dd 쌍은 dt를 상위, dd를 하위(bu-st2)로 계층을 나누고, dt만
  // 있으면(예: 이전 버전 링크 목록) 평범한 단일 리스트로 만든다.
  $('dl.cStyle').each((_, dl) => {
    const $dl = $(dl);
    const dtEls = $dl.children('dt').toArray();

    const asCircled = dtEls.map(dt => {
      const m = $(dt).text().trim().match(CIRCLED_RE);
      return m ? CIRCLED.indexOf(m[1]) + 1 : null;
    });
    const asArabic = dtEls.map(dt => {
      const m = $(dt).text().trim().match(NUM_DOT_RE);
      return m ? parseInt(m[1], 10) : null;
    });
    const isSequential = nums => nums.length > 0 && nums.every((n, idx) => n === idx + 1);
    // 번호가 매겨진 dt만 뽑아서 그것들끼리 1부터 순차 증가하는지 본다. "① ... ② ... ※ 안내문구"처럼
    // 번호 없는 dt(대개 마지막의 부가 안내문)가 섞여 있어도, 번호가 매겨진 dt들만 놓고 보면 여전히
    // 진짜 순번이므로 이런 경우까지 놓치지 않게 dtEls 전체가 아니라 매칭된 것만으로 판단한다.
    let numRe = null;
    const circledOnly = asCircled.filter(n => n !== null);
    const arabicOnly = asArabic.filter(n => n !== null);
    if (circledOnly.length >= 2 && isSequential(circledOnly)) numRe = CIRCLED_RE;
    else if (arabicOnly.length >= 2 && isSequential(arabicOnly)) numRe = NUM_DOT_RE;

    if (numRe) {
      const items = [];
      let hasPending = false;
      let pendingNum = null;
      let pendingTitle = '';
      let pendingDds = [];
      let pendingExtras = [];
      // dt 하나에 dd가 여럿 이어질 때, 그 dd들도 "1. 2. 3."처럼 1부터 순차 증가하는
      // 진짜 순번이면 별개의 하위 항목이므로 order-st2로 중첩한다. 번호가 없으면
      // (예: 안내 문구) 기존처럼 <br>로 이어붙인다.
      const flush = () => {
        if (!hasPending) return;
        let ddPart = '';
        if (pendingDds.length) {
          const ddNums = pendingDds.map(html => {
            const m = html.match(NUM_DOT_RE);
            return m ? parseInt(m[1], 10) : null;
          });
          if (ddNums.every(n => n !== null) && isSequential(ddNums)) {
            const subItems = pendingDds
              .map((html, idx) => `<li><span class="mrk">${idx + 1}</span>${html.replace(NUM_DOT_RE, '')}</li>`)
              .join('');
            ddPart = `<ol class="order-st2">${subItems}</ol>`;
          } else {
            ddPart = '<br>' + pendingDds.join('<br>');
          }
        }
        const marker = pendingNum !== null ? `<span class="mrk">${pendingNum}</span>` : '';
        items.push(`<li>${marker}${pendingTitle}${ddPart}${pendingExtras.join('')}</li>`);
        hasPending = false; pendingNum = null; pendingTitle = ''; pendingDds = []; pendingExtras = [];
      };
      $dl.children().each((_, child) => {
        const tag = (child.tagName || '').toLowerCase();
        const $child = $(child);
        if (tag === 'dt') {
          flush();
          hasPending = true;
          const text = $child.text().trim();
          const raw = ($child.html() || '').trim();
          const m = text.match(numRe);
          if (m) {
            pendingNum = numRe === CIRCLED_RE ? CIRCLED.indexOf(m[1]) + 1 : parseInt(m[1], 10);
            pendingTitle = raw.replace(numRe, '');
          } else {
            // 번호가 없는 dt(예: "※ 안내문구")는 마커 없이 일반 항목으로 유지하고,
            // 흔한 특수기호 접두사만 제거한다.
            pendingNum = null;
            pendingTitle = raw.replace(/^[※○☞\-–]\s*/, '');
          }
        } else if (tag === 'dd') {
          const ddHtml = ($child.html() || '').trim();
          if (ddHtml) pendingDds.push(ddHtml);
        } else if (tag) {
          // mergeInterruptedNumberedDlGroups가 옮겨넣은 표·박스 등은 원본 그대로 보존한다
          // (표 래핑(div.tbl-st 등)은 뒤 단계에서 문서 전체의 다른 표와 동일하게 일괄
          // 처리되므로 여기서 미리 감싸면 이중으로 감싸진다).
          const outer = $.html(child);
          if (outer && outer.trim()) pendingExtras.push(outer);
        }
      });
      flush();
      if (items.length) $dl.replaceWith(`<ol class="order-st1">${items.join('')}</ol>`);
      return;
    }

    const hasDd = $dl.children('dd').length > 0;
    const items = [];
    if (hasDd) {
      let pendingDt = null;
      $dl.children().each((_, child) => {
        const tag = (child.tagName || '').toLowerCase();
        const $child = $(child);
        if (tag === 'dt') {
          if (pendingDt !== null) items.push(`<li>${pendingDt}</li>`);
          pendingDt = ($child.html() || '').trim();
        } else if (tag === 'dd') {
          const ddHtml = ($child.html() || '').trim();
          if (pendingDt !== null) {
            items.push(`<li>${pendingDt}${ddHtml ? `<ul class="bu-st2 list"><li>${ddHtml}</li></ul>` : ''}</li>`);
            pendingDt = null;
          } else if (ddHtml) {
            items.push(`<li>${ddHtml}</li>`);
          }
        }
      });
      if (pendingDt !== null) items.push(`<li>${pendingDt}</li>`);
    } else {
      // dt 안에 링크가 있으면(예: "이전 개인정보처리방침 보기" 버전별 목록) 원본 사이트의
      // 구형 page_code URL은 변환된 마크업에서 죽은 링크가 되므로 href는 비우고, 항목 전체
      // 텍스트를 하나의 txt-st link 앵커로 통일해 bu-st2 list로 만든다. 링크가 없는 일반
      // dt-only 목록은 기존대로 bu-st1 list로 둔다.
      let allHaveLink = dtEls.length > 0;
      $dl.children('dt').each((_, dt) => {
        const $dt = $(dt);
        if ($dt.find('a').length) {
          const label = $dt.text().replace(/\s+/g, ' ').trim();
          if (label) items.push(`<li><a href="" class="txt-st link" target="_blank" title="새창 이동">${label}</a></li>`);
          return;
        }
        allHaveLink = false;
        const dtHtml = ($dt.html() || '').trim();
        if (dtHtml) items.push(`<li>${dtHtml}</li>`);
      });
      if (items.length) {
        $dl.replaceWith(`<ul class="${allHaveLink ? 'bu-st2' : 'bu-st1'} list">${items.join('')}</ul>`);
      }
      return;
    }
    if (items.length) $dl.replaceWith(`<ul class="bu-st1 list">${items.join('')}</ul>`);
  });

  // 이전 개인정보처리방침 버전 목록이 dl이 아니라 table로 마크업된 사이트가 있다 — 모든 행이
  // "YYYY. MM. DD. ~ YYYY. MM. DD." 형태의 기간과 링크를 포함하고 "방침"을 언급하면 같은
  // 목록으로 보고, dl 버전과 동일하게 bu-st2 list + txt-st link 앵커로 통일한다.
  const OLD_POLICY_DATE_RE = /\d{4}[.\s]*\d{1,2}[.\s]*\d{1,2}\.?\s*~\s*\d{4}[.\s]*\d{1,2}[.\s]*\d{1,2}/;
  $('table').each((_, table) => {
    const $table = $(table);
    if ($table.parents('table').length) return;
    const rows = $table.find('tr').toArray().filter(tr => $(tr).find('td, th').length);
    if (!rows.length) return;
    const allMatch = rows.every(tr => {
      const $tr = $(tr);
      const text = $tr.text();
      return $tr.find('a').length > 0 && OLD_POLICY_DATE_RE.test(text) && /방침/.test(text);
    });
    if (!allMatch) return;
    const items = rows.map(tr => {
      const label = $(tr).find('td, th').toArray()
        .map(cell => $(cell).text().replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' ');
      return `<li><a href="" class="txt-st link" target="_blank" title="새창 이동">${label}</a></li>`;
    });
    $table.replaceWith(`<ul class="bu-st2 list">${items.join('')}</ul>`);
  });

  // "주요 개인정보 처리 표시(라벨링)" 아이콘 그리드는 사이트마다 마크업 구조가 제각각
  // (ul>li>div>img+span 등)이라서, 표준 표(아이콘 행 + 라벨 행)로 통일해서 다시 만든다.
  // "목차"와 달리 사이트마다 아이콘·문구가 다르므로 고정 템플릿이 아니라 원본 그대로 유지한다.
  // 제목 바로 다음 형제에 아이콘이 2개 이상 있을 때만 적용한다. 표는 bare <table>로 만들고
  // div.tbl-st 래핑은 뒤 단계(directMarkupHtml의 table 태그 처리)에 맡긴다.
  {
    const LABELING_TITLE_RE = /^주요\s*개인정보\s*처리\s*표시(?:\s*\(라벨링\))?$/;
    $('h1,h2,h3,h4,h5,h6').filter((_, el) => LABELING_TITLE_RE.test($(el).text().trim())).each((_, heading) => {
      const $heading = $(heading);
      const $content = $heading.next();
      const $imgs = $content.find('img');
      if ($imgs.length < 2) return;

      const items = $imgs.toArray().map(img => {
        const $img = $(img);
        const src = $img.attr('src') || '';
        const alt = ($img.attr('alt') || '').trim();
        const $item = $img.closest('li').length ? $img.closest('li') : $img.parent();
        let label = $item.text().replace(/\s+/g, ' ').trim();
        if (!label) label = alt.replace(/\s*아이콘\s*$/, '').trim();
        return { src, alt, label };
      });

      const width = Math.round(100 / items.length);
      const cols = items.map(() => `<col style="width:${width}%">`).join('');
      const iconRow = items.map(it => `<td><img src="${it.src}" alt="${it.alt}"></td>`).join('');
      const labelRow = items.map(it => `<th scope="col">${it.label}</th>`).join('');
      const table = `<table><colgroup>${cols}</colgroup><tbody><tr>${iconRow}</tr><tr>${labelRow}</tr></tbody></table>`;

      $content.replaceWith(table);
      // h2가 아니라 h3으로 내보내야 한다 — h1/h2는 이후 단계(directMarkupHtml 태그 매핑,
      // AI 프롬프트 컨벤션)에서 항상 문서 최상위 타이틀(h3.tit-st.section)로 취급되므로,
      // "주요 개인정보 처리 표시(라벨링)"처럼 문서 타이틀이 아닌 소제목이 h2로 나가면
      // 원래 원본 태그·클래스와 무관하게 section으로 잘못 승격된다. h3으로 내보내면
      // 두 경로 모두에서 일관되게 h4.tit-st.contents로 매핑된다.
      $heading.replaceWith(`<h3>${$heading.text().trim()}</h3>`);
    });
  }
  // target/title/download/aria-hidden은 txt-st link·btn-st file 등 KLIC 컨벤션이 직접
  // 부여하는 속성이라 보존해야 한다 — 여기서 지우면 이 함수 안에서 미리 설정해도 그대로
  // 사라진다.
  const keepAttrs = new Set(['colspan', 'rowspan', 'scope', 'headers', 'class', 'id', 'href', 'src', 'alt', 'target', 'title', 'download', 'aria-hidden']);
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

// ─── AI 입력 전용 HTML 빌더 ─────────────────────────────────────
// AI에 의존하지 않고 코드에서 직접 타이틀 변환:
//   1) tit/title 클래스 비헤딩 요소 → h3 승격
//   2) 최상위 헤딩 레벨 정규화 (h4 최상위면 → h2로 시프트)
// 결과 HTML에서 h2=최상위, h3=섹션, h4=서브섹션이 되어
// AI는 단순 매핑(h2→h3.section, h3→h4.contents)만 하면 됨
function buildHtmlForAI(html) {
  const $ = cheerio.load(html);

  const TIT_RE = /tit|title/i;
  const NUM_SUFFIX_RE = /_0*([123])(?!\d)/;

  // 0. 클래스 숫자 접미사(_01/_1 → h3, _02/_2 → h4, _03/_3 → h5) 기반 레벨 사전 정규화
  //    시프트 전 수행 → 이후 시프트에서 h2/h3/h4로 최종 조정됨
  function numSuffixTag(m) { return `h${Math.min(parseInt(m[1]) + 2, 6)}`; }
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    const $el = $(el);
    const m = ($el.attr('class') || '').match(NUM_SUFFIX_RE);
    if (!m) return;
    const tag = numSuffixTag(m);
    if ((el.tagName || '').toLowerCase() !== tag) $el.replaceWith(`<${tag}>${$el.html()}</${tag}>`);
  });
  $('*').not('h1,h2,h3,h4,h5,h6,script,style,table,thead,tbody,tr,th,td').each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    if (!TIT_RE.test(cls)) return;
    const m = cls.match(NUM_SUFFIX_RE);
    if (!m) return;
    const text = $el.text().trim();
    if (!text || text.length >= 120) return;
    if ($el.find('p,ul,ol,table,h1,h2,h3,h4,h5,h6').length) return;
    const tag = numSuffixTag(m);
    $el.replaceWith(`<${tag}>${text}</${tag}>`);
  });

  // 1. 최상위 헤딩 레벨 파악 → h2 기준으로 시프트 (tit 승격 전에 먼저 수행해야 minLevel 오염 방지)
  // 예: h4가 주제목이면 h2로 → AI는 h2를 h3.section으로 매핑
  const minLevel = [1,2,3,4,5,6].find(l => $(`h${l}`).length > 0) ?? 0;
  if (minLevel >= 3) {
    const shift = minLevel - 2;
    for (let l = minLevel; l <= 6; l++) {
      const nl = Math.min(l - shift, 6);
      $(`h${l}`).each((_, el) => {
        const $el = $(el);
        $el.replaceWith(`<h${nl}>${$el.html()}</h${nl}>`);
      });
    }
  }

  // 2. class에 tit/title 포함된 비헤딩 단순 요소 → h3 강제 변환 (헤딩 정규화 이후 수행)
  // 예: p.tit_list → h3 → AI는 h3을 h4.contents로 매핑
  $('*').not('h1,h2,h3,h4,h5,h6,script,style,table,thead,tbody,tr,th,td').each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    if (!TIT_RE.test(cls)) return;
    const text = $el.text().trim();
    if (!text || text.length >= 120) return;
    if ($el.find('p,ul,ol,table,h1,h2,h3,h4,h5,h6').length) return;
    $el.replaceWith(`<h3>${text}</h3>`);
  });

  // 3. 개인정보처리방침 타이틀 + 제N조 패턴 p 태그 승격 (클래스 없는 p여도 AI에 헤딩으로 전달)
  $('p').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    // "OO개인정보(처리|보호)방침" → h2 (AI가 h3.tit-st.section으로 매핑)
    // 반드시 "방침"으로 끝나야 타이틀 (본문에서 "처리방침을 통해..." 같은 언급 제외)
    if (/개인정보\s*(?:처리|보호)\s*방침/.test(text) && text.length < 100 && /방침\s*$/.test(text)) {
      $el.replaceWith(`<h2>${text}</h2>`);
      return;
    }
    // "제N조" 로 시작하는 짧은 p → h3 (AI가 h4.tit-st.contents로 매핑)
    if (/^제\s*\d+\s*조/.test(text) && text.length < 80) {
      $el.replaceWith(`<h3>${text}</h3>`);
    }
  });

  // 3.5. h3이 없고 h4가 있는 경우: h4→h3 시프트
  // → h2 유무와 관계없이, h4가 실질 최상위 섹션 헤딩인 경우 h4→h5.unit 대신 h3→h4.contents로 매핑
  // 단, h4.cStyle은 이 사이트 고유 관례(h3.tit-st.section)를 따로 적용하므로 그대로 둔다.
  if ($('h3').length === 0 && $('h4').length > 0) {
    $('h4').each((_, el) => {
      const $el = $(el);
      if (/\bcStyle\b/.test($el.attr('class') || '')) return;
      $el.replaceWith(`<h3>${$el.html()}</h3>`);
    });
  }

  // 2.5. h2만 있고 h3가 없는 경우(원본이 h3 단일 레벨): DOM 깊이 기준으로 하위 h2 → h3 강등
  // 탭 구조 등에서 섹션 타이틀과 서브섹션이 같은 h3 레벨일 때 계층을 복원
  if ($('h2').length > 1 && $('h3,h4,h5,h6').length === 0) {
    const getDepth = (el) => {
      let d = 0, cur = $(el).parent().get(0);
      while (cur) {
        const tn = (cur.tagName || '').toLowerCase();
        if (tn === 'body' || tn === 'html') break;
        d++;
        cur = $(cur).parent().get(0);
      }
      return d;
    };
    const h2Arr = $('h2').toArray();
    const depths = h2Arr.map(getDepth);
    const minDepth = Math.min(...depths);
    h2Arr.forEach((el, i) => {
      if (depths[i] > minDepth) {
        const $el = $(el);
        $el.replaceWith(`<h3>${$el.html()}</h3>`);
      }
    });
  }

  // 3.6. dl: 번호형(①②③... 원문자 또는 "1." 아라비아) dt + 대응 dd가 2개 이상
  //      → ol.order-st1 (AI가 h4로 변환하지 않도록 선처리). 실제 순번이 있는 목록이므로
  //      번호를 버리는 ul.bu-st1이 아니라 순번을 보존하는 ol.order-st1로 변환해야 한다.
  $('dl').each((_, dl) => {
    const $dl = $(dl);
    const dtEls = $dl.children('dt').toArray();
    const ddEls = $dl.children('dd').toArray();
    // 마커 판별은 dt 텍스트가 원문자/아라비아 번호로 "시작"하는지만 보면 되고, 조항
    // 설명이 길어도(흔함) 무관하므로 전체 길이로 걸러내지 않는다.
    const numberedDts = dtEls.filter(dt => {
      const t = $(dt).text().trim();
      return CIRCLED_RE.test(t) || NUM_DOT_RE.test(t);
    });
    if (numberedDts.length >= 2 && (ddEls.length === 0 || ddEls.length >= numberedDts.length * 0.5)) {
      const items = [];
      let pendingNum = '';
      let pendingTitle = '';
      let pendingDds = [];
      const flush = () => {
        if (!pendingTitle && !pendingDds.length) return;
        let ddPart = '';
        if (pendingDds.length) {
          // dt 하나에 dd가 여러 개 딸려 있고 그 dd들도 전부 번호형이면(예: "1. 파기절차",
          // "2. 파기방법") 각자 번호를 가진 별개 하위 항목이므로 중첩 순서 리스트로 만든다.
          // 그렇지 않으면 기존처럼 <br>로 이어붙인다.
          const marked = pendingDds.map(html => {
            const cm = html.match(CIRCLED_RE);
            const nm = html.match(NUM_DOT_RE);
            if (cm) return { num: CIRCLED.indexOf(cm[1]) + 1, body: html.replace(CIRCLED_RE, '') };
            if (nm) return { num: nm[1], body: html.replace(NUM_DOT_RE, '') };
            return null;
          });
          if (pendingDds.length >= 2 && marked.every(Boolean)) {
            ddPart = `<ol class="order-st2">${marked.map(m => `<li><span class="mrk">${m.num}</span>${m.body}</li>`).join('')}</ol>`;
          } else {
            ddPart = pendingDds.map(html => '<br>' + html).join('');
          }
        }
        items.push(`<li>${pendingNum ? `<span class="mrk">${pendingNum}</span>` : ''}${pendingTitle}${ddPart}</li>`);
        pendingNum = ''; pendingTitle = ''; pendingDds = [];
      };
      $dl.children().toArray().forEach(child => {
        const childTag = (child.tagName || '').toLowerCase();
        const $child = $(child);
        if (childTag === 'dt') {
          flush();
          const raw = ($child.html() || '').trim();
          const text = $child.text().trim();
          const cm = text.match(CIRCLED_RE);
          const nm = text.match(NUM_DOT_RE);
          if (cm) { pendingNum = String(CIRCLED.indexOf(cm[1]) + 1); pendingTitle = raw.replace(CIRCLED_RE, ''); }
          else if (nm) { pendingNum = nm[1]; pendingTitle = raw.replace(NUM_DOT_RE, ''); }
          else { pendingNum = ''; pendingTitle = raw; }
        } else if (childTag === 'dd') {
          const ddHtml = ($child.html() || '').trim();
          if (ddHtml) pendingDds.push(ddHtml);
        }
      });
      flush();
      if (items.length) $dl.replaceWith(`<ol class="order-st1">${items.join('')}</ol>`);
    }
  });

  // 3. 태그 단순화 (div/span 제거, 불필요한 속성 제거)
  const KEEP = new Set(['h1','h2','h3','h4','h5','h6','p','ul','ol','li','strong','em','table','thead','tbody','tr','th','td','br']);
  const SKIP = new Set(['script','style','nav','header','footer','button','form','input','select','textarea']);

  function simplify(node) {
    if (node.nodeType === 3) return node.data.replace(/\s+/g, ' ');
    if (node.nodeType !== 1) return '';
    const tag = (node.tagName || '').toLowerCase();
    if (SKIP.has(tag)) return '';
    const $el = $(node);
    if (!$el.text().trim() && !$el.find('img').length) return '';
    if (tag === 'img') {
      const alt = ($el.attr('alt') || '').trim();
      return alt ? `<img alt="${alt}">` : '';
    }
    if (tag === 'br') return '<br>';
    const inner = $el.contents().toArray().map(simplify).join('');
    // tab-st cntnts col-4 div → 보존 (AI에 탭 구조 전달)
    if (tag === 'div' && /\btab-st\b/.test($el.attr('class') || '')) {
      return `<div class="tab-st cntnts col-4">${inner}</div>`;
    }
    // li.on 클래스 보존 (탭 활성 항목)
    if (tag === 'li') {
      const isOn = /\bon\b/.test($el.attr('class') || '');
      return `<li${isOn ? ' class="on"' : ''}>${inner}</li>`;
    }
    if (KEEP.has(tag)) return `<${tag}>${inner}</${tag}>`;
    return inner; // div/span 등 → 내용만 추출
  }

  return $('body').children().toArray().map(simplify).join('\n')
    .replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
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

// ─── OCR 유효성 검사 ──────────────────────────────────────────
function isUsableOcrText(text) {
  if (!text) return false;
  const t = text.trim();
  if (!t || t.length < 2) return false;
  if (/^`{3}[\s\S]{0,20}`{3}$/.test(t)) return false; // 빈 코드블록
  if (/빈\s*문자열|반환\s*이유|이미지는|텍스트가\s*포함되어\s*있지\s*않|인식할\s*수\s*없/.test(t)) return false;
  return true;
}

// ─── OCR 결과를 img 요소에 주입 ──────────────────────────────
// orig_src 기준으로 매핑하여 이미지를 OCR HTML/텍스트로 교체
function injectOcrIntoHtml(html, images) {
  if (!images?.length) return html;
  const ocrImages = images.filter(img => img.orig_src && isUsableOcrText(img.ocr_text));
  if (!ocrImages.length) return html;

  const $ = cheerio.load(html);
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (!src) return;
    const img = ocrImages.find(i => i.orig_src === src);
    if (!img) return;
    const ocr = img.ocr_text.trim();
    if (!ocr) return;

    if (/<table[\s>]/i.test(ocr)) {
      $(el).replaceWith(ocr);
    } else {
      $(el).replaceWith(`<p>${ocr}</p>`);
    }
  });
  return $('body').html() || html;
}

// ─── 테이블 페이지용 직접 변환 (AI 없음) ──────────────────────
// AI는 다중 테이블·단일 테이블 모두 테이블 구조를 누락하는 경우가 있어
// 테이블이 있는 모든 페이지는 Cheerio 직접 매핑 → postProcessMarkup으로 정규화
function directMarkupHtml(html) {
  const $ = cheerio.load(html);

  // 테이블 경로도 동일 전처리: 헤딩 정규화 후 tit/title 클래스 → h3 승격
  // directMarkupHtml 매핑: h1/h2→h3.section, h3→h4.contents, h4/h5→h5.unit
  const TIT_RE_D = /tit|title/i;
  const NUM_SUFFIX_RE_D = /_0*([123])(?!\d)/;

  // 0. 클래스 숫자 접미사(_01/_1 → h3, _02/_2 → h4, _03/_3 → h5) 기반 레벨 사전 정규화
  function numSuffixTagD(m) { return `h${Math.min(parseInt(m[1]) + 2, 6)}`; }
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    const $el = $(el);
    const m = ($el.attr('class') || '').match(NUM_SUFFIX_RE_D);
    if (!m) return;
    const tag = numSuffixTagD(m);
    if ((el.tagName || '').toLowerCase() !== tag) $el.replaceWith(`<${tag}>${$el.html()}</${tag}>`);
  });
  $('*').not('h1,h2,h3,h4,h5,h6,script,style,table,thead,tbody,tr,th,td').each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    if (!TIT_RE_D.test(cls)) return;
    const m = cls.match(NUM_SUFFIX_RE_D);
    if (!m) return;
    const text = $el.text().trim();
    if (!text || text.length >= 120) return;
    if ($el.find('p,ul,ol,table,h1,h2,h3,h4,h5,h6').length) return;
    $el.replaceWith(`<${numSuffixTagD(m)}>${text}</${numSuffixTagD(m)}>`);
  });

  const NUMBERED_RE_D = /^\d+\.\s+[가-힣A-Za-z]/;
  const CLAUSE_RE_D = /^제\s*\d+\s*조/;
  // 페이지에 cStyle 헤딩이 하나라도 있으면 이 페이지의 실제 계층은 cStyle 관례(h4=대제목,
  // h5=조항, h6=하위항목 등)를 따르는 것이므로 이 정규화 자체를 건너뛴다. 그렇지 않으면,
  // 예를 들어 "주요 개인정보 처리 표시(라벨링)"처럼 이미 앞선 단계에서 올바른 태그로
  // 확정된 bare h3가 cStyle 헤딩들(h4/h5)보다 낮은 번호라는 이유만으로 "이 문서의 최상위
  // 레벨"로 오인되어, 실제로는 조항이 아닌데도 h2로 더 승격되어버리는 문제가 생긴다.
  const hasCStyleHeadingsD = $('h1,h2,h3,h4,h5,h6').toArray().some(el => /\bcStyle\b/.test($(el).attr('class') || ''));
  const minLvl = hasCStyleHeadingsD ? 0 : ([1,2,3,4,5,6].find(l => $(`h${l}`).length > 0) ?? 0);
  if (minLvl >= 3) {
    // PP/VP 콘텐츠에서 섹션형 h3이 최상위면 정규화 스킵
    // → h3은 h4.tit-st.contents로 매핑되어야 하며, 타이틀은 footerAutoMarkup 폴백이 보완
    const isPpOrVpD = /개인정보\s*(?:처리|보호)\s*방침|영상\s*정보\s*처리\s*방침|저작권\s*(?:보호\s*)?(?:지침|정책|방침|안내|신고)/.test($('body').text());
    const sectionH3D = $('h3').toArray().some(el => {
      const t = $(el).text().trim();
      return NUMBERED_RE_D.test(t) || CLAUSE_RE_D.test(t);
    });
    if (!(isPpOrVpD && minLvl === 3 && sectionH3D)) {
      const shiftD = minLvl - 2; // min → h2 (h2→section, h3→contents, h4→unit으로 정확히 매핑)
      for (let l = minLvl; l <= 6; l++) {
        const nl = Math.min(l - shiftD, 6);
        if (nl !== l) {
          $(`h${l}`).each((_, el) => {
            const $el = $(el);
            $el.replaceWith(`<h${nl}>${$el.html()}</h${nl}>`);
          });
        }
      }
    }
  }

  // 제N조/번호형 조항 제목은 사이트 원본에서 최상위 문서 타이틀과 같은 태그를 공유하는
  // 경우가 흔하다(예: 타이틀과 조항 제목이 전부 h2, 혹은 전부 h4.cStyle). 이 경우 위
  // minLvl 기반 shift만으로는 "이건 타이틀, 이건 조항"을 구분하지 못해 조항 제목까지
  // h3.tit-st.section(문서 최상위 타이틀 클래스)으로 잘못 승격된다. 조항 제목은 태그
  // 레벨과 무관하게 항상 h4.tit-st.contents로 매핑되도록 h3(→ processEl에서 h4.contents로
  // 매핑)로 낮춘다. 문서 타이틀은 "제N조"/번호로 시작하지 않으므로 위 NUMBERED_RE_D·
  // CLAUSE_RE_D 게이트(둘 다 ^로 앵커링됨) 자체가 이미 타이틀을 걸러내 준다 — 별도로
  // "개인정보처리방침 문구가 있으면 예외" 처리를 추가하면, "제14조(개인정보처리방침의
  // 변경)"처럼 조항 제목이 정책 문구를 언급하는 경우까지 타이틀로 오인해 강등을 건너뛰고
  // h3.tit-st.section으로 잘못 승격되는 문제가 생긴다.
  $('h1,h2,h3,h4,h5,h6').each((_, el) => {
    if ((el.tagName || '').toLowerCase() === 'h3') return; // 이미 h3(→h4.contents)이면 그대로 둔다
    const $el = $(el);
    const t = $el.text().trim();
    if (!(NUMBERED_RE_D.test(t) || CLAUSE_RE_D.test(t))) return;
    $el.replaceWith(`<h3>${$el.html()}</h3>`);
  });

  $('*').not('h1,h2,h3,h4,h5,h6,script,style,table,thead,tbody,tr,th,td').each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    if (!TIT_RE_D.test(cls)) return;
    const text = $el.text().trim();
    if (!text || text.length >= 120) return;
    if ($el.find('p,ul,ol,table,h1,h2,h3,h4,h5,h6').length) return;
    $el.replaceWith(`<h3>${text}</h3>`); // h3 → h4.contents 매핑됨
  });

  // 개인정보·영상정보처리방침·저작권 타이틀 + 제N조 패턴 p 태그 승격 (테이블 경로도 동일 처리)
  $('p').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (/개인정보\s*(?:처리|보호)\s*방침/.test(text) && text.length < 100 && /방침\s*$/.test(text)) {
      $el.replaceWith(`<h2>${text}</h2>`);
      return;
    }
    if (/영상\s*정보\s*처리\s*방침/.test(text) && text.length < 100 && /방침\s*$/.test(text)) {
      $el.replaceWith(`<h2>${text}</h2>`);
      return;
    }
    if (/저작권/.test(text) && /보호/.test(text) && text.length < 100) {
      $el.replaceWith(`<h2>${text}</h2>`);
      return;
    }
    if (/^제\s*\d+\s*조/.test(text) && text.length < 120) {
      $el.replaceWith(`<h3>${text}</h3>`);
    }
  });

  // 제N조 패턴 li → h3 추출 (preprocessFooterHtml 미처리 폴백)
  {
    let clauseLoop = true;
    while (clauseLoop) {
      clauseLoop = false;
      $('ul > li, ol > li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();
        if (!/^제\s*\d+\s*조/.test(text) || text.length > 120) return;
        if ($li.find('ul,ol,table').length) return;
        const $parent = $li.parent();
        const pTag = ($parent.get(0)?.tagName || 'ul').toLowerCase();
        const pCls = $parent.attr('class') || '';
        const prevItems = $li.prevAll('li').toArray().reverse();
        const nextItems = $li.nextAll('li').toArray();
        let replacement = '';
        if (prevItems.length) {
          replacement += `<${pTag}${pCls ? ` class="${pCls}"` : ''}>${prevItems.map(el => $.html(el)).join('')}</${pTag}>`;
        }
        replacement += `<h3>${text}</h3>`;
        if (nextItems.length) {
          replacement += `<${pTag}${pCls ? ` class="${pCls}"` : ''}>${nextItems.map(el => $.html(el)).join('')}</${pTag}>`;
        }
        $parent.replaceWith(replacement);
        clauseLoop = true;
        return false;
      });
    }
  }

  // h1만 있고 h2~h6가 없는 경우(원본이 h3 단일 레벨): DOM 깊이 기준으로 하위 h1 → h3 강등
  if ($('h1').length > 1 && $('h2,h3,h4,h5,h6').length === 0) {
    const getDepthD = (el) => {
      let d = 0, cur = $(el).parent().get(0);
      while (cur) {
        const tn = (cur.tagName || '').toLowerCase();
        if (tn === 'body' || tn === 'html') break;
        d++;
        cur = $(cur).parent().get(0);
      }
      return d;
    };
    const h1Arr = $('h1').toArray();
    const depths = h1Arr.map(getDepthD);
    const minDepth = Math.min(...depths);
    h1Arr.forEach((el, i) => {
      if (depths[i] > minDepth) {
        const $el = $(el);
        $el.replaceWith(`<h3>${$el.html()}</h3>`);
      }
    });
  }

  const MARKUP_NOISE_IDS = new Set(['location', 'pagetxt', 'pageTxt', 'sidecontent', 'side_content', 'sideContent', 'subtop']);
  const MARKUP_NOISE_CLS = ['line_map', 'linemap', 'breadcrumb', 'location_bar', 'navi_map', 'sidecontent', 'side_content', 'lnb_wrap'];
  const HIDDEN_CLS = new Set(['hide', 'hid', 'hidden', 'blind', 'screen_out', 'sr-only']);

  function processEl(el) {
    const tag = (el.tagName || '').toLowerCase();
    if (!tag) return '';
    const $el = $(el);

    // 스크립트·스타일·숨김 템플릿 요소 스킵
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template') return '';

    // 위치표시·브레드크럼·사이드메뉴·구분선·숨김 요소 스킵
    if (tag === 'hr') return '';
    const id = ($el.attr('id') || '');
    const cls = ($el.attr('class') || '');
    const idL = id.toLowerCase();
    const clsL = cls.toLowerCase();
    if (MARKUP_NOISE_IDS.has(id) || MARKUP_NOISE_IDS.has(idL)) return '';
    if (MARKUP_NOISE_CLS.some(k => clsL.includes(k) || idL.includes(k))) return '';
    if (cls.split(/\s+/).some(c => HIDDEN_CLS.has(c.toLowerCase()))) return '';

    // 빈 요소 제거 (테이블·이미지 없는 경우)
    if (!$el.text().trim() && !$el.find('table, img').length) return '';

    // 헤딩 → KLIC 클래스 (id 속성 보존)
    // cStyle 클래스가 붙은 h4/h5는 이 사이트 자체의 헤딩 관례(h4.cStyle=대제목,
    // h5.cStyle=조항 제목)를 따르므로, 일반적인 태그 레벨 매핑보다 먼저 확인한다.
    // 단, h4.cStyle이 페이지 안에 여러 개 있는 사이트가 있다("주요 개인정보 처리
    // 표시(라벨링)", "목차" 등도 h4.cStyle로 마크업된 경우) — 이런 것까지 전부
    // h3.tit-st.section(문서 최상위 타이틀)으로 승격하면 안 되므로, 텍스트가 실제
    // 개인정보처리방침/영상정보처리방침/저작권 타이틀 패턴일 때만 section으로 승격하고
    // 그 외에는 h5.cStyle과 동일하게 h4.tit-st.contents로 매핑한다.
    if (/\bcStyle\b/.test(cls)) {
      if (tag === 'h4') {
        const id = $el.attr('id');
        const t = $el.text().trim();
        const ppIdx = t.lastIndexOf('방침');
        const isRealTitle =
          (ppIdx >= 0 && /개인정보\s*(?:처리|보호)\s*방침|영상\s*정보\s*처리\s*방침/.test(t) &&
            t.slice(ppIdx + 2).replace(/[\s\-–·.·]/g, '').length <= 3) ||
          (/저작권/.test(t) && /보호/.test(t) && t.length < 120);
        if (isRealTitle) return `<h3 class="tit-st section"${id ? ` id="${id}"` : ''}>${$el.html()}</h3>`;
        return `<h4 class="tit-st contents"${id ? ` id="${id}"` : ''}>${$el.html()}</h4>`;
      }
      if (tag === 'h5') { const id = $el.attr('id'); return `<h4 class="tit-st contents"${id ? ` id="${id}"` : ''}>${$el.html()}</h4>`; }
    }
    if (tag === 'h1' || tag === 'h2') { const id = $el.attr('id'); return `<h3 class="tit-st section"${id ? ` id="${id}"` : ''}>${$el.html()}</h3>`; }
    if (tag === 'h3') { const id = $el.attr('id'); return `<h4 class="tit-st contents"${id ? ` id="${id}"` : ''}>${$el.html()}</h4>`; }
    if (tag === 'h4' || tag === 'h5') { const id = $el.attr('id'); return `<h5 class="tit-st unit"${id ? ` id="${id}"` : ''}>${$el.html()}</h5>`; }
    if (tag === 'h6') { const id = $el.attr('id'); return `<h6 class="tit-st item"${id ? ` id="${id}"` : ''}>${$el.html()}</h6>`; }

    // btn-st/txt-st가 붙은 a는 이미 KLIC 컨벤션대로 완성된 요소이므로 텍스트만 남기지
    // 않고 그대로 보존한다(예: btns.only div 안의 btn-st file 다운로드 버튼).
    if (tag === 'a' && /\b(?:btn-st|txt-st)\b/.test(cls)) return $.html(el);

    // 테이블 → 가로로 긴 표만 scroll-w 래퍼
    if (tag === 'table') return `<div class="${tableWrapperClass($, el)}">${$.html(el)}</div>`;

    // p → 그대로 유지 (bu_ment는 여러 필수항목을 묶어 참조하는 안내문 클래스라 보존)
    if (tag === 'p') {
      if (!$el.text().trim()) return '';
      const bu = /\bbu_ment\b/.test(cls) ? ' class="bu_ment"' : '';
      return `<p${bu}>${$el.html()}</p>`;
    }

    // ul / ol → 그대로 유지
    if (tag === 'ul' || tag === 'ol') return $.html(el);

    // dl → dt/dd 재귀 처리 (저작권지침·개인정보방침 등 dl 구조 페이지 대응)
    if (tag === 'dl') {
      // 번호형(제N조 제외) dt + 대응 dd가 2개 이상이면 실제 순번이 있으므로 order-st1로 변환
      // 번호는 "①②③..." 원문자형과 "1." / "1)" 아라비아형을 모두 인식한다. 마커 판별은
      // dt 텍스트가 그 번호로 "시작"하는지만 보면 되고 조항 설명이 길어도(흔함) 무관하므로
      // 전체 길이로 걸러내지 않는다.
      const dtEls = $el.children('dt').toArray();
      const ddEls = $el.children('dd').toArray();
      const numberedDts = dtEls.filter(dt => {
        const t = $(dt).text().trim();
        return CIRCLED_RE.test(t) || NUM_DOT_RE.test(t);
      });
      if (numberedDts.length >= 2 && (ddEls.length === 0 || ddEls.length >= numberedDts.length * 0.5)) {
        const items = [];
        let pendingNum = '';
        let pendingTitle = '';
        let pendingDds = [];
        const flush = () => {
          if (!pendingTitle && !pendingDds.length) return;
          let ddPart = '';
          if (pendingDds.length) {
            // dt 하나에 dd가 여러 개 딸려 있고 그 dd들도 전부 번호형이면(예: "1. 파기절차",
            // "2. 파기방법") 각자 번호를 가진 별개 하위 항목이므로 중첩 순서 리스트로 만든다.
            // 그렇지 않으면 기존처럼 <br>로 이어붙인다.
            const marked = pendingDds.map(html => {
              const cm = html.match(CIRCLED_RE);
              const nm = html.match(NUM_DOT_RE);
              if (cm) return { num: CIRCLED.indexOf(cm[1]) + 1, body: html.replace(CIRCLED_RE, '') };
              if (nm) return { num: nm[1], body: html.replace(NUM_DOT_RE, '') };
              return null;
            });
            if (pendingDds.length >= 2 && marked.every(Boolean)) {
              ddPart = `<ol class="order-st2">${marked.map(m => `<li><span class="mrk">${m.num}</span>${m.body}</li>`).join('')}</ol>`;
            } else {
              ddPart = pendingDds.map(html => '<br>' + html).join('');
            }
          }
          items.push(`<li>${pendingNum ? `<span class="mrk">${pendingNum}</span>` : ''}${pendingTitle}${ddPart}</li>`);
          pendingNum = ''; pendingTitle = ''; pendingDds = [];
        };
        $el.children().each((_, child) => {
          const childTag = (child.tagName || '').toLowerCase();
          const $child = $(child);
          if (childTag === 'dt') {
            flush();
            const raw = ($child.html() || '').trim();
            const text = $child.text().trim();
            const cm = text.match(CIRCLED_RE);
            const nm = text.match(NUM_DOT_RE);
            if (cm) { pendingNum = String(CIRCLED.indexOf(cm[1]) + 1); pendingTitle = raw.replace(CIRCLED_RE, ''); }
            else if (nm) { pendingNum = nm[1]; pendingTitle = raw.replace(NUM_DOT_RE, ''); }
            else { pendingNum = ''; pendingTitle = raw; }
          } else if (childTag === 'dd') {
            const ddHtml = ($child.html() || '').trim();
            if (ddHtml) pendingDds.push(ddHtml);
          }
        });
        flush();
        return items.length ? `<ol class="order-st1">${items.join('')}</ol>` : '';
      }
      const childParts = $el.children().toArray().map(processEl).filter(Boolean);
      return childParts.join('\n');
    }
    // dt → 조항(제N조)·번호형이면 h4.tit-st.contents로, 그 외 p
    if (tag === 'dt') {
      const dtText = $el.text().trim();
      if (!dtText) return '';
      const dtHtml = $el.html() || dtText;
      if (/^제\s*\d+\s*조/.test(dtText) && dtText.length < 120)
        return `<h4 class="tit-st contents">${dtHtml}</h4>`;
      if (/^\d+\.\s+[가-힣A-Za-z]/.test(dtText) && dtText.length < 80)
        return `<h4 class="tit-st contents">${dtHtml}</h4>`;
      return `<p>${dtHtml}</p>`;
    }
    // dd → 자식 블록 요소 재귀, 없으면 p
    if (tag === 'dd') {
      const childParts = $el.children().toArray().map(processEl).filter(Boolean);
      if (childParts.length) return childParts.join('\n');
      const ddText = $el.text().trim();
      return ddText ? `<p>${$el.html()}</p>` : '';
    }

    // tab-st cntnts col-4 div → 탭 내비게이션으로 그대로 출력 (재귀 금지)
    if (tag === 'div' && /\btab-st\b/.test(cls)) {
      return `<div class="tab-st cntnts col-4">${$el.html()}</div>`;
    }

    // 이미 KLIC 클래스가 지정된 div는 내용 재귀처리 후 클래스 유지
    if (tag === 'div' && /\b(?:box-st|btns|indent)\b/.test(cls)) {
      const childParts = $el.children().toArray().map(processEl).filter(Boolean);
      return childParts.length ? `<div class="${$el.attr('class')}">${childParts.join('\n')}</div>` : '';
    }

    // 컨테이너: 자식 요소를 재귀 처리
    // form·fieldset 등 알 수 없는 블록 요소라도 내부에 table이 있으면 재귀 처리
    // contents()로 텍스트 노드도 포함 → <p>로 포함없이 raw text가 있는 HTML 구조 대응
    const CONTAINER_TAGS = new Set(['div', 'section', 'article', 'main', 'aside', 'figure', 'form', 'fieldset', 'nav', 'header', 'footer']);
    if (CONTAINER_TAGS.has(tag) || $el.find('table').length > 0) {
      const childParts = $el.contents().toArray().map(child => {
        if (child.nodeType === 3) {
          const t = (child.data || '').replace(/\s+/g, ' ').trim();
          return t ? `<p>${t}</p>` : '';
        }
        return processEl(child);
      }).filter(Boolean);
      return childParts.join('\n');
    }

    // 그 외 인라인·텍스트 포함 요소
    const text = $el.text().trim();
    return text ? `<p>${text}</p>` : '';
  }

  const parts = $('body').children().toArray().map(processEl).filter(Boolean);
  return parts.join('\n');
}

// ─── 푸터메뉴 전용 시스템 프롬프트 ──────────────────────────────
const SYSTEM_FOOTER = `당신은 HTML 마크업 전문가입니다.
원문 텍스트를 아래 규칙에 따라 정확히 마크업하여 HTML 소스만 반환합니다. 설명·주석·코드블록 없이 HTML만 출력하세요.

[마크업 규칙]
0. 서브 네비게이션(위치 표시줄·브레드크럼·LNB·현재 위치 경로 텍스트 등)은 마크업에서 완전히 제외할 것

1. 타이틀은 계층에 따라:
   <h3 class="tit-st section"></h3>   ← 최상위 타이틀
   <h4 class="tit-st contents"></h4>  ← 2단계 타이틀
   <h5 class="tit-st unit"></h5>      ← 3단계 타이틀
   <h6 class="tit-st item"></h6>      ← 4단계 타이틀

   [개인정보처리방침 타이틀 규칙]
   - "OO개인정보처리방침" 또는 첫 텍스트에 "개인정보처리방침"이 포함된 제목 → 반드시 h3.tit-st.section
   - 각 방침의 소제목(제1조, 1. 항목명, "수집항목" 등 번호·키워드 단독 제목) → 반드시 h4.tit-st.contents
     (원본이 p·span·div 태그여도 내용이 소제목이면 h4로 변환)

2. h4(tit-st contents) 타이틀 바로 아래의 모든 내용은 <div class="indent"></div>로 감싸기

3. 일반 텍스트는 <p></p>

4. 일반 리스트(순서 없음)는 레벨에 따라:
   <ul class="bu-st1 list"></ul>  ← 1단계
   <ul class="bu-st2 list"></ul>  ← 2단계
   <ul class="bu-st3 list"></ul>  ← 3단계
   <ul class="bu-st4 list"></ul>  ← 4단계
   하위 리스트는 상위 <li> 안에 넣기

5. ①②③ 등 원문자 번호가 있는 항목은 반드시 ul로 처리 (ol 절대 사용 금지):
   <ul class="bu-st1 list">
     <li>항목 내용 (원문자 ①②③ 반드시 제거)</li>
   </ul>
   중첩 구조: bu-st2 list → bu-st3 list 순
   ①②③④⑤⑥⑦⑧⑨⑩ 등 원문자는 모두 li 텍스트에서 제거할 것

5-1. "1) 소제목" 또는 "가) 소제목" 형식으로 뒤에 본문이 따르는 세부 항목:
   상위 li 안에 ul.bu-st2.list로 중첩하여 소제목과 본문을 <br>로 연결:
   <ul class="bu-st2 list">
     <li>파기절차<br>홍주고등학교는 파기하여야 하는 개인정보에 대해...</li>
     <li>파기방법<br>홍주고등학교는 전자적 파일 형태로...</li>
   </ul>
   - "N)" 또는 "가)" 접두사는 제거하고 소제목만 li 첫 텍스트
   - 소제목과 본문은 <br>로 연결하여 하나의 <li> 안에 담기
   - 이 형식은 ol 절대 사용 금지, 반드시 ul.bu-st2.list

6. ○, -, ※ 등 특수문자로 시작하는 리스트 항목은 해당 특수문자 제거 후 <li>에 넣기

7. 숫자 순서 리스트(1. 2. 3. 형식)는:
   <ol class="order-st1"></ol>  ← 1단계
   <ol class="order-st2"></ol>  ← 2단계
   숫자는 <span class="mrk">1</span> 형식으로 작성
   원문에 있던 "1.", "1)" 같은 원래 번호 표기는 <span class="mrk">로 옮겼으므로 항목 내용
   맨 앞에서 완전히 삭제할 것 (숫자가 두 번 나오면 안 됨)

8. 테이블:
   - 원본 테이블 HTML 구조(thead/tbody/th/td/colspan/rowspan)를 그대로 유지
   - 반드시 아래 래퍼로 감싸기:
   <div class="tbl-st scroll-w">
     <table>
       <caption>thead의 th 항목들을 쉼표로 연결하여 "[항목1], [항목2]의 정보를 포함한 표입니다." 형식</caption>
       <colgroup><col><col>...</colgroup>
       <thead>...</thead>
       <tbody>...</tbody>
     </table>
   </div>
   - td 안에 리스트가 들어가는 경우 해당 td에 class="al" 추가

9. 최상위 타이틀(h3.tit-st.section) 바로 아래 나오는 안내 문구:
   - 페이지 종류와 관계없이, h3 타이틀 직후에 이어지는 안내·소개 문단은 아래 형식으로 감싸기:
   <div class="box-st emp"><p>첫 문장입니다.<br>두 번째 문장입니다.<br>마지막 문장입니다.</p></div>
   - p 태그에는 class 없음
   - "다."로 끝나는 각 문장은 <br>로 연결하여 하나의 <p> 안에 담기
   - "~바랍니다.", "~합니다." 형태의 마지막 문장도 포함
   - 개인정보처리방침뿐 아니라 모든 푸터 페이지에 동일하게 적용

10. 원문 텍스트는 절대 수정하지 말 것
    - 단어 하나도 바꾸거나 고치지 말 것
    - 내용을 요약·축약·생략하지 말 것
    - 문단·항목의 순서를 임의로 바꾸지 말 것
    - 원문에 없는 내용을 추가하지 말 것
    - 원문의 모든 텍스트가 빠짐없이 출력에 포함되어야 함

11. section, div로 묶지 말 것 (규칙에 명시된 div 클래스 제외)

12. 모든 소스는 탭(\\t) 들여쓰기로 작성

13. 내용이 아무리 길어도 모든 내용을 한 번에 빠짐없이 출력하세요. 중간에 절대 멈추지 마세요.

[개인정보처리방침 마크업 구조 예시 - 아래 패턴을 반드시 따를 것]

입력:
<h2>2026학년도 개인정보처리방침</h2>
<p>홍주학교는 이용자의 개인정보를 중요시하며 적법하게 처리합니다.</p>
<p>홍주학교는 관계 법령에 따라 이 방침을 공개합니다.</p>
<h3>1. 개인정보의 처리 목적</h3>
<p>① 홍주학교는 다음의 목적으로 개인정보를 처리합니다.</p>
<p>② 정보주체의 동의를 받아 처리합니다.</p>
<h3>2. 개인정보 파기 절차 및 방법</h3>
<p>① 파기 원칙에 따라 처리합니다.</p>
<p>② 보존 원칙에 따라 처리합니다.</p>
<p>③ 파기의 절차 및 방법은 다음과 같습니다.</p>
<p>1) 파기절차</p>
<p>홍주학교는 파기하여야 하는 개인정보에 대해 파기계획을 수립하여 파기합니다.</p>
<p>2) 파기방법</p>
<p>홍주학교는 전자적 파일 형태로 기록·저장된 개인정보는 파기합니다.</p>

출력:
<h3 class="tit-st section">2026학년도 개인정보처리방침</h3>
<div class="box-st emp"><p>홍주학교는 이용자의 개인정보를 중요시하며 적법하게 처리합니다.<br>홍주학교는 관계 법령에 따라 이 방침을 공개합니다.</p></div>
<h4 class="tit-st contents">1. 개인정보의 처리 목적</h4>
<div class="indent">
\t<ul class="bu-st1 list">
\t\t<li>홍주학교는 다음의 목적으로 개인정보를 처리합니다.</li>
\t\t<li>정보주체의 동의를 받아 처리합니다.</li>
\t</ul>
</div>
<h4 class="tit-st contents">2. 개인정보 파기 절차 및 방법</h4>
<div class="indent">
\t<ul class="bu-st1 list">
\t\t<li>파기 원칙에 따라 처리합니다.</li>
\t\t<li>보존 원칙에 따라 처리합니다.</li>
\t\t<li>파기의 절차 및 방법은 다음과 같습니다.
\t\t\t<ul class="bu-st2 list">
\t\t\t\t<li>파기절차<br>홍주학교는 파기하여야 하는 개인정보에 대해 파기계획을 수립하여 파기합니다.</li>
\t\t\t\t<li>파기방법<br>홍주학교는 전자적 파일 형태로 기록·저장된 개인정보는 파기합니다.</li>
\t\t\t</ul>
\t\t</li>
\t</ul>
</div>`;

// "주요 개인정보 처리 표시(라벨링)" / "목차" 섹션은 사이트마다 원본 마크업이 제각각(아이콘
// 그리드, 링크 목차 등)이라서 동적으로 재구성하지 않고, 표준 목차 요약표로 통째로 교체한다.
const TOC_HEADING_RE = /^목차$/;
const TOC_FIXED_HTML = '<h4 class="tit-st contents">목차</h4>' +
  '<div class="tbl-st"><table><colgroup><col style="width:50%"><col style="width:50%"></colgroup><tbody>' +
  '<tr><td class="al"><img src="/images/common/common/img_info01.png" alt="일반개인정보수집아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;"><img src="/images/common/common/img_info20.png" alt="개인정보의 처리 목적아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;"><img src="/images/common/common/img_info16.png" alt="개인정보의 보유기간아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">개인정보의 처리목적, 수집항목, 보유기간</td>' +
  '<td class="al"><img src="/images/common/common/img_info23.png" alt="개인정보 열람청구아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">개인정보 열람청구</td></tr>' +
  '<tr><td class="al"><img src="/images/common/common/img_info13.png" alt="제3자 제공아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">개인정보의 제3자 제공</td>' +
  '<td class="al"><img src="/images/common/common/img_info27.png" alt="권익침해구제방법아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">권익침해 구제방법</td></tr>' +
  '<tr><td class="al"><img src="/images/common/common/img_info14.png" alt="개인정보처리위탁아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">개인정보 처리 위탁</td>' +
  '<td class="al"><img src="/images/common/common/img_info34.png" alt="개인정보 자동수집 장치의 설치·운영 및 거부에 관한 사항아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">개인정보 자동수집 장치의 설치·운영 및 거부에 관한 사항</td></tr>' +
  '<tr><td class="al"><img src="/images/common/common/img_info31.png" alt="정보주체와 법정대리인의 권리·의무 및 그 행사 방법아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">정보주체와 법정대리인의 권리·의무 및 그 행사 방법</td>' +
  '<td class="al"><img src="/images/common/common/img_info11.png" alt="가명정보 처리에 관한 사항아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">가명정보 처리에 관한 사항</td></tr>' +
  '<tr><td class="al"><img src="/images/common/common/img_info17.png" alt="개인정보의 파기아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">개인정보의 파기</td>' +
  '<td class="al"><img src="/images/common/common/img_info21.png" alt="추가적인 이용・제공 판단기준아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">추가적인 이용・제공 판단기준</td></tr>' +
  '<tr><td class="al"><img src="/images/common/common/img_info28.png" alt="개인정보의 안전성 확보 조치아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">개인정보의 안전성 확보 조치</td>' +
  '<td class="al"><img src="/images/common/common/img_info33.png" alt="영상정보처리기기 운영ㆍ관리에 관한 사항아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">영상정보처리기기 운영ㆍ관리에 관한 사항</td></tr>' +
  '<tr><td class="al"><img src="/images/common/common/img_info25.png" alt="개인정보 보호책임자아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">개인정보 보호책임자</td>' +
  '<td class="al"><img src="/images/common/common/img_info19.png" alt="개인정보 처리방침 변경아이콘" style="width:1.5rem; height:1.5rem; margin-right:0.3rem; vertical-align:middle;">개인정보 처리방침 변경</td></tr>' +
  '</tbody></table></div>';

// "목차" 제목과 그 아래 내용(사이트마다 마크업이 제각각)을 표준 목차 요약표(TOC_FIXED_HTML)로
// 통째로 교체한다. "주요 개인정보 처리 표시(라벨링)"는 사이트마다 아이콘·문구가 달라 별도로
// cleanHtml()에서 원본 내용을 유지한 채 표로만 변환하므로 여기서는 건드리지 않는다.
// 다른 후처리 단계(첫 h3.section 하위 wrap 등)와 순서가 꼬이지 않도록 autoMarkup/footerAutoMarkup
// 각 파이프라인의 맨 마지막에 호출한다.
function replaceTocSection(html) {
  const $ = cheerio.load(html);
  $('h1,h2,h3,h4,h5,h6').filter((_, el) => TOC_HEADING_RE.test($(el).text().trim())).each((_, heading) => {
    const $heading = $(heading);
    const siblings = [];
    let cursor = $heading.next();
    while (cursor.length && !cursor.is('h1,h2,h3,h4,h5,h6')) {
      siblings.push(cursor[0]);
      cursor = cursor.next();
    }
    siblings.forEach(s => $(s).remove());
    $heading.replaceWith(TOC_FIXED_HTML);
  });
  return $('body').html() || html;
}

// ─── 푸터메뉴 전용 HTML 전처리 (개인정보처리방침 구조 사전 인식) ────────
function preprocessFooterHtml(html) {
  let $ = cheerio.load(html);
  // cleanHtml 이후에도 생존한 script/style 잔류 제거 (중첩 파싱 경우 대비)
  $('script, style, noscript, template').remove();
  const PRIVACY_RE = /개인정보\s*(?:처리|보호)\s*방침/;

  // -1) 개인정보처리방침 페이지 전용 비콘텐츠 섹션 제거
  //     ul.policy(아이콘 그리드 라벨링), .toc-wrap 등
  if (PRIVACY_RE.test($('body').text())) {
    // box_st3: 내용이 충분하면(>80자) 안내문 박스 → 보존, 짧으면 아이콘 그리드 등 노이즈 → 제거
    $('div.box_st3').each((_, el) => {
      const $el = $(el);
      if ($el.text().trim().length <= 80) $el.remove();
    });
    $('ul.policy, .toc-wrap, .privacy-toc').remove();
    // "목차" 텍스트만 있는 단독 제목 요소 제거 — 단, 실제로 링크 위주 내비게이션
    // (ul/ol 또는 링크 2개 이상인 div)이 뒤따를 때만 제거한다. "목차" 뒤에 표
    // (예: 라벨링 아이콘 요약표)처럼 실제 콘텐츠가 오는 경우는 진짜 섹션 제목이므로
    // 다른 헤딩과 동일하게 h4.tit-st contents로 승격되도록 보존해야 한다.
    // 링크가 전부 페이지 내부 앵커(#id)라면 다른 페이지로 이동하는 진짜 내비게이션이
    // 아니라 "이 문서 안의 조항 요약"이므로 링크만 해제하고 아이콘·텍스트는 보존한다.
    const isAnchorOnlyLinks = $links => $links.length > 0 && $links.toArray()
      .every(a => /^#/.test(($(a).attr('href') || '').trim()));
    const unwrapAnchors = $scope => {
      $scope.find('a').each((_, a) => {
        const $a = $(a);
        $a.replaceWith($a.contents());
      });
    };
    $('p.tit_01, h2, h3, h4').each((_, el) => {
      const $el = $(el);
      if ($el.text().trim() !== '목차') return;
      const $nextList = $el.next('ul, ol');
      if ($nextList.length) {
        if (isAnchorOnlyLinks($nextList.find('a'))) {
          unwrapAnchors($nextList);
          return;
        }
        $nextList.remove();
        $el.remove();
        return;
      }
      const $nd = $el.next('div');
      if ($nd.length && $nd.find('a').length >= 2 && $nd.text().trim().length < 800) {
        if (isAnchorOnlyLinks($nd.find('a'))) {
          unwrapAnchors($nd);
          return;
        }
        $nd.remove();
        $el.remove();
      }
    });
  }

  // 0) 개인정보처리방침 레이아웃 테이블 평탄화 (th 없음 + ≤2열 + ≥3행)
  if (PRIVACY_RE.test($('body').text())) {
    $('table').each((_, table) => {
      const $table = $(table);
      if ($table.find('th').length > 0) return;
      const rows = $table.find('tr');
      if (rows.length < 3) return;
      const maxCols = Math.max(...rows.toArray().map(tr => $(tr).find('td').length));
      if (maxCols > 2) return;
      // 셀 내에 제목·중첩테이블 없으면 데이터 테이블 → 평탄화 제외 (데이터표 소실 방지)
      const hasStructural = $table.find('td').toArray().some(td =>
        $(td).find('h1,h2,h3,h4,h5,h6,table').length > 0
      );
      if (!hasStructural) return;
      const cells = $table.find('td').toArray();
      const flatHtml = cells.map(td => $(td).html() || '').filter(h => h.trim()).join('\n');
      $table.replaceWith(flatHtml);
    });
    html = $('body').html() || html;
    $ = cheerio.load(html);
  }

  // 0-1) div.gry_box / div[class*="intro"] / div.ctop / div.box_table / div[class*="roundBorder"]
  //      (예: class="cStyle roundBorder") → div.box-st emp (안내문 영역 직접 변환)
  //      ctop은 <p> 대신 <ul><li>로 안내 문구를 나열하는 사이트가 있어(예: 개인정보처리방침
  //      머리말) p가 없으면 li를 문단처럼 <br>로 이어붙인다.
  $('div.gry_box, div[class*="gry_box"], div.ctop, div.box_table, div[class*="box_table"], div[class*="roundBorder"]').each((_, el) => {
    const $el = $(el);
    const pArr = $el.find('p').toArray();
    const liArr = $el.find('li').toArray();
    const combined = pArr.length
      ? pArr.map(p => $(p).html() || '').filter(h => h.trim()).join('<br>')
      : liArr.length
      ? liArr.map(li => $(li).html() || '').filter(h => h.trim()).join('<br>')
      : ($el.html() || '').trim();
    if (!combined.trim()) return;
    $el.replaceWith(`<div class="box-st emp"><p>${combined}</p></div>`);
  });

  // 0-1-b) 개인정보처리방침 중간의 "개인정보파일 목록 보기"/"개인정보 포털 바로가기" 등
  //        privacy.go.kr 파일열람·이동 링크 정리.
  //        원본 href는 사이트마다 제각각인 외부 링크라 의미가 없으므로 비운다.
  //        이미 txt-st/btn-st로 분류된 링크(예: 이전 개인정보처리방침 버전 목록)는 제외하고,
  //        텍스트 기반 판별도 "파일"/"포털" 언급이 있을 때만 적용해 위 버전 목록의
  //        "…방침 보기" 문구와 겹치지 않게 한다.
  //        "바로가기"류(단순 외부 사이트 이동)는 파일이 아니므로 btn-st file 버튼이 아니라
  //        일반 외부링크 스타일(txt-st link + 새창 아이콘)로, "보기(클릭)"/"다운로드"류
  //        (파일·목록 열람)는 기존대로 btn-st file 버튼으로 만든다.
  const FILE_VIEW_HOST_RE = /privacy\.go\.kr/i;
  $('a').each((_, a) => {
    const $a = $(a);
    const href = $a.attr('href') || '';
    const cls = $a.attr('class') || '';
    const text = $a.text().trim();
    if (/\btxt-st\b|\bbtn-st\b/.test(cls)) return;
    const isPrivacyPortalLink = FILE_VIEW_HOST_RE.test(href) || /\bps_link\b/.test(cls) ||
      (/개인정보/.test(text) && /파일|포털/.test(text));
    if (!isPrivacyPortalLink) return;

    if (/바로\s*가기/.test(text)) {
      // 일반 공백은 최종 출력 포매팅(tabIndent) 과정에서 인라인 요소 사이 텍스트가
      // 트리밍되며 사라지므로, &nbsp;로 아이콘과의 간격을 보존한다.
      $a.replaceWith(
        `<a href="" target="_blank" title="새창" class="txt-st link">${text}&nbsp;<i class="ri-external-link-line" aria-hidden="true"></i></a>`
      );
      return;
    }
    if (!/보기|다운로드/.test(text)) return;
    // 버튼 라벨은 원본 링크 텍스트를 그대로 살린다(예: "개인정보파일 목록 보기(클릭)") —
    // 고정 문구로 바꿔치기하면 안내 문구가 사라진다.
    const label = text || '파일 다운로드';
    const btn = '<a href="" target="download" download="" title="파일 다운로드" class="btn-st file btn-w100">' +
      `<span>${label}</span><i class="ri-share-box-line" aria-hidden="true"></i></a>`;
    const $p = $a.closest('p, li');
    if ($p.length && $p.text().trim() === text) {
      $p.replaceWith(`<div class="btns only">${btn}</div>`);
    } else {
      $a.replaceWith(`<div class="btns only">${btn}</div>`);
    }
  });

  // 0-2) p[class*="tit_list"] → h4 (섹션 제목, 이미지 제거)
  //      p.tit_01 / p.tit_st 등 유사 제목 클래스도 동일 처리
  $('p[class*="tit_list"], p.tit_01, p.tit_st').each((_, el) => {
    const $el = $(el);
    if ($el.parents('ul,ol,li,table').length) return;
    $el.find('img').remove();
    const text = $el.text().trim();
    if (!text || text.length > 200) { $el.remove(); return; }
    const id = $el.attr('id') || '';
    $el.replaceWith(`<h4${id ? ` id="${id}"` : ''}>${text}</h4>`);
  });

  // 0-3) ul/ol 내 제N조 패턴 li → h3으로 추출 (리스트에서 제목 분리)
  //      PP 페이지에서 제N조 타이틀이 ul 항목으로 들어온 경우 heading으로 복원
  if (PRIVACY_RE.test($('body').text())) {
    let clauseLoop = true;
    while (clauseLoop) {
      clauseLoop = false;
      $('ul > li, ol > li').each((_, li) => {
        const $li = $(li);
        const text = $li.text().trim();
        if (!/^제\s*\d+\s*조/.test(text) || text.length > 120) return;
        if ($li.find('ul,ol,table').length) return;
        const $parent = $li.parent();
        const pTag = ($parent.get(0)?.tagName || 'ul').toLowerCase();
        const pCls = $parent.attr('class') || '';
        const prevItems = $li.prevAll('li').toArray().reverse();
        const nextItems = $li.nextAll('li').toArray();
        let replacement = '';
        if (prevItems.length) {
          replacement += `<${pTag}${pCls ? ` class="${pCls}"` : ''}>${prevItems.map(el => $.html(el)).join('')}</${pTag}>`;
        }
        replacement += `<h3>${text}</h3>`;
        if (nextItems.length) {
          replacement += `<${pTag}${pCls ? ` class="${pCls}"` : ''}>${nextItems.map(el => $.html(el)).join('')}</${pTag}>`;
        }
        $parent.replaceWith(replacement);
        clauseLoop = true;
        return false;
      });
    }
  }

  // 0-4) dl > dt 제N조·번호형 패턴 → h3 추출 (저작권지침·영상정보처리방침 등 dl 구조 대응)
  //      PP 0-3과 동일 방식, PP·VP·CP 모두 적용
  const CP_RE_PRE = /저작권\s*(?:보호\s*)?(?:지침|정책|방침|안내|신고)/;
  const VP_RE_PRE = /영상\s*정보\s*처리\s*방침/;
  if (PRIVACY_RE.test($('body').text()) || CP_RE_PRE.test($('body').text()) || VP_RE_PRE.test($('body').text())) {
    $('dl').each((_, dl) => {
      const $dl = $(dl);
      const dts = $dl.children('dt').toArray();
      if (!dts.length) return;

      // 번호형(제N조 제외) dt + 대응 dd가 2개 이상 → 실제 순번이 있으므로 order-st1로 변환
      // 번호는 "①②③..." 원문자형과 "1." / "1)" 아라비아형을 모두 인식한다. 마커 판별은
      // dt 텍스트가 그 번호로 "시작"하는지만 보면 되고 조항 설명이 길어도(흔함) 무관하므로
      // 전체 길이로 걸러내지 않는다.
      const ddEls = $dl.children('dd').toArray();
      const numberedDts = dts.filter(dt => {
        const t = $(dt).text().trim();
        return CIRCLED_RE.test(t) || NUM_DOT_RE.test(t);
      });
      if (numberedDts.length >= 2 && (ddEls.length === 0 || ddEls.length >= numberedDts.length * 0.5)) {
        const items = [];
        let pendingNum = '';
        let pendingTitle = '';
        let pendingDds = [];
        const flush = () => {
          if (!pendingTitle && !pendingDds.length) return;
          let ddPart = '';
          if (pendingDds.length) {
            // dt 하나에 dd가 여러 개 딸려 있고 그 dd들도 전부 번호형이면(예: "1. 파기절차",
            // "2. 파기방법") 각자 번호를 가진 별개 하위 항목이므로 중첩 순서 리스트로 만든다.
            // 그렇지 않으면 기존처럼 <br>로 이어붙인다.
            const marked = pendingDds.map(html => {
              const cm = html.match(CIRCLED_RE);
              const nm = html.match(NUM_DOT_RE);
              if (cm) return { num: CIRCLED.indexOf(cm[1]) + 1, body: html.replace(CIRCLED_RE, '') };
              if (nm) return { num: nm[1], body: html.replace(NUM_DOT_RE, '') };
              return null;
            });
            if (pendingDds.length >= 2 && marked.every(Boolean)) {
              ddPart = `<ol class="order-st2">${marked.map(m => `<li><span class="mrk">${m.num}</span>${m.body}</li>`).join('')}</ol>`;
            } else {
              ddPart = pendingDds.map(html => '<br>' + html).join('');
            }
          }
          items.push(`<li>${pendingNum ? `<span class="mrk">${pendingNum}</span>` : ''}${pendingTitle}${ddPart}</li>`);
          pendingNum = ''; pendingTitle = ''; pendingDds = [];
        };
        $dl.children().toArray().forEach(child => {
          const childTag = (child.tagName || '').toLowerCase();
          const $child = $(child);
          if (childTag === 'dt') {
            flush();
            const raw = ($child.html() || '').trim();
            const text = $child.text().trim();
            const cm = text.match(CIRCLED_RE);
            const nm = text.match(NUM_DOT_RE);
            if (cm) { pendingNum = String(CIRCLED.indexOf(cm[1]) + 1); pendingTitle = raw.replace(CIRCLED_RE, ''); }
            else if (nm) { pendingNum = nm[1]; pendingTitle = raw.replace(NUM_DOT_RE, ''); }
            else { pendingNum = ''; pendingTitle = raw; }
          } else if (childTag === 'dd') {
            const ddHtml = ($child.html() || '').trim();
            if (ddHtml) pendingDds.push(ddHtml);
          }
        });
        flush();
        if (items.length) {
          $dl.replaceWith(`<ol class="order-st1">${items.join('')}</ol>`);
          return;
        }
      }

      let replacements = '';
      // 모든 자식을 순서대로 처리 — dt/dd 외 요소(h2 타이틀 등)도 그대로 보존
      $dl.children().toArray().forEach(child => {
        const childTag = (child.tagName || '').toLowerCase();
        const $child = $(child);
        if (childTag === 'dt') {
          const text = $child.text().trim();
          // dt 뒤에 dd가 여러 개 이어질 수 있음(예: dd별로 "1. 파기절차"/"2. 파기방법"처럼
          // 각자 번호를 가진 경우) — 하나로 합치면 항목 경계가 사라지므로 dd마다 별도 블록 유지
          const ddParts = $child.nextUntil('dt', 'dd').toArray().map(dd => $(dd).html() || '').filter(h => h.trim());
          const isClause = /^제\s*\d+\s*조/.test(text) && text.length < 120;
          const isNumbered = /^\d+\.\s+[가-힣A-Za-z]/.test(text) && text.length < 80;
          replacements += (isClause || isNumbered) ? `<h3>${$child.html()}</h3>` : `<p>${$child.html()}</p>`;
          ddParts.forEach(h => {
            replacements += /<(?:table|div|ul|ol|h[1-6]|p)\b/i.test(h) ? h : `<p>${h}</p>`;
          });
        } else if (childTag === 'dd') {
          // dd는 바로 앞 dt가 nextUntil로 처리하므로 스킵
        } else {
          // dt/dd 외 자식(h1~h6 타이틀 등) → 원본 태그 그대로 보존
          replacements += $.html(child);
        }
      });
      if (replacements) $dl.replaceWith(replacements);
    });
  }

  // 1) 개인정보처리방침 포함 비헤딩 요소 → h2 (directMarkupHtml에서 h3.tit-st.section으로 매핑)
  //    "방침" 뒤에 공백·기호 정도는 허용 (예: "- 2026학년도 개인정보처리방침 -")
  //    a는 문서 타이틀일 수 없으므로 제외하고, li/ul/ol 하위 요소(예: "이전 개인정보처리방침
  //    보기" 같은 과거 버전 링크 목록의 각 항목)도 문서 타이틀 승격 대상에서 제외한다.
  //    이 둘을 빼지 않으면 목록 안의 링크 텍스트가 통째로 <h2>로 잘못 승격되어 링크가 사라진다.
  $('*').not('h1,h2,h3,h4,h5,h6,script,style,table,thead,tbody,tr,th,td,ul,ol,li,a').each((_, el) => {
    const $el = $(el);
    if ($el.closest('li,ul,ol').length) return;
    if ($el.find('ul,ol,table,h1,h2,h3,h4,h5,h6').length) return;
    const text = $el.text().trim();
    if (!PRIVACY_RE.test(text) || text.length > 80) return;
    const ppIdx = text.lastIndexOf('방침');
    if (ppIdx < 0 || text.slice(ppIdx + 2).replace(/[\s\-–·.·]/g, '').length > 3) return;
    $el.replaceWith(`<h2>${text}</h2>`);
  });

  // 1-a) 개인정보처리방침 타이틀이 h3/h4/h5/h6 헤딩인 경우 → h2 강제 변환
  //      AND 동일 shift만큼 하위 계층도 조정하여 섹션 타이틀이 h3이 되도록 보장
  //      (페이지에 다른 h1/h2가 있어 레벨 정규화 shift가 작동하지 않는 경우 대비)
  //      단, cStyle 클래스가 붙은 헤딩은 건드리지 않는다 — h4.cStyle/h5.cStyle은 이미
  //      directMarkupHtml에서 사이트 고유 관례로 직접 매핑되므로(1-a-2와 동일한 이유),
  //      여기서 h4.cStyle 타이틀을 h2로 바꾸면 ppShift가 발동해 형제 h5.cStyle/h6.cStyle
  //      까지 우르르 재조정되며 서로 다른 계층이 뭉개진다(예: h6이 h5와 같은 레벨이 됨).
  let ppShift = 0;
  $('h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
    if (/\bcStyle\b/.test($el.attr('class') || '')) return;
    const text = $el.text().trim();
    const ppIdx = text.lastIndexOf('방침');
    const validPP = PRIVACY_RE.test(text) && text.length < 120 &&
      ppIdx >= 0 && text.slice(ppIdx + 2).replace(/[\s\-–·.·]/g, '').length <= 3;
    if (validPP) {
      ppShift = parseInt((el.tagName || 'h3').slice(1)) - 2;
      $el.replaceWith(`<h2>${$el.html()}</h2>`);
    }
  });
  if (ppShift > 0) {
    for (let l = 6; l >= 3; l--) {
      const nl = Math.max(l - ppShift, 3);
      if (nl !== l) {
        $(`h${l}`).each((_, el) => {
          const $el = $(el);
          $el.replaceWith(`<h${nl}>${$el.html()}</h${nl}>`);
        });
      }
    }
  }

  // 1-a-2) h3이 없고 h4가 있는 경우: h4→h3 시프트
  // → h2 유무와 관계없이, h4가 실질 최상위 섹션 헤딩이면 h4→h5.unit 대신 h3→h4.contents로 매핑
  // 단, h4.cStyle은 directMarkupHtml에서 그대로 h3.tit-st.section으로 매핑하는 이 사이트
  // 고유 관례가 있으므로, 태그·클래스를 건드리지 않고 그대로 둔다.
  if ($('h3').length === 0 && $('h4').length > 0) {
    $('h4').each((_, el) => {
      const $el = $(el);
      if (/\bcStyle\b/.test($el.attr('class') || '')) return;
      $el.replaceWith(`<h3>${$el.html()}</h3>`);
    });
  }

  // 1-b) 저작권+보호 타이틀 비헤딩 요소(span, p, div 등) → h2
  //      "저작권"과 "보호" 두 단어가 모두 포함된 요소만 h2로 변환
  //      a/li/ul/ol 하위 요소는 제외(위 1번과 동일한 이유: 목록 안 링크가 잘못 승격되는 것 방지)
  $('*').not('h1,h2,h3,h4,h5,h6,script,style,table,thead,tbody,tr,th,td,ul,ol,li,a').each((_, el) => {
    const $el = $(el);
    if ($el.closest('li,ul,ol').length) return;
    if ($el.find('ul,ol,table,h1,h2,h3,h4,h5,h6').length) return;
    const text = $el.text().trim();
    if (!/저작권/.test(text) || !/보호/.test(text) || text.length > 80) return;
    $el.replaceWith(`<h2>${text}</h2>`);
  });

  // 1-c) 저작권+보호 타이틀이 h3/h4/h5/h6 헤딩인 경우 → h2 강제 변환 (1-a와 동일 방식)
  //      1-a와 동일한 이유로 cStyle 헤딩은 건드리지 않는다.
  let cpShift = 0;
  $('h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
    if (/\bcStyle\b/.test($el.attr('class') || '')) return;
    const text = $el.text().trim();
    if (/저작권/.test(text) && /보호/.test(text) && text.length < 120) {
      cpShift = parseInt((el.tagName || 'h3').slice(1)) - 2;
      $el.replaceWith(`<h2>${$el.html()}</h2>`);
    }
  });
  if (cpShift > 0) {
    for (let l = 6; l >= 3; l--) {
      const nl = Math.max(l - cpShift, 3);
      if (nl !== l) {
        $(`h${l}`).each((_, el) => {
          const $el = $(el);
          $el.replaceWith(`<h${nl}>${$el.html()}</h${nl}>`);
        });
      }
    }
  }

  // 1-d) 저작권 관련 h1/h2가 위치표시·브레드크럼 등 노이즈 컨테이너 내에 있으면 body 앞으로 이동
  //      directMarkupHtml이 노이즈 컨테이너를 필터링하여 타이틀이 사라지는 문제 방지
  {
    const CP_NOISE_IDS = new Set(['location', 'pagetxt', 'pageTxt', 'sidecontent', 'side_content', 'sideContent']);
    const CP_NOISE_CLS = ['line_map', 'linemap', 'breadcrumb', 'location_bar', 'navi_map', 'sidecontent', 'side_content', 'lnb_wrap'];
    $('h1, h2').each((_, h) => {
      const $h = $(h);
      const text = $h.text().trim();
      if (!CP_RE_PRE.test(text) || text.length > 150) return;
      const inNoise = $h.parents().toArray().some(p => {
        const pid = ($(p).attr('id') || '').toLowerCase();
        const pcls = ($(p).attr('class') || '').toLowerCase();
        return CP_NOISE_IDS.has($(p).attr('id') || '') || CP_NOISE_IDS.has(pid) ||
          CP_NOISE_CLS.some(k => pcls.includes(k) || pid.includes(k));
      });
      if (inNoise) {
        const tag = (h.tagName || 'h2').toLowerCase();
        $('body').prepend(`<${tag}>${$h.html()}</${tag}>`);
        $h.remove();
      }
    });
  }

  // 2) "N. 소제목" 패턴 → h3
  //    <p><strong>N. 제목</strong></p> : strong 자식이면 섹션 제목 확정
  //    <p>N. 제목</p> : strong 없을 때는 짧고 콜론 없는 경우만 (본문 번호 항목 오변환 방지)
  //    페이지에 strong 감싼 번호형 섹션이 있으면 → plain p의 N. 항목은 하위 항목으로 간주, h3 변환 금지
  const NUMBERED_SEC_RE = /^\d+\.\s+[가-힣A-Za-z]/;
  const hasStrongSections = $('p > strong, p > b').toArray()
    .some(el => NUMBERED_SEC_RE.test($(el).text().trim()));
  $('p').each((_, el) => {
    const $el = $(el);
    if ($el.parents('ul,ol,li,table').length) return;
    if ($el.find('ul,ol,table,h1,h2,h3,h4,h5,h6').length) return;
    const text = $el.text().trim();
    if (!NUMBERED_SEC_RE.test(text) || text.length > 150 || /다\.$/.test(text)) return;
    const hasStrong = $el.children('strong, b').length > 0;
    // strong 섹션 페이지: plain p는 하위 항목 → 변환 금지
    if (hasStrongSections && !hasStrong) return;
    // strong 없으면 짧고 콜론·괄호 없는 경우만 섹션 제목으로 처리
    if (!hasStrong && (text.length > 45 || /[:：(（]/.test(text))) return;
    $el.replaceWith(`<h3>${text}</h3>`);
  });

  // 3) 헤딩 레벨 정규화: 최상위를 h2로 맞춤
  //    SYSTEM_FOOTER: h2→h3.tit-st.section, h3→h4.tit-st.contents 로 매핑됨
  //    PP 페이지에서 h3이 최상위이고 번호형 섹션 패턴이면 스킵:
  //    → 번호형 h3은 h4.contents로 매핑되어야 하며 타이틀은 footerAutoMarkup 폴백이 보완
  // 페이지에 cStyle 헤딩이 하나라도 있으면 이 페이지의 실제 계층은 cStyle 관례(h4=대제목,
  // h5=조항, h6=하위항목 등)를 따르는 것이므로 이 정규화 자체를 건너뛴다. 그렇지 않으면,
  // 예를 들어 "주요 개인정보 처리 표시(라벨링)"처럼 이미 앞선 단계(cleanHtml)에서 올바른
  // 태그로 확정된 bare h3가 cStyle 헤딩들(h4/h5)보다 낮은 번호라는 이유만으로 "이 문서의
  // 최상위 레벨"로 오인되어, 실제로는 조항이 아닌데도 h2로 더 승격되어버리는 문제가 생긴다.
  const hasCStyleHeadings = $('h1,h2,h3,h4,h5,h6').toArray().some(el => /\bcStyle\b/.test($(el).attr('class') || ''));
  const minLvl = hasCStyleHeadings ? 0 : ([1,2,3,4,5,6].find(l => $(`h${l}`).length > 0) ?? 0);
  if (minLvl >= 3) {
    const VP_RE = /영상\s*정보\s*처리\s*방침/;
    const CLAUSE_RE = /^제\s*\d+\s*조/;
    const isPpOrVpCtx = PRIVACY_RE.test($('body').text()) || VP_RE.test($('body').text());
    const sectionH3Exists = $('h3').toArray().some(el => {
      const t = $(el).text().trim();
      return NUMBERED_SEC_RE.test(t) || CLAUSE_RE.test(t);
    });
    if (!(isPpOrVpCtx && minLvl === 3 && sectionH3Exists)) {
      const shift = minLvl - 2;
      // cStyle 헤딩은 directMarkupHtml에서 사이트 고유 관례로 직접 매핑되므로 여기서 건드리지
      // 않는다. 또한 대상을 먼저 전부 수집한 뒤 한 번에 치환해야, 예를 들어 h6→h4로 옮긴
      // 요소가 바로 다음 h4→h2 단계에서 원래 h4였던 요소와 함께 다시 걸려 두 번 밀리는
      // (cascade) 문제가 생기지 않는다.
      const toShift = [];
      for (let l = minLvl; l <= 6; l++) {
        const nl = Math.min(l - shift, 6);
        if (nl !== l) {
          $(`h${l}`).each((_, el) => {
            if (/\bcStyle\b/.test($(el).attr('class') || '')) return;
            toShift.push({ el, nl });
          });
        }
      }
      toShift.forEach(({ el, nl }) => {
        const $el = $(el);
        $el.replaceWith(`<h${nl}>${$el.html()}</h${nl}>`);
      });
    }
  }

  return $('body').html() || html;
}

// ─── 푸터메뉴 AI 전달 전 구조 사전 변환 (출력 토큰 절약) ──────────────
// ①②③ / 1) 소제목 / 가. 나. 패턴을 미리 ul 구조로 변환해 AI 부담을 줄임
function preConvertFooterLists(html) {
  const $ = cheerio.load(html);

  // CIRCLED_RE는 모듈 상단에 이미 정의되어 있으므로 재사용
  const PAREN_NUM_RE = /^(\d+|[가나다라마바사아자차카타파하])\)\s*/;
  const ALPHA_LIST_RE = /^\s*[가나다라마바사아자차카타파하]\.\s+/;
  const DASH_RE = /^\s*[-–•]\s*/;
  const NUM_DOT_RE = /^\d+\.\s+\S/; // "1. 제목" 형식 (상위·하위 문맥에 따라 bu-st1 or bu-st2)

  // 0) 알려진 리스트 클래스 패턴 → KLIC 클래스 직접 변환 (AI 없이)
  // bomoonhs 등: ul.bu_list_01 → bu-st1, ul.bu_list_02 → bu-st2, ul.bu_list_03 → bu-st3
  $('ul').each((_, el) => {
    const $ul = $(el);
    const cls = $ul.attr('class') || '';
    if (/bu_list_01/.test(cls)) $ul.attr('class', 'bu-st1 list');
    else if (/bu_list_02/.test(cls)) $ul.attr('class', 'bu-st2 list');
    else if (/bu_list_03/.test(cls)) $ul.attr('class', 'bu-st3 list');
  });
  // 변환된 리스트의 li에서 ①②③ 선두 기호 제거
  $('ul.bu-st1 > li, ul.bu-st2 > li, ul.bu-st3 > li').each((_, li) => {
    const $li = $(li);
    const h = ($li.html() || '').trim();
    if (CIRCLED_RE.test(h)) $li.html(h.replace(CIRCLED_RE, '').trim());
  });

  // 0-A) ▶ 텍스트 + dl/p 패턴 → ul.bu-st1.list 구조 변환 + 연속 항목 단일 리스트 병합
  // ── 공통: dl 자식(dt/dd/p)을 li 배열로 변환 ──────────────────────────────
  const dlConvertSubItems = ($dl) => {
    const subItems = [];
    let pendingDt = null;
    $dl.children().each((_, child) => {
      const tag = (child.tagName || '').toLowerCase();
      const $child = $(child);
      if (tag === 'dt') {
        if (pendingDt !== null) subItems.push(`<li>${pendingDt}</li>`);
        pendingDt = $child.html() || '';
      } else if (tag === 'dd') {
        const ddHtml = ($child.html() || '').trim();
        if (pendingDt !== null) {
          subItems.push(`<li>${pendingDt}<br>${ddHtml}</li>`);
          pendingDt = null;
        } else {
          subItems.push(`<li>${ddHtml}</li>`);
        }
      } else if (tag === 'p') {
        const pHtml = ($child.html() || '').replace(/^\s*[-–•※]\s*/, '').trim();
        if (pHtml) subItems.push(`<li>${pHtml}</li>`);
      }
    });
    if (pendingDt !== null) subItems.push(`<li>${pendingDt}</li>`);
    return subItems;
  };

  // ── Step A-1: ▶ p + 직후 dl → 개별 ul.bu-st1.list ────────────────────────
  $('dl').each((_, dl) => {
    const $dl = $(dl);
    const $prev = $dl.prev();
    if (!$prev.length) return;
    const prevHtml = ($prev.html() || '').trim();
    if (!prevHtml.includes('▶')) return;
    const title = prevHtml.replace(/▶\s*/g, '').trim();
    const subItems = dlConvertSubItems($dl);
    const sub = subItems.length ? `<ul class="bu-st2 list">${subItems.join('')}</ul>` : '';
    $prev.before(`<ul class="bu-st1 list"><li>${title}${sub}</li></ul>`);
    $prev.remove();
    $dl.remove();
  });

  // ── Step A-2: 단독 ▶ p (dl 없음) → 개별 ul.bu-st1.list ──────────────────
  $('p').each((_, p) => {
    const $p = $(p);
    if ($p.parents('ul,ol,li,table,dl').length) return;
    const h = ($p.html() || '').trim();
    if (!h.includes('▶')) return;
    if (!$p.text().trim().startsWith('▶')) return; // ▶가 문두에 있어야 함
    const title = h.replace(/▶\s*/g, '').trim();
    $p.before(`<ul class="bu-st1 list"><li>${title}</li></ul>`);
    $p.remove();
  });

  // ── Step A-3: 인접한 ul.bu-st1.list 병합 → 하나의 리스트 ─────────────────
  let a3More = true;
  while (a3More) {
    a3More = false;
    $('ul.bu-st1.list').each((_, ul) => {
      const $ul = $(ul);
      const $next = $ul.next('ul');
      if (!$next.length || !/bu-st1/.test($next.attr('class') || '')) return;
      $ul.append($next.children());
      $next.remove();
      a3More = true;
      return false;
    });
  }

  // 1) ①②③ 연속 p 그룹 → ol.order-st1 (실제 순번이 있는 목록이므로 번호를 span.mrk로
  //    보존한다. 그룹이 1개뿐이어도(형제 중 매칭되는 다음 항목이 없어도) 원문에 있던
  //    번호 자체는 사라지면 안 되므로 order-st1로 만든다.)
  $('*').each((_, parent) => {
    const $parent = $(parent);
    const children = $parent.children().toArray();
    let i = 0;
    while (i < children.length) {
      const $first = $(children[i]);
      if (!$first.is('p') || !CIRCLED_RE.test(($first.html() || '').trim())) { i++; continue; }
      const group = [];
      let j = i;
      while (j < children.length) {
        const $p = $(children[j]);
        if (!$p.is('p')) break;
        const ph = ($p.html() || '').trim();
        const m = ph.match(CIRCLED_RE);
        if (!m) break;
        group.push({ $el: $p, num: CIRCLED.indexOf(m[1]) + 1, inner: ph.replace(CIRCLED_RE, '').trim() });
        j++;
      }
      if (group.length) {
        const liHtml = group.map(g => `<li><span class="mrk">${g.num}</span>${g.inner}</li>`).join('');
        $first.before(`<ol class="order-st1">${liHtml}</ol>`);
        group.forEach(g => g.$el.remove());
        i = j;
      } else { i++; }
    }
  });

  // 1-b) "1. 소제목" + 직후 "- " 대시 항목 쌍 → ul 구조 변환
  //      step 4("가. 나." + 대시)와 동일 로직, 숫자 도트 형식 처리
  //      앞에 bu-st1이 있으면 → bu-st2로 마지막 li에 중첩
  //      없으면 → bu-st1으로 생성 (대시 항목은 bu-st2로 중첩)
  $('*').not('ul,ol,li,table').each((_, container) => {
    const $c = $(container);
    let restart = true;
    while (restart) {
      restart = false;
      const kids = $c.children().toArray();
      for (let i = 0; i < kids.length; i++) {
        const $first = $(kids[i]);
        if (!$first.is('p') || !NUM_DOT_RE.test($first.text())) continue;
        const groups = [];
        let k = i;
        while (k < kids.length) {
          const $curr = $(kids[k]);
          if (!$curr.is('p') || !NUM_DOT_RE.test($curr.text())) break;
          const title = ($curr.html() || '').replace(/^\d+\.\s+/, '').trim();
          const dashEls = [];
          let m = k + 1;
          while (m < kids.length && $(kids[m]).is('p') && DASH_RE.test($(kids[m]).text())) {
            dashEls.push(m);
            m++;
          }
          groups.push({ k, title, dashEls, end: m });
          k = m;
        }
        // 대시 하위 항목이 하나도 없으면 step 2-b에서 처리
        if (groups.length < 1 || !groups.some(g => g.dashEls.length > 0)) continue;
        const liHtml = groups.map(g => {
          const sub = g.dashEls.length > 0
            ? `<ul class="bu-st2 list">${g.dashEls.map(di => {
                const $d = $(kids[di]);
                return `<li>${($d.html() || '').replace(DASH_RE, '').trim()}</li>`;
              }).join('')}</ul>`
            : '';
          return `<li>${g.title}${sub}</li>`;
        }).join('');
        const $prevEl = $first.prev('ul');
        const hasPrevBu1 = $prevEl.length && /bu-st1/.test($prevEl.attr('class') || '');
        if (hasPrevBu1) {
          $prevEl.children('li').last().append(`<ul class="bu-st2 list">${liHtml}</ul>`);
        } else {
          $first.before(`<ul class="bu-st1 list">${liHtml}</ul>`);
        }
        for (let r = i; r < k; r++) $(kids[r]).remove();
        restart = true;
        break;
      }
    }
  });

  // 2) "1) 소제목" + 본문 p 쌍 → ul.bu-st2.list 중첩 (상위 ul.bu-st1 li 또는 일반 위치)
  //    1(또는 가)부터 순차 증가하는 진짜 순번일 때만 그룹화
  $('*').each((_, container) => {
    const $c = $(container);
    const pArr = $c.children('p').toArray();
    let i = 0;
    while (i < pArr.length) {
      const $p = $(pArr[i]);
      const txt = $p.text().trim();
      const firstM = txt.match(PAREN_NUM_RE);
      if (!firstM || !isStartMarker(firstM[1]) || txt.length > 80) { i++; continue; }
      const group = [];
      let j = i, expected = firstM[1];
      while (j < pArr.length) {
        const $curr = $(pArr[j]);
        const currTxt = $curr.text().trim();
        const m = currTxt.match(PAREN_NUM_RE);
        if (m && m[1] === expected && currTxt.length <= 80) {
          const title = currTxt.replace(PAREN_NUM_RE, '').trim();
          const $next = $(pArr[j + 1]);
          const _nextTxt1 = $next.length ? $next.text().trim() : '';
          if ($next.length && !PAREN_NUM_RE.test(_nextTxt1) && !/^제\s*\d+\s*조/.test(_nextTxt1) && !/^\[데이터표_/.test(_nextTxt1)) {
            group.push({ $t: $curr, $b: $next, title, body: $next.html() || '' });
            j += 2;
          } else {
            group.push({ $t: $curr, $b: null, title, body: '' });
            j += 1;
          }
          expected = nextMarker(expected);
          if (!expected) { j = pArr.length; break; }
        } else { break; }
      }
      if (group.length >= 1) {
        const ulHtml = `<ul class="bu-st2 list">${group.map(g => `<li>${g.title}${g.body ? '<br>' + g.body : ''}</li>`).join('')}</ul>`;
        // 이전 형제가 bu-st1 리스트이면 마지막 li 안에 중첩, 아니면 형제로 삽입
        const $prev = $p.prev();
        if ($prev.length && $prev.is('ul') && /bu-st1/.test($prev.attr('class') || '')) {
          $prev.children('li').last().append(ulHtml);
        } else {
          $p.before(ulHtml);
        }
        group.forEach(g => { g.$t.remove(); if (g.$b) g.$b.remove(); });
        i = j;
      } else { i++; }
    }
  });

  // 2-b) "1. 소제목" + 본문 p 쌍 (대시 없는 잔여 항목, step 1-b 미처리)
  //      1부터 순차 증가하는 진짜 순번일 때만 그룹화 (연도·전화번호 등 우연히 숫자로
  //      시작하는 일반 텍스트가 리스트로 오인되어 앞부분이 잘려나가는 것을 방지)
  //      실제 순번이 있는 목록이므로 순서 리스트(order-st1/order-st2)로 생성
  //      앞에 ol.order-st1이 있으면 → order-st2로 마지막 li에 중첩
  const NUM_VAL_RE = /^(\d+)\.\s+\S/;
  $('*').each((_, container) => {
    const $c = $(container);
    const pArr = $c.children('p').toArray();
    let i = 0;
    while (i < pArr.length) {
      const $p = $(pArr[i]);
      const txt = $p.text().trim();
      const firstNum = txt.match(NUM_VAL_RE);
      if (!firstNum || parseInt(firstNum[1], 10) !== 1 || txt.length > 80) { i++; continue; }
      const group = [];
      let j = i, expected = 1;
      while (j < pArr.length) {
        const $curr = $(pArr[j]);
        const currTxt = $curr.text().trim();
        const numMatch = currTxt.match(NUM_VAL_RE);
        // 후속 항목은 원문에 <br>로 이어진 부연 설명이 포함될 수 있어 첫 항목보다 넉넉하게 허용
        if (numMatch && parseInt(numMatch[1], 10) === expected && currTxt.length <= 400) {
          const title = currTxt.replace(/^\d+\.\s+/, '').trim();
          const $next = j + 1 < pArr.length ? $(pArr[j + 1]) : null;
          const nextIsDash = $next && DASH_RE.test($next.text().trim());
          const nextIsDot = $next && NUM_DOT_RE.test($next.text().trim());
          const nextIsClause = $next && /^제\s*\d+\s*조/.test($next.text().trim());
          const nextIsPlaceholder = $next && /^\[데이터표_/.test($next.text().trim());
          if ($next && !nextIsDash && !nextIsDot && !nextIsClause && !nextIsPlaceholder) {
            group.push({ $t: $curr, $b: $next, num: numMatch[1], title, body: $next.html() || '' });
            j += 2;
          } else {
            group.push({ $t: $curr, $b: null, num: numMatch[1], title, body: '' });
            j += 1;
          }
          expected++;
        } else { break; }
      }
      if (group.length >= 1) {
        const $prev = $p.prev('ol');
        const hasPrevOrder1 = $prev.length && /order-st1/.test($prev.attr('class') || '');
        const listCls = hasPrevOrder1 ? 'order-st2' : 'order-st1';
        const olHtml = `<ol class="${listCls}">${group.map(g => `<li><span class="mrk">${g.num}</span>${g.title}${g.body ? '<br>' + g.body : ''}</li>`).join('')}</ol>`;
        if (hasPrevOrder1) {
          $prev.children('li').last().append(olHtml);
        } else {
          $p.before(olHtml);
        }
        group.forEach(g => { g.$t.remove(); if (g.$b) g.$b.remove(); });
        i = j;
      } else { i++; }
    }
  });

  // 3) "가. 나. 다." p → ul.bu-st2.list (①② li 바깥에 있을 때)
  //    각 가나다 항목 직후 본문 p(비알파)가 있으면 <li>제목<br>본문</li>로 처리
  $('*').not('ul,ol,li').each((_, container) => {
    const $c = $(container);
    const pArr = $c.children('p').toArray();
    let i = 0;
    while (i < pArr.length) {
      const $p = $(pArr[i]);
      const txt = $p.text().trim();
      if (!ALPHA_LIST_RE.test(txt)) { i++; continue; }
      const group = [];
      let j = i;
      while (j < pArr.length) {
        const $curr = $(pArr[j]);
        const currTxt = $curr.text().trim();
        if (!ALPHA_LIST_RE.test(currTxt)) break;
        const inner = ($curr.html() || '').replace(ALPHA_LIST_RE, '').trim();
        const $next = j + 1 < pArr.length ? $(pArr[j + 1]) : null;
        const hasBody = $next && !ALPHA_LIST_RE.test($next.text().trim()) && !/^\[데이터표_/.test($next.text().trim());
        if (hasBody) {
          group.push({ $el: $curr, $body: $next, inner, body: $next.html() || '' });
          j += 2;
        } else {
          group.push({ $el: $curr, $body: null, inner, body: '' });
          j++;
        }
      }
      if (group.length >= 2) {
        $p.before(`<ul class="bu-st2 list">${group.map(g => `<li>${g.inner}${g.body ? '<br>' + g.body : ''}</li>`).join('')}</ul>`);
        group.forEach(g => { g.$el.remove(); if (g.$body) g.$body.remove(); });
        i = j;
      } else { i++; }
    }
  });

  // 4) "가. 나." + 직후 "- " 대시 항목 → ul.bu-st1.list (nested bu-st2)
  //    step 3이 처리 못한 케이스(대시 하위 항목이 연속성을 끊는 구조)를 커버
  $('*').not('ul,ol,li,table').each((_, container) => {
    const $c = $(container);
    let restart = true;
    while (restart) {
      restart = false;
      const kids = $c.children().toArray();
      for (let i = 0; i < kids.length; i++) {
        const $first = $(kids[i]);
        if (!$first.is('p') || !ALPHA_LIST_RE.test($first.text())) continue;
        const groups = [];
        let k = i;
        while (k < kids.length) {
          const $curr = $(kids[k]);
          if (!$curr.is('p') || !ALPHA_LIST_RE.test($curr.text())) break;
          const title = ($curr.html() || '').replace(ALPHA_LIST_RE, '').trim();
          const dashEls = [];
          let m = k + 1;
          while (m < kids.length && $(kids[m]).is('p') && DASH_RE.test($(kids[m]).text())) {
            dashEls.push(m);
            m++;
          }
          groups.push({ k, title, dashEls, end: m });
          k = m;
        }
        if (groups.length < 1 || !groups.some(g => g.dashEls.length > 0)) continue;
        const liHtml = groups.map(g => {
          const sub = g.dashEls.length > 0
            ? `<ul class="bu-st2 list">${g.dashEls.map(di => {
                const $d = $(kids[di]);
                return `<li>${($d.html() || '').replace(DASH_RE, '').trim()}</li>`;
              }).join('')}</ul>`
            : '';
          return `<li>${g.title}${sub}</li>`;
        }).join('');
        $first.before(`<ul class="bu-st1 list">${liHtml}</ul>`);
        for (let r = i; r < k; r++) $(kids[r]).remove();
        restart = true;
        break;
      }
    }
  });

  // 5) 단독 연속 "- " 항목 2개 이상 → ul.bu-st1.list (step 4 이후 잔여 항목)
  $('*').not('ul,ol,li,table').each((_, container) => {
    const $c = $(container);
    let restart = true;
    while (restart) {
      restart = false;
      const kids = $c.children().toArray();
      for (let i = 0; i < kids.length; i++) {
        const $first = $(kids[i]);
        if (!$first.is('p') || !DASH_RE.test($first.text())) continue;
        const group = [];
        let k = i;
        while (k < kids.length && $(kids[k]).is('p') && DASH_RE.test($(kids[k]).text())) {
          const $d = $(kids[k]);
          group.push(($d.html() || '').replace(DASH_RE, '').trim());
          k++;
        }
        if (group.length >= 2) {
          $first.before(`<ul class="bu-st1 list">${group.map(d => `<li>${d}</li>`).join('')}</ul>`);
          for (let r = i; r < k; r++) $(kids[r]).remove();
          restart = true;
          break;
        } else {
          i = k - 1;
        }
      }
    }
  });

  // 6) ul.bu-st2 리스트가 ul.bu-st1 바로 뒤에 있으면 → bu-st1의 마지막 li 안에 중첩
  //    (bu_list_01/02 직접 변환 경로: 원본 HTML이 두 ul을 형제로 구성한 경우 대비)
  $('ul.bu-st2.list').each((_, ul) => {
    const $ul = $(ul);
    const $prev = $ul.prev('ul');
    if (!$prev.length || !/bu-st1/.test($prev.attr('class') || '')) return;
    $prev.children('li').last().append($ul);
  });

  return $('body').html() || html;
}

// ─── 푸터메뉴 전용 후처리 ─────────────────────────────────────
function postProcessFooterMarkup(html) {
  let $ = cheerio.load(html);

  // 0) AI 출력에서 ▶ p 패턴이 남아 있으면 ul.bu-st1.list로 변환 (preConvert 미처리 폴백)
  //    ▶ p + 선택적 내용 p(- 항목들) → bu-st1 + bu-st2 / 연속 항목 단일 리스트 병합
  $('*').not('ul,ol,li,table').each((_, container) => {
    const $c = $(container);
    let restart = true;
    while (restart) {
      restart = false;
      const kids = $c.children().toArray();
      for (let i = 0; i < kids.length; i++) {
        const $first = $(kids[i]);
        if (!$first.is('p')) continue;
        if (!$first.text().trim().startsWith('▶')) continue;

        const liParts = [];
        let k = i;
        while (k < kids.length) {
          const $curr = $(kids[k]);
          if (!$curr.is('p')) break;
          if (!$curr.text().trim().startsWith('▶')) break;

          const titleHtml = ($curr.html() || '').replace(/▶\s*/, '').trim();
          const $next = k + 1 < kids.length ? $(kids[k + 1]) : null;

          if ($next && $next.is('p') && !$next.text().trim().startsWith('▶')) {
            const contentHtml = $next.html() || '';
            // 줄바꿈 + 대시 기준으로 분리 시도
            const parts = contentHtml.split(/\n\s*[-–]\s+/);
            if (parts.length > 1) {
              const cleanParts = parts.map(p => p.replace(/^\s*[-–]\s*/, '').trim()).filter(Boolean);
              const sub = `<ul class="bu-st2 list">${cleanParts.map(p => `<li>${p}</li>`).join('')}</ul>`;
              liParts.push(`<li>${titleHtml}${sub}</li>`);
            } else {
              liParts.push(`<li>${titleHtml}<br>${contentHtml}</li>`);
            }
            k += 2;
          } else {
            liParts.push(`<li>${titleHtml}</li>`);
            k += 1;
          }
        }

        if (!liParts.length) continue;
        $first.before(`<ul class="bu-st1 list">${liParts.join('')}</ul>`);
        for (let r = i; r < k; r++) $(kids[r]).remove();
        restart = true;
        break;
      }
    }
  });
  // 인접 ul.bu-st1.list 병합
  let ppMergeMore = true;
  while (ppMergeMore) {
    ppMergeMore = false;
    $('ul.bu-st1.list').each((_, ul) => {
      const $ul = $(ul);
      const $next = $ul.next('ul');
      if (!$next.length || !/bu-st1/.test($next.attr('class') || '')) return;
      $ul.append($next.children());
      $next.remove();
      ppMergeMore = true;
      return false;
    });
  }

  // 1) ①② p 그룹 → ul.bu-st1.list (postProcessMarkup이 ol로 변환하기 전에 선처리)
  $('*').each((_, parent) => {
    const $parent = $(parent);
    const children = $parent.children().toArray();
    let i = 0;
    while (i < children.length) {
      const $first = $(children[i]);
      if (!$first.is('p')) { i++; continue; }
      if (!CIRCLED_RE.test(($first.html() || '').trim())) { i++; continue; }
      const group = [];
      let j = i;
      while (j < children.length) {
        const $p = $(children[j]);
        if (!$p.is('p')) break;
        const ph = ($p.html() || '').trim();
        if (!CIRCLED_RE.test(ph)) break;
        group.push({ $el: $p, inner: ph.replace(CIRCLED_RE, '').trim() });
        j++;
      }
      if (group.length) {
        $first.before(`<ul class="bu-st1 list">${group.map(g => `<li>${g.inner}</li>`).join('')}</ul>`);
        group.forEach(g => g.$el.remove());
        i = j;
      } else { i++; }
    }
  });

  // 2) 표준 후처리 실행 (ul 클래스 계층 자동 지정 포함)
  let result = postProcessMarkup($('body').html() || html);

  // 3) ul li에 남은 ①② 기호 제거
  $ = cheerio.load(result);
  $('ul li').each((_, li) => {
    const $li = $(li);
    const inner = ($li.html() || '').trim();
    if (CIRCLED_RE.test(inner)) $li.html(inner.replace(CIRCLED_RE, '').trim());
  });

  // 4) ol의 li에 span.mrk와 별개로 원문자가 중복 남아있으면(AI가 번호를 이중으로 남긴
  //    경우) ul.bu-st1.list로 교체 (테이블 경로 대비). span.mrk 자체의 내용으로 정상
  //    사용된 원문자(예: <li><span class="mrk">①</span>텍스트</li>)까지 오탐하지
  //    않도록, span.mrk를 제거한 "나머지" 내용에 원문자가 남아있는 경우만 중복으로 본다.
  $('ol').each((_, ol) => {
    const $ol = $(ol);
    const hasDuplicateCircledMrk = $ol.find('> li').toArray().some(li => {
      const $li = $(li);
      const $rest = $li.clone();
      $rest.find('> span.mrk').remove();
      const rest = ($rest.html() || '').trim();
      return CIRCLED_RE.test(rest) || CIRCLED_RE.test($rest.text().trim());
    });
    if (!hasDuplicateCircledMrk) return;
    $ol.find('> li').each((_, li) => {
      const $li = $(li);
      $li.find('> span.mrk').remove();
      $li.html(($li.html() || '').replace(CIRCLED_RE, '').trim());
    });
    $ol.replaceWith(`<ul class="bu-st1 list">${$ol.html()}</ul>`);
  });

  // 5) box-st emp p 내 "다." 문장 끝에 <br> 추가
  $('[class*="box-st"][class*="emp"] p').each((_, p) => {
    const $p = $(p);
    const raw = $p.html() || '';
    const updated = raw.replace(/다\.\s+(?=[가-힣])/g, '다.<br>');
    if (updated !== raw) $p.html(updated);
  });

  // 6) 폴백: "N. 소제목" p가 h4로 변환 안 된 경우 직접 변환
  //    strong 없을 때는 짧고 콜론·괄호 없는 경우만 (본문 번호 항목 오변환 방지)
  //    들여쓰기 스타일이 있으면 하위 항목 → 제목 변환 금지
  const NUMBERED_SEC_RE = /^\d+\.\s+[가-힣A-Za-z]/;
  $('p').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    if (!NUMBERED_SEC_RE.test(text) || text.length > 150 || /다\.$/.test(text)) return;
    if ($el.parents('ul,ol,li,table,.box-st,.indent').length) return;
    if (/margin-left|padding-left/i.test($el.attr('style') || '')) return;
    const hasStrong = $el.children('strong').length > 0;
    if (!hasStrong && (text.length > 45 || /[:：(（]/.test(text))) return;
    $el.replaceWith(`<h4 class="tit-st contents">${text}</h4>`);
  });

  // 7) h4.tit-st.contents 뒤의 형제 요소 → div.indent로 감싸기
  //    단, "주요 개인정보 처리 표시(라벨링)"·"목차" 아이콘 요약표는 전체 너비로
  //    보여줘야 하므로 indent(좌측 여백)를 적용하지 않는다.
  const NO_INDENT_HEADING_RE = /^주요\s*개인정보\s*처리\s*표시(?:\s*\(라벨링\))?$|^목차$/;
  $('h4.tit-st.contents').each((_, h4) => {
    const $h4 = $(h4);
    if ($h4.next().is('.indent')) return;
    if (NO_INDENT_HEADING_RE.test($h4.text().trim())) return;
    const siblings = [];
    let cursor = $h4.next();
    while (cursor.length && !cursor.is('h1,h2,h3,h4,h5,h6')) {
      siblings.push(cursor[0]);
      cursor = cursor.next();
    }
    if (!siblings.length) return;
    const $wrapper = $('<div class="indent"></div>');
    $(siblings[0]).before($wrapper);
    siblings.forEach(s => $wrapper.append($(s)));
  });

  // 7-0.5) .indent 안의 유일한 내용이 box-st·tbl-st인 경우 래퍼를 벗긴다. [데이터표_N]
  //        플레이스홀더가 먼저 .indent로 감싸진 뒤 실제 표로 치환되는 순서 때문에
  //        생기는 이중 래핑(위 7단계는 그 시점엔 아직 플레이스홀더라 걸러내지 못한다)
  //        을 여기서 정리한다.
  $('.indent').each((_, div) => {
    const $div = $(div);
    const $children = $div.children();
    if ($children.length !== 1) return;
    if (!/\b(?:box-st|tbl-st)\b/.test($children.attr('class') || '')) return;
    $div.replaceWith($children);
  });

  // 7-1) div.indent 내 bare ul/ol (KLIC 클래스 없음) → 중첩 깊이 기반 클래스 부여
  //      학교별 자체 클래스가 붙은 ul도 정규화
  $('.indent ul, .indent ol').each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    if (/bu-st[123]/.test(cls)) return;
    const depth = $el.parents('ul,ol').length;
    $el.attr('class', depth === 0 ? 'bu-st1 list' : depth === 1 ? 'bu-st2 list' : 'bu-st3 list');
  });

  // 8) "N) 소제목 + 본문" p 패턴 → ul.bu-st2.list (소제목<br>본문)
  //    1(또는 가)부터 순차 증가하는 진짜 순번일 때만 그룹화
  const PAREN_NUM_RE = /^(\d+|[가나다라마바사아자차카타파하])\)\s*/;
  $('*').each((_, container) => {
    const $c = $(container);
    const pChildren = $c.children('p').toArray();
    let i = 0;
    while (i < pChildren.length) {
      const $p = $(pChildren[i]);
      const txt = $p.text().trim();
      const firstM = txt.match(PAREN_NUM_RE);
      if (!firstM || !isStartMarker(firstM[1]) || txt.length > 80) { i++; continue; }
      const group = [];
      let j = i, expected = firstM[1];
      while (j < pChildren.length) {
        const $curr = $(pChildren[j]);
        const currTxt = $curr.text().trim();
        const m = currTxt.match(PAREN_NUM_RE);
        if (m && m[1] === expected && currTxt.length <= 80) {
          const title = currTxt.replace(PAREN_NUM_RE, '').trim();
          const $next = $(pChildren[j + 1]);
          const _nextTxt2 = $next.length ? $next.text().trim() : '';
          if ($next.length && !PAREN_NUM_RE.test(_nextTxt2) && !/^제\s*\d+\s*조/.test(_nextTxt2)) {
            group.push({ $title: $curr, $body: $next, title, body: $next.html() || '' });
            j += 2;
          } else {
            group.push({ $title: $curr, $body: null, title, body: '' });
            j += 1;
          }
          expected = nextMarker(expected);
          if (!expected) { j = pChildren.length; break; }
        } else { break; }
      }
      if (group.length >= 2) {
        const ulHtml = `<ul class="bu-st2 list">${group.map(g => `<li>${g.title}${g.body ? '<br>' + g.body : ''}</li>`).join('')}</ul>`;
        // 이전 형제가 bu-st1이면 마지막 li 안에 중첩
        const $prevSib = $p.prev('ul');
        if ($prevSib.length && /bu-st1/.test($prevSib.attr('class') || '')) {
          $prevSib.children('li').last().append(ulHtml);
        } else {
          $p.before(ulHtml);
        }
        group.forEach(g => { g.$title.remove(); if (g.$body) g.$body.remove(); });
        i = j;
      } else { i++; }
    }
  });

  // 8-1) ul.bu-st2 리스트가 ul.bu-st1 바로 뒤에 있으면 → bu-st1의 마지막 li 안에 중첩
  //      (AI 출력 또는 기타 경로에서 형제로 생성된 경우 포함)
  $('ul.bu-st2.list').each((_, ul) => {
    const $ul = $(ul);
    const $prev = $ul.prev('ul');
    if (!$prev.length || !/bu-st1/.test($prev.attr('class') || '')) return;
    $prev.children('li').last().append($ul);
  });

  // 9) 최상단 h3.section 바로 아래 연속 p → div.box-st emp로 감싸기
  //    가장 첫 번째 h3.section만 처리 (이하 h3에는 적용 안 함)
  //    "다." 문장 경계에 <br> 삽입
  const $firstH3Section = $('h3.section').first();
  if ($firstH3Section.length) {
    const $h3 = $firstH3Section;
    let cursor = $h3.next();
    if (!cursor.is('.box-st.emp')) {
      while (cursor.length && !cursor.is('p') && !cursor.is('h3,h4,h5,h6,.box-st.emp,.indent')) {
        cursor = cursor.next();
      }
      if (cursor.length && cursor.is('p')) {
        const group = [];
        while (cursor.length && cursor.is('p')) {
          group.push(cursor[0]);
          cursor = cursor.next();
        }
        if (group.length) {
          let combined = group.map(p => ($(p).html() || '').trim()).join('<br>');
          combined = combined.replace(/다\.\s+(?=[가-힣])/g, '다.<br>');
          $(group[0]).before(`<div class="box-st emp"><p>${combined}</p></div>`);
          group.forEach(p => $(p).remove());
        }
      }
    }
  }

  // 9.5) h4.tit-st.contents 아래 .indent 안에서, 리스트/표 바로 앞에 나오는 단독 안내
  //      문장(예: "~에 관한 사항을 안내드리겠습니다." 뒤에 목록이 이어지는 경우) → box-st emp
  //      리스트/표가 바로 뒤따르는 첫 문단에만 적용해 일반 본문 문단까지 박스로
  //      씌우는 오탐을 막는다.
  $('.tit-st.contents').each((_, h4) => {
    const $indent = $(h4).next('.indent');
    if (!$indent.length) return;
    const $first = $indent.children().first();
    if (!$first.is('p')) return;
    const html = ($first.html() || '').trim();
    if (!html) return;
    if (!$first.next().is('ul, ol, table, .tbl-st')) return;
    $first.replaceWith(`<div class="box-st emp"><p>${html}</p></div>`);
  });

  pullLooseTextBeforeNestedOl($);
  $('ol').each((_, ol) => {
    const $ol = $(ol);
    const firstMarker = $ol.children('li').first().children('span.mrk').first().text().trim();
    if (/^[가-힣]$/.test(firstMarker)) {
      $ol.attr('class', 'order-st3');
    } else if ($ol.parents('ol').length > 0) {
      $ol.attr('class', 'order-st2');
    } else {
      $ol.attr('class', OL_CLASSES[Math.min($ol.parents('ol').length, 2)]);
    }
  });
  normalizeTableAlignClasses($);

  return replaceTocSection($('body').html() || result);
}

export async function autoMarkup(crawledData) {
  const rawHtml = crawledData.html || '';
  const text = crawledData.text || '';
  const images = crawledData.images || [];

  // OCR 주입을 먼저 수행: 이미지 테이블 → <table>, 이미지 텍스트 → <p>
  const cleaned = injectSchoolNameInHtml(cleanHtml(rawHtml), crawledData.school_name);
  const withOcr = injectOcrIntoHtml(cleaned, images);

  // 탭 내비게이션 정규화: class에 tab/Tab이 포함된 div + 직접 자식 ul>li → div.tab-st.cntnts
  const $t = cheerio.load(withOcr);
  $t('div').filter((_, el) => /tab/i.test(($t(el).attr('class') || ''))).each((_, div) => {
    const $div = $t(div);
    const $ul = $div.children('ul').first();
    if (!$ul.length || !$ul.children('li').length) return;
    $div.attr('class', 'tab-st cntnts col-4');
    $ul.removeAttr('class');
    $ul.children('li').each((_, li) => {
      const $li = $t(li);
      const active = /\b(active|on)\b/i.test($li.attr('class') || '');
      $li.removeAttr('class');
      if (active) $li.attr('class', 'on');
    });
  });
  // ul의 class 또는 id에 tab이 포함된 경우 → div.tab-st.cntnts.col-4로 감싸기
  $t('ul').filter((_, el) => {
    const cls = $t(el).attr('class') || '';
    const id = $t(el).attr('id') || '';
    return /tab/i.test(cls) || /tab/i.test(id);
  }).each((_, ul) => {
    const $ul = $t(ul);
    if (!$ul.children('li').length) return;
    if ($ul.closest('.tab-st').length) return;
    $ul.children('li').each((_, li) => {
      const $li = $t(li);
      const active = /\b(active|on)\b/i.test($li.attr('class') || '');
      $li.removeAttr('class');
      if (active) $li.attr('class', 'on');
    });
    $ul.removeAttr('class').removeAttr('id');
    $ul.wrap('<div class="tab-st cntnts col-4"></div>');
  });
  let tabsHtml = $t('body').html() || withOcr;

  // 이미지 기반 페이지 타이틀 주입:
  // 원본 텍스트가 거의 없고 OCR 결과가 주 콘텐츠인 경우(이미지 전용 페이지)
  // 크롤러가 추출한 page_title을 h2 헤딩으로 삽입 → directMarkupHtml: h3.section, AI: h3.tit-st.section
  {
    const origTextLen = (text || '').replace(/\s/g, '').length;
    const ocrTextLen = images.reduce((sum, img) => sum + (img.ocr_text || '').replace(/\s/g, '').length, 0);
    const isImageHeavy = ocrTextLen > 50 && origTextLen < ocrTextLen * 0.3;
    if (isImageHeavy && crawledData.page_title) {
      const $headCheck = cheerio.load(tabsHtml);
      if (!$headCheck('h1, h2, h3, h4').length) {
        tabsHtml = `<h2>${crawledData.page_title}</h2>\n${tabsHtml}`;
      }
    }
  }

  // OCR 주입 후 테이블 존재 여부 재확인 (이미지 기반 테이블도 포함)
  const $check = cheerio.load(tabsHtml);
  const hasAnyTable = $check('table').length > 0;

  // 저작권 페이지 감지: 내용이 길고 구조가 정형화되어 있으므로 AI 없이 directMarkupHtml 사용
  // → AI 경로는 긴 법조문에서 토큰 초과로 내용을 생략하는 문제가 있음
  const CP_RE_DETECT = /저작권\s*(?:보호\s*)?(?:지침|정책|방침|안내|신고)/;
  const _pageTitle = crawledData.page_title || '';
  // 크롤러가 h1/h2 타이틀을 노이즈로 제거하는 경우 page_title 필드로 보완 감지
  const isCpPage = CP_RE_DETECT.test($check('body').text()) || CP_RE_DETECT.test(_pageTitle);
  const isPpPage = /개인정보\s*(?:처리|보호)\s*방침/.test($check('body').text())
    || /개인정보\s*(?:처리|보호)\s*방침/.test(_pageTitle);

  let autoResult;
  if (hasAnyTable || isCpPage) {
    autoResult = postProcessMarkup(directMarkupHtml(tabsHtml));
  } else {
    // 테이블 없는 경우 AI 경로
    // HTML 테이블로 변환된 OCR은 이미 withOcr에 있으므로 제외, 순수 텍스트 OCR만 포함
    const textOcrLines = images.map(img => img.ocr_text).filter(t => isUsableOcrText(t) && !/<table[\s>]/i.test(t));
    const ocrSection = textOcrLines.length ? '\n\n[이미지 OCR 텍스트]\n' + textOcrLines.join('\n') : '';

    // tit_list 등 타이틀성 p → h3 승격 + 구조 보존 HTML 생성 (AI 헤딩 계층 판단 개선)
    const htmlForAI = buildHtmlForAI(tabsHtml);
    // 이미지 전용 페이지: OCR 텍스트를 주 콘텐츠로 사용
    const primary = htmlForAI || text.trim() || textOcrLines.join('\n\n');
    const extra = textOcrLines.length ? ocrSection : '';

    const result = await chat([
      { role: 'system', content: SYSTEM_AUTO },
      { role: 'user', content:
          '다음 원문(HTML 형식)을 마크업해주세요.\n' +
          '원문 텍스트는 절대 수정·요약·생략·재배치하지 말고 모든 내용을 빠짐없이 그대로 출력하세요.\n\n' +
          primary + extra,
      },
    ], 32768);
    autoResult = postProcessMarkup(result);
  }

  // PP 타이틀 폴백: 처리 후에도 개인정보처리방침 타이틀이 없으면 자동 생성·삽입
  if (isPpPage) {
    const $pp = cheerio.load(autoResult);
    const hasPPTitle = $pp('h3.tit-st.section').toArray().some(el =>
      /개인정보\s*(?:처리|보호)\s*방침/.test($pp(el).text())
    );
    if (!hasPPTitle) {
      const ptitle = _pageTitle.trim();
      let titleText;
      if (/개인정보\s*(?:처리|보호)\s*방침/.test(ptitle) && ptitle.length < 100) {
        titleText = ptitle;
      } else {
        let schoolName = crawledData.school_name || '';
        if (!schoolName) {
          const m = $pp('body').text().match(/([가-힣]{2,15}(?:초등학교|중학교|고등학교|특수학교|대학교|학교))/);
          schoolName = m ? m[1] : '';
        }
        titleText = schoolName ? `${schoolName} 개인정보처리방침` : '개인정보처리방침';
      }
      $pp('body').prepend(`<h3 class="tit-st section">${titleText}</h3>`);
      autoResult = $pp('body').html() || autoResult;
    }
  }
  return replaceTocSection(autoResult);
}

// ─── 푸터메뉴 전용 마크업 생성 ───────────────────────────────────
export async function footerAutoMarkup(crawledData) {
  const rawHtml = crawledData.html || '';
  const text = crawledData.text || '';
  const images = crawledData.images || [];

  const cleaned = injectSchoolNameInHtml(cleanHtml(rawHtml), crawledData.school_name);
  const withOcr = injectOcrIntoHtml(cleaned, images);

  const $t = cheerio.load(withOcr);
  $t('div').filter((_, el) => /tab/i.test(($t(el).attr('class') || ''))).each((_, div) => {
    const $div = $t(div);
    const $ul = $div.children('ul').first();
    if (!$ul.length || !$ul.children('li').length) return;
    $div.attr('class', 'tab-st cntnts col-4');
    $ul.removeAttr('class');
    $ul.children('li').each((_, li) => {
      const $li = $t(li);
      const active = /\b(active|on)\b/i.test($li.attr('class') || '');
      $li.removeAttr('class');
      if (active) $li.attr('class', 'on');
    });
  });
  $t('ul').filter((_, el) => {
    const cls = $t(el).attr('class') || '';
    const id = $t(el).attr('id') || '';
    return /tab/i.test(cls) || /tab/i.test(id);
  }).each((_, ul) => {
    const $ul = $t(ul);
    if (!$ul.children('li').length) return;
    if ($ul.closest('.tab-st').length) return;
    $ul.children('li').each((_, li) => {
      const $li = $t(li);
      const active = /\b(active|on)\b/i.test($li.attr('class') || '');
      $li.removeAttr('class');
      if (active) $li.attr('class', 'on');
    });
    $ul.removeAttr('class').removeAttr('id');
    $ul.wrap('<div class="tab-st cntnts col-4"></div>');
  });
  const tabsHtml = $t('body').html() || withOcr;
  const preprocessed = preprocessFooterHtml(tabsHtml);

  // 데이터 테이블을 플레이스홀더로 교체 → AI에 간결한 HTML 전달
  // AI 처리 후 원본 테이블을 div.tbl-st.scroll-w로 감싸 재삽입
  const $pre = cheerio.load(preprocessed);
  const extractedTables = [];
  $pre('table').each((i, table) => {
    const $table = $pre(table);
    extractedTables.push($pre.html($table));
    const $dd = $table.parent('dd');
    if ($dd.length) {
      $dd.parent('dl').replaceWith(`<p>[데이터표_${i}]</p>`);
    } else {
      $table.replaceWith(`<p>[데이터표_${i}]</p>`);
    }
  });
  // 테이블 추출 후 리스트 구조 사전 변환 → AI 출력 토큰 절약 (11개 항목 전체 처리 가능)
  const simplifiedHtml = preConvertFooterLists($pre('body').html() || preprocessed);

  // 개인정보처리방침 페이지: 16개 섹션을 AI에 맡기면 토큰 한계로 중간에 잘림
  // → 전처리에서 이미 헤딩·리스트 구조가 확정되므로 directMarkupHtml로 직접 변환
  // 크롤러가 h1/h2 타이틀을 NOISE_ID_CLASS 로 제거하는 경우 page_title 필드로 보완 감지
  const _footerPageTitle = crawledData.page_title || '';
  const isPP = /개인정보\s*(?:처리|보호)\s*방침/.test($pre('body').text())
    || /개인정보\s*(?:처리|보호)\s*방침/.test(_footerPageTitle);

  // 영상정보처리방침 페이지: 첫 번째 텍스트에 "영상정보처리방침"이 있으면 PP와 동일 경로로 처리
  const $bodyEl = $pre('body');
  const firstTextNode = $bodyEl.find('h1,h2,h3,h4,h5,h6,p,td,th,li,dt,dd,span,div')
    .filter((_, el) => $pre(el).children('h1,h2,h3,h4,h5,h6,p').length === 0)
    .first();
  const firstText = firstTextNode.length ? firstTextNode.text().trim() : $bodyEl.text().slice(0, 50).trim();
  const isVP = /영상\s*정보\s*처리\s*방침/.test(firstText)
    || /영상\s*정보\s*처리\s*방침/.test(_footerPageTitle);
  // isPP와 동일하게 전체 body 텍스트를 검색 (브레드크럼·내비 li가 firstText를 가로채는 경우 대비)
  const CP_RE = /저작권\s*(?:보호\s*)?(?:지침|정책|방침|안내|신고)/;
  const isCP = CP_RE.test($pre('body').text()) || CP_RE.test(_footerPageTitle);

  const textOcrLines = images.map(img => img.ocr_text).filter(t => isUsableOcrText(t) && !/<table[\s>]/i.test(t));

  let result;
  if (isPP || isVP || isCP) {
    result = directMarkupHtml(simplifiedHtml);
    // 최상단 h3.section 직후 p → box-st emp (directMarkupHtml 직후 즉시 처리)
    const $dm = cheerio.load(result);
    const $firstDmH3 = $dm('h3.section').first();
    if ($firstDmH3.length) {
      let cursor = $firstDmH3.next();
      if (!cursor.is('.box-st.emp')) {
        while (cursor.length && !cursor.is('p') && !cursor.is('h3,h4,h5,h6,.box-st.emp,.indent')) {
          cursor = cursor.next();
        }
        if (cursor.length && cursor.is('p')) {
          const group = [];
          while (cursor.length && cursor.is('p')) {
            if (/^\[데이터표_/.test(cursor.text().trim())) break; // 테이블 플레이스홀더 보호
            group.push(cursor[0]);
            cursor = cursor.next();
          }
          if (group.length) {
            let combined = group.map(p => ($dm(p).html() || '').trim()).join('<br>');
            combined = combined.replace(/다\.\s+(?=[가-힣])/g, '다.<br>');
            $dm(group[0]).before(`<div class="box-st emp"><p>${combined}</p></div>`);
            group.forEach(p => $dm(p).remove());
          }
        }
      }
    }
    result = $dm('body').html() || result;
  } else {
    const ocrSection = textOcrLines.length ? '\n\n[이미지 OCR 텍스트]\n' + textOcrLines.join('\n') : '';
    const primary = simplifiedHtml || text.trim() || textOcrLines.join('\n\n');
    const extra = textOcrLines.length ? ocrSection : '';

    try {
      result = await chat([
        { role: 'system', content: SYSTEM_FOOTER },
        { role: 'user', content:
            '다음 원문(HTML 형식)을 마크업해주세요.\n' +
            '원문 텍스트는 절대 수정·요약·생략·재배치하지 말고 모든 내용을 빠짐없이 그대로 출력하세요.\n' +
            '이미 ul.bu-st1/bu-st2로 변환된 리스트 구조는 그대로 유지하고 class만 확인하세요.\n' +
            '[데이터표_N] 형식의 플레이스홀더는 반드시 해당 위치에 그대로 유지하세요 (절대 수정·삭제 금지).\n\n' +
            primary + extra,
        },
      ], 16384);
    } catch (_aiErr) {
      // AI(Groq + Cerebras) 모두 실패 시 직접 변환으로 폴백 (개인정보처리방침과 동일 경로)
      result = directMarkupHtml(simplifiedHtml || primary);
    }
  }

  // 플레이스홀더 → 원본 테이블 재삽입 (가로로 긴 표만 scroll-w 포함)
  let finalResult = result;
  extractedTables.forEach((tableHtml, i) => {
    const wrapped = `<div class="${tableWrapperClassFromHtml(tableHtml)}">${tableHtml}</div>`;
    // p 태그로 감싸진 경우도 처리
    finalResult = finalResult
      .replace(`<p>[데이터표_${i}]</p>`, wrapped)
      .replace(`[데이터표_${i}]`, wrapped);
  });

  let ppResult = postProcessFooterMarkup(finalResult);

  // PP 타이틀 폴백: 처리 후에도 개인정보처리방침 타이틀이 없으면 자동 생성·삽입
  if (isPP) {
    const $pp = cheerio.load(ppResult);
    const hasPPTitle = $pp('h3.tit-st.section').toArray().some(el =>
      /개인정보\s*(?:처리|보호)\s*방침/.test($pp(el).text())
    );
    if (!hasPPTitle) {
      const ptitle = _footerPageTitle.trim();
      let titleText;
      if (/개인정보\s*(?:처리|보호)\s*방침/.test(ptitle) && ptitle.length < 100) {
        titleText = ptitle;
      } else {
        let schoolName = crawledData.school_name || '';
        if (!schoolName) {
          const bodyText = $pp('body').text();
          const m = bodyText.match(/([가-힣]{2,15}(?:초등학교|중학교|고등학교|특수학교|대학교|학교))/);
          schoolName = m ? m[1] : '';
        }
        titleText = schoolName ? `${schoolName} 개인정보처리방침` : '개인정보처리방침';
      }
      $pp('body').prepend(`<h3 class="tit-st section">${titleText}</h3>`);
      ppResult = $pp('body').html() || ppResult;
    }
  }

  // VP 타이틀 폴백: 첫 번째 h3.tit-st.section에 "영상정보처리방침"이 없으면 자동 삽입
  if (isVP) {
    const $vp = cheerio.load(ppResult);
    const firstH3 = $vp('h3.tit-st.section').first();
    const hasVPTitle = firstH3.length && /영상\s*정보\s*처리\s*방침/.test(firstH3.text());
    if (!hasVPTitle) {
      const ptitle = _footerPageTitle.trim();
      let titleText;
      if (/영상\s*정보\s*처리\s*방침/.test(ptitle) && ptitle.length < 100) {
        titleText = ptitle;
      } else {
        let schoolName = crawledData.school_name || '';
        if (!schoolName) {
          const bodyText = $vp('body').text();
          const m = bodyText.match(/([가-힣]{2,15}(?:초등학교|중학교|고등학교|특수학교|대학교|학교))/);
          schoolName = m ? m[1] : '';
        }
        titleText = schoolName ? `${schoolName} 영상정보처리방침` : '영상정보처리방침';
      }
      $vp('body').prepend(`<h3 class="tit-st section">${titleText}</h3>`);
      ppResult = $vp('body').html() || ppResult;
    }
  }

  // CP 타이틀 폴백: h3.tit-st.section 중 저작권 관련 텍스트가 없으면 자동 삽입·이동
  if (isCP) {
    const $cp = cheerio.load(ppResult);
    // 전체 h3.tit-st.section 중 CP_RE 패턴에 맞는 것이 있는지 확인
    const cpTitleEl = $cp('h3.tit-st.section').toArray()
      .find(el => CP_RE.test($cp(el).text()));
    if (!cpTitleEl) {
      // 출력에 저작권 타이틀 없음: 원본 simplifiedHtml에서 h1/h2 복원 시도
      const $src = cheerio.load(simplifiedHtml);
      const srcTitle = $src('h1, h2').filter((_, el) => {
        const t = $src(el).text().trim();
        return CP_RE.test(t) && t.length < 150;
      }).first();
      let titleText;
      if (srcTitle.length) {
        titleText = srcTitle.text().trim();
      } else {
        // simplifiedHtml에도 없으면 기존 출력에서 CP_RE 매칭 요소 텍스트 활용
        const existing = $cp('p, h2, h3, h4').filter((_, el) => {
          const t = $cp(el).text().trim();
          return CP_RE.test(t) && t.length < 150;
        }).first();
        if (existing.length) {
          titleText = existing.text().trim();
          existing.remove();
        } else {
          let schoolName = crawledData.school_name || '';
          if (!schoolName) {
            const m = $cp('body').text().match(/([가-힣]{2,15}(?:초등학교|중학교|고등학교|특수학교|대학교|학교))/);
            schoolName = m ? m[1] : '';
          }
          titleText = schoolName ? `${schoolName} 저작권 보호 지침` : '저작권 보호 지침';
        }
      }
      $cp('body').prepend(`<h3 class="tit-st section">${titleText}</h3>`);
      ppResult = $cp('body').html() || ppResult;
    }
  }

  // 타이틀 폴백 이후 보정: 최상단 h3.section 직후 p → box-st.emp
  // postProcessFooterMarkup이 먼저 실행된 뒤 폴백으로 h3이 prepend된 경우를 대비
  if (isPP || isVP || isCP) {
    const $final = cheerio.load(ppResult);
    const $firstFinalH3 = $final('h3.section').first();
    if ($firstFinalH3.length) {
      let cursor = $firstFinalH3.next();
      if (!cursor.is('.box-st.emp')) {
        while (cursor.length && !cursor.is('p') && !cursor.is('h3,h4,h5,h6,.box-st.emp,.indent')) {
          cursor = cursor.next();
        }
        if (cursor.length && cursor.is('p')) {
          const group = [];
          while (cursor.length && cursor.is('p')) {
            group.push(cursor[0]);
            cursor = cursor.next();
          }
          if (group.length) {
            let combined = group.map(p => ($final(p).html() || '').trim()).join('<br>');
            combined = combined.replace(/다\.\s+(?=[가-힣])/g, '다.<br>');
            $final(group[0]).before(`<div class="box-st emp"><p>${combined}</p></div>`);
            group.forEach(p => $final(p).remove());
          }
        }
      }
    }
    ppResult = $final('body').html() || ppResult;
  }

  return ppResult;
}
