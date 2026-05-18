import { parseMarkup, extractBoxLines, mapBodyText, mapSign } from '../utils/templateMapping.js';

export default [
  {
    id: 'greeting-tyA',
    category: '인사말',
    label: '인사말 tyA',
    desc: '슬로건 리드 + 스크롤 배경텍스트형',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const srcBox = src.querySelector('.greeting .box');
      const lines = extractBoxLines(srcBox);
      const joined = lines.length > 0 ? lines.join('<br>') : (srcBox?.textContent.trim() || '');
      const tplLeadP = tpl.querySelector('.lead-wrap .inner > p');
      if (tplLeadP && joined) tplLeadP.innerHTML = joined;
      const boxPs = srcBox ? new Set(Array.from(srcBox.querySelectorAll('p'))) : new Set();
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
      const srcBox = src.querySelector('.greeting .box');
      const lines = extractBoxLines(srcBox);
      const joined = lines.length > 0 ? lines.join('<br>') : (srcBox?.textContent.trim() || '');
      const tplLeadP = tpl.querySelector('.greeting.tyB .lead-txt > p');
      if (tplLeadP && joined) tplLeadP.innerHTML = joined;
      const boxPs = srcBox ? new Set(Array.from(srcBox.querySelectorAll('p'))) : new Set();
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
    id: 'greeting-tyC',
    category: '인사말',
    label: '인사말 tyC',
    desc: '장식 오브젝트 + 리드문구 + 사진형',
    applyMapping(sourceMarkup, templateCode) {
      const { src, tpl } = parseMarkup(sourceMarkup, templateCode);
      const srcBox = src.querySelector('.greeting .box');
      const lines = extractBoxLines(srcBox);
      const tplLeadC = tpl.querySelector('.greeting.tyC .lead-txt');
      if (tplLeadC) {
        tplLeadC.innerHTML = lines.length > 0
          ? '\n' + lines.map(l => `<p>${l}</p>`).join('\n') + '\n'
          : srcBox ? `\n<p>${srcBox.textContent.trim()}</p>\n` : '';
      }
      const tplGreetingC = tpl.querySelector('.greeting.tyC');
      if (tplGreetingC && !src.querySelector('.greeting img')) {
        tplGreetingC.querySelector('.img')?.remove();
        tplGreetingC.classList.remove('ty-img');
      }
      const boxPs = srcBox ? new Set(Array.from(srcBox.querySelectorAll('p'))) : new Set();
      mapBodyText(src, tpl, boxPs);
      mapSign(src, tpl);
      return tpl.body.innerHTML;
    },
    code: `<div class="greeting tyC ty-img"><!-- 이미지 없을 시 'ty-img' 제거 -->
  <div class="container">
    <div class="obj">
      <p class="mask mask1"></p>
      <p class="mask mask2"></p>
      <p class="mask mask3"></p>
    </div>

    <div class="inner">
      <div class="lead-wrap">
        <!-- lead text -->
        <div class="lead-txt">
          <h4>안녕하십니까 ? <br><strong>○○기관장 홍길동</strong>입니다.</h4>
          <p>○○기관 홈페이지를 방문해 주셔서 환영합니다.</p>
        </div>

        <!-- 이미지 있을 시 -->
        <div class="img"><p><img src="/common/images/sub_com/greeting_C_temp.png" alt="기관장 홍길동 사진"></p></div>
      </div>
      <div class="txt-wrap">
        <div class="txt">
          <p>안녕하십니까.<br>○○기관 홈페이지를 방문해 주셔서 감사합니다.</p>
          <p>우리 기관은 ···</p>

          <h4 class="tit-st contents">우리가 추구하는 자세</h4>
          <ul class="bu-st1 list">
            <li>항목 1</li>
            <li>항목 2</li>
            <li>항목 3</li>
          </ul>

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
