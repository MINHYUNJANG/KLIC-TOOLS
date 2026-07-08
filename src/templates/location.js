import { parseMarkup } from '../utils/templateMapping.js';

// 오시는길 원본은 사이트마다 구조가 제각각(다음/카카오 로드맵 스크립트 + dt/dd, 또는
// h4 라벨 + h6/텍스트)이라, 주소/전화를 라벨 기준으로 먼저 찾고 없으면 본문 텍스트에서
// 주소·전화 패턴을 직접 탐색한다. 버스/지하철/자가용 안내처럼 원본에 거의 없는 항목은
// 템플릿 기본 문구를 그대로 둔다.
function extractAddressPhone(src) {
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  let address = '';
  let phone = '';

  Array.from(src.querySelectorAll('dt')).forEach(dt => {
    const label = norm(dt.textContent);
    const dd = dt.nextElementSibling;
    if (!dd || dd.tagName !== 'DD') return;
    if (/주소/.test(label) && !address) address = norm(dd.textContent);
    if (/전화|연락처|tel/i.test(label) && !phone) phone = norm(dd.textContent);
  });

  Array.from(src.querySelectorAll('h1, h2, h3, h4, h5, h6')).forEach(h => {
    const label = norm(h.textContent);
    const next = h.nextElementSibling;
    if (!next) return;
    if (/주소/.test(label) && !address) address = norm(next.textContent);
    if (/전화|연락처|tel/i.test(label) && !phone) phone = norm(next.textContent);
  });

  const bodyText = src.body ? src.body.textContent : '';
  if (!address) {
    const match = bodyText.match(/[가-힣]+(?:광역시|특별시|도)\s?[가-힣0-9()\s,.-]{3,40}(?:로|길|동)\s?\d+[^\n<]{0,20}/);
    if (match) address = norm(match[0]);
  }
  if (!phone) {
    const match = bodyText.match(/0\d{1,2}[-.\s)]\d{3,4}[-.\s]\d{4}/);
    if (match) phone = norm(match[0]);
  }

  return { address, phone };
}

export default [
  {
    id: 'location-tyA',
    category: '오시는길',
    label: '오시는길 tyA',
    desc: '지도 + 주소/버스/지하철/자가용 안내',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const { address } = extractAddressPhone(src);
      const addrP = tpl.querySelector('.roadmap.tyA .box.address .adrsBox p');
      if (addrP && address) addrP.textContent = address;
      return tpl.body.innerHTML;
    },
    code: `<div class="roadmap tyA wideCnt">
  <div class="container">
    <h3 class="title"><span>정직·사랑·꿈</span>을 가꾸는 <span>우리 학교로</span> <span>안내</span>합니다.</h3>
    <div class="map-wrap">
      <div class="map-box">
        <img src="/common/images/sub_com/map.png" alt="">
      </div>
    </div>
    <div class="map-list">
      <div class="box address">
        <span>주소</span>
        <div class="adrsBox">
          <p>[61987] 광주광역시 서구 화운로 93</p>
          <div class="btns">
            <a href="" class="btn-st kakao"><img src="/common/images/sub_com/icon_kakaomap.png" alt="">카카오맵 길찾기</a>
            <a href="" class="btn-st naver"><img src="/common/images/sub_com/icon_naver.png" alt="">네이버 지도 길찾기</a>
          </div>
        </div>
      </div>
      <div class="box bus">
        <span>버스</span>
        <ul>
          <li><span>주변버스</span>
            <ul class="bus-list">
              <li><em class="org">지선</em>123, 456</li>
              <li><em class="grn">순환</em>78, 90, 100</li>
            </ul>
          </li>
          <li><span>주변정류장</span>
            <ul class="stop-list">
              <li><em>1</em>우리 학교 정류장</li>
            </ul>
          </li>
        </ul>
      </div>
      <div class="box subway">
        <span>지하철</span>
        <ul>
          <li><span>1호선 이용</span><em class="org">1</em>인근역 3번 출구 도보 5분</li>
        </ul>
      </div>
      <div class="box car">
        <span>자가용</span>
        <ul>
          <li><span>내비게이션 이용</span>학교명 또는 주소로 검색하여 이용해 주세요.</li>
        </ul>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'location-tyB',
    category: '오시는길',
    label: '오시는길 tyB',
    desc: '지도 + 주소/전화 강조형',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const { address, phone } = extractAddressPhone(src);
      const titleH3 = tpl.querySelector('.roadmap.tyB .info h3.title');
      if (titleH3 && address) titleH3.textContent = address;
      const numberP = tpl.querySelector('.roadmap.tyB .info p.number');
      if (numberP && phone) {
        const icon = numberP.querySelector('i');
        numberP.textContent = ' ' + phone;
        if (icon) numberP.insertBefore(icon, numberP.firstChild);
      }
      return tpl.body.innerHTML;
    },
    code: `<div class="roadmap tyB wideCnt">
  <div class="container">
    <div class="map-wrap">
      <div class="map-box">
        <img src="/common/images/sub_com/map.png" alt="">
      </div>
      <div class="info">
        <p>우리 학교 오시는길</p>
        <h3 class="title">[61987] 광주광역시 서구 화운로 93</h3>
        <div class="btns">
          <a href="" class="btn-st kakao"><img src="/common/images/sub_com/icon_kakaomap.png" alt="">카카오맵 길찾기</a>
          <a href="" class="btn-st naver"><img src="/common/images/sub_com/icon_naver.png" alt="">네이버 지도 길찾기</a>
        </div>
        <p class="number"><i class="ri-phone-fill" aria-hidden="true"></i> 012-345-6789</p>
      </div>
    </div>
    <div class="map-list">
      <div class="box bus">
        <span>버스</span>
        <ul>
          <li><span>주변버스</span>
            <ul class="bus-list">
              <li><em class="org">지선</em>123, 456</li>
            </ul>
          </li>
        </ul>
      </div>
      <div class="box subway">
        <span>지하철</span>
        <ul>
          <li><span>1호선 이용</span><em class="org">1</em>인근역 3번 출구 도보 5분</li>
        </ul>
      </div>
      <div class="box car">
        <span>자가용</span>
        <ul>
          <li><span>내비게이션 이용</span>학교명 또는 주소로 검색하여 이용해 주세요.</li>
        </ul>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'location-tyC',
    category: '오시는길',
    label: '오시는길 tyC',
    desc: '아이콘 리스트형 (주소/전화/팩스)',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const { address, phone } = extractAddressPhone(src);
      const items = tpl.querySelectorAll('.roadmap.tyC .info-list li p.txt');
      if (items[0] && address) items[0].innerHTML = address;
      if (items[1] && phone) items[1].textContent = phone;
      return tpl.body.innerHTML;
    },
    code: `<div class="roadmap tyC">
  <div class="container">
    <div class="map-wrap">
      <div class="map-box">
        <img src="/common/images/sub_com/map.png" alt="">
        <div class="btns">
          <a href="" class="btn-st kakao"><img src="/common/images/sub_com/icon_kakaomap.png" alt="">카카오맵 길찾기</a>
          <a href="" class="btn-st naver"><img src="/common/images/sub_com/icon_naver.png" alt="">네이버 지도 길찾기</a>
        </div>
      </div>
      <div class="info">
        <ul class="info-list">
          <li>
            <img src="/common/images/sub_com/rdm_Ico01.png" alt="">
            <span>주소</span>
            <p class="txt">해당 영역은 주소가<br> 들어가는 영역입니다.</p>
          </li>
          <li>
            <img src="/common/images/sub_com/rdm_Ico02.png" alt="">
            <span>전화</span>
            <p class="txt">123-456-7890</p>
          </li>
          <li>
            <img src="/common/images/sub_com/rdm_Ico03.png" alt="">
            <span>팩스</span>
            <p class="txt">123-456-7891</p>
          </li>
        </ul>
      </div>
    </div>
    <div class="map-list">
      <h3><span>찾아 오시는 길</span>을 <br>안내합니다</h3>
      <div class="box bus">
        <div class="ico"><i class="ri-bus-line" aria-hidden="true"></i></div>
        <p><span>버스</span>로<br> 오시는 경우</p>
        <ul>
          <li><span>주변버스 :</span>
            <ul class="bus-list">
              <li><em class="org">지선</em>123, 456</li>
            </ul>
          </li>
        </ul>
      </div>
      <div class="box subway">
        <div class="ico"><i class="ri-subway-line" aria-hidden="true"></i></div>
        <p><span>지하철</span>로<br> 오시는 경우</p>
        <ul>
          <li><span>1호선 이용 :</span><em class="org">1</em>인근역 3번 출구 도보 5분</li>
        </ul>
      </div>
      <div class="box car">
        <div class="ico"><i class="ri-car-line" aria-hidden="true"></i></div>
        <p><span>자가용</span>로<br> 오시는 경우</p>
        <ul>
          <li><span>내비게이션 이용 :</span>학교명 또는 주소로 검색하여 이용해 주세요.</li>
        </ul>
      </div>
    </div>
  </div>
</div>`,
  },
]
