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
   숫자 뒤 '.', ',' 등 구두점 제거

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

// ─── 후처리: colgroup 자동 생성 + td/th 내 불필요 태그 제거 ──
function postProcessMarkup(html) {
  const $ = cheerio.load(html);

  // 1) ol > li 안에 원문자나 숫자. 이 그대로 남아있으면 <span class="num">으로 교체
  $('ol li').each((_, li) => {
    const $li = $(li);
    if ($li.find('> span.mrk').length) return;
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

  // 4) ul/ol 계층별 클래스 자동 할당 (tab-st 내부 ul은 탭 내비게이션이므로 건드리지 않음)
  const UL_CLASSES = ['bu-st1', 'bu-st2', 'bu-st3', 'bu-st4'];
  const OL_CLASSES = ['order-st1', 'order-st2', 'order-st3'];
  const LIST_NUM_RE = /list_0*([1-4])(?!\d)/i;
  $('ul').each((_, ul) => {
    if ($(ul).parent().hasClass('tab-st')) return;
    const m = ($(ul).attr('class') || '').match(LIST_NUM_RE);
    if (m) {
      $(ul).attr('class', `bu-st${m[1]} list`);
    } else {
      $(ul).attr('class', UL_CLASSES[Math.min($(ul).parents('ul').length, 3)] + ' list');
    }
  });
  $('ol').each((_, ol) => {
    $(ol).attr('class', OL_CLASSES[Math.min($(ol).parents('ol').length, 2)]);
  });

  // 4.5) h3.tit-st.section이 없을 때 개인정보처리방침 p → h3.tit-st section 승격 (AI 누락 폴백)
  if (!$('h3.section, h3.tit-st').length) {
    $('p').filter((_, p) => {
      const t = $(p).text().trim();
      return /개인정보\s*(?:처리|보호)\s*방침/.test(t) && t.length < 100;
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

  // 6) h4.contents 직후 요소들을 .indent로 감싸기 (AI 미처리 또는 직접변환 경로 대비)
  $('h4.contents').each((_, h4) => {
    const $h4 = $(h4);
    if ($h4.next().hasClass('indent')) return;

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

  // 7) 헤딩 내 img·아이콘 요소 제거 (장식용 아이콘 → 텍스트만 유지)
  $('h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
    $el.find('img, [class*="icon"], [class*="ico"]').remove();
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
  $('div').each((_, div) => {
    const $div = $(div);
    if ($div.parents('table, td, th').length) return;
    const children = $div.children().toArray();
    if (!children.length) return;
    if (!children.every(el => ['a', 'button'].includes((el.tagName || '').toLowerCase()))) return;
    $div.attr('class', 'btns');
    children.forEach(el => $(el).attr('class', 'btn-st pri'));
  });

  // 10) box 관련 클래스(box, _box, box_, wrap_box 등) → class="box-st info"
  // 이미 적용된 커스텀 클래스(box-st, tit-st, tbl-st 등)는 건드리지 않음
  const CUSTOM_CLS_RE = /\b(?:box-st|tit-st|tbl-st|bu-st|order-st|btn-st|txt-st|btns|indent)\b/;
  const BOX_CLS_RE = /(?:^|[-_])box(?:[-_]|$)/i;
  $('[class]').each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    if (CUSTOM_CLS_RE.test(cls)) return;
    if (cls.split(/\s+/).some(c => BOX_CLS_RE.test(c))) {
      $el.attr('class', 'box-st info');
    }
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
      $table.wrap('<div class="tbl-st scroll-w"></div>');
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

  const minLvl = [1,2,3,4,5,6].find(l => $(`h${l}`).length > 0) ?? 0;
  if (minLvl >= 3) {
    // PP/VP 콘텐츠에서 섹션형 h3이 최상위면 정규화 스킵
    // → h3은 h4.tit-st.contents로 매핑되어야 하며, 타이틀은 footerAutoMarkup 폴백이 보완
    const NUMBERED_RE_D = /^\d+\.\s+[가-힣A-Za-z]/;
    const CLAUSE_RE_D = /^제\s*\d+\s*조/;
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

  const MARKUP_NOISE_IDS = new Set(['location', 'pagetxt', 'pageTxt', 'sidecontent', 'side_content', 'sideContent']);
  const MARKUP_NOISE_CLS = ['line_map', 'linemap', 'breadcrumb', 'location_bar', 'navi_map', 'sidecontent', 'side_content', 'lnb_wrap'];
  const HIDDEN_CLS = new Set(['hid', 'hidden', 'blind', 'screen_out', 'sr-only']);

  function processEl(el) {
    const tag = (el.tagName || '').toLowerCase();
    if (!tag) return '';
    const $el = $(el);

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
    if (tag === 'h1' || tag === 'h2') { const id = $el.attr('id'); return `<h3 class="tit-st section"${id ? ` id="${id}"` : ''}>${$el.html()}</h3>`; }
    if (tag === 'h3') { const id = $el.attr('id'); return `<h4 class="tit-st contents"${id ? ` id="${id}"` : ''}>${$el.html()}</h4>`; }
    if (tag === 'h4' || tag === 'h5') { const id = $el.attr('id'); return `<h5 class="tit-st unit"${id ? ` id="${id}"` : ''}>${$el.html()}</h5>`; }
    if (tag === 'h6') { const id = $el.attr('id'); return `<h6 class="tit-st item"${id ? ` id="${id}"` : ''}>${$el.html()}</h6>`; }

    // 테이블 → tbl-st scroll-w 래퍼
    if (tag === 'table') return `<div class="tbl-st scroll-w">${$.html(el)}</div>`;

    // p → 그대로 유지
    if (tag === 'p') return $el.text().trim() ? `<p>${$el.html()}</p>` : '';

    // ul / ol → 그대로 유지
    if (tag === 'ul' || tag === 'ol') return $.html(el);

    // dl → dt/dd 재귀 처리 (저작권지침·개인정보방침 등 dl 구조 페이지 대응)
    if (tag === 'dl') {
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
    const CONTAINER_TAGS = new Set(['div', 'section', 'article', 'main', 'aside', 'figure', 'form', 'fieldset', 'nav', 'header', 'footer']);
    if (CONTAINER_TAGS.has(tag) || $el.find('table').length > 0) {
      const childParts = $el.children().toArray().map(processEl).filter(Boolean);
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
   숫자 뒤 '.', ',' 등 구두점 제거

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

// ─── 푸터메뉴 전용 HTML 전처리 (개인정보처리방침 구조 사전 인식) ────────
function preprocessFooterHtml(html) {
  let $ = cheerio.load(html);
  const PRIVACY_RE = /개인정보\s*(?:처리|보호)\s*방침/;

  // -1) 개인정보처리방침 페이지 전용 비콘텐츠 섹션 제거
  //     ul.policy(아이콘 그리드 라벨링), div.box_st3, .toc-wrap 등
  if (PRIVACY_RE.test($('body').text())) {
    $('ul.policy, div.box_st3, .toc-wrap, .privacy-toc').remove();
    // "목차" 텍스트만 있는 단독 제목 요소 제거
    // div는 링크 위주의 소형 TOC 래퍼일 때만 제거 (콘텐츠 영역 오삭제 방지)
    $('p.tit_01, h2, h3, h4').each((_, el) => {
      const $el = $(el);
      if ($el.text().trim() !== '목차') return;
      $el.next('ul, ol').remove();
      const $nd = $el.next('div');
      if ($nd.length && $nd.find('a').length >= 2 && $nd.text().trim().length < 800) $nd.remove();
      $el.remove();
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
      const cells = $table.find('td').toArray();
      const flatHtml = cells.map(td => $(td).html() || '').filter(h => h.trim()).join('\n');
      $table.replaceWith(flatHtml);
    });
    html = $('body').html() || html;
    $ = cheerio.load(html);
  }

  // 0-1) div.gry_box / div[class*="intro"] → div.box-st emp (안내문 영역 직접 변환)
  $('div.gry_box, div[class*="gry_box"]').each((_, el) => {
    const $el = $(el);
    const pArr = $el.find('p').toArray();
    const combined = pArr.length
      ? pArr.map(p => $(p).html() || '').filter(h => h.trim()).join('<br>')
      : ($el.html() || '').trim();
    if (!combined.trim()) return;
    $el.replaceWith(`<div class="box-st emp"><p>${combined}</p></div>`);
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
      let replacements = '';
      // 모든 자식을 순서대로 처리 — dt/dd 외 요소(h2 타이틀 등)도 그대로 보존
      $dl.children().toArray().forEach(child => {
        const childTag = (child.tagName || '').toLowerCase();
        const $child = $(child);
        if (childTag === 'dt') {
          const text = $child.text().trim();
          const $dds = $child.nextUntil('dt', 'dd');
          const ddHtml = $dds.toArray().map(dd => $(dd).html() || '').filter(h => h.trim()).join('\n');
          const isClause = /^제\s*\d+\s*조/.test(text) && text.length < 120;
          const isNumbered = /^\d+\.\s+[가-힣A-Za-z]/.test(text) && text.length < 80;
          if (isClause || isNumbered) {
            replacements += `<h3>${$child.html()}</h3>`;
            if (ddHtml) replacements += `<p>${ddHtml}</p>`;
          } else {
            replacements += `<p>${$child.html()}</p>`;
            if (ddHtml) replacements += `<p>${ddHtml}</p>`;
          }
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
  $('*').not('h1,h2,h3,h4,h5,h6,script,style,table,thead,tbody,tr,th,td,ul,ol,li').each((_, el) => {
    const $el = $(el);
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
  let ppShift = 0;
  $('h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
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

  // 1-b) 저작권+보호 타이틀 비헤딩 요소(span, p, div 등) → h2
  //      "저작권"과 "보호" 두 단어가 모두 포함된 요소만 h2로 변환
  $('*').not('h1,h2,h3,h4,h5,h6,script,style,table,thead,tbody,tr,th,td,ul,ol,li').each((_, el) => {
    const $el = $(el);
    if ($el.find('ul,ol,table,h1,h2,h3,h4,h5,h6').length) return;
    const text = $el.text().trim();
    if (!/저작권/.test(text) || !/보호/.test(text) || text.length > 80) return;
    $el.replaceWith(`<h2>${text}</h2>`);
  });

  // 1-c) 저작권+보호 타이틀이 h3/h4/h5/h6 헤딩인 경우 → h2 강제 변환 (1-a와 동일 방식)
  let cpShift = 0;
  $('h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
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
  const minLvl = [1,2,3,4,5,6].find(l => $(`h${l}`).length > 0) ?? 0;
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
      for (let l = 6; l >= minLvl; l--) {
        const nl = Math.min(l - shift, 6);
        if (nl !== l) {
          $(`h${l}`).each((_, el) => {
            const $el = $(el);
            $el.replaceWith(`<h${nl}>${$el.html()}</h${nl}>`);
          });
        }
      }
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

  // 1) ①②③ 연속 p 그룹 → ul.bu-st1.list
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
  $('*').each((_, container) => {
    const $c = $(container);
    const pArr = $c.children('p').toArray();
    let i = 0;
    while (i < pArr.length) {
      const $p = $(pArr[i]);
      const txt = $p.text().trim();
      if (!PAREN_NUM_RE.test(txt) || txt.length > 80) { i++; continue; }
      const group = [];
      let j = i;
      while (j < pArr.length) {
        const $curr = $(pArr[j]);
        const currTxt = $curr.text().trim();
        if (PAREN_NUM_RE.test(currTxt) && currTxt.length <= 80) {
          const title = currTxt.replace(PAREN_NUM_RE, '').trim();
          const $next = $(pArr[j + 1]);
          const _nextTxt1 = $next.length ? $next.text().trim() : '';
          if ($next.length && !PAREN_NUM_RE.test(_nextTxt1) && !/^제\s*\d+\s*조/.test(_nextTxt1)) {
            group.push({ $t: $curr, $b: $next, title, body: $next.html() || '' });
            j += 2;
          } else {
            group.push({ $t: $curr, $b: null, title, body: '' });
            j += 1;
          }
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
  //      앞에 ul.bu-st1이 있으면 → bu-st2로 마지막 li에 중첩
  //      없으면 → bu-st1으로 생성
  $('*').each((_, container) => {
    const $c = $(container);
    const pArr = $c.children('p').toArray();
    let i = 0;
    while (i < pArr.length) {
      const $p = $(pArr[i]);
      const txt = $p.text().trim();
      if (!NUM_DOT_RE.test(txt) || txt.length > 80) { i++; continue; }
      const group = [];
      let j = i;
      while (j < pArr.length) {
        const $curr = $(pArr[j]);
        const currTxt = $curr.text().trim();
        if (NUM_DOT_RE.test(currTxt) && currTxt.length <= 80) {
          const title = currTxt.replace(/^\d+\.\s+/, '').trim();
          const $next = j + 1 < pArr.length ? $(pArr[j + 1]) : null;
          const nextIsDash = $next && DASH_RE.test($next.text().trim());
          const nextIsDot = $next && NUM_DOT_RE.test($next.text().trim());
          const nextIsClause = $next && /^제\s*\d+\s*조/.test($next.text().trim());
          if ($next && !nextIsDash && !nextIsDot && !nextIsClause) {
            group.push({ $t: $curr, $b: $next, title, body: $next.html() || '' });
            j += 2;
          } else {
            group.push({ $t: $curr, $b: null, title, body: '' });
            j += 1;
          }
        } else { break; }
      }
      if (group.length >= 1) {
        const $prev = $p.prev('ul');
        const hasPrevBu1 = $prev.length && /bu-st1/.test($prev.attr('class') || '');
        const listCls = hasPrevBu1 ? 'bu-st2' : 'bu-st1';
        const ulHtml = `<ul class="${listCls} list">${group.map(g => `<li>${g.title}${g.body ? '<br>' + g.body : ''}</li>`).join('')}</ul>`;
        if (hasPrevBu1) {
          $prev.children('li').last().append(ulHtml);
        } else {
          $p.before(ulHtml);
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
        const hasBody = $next && !ALPHA_LIST_RE.test($next.text().trim());
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

  // 4) ol에 원문자 기반 span.mrk가 있으면 ul.bu-st1.list로 교체 (테이블 경로 대비)
  $('ol').each((_, ol) => {
    const $ol = $(ol);
    const hasCircledMrk = $ol.find('> li').toArray().some(li => {
      const $li = $(li);
      const inner = ($li.html() || '').trim();
      return CIRCLED_RE.test(inner) || CIRCLED_RE.test($li.text().trim());
    });
    if (!hasCircledMrk) return;
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
  $('h4.tit-st.contents').each((_, h4) => {
    const $h4 = $(h4);
    if ($h4.next().is('.indent')) return;
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
  const PAREN_NUM_RE = /^(\d+|[가나다라마바사아자차카타파하])\)\s*/;
  $('*').each((_, container) => {
    const $c = $(container);
    const pChildren = $c.children('p').toArray();
    let i = 0;
    while (i < pChildren.length) {
      const $p = $(pChildren[i]);
      const txt = $p.text().trim();
      if (!PAREN_NUM_RE.test(txt) || txt.length > 80) { i++; continue; }
      const group = [];
      let j = i;
      while (j < pChildren.length) {
        const $curr = $(pChildren[j]);
        const currTxt = $curr.text().trim();
        if (PAREN_NUM_RE.test(currTxt) && currTxt.length <= 80) {
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

  return $('body').html() || result;
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
  const tabsHtml = $t('body').html() || withOcr;

  // OCR 주입 후 테이블 존재 여부 재확인 (이미지 기반 테이블도 포함)
  const $check = cheerio.load(tabsHtml);
  const hasAnyTable = $check('table').length > 0;

  if (hasAnyTable) {
    return postProcessMarkup(directMarkupHtml(tabsHtml));
  }

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
  return postProcessMarkup(result);
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
  const isPP = /개인정보\s*(?:처리|보호)\s*방침/.test($pre('body').text());

  // 영상정보처리방침 페이지: 첫 번째 텍스트에 "영상정보처리방침"이 있으면 PP와 동일 경로로 처리
  const $bodyEl = $pre('body');
  const firstTextNode = $bodyEl.find('h1,h2,h3,h4,h5,h6,p,td,th,li,dt,dd,span,div')
    .filter((_, el) => $pre(el).children('h1,h2,h3,h4,h5,h6,p').length === 0)
    .first();
  const firstText = firstTextNode.length ? firstTextNode.text().trim() : $bodyEl.text().slice(0, 50).trim();
  const isVP = /영상\s*정보\s*처리\s*방침/.test(firstText);
  // isPP와 동일하게 전체 body 텍스트를 검색 (브레드크럼·내비 li가 firstText를 가로채는 경우 대비)
  const CP_RE = /저작권\s*(?:보호\s*)?(?:지침|정책|방침|안내|신고)/;
  const isCP = CP_RE.test($pre('body').text());

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

  // 플레이스홀더 → 원본 테이블 재삽입 (div.tbl-st.scroll-w 래퍼 포함)
  let finalResult = result;
  extractedTables.forEach((tableHtml, i) => {
    const wrapped = `<div class="tbl-st scroll-w">${tableHtml}</div>`;
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
      let schoolName = crawledData.school_name || '';
      if (!schoolName) {
        const bodyText = $pp('body').text();
        const m = bodyText.match(/([가-힣]{2,15}(?:초등학교|중학교|고등학교|특수학교|대학교|학교))/);
        schoolName = m ? m[1] : '';
      }
      const titleText = schoolName ? `${schoolName} 개인정보처리방침` : '개인정보처리방침';
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
      let schoolName = crawledData.school_name || '';
      if (!schoolName) {
        const bodyText = $vp('body').text();
        const m = bodyText.match(/([가-힣]{2,15}(?:초등학교|중학교|고등학교|특수학교|대학교|학교))/);
        schoolName = m ? m[1] : '';
      }
      const titleText = schoolName ? `${schoolName} 영상정보처리방침` : '영상정보처리방침';
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
