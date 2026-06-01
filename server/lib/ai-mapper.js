import Groq from 'groq-sdk';
import * as cheerio from 'cheerio';

let _client = null;

const MODELS = [
  'llama-3.3-70b-versatile',
  'llama3-70b-8192',
  // 'llama-3.1-8b-instant', // 8B: 환각 심함 — CPO/AI 등 없는 내용 추가하므로 비활성화
];

const CEREBRAS_MODELS = ['gpt-oss-120b', 'zai-glm-4.7'];
const MAX_CHARS = 12000;

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
        if (!(e instanceof Error && /^\d{3}/.test(e.message))) console.error('[Cerebras] 네트워크 오류:', e.message);
        lastError = e;
      }
    }
  }
  throw new Error(`Cerebras 모든 모델에서 실패했습니다.\n(${lastError})`);
}

async function chat(messages, maxTokens = 8192) {
  const client = getClient();
  let lastError;

  for (const model of MODELS) {
    for (const msgs of [messages, truncateMessages(messages)]) {
      try {
        const result = await client.chat.completions.create({ model, max_tokens: maxTokens, messages: msgs });
        return stripCodeFence(result.choices[0].message.content);
      } catch (e) {
        lastError = e;
        const status = e?.status ?? e?.statusCode;
        console.warn(`[Groq] ${model} → HTTP ${status ?? 'unknown'}: ${String(e).slice(0, 200)}`);
        if (status === 413) continue; // 내용이 너무 크면 잘라낸 버전으로 재시도
        if (status === 429) break;    // 모델 레이트리밋 → 다음 모델로
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
   ※ 원문자 바로 뒤에 학교명·기관명이 오고 그 뒤에 조사(는/가/이/은/에서/의 등)가 이어지는 경우
     (예: ①천안중앙고등학교는, ②OO초등학교가)
     학교명·기관명을 절대 제거하지 말고 반드시 그대로 보존할 것
     올바른 예: <li><span class="mrk">1</span>천안중앙고등학교는 개인정보...</li>

6. ○, -, ※ 등 특수문자로 시작하는 리스트 항목은 해당 특수문자 제거 후 <li>에 넣기

7. 테이블:
   - 원본 테이블 HTML이 제공된 경우 그 구조(thead/tbody/th/td/colspan/rowspan 등)를 그대로 유지
   - 반드시 아래 래퍼로 감싸기:
   <div class="tbl-st scroll-w">
     <table>
       <caption>테이블 상위 타이틀과 주요 th 항목을 조합해 "OOO 테이블 입니다."형식으로 작성</caption>
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

9-1. "다음과 같습니다" 소개 문장 뒤에 "1. 항목명", "2. 항목명" 형태가 이어질 때 → 반드시 중첩 구조로:
   <li>소개문장(예: 개인정보 파기의 절차 및 방법은 다음과 같습니다.)
   	<ul class="bu-st2 list">
   		<li>1. 파기절차<br>내용</li>
   		<li>2. 파기방법<br>내용</li>
   	</ul>
   </li>
   ※ 번호(1., 2.)는 <span class="mrk">로 변환하지 말고 "1. 파기절차" 형태 그대로 유지
   ※ 하위 <ul>은 반드시 class="bu-st2 list"

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

  // 3-1) "파기 절차 및 방법은 다음과 같습니다" 소개 li + 번호 형제 li 들 → 소개 li 안에 ul 중첩
  //      AI가 규칙 9-1을 어기고 형제로 평탄화했을 때 자동 교정 (class는 step 4에서 bu-st2 list로 자동 결정)
  $('li').each((_, li) => {
    const $li = $(li);
    if ($li.children('ul, ol').length) return; // 이미 중첩 있으면 패스

    const ownText = $li.clone().children('ul, ol').remove().end().text().trim();
    if (!(/파기/.test(ownText) && /(?:절차|방법)/.test(ownText) && /같습니다/.test(ownText))) return;

    // 같은 부모의 다음 형제 li 중 "N." 패턴으로 연속된 것만 수집
    const allSibLi = $li.parent().children('li').toArray();
    const myIdx = allSibLi.indexOf(li);
    const toNest = [];
    for (let i = myIdx + 1; i < allSibLi.length; i++) {
      if (/^\s*[1-9][0-9]*[.)]\s*\S/.test($(allSibLi[i]).text())) {
        toNest.push($(allSibLi[i]));
      } else break;
    }
    if (!toNest.length) return;

    const $ul = $('<ul></ul>');
    toNest.forEach($s => $ul.append($s.detach()));
    $li.append($ul);
  });

  // 3-2) 소개 li 안에 이미 중첩된 ol(order-st) → ul로 변환 + span.mrk 숫자를 "N." 텍스트로 복원
  $('li > ol').each((_, ol) => {
    const $ol = $(ol);
    const $parentLi = $ol.parent();
    const ownText = $parentLi.clone().children('ul, ol').remove().end().text().trim();
    if (!(/파기/.test(ownText) && /(?:절차|방법)/.test(ownText) && /같습니다/.test(ownText))) return;

    $ol.find('li').each((_, item) => {
      const $item = $(item);
      const $mrk = $item.find('> span.mrk').first();
      if ($mrk.length) {
        const num = $mrk.text().trim();
        $mrk.replaceWith(`${num}. `);
      }
    });
    // ol 태그를 ul로 교체 (class는 step 4에서 자동 할당)
    const $ul = $('<ul></ul>');
    $ul.append($ol.contents());
    $ol.replaceWith($ul);
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

  // 5) .indent 내 단독 strong p, 조항(제N조) p → h4.tit-st contents
  $('.indent > p').each((_, p) => {
    const $p = $(p);
    const $ch = $p.children();
    const isOnlyStrong = $ch.length === 1 && $ch.first().is('strong') && ($p.text().trim() === $ch.first().text().trim());
    const isClause = /^제\s*\d+\s*조/.test($p.text().trim());
    if (isOnlyStrong || isClause) {
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

  // 8) 최상단 h3.section 바로 아래 p 태그들 → <div class="box-st emp"><p>...<br>..</p></div>
  //    가장 첫 번째 h3.section만 처리 (이하 h3에는 적용 안 함)
  const $firstH3 = $('h3.section').first();
  if ($firstH3.length) {
    const $h3 = $firstH3;
    if (!($h3.next().is('div') && /box-st/.test($h3.next().attr('class') || ''))) {
      const toWrap = [];
      let $cur = $h3.next();
      while ($cur.length) {
        const tn = ($cur.get(0)?.tagName || '').toLowerCase();
        if (/^h[3-6]$/.test(tn) || $cur.hasClass('indent')) break;
        if (tn === 'p') toWrap.push($cur.get(0));
        else break;
        $cur = $cur.next();
      }
      if (toWrap.length) {
        const merged = toWrap.map(el => ($(el).html() || '').trim()).join('<br>');
        $(toWrap[0]).before(`<div class="box-st emp"><p>${merged}</p></div>`);
        toWrap.forEach(el => $(el).remove());
      }
    }
  }

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
  const URL_WRAP_RE = /(?:href=["'][^"']*["']|src=["'][^"']*["'])|(https?:\/\/[^\s<>"'()[\]]+|www\.[a-zA-Z0-9][a-zA-Z0-9.\-]*[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9.\-]*\.(?:go|or|co|re|ac|ne)\.kr(?:\/[^\s<>"'()[\]]*)?)/gi;
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

// ─── AI 환각(hallucination) 제거 ────────────────────────────────
// 원문에 없는 짧은 영문 대문자 단독 <p> 제거 (CPO, AI, DPO, CEO 등)
function removeHallucinatedElements(html, originalText) {
  if (!originalText) return html;
  const $ = cheerio.load(html);
  $('p').each((_, el) => {
    const $el = $(el);
    if ($el.children().length) return;
    const text = $el.text().trim();
    // 1~8자 대문자+숫자로만 구성된 단독 p가 원문에 없으면 환각으로 간주
    if (/^[A-Z][A-Z0-9]{0,7}$/.test(text) && !originalText.includes(text)) {
      $el.remove();
    }
  });
  return $('body').html() || html;
}

// ─── HTML 내 학교명 주입 (테이블 경로용) ─────────────────────
function injectSchoolNameInHtml(html, name) {
  if (!name) return html;
  const n = name;
  // (?<!<\/\w+) : 닫힌 태그(</strong> 등)의 > 는 제외 — 학교명이 이미 <strong>안에 있을 때 중복 주입 방지
  return html
    .replace(/(?<!<\/\w+)>(에서 )/g, `>${n}$1`)
    .replace(/(?<!<\/\w+)>(가 개인정보)/g, `>${n}$1`)
    .replace(/(?<!<\/\w+)>(는 (?:파기|정보주체|이용자|위탁|개인정보|관리|전담|기술|암호))/g, `>${n}$1`)
    .replace(/(?<!<\/\w+)>(의 개인정보 보호책임자)/g, `>${n}$1`)
    .replace(new RegExp(`([${CIRCLED}]\\s+)(는 |가 |은 )`, 'g'), `$1${n}$2`)
    .replace(/(는|은)( 에 대해)/g, `$1 ${n}에 대해`);
}

// ─── AI 출력 후 학교명 재주입 (DOM 기반) ─────────────────────────
// regex 방식과 달리 들여쓰기·줄바꿈·span.mrk 위치에 무관하게 동작
function injectSchoolNameDOM(html, name) {
  if (!name) return html;
  const $ = cheerio.load(html);
  const BARE_PARTICLE_RE = /^(는|가|이|은|에서|의)\s*(개인정보|파기|정보주체|이용자|위탁|관리|전담|기술|암호)/;

  function findFirstText(el) {
    for (const child of $(el).contents().toArray()) {
      if (child.nodeType === 3) {
        const t = child.data.trimStart();
        if (t) return { node: child, trimmed: t };
      }
      if (child.nodeType === 1) {
        if ((child.tagName || '').toLowerCase() === 'span' &&
            /\bmrk\b/.test($(child).attr('class') || '')) continue;
        const r = findFirstText(child);
        if (r) return r;
      }
    }
    return null;
  }

  $('li, p, td, dd').each((_, el) => {
    const $el = $(el);
    const $clone = $el.clone();
    $clone.find('span.mrk').remove();
    const text = $clone.text().trim();
    if (!BARE_PARTICLE_RE.test(text)) return;
    const found = findFirstText(el);
    if (found) found.node.data = name + found.trimmed;
  });

  return $('body').html() || html;
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

// ─── OCR 유효성 검사 ──────────────────────────────────────────
function isUsableOcrText(text) {
  if (!text) return false;
  const t = text.trim();
  if (!t || t.length < 2) return false;
  if (/^`{3}[\s\S]{0,20}`{3}$/.test(t)) return false;
  if (/빈\s*문자열|반환\s*이유|이미지는|텍스트가\s*포함되어\s*있지\s*않|인식할\s*수\s*없/.test(t)) return false;
  return true;
}

// ─── OCR 결과를 img 요소에 주입 ──────────────────────────────
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
function directMarkupHtml(html) {
  const $ = cheerio.load(html);

  // 테이블 경로도 동일 전처리: 헤딩 정규화 후 tit/title 클래스 → h3 승격
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
    const shiftD = minLvl - 2;
    for (let l = minLvl; l <= 6; l++) {
      const nl = Math.min(l - shiftD, 6);
      $(`h${l}`).each((_, el) => {
        const $el = $(el);
        $el.replaceWith(`<h${nl}>${$el.html()}</h${nl}>`);
      });
    }
  }
  $('*').not('h1,h2,h3,h4,h5,h6,script,style,table,thead,tbody,tr,th,td').each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    if (!TIT_RE_D.test(cls)) return;
    const text = $el.text().trim();
    if (!text || text.length >= 120) return;
    if ($el.find('p,ul,ol,table,h1,h2,h3,h4,h5,h6').length) return;
    $el.replaceWith(`<h3>${text}</h3>`);
  });

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

    if (!$el.text().trim() && !$el.find('table, img').length) return '';

    if (tag === 'h1' || tag === 'h2') return `<h3 class="tit-st section">${$el.html()}</h3>`;
    if (tag === 'h3')                  return `<h4 class="tit-st contents">${$el.html()}</h4>`;
    if (tag === 'h4' || tag === 'h5') return `<h5 class="tit-st unit">${$el.html()}</h5>`;
    if (tag === 'h6')                  return `<h6 class="tit-st item">${$el.html()}</h6>`;

    if (tag === 'table') return `<div class="tbl-st scroll-w">${$.html(el)}</div>`;

    if (tag === 'p') return $el.text().trim() ? `<p>${$el.html()}</p>` : '';

    if (tag === 'ul' || tag === 'ol') return $.html(el);

    // tab-st cntnts col-4 div → 탭 내비게이션으로 그대로 출력 (재귀 금지)
    if (tag === 'div' && /\btab-st\b/.test(cls)) {
      return `<div class="tab-st cntnts col-4">${$el.html()}</div>`;
    }

    // 컨테이너: 자식 요소를 재귀 처리
    // form·fieldset 등 알 수 없는 블록 요소라도 내부에 table이 있으면 재귀 처리
    const CONTAINER_TAGS = new Set(['div', 'section', 'article', 'main', 'aside', 'figure', 'form', 'fieldset', 'nav', 'header', 'footer']);
    if (CONTAINER_TAGS.has(tag) || $el.find('table').length > 0) {
      const childParts = $el.children().toArray().map(processEl).filter(Boolean);
      return childParts.join('\n');
    }

    const text = $el.text().trim();
    return text ? `<p>${text}</p>` : '';
  }

  const parts = $('body').children().toArray().map(processEl).filter(Boolean);
  return parts.join('\n');
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
  $('*').not('h1,h2,h3,h4,h5,h6,script,style,table,thead,tbody,tr,th,td').each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    if (!TIT_RE.test(cls)) return;
    const text = $el.text().trim();
    if (!text || text.length >= 120) return;
    if ($el.find('p,ul,ol,table,h1,h2,h3,h4,h5,h6').length) return;
    $el.replaceWith(`<h3>${text}</h3>`);
  });

  // 2.5. h2만 있고 h3가 없는 경우(원본이 h3 단일 레벨): DOM 깊이 기준으로 하위 h2 → h3 강등
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

export async function autoMarkup(crawledData) {
  const rawHtml = crawledData.html || '';
  const text = crawledData.text || '';
  const images = crawledData.images || [];

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

  const $check = cheerio.load(tabsHtml);
  const hasAnyTable = $check('table').length > 0;

  if (hasAnyTable) {
    return postProcessMarkup(directMarkupHtml(tabsHtml));
  }

  const textOcrLines = images.map(img => img.ocr_text).filter(t => isUsableOcrText(t) && !/<table[\s>]/i.test(t));
  const ocrSection = textOcrLines.length ? '\n\n[이미지 OCR 텍스트]\n' + textOcrLines.join('\n') : '';

  const htmlForAI = buildHtmlForAI(tabsHtml);
  const primary = htmlForAI || text.trim() || textOcrLines.join('\n\n');
  const extra = textOcrLines.length ? ocrSection : '';

  const result = await chat([
    { role: 'system', content: SYSTEM_AUTO },
    { role: 'user', content:
        '다음 원문(HTML 형식)을 마크업해주세요.\n' +
        '원문 텍스트는 절대 수정·요약·생략·재배치하지 말고 모든 내용을 빠짐없이 그대로 출력하세요.\n\n' +
        primary + extra,
    },
  ]);
  const noHalluc = removeHallucinatedElements(result, crawledData.text || '');
  const processed = postProcessMarkup(noHalluc);
  return crawledData.school_name ? injectSchoolNameDOM(processed, crawledData.school_name) : processed;
}
