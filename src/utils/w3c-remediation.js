const RULES = [
  {
    match: /trailing slash on void element/i,
    messageKo: '빈 요소(void element)에 닫는 슬래시(/)를 사용하면 따옴표 없는 속성값과 충돌할 수 있습니다.',
    problem: 'HTML5에서 `<br>`, `<img>`, `<input>`, `<hr>`, `<meta>`, `<link>` 등 빈 요소(void element)는 닫는 슬래시(`/`)가 필요 없습니다. `<br/>`처럼 슬래시를 붙이는 것은 XHTML 문법이며, 속성값이 따옴표 없이 작성된 경우 파싱 오류를 유발할 수 있습니다.',
    fix: '빈 요소의 닫는 슬래시를 제거하세요.\n`<br/>` → `<br>`\n`<img src="..." />` → `<img src="...">`\n`<input type="text" />` → `<input type="text">`',
  },
  {
    match: /character encoding was not declared/i,
    messageKo: '문서에 문자 인코딩이 선언되지 않았습니다.',
    problem: '문서에 문자 인코딩이 선언되지 않아 브라우저가 `windows-1252` 등으로 임의 추측합니다. 한글 등 멀티바이트 문자가 깨질 수 있습니다.',
    fix: '`<head>` 의 가장 첫 줄에 아래 태그를 추가하세요.\n`<meta charset="UTF-8">`',
  },
  {
    match: /duplicate id/i,
    messageKo: '문서 내에 동일한 id 값이 중복 사용되었습니다.',
    problem: 'HTML 문서 내에서 `id` 속성 값은 반드시 고유해야 합니다. 동일한 `id`가 두 곳 이상에 쓰이면 JavaScript와 CSS 선택자가 의도하지 않은 요소를 대상으로 동작할 수 있습니다.',
    fix: '중복된 `id` 값을 고유하게 변경하거나, 같은 스타일·동작을 공유하는 요소라면 `id` 대신 `class`를 사용하세요.',
  },
  {
    match: /an img element must have an alt attribute/i,
    messageKo: '`<img>` 요소에 alt 속성이 없습니다.',
    problem: '`<img>` 요소에 `alt` 속성이 없으면 스크린리더 사용자에게 이미지 정보가 전달되지 않습니다. 웹 접근성(WCAG) 위반이기도 합니다.',
    fix: '`<img>` 에 `alt` 속성을 추가하세요.\n- 의미 있는 이미지: `<img src="logo.png" alt="회사 로고">`\n- 장식용 이미지: `<img src="deco.png" alt="">`',
  },
  {
    match: /element .+ not allowed as child of element/i,
    messageKo: '해당 요소는 부모 요소의 자식으로 허용되지 않습니다.',
    problem: '해당 요소는 부모 요소 안에 올 수 없습니다. HTML 콘텐츠 모델 규칙에 따라 특정 요소는 허용된 부모 요소 안에만 위치해야 합니다.',
    fix: '오류 메시지의 줄 번호를 확인하고, 해당 요소를 올바른 위치로 이동하거나 적합한 태그로 교체하세요. 예: `<p>` 안에 `<div>`를 쓰는 경우 `<div>` → `<span>` 으로 변경.',
  },
  {
    match: /the element .+ must not appear as a descendant of/i,
    messageKo: '해당 요소는 지정된 조상 요소 안에 중첩될 수 없습니다.',
    problem: '해당 요소는 지정된 조상 요소 안에 중첩될 수 없습니다. HTML 명세에서 허용하지 않는 중첩 구조입니다.',
    fix: '오류가 발생한 요소를 해당 조상 요소 밖으로 꺼내거나, 적합한 대체 요소를 사용하세요.\n예: `<a>` 안에 `<a>` 중첩 → 내부 링크 제거 또는 구조 재설계.',
  },
  {
    match: /attribute\s+.+\s+not allowed on element/i,
    messageKo: '해당 요소에는 사용할 수 없는 속성이 지정되어 있습니다.',
    problem: '해당 요소에는 사용할 수 없는 속성이 지정되어 있습니다. 잘못된 속성은 브라우저가 무시하거나 예상치 못한 동작을 유발할 수 있습니다.',
    fix: '해당 속성을 제거하거나, 속성을 지원하는 올바른 요소로 교체하세요. 커스텀 데이터가 필요하면 `data-*` 속성을 사용하세요.\n예: `<div align="center">` → CSS `text-align: center` 로 대체.',
  },
  {
    match: /bad value\s+.+\s+for attribute/i,
    messageKo: '속성에 허용되지 않는 값이 입력되어 있습니다.',
    problem: '속성에 허용되지 않는 형식의 값이 입력되어 있습니다. 예: `href`에 공백이 포함된 URL, `type`에 잘못된 MIME 타입 등.',
    fix: '오류 메시지에 표시된 속성의 값을 올바른 형식으로 수정하세요.\n- URL: 공백은 `%20`으로 인코딩\n- `type`: `text/css`, `text/javascript` 등 유효한 MIME 타입 사용',
  },
  {
    match: /stray start tag|stray end tag/i,
    messageKo: '짝이 맞지 않는 태그가 있습니다.',
    problem: '짝이 없는 태그가 존재합니다. 열린 태그에 대응하는 닫는 태그가 없거나, 반대로 닫는 태그만 단독으로 존재합니다.',
    fix: '오류 줄 번호를 확인하고 태그 쌍을 맞추세요.\n- 여는 태그가 없으면 `</div>` 같은 불필요한 닫는 태그를 제거\n- 닫는 태그가 없으면 `</section>` 등 누락된 닫는 태그를 추가',
  },
  {
    match: /unclosed element/i,
    messageKo: '닫히지 않은 요소가 있습니다.',
    problem: '닫히지 않은 요소가 있습니다. 태그가 열렸지만 대응하는 닫는 태그가 문서 내에 없습니다.',
    fix: '해당 요소의 닫는 태그를 적절한 위치에 추가하세요.\n예: `<div class="wrap">` 이후 `</div>` 가 누락된 경우 추가.',
  },
  {
    match: /end tag for void element/i,
    messageKo: '빈 요소(void element)에 닫는 태그를 사용할 수 없습니다.',
    problem: '`<br>`, `<img>`, `<input>` 등 빈 요소(void element)는 닫는 태그를 사용하면 안 됩니다.',
    fix: '`</br>`, `</img>` 등 빈 요소의 닫는 태그를 제거하세요.',
  },
  {
    match: /unnecessary for javascript resources/i,
    messageKo: '`<script>` 태그의 `type="text/javascript"` 속성은 불필요합니다.',
    problem: 'HTML5에서 `<script>` 태그의 `type="text/javascript"` 는 기본값이므로 생략해도 됩니다. 명시하면 불필요한 코드가 됩니다.',
    fix: '`<script type="text/javascript">` → `<script>` 로 `type` 속성을 제거하세요.',
  },
  {
    match: /type.*for the style element is not needed/i,
    messageKo: '`<style>` 태그의 `type="text/css"` 속성은 불필요합니다.',
    problem: 'HTML5에서 `<style>` 태그의 `type="text/css"` 는 기본값이므로 생략해도 됩니다.',
    fix: '`<style type="text/css">` → `<style>` 로 `type` 속성을 제거하세요.',
  },
  {
    match: /section lacks heading/i,
    messageKo: '`<section>` 요소 안에 제목 요소가 없습니다.',
    problem: '`<section>` 요소 안에 제목 요소(`<h1>`~`<h6>`)가 없습니다. 문서 구조와 접근성을 위해 섹션에는 제목이 필요합니다.',
    fix: '`<section>` 안에 적절한 제목 태그를 추가하거나, 제목이 필요 없는 영역이라면 `<section>` 대신 `<div>`를 사용하세요.',
  },
  {
    match: /consider adding a lang attribute/i,
    messageKo: '`<html>` 태그에 `lang` 속성을 추가하는 것을 권장합니다.',
    problem: '`<html>` 태그에 `lang` 속성이 없습니다. 스크린리더와 번역 엔진이 올바른 언어를 감지하지 못할 수 있습니다.',
    fix: '`<html>` 태그에 언어 코드를 추가하세요.\n`<html lang="ko">` (한국어)\n`<html lang="en">` (영어)',
  },
  {
    match: /obsolete|non-conforming/i,
    messageKo: '더 이상 사용되지 않는(deprecated) 요소 또는 속성이 사용되었습니다.',
    problem: '사용 중단(deprecated)되었거나 현재 HTML 표준에서 허용되지 않는 요소 또는 속성입니다.',
    fix: '오류 메시지에 언급된 요소·속성을 CSS나 최신 HTML 대안으로 교체하세요.\n예: `<font>` → CSS `font-family`, `<center>` → CSS `text-align: center`, `<b>` → `<strong>`',
  },
  {
    match: /element .+ is not allowed/i,
    messageKo: '해당 요소는 현재 위치에서 허용되지 않습니다.',
    problem: '해당 요소는 현재 맥락에서 허용되지 않습니다. HTML 명세의 콘텐츠 카테고리 규칙을 위반하고 있습니다.',
    fix: '오류 줄 번호를 확인하고 요소를 적절한 위치로 이동하거나 허용되는 대체 요소를 사용하세요.',
  },
  {
    match: /no space between attributes/i,
    messageKo: '속성과 속성 사이에 공백이 없습니다.',
    problem: '속성과 속성 사이에 공백이 없습니다. 브라우저가 잘못 파싱할 수 있습니다.',
    fix: '속성 사이에 공백을 추가하세요.\n`<input type="text"name="id">` → `<input type="text" name="id">`',
  },
  {
    match: /table row was .+ column.+ wide and exceeded the column count/i,
    messageKo: '표의 행(row)이 선언된 컬럼 수를 초과합니다.',
    problem: '`<colgroup>` 또는 `<col>` 로 선언된 컬럼 수보다 실제 `<td>`/`<th>` 의 개수(colspan 포함)가 더 많습니다. 표의 컬럼 수 선언과 실제 셀 수가 일치하지 않으면 렌더링이 불안정해질 수 있습니다.',
    fix: '아래 두 가지 중 하나를 선택하세요.\n\n① `<colgroup>`/`<col>` 선언을 실제 셀 수에 맞게 수정\n예: 셀이 7개라면 → `<colgroup><col span="7"></colgroup>`\n\n② `<colgroup>`/`<col>` 선언이 불필요하면 제거하고, `<table>` 에 CSS 로 스타일 적용\n예: `table { width: 100%; border-collapse: collapse; }`',
  },
  {
    match: /table without thead/i,
    messageKo: '데이터 테이블에 `<thead>` 가 없습니다.',
    problem: '데이터 테이블에 `<thead>` 가 없습니다. 헤더 행 구분이 없으면 스크린리더 사용자가 표의 구조를 파악하기 어렵습니다.',
    fix: '표의 헤더 행을 `<thead><tr><th>...</th></tr></thead>` 로 감싸고, 데이터 행은 `<tbody>` 안에 배치하세요.',
  },
  {
    match: /http-equiv.*X-UA-Compatible|X-UA-Compatible.*content/i,
    messageKo: '`X-UA-Compatible` 메타 태그의 content 값이 올바르지 않습니다.',
    problem: '`X-UA-Compatible` 메타 태그의 `content` 값이 `"IE=edge"` 가 아닙니다. `"IE=edge,chrome=1"` 등 추가 값을 함께 쓰면 W3C 유효성 오류가 발생합니다.',
    fix: '`content` 값을 정확히 `"IE=edge"` 로만 수정하세요.\n`<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">` → `<meta http-equiv="X-UA-Compatible" content="IE=edge">`',
  },
  {
    match: /CSS:.*font-weight.*is not a.*value/i,
    messageKo: 'CSS `font-weight`에 유효하지 않은 값이 사용되었습니다.',
    problem: 'CSS `font-weight` 에 유효하지 않은 값이 사용되었습니다. `thin`은 CSS 표준 키워드가 아닙니다.',
    fix: '`font-weight` 에는 숫자(100~900) 또는 표준 키워드를 사용하세요.\n- 가늘게: `font-weight: 100` 또는 `font-weight: lighter`\n- 기본: `font-weight: 400` 또는 `font-weight: normal`\n- 굵게: `font-weight: 700` 또는 `font-weight: bold`',
  },
  {
    match: /CSS:.*color.*is not a.*value/i,
    messageKo: 'CSS `color`에 유효하지 않은 값이 사용되었습니다.',
    problem: 'CSS `color` 에 유효하지 않은 값이 사용되었습니다. 16진수 색상 코드 앞에 `#` 기호가 누락되었습니다.',
    fix: '색상 코드 앞에 `#` 를 붙이세요.\n`color: 484848` → `color: #484848`\n`background: ffffff` → `background: #ffffff`',
  },
  {
    match: /heading cannot be a child of another heading/i,
    messageKo: '제목 요소 안에 또 다른 제목 요소가 중첩될 수 없습니다.',
    problem: '제목 요소(`<h1>`~`<h6>`) 안에 또 다른 제목 요소가 중첩되어 있습니다. HTML 명세상 제목은 다른 제목의 자식이 될 수 없습니다.',
    fix: '안쪽 제목 요소를 바깥으로 꺼내거나 `<p>`, `<span>` 등 적절한 태그로 교체하세요.\n`<h2>제목 <h3>부제목</h3></h2>` → `<h2>제목</h2><h3>부제목</h3>`',
  },
  {
    match: /end tag.*seen.*open elements|open elements.*end tag/i,
    messageKo: '닫는 태그 위치에 아직 닫히지 않은 요소가 남아 있습니다.',
    problem: '닫는 태그(`</li>` 등) 위치에 아직 닫히지 않은 요소가 남아 있습니다. 보통 `<li>` 안에 블록 요소(`<h3>`, `<div>` 등)를 열었지만 닫지 않은 경우 발생합니다.',
    fix: '오류 줄 번호를 확인하고 열린 요소를 먼저 닫은 뒤 `</li>` 를 작성하세요.\n예: `<li>내용<h3>소제목</li>` → `<li>내용<h3>소제목</h3></li>`',
  },
  {
    match: /empty heading/i,
    messageKo: '내용이 없는 빈 제목 요소가 있습니다.',
    problem: '내용이 없는 빈 제목 요소가 있습니다. `<h3></h3>` 처럼 텍스트가 없는 제목은 스크린리더가 읽을 내용이 없어 접근성을 해치고 문서 구조를 왜곡합니다.',
    fix: '제목 요소 안에 의미 있는 텍스트를 채우거나, 텍스트가 불필요한 경우 해당 태그를 제거하세요.\n예: `<h3></h3>` → 삭제하거나 `<h3>소제목 텍스트</h3>` 로 수정',
  },
  {
    match: /heading elements.*none.*heading level of 1|computed heading level of 1/i,
    messageKo: '문서에 `<h1>` 제목 요소가 없습니다.',
    problem: '문서에 제목 요소가 있지만 `<h1>` 이 존재하지 않습니다. 페이지의 최상위 제목인 `<h1>` 이 없으면 스크린리더 사용자와 검색엔진이 페이지의 주제를 파악하기 어렵습니다.',
    fix: '페이지 본문의 가장 중요한 제목에 `<h1>` 을 사용하세요. 페이지당 `<h1>` 은 하나만 권장됩니다.\n예: `<h1>페이지 대제목</h1>` 을 콘텐츠 영역 최상단에 추가\n이후 하위 제목은 `<h2>`, `<h3>` 순서로 계층 구조를 맞추세요.',
  },
  {
    match: /skipping \d+ heading level/i,
    messageKo: '제목 계층이 순서를 건너뛰었습니다. (예: h1 다음에 h4 사용)',
    problem: '제목 레벨이 연속되지 않습니다. 예를 들어 `<h1>` 다음에 `<h4>`가 오면 `<h2>`, `<h3>`가 건너뛰어집니다. 스크린리더 사용자는 제목 계층을 기준으로 페이지를 탐색하므로 순서가 맞지 않으면 구조 파악이 어렵습니다.',
    fix: '제목 레벨을 순서대로 사용하세요. `<h1>` → `<h2>` → `<h3>` 처럼 한 단계씩만 내려가야 합니다.\n시각적 크기 조절이 목적이라면 CSS `font-size`를 활용하고 제목 레벨은 문서 구조에 맞게 유지하세요.',
  },
  {
    match: /the first child option element of a select element with a required attribute/i,
    messageKo: '`required` 속성이 있는 `<select>`의 첫 번째 `<option>`은 빈 값이어야 합니다.',
    problem: '`required` 가 있는 `<select>` 요소의 첫 번째 `<option>` 값이 비어있지 않습니다. 사용자가 반드시 선택해야 하는 경우, 첫 항목은 빈 플레이스홀더여야 합니다.',
    fix: '첫 번째 `<option>` 에 `value=""` 를 지정하세요.\n`<option value="">선택해주세요</option>`',
  },
  {
    match: /label element with multiple labelable descendant/i,
    messageKo: '`<label>` 안에 여러 개의 폼 컨트롤이 있습니다.',
    problem: '`<label>` 요소 안에 `<input>`, `<select>`, `<textarea>` 등 레이블 가능한 요소가 두 개 이상 있습니다. 하나의 `<label>` 은 하나의 폼 컨트롤과 연결되어야 합니다.',
    fix: '폼 컨트롤마다 별도의 `<label>` 을 사용하세요. 또는 `<label for="id">` 와 `id` 속성으로 명시적으로 연결하세요.',
  },
  {
    match: /the for attribute of the label element must refer to a form control/i,
    messageKo: '`<label>`의 `for` 속성이 유효한 폼 컨트롤 `id`와 연결되어 있지 않습니다.',
    problem: '`<label for="...">` 의 값이 문서 내 어떤 `<input>`, `<select>`, `<textarea>` 의 `id` 와도 일치하지 않습니다.',
    fix: '`<label for="userId">` 처럼 `for` 값이 대응 폼 컨트롤의 `id` 와 정확히 같아야 합니다.\n`<input id="userId" type="text">` 와 쌍을 이루도록 수정하세요.',
  },
  {
    match: /a document must not include more than one visible main element/i,
    messageKo: '문서에 `<main>` 요소가 두 개 이상 있습니다.',
    problem: '페이지에 `<main>` 요소가 두 개 이상 존재합니다. `<main>` 은 페이지의 핵심 콘텐츠 영역을 나타내며 문서에 하나만 있어야 합니다.',
    fix: '`<main>` 을 하나만 남기고 나머지는 `<section>`, `<div>` 등 다른 태그로 교체하세요.',
  },
  {
    match: /the document is missing a title/i,
    messageKo: '문서에 `<title>` 요소가 없습니다.',
    problem: '`<head>` 안에 `<title>` 요소가 없습니다. 페이지 제목은 브라우저 탭, 즐겨찾기, 스크린리더에서 페이지를 식별하는 데 사용됩니다.',
    fix: '`<head>` 안에 `<title>` 을 추가하세요.\n`<title>페이지 제목</title>`',
  },
  {
    match: /attribute .+ is not serializable as XML/i,
    messageKo: '속성 값이 XML로 직렬화할 수 없는 문자를 포함합니다.',
    problem: '속성 값에 XML 직렬화에 허용되지 않는 문자가 포함되어 있습니다. 예: 따옴표가 이스케이프되지 않은 경우.',
    fix: '속성 값 내부의 특수문자를 HTML 엔티티로 이스케이프하세요.\n`"` → `&quot;`, `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`',
  },
  {
    match: /a numeric character reference expanded to the C1 controls range/i,
    messageKo: '사용이 금지된 범위의 유니코드 숫자 문자 참조가 사용되었습니다.',
    problem: 'C1 제어 문자 범위(U+0080~U+009F)의 숫자 문자 참조는 HTML5에서 허용되지 않습니다.',
    fix: '해당 숫자 참조를 올바른 유니코드 문자 또는 해당 HTML 엔티티로 교체하세요.\n예: `&#8211;` → `–` (en dash)',
  },
  {
    match: /aria-label(ledby)? attribute cannot be used/i,
    messageKo: '해당 요소에는 `aria-label` 또는 `aria-labelledby` 속성을 사용할 수 없습니다.',
    problem: '`aria-label` 또는 `aria-labelledby` 는 레이블을 지원하는 역할(role)을 가진 요소에만 사용할 수 있습니다.',
    fix: '해당 요소의 `role` 속성이 올바른지 확인하고, ARIA 레이블이 필요한 경우 적절한 role을 부여하세요.\n예: `role="region"`, `role="navigation"` 등',
  },
  {
    match: /bad value .+ for attribute role/i,
    messageKo: '`role` 속성에 허용되지 않는 값이 사용되었습니다.',
    problem: '`role` 속성에 ARIA 명세에 없는 잘못된 값이 사용되었습니다.',
    fix: '유효한 ARIA role 값을 사용하세요.\n예: `role="button"`, `role="navigation"`, `role="main"`, `role="dialog"`, `role="list"` 등',
  },
];

export function getRemediation(message) {
  if (!message) return null;
  for (const rule of RULES) {
    if (rule.match.test(message)) {
      return { problem: rule.problem, fix: rule.fix };
    }
  }
  return null;
}

export function getMessageKo(message) {
  if (!message) return null;
  for (const rule of RULES) {
    if (rule.match.test(message)) return rule.messageKo;
  }
  return null;
}
