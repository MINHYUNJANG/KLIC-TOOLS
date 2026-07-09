/* =============================================================
   sub_com.js
   sub 폴더 공통 스크립트 취합본
   ============================================================= */


/* -------------------------------------------------------------
   wideCnt | #subContent container 클래스 제거
   ------------------------------------------------------------- */
$(function () {
	if ($('.wideCnt').length) {
		$('#subContent').removeClass('container');
	}
});


/* -------------------------------------------------------------
   02_연혁A | historySwiper + timelineSwiper 스크롤 연동
   ------------------------------------------------------------- */
$(function () {
	if (!$('.historySwiper').length) return;
	if (document.body.classList.contains('tmpl2-builder-page')) return;

	let historySwiper = new Swiper(".historySwiper", {
		slidesPerView: 1,
		centeredSlides: true,
		spaceBetween: 40,
		speed: 600,
		allowTouchMove: false,
		slideToClickedSlide: true,
		breakpoints: {
			1025: {
				slidesPerView: 1,
				centeredSlides: false,
				allowTouchMove: true,
				spaceBetween: 0
			}
		}
	});

	let timelineSwiper = new Swiper(".timelineSwiper", {
		slidesPerView: 9,
		centeredSlides: true,
		slideToClickedSlide: true,
		speed: 600,
		breakpoints: {
			1025: {
				slidesPerView: 3
			}
		}
	});

	historySwiper.controller.control = timelineSwiper;
	timelineSwiper.controller.control = historySwiper;

	timelineSwiper.on("slideChange", function () {
		let index = timelineSwiper.realIndex;
		let year = $(".timelineSwiper .swiper-slide").eq(index).text();
		$(".year span em").text(year);
	});

	function setHistoryHeight() {
		let slideCount = $(".historySwiper .swiper-slide").length;
		let perSlide = window.innerHeight * 0.9;
		let totalHeight = slideCount * perSlide;
		$(".history").css("height", totalHeight + "px");
	}

	setHistoryHeight();

	$(window).on("resize", function () {
		setHistoryHeight();
		setScrollRange();
	});

	let historyStart;
	let historyEnd;

	function setScrollRange() {
		let $history = $(".history");
		historyStart = $history.offset().top;
		historyEnd = historyStart + $history.outerHeight() - $(window).height();
	}

	setScrollRange();

	$(window).on("scroll", function () {
		let scrollTop = $(window).scrollTop();
		if (scrollTop < historyStart || scrollTop > historyEnd) return;
		let progress = (scrollTop - historyStart) / (historyEnd - historyStart);
		progress = Math.max(0, Math.min(1, progress));
		let slideCount = historySwiper.slides.length - 1;
		let index = Math.round(progress * slideCount);
		historySwiper.slideTo(index);
	});

});


/* -------------------------------------------------------------
   02_연혁B | 스크롤 연동 연혁 네비게이션 (tyB)
   ------------------------------------------------------------- */
$(window).on('load', function () {
	if (!$('.history.tyB').length) return;

	const $win = $(window);
	const $sections = $('.history.tyB .list-wrap > .list[id]');
	const $title = $('.history.tyB .year-title');
	const $links = $('.history.tyB .year li > a');
	const $progress = $('.history.tyB .progress span');

	const btnCount = $links.length || 1;
	const basePercent = 100 / btnCount;

	let isClickScrolling = false;
	let clickTargetId = null;

	$('.history.tyB .year li > a').on('click', function (e) {
		e.preventDefault();
		const targetId = $(this).attr('data-target');
		const $target = $('#' + targetId);
		if (!$target.length) return;
		isClickScrolling = true;
		clickTargetId = targetId;
		$links.parent().removeClass('on');
		$(this).parent().addClass('on');
		$title.text($(this).text());
		const targetTop = $target.offset().top - 80;
		const maxScroll = $(document).height() - $win.height();
		const finalTop = Math.min(targetTop, maxScroll);
		$('html, body').stop().animate({ scrollTop: finalTop }, 500, function () {
			isClickScrolling = false;
			clickTargetId = null;
			update();
		});
	});

	let ticking = false;
	$win.on('scroll', function () {
		if (!ticking) {
			requestAnimationFrame(() => {
				update();
				ticking = false;
			});
			ticking = true;
		}
	});

	function update() {
		const scrollTop = $win.scrollTop();
		const winH = $win.height();
		let currentId = null;

		if (isClickScrolling && clickTargetId) {
			currentId = clickTargetId;
		} else {
			$sections.each(function () {
				const top = $(this).offset().top - 120;
				if (scrollTop >= top) {
					currentId = $(this).attr('id');
				}
			});
			if (!currentId && $sections.length) {
				currentId = $sections.first().attr('id');
			}
			if (scrollTop + winH >= $(document).height() - 5) {
				currentId = $sections.last().attr('id');
			}
		}

		$links.parent().removeClass('on');
		$links.each(function () {
			if ($(this).attr('data-target') == currentId) {
				$(this).parent().addClass('on');
				$title.text($(this).text());
			}
		});

		if ($sections.length) {
			const firstTop = $sections.first().offset().top - 80;
			const lastTop = $sections.last().offset().top - 80;
			const total = lastTop - firstTop;
			let ratio = 0;
			if (total > 0) {
				ratio = (scrollTop - firstTop) / total;
				ratio = Math.max(0, Math.min(1, ratio));
			}
			let percent = basePercent + ratio * (100 - basePercent);
			if (
				currentId === $sections.last().attr('id') ||
				scrollTop + winH >= $(document).height() - 5
			) {
				percent = 100;
			}
			$progress.css('height', percent + '%');
		}
	}

	update();
});


/* -------------------------------------------------------------
   02_연혁C | 스크롤 연동 연혁 네비게이션 + dl 진입 애니메이션 (tyC)
   ------------------------------------------------------------- */
$(window).on('load', function () {
	if (!$('.history.tyC').length) return;

	const $win = $(window);
	const $sections = $('.history.tyC .list-wrap > .list[id]');
	const $title = $('.history.tyC .year-title');
	const $links = $('.history.tyC .year li > a');
	const $dlList = $('.history.tyC .list dl');
	const $firstDl = $('#history1 dl').first();
	const STICKY_OFFSET = 200; // .history-sticky 높이만큼 뷰포트 상단 기준을 앞당기기 위한 버퍼

	const btnCount = $links.length || 1;
	const basePercent = 100 / btnCount;

	let isClickScrolling = false;
	let clickTargetId = null;

	// dl.active 로 dt 높이가 커지면 문서 길이가 늘어나 이후 dl들의 위치가 계속 밀린다.
	// 그래서 매 스크롤마다 offset()을 다시 재는 대신, 전부 비활성 상태인 시점의 위치를 한 번만 캐싱해서 기준으로 삼는다.
	let sectionTops = [];
	let dlTops = [];
	function measure() {
		sectionTops = $sections.map(function () { return $(this).offset().top; }).get();
		dlTops = $dlList.map(function () { return $(this).offset().top; }).get();
	}
	measure();

	let resizeTimer = null;
	$win.on('resize', function () {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(measure, 200);
	});

	$('.history.tyC .year li > a').on('click', function (e) {
		const targetId = $(this).attr('data-target');
		const $target = $('#' + targetId);
		if (!$target.length) return;
		isClickScrolling = true;
		clickTargetId = targetId;
		$links.parent().removeClass('on');
		$(this).parent().addClass('on');
		$title.text($(this).text());
		const targetTop = $target.offset().top - 180;
		const maxScroll = $(document).height() - $win.height();
		const finalTop = Math.min(targetTop, maxScroll);
		$('html, body').stop().animate({ scrollTop: finalTop }, 500, function () {
			isClickScrolling = false;
			clickTargetId = null;
			update();
		});
		e.preventDefault();
	});

	let ticking = false;
	$win.on('scroll', function () {
		if (!ticking) {
			requestAnimationFrame(() => {
				update();
				ticking = false;
			});
			ticking = true;
		}
	});

	function update() {
		const scrollTop = $win.scrollTop();
		const winH = $win.height();
		let currentId = null;

		if (isClickScrolling && clickTargetId) {
			currentId = clickTargetId;
		} else {
			$sections.each(function (i) {
				const top = sectionTops[i] - STICKY_OFFSET;
				if (scrollTop >= top) {
					currentId = $(this).attr('id');
				}
			});
			if (!currentId && $sections.length) {
				currentId = $sections.first().attr('id');
			}
			if (scrollTop + winH >= $(document).height() - 5) {
				currentId = $sections.last().attr('id');
			}
		}

		$links.parent().removeClass('on');
		$links.each(function () {
			if ($(this).attr('data-target') == currentId) {
				$(this).parent().addClass('on');
				$title.text($(this).text());
			}
		});

		// 스크롤 상단이 연도(dl) 영역에 위치하거나 그 아래로 지나가면 active, 아직 위쪽이면 해제
		// (dlTops는 measure()에서 전부 비활성 상태일 때 캐싱해 둔 고정 기준값 - active로 인한 높이 변화의 영향을 받지 않는다)
		// sticky 네비게이션에 가려지는 높이만큼 STICKY_OFFSET을 더해 기준선을 맞춘다.
		$dlList.each(function (i) {
			if (scrollTop + STICKY_OFFSET >= dlTops[i]) {
				$(this).addClass('active');
			} else {
				$(this).removeClass('active');
			}
		});

		// history1(첫 연도구간)의 첫 번째 dl은 스크롤 위치와 상관없이 항상 active 유지
		$firstDl.addClass('active');
	}

	update();
});


/* -------------------------------------------------------------
   03_역대교장A_list | 약력보기 팝업 (리스트형)
   -------------------------------------------------------------
*/
$(function () {
	if (!$('.pri-his.tyA.list').length) return;
	if (document.body.classList.contains('tmpl2-builder-page')) return;

	let lastFocus = null;
	const $popup = $('#preHisPopup');
	const $subContent = $('#subContent');
	const $achieveWrap = $popup.children('.popup-wrap').children('.list-wrap');
	// 커스터마이즈하지 않은 항목을 클릭했을 때 되돌아갈 기본 학력/주요업적
	// (팝업에 원래부터 들어있던 내용)을 페이지 로드 시점에 한 번 기억해 둔다.
	const defaultAchieveHtml = $achieveWrap.html();

	// 팝업은 리스트 전체에서 1개뿐이라, 열기 직전에 클릭된 <li>의 기수/성명/
	// 재임기간/사진을 팝업 info-wrap에 그대로 복사해 넣는다. 학력·주요업적은
	// 빌더에서 그 항목만 따로 저장해 뒀다면(<li> 안의 숨겨진
	// <template class="pri-his-achieve-data">, 화면에는 표시되지 않음) 그 내용을,
	// 없으면 팝업 기본 내용을 보여준다.
	function fillPreHisPopupInfo($li) {
		const $infoWrap = $popup.children('.popup-wrap').children('.info-wrap');
		const $srcInfo = $li.find('.inner > .info');
		const srcImg = $li.find('.inner').children('.img').html();
		const srcOrder = $srcInfo.children('.order').html();
		const srcName = $srcInfo.children('p').html();
		const srcTerm = $srcInfo.children('.term').html();
		if (srcImg != null) $infoWrap.children('.img').html(srcImg);
		if (srcOrder != null) $infoWrap.find('.order').html(srcOrder);
		if (srcName != null) $infoWrap.find('.info').children('p').html(srcName);
		if (srcTerm != null) $infoWrap.find('.term').html(srcTerm);

		const achieveTpl = $li.children('template.pri-his-achieve-data')[0];
		$achieveWrap.html(achieveTpl ? achieveTpl.innerHTML : defaultAchieveHtml);
	}

	$('.pri-his .btn-view').on('click', function (e) {
		e.preventDefault();
		lastFocus = $(this);
		// 팝업이 아직 .pri-his.tyA.list.wideCnt 안에 있다면(=최초 클릭)
		// document.body 바로 아래로 옮긴다. 이미 옮겨진 뒤(두 번째 클릭부터)라면
		// 다시 옮기지 않고 그대로 열기/닫기만 반복한다.
		if ($popup.length && $popup[0].parentElement !== document.body) {
			document.body.appendChild($popup[0]);
		}
		fillPreHisPopupInfo($(this).closest('li'));
		$popup.fadeIn(200).attr('aria-hidden', 'false');
		$('body').addClass('scroll-lock');
		$subContent.css('z-index', 103);
		$popup.find('.list-wrap').focus();
	});

	function closePopup() {
		$popup.fadeOut(200).attr('aria-hidden', 'true');
		$('body').removeClass('scroll-lock');
		$subContent.css('z-index', '');
		if (lastFocus) lastFocus.focus();
	}

	$('.btn-close').on('click', function () { closePopup(); });

	$(document).on('keydown', function (e) {
		if (e.key === 'Escape') closePopup();
	});

	$popup.on('click', function (e) {
		if (!$(e.target).closest('.popup-wrap').length) closePopup();
	});

	$popup.on('keydown', function (e) {
		if (e.key !== 'Tab') return;
		const focusable = $popup.find('a, button, [tabindex="0"]').filter(':visible');
		const first = focusable.first()[0];
		const last = focusable.last()[0];
		if (e.shiftKey) {
			if (document.activeElement === first) { e.preventDefault(); last.focus(); }
		} else {
			if (document.activeElement === last) { e.preventDefault(); first.focus(); }
		}
	});

});


/* -------------------------------------------------------------
   03_역대교장A_Slide | 약력보기 팝업 + priHisSwiper (슬라이드형)
   ------------------------------------------------------------- */
$(function () {
	if (!$('.priHisSwiper').length) return;

	let lastFocus = null;
	const $popup = $('#preHisPopup');
	const $subContent = $('#subContent');

	$('.pri-his.slide .card a').on('click', function (e) {
		e.preventDefault();
		lastFocus = $(this);
		$popup.fadeIn(200).attr('aria-hidden', 'false');
		$('body').addClass('scroll-lock');
		$subContent.css('z-index', 103);
		$popup.find('.list-wrap').focus();
	});

	function closePopup() {
		$popup.fadeOut(200).attr('aria-hidden', 'true');
		$('body').removeClass('scroll-lock');
		$subContent.css('z-index', '');
		if (lastFocus) lastFocus.focus();
	}

	$('.btn-close').on('click', function () { closePopup(); });

	$(document).on('keydown', function (e) {
		if (e.key === 'Escape') closePopup();
	});

	$popup.on('click', function (e) {
		if (!$(e.target).closest('.popup-wrap').length) closePopup();
	});

	$popup.on('keydown', function (e) {
		if (e.key !== 'Tab') return;
		const focusable = $popup.find('a, button, [tabindex="0"]').filter(':visible');
		const first = focusable.first()[0];
		const last = focusable.last()[0];
		if (e.shiftKey) {
			if (document.activeElement === first) { e.preventDefault(); last.focus(); }
		} else {
			if (document.activeElement === last) { e.preventDefault(); first.focus(); }
		}
	});

	$(window).on('resize', function () {
		priHisSwiper.update();
		priHisSwiper.updateSlides();
		priHisSwiper.updateProgress();
		priHisSwiper.updateSlidesClasses();
	});

	var priHisSwiper = new Swiper(".priHisSwiper", {
		centeredSlides: true,
		slidesPerView: 'auto',
		loop: true,
		speed: 500,
		slideToClickedSlide: true,
		observer: true,
		observeParents: true,
		watchSlidesProgress: true,
		navigation: {
			nextEl: ".btn-next",
			prevEl: ".btn-prev",
		},
		on: {
			init: function () { updateSlideFocus(this); },
			slideChange: function () { updateSlideFocus(this); }
		},
	});

	function updateSlideFocus(swiper) {
		const $slides = $('.priHisSwiper .swiper-slide');
		$slides.find('a').attr('tabindex', -1);
		const visibleCount = 5;
		const start = swiper.activeIndex - Math.floor(visibleCount / 2);
		const end = swiper.activeIndex + Math.floor(visibleCount / 2);
		$slides.each(function (i) {
			if (i >= start && i <= end) {
				$(this).find('a').attr('tabindex', 0);
			}
		});
	}

	$('.pri-his.slide .bg').each(function () {
		var $el = $(this);
		var icoSvg = '<svg width="349" height="222" viewBox="0 0 349 222" fill="none">' +
			'<path opacity="0.1" d="M349 203.275C337.873 206.043 325.653 205.001 314.362 199.154C295.541 189.408 272.605 192.714 257.302 207.379C233.222 230.455 193.681 223.626 178.735 193.811C169.237 174.863 148.738 164.057 127.739 166.926C94.6939 171.441 66.7175 142.675 72.1509 109.769C75.6037 88.8571 65.3722 68.0649 46.6968 58.043C24.9503 46.373 16.1621 21.5916 22.6802 0H349V203.275Z" class="fill-primary"/>' +
			'<path opacity="0.4" d="M2.10969 0C-2.3121 20.3237 6.605 42.6092 26.8343 53.3203C45.9433 63.438 56.5003 84.5916 53.097 105.944C47.9535 138.215 75.5211 166.248 107.873 161.644C129.28 158.597 150.255 169.505 160.052 188.78C174.859 217.912 213.639 224.386 237.107 201.645C252.634 186.597 276.014 183.095 295.27 192.93C313.896 202.443 335.01 198.675 349.272 186.291V187.605C334.91 199.645 314.065 203.294 295.513 194.17L294.816 193.819C275.941 184.179 253.022 187.613 237.802 202.362C214.038 225.391 174.89 219.066 159.519 189.926L159.16 189.233C149.557 170.34 128.998 159.648 108.015 162.634L107.242 162.738C74.8154 166.853 47.3369 138.911 51.9925 106.559L52.1097 105.787C55.3937 85.1838 45.4177 64.7706 27.2386 54.6777L26.3665 54.2051C5.79161 43.3111 -3.31835 20.6846 1.08527 0H2.10969Z" class="fill-primary"/>' +
			'</svg>';
		$el.html(icoSvg);
	});

});


/* -------------------------------------------------------------
   03_역대교장B | 인라인 디테일 행 펼치기/접기
   ------------------------------------------------------------- */
$(function () {
	if (!$('.pri-his.tyB').length) return;

	const $list = $('.list-wrap > ul');
	let $lastTrigger = null;

	$('.list-wrap').on('click', '.btn-item', function () {
		const $btn = $(this);
		const $li = $btn.closest('li');
		const $items = $list.children('li').not('.detail-row');
		const $detail = $li.find('.detail-data');
		const currentTop = Math.round($li.position().top);
		const $sameRow = $items.filter(function () {
			return Math.abs(Math.round($(this).position().top) - currentTop) < 5;
		});
		const $last = $sameRow.last();

		if ($btn.attr('aria-expanded') === 'true') {
			closeDetail();
			return;
		}

		closeDetail();
		$lastTrigger = $btn;

		const $detailRow = $(`
			<li class="detail-row">
				<div class="inner" role="region" aria-live="polite"></div>
				<button class="btn-close"><span class="hid">닫기</span></button>
			</li>
		`);

		const $wrap = $detailRow.find('.inner');
		$wrap.html($detail.html());
		$last.after($detailRow);

		$('.btn-item').attr('aria-expanded', 'false');
		$btn.attr('aria-expanded', 'true');
		$detailRow.find('.btn-close').focus();
		$li.addClass('active').siblings().removeClass('active');
	});

	function closeDetail() {
		const $row = $list.find('.detail-row');
		if (!$row.length) return;
		const scrollTop = $(window).scrollTop();
		$row.remove();
		$('.btn-item').attr('aria-expanded', 'false');
		$('.pri-his.tyB .list-wrap li.active').removeClass('active');
		if ($lastTrigger) $lastTrigger.focus();
		$(window).scrollTop(scrollTop);
	}

	$('.list-wrap').on('click', '.btn-close', function () {
		closeDetail();
	});

	$('.list-wrap').on('keydown', '.btn-close', function (e) {
		if (e.key === 'Tab' && !e.shiftKey) {
			e.preventDefault();
			closeDetail();
		}
	});

	$(document).on('keydown', function (e) {
		if (e.key === 'Escape') closeDetail();
	});

	let resizeTimer;
	$(window).on('resize', function () {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(function () { closeDetail(); }, 150);
	});

});


/* -------------------------------------------------------------
   04_상징A_list | GSAP ScrollTrigger 등장 애니메이션
   ------------------------------------------------------------- */
$(function () {
	if (!$('.symbol.tyA.list').length) return;
	if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

	gsap.registerPlugin(ScrollTrigger);

	ScrollTrigger.matchMedia({
		"(min-width: 1025px)": function () {

			$(".symbol .box:not(.song-wrap)").each(function (i) {
				const box = $(this);
				const img = box.find(".img");
				const inner = box.find(".inner");
				const text = box.find(".bg-text");
				const isEven = i % 2 === 1;

				const tl = gsap.timeline({
					scrollTrigger: {
						trigger: box[0],
						start: "top 80%",
						toggleActions: "play none none reverse"
					}
				});

				tl.from(img, { y: 80, opacity: 0, duration: 0.8 })
					.from(inner, { x: isEven ? -60 : 60, opacity: 0, duration: 0.8 }, "-=0.6")
					.from(text, { x: isEven ? -60 : 60, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.6");
			});

			const $songBox = $(".symbol .box.song-wrap");
			const $tit = $songBox.find(".tit-wrap");
			const $inner = $songBox.find(".inner");

			const tlSong = gsap.timeline({
				scrollTrigger: { trigger: $songBox[0], start: "top 80%" }
			});

			tlSong.from($tit, { y: 60, opacity: 0, duration: 0.7 })
				.from($inner, { y: 60, opacity: 0, duration: 0.7 }, "-=0.3");
		}
	});

});


/* -------------------------------------------------------------
   04_상징A_Slide | GSAP 세로 스크롤 핀 + 좌측 네비게이션
   ------------------------------------------------------------- */
$(function () {
	if (!$('.symbol.tyA.slide').length) return;
	if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

	gsap.registerPlugin(ScrollTrigger);

	const $section = $(".symbol.tyA.slide");
	const $scroll = $(".h-scroll");
	const $wrap = $(".list-wrap");
	const $boxes = $scroll.find(".box");

	/* 좌측 네비게이션 : 마크업은 그대로 두고, box > inner > h4 텍스트로 런타임에 생성 */
	let $nav = $();
	let $navBtns = $();
	if ($boxes.length && !$wrap.parent().hasClass("symbol-nav-wrap")) {
		$wrap.wrap('<div class="symbol-nav-wrap"></div>');

		$nav = $('<nav class="symbol-nav"><ul></ul></nav>');
		const $ul = $nav.find("ul");

		$boxes.each(function (i) {
			const $h4 = $(this).find(".inner h4").first();
			if (!$h4.length) return;
			const title = $h4.clone().children().remove().end().text().trim();
			$('<li><button type="button"></button></li>')
				.appendTo($ul)
				.find("button")
				.attr("data-idx", i)
				.text(title);
		});

		$wrap.before($nav);
		$navBtns = $nav.find("button");
	}

	function setActiveNav(idx) {
		if (!$navBtns.length) return;
		$navBtns.removeClass("on").eq(idx).addClass("on");
	}

	let boxTops = [];
	let scrollAmountRef = 0;
	let currentST = null;
	let spyObserver = null;

	function stopSpyObserver() {
		if (spyObserver) {
			spyObserver.disconnect();
			spyObserver = null;
		}
	}

	function startSpyObserver() {
		if (!$boxes.length || !$navBtns.length) return;
		stopSpyObserver();
		spyObserver = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					setActiveNav($boxes.index(entry.target));
				}
			});
		}, {
			root: null,
			threshold: 0,
			rootMargin: "-100px 0px -70% 0px"
		});
		$boxes.each(function () { spyObserver.observe(this); });
	}

	function init() {
		ScrollTrigger.getAll().forEach(t => t.kill());
		gsap.set([$scroll, $section, ".symbol-sticky"], { clearProps: "all" });
		currentST = null;

		const isLowCount = $boxes.length <= 3;

		if (window.innerWidth <= 1240 || isLowCount) {
			if (isLowCount) {
				$wrap.addClass("dis-scroll");
			} else {
				$wrap.removeClass("dis-scroll");
			}
			$nav.addClass("nav-sticky");
			startSpyObserver();
			return;
		}

		$nav.removeClass("nav-sticky");
		stopSpyObserver();
		$scroll.removeClass("dis-scroll");
		const scrollAmount = $scroll[0].scrollHeight - $wrap.outerHeight() + 100;
		if (scrollAmount <= 0) return;

		boxTops = $boxes.map(function () { return this.offsetTop; }).get();
		scrollAmountRef = scrollAmount;

		const mainTimeline = gsap.timeline({
			scrollTrigger: {
				trigger: $section,
				start: "top top",
				end: () => "+=" + scrollAmount,
				scrub: 1,
				pin: true,
				pinSpacing: true,
				invalidateOnRefresh: true,
				anticipatePin: 1,
				onUpdate: (self) => {
					const currentY = self.progress * scrollAmount;
					let activeIdx = 0;
					for (let i = 0; i < boxTops.length; i++) {
						if (boxTops[i] <= currentY + 1) activeIdx = i;
					}
					setActiveNav(activeIdx);
				}
			}
		});

		mainTimeline.to($scroll, { y: -scrollAmount, ease: "none" });
		mainTimeline.to(".symbol-sticky", { y: 0, ease: "none" }, 0);

		currentST = mainTimeline.scrollTrigger;
		setActiveNav(0);
	}

	init();

	$navBtns.on("click", function () {
		const idx = Number($(this).attr("data-idx"));
		const $target = $boxes.eq(idx);
		if (!$target.length) return;

		if (currentST && scrollAmountRef > 0) {
			const targetProgress = Math.min(1, boxTops[idx] / scrollAmountRef);
			const targetScroll = currentST.start + (currentST.end - currentST.start) * targetProgress;
			window.scrollTo({ top: targetScroll, behavior: "smooth" });
		} else {
			$target[0].scrollIntoView({ behavior: "smooth", block: "start" });
		}
	});

	let resizeTimer;
	$(window).on("resize", function () {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(init, 250);
	});

});


/* -------------------------------------------------------------
   04_상징B_1, 04_상징B_2 | 텍스트 펼치기/접기
   ------------------------------------------------------------- */
$(function () {
	if (!$('.symbol.tyB').length) return;

	$('.btn-toggle').on('click', function () {
		const $box = $(this).closest('.text-box');
		$box.toggleClass('open');
		if ($box.hasClass('open')) {
			$(this).text('접기');
			$(this).addClass('open');
		} else {
			$(this).text('펼쳐보기');
			$(this).removeClass('open');
		}
	});

	$('.text-box').each(function () {
		const $text = $(this).find('p');
		const $btn = $(this).find('.btn-toggle');
		const lineHeight = parseFloat($text.css('line-height'));
		const maxHeight = lineHeight * 3;
		if ($text[0].scrollHeight <= maxHeight) {
			$btn.hide();
		}
	});

});


/* -------------------------------------------------------------
   04_상징C, 99_게시판A, 99_게시판B | IntersectionObserver 타이틀 갱신
   ------------------------------------------------------------- */
$(function () {
	if (!$('.box[data-title]').length) return;

	const $sections = $('.box');
	const $title = $('#title');

	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				const newTitle = $(entry.target).data('title');
				$title.text(newTitle);
			}
		});
	}, {
		root: null,
		threshold: 0,
		rootMargin: '-100px 0px -100% 0px'
	});

	$sections.each(function () {
		observer.observe(this);
	});

});
