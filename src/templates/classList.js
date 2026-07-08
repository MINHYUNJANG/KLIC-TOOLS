import { parseMarkup } from '../utils/templateMapping.js';

// 학급목록 원본은 대개 학년별 박스(h3~h5 학년 제목 + 반 목록 li) 구조다. 학생수·급훈처럼
// 실제 학급마당 크롤링에는 거의 없는 세부 정보는 추출하지 않고, 학년/반 이름만 옮긴다.
function extractClassGroups(src) {
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const groups = [];

  const boxes = Array.from(src.querySelectorAll('[class*="classBox"], [class*="class_box"], [class*="classbox"]'));
  boxes.forEach(box => {
    const gradeTitle = norm(box.querySelector('h1, h2, h3, h4, h5, h6')?.textContent) || '';
    // leaf li(반 하나에 해당하는 행) 안의 첫 번째 링크만 사용한다. li 전체 텍스트를 쓰면
    // "GO" 같은 버튼 텍스트까지 붙어버린다.
    const classNames = Array.from(box.querySelectorAll('li'))
      .filter(li => !li.querySelector('li'))
      .map(li => norm((li.querySelector('a') || li).textContent))
      .filter(text => text && /\d+\s*반|\d+반/.test(text) && !/^go$/i.test(text));
    const uniqueClassNames = [...new Set(classNames)];
    if (uniqueClassNames.length) groups.push({ grade: gradeTitle, classes: uniqueClassNames });
  });
  if (groups.length) return groups;

  // 학년별 박스가 없으면 표에서 "N학년 M반" 패턴의 셀을 모아 학년 단위로 묶는다.
  const table = src.querySelector('table');
  if (table) {
    const cells = Array.from(table.querySelectorAll('td, th')).map(el => norm(el.textContent)).filter(Boolean);
    const byGrade = new Map();
    cells.forEach(text => {
      const m = text.match(/(\d+)\s*학년\s*(\d+)\s*반/);
      if (!m) return;
      const grade = `${m[1]}학년`;
      if (!byGrade.has(grade)) byGrade.set(grade, []);
      byGrade.get(grade).push(text);
    });
    byGrade.forEach((classes, grade) => groups.push({ grade, classes: [...new Set(classes)] }));
  }
  return groups;
}

const GRADE_WRAP_ORDER = ['one', 'two', 'three', 'four', 'five', 'six'];

// tyA/tyC처럼 학년별로 .list-wrap.one ~ .list-wrap.six 로 나뉜 구조에 그룹을 순서대로
// 채운다. 원본 학년 수가 템플릿보다 적으면 남는 학년 섹션은 제거한다.
function fillGradeWraps(tpl, groups, fillLi) {
  GRADE_WRAP_ORDER.forEach((wrapClass, idx) => {
    const wrap = tpl.querySelector(`.list-wrap.${wrapClass}`);
    if (!wrap) return;
    const group = groups[idx];
    if (!group) { wrap.remove(); return; }
    const list = wrap.querySelector('ul');
    const liTemplate = list?.querySelector(':scope > li');
    if (!list || !liTemplate) return;
    const clones = group.classes.map(className => {
      const li = liTemplate.cloneNode(true);
      fillLi(li, className, group.grade);
      return li;
    });
    if (!clones.length) { wrap.remove(); return; }
    Array.from(list.querySelectorAll(':scope > li')).forEach(li => li.remove());
    clones.forEach(li => list.appendChild(li));
  });
}

export default [
  {
    id: 'classlist-tyA',
    category: '학급목록',
    label: '학급목록 tyA',
    desc: '학년별 그룹 + 학생수/급훈 카드형',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const groups = extractClassGroups(src);
      fillGradeWraps(tpl.querySelector('.class-list.tyA'), groups, (li, className, grade) => {
        const gradeSpan = li.querySelector('.grade');
        if (gradeSpan) gradeSpan.textContent = grade || className.match(/\d+학년/)?.[0] || '';
        const numSpan = li.querySelector('.num');
        if (numSpan) numSpan.textContent = className;
        const link = li.querySelector('a');
        if (link) link.removeAttribute('href');
      });
      return tpl.body.innerHTML;
    },
    code: `<div class="class-list tyA">
  <div class="list-wrap one">
    <ul>
      <li>
        <a href="">
          <span class="grade">1학년</span>
          <span class="num">1학년 1반</span>
          <div class="inr">
            <ul>
              <li><strong>학생수</strong> 25명</li>
              <li><strong>급훈</strong> 항상 즐겁게 임하자</li>
            </ul>
          </div>
        </a>
      </li>
    </ul>
  </div>
  <div class="list-wrap two">
    <ul>
      <li>
        <a href="">
          <span class="grade">2학년</span>
          <span class="num">2학년 1반</span>
          <div class="inr">
            <ul>
              <li><strong>학생수</strong> 25명</li>
              <li><strong>급훈</strong> 항상 즐겁게 임하자</li>
            </ul>
          </div>
        </a>
      </li>
    </ul>
  </div>
  <div class="list-wrap three">
    <ul>
      <li>
        <a href="">
          <span class="grade">3학년</span>
          <span class="num">3학년 1반</span>
          <div class="inr">
            <ul>
              <li><strong>학생수</strong> 25명</li>
              <li><strong>급훈</strong> 항상 즐겁게 임하자</li>
            </ul>
          </div>
        </a>
      </li>
    </ul>
  </div>
  <div class="list-wrap four">
    <ul>
      <li>
        <a href="">
          <span class="grade">4학년</span>
          <span class="num">4학년 1반</span>
          <div class="inr">
            <ul>
              <li><strong>학생수</strong> 25명</li>
              <li><strong>급훈</strong> 항상 즐겁게 임하자</li>
            </ul>
          </div>
        </a>
      </li>
    </ul>
  </div>
  <div class="list-wrap five">
    <ul>
      <li>
        <a href="">
          <span class="grade">5학년</span>
          <span class="num">5학년 1반</span>
          <div class="inr">
            <ul>
              <li><strong>학생수</strong> 25명</li>
              <li><strong>급훈</strong> 항상 즐겁게 임하자</li>
            </ul>
          </div>
        </a>
      </li>
    </ul>
  </div>
  <div class="list-wrap six">
    <ul>
      <li>
        <a href="">
          <span class="grade">6학년</span>
          <span class="num">6학년 1반</span>
          <div class="inr">
            <ul>
              <li><strong>학생수</strong> 25명</li>
              <li><strong>급훈</strong> 항상 즐겁게 임하자</li>
            </ul>
          </div>
        </a>
      </li>
    </ul>
  </div>
</div>`,
  },
  {
    id: 'classlist-tyB',
    category: '학급목록',
    label: '학급목록 tyB',
    desc: '학년 구분 없는 아이콘 카드형',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const groups = extractClassGroups(src);
      const allClasses = groups.flatMap(g => g.classes);
      const list = tpl.querySelector('.class-list.tyB .list-wrap > ul');
      const liTemplate = list?.querySelector(':scope > li');
      if (list && liTemplate && allClasses.length) {
        const clones = allClasses.map(className => {
          const li = liTemplate.cloneNode(true);
          const gradeSpan = li.querySelector('.grade');
          if (gradeSpan) gradeSpan.textContent = className;
          const link = li.querySelector('a');
          if (link) link.removeAttribute('href');
          return li;
        });
        Array.from(list.querySelectorAll(':scope > li')).forEach(li => li.remove());
        clones.forEach(li => list.appendChild(li));
      }
      return tpl.body.innerHTML;
    },
    code: `<div class="class-list tyB">
  <div class="list-wrap">
    <ul>
      <li>
        <a href="">
          <span class="grade">1학년 1반</span>
          <span class="num"><i class="ri-user-smile-line" aria-hidden="true"></i> 25명</span>
          <img src="/common/images/sub_com/class_B_ico.png" alt="">
        </a>
      </li>
    </ul>
  </div>
</div>`,
  },
  {
    id: 'classlist-tyC',
    category: '학급목록',
    label: '학급목록 tyC',
    desc: '학년별 그룹 + 사진/담임 카드형',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const groups = extractClassGroups(src);
      fillGradeWraps(tpl.querySelector('.class-list.tyC'), groups, (li, className) => {
        const span = li.querySelector('.inr > span');
        if (span) span.textContent = className;
        const link = li.querySelector('a');
        if (link) link.removeAttribute('href');
      });
      return tpl.body.innerHTML;
    },
    code: `<div class="class-list tyC">
  <div class="list-wrap one">
    <ul>
      <li>
        <a href="">
          <p class="img"><img src="/common/images/sub_com/class_C_img.png" alt=""></p>
          <div class="inr">
            <span>1학년 1반</span>
            <ul>
              <li><i class="ri-briefcase-2-fill" aria-hidden="true"></i> 담임 이름</li>
              <li><i class="ri-emotion-happy-fill" aria-hidden="true"></i> 24명</li>
            </ul>
          </div>
        </a>
      </li>
    </ul>
  </div>
  <div class="list-wrap two">
    <ul>
      <li>
        <a href="">
          <p class="img"><img src="/common/images/sub_com/class_C_img.png" alt=""></p>
          <div class="inr">
            <span>2학년 1반</span>
            <ul>
              <li><i class="ri-briefcase-2-fill" aria-hidden="true"></i> 담임 이름</li>
              <li><i class="ri-emotion-happy-fill" aria-hidden="true"></i> 24명</li>
            </ul>
          </div>
        </a>
      </li>
    </ul>
  </div>
  <div class="list-wrap three">
    <ul>
      <li>
        <a href="">
          <p class="img"><img src="/common/images/sub_com/class_C_img.png" alt=""></p>
          <div class="inr">
            <span>3학년 1반</span>
            <ul>
              <li><i class="ri-briefcase-2-fill" aria-hidden="true"></i> 담임 이름</li>
              <li><i class="ri-emotion-happy-fill" aria-hidden="true"></i> 24명</li>
            </ul>
          </div>
        </a>
      </li>
    </ul>
  </div>
  <div class="list-wrap four">
    <ul>
      <li>
        <a href="">
          <p class="img"><img src="/common/images/sub_com/class_C_img.png" alt=""></p>
          <div class="inr">
            <span>4학년 1반</span>
            <ul>
              <li><i class="ri-briefcase-2-fill" aria-hidden="true"></i> 담임 이름</li>
              <li><i class="ri-emotion-happy-fill" aria-hidden="true"></i> 24명</li>
            </ul>
          </div>
        </a>
      </li>
    </ul>
  </div>
  <div class="list-wrap five">
    <ul>
      <li>
        <a href="">
          <p class="img"><img src="/common/images/sub_com/class_C_img.png" alt=""></p>
          <div class="inr">
            <span>5학년 1반</span>
            <ul>
              <li><i class="ri-briefcase-2-fill" aria-hidden="true"></i> 담임 이름</li>
              <li><i class="ri-emotion-happy-fill" aria-hidden="true"></i> 24명</li>
            </ul>
          </div>
        </a>
      </li>
    </ul>
  </div>
  <div class="list-wrap six">
    <ul>
      <li>
        <a href="">
          <p class="img"><img src="/common/images/sub_com/class_C_img.png" alt=""></p>
          <div class="inr">
            <span>6학년 1반</span>
            <ul>
              <li><i class="ri-briefcase-2-fill" aria-hidden="true"></i> 담임 이름</li>
              <li><i class="ri-emotion-happy-fill" aria-hidden="true"></i> 24명</li>
            </ul>
          </div>
        </a>
      </li>
    </ul>
  </div>
</div>`,
  },
]
