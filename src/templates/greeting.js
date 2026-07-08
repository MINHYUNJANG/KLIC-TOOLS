import { parseMarkup, extractBoxLines, mapBodyText, mapSign } from '../utils/templateMapping.js';

// 인사말 리드 텍스트 컨테이너 탐지
// .tit 단독은 페이지 제목 heading과 혼동 위험 → <p> 자식이 있을 때만 사용
function findLeadBox(src) {
  const explicit =
    src.querySelector('.box') ||
    src.querySelector('.greeting_top .tit') ||
    src.querySelector('.greeting_top') ||
    src.querySelector('[class*="greeting"] .lead, [class*="greeting"] .tit_box') ||
    src.querySelector('[class*="lead-txt"], [class*="lead_txt"], [class*="lead_text"]');
  if (explicit) return explicit;

  // .tit 은 <p> 자식이 있을 때만 리드 컨테이너로 사용
  const tit = src.querySelector('.tit');
  if (tit?.querySelector('p')) return tit;

  // 첫 번째 <strong> 포함 짧은 p → 슬로건·리드 패턴 (길이 100자 미만)
  const strongP = Array.from(src.querySelectorAll('p'))
    .find(p => p.querySelector('strong') && p.textContent.trim().length < 100);
  return strongP || null;
}

// tyC-01 / tyC-02 공용: lead-txt는 <span>Welcome</span><h4>...</h4> 구조라
// h4만 교체해 span 장식은 유지한다.
function applyGreetingTyCMapping(sourceMarkup, templateCode) {
  const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
  const srcBox = findLeadBox(src);
  const lines = extractBoxLines(srcBox);
  const tplLeadH4 = tpl.querySelector('.greeting.tyC .lead-txt h4');
  if (tplLeadH4) {
    const joined = lines.length > 0
      ? lines.join('<br>')
      : srcBox ? (srcBox.tagName === 'P' ? srcBox.innerHTML.trim() : srcBox.textContent.trim()) : '';
    if (joined) tplLeadH4.innerHTML = joined;
  }
  const boxPs = srcBox ? new Set([srcBox, ...Array.from(srcBox.querySelectorAll('p, div'))]) : new Set();
  mapBodyText(src, tpl, boxPs);
  mapSign(src, tpl);
  return tpl.body.innerHTML;
}

export default [
  {
    id: 'greeting-tyA',
    category: '인사말',
    label: '인사말 tyA',
    desc: '슬로건 리드 + 스크롤 배경텍스트형',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const srcBox = findLeadBox(src);
      const lines = extractBoxLines(srcBox);
      const joined = lines.length > 0
        ? lines.join('<br>')
        : srcBox ? (srcBox.tagName === 'P' ? srcBox.innerHTML.trim() : srcBox.textContent.trim()) : '';
      const tplLeadP = tpl.querySelector('.lead-wrap .inner > p');
      if (tplLeadP && joined) tplLeadP.innerHTML = joined;
      const boxPs = srcBox ? new Set([srcBox, ...Array.from(srcBox.querySelectorAll('p, div'))]) : new Set();
      mapBodyText(src, tpl, boxPs);
      mapSign(src, tpl);
      return tpl.body.innerHTML;
    },
    code: `<div class="greeting tyA"><!-- 이미지 있을 시 'ty-img' 추가 -->
  <div class="lead-wrap">
    <!-- 이미지 있을 시 -->
    <!-- <div class="img"><p><img src="/common/images/sub_com/greeting_A_temp.png" alt="기관장 사진"></p></div> -->

    <div class="inner">
      <!-- lead text -->
      <p>더 <strong>강한 기관</strong>으로 <br>더 <strong>빛나는 미래</strong>를 향해</p>

      <!-- background text -->
      <div class="bg-text">
        <div class="track">
          <!-- 같은 문구 2번씩 반복 !! -->
          <p>Organization Name Organization Name</p>
          <p>Organization Name Organization Name</p>
        </div>
      </div>
    </div>
  </div>
  <div class="txt-wrap">
    <div class="txt">
      <p>안녕하십니까.<br>○○기관 홈페이지를 방문해 주셔서 감사합니다.</p>
      <p>우리 기관은 ···</p>
      <p>앞으로도 변함없는 관심과 성원을 부탁드립니다.</p>
      <p>감사합니다.</p>
    </div>
    <div class="sign">○○기관장 <strong>홍 길 동</strong></div>
  </div>
</div>`,
  },
  {
    id: 'greeting-tyB',
    category: '인사말',
    label: '인사말 tyB',
    desc: '영문 슬로건 리드 + 텍스트형 (이미지 선택)',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const srcBox = findLeadBox(src);
      const lines = extractBoxLines(srcBox);
      const joined = lines.length > 0
        ? lines.join('<br>')
        : srcBox ? (srcBox.tagName === 'P' ? srcBox.innerHTML.trim() : srcBox.textContent.trim()) : '';
      const tplLeadP = tpl.querySelector('.greeting.tyB .lead-txt > p');
      if (tplLeadP && joined) tplLeadP.innerHTML = joined;
      const boxPs = srcBox ? new Set([srcBox, ...Array.from(srcBox.querySelectorAll('p, div'))]) : new Set();
      mapBodyText(src, tpl, boxPs);
      mapSign(src, tpl);
      return tpl.body.innerHTML;
    },
    code: `<div class="greeting tyB"><!-- 이미지 있을 시 'ty-img' 추가 -->
  <div class="container">
    <!-- 이미지 있을 시 -->
    <!-- <div class="img-wrap">
      <div class="img">
        <p><img src="/common/images/sub_com/greeting_B_temp.png" alt="기관장 사진"></p>
      </div>
      <div class="sign">○○기관장 <strong>홍 길 동</strong></div>
    </div> -->

    <div class="inner">
      <div class="lead-wrap">
        <!-- lead text -->
        <div class="lead-txt">
          <h4>Great Organization!</h4>
          <p>더 강한 기관으로 더 빛나는 미래를 향해</p>
        </div>

        <!-- sign : 이미지 없을 시에만 사용 -->
        <div class="sign">○○기관장 <strong>홍 길 동</strong></div>
      </div>

      <div class="txt-wrap">
        <div class="txt">
          <p>안녕하십니까.<br>○○기관 홈페이지를 방문해 주셔서 감사합니다.</p>
          <p>우리 기관은 ···</p>
          <p>앞으로도 변함없는 관심과 성원을 부탁드립니다.</p>
          <p>감사합니다.</p>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'greeting-tyC-01',
    category: '인사말',
    label: '인사말 tyC (단일 섹션)',
    desc: '사진 + 리드문구 + 본문 한 블록형',
    applyMapping: applyGreetingTyCMapping,
    code: `<div class="greeting tyC wideCnt">
  <div class="container">
    <div class="obj">
      <img src="/common/images/sub_com/greeting_C_img.png" alt="기관장 홍길동 사진">
    </div>

    <div class="inner">
      <div class="lead-wrap">
        <!-- lead text -->
        <div class="lead-txt">
          <span>Welcome</span>
          <h4>안녕하십니까 ? <br><strong>○○기관장 홍길동</strong>입니다.</h4>
        </div>
      </div>
      <div class="txt-wrap">
        <div class="txt">
          <p>안녕하십니까.<br>○○기관 홈페이지를 방문해 주셔서 감사합니다.</p>
          <p>우리 기관은 ···</p>
          <p>앞으로도 변함없는 관심과 성원을 부탁드립니다.</p>
          <p>감사합니다.</p>
        </div>

        <div class="sign">○○기관장 <strong>홍 길 동</strong></div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'greeting-tyC-02',
    category: '인사말',
    label: '인사말 tyC (두 섹션 + 핵심가치)',
    desc: '사진 + 리드문구 섹션, 핵심가치 목록 + 본문 섹션의 2단 구성',
    applyMapping: applyGreetingTyCMapping,
    code: `<div class="greeting tyC ty-img wideCnt">
  <div class="container">
    <div class="obj">
      <img src="/common/images/sub_com/greeting_C_img.png" alt="기관장 홍길동 사진">
    </div>

    <div class="inner">
      <div class="lead-wrap">
        <!-- lead text -->
        <div class="lead-txt">
          <span>Welcome</span>
          <h4>안녕하십니까 ? <br><strong>○○기관장 홍길동</strong>입니다.</h4>
        </div>
      </div>
    </div>
  </div>
  <div class="container second">
    <div class="obj">
      <img src="/common/images/sub_com/greeting_C_img_02.png" alt="핵심 가치 이미지">
    </div>
    <div class="inner">
      <span class="s-lead-txt">우리가 추구하는 자세</span>
      <ul>
        <li><strong>하나</strong> 항목 1</li>
        <li><strong>하나</strong> 항목 2</li>
        <li><strong>하나</strong> 항목 3</li>
        <li><strong>하나</strong> 항목 4</li>
      </ul>
      <div class="txt-wrap">
        <div class="txt">
          <p>안녕하십니까.<br>○○기관 홈페이지를 방문해 주셔서 감사합니다.</p>
          <p>우리 기관은 ···</p>
          <p>앞으로도 변함없는 관심과 성원을 부탁드립니다.</p>
          <p>감사합니다.</p>
        </div>

        <div class="sign">○○기관장 <strong>홍 길 동</strong></div>
      </div>
    </div>
  </div>
</div>`,
  },
]
