$(function() {
  gnb();
  snb();
  snbFloating();
  popFullmenu();
  sns();
  hash();
  btnTop();
  familySlider();

  setTimeout(function() {
    $('html').addClass('shOn');
  }, 100);
});


// gnb 메뉴
function gnb() {
    var $nav = $('#nav');
    var $gnb = $('#gnb');
    var $blind = $('#blind');
    var $header = $('#header');
    var gnbTimer = null;

    var $w_Check = $gnb.find('.depWidth');
    var $depth01 = $gnb.find('.depth01');
    var $depth02 = $gnb.find('.depth02');
    var $depth03 = $gnb.find('.depth03');

    $w_Check.li = $w_Check.find('> ul > li');
    $depth01.li = $depth01.find('> ul > li');
    $depth02.li = $depth02.find('> ul > li');
    $depth03.li = $depth03.find('> ul > li');

    function openBlind() {
        clearTimeout(gnbTimer);

        if (!$blind.parent().is('body')) {
            $blind.appendTo('body');
        }

        $blind.stop(true, true).fadeIn(100);
    }

    function closeBlind() {
        $blind.stop(true, true).fadeOut(100, function() {
            if (!$blind.parent().is($header)) {
                $blind.appendTo($header);
            }
        });
    }

    function gnbHide() {
        clearTimeout(gnbTimer);

        if ($nav.hasClass('fullDown')) {
            // fullDown은 패널이 닫혀도 depth02의 아코디언(펼침) 상태는 유지해야 하므로 active는 건드리지 않는다
            $gnb.removeClass('active').find('li').removeClass('on');
        } else {
            $gnb.removeClass('active').find('li').removeClass('active on');
        }

        closeBlind();

        if ($nav.hasClass('oneDown')) {
            $depth02.li.removeClass('active');
        }

        $('.depth02 li.dep > a').attr('title', '메뉴닫힘');
    }

    function gnbHideDelay() {
        clearTimeout(gnbTimer);

        gnbTimer = setTimeout(function() {
            gnbHide();
        }, 120);
    }

    $gnb.find('.depth02 li').each(function() {
        if ($(this).find('> div').length > 0) {
            $(this).addClass('dep').find('> a').attr('title', '메뉴닫힘');
        }
    });

    $gnb.find('li').last().find('> a').addClass('lastGnb');
    $depth02.li.last().find('> a').addClass('lastGnb');

    if ($nav.hasClass('fullDown')) {
        var gnbCount = $gnb.find('.depth01 > ul > li').length;

        if ($gnb.find('.topGnb').length === 0) {
            $gnb.find('.depth01').before('<div class="topGnb"><ul></ul></div>');

            for (var i = 0; i < gnbCount; i++) {
                $gnb.find('.topGnb ul').append('<li></li>');
            }

            $gnb.find('.depth01 > ul > li').each(function(idx) {
                var $clone = $(this).find('> a').clone();
                $gnb.find('.topGnb ul li').eq(idx).append($clone);
            });
        }

        if ($gnb.find('.fullDownBg').length === 0) {
            $gnb.find('.depth01').prepend('<div class="fullDownBg"></div>');
        }
    }

    function syncFullDownBg() {
        var $allDepth02Ul = $gnb.find('.depth01 > ul > li > .depth02 > ul');
        var maxH = 0;

        $allDepth02Ul.css('height', '').each(function() {
            var h = $(this).outerHeight();
            if (h > maxH) maxH = h;
        });

        $gnb.find('.fullDownBg').css('height', maxH + 'px');
        $allDepth02Ul.css('height', maxH + 'px');
    }

    $(document).on('focus mouseenter', '#nav.fullDown .topGnb a', function() {
        clearTimeout(gnbTimer);

        var idx = $(this).parent().index();

        $gnb.addClass('active');
        $(this).parent().addClass('on').siblings().removeClass('on');
        $gnb.find('.depth01 > ul > li').eq(idx).addClass('on').siblings().removeClass('on');

        syncFullDownBg();
        openBlind();
    });

	$(document).on('focus mouseenter', '#nav.fullDown .depth01 > ul > li', function() {
	    clearTimeout(gnbTimer);

	    var idx = $(this).index();

	    $(this).addClass('on').siblings().removeClass('on');
	    $gnb.find('.topGnb > ul > li').eq(idx).addClass('on').siblings().removeClass('on');

	    // fullDown은 전체 컬럼이 한 패널에 같이 내려오는 구조라 하위메뉴 없는 1depth를 hover해도 패널을 닫지 않는다
	    $gnb.addClass('active');
	    syncFullDownBg();
	    openBlind();
	});

	$(document).on('click', '#nav:not(.oneDown) .depth02 li.dep > a', function(e) {
	    e.preventDefault();

	    if ($(this).parent().hasClass('active')) {
	        $(this).parent().removeClass('active');
	        $(this).attr('title', '메뉴닫힘');
	    } else {
	        $(this).parent().addClass('active');
	        $(this).attr('title', '메뉴열림');
	    }

	    if ($nav.hasClass('fullDown')) {
	        syncFullDownBg();
	    }
	});

	$depth01.find('> ul > li > a').on('focus mouseenter', function() {
	    if ($nav.hasClass('fullDown')) return;

	    clearTimeout(gnbTimer);

	    var $li = $(this).parent();
	    var hasDepth02 = $li.find('> .depth02').length > 0;

	    if (!hasDepth02) {
	        gnbHide();
	        $li.addClass('on').siblings().removeClass('on');
	        return;
	    }

	    $li.addClass('on').siblings().removeClass('on');
	});

	$depth01.li.find('> a').on('focus mouseenter', function() {
	    if ($nav.hasClass('fullDown')) return;

	    clearTimeout(gnbTimer);

	    var $li = $(this).parent();
	    var hasDepth02 = $li.find('> .depth02').length > 0;

	    if (!hasDepth02) {
	        gnbHide();
	        $li.addClass('on').siblings().removeClass('on');
	        return;
	    }

	    $gnb.addClass('active');
	    openBlind();
	});

    $(document).on('mouseleave', '#nav:not(.oneDown) #gnb', function() {
        gnbHideDelay();
    });

    $(document).on('mouseleave', '#header #nav.oneDown .depth02', function() {
        gnbHideDelay();
    });

    $(document).on('mouseleave', '#gnb .depth01 > ul', function(e) {
        if ($(e.relatedTarget).closest('#gnb, #nav, #blind').length) return;
        gnbHideDelay();
    });

    $(document).on('mouseenter focusin', '#gnb, #nav, #header #nav.oneDown .depth02', function() {
        clearTimeout(gnbTimer);
    });

    $(document).off('focusin.gnbAutoClose').on('focusin.gnbAutoClose', function(e) {
        if (!$gnb.hasClass('active')) return;
        if ($(e.target).closest('#gnb, #nav').length) return;

        gnbHide();
    });
	
	$(document).on('mouseenter focusin', '#nav.oneDown .depth02 > ul > li.dep', function() {
	    $(this).addClass('active').siblings().removeClass('active');
	    $(this).find('> a').attr('title', '메뉴열림');
	});

	$(document).on('mouseleave focusout', '#nav.oneDown .depth02 > ul > li.dep', function() {
	    var $this = $(this);
	    var $depth02 = $this.closest('.depth02');

	    setTimeout(function() {
	        if (!$this.find(':focus').length && !$this.is(':hover')) {
	            $this.removeClass('active');
	            $this.find('> a').attr('title', '메뉴닫힘');

	            if (!$depth02.find('> ul > li.dep.active').length) {
	                $depth02.removeClass('depth03-open');
	                $depth02.children('ul').css('min-height', '');
	            }
	        }
	    }, 200);
	});
	
	function setDepth03Scroll($targetLi) {
	    var $depth03 = $targetLi.children('.depth03');
	    var $depth02 = $targetLi.closest('.depth02');

	    $depth02.addClass('depth03-open');

	    if (!$depth03.length) return;

	    $depth03.css('height', 'auto');
	    var naturalH = $depth03[0].offsetHeight;
	    $depth03.css('height', '');

	    var depth02ulH = $depth02.children('ul')[0].offsetHeight;
	    if (naturalH > depth02ulH) {
	        $depth02.children('ul').css('min-height', naturalH + 'px');
	    }
	}

	$(document).on('mouseenter focusin', '#nav.oneDown .depth02 > ul > li.dep', function () {
	    setDepth03Scroll($(this));
	});
}



// 서브메뉴  
function snb() {
    var $snb = $('#contNavi #snb, #contNaviTop #snb, #contNaviLeft #snb');
    if (!$snb.length) return;
    $snb.find('li').each(function() {
        if ($(this).find('> ul').length > 0) {
            $(this).addClass('dep');
        }
    });
    var activeTxt = $snb.find('li.active:last > a span').text();
    if (activeTxt) {
        $snb.find('h2').html('<a href="#none" role="button" aria-expanded="false"><span>' + activeTxt + '</span></a>');
    } else {
        $snb.find('h2').wrapInner('<a href="#none" role="button" aria-expanded="false"><span></span></a>');
    }

	 $(document).on('click', '#contNavi #snb h2 > a, #contNaviTop #snb h2 > a, #contNaviLeft #snb h2 > a', function(e) {
        e.preventDefault();
        var $thisSnb = $(this).closest('#snb');
        var isOpen = $thisSnb.hasClass('open');
        $('#contNavi #snb, #contNaviTop #snb, #contNaviLeft #snb').removeClass('open');
        $('#contNavi #snb h2 > a, #contNaviTop #snb h2 > a, #contNaviLeft #snb h2 > a').attr('aria-expanded', 'false');
        if (!isOpen) {
            $thisSnb.addClass('open');
            $(this).attr('aria-expanded', 'true');
        }
    });

    $(document).on('mouseenter focusin', '#contNavi #snb .lnb > li.dep, #contNaviTop #snb .lnb > li.dep, #contNaviLeft #snb .lnb > li.dep', function() {
        $(this).addClass('open').siblings().removeClass('open');
    });

    $(document).on('mouseleave', '#contNavi #snb, #contNaviTop #snb, #contNaviLeft #snb', function() {
        $(this).find('.lnb > li').removeClass('open');
    });

    $(document).on('click', function(e) {
        if ($(e.target).closest('#contNavi #snb, #contNaviTop #snb, #contNaviLeft #snb').length) return;

        $('#contNavi #snb, #contNaviTop #snb, #contNaviLeft #snb').removeClass('open');
        $('#contNavi #snb h2 > a, #contNaviTop #snb h2 > a, #contNaviLeft #snb h2 > a').attr('aria-expanded', 'false');
        $('#contNavi #snb .lnb > li, #contNaviTop #snb .lnb > li, #contNaviLeft #snb .lnb > li').removeClass('open');
    });

    $(document).on('keydown', function(e) {
        if (e.keyCode === 27) {
            $('#contNavi #snb, #contNaviTop #snb, #contNaviLeft #snb').removeClass('open');
            $('#contNavi #snb h2 > a, #contNaviTop #snb h2 > a, #contNaviLeft #snb h2 > a').attr('aria-expanded', 'false');
            $('#contNavi #snb .lnb > li, #contNaviTop #snb .lnb > li, #contNaviLeft #snb .lnb > li').removeClass('open');
        }
    });	
	$('#contNavi #snb, #contNaviTop #snb, #contNaviLeft #snb').addClass('is-ready');
}



//사이트맵
function popFullmenu() {	
	$(document).on('focus mouseover', '.fullmenu', function(e) {
		$('.popFullmenu .depth02 > ul > li.dep > a').removeAttr("title");
		e.preventDefault();
    });
 	$(document).on('focus mouseover click', '.popFullmenu .depth02 > ul > li.dep > a', function(e) {
		$(this).removeAttr("title");
		e.preventDefault();
    });

    if ($('.popFullmenu').length > 0) {
        $("#header h1 img").clone(false).prependTo(".popFullmenu h2").wrap('<span></span>');
        $("#nav .depth01").clone(false).prependTo(".popFullmenu .fullmenu_group");
        $(".popFullmenu h2").prependTo(".popFullmenu .fullmenu_group");
        $(".topUtil .alarm").clone(false).prependTo(".popFullmenu .popUntil");
        $(".topUtil .util_wrap .util li").clone(false).prependTo(".popFullmenu .popUntil .util");
        $(".topUtil .util_wrap .user li").clone(false).prependTo(".popFullmenu .popUntil .user");
        $(".popFullmenu .topGnb").remove();
        // #nav 메가메뉴 JS가 남긴 인라인 style(display/height 등)이 클론에 그대로 남아
        // 팝업 전용 CSS(2단 탭 레이아웃)를 덮어써버리는 문제를 막기 위해 전체 서브트리에서 제거
        $(".popFullmenu .depth01").add(".popFullmenu .depth01 *").removeAttr("style");
		$(".popFullmenu .depth02 > ul > li.dep > a").remove('title');
		$(".popFullmenu .depth01 > ul > li").each(function() {
			if ($(this).find('> .depth02').length > 0) {
				$(this).addClass('dep');
			}
		});
        $(".popFullmenu .depth01 > ul > li.dep:first-of-type").addClass("active");
        $(".popFullmenu .depth01 > ul > li.dep:first-of-type > .depth02 > ul > li.dep:first-of-type").addClass("active");

        var $searchForm = $("#searchForm");
        if ($searchForm.length > 0) {
            var $searchFormHome = $searchForm.parent();
            var moveSearchForm = function () {
                if ($(window).width() <= 1024) {
                    if (!$searchForm.parent().is(".popUntil")) {
                        $searchForm.appendTo(".popFullmenu .popUntil");
                    }
                } else {
                    if (!$searchForm.parent().is($searchFormHome)) {
                        $searchForm.prependTo($searchFormHome);
                    }
                }
            };
            moveSearchForm();
            $(window).on("resize.searchFormPlacement", moveSearchForm);
        }
    }
    $(document).on('click', '.popFullmenu li.dep > a', function(e) {
        if ($(window).width() <= 1240) {
           	$(this).parent('li').addClass('active').siblings().removeClass('active');
            e.preventDefault();
        }
    });

    // 데스크탑 : 1차메뉴 탭 전환 (클릭한 1차메뉴의 2차/3차만 표시)
    $(document).on('click', '.popFullmenu .depth01 > ul > li.dep > a', function(e) {
        e.preventDefault();
        $(this).parent('li').addClass('active').siblings().removeClass('active');
    });

		var $openBtn = $('#fullmenuOpen');
	var $closeBtn = $('#fullmenuClose');
	var $popup = $('.popFullmenu');

	function getFocusable($wrap){
		return $wrap.find('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').filter(':visible:not(:disabled)');
	}

	function openFullmenu(){
	    $popup.addClass('active').attr('aria-hidden', 'false');

	    $('html').addClass('fullmenuOpen');

	    setTimeout(function(){
	        var $focusables = getFocusable($popup);

	        if($focusables.length){
	            $focusables.first().focus();
	        }else{
	            $popup.attr('tabindex', '-1').focus();
	        }
	    }, 350);
	}

	function closeFullmenu(){
	    $popup.removeClass('active').attr('aria-hidden', 'true');

	    $('html').removeClass('fullmenuOpen');

	    setTimeout(function(){
	        $openBtn.focus();
	    }, 350);
	}

	$openBtn.off('click.fullmenu').on('click.fullmenu', function(e){
		e.preventDefault();
		openFullmenu();
	});

	$openBtn.off('keydown.fullmenu').on('keydown.fullmenu', function(e){
		if(e.key === 'Enter' || e.key === ' '){
			e.preventDefault();
			openFullmenu();
		}
	});

	$closeBtn.off('click.fullmenu').on('click.fullmenu', function(e){
		e.preventDefault();
		closeFullmenu();
	});

	$popup.off('keydown.fullmenuTrap').on('keydown.fullmenuTrap', function(e){
		if(!$popup.hasClass('active')) return;
		if(e.key !== 'Tab') return;

		var $focusables = getFocusable($popup);
		if(!$focusables.length) return;

		var $first = $focusables.first();
		var $last = $focusables.last();

		if(e.shiftKey){
			if(document.activeElement === $first[0]){
				e.preventDefault();
				$last.focus();
			}
		}else{
			if(document.activeElement === $last[0]){
				e.preventDefault();
				$first.focus();
			}
		}
	});

	$(document).off('keydown.fullmenuEsc').on('keydown.fullmenuEsc', function(e){
		if(e.key === 'Escape' && $popup.hasClass('active')){
			closeFullmenu();
		}
	});

	$(document).off('click.fullmenuDim').on('click.fullmenuDim', function(e){
		if($popup.hasClass('active') && e.target.id === 'header'){
			closeFullmenu();
		}
	});
}


// 서브 breadcrumb 메뉴 및 플로팅 메뉴 네비게이션
function snbFloating() {
    var $snb = $('#contNavi #snb, #contNaviTop #snb, #contNaviLeft #snb').first();
    if (!$snb.length) return;
    if ($snb.closest('#contNaviLeft').length) return;

    var $nav = $snb.find('nav.snb_wrap');
    var $lnb = $snb.find('ul.lnb');
    if (!$lnb.length || !$nav.length) return;

    var $h2 = $snb.find('h2').first();
    var depth1Name = ($h2.find('span').first().text() || $h2.text()).trim();

    var gnb1List = $('#gnb .depth01 > ul > li').map(function () {
        var $a = $(this).children('a');
        return $a.length ? {
            text:   ($a.find('span').text() || $a.text()).trim(),
            href:   $a.attr('href') || '#',
            target: $a.attr('target') || '',
            hasSub: $(this).find('> .depth02').length > 0
        } : null;
    }).get().filter(Boolean);

    var $all2      = $lnb.children('li');
    var $active2A  = $();
    var $active2Li = $();
    var $active3A  = $();
    var $active3Li = $();

    var leftCurrMi = $('#leftCurrMi').val();
    if (leftCurrMi) {
        var $currA = $('#currMenuId' + leftCurrMi);
        if ($currA.length) {
            var $sub3Li = $currA.closest('.subLnb > li');
            if ($sub3Li.length) {
                $active3A  = $currA;
                $active3Li = $sub3Li;
                $active2Li = $currA.closest('ul.lnb > li');
                $active2A  = $active2Li.children('a').first();
            } else {
                $active2A  = $currA;
                $active2Li = $currA.parent();
            }
        }
    }

    if (!$active2Li.length) {
        $active2A  = $lnb.find('> li > a.active').first();
        $active2Li = $active2A.length ? $active2A.parent() : $();
        if ($active2Li.length) {
            $active3A  = $active2Li.find('.subLnb a.active').first();
            $active3Li = $active3A.length ? $active3A.closest('li') : $();
        } else {
            $active3A = $lnb.find('> li > .subLnb a.active').first();
            if ($active3A.length) {
                $active3Li = $active3A.closest('li');
                $active2Li = $active3A.closest('ul.lnb > li');
                $active2A  = $active2Li.children('a').first();
            }
        }
    }
    if (!$active2Li.length) {
        $active2Li = $all2.first();
        $active2A  = $active2Li.children('a').first();
    }

    var active2Name = ($active2A.find('span').text() || $active2A.text()).trim();
    var active2Href = $active2A.attr('href') || '#';
    var $all3       = $active2Li.find('.subLnb').first().children('li');
    var active3Name = ($active3A.find('span').text() || $active3A.text()).trim();
    var active3Href = $active3A.attr('href') || '#';
    var has3depth   = $all2.filter(function () { return !!$(this).find('.subLnb').length; }).length > 0;

    function aInfo($a) {
        return {
            text:    ($a.find('span').text() || $a.text()).trim(),
            href:    $a.attr('href') || '#',
            target:  $a.attr('target') || '',
            onclick: $a.attr('onclick') || ''
        };
    }

    function makeSubUl(items, activeText) {
        return $('<ul class="subLnb">').append($.map(items, function (item) {
            var $a = $('<a>').attr('href', item.href).text(item.text);
            if (item.target) $a.attr('target', item.target);
            if (item.onclick) $a.attr('onclick', item.onclick);
            return $('<li>')
                .toggleClass('active', item.text === activeText)
                .toggleClass('has-sub', !!item.hasSub)
                .append($a);
        }));
    }

    function makeCrumb(label, href, $sub, idx) {
        var $li = $('<li>').data('crumbIdx', idx)
            .append($('<a>').attr('href', href).append($('<span>').text(label)));
        if ($sub && $sub.children().length) {
            $li.addClass('dep').append($sub);
            $li.children('a').attr({ 'aria-haspopup': 'true', 'aria-expanded': 'false' });
        }
        return $li;
    }

    $lnb.empty();

    if (depth1Name) {
        var curr1 = $.grep(gnb1List, function (g) { return g.text === depth1Name; })[0];
        $lnb.append(makeCrumb(depth1Name, curr1 ? curr1.href : '#', makeSubUl(gnb1List, depth1Name), 0));
    }

    if (active2Name) {
        var d2List = $all2.map(function () {
            var $a = $(this).children('a');
            return $a.length ? aInfo($a) : null;
        }).get().filter(Boolean);
        $lnb.append(makeCrumb(active2Name, active2Href, makeSubUl(d2List, active2Name), 1));
    }

    if (active3Name && $all3.length) {
        var d3List = $all3.map(function () {
            var $a = $(this).find('a');
            return $a.length ? aInfo($a) : null;
        }).get().filter(Boolean);
        $lnb.append(makeCrumb(active3Name, active3Href, makeSubUl(d3List, active3Name), 2));
    }

    var $navList = $('.naivgator-list');
    if ($navList.length) {
        $navList.empty().removeClass('nl-show');
        $(window).off('scroll.navList');
        if ($active2A.length) {
            var $nlUl = $('<ul>');
            var $sourceItems = $all3.length ? $all3 : $all2;
            var $activeLiRef = $all3.length ? $active3Li : $active2Li;
            $sourceItems.each(function () {
                var $a = $(this).children('a').first();
                if (!$a.length) return;
                var isActive = this === $activeLiRef[0];
                var href = $a.attr('href') || '#';
                var target = $a.attr('target') || '';
                if (href.charAt(0) === '#' && !$a.attr('onclick')) {
                    var $firstSub = $(this).find('.subLnb li a').first();
                    if ($firstSub.length) {
                        href   = $firstSub.attr('href') || href;
                        target = $firstSub.attr('target') || target;
                    }
                }
                var $link = $('<a>').attr('href', href).text(($a.find('span').text() || $a.text()).trim());
                if (target) $link.attr('target', target);
                if ($a.attr('onclick')) $link.attr('onclick', $a.attr('onclick'));
                $nlUl.append($('<li>').toggleClass('active', isActive).append($link));
            });
            if ($nlUl.children('li').length >= 2) {
                $navList.append($nlUl).addClass('nl-show');

                var headerH, nlTop, nlNatTop, nlNatLeft;

                function updateNavListGeom() {
                    headerH = $('#header #nav').outerHeight() || 0;
                    var $sc = $('.sub_content');
                    nlTop   = ($sc.length ? ($sc.offset().top - $('#container').offset().top) : 0) + 40;
                    $navList.removeClass('nl-fixed').css({ top: nlTop, left: '' });

                    nlNatTop  = $navList.offset().top;
                    nlNatLeft = $navList.offset().left;

                    $(window).trigger('scroll.navList');
                }

                $(window).off('scroll.navList').on('scroll.navList', function () {
                    if ($(window).scrollTop() + headerH >= nlNatTop) {
                        $navList.addClass('nl-fixed').css({ top: headerH, left: nlNatLeft });
                    } else {
                        $navList.removeClass('nl-fixed').css({ top: nlTop, left: '' });
                    }
                });

                updateNavListGeom();
                $(window).off('resize.navList').on('resize.navList', updateNavListGeom);
            }
        }
    }

    var $drop = $('#snbFloatingDrop');
    if (!$drop.length) {
        $drop = $('<div id="snbFloatingDrop">').appendTo('body');
    }

    var $activeLi = null;
    var closeTimer;

    function closeDrop() {
        clearTimeout(closeTimer);
        $drop.removeClass('open twocol');
        if ($activeLi) {
            $activeLi.removeClass('open').children('a').attr('aria-expanded', 'false');
            $activeLi = null;
        }
    }

    function scheduleClose() {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(closeDrop, 180);
    }

    function cancelClose() {
        clearTimeout(closeTimer);
    }

    function buildSingle($sub) {
        var $ul = $('<ul>');
        $sub.children('li').each(function () {
            var $a = $(this).find('a');
            if (!$a.length) return;
            var $link = $('<a>').attr('href', $a.attr('href')).text($a.text().trim());
            if ($a.attr('target')) $link.attr('target', $a.attr('target'));
            $ul.append(
                $('<li>')
                    .toggleClass('active', $(this).hasClass('active'))
                    .toggleClass('has-sub', $(this).hasClass('has-sub'))
                    .append($link)
            );
        });
        $drop.empty().append($ul);
    }

    function buildTwoCol() {
        var $col2 = $('<ul class="drop-col2">');

        $all2.each(function (idx) {
            var $origA = $(this).children('a');
            if (!$origA.length) return;
            var hasSub = !!$(this).find('.subLnb').length;
            var $item = $('<li>').attr('data-idx', idx)
                .toggleClass('has-sub', hasSub)
                .toggleClass('active', this === $active2Li[0]);
            var href   = $origA.attr('href') || '#';
            var target = $origA.attr('target') || '';
            if (hasSub) {
                var $firstSub = $(this).find('.subLnb li a').first();
                if ($firstSub.length) {
                    href   = $firstSub.attr('href') || href;
                    target = $firstSub.attr('target') || target;
                }
            }
            var $link = $('<a>').attr('href', href).text(($origA.find('span').text() || $origA.text()).trim());
            if (target) $link.attr('target', target);
            if ($origA.attr('onclick')) $link.attr('onclick', $origA.attr('onclick'));
            $col2.append($item.append($link));
        });

        $drop.empty().append($col2);
    }

    function openDrop($li) {
        var $sub = $li.find('.subLnb').first();
        if (!$sub.length || !$sub.children().length) return false;

        var idx = +($li.data('crumbIdx') || 0);
        $drop.attr('class', '');

        if (idx === 1 && has3depth) {
            buildTwoCol();
            $drop.addClass('twocol');
        } else {
            buildSingle($sub);
        }

        var nr = $nav[0].getBoundingClientRect();
        var lr = $li[0].getBoundingClientRect();
        $drop.css({ left: lr.left, top: nr.bottom }).addClass('open');

        if ($activeLi && $activeLi[0] !== $li[0]) {
            $activeLi.removeClass('open');
            $activeLi.children('a').attr('aria-expanded', 'false');
        }
        $activeLi = $li;
        $li.addClass('open');
        $li.children('a').attr('aria-expanded', 'true');
        return true;
    }

    // 트리거로 포커스가 돌아올 때 사용 (Escape로 닫거나, 드롭다운 마지막 항목에서 뒤로 나올 때)
    function focusTrigger($li) {
        if ($li && $li.length) $li.children('a').trigger('focus');
    }

    function onLeave(e) {
        var t = e.relatedTarget;
        if (t && ($lnb[0].contains(t) || $drop[0].contains(t))) return;
        scheduleClose();
    }

    function onFocusOut(e) {
        var t = e.relatedTarget;
        if (t && ($lnb[0].contains(t) || $drop[0].contains(t))) return;
        scheduleClose();
    }

    $lnb.on({
        mouseover: function (e) {
            var $li = $(e.target).closest('.lnb > li.dep');
            if (!$li.length) return;
            cancelClose();
            if (!$activeLi || $activeLi[0] !== $li[0]) openDrop($li);
        },
        mouseout:  onLeave,
        focusin: function (e) {
            var $li = $(e.target).closest('.lnb > li.dep');
            if (!$li.length) { closeDrop(); return; }
            cancelClose();
            if (!$activeLi || $activeLi[0] !== $li[0]) openDrop($li);
        },
        focusout: onFocusOut,
        keydown: function (e) {
            var $li = $(e.target).closest('.lnb > li.dep');
            if (!$li.length || !$activeLi || $activeLi[0] !== $li[0]) return;

            // Tab: 트리거에 포커스가 있는 상태에서 열려있는 드롭다운의 첫 항목으로 포커스 이동
            if (e.key === 'Tab' && !e.shiftKey) {
                var $firstLink = $drop.find('a').first();
                if ($firstLink.length) {
                    e.preventDefault();
                    $firstLink.trigger('focus');
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeDrop();
                focusTrigger($li);
            }
        }
    });

    $drop.on({
        mouseover: cancelClose,
        mouseout:  onLeave,
        focusin:   cancelClose,
        focusout:  onFocusOut,
        keydown: function (e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                var $trigger = $activeLi;
                closeDrop();
                focusTrigger($trigger);
                return;
            }

            // Tab: 드롭다운의 마지막 링크에서 다음으로 나가면, 처음으로 돌아가지 않고
            // snb_wrap의 다음 li(트리거)로 이동 — 그 li에 하위메뉴가 있으면 focusin에서 자동으로 열림.
            // 다음 li가 없으면(현재 snb의 마지막 항목) #snbFloatingDrop이 <body> 끝에 붙어있어
            // 브라우저 기본 탭 순서가 끊기므로, 페이지 흐름상 다음 요소인 Family Site 버튼으로 이동시킨다.
            if (e.key === 'Tab' && !e.shiftKey && $activeLi) {
                var $links = $drop.find('a');
                var isLast = $links.length && $links.last()[0] === e.target;
                if (isLast) {
                    var $nextLi = $activeLi.next('li');
                    if ($nextLi.length) {
                        e.preventDefault();
                        $nextLi.children('a').trigger('focus');
                    } else {
                        var $familySite = $('#familySiteOpen');
                        if ($familySite.length) {
                            e.preventDefault();
                            $familySite.trigger('focus');
                        }
                    }
                }
            }
        }
    });

    $(document).on('click.snbFloating', function (e) {
        if (!$(e.target).closest('#contNavi, #contNaviTop, #contNaviLeft, #snbFloatingDrop').length) closeDrop();
    });

    $(window).on('scroll.snbFloating', closeDrop).on('resize.snbFloating', closeDrop);
}


// sns 기능
function sns() {
    function setShareIcon($btn, isOpen) {
        var $i = $btn.find('i');
        if (!$i.length) return;
        $i.attr('class', isOpen ? 'ri-close-large-line' : 'ri-share-line');
    }

    $(document).on('click', '.snsBox button.btnShare', function() {
        var $btn    = $(this);
        var $more   = $btn.next('.sns_more');
        var opening = !$btn.hasClass('active');

        $btn.toggleClass('active');
        setShareIcon($btn, opening);

        if (opening) {
            var btnL  = $btn.position().left;
            var btnW  = $btn.outerWidth();
            var moreW = $more.outerWidth();
            $more.css('left', btnL + (btnW / 2) - (moreW / 2)).addClass('open');
        } else {
            $more.removeClass('open');
        }
    });

    $(document).on('click.snsClose', function(e) {
        if (!$(e.target).closest('.snsBox').length) {
            $('.snsBox button.btnShare').each(function() {
                setShareIcon($(this), false);
            });
            $('.snsBox button.btnShare').removeClass('active');
            $('.sns_more').removeClass('open');
        }
    });
}


// hash 레이어 팝업
function hash() {
    var $hashOpener = null;

    $(document).on('click', 'a.hash', function(e) {
        e.preventDefault();
        var $target = $(this.hash);
        if (!$target.length) return;
        if (!$target.parent().is('body')) {
            $target.appendTo('body');
        }
        $target.fadeIn(200);
        $target.find('a, button').first().focus();
        $hashOpener = $(this);
    });

    $(document).on('click', 'a.hashClose', function(e) {
        e.preventDefault();
        $(this.hash).fadeOut(200);
        if ($hashOpener) { $hashOpener.focus(); $hashOpener = null; }
    });

    $(document).on('keydown.hashEsc', function(e) {
        if (e.keyCode !== 27) return;
        var $open = $('.lyrPop:visible, .lyrPopup:visible');
        if (!$open.length) return;
        $open.fadeOut(200);
        if ($hashOpener) { $hashOpener.focus(); $hashOpener = null; }
    });
}


// top으로 이동
function btnTop() {
    var $btnTop = $('.btn_top');
    if (!$btnTop.length) return;

    $(window).on('scroll.btnTop', function() {
        $btnTop.toggleClass('is-visible', $(this).scrollTop() > 200);
    });

    $btnTop.on('click', function(e) {
        e.preventDefault();
        $('html, body').stop().animate({scrollTop:0}, 400);
    });
}

// Family Site 슬라이더
function familySlider() {
    var $slider = $('.familySlider');
    if (!$slider.length) return;

    $slider.slick({
        slidesToShow: 5,
        slidesToScroll: 1,
        infinite: false,
        arrows: true,
        prevArrow: $('.familyPrev'),
        nextArrow: $('.familyNext'),
        dots: false,
        autoplay: false,
        speed: 300,
        responsive: [
            {
                breakpoint: 1600,
                settings: {
                    slidesToShow: 4
                }
            },
            {
                breakpoint: 1280,
                settings: {
                    slidesToShow: 3
                }
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 2
                }
            }
        ]
    });

    $slider.on('click', '.item', function(e) {
        e.preventDefault();

        $slider.find('.item').removeClass('active');
        $(this).addClass('active');
    });
}

