import { parseMarkup } from '../utils/templateMapping.js';

// 역대교장 표/리스트에서 [순번, 이름, 재임기간] 행을 최대한 일반적으로 추출한다.
// 사이트마다 표 구조가 제각각이라 열 순서를 단정하지 않고, 재임기간(연도~연도/현재)과
// 이름(한글 2~4자) 패턴으로 셀을 식별한다.
function extractPrincipalRows(src) {
  const isTerm = text => /\d{4}.*(?:[.\-~ㅡ]).*(?:\d{4}|현재)/.test(text) || /현재/.test(text);
  const isName = text => /^[가-힣]{2,4}(?:\s*(?:교장|원장))?$/.test(text.replace(/\s/g, ' ').trim());
  const isOrder = text => /^\d{1,3}$/.test(text.trim());
  const rows = [];

  const table = src.querySelector('table');
  if (table) {
    const trs = Array.from(table.querySelectorAll('tr')).filter(tr => tr.querySelector('td'));
    trs.forEach((tr, idx) => {
      const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.replace(/\s+/g, ' ').trim());
      if (!cells.length) return;
      const term = cells.find(isTerm) || '';
      const name = cells.find(isName) || cells.find(c => c && c !== term) || '';
      const order = cells.find(isOrder) || String(idx + 1);
      if (name || term) rows.push({ order, name: name.replace(/(교장|원장)$/, '').trim(), term });
    });
    if (rows.length) return rows;
  }

  // 표가 없으면 이름+기간 텍스트를 담은 반복 li를 찾는다.
  const items = Array.from(src.querySelectorAll('li')).filter(li => !li.querySelector('li'));
  items.forEach((li, idx) => {
    const text = li.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;
    const termMatch = text.match(/\d{4}[.\-]\d{1,2}(?:[.\-]\d{1,2})?\s*[~\-][^,]*(?:\d{4}[.\-]\d{1,2}(?:[.\-]\d{1,2})?|현재)/);
    const nameMatch = text.match(/[가-힣]{2,4}(?=\s*(?:교장|원장|$))/);
    if (!termMatch && !nameMatch) return;
    rows.push({ order: String(idx + 1), name: nameMatch ? nameMatch[0] : '', term: termMatch ? termMatch[0] : '' });
  });
  return rows;
}

function padOrder(order) {
  const n = parseInt(order, 10);
  return Number.isNaN(n) ? order : String(n).padStart(2, '0');
}

// 템플릿의 반복 항목(li 또는 swiper-slide 등) 중 첫 번째를 원본으로 삼아
// rows 개수만큼 복제해 채운다. fillItem(item, row, index)로 각 항목의 자리를 채운다.
function repeatListItems(list, rows, fillItem, itemSelector = ':scope > li') {
  if (!list) return;
  const template = list.querySelector(itemSelector);
  if (!template || !rows.length) return;
  const clones = rows.map((row, idx) => {
    const item = template.cloneNode(true);
    fillItem(item, row, idx);
    return item;
  });
  Array.from(list.querySelectorAll(itemSelector)).forEach(item => item.remove());
  clones.forEach(item => list.appendChild(item));
}

function fillOrderNameTerm(li, row) {
  const orderStrong = li.querySelector('.order strong');
  if (orderStrong) orderStrong.textContent = padOrder(row.order);
  const nameP = li.querySelector('.info > p, .inr > p');
  if (nameP) nameP.innerHTML = `<strong>${row.name || '홍길동'}</strong> 교장`;
  const termEl = li.querySelector('.term');
  if (termEl) {
    const label = termEl.querySelector('strong');
    termEl.textContent = '';
    if (label) { termEl.appendChild(label); termEl.appendChild(document.createTextNode(' ')); }
    termEl.appendChild(document.createTextNode(row.term || '재임기간 정보 없음'));
  }
}

export default [
  {
    id: 'pri-his-list',
    category: '역대교장',
    label: '역대교장 tyA (리스트형)',
    desc: '카드 그리드 + 약력보기 팝업',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const rows = extractPrincipalRows(src);
      repeatListItems(tpl.querySelector('.pri-his.tyA.list .list-wrap > ul'), rows, (li, row) => {
        fillOrderNameTerm(li, row);
        const link = li.querySelector('.btn-view');
        if (link) link.removeAttribute('href');
      });
      return tpl.body.innerHTML;
    },
    code: `<div class="pri-his tyA list container">
  <div class="list-wrap">
    <ul>
      <li>
        <div class="inner">
          <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
          <div class="info">
            <span class="order">제 <strong>01</strong> 대</span>
            <p><strong>홍길동</strong> 교장</p>
            <div class="term">
              <strong>재임기간</strong>
              2023.03.01. ~ 현재
            </div>
          </div>
        </div>
        <a href="" class="btn-view">약력보기</a>
      </li>
      <li>
        <div class="inner">
          <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
          <div class="info">
            <span class="order">제 <strong>02</strong> 대</span>
            <p><strong>홍길동</strong> 교장</p>
            <div class="term">
              <strong>재임기간</strong>
              2023.03.01. ~ 현재
            </div>
          </div>
        </div>
        <a href="" class="btn-view">약력보기</a>
      </li>
      <li>
        <div class="inner">
          <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
          <div class="info">
            <span class="order">제 <strong>03</strong> 대</span>
            <p><strong>홍길동</strong> 교장</p>
            <div class="term">
              <strong>재임기간</strong>
              2023.03.01. ~ 현재
            </div>
          </div>
        </div>
        <a href="" class="btn-view">약력보기</a>
      </li>
      <li>
        <div class="inner">
          <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
          <div class="info">
            <span class="order">제 <strong>04</strong> 대</span>
            <p><strong>홍길동</strong> 교장</p>
            <div class="term">
              <strong>재임기간</strong>
              2023.03.01. ~ 현재
            </div>
          </div>
        </div>
        <a href="" class="btn-view">약력보기</a>
      </li>
      <li>
        <div class="inner">
          <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
          <div class="info">
            <span class="order">제 <strong>05</strong> 대</span>
            <p><strong>홍길동</strong> 교장</p>
            <div class="term">
              <strong>재임기간</strong>
              2023.03.01. ~ 현재
            </div>
          </div>
        </div>
        <a href="" class="btn-view">약력보기</a>
      </li>
    </ul>
  </div>
</div>

<!-- 약력보기 팝업 -->
<div class="pri-his tyA popup" id="preHisPopup" role="dialog" aria-modal="true" aria-hidden="true" tabindex="-1">
  <div class="popup-wrap">
    <div class="info-wrap">
      <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
      <div class="info">
        <span class="order">제 <strong>01</strong> 대</span>
        <p><strong>홍길동</strong> 교장</p>
        <div class="term">
          <strong>재임기간</strong>
          2023.03.01. ~ 현재
        </div>
      </div>
    </div>
    <div class="list-wrap" tabindex="0">
      <h4 class="tit-st unit">학력</h4>
      <ul>
        <li><strong>1982</strong>
          <p>○○대학교 ○○학과 졸업</p>
        </li>
      </ul>
      <h4 class="tit-st unit">주요 업적</h4>
      <ul>
        <li><strong>1999</strong><p>주요 업적 내용</p></li>
        <li><strong>2000</strong><p>주요 업적 내용</p></li>
      </ul>
    </div>
    <p class="bg" aria-hidden="true"></p>
    <button class="btn-close"><span class="hid">약력보기 팝업 닫기</span><i class="ri-close-line" aria-hidden="true"></i></button>
  </div>
</div>`,
  },
  {
    id: 'pri-his-slide',
    category: '역대교장',
    label: '역대교장 tyA (슬라이드형)',
    desc: 'Swiper 슬라이드 + 약력보기 팝업',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const rows = extractPrincipalRows(src);
      repeatListItems(tpl.querySelector('.swiper-wrapper'), rows, (slide, row) => {
        fillOrderNameTerm(slide, row);
        const link = slide.querySelector('.btn-view');
        if (link) link.removeAttribute('href');
      }, ':scope > .swiper-slide');
      return tpl.body.innerHTML;
    },
    code: `<div class="pri-his tyA slide">
  <div class="history-header">
    <img src="/common/images/sub_com/pri_history_ico1.png" alt="" class="obj1">
    <p class="txt">학교를 빛내주신 <strong class="col">역대교장</strong>을 <strong>소개</strong>드립니다.</p>
    <img src="/common/images/sub_com/pri_history_ico2.png" alt="" class="obj2">
  </div>

  <div class="list-wrap">
    <div class="control">
      <button class="btn-prev"><span class="hid">역대교장 슬라이드 이전으로</span><i class="ri-arrow-left-s-line" aria-hidden="true"></i></button>
      <button class="btn-next"><span class="hid">역대교장 슬라이드 다음으로</span><i class="ri-arrow-right-s-line" aria-hidden="true"></i></button>
    </div>

    <div class="swiper priHisSwiper">
      <div class="swiper-wrapper">
        <div class="swiper-slide"><div class="card">
          <div class="inner">
            <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
            <div class="info">
              <span class="order">제 <strong>01</strong> 대</span>
              <p><strong>홍길동</strong> 교장</p>
              <div class="term"><strong>재임기간</strong> 2023.03.01. ~ 현재</div>
            </div>
            <p class="bg" aria-hidden="true"></p>
          </div>
          <a href="" class="btn-view">약력보기</a>
        </div></div>
        <div class="swiper-slide"><div class="card">
          <div class="inner">
            <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
            <div class="info">
              <span class="order">제 <strong>02</strong> 대</span>
              <p><strong>홍길동</strong> 교장</p>
              <div class="term"><strong>재임기간</strong> 2023.03.01. ~ 현재</div>
            </div>
            <p class="bg" aria-hidden="true"></p>
          </div>
          <a href="" class="btn-view">약력보기</a>
        </div></div>
        <div class="swiper-slide"><div class="card">
          <div class="inner">
            <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
            <div class="info">
              <span class="order">제 <strong>03</strong> 대</span>
              <p><strong>홍길동</strong> 교장</p>
              <div class="term"><strong>재임기간</strong> 2023.03.01. ~ 현재</div>
            </div>
            <p class="bg" aria-hidden="true"></p>
          </div>
          <a href="" class="btn-view">약력보기</a>
        </div></div>
        <div class="swiper-slide"><div class="card">
          <div class="inner">
            <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
            <div class="info">
              <span class="order">제 <strong>04</strong> 대</span>
              <p><strong>홍길동</strong> 교장</p>
              <div class="term"><strong>재임기간</strong> 2023.03.01. ~ 현재</div>
            </div>
            <p class="bg" aria-hidden="true"></p>
          </div>
          <a href="" class="btn-view">약력보기</a>
        </div></div>
        <div class="swiper-slide"><div class="card">
          <div class="inner">
            <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
            <div class="info">
              <span class="order">제 <strong>05</strong> 대</span>
              <p><strong>홍길동</strong> 교장</p>
              <div class="term"><strong>재임기간</strong> 2023.03.01. ~ 현재</div>
            </div>
            <p class="bg" aria-hidden="true"></p>
          </div>
          <a href="" class="btn-view">약력보기</a>
        </div></div>
        <div class="swiper-slide"><div class="card">
          <div class="inner">
            <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
            <div class="info">
              <span class="order">제 <strong>06</strong> 대</span>
              <p><strong>홍길동</strong> 교장</p>
              <div class="term"><strong>재임기간</strong> 2023.03.01. ~ 현재</div>
            </div>
            <p class="bg" aria-hidden="true"></p>
          </div>
          <a href="" class="btn-view">약력보기</a>
        </div></div>
      </div>
    </div>
  </div>
</div>

<!-- 약력보기 팝업 -->
<div class="pri-his tyA popup" id="preHisPopup" role="dialog" aria-modal="true" aria-hidden="true" tabindex="-1">
  <div class="popup-wrap">
    <div class="info-wrap">
      <p class="img"><img src="/common/images/sub_com/pri_history_A_temp.png" alt=""></p>
      <div class="info">
        <span class="order">제 <strong>01</strong> 대</span>
        <p><strong>홍길동</strong> 교장</p>
        <div class="term">
          <strong>재임기간</strong>
          2023.03.01. ~ 현재
        </div>
      </div>
    </div>
    <div class="list-wrap" tabindex="0">
      <h4 class="tit-st unit">학력</h4>
      <ul>
        <li><strong>1982</strong>
          <p>○○대학교 ○○학과 졸업</p>
        </li>
      </ul>
      <h4 class="tit-st unit">주요 업적</h4>
      <ul>
        <li><strong>1999</strong><p>주요 업적 내용</p></li>
        <li><strong>2000</strong><p>주요 업적 내용</p></li>
      </ul>
    </div>
    <p class="bg" aria-hidden="true"></p>
    <button class="btn-close"><span class="hid">약력보기 팝업 닫기</span><i class="ri-close-line" aria-hidden="true"></i></button>
  </div>
</div>`,
  },
  {
    id: 'pri-his-tyB',
    category: '역대교장',
    label: '역대교장 tyB',
    desc: '인라인 펼침 상세 + 사진 그리드',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const rows = extractPrincipalRows(src);
      repeatListItems(tpl.querySelector('.pri-his.tyB .list-wrap > ul'), rows, (li, row) => {
        const order = `제 ${padOrder(row.order)}대 교장`;
        const infoSpan = li.querySelector('.info span');
        if (infoSpan) infoSpan.textContent = order;
        const infoStrong = li.querySelector('.info strong');
        if (infoStrong) infoStrong.textContent = row.name || '홍길동';
        const infoP = li.querySelector('.info p');
        if (infoP) infoP.textContent = row.term || '재임기간 정보 없음';

        const dt = li.querySelector('.detail-data dl.pri dt');
        if (dt) dt.textContent = order;
        const dds = li.querySelectorAll('.detail-data dl.pri dd');
        if (dds[0]) { dds[0].innerHTML = ''; const strong = document.createElement('strong'); strong.textContent = row.name || '홍길동'; dds[0].appendChild(strong); }
        if (dds[1]) dds[1].textContent = `재임기간 : ${row.term || '정보 없음'}`;
      });
      return tpl.body.innerHTML;
    },
    code: `<div class="pri-his tyB">
  <div class="list-wrap container">
    <ul>
      <li>
        <button class="btn-item" role="region" aria-expanded="false">
          <p class="img"><img src="/common/images/sub_com/pri_history_B_temp.png" alt=""></p>
          <div class="info">
            <span>제 01대 교장</span>
            <strong>홍길동</strong>
            <p>2023.03.01. ~ 현재</p>
          </div>
        </button>
        <div class="detail-data">
          <dl class="pri">
            <dt>제 01대 교장</dt>
            <dd><strong>홍길동</strong></dd>
            <dd>재임기간 : 2023.03.01. ~ 현재</dd>
          </dl>
          <dl class="his">
            <dt>학력</dt>
            <dd>
              <ul>
                <li>○○대학교 ○○학과 졸업</li>
                <li>○○대학원 ○○학과 졸업</li>
              </ul>
            </dd>
          </dl>
          <dl class="his">
            <dt>주요 업적</dt>
            <dd>
              <ul>
                <li>주요 업적 내용</li>
                <li>주요 업적 내용</li>
              </ul>
            </dd>
          </dl>
        </div>
      </li>
      <li>
        <button class="btn-item" role="region" aria-expanded="false">
          <p class="img"><img src="/common/images/sub_com/pri_history_B_temp.png" alt=""></p>
          <div class="info">
            <span>제 02대 교장</span>
            <strong>홍길동</strong>
            <p>2023.03.01. ~ 현재</p>
          </div>
        </button>
        <div class="detail-data">
          <dl class="pri">
            <dt>제 02대 교장</dt>
            <dd><strong>홍길동</strong></dd>
            <dd>재임기간 : 2023.03.01. ~ 현재</dd>
          </dl>
          <dl class="his">
            <dt>학력</dt>
            <dd>
              <ul>
                <li>○○대학교 ○○학과 졸업</li>
                <li>○○대학원 ○○학과 졸업</li>
              </ul>
            </dd>
          </dl>
          <dl class="his">
            <dt>주요 업적</dt>
            <dd>
              <ul>
                <li>주요 업적 내용</li>
                <li>주요 업적 내용</li>
              </ul>
            </dd>
          </dl>
        </div>
      </li>
      <li>
        <button class="btn-item" role="region" aria-expanded="false">
          <p class="img"><img src="/common/images/sub_com/pri_history_B_temp.png" alt=""></p>
          <div class="info">
            <span>제 03대 교장</span>
            <strong>홍길동</strong>
            <p>2023.03.01. ~ 현재</p>
          </div>
        </button>
        <div class="detail-data">
          <dl class="pri">
            <dt>제 03대 교장</dt>
            <dd><strong>홍길동</strong></dd>
            <dd>재임기간 : 2023.03.01. ~ 현재</dd>
          </dl>
          <dl class="his">
            <dt>학력</dt>
            <dd>
              <ul>
                <li>○○대학교 ○○학과 졸업</li>
                <li>○○대학원 ○○학과 졸업</li>
              </ul>
            </dd>
          </dl>
          <dl class="his">
            <dt>주요 업적</dt>
            <dd>
              <ul>
                <li>주요 업적 내용</li>
                <li>주요 업적 내용</li>
              </ul>
            </dd>
          </dl>
        </div>
      </li>
      <li>
        <button class="btn-item" role="region" aria-expanded="false">
          <p class="img"><img src="/common/images/sub_com/pri_history_B_temp.png" alt=""></p>
          <div class="info">
            <span>제 04대 교장</span>
            <strong>홍길동</strong>
            <p>2023.03.01. ~ 현재</p>
          </div>
        </button>
        <div class="detail-data">
          <dl class="pri">
            <dt>제 04대 교장</dt>
            <dd><strong>홍길동</strong></dd>
            <dd>재임기간 : 2023.03.01. ~ 현재</dd>
          </dl>
          <dl class="his">
            <dt>학력</dt>
            <dd>
              <ul>
                <li>○○대학교 ○○학과 졸업</li>
                <li>○○대학원 ○○학과 졸업</li>
              </ul>
            </dd>
          </dl>
          <dl class="his">
            <dt>주요 업적</dt>
            <dd>
              <ul>
                <li>주요 업적 내용</li>
                <li>주요 업적 내용</li>
              </ul>
            </dd>
          </dl>
        </div>
      </li>
    </ul>
  </div>
</div>`,
  },
  {
    id: 'pri-his-tyC',
    category: '역대교장',
    label: '역대교장 tyC',
    desc: '간단 카드형 (이미지/업적 선택)',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const rows = extractPrincipalRows(src);
      repeatListItems(tpl.querySelector('.pri-his.tyC .list-wrap > ul'), rows, fillOrderNameTerm);
      return tpl.body.innerHTML;
    },
    code: `<div class="pri-his tyC"><!-- 이미지 있을 시 'ty-img'-->
  <div class="list-wrap">
    <ul>
      <li>
        <div class="info-wrap">
          <!-- 이미지 있을 시 -->
          <!-- <p class="img"><img src="/common/images/sub_com/pri_history_C_temp.png" alt=""></p> -->
          <div class="inr">
            <span class="order">제 <strong>01</strong> 대</span>
            <p><strong>홍길동</strong> 교장</p>
            <div class="term"><strong>재임기간</strong> 2023.03.01. ~ 현재</div>
          </div>
        </div>
        <!-- 이력 있을 시 -->
        <!-- <div class="his-wrap"><h5>주요업적</h5><p class="bu-st3">주요 업적 내용<br>주요 업적 내용</p></div> -->
      </li>
      <li>
        <div class="info-wrap">
          <!-- 이미지 있을 시 -->
          <!-- <p class="img"><img src="/common/images/sub_com/pri_history_C_temp.png" alt=""></p> -->
          <div class="inr">
            <span class="order">제 <strong>02</strong> 대</span>
            <p><strong>홍길동</strong> 교장</p>
            <div class="term"><strong>재임기간</strong> 2023.03.01. ~ 현재</div>
          </div>
        </div>
        <!-- 이력 있을 시 -->
        <!-- <div class="his-wrap"><h5>주요업적</h5><p class="bu-st3">주요 업적 내용<br>주요 업적 내용</p></div> -->
      </li>
      <li>
        <div class="info-wrap">
          <!-- 이미지 있을 시 -->
          <!-- <p class="img"><img src="/common/images/sub_com/pri_history_C_temp.png" alt=""></p> -->
          <div class="inr">
            <span class="order">제 <strong>03</strong> 대</span>
            <p><strong>홍길동</strong> 교장</p>
            <div class="term"><strong>재임기간</strong> 2023.03.01. ~ 현재</div>
          </div>
        </div>
        <!-- 이력 있을 시 -->
        <!-- <div class="his-wrap"><h5>주요업적</h5><p class="bu-st3">주요 업적 내용<br>주요 업적 내용</p></div> -->
      </li>
      <li>
        <div class="info-wrap">
          <!-- 이미지 있을 시 -->
          <!-- <p class="img"><img src="/common/images/sub_com/pri_history_C_temp.png" alt=""></p> -->
          <div class="inr">
            <span class="order">제 <strong>04</strong> 대</span>
            <p><strong>홍길동</strong> 교장</p>
            <div class="term"><strong>재임기간</strong> 2023.03.01. ~ 현재</div>
          </div>
        </div>
        <!-- 이력 있을 시 -->
        <!-- <div class="his-wrap"><h5>주요업적</h5><p class="bu-st3">주요 업적 내용<br>주요 업적 내용</p></div> -->
      </li>
      <li>
        <div class="info-wrap">
          <!-- 이미지 있을 시 -->
          <!-- <p class="img"><img src="/common/images/sub_com/pri_history_C_temp.png" alt=""></p> -->
          <div class="inr">
            <span class="order">제 <strong>05</strong> 대</span>
            <p><strong>홍길동</strong> 교장</p>
            <div class="term"><strong>재임기간</strong> 2023.03.01. ~ 현재</div>
          </div>
        </div>
        <!-- 이력 있을 시 -->
        <!-- <div class="his-wrap"><h5>주요업적</h5><p class="bu-st3">주요 업적 내용<br>주요 업적 내용</p></div> -->
      </li>
      <li>
        <div class="info-wrap">
          <!-- 이미지 있을 시 -->
          <!-- <p class="img"><img src="/common/images/sub_com/pri_history_C_temp.png" alt=""></p> -->
          <div class="inr">
            <span class="order">제 <strong>06</strong> 대</span>
            <p><strong>홍길동</strong> 교장</p>
            <div class="term"><strong>재임기간</strong> 2023.03.01. ~ 현재</div>
          </div>
        </div>
        <!-- 이력 있을 시 -->
        <!-- <div class="his-wrap"><h5>주요업적</h5><p class="bu-st3">주요 업적 내용<br>주요 업적 내용</p></div> -->
      </li>
    </ul>
  </div>
</div>`,
  },
]
