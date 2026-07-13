/* ── 콘텐츠 파일 관리 팝업 공용 모듈 ──
   모달 표시/숨김, 팝업 iframe 로딩, postMessage 수신을 담당한다.
   선택 결과를 블록 데이터에 반영하는 로직은 호출부(각 빌더)의 콜백에서 처리한다.

   사용법 1) 직접 호출 — 저장 시점/대상을 직접 제어해야 할 때:
     document.getElementById('내블록의-파일선택-버튼')?.addEventListener('click', () => {
       CntntsFileManager.open('image', ({ fileName, fileSrc, fileUrl }) => {
         // 선택 결과를 블록 데이터에 반영
       });
     });

   사용법 2) id="imgFileUpOpen*" 공용 트리거 — 클릭→팝업→src 반영까지는 이 모듈이
   대신 처리해준다. 각 빌더는 'imgFileUpApplied' 이벤트만 받아 자기 state에
   저장하면 된다. id는 문서 내 유일해야 하므로, 한 화면에 트리거가 여러 개면
   "imgFileUpOpen_01"처럼 접미사를 붙여 구분한다(아래 셀렉터가 "imgFileUpOpen로
   시작하는 id"를 전부 찾는다):
     someImgWrapEl.id = 'imgFileUpOpen_01';
     someImgWrapEl.addEventListener('imgFileUpApplied', (e) => {
       const { fileName, fileSrc, fileUrl } = e.detail;
       // 선택 결과를 블록 데이터에 저장 (pushHistory/render 등은 빌더마다 다름)
     });
   렌더링으로 DOM이 새로 생기는 빌더는 그 시점에 CntntsFileManager.wireImgTriggers()
   (또는 새로 생긴 영역만 골라 wireImgTriggers(container))를 다시 호출해야
   새로 생긴 트리거에도 클릭이 붙는다 — 페이지 최초 로드 시점 것만 자동으로 붙는다.

   전제조건: 이 모듈을 사용하는 페이지에는 아래 모달 마크업이 포함되어 있어야 한다.
     /WEB-INF/jsp/nfu/co/cf/cntntsFileModalInclude.jsp */
(function (global) {
	'use strict';

	var pendingCallback = null;

	function getSysId() {
		try {
			var p = global.parent;
			if (p && p !== global) {
				var el = p.document.querySelector('[name="sysId"]');
				if (el) return el.value || '';
			}
		} catch (e) { /* cross-origin 무시 */ }
		return '';
	}

	function getModalEls() {
		return {
			modal: document.getElementById('cntntsFileModal'),
			frame: document.getElementById('cntntsFileFrame')
		};
	}

	function open(mode, onSelect) {
		var els = getModalEls();
		if (!els.modal || !els.frame) return;
		pendingCallback = typeof onSelect === 'function' ? onSelect : null;
		var url = '/apple/cf/cntnts/cntntsFilePopup.do'
			+ '?sysId=' + encodeURIComponent(getSysId())
			+ '&mode='  + encodeURIComponent(mode);
		els.frame.src = url;
		els.modal.style.display = '';
	}

	function close() {
		pendingCallback = null;
		var els = getModalEls();
		if (els.modal) els.modal.style.display = 'none';
		if (els.frame) els.frame.src = '';
	}

	function wireModalChrome() {
		var els = getModalEls();
		document.getElementById('cntntsFileModalClose')?.addEventListener('click', close);
		els.modal?.addEventListener('click', function (e) {
			if (e.target === els.modal) close();
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', wireModalChrome);
	} else {
		wireModalChrome();
	}

	window.addEventListener('message', function (e) {
		if (!e.data || e.data.type !== 'cntntsFileSelected') return;
		var cb = pendingCallback;
		close();
		if (cb) cb(e.data);
	});

	/* ── #imgFileUpOpen 공용 트리거 ──
	   빌더마다 따로 클릭 핸들러를 만들 필요 없이, id가 "imgFileUpOpen"으로
	   시작하는 요소를 클릭하면 콘텐츠 파일 관리 팝업이 열리고, 선택한 파일이
	   그 요소 자신(또는 내부의 <img>)의 src에 바로 반영된다.
	   "저장"은 빌더마다 방식이 달라 여기서 처리하지 않는다 — 대신 반영이 끝나면
	   트리거 요소에서 'imgFileUpApplied' 커스텀 이벤트를 발생시키므로(bubbles),
	   각 빌더는 그 이벤트를 받아 자기 state에 저장하면 된다.

	   id는 문서 내에서 유일해야 하므로, 한 페이지에 트리거가 여러 개 필요하면
	   (예: 블록/항목마다 하나씩) "imgFileUpOpen_01", "imgFileUpOpen_02"처럼
	   접미사를 붙여 유일하게 만들면 된다 — 아래 셀렉터가 "imgFileUpOpen로
	   시작하는 id"를 모두 찾으므로 숫자만 서로 겹치지 않게 붙이면 된다. */
	function resolveImg(trigger) {
		if (trigger.tagName === 'IMG') return trigger;
		return trigger.querySelector('img');
	}

	function applyImageToTrigger(trigger, data) {
		var img = resolveImg(trigger);
		if (!img) {
			img = document.createElement('img');
			trigger.appendChild(img);
		}
		img.src = data.fileSrc;
		if (!img.getAttribute('alt') && data.fileName) img.setAttribute('alt', data.fileName);
		trigger.dispatchEvent(new CustomEvent('imgFileUpApplied', {
			bubbles: true,
			detail: { img: img, fileName: data.fileName, fileSrc: data.fileSrc, fileUrl: data.fileUrl }
		}));
	}

	function wireImgTriggers(root) {
		(root || document).querySelectorAll('[id^="imgFileUpOpen"]').forEach(function (trigger) {
			if (trigger._imgFileUpOpenBound) return;
			trigger._imgFileUpOpenBound = true;
			trigger.addEventListener('click', function (event) {
				event.preventDefault();
				open('image', function (data) { applyImageToTrigger(trigger, data); });
			});
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () { wireImgTriggers(); });
	} else {
		wireImgTriggers();
	}

	global.CntntsFileManager = { open: open, close: close, wireImgTriggers: wireImgTriggers };
})(window);
