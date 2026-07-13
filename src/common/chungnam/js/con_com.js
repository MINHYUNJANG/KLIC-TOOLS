 
// Tab Style 
$(function(){
	bbs_Faq();
	
	$(window).on( 'resize', function( ) {
		winW = $(window).width();
		setTimeout(function(){	
			$('ul[class^="tab_st"]').each(function(){
				if($(this).find('li').length > 2){	
					if(winW < 1184){
						$(this).parent('div').addClass('reactTab').removeClass('ov').css('height','0px');	
					}else{
						$(this).parent('div').removeClass('reactTab').css('height','auto');	
					};
				}
			});		
			
		},50);
	}).resize();
	
	
	$('ul[class^="tab_st"]').each(function(){
		$(this).find('> li.on >').attr('title','선택된페이지');
	});
	setTimeout(function(){
		$('.reactTab ul > li.on a').on('click', function(e){ 

			$reactTab = $(this).parents('.reactTab').find('ul');
			$tabBox = $(this).parents('.reactTab');
			ulHeight = $reactTab.height();	
			onHeight = $(this).parents('li').height();	
	
			if($tabBox.hasClass('ov')){
				$tabBox.removeClass('ov').stop().animate({height:'0'});
			}else{					
				$tabBox.addClass('ov').stop().animate({height:ulHeight+onHeight});
			}				
			e.preventDefault();	
		});
	},100);
});

var check = false;

$(window).resize(function() {
	this.resizeTO = setTimeout(function() {
		$(this).trigger('resizeEnd');
	}, 150 );
}).resize();

$(window).on('resizeEnd', function() {
	$w_w = $(window).innerWidth();
	resetImgZoom();
});

/** 이미지 확대보기 **/
function resetImgZoom(){
	var win_w = $(window).innerWidth();
	var zwObj =  $('.rsp_img');
	
	if(win_w<=768){
		zwObj.each(function(){
			var this_s = $(this);
			var zwObjImg = this_s.children("img");
			var zwObjUrl = zwObjImg.attr("src");

			if(check == false){
				this_s.append("<a href='" + zwObjUrl + "' class='btn-zoom' target='_blank' title='새창열림'><span class='blind'>이미지 확대보기</span></a>");
				zwObjImg.addClass("zoom");
			}
		});
		check = true;
	} else {
		zwObj.each(function(){
			var this_s = $(this);
			var zwObjImg = this_s.children("img");
			if(check == true){
				$(".btn-zoom, .btn-down", $(this).parent()).remove();
				zwObjImg.removeClass("zoom");
			}
		});
		check = false;
	}

}

// KLIC builder content interactions
(function($) {
	if (!$) return;

	var REACT_TAB_MAX = 1240;

	function getTabLabel($tab) {
		var $onLink = $tab.find('> ul > li.on > a').first();
		var $firstLink = $tab.find('> ul > li > a').first();
		var $source = $onLink.length ? $onLink : $firstLink;
		return $source.length ? $.trim($source.text()) : 'Menu';
	}

	function syncReactTabs(root) {
		var $root = root ? $(root) : $(document);
		var isReact = $(window).width() <= REACT_TAB_MAX;

		$root.find('.tab-st[class*="depth"]:not(".not-js")').each(function() {
			var $tab = $(this);
			var $ul = $tab.find('> ul').first();
			if (!$ul.length) return;

			if (isReact) {
				$tab.addClass('reactTab');
				var $select = $tab.find('> a.select').first();
				if (!$select.length) {
					$select = $('<a href="#" class="select"></a>');
					$ul.before($select);
				}
				$select.text(getTabLabel($tab));
				$tab.find('> ul > li.on').attr('title', 'selected page');
			} else {
				$tab.removeClass('reactTab');
				$tab.find('> a.select').remove();
				$ul.removeAttr('style');
			}
		});
	}

	function initBuilderContent(root) {
		syncReactTabs(root);
		$(root || document).find('.accordion-st > ul > li.on > .cntnts, .discloser-st.on > .cntnts').show();
	}

	window.KlicConComInit = initBuilderContent;

	$(initBuilderContent);

	var resizeTimer = null;
	$(window).off('resize.klicConCom').on('resize.klicConCom', function() {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(function() {
			syncReactTabs(document);
		}, 120);
	});

	$(document).off('click.klicReactTabSelect').on('click.klicReactTabSelect', '.tab-st.reactTab > a.select', function(e) {
		e.preventDefault();
		var $select = $(this);
		var $tab = $select.closest('.tab-st');
		$tab.find('> ul').stop(true, true).slideToggle(200);
		$select.toggleClass('on');
	});

	$(document).off('click.klicTabPanel').on('click.klicTabPanel', '.tab-st a[data-klic-tab-action="panel"]', function(e) {
		e.preventDefault();
		var $anchor = $(this);
		var $tab = $anchor.closest('.tab-st');
		var idx = Number($anchor.data('tabItemIdx'));
		if (isNaN(idx)) idx = $anchor.closest('li').index();

		$tab.find('> ul > li').removeClass('on');
		$anchor.closest('li').addClass('on');
		$tab.find('> a.select').text($.trim($anchor.text())).removeClass('on');
		if ($tab.hasClass('reactTab')) $tab.find('> ul').stop(true, true).slideUp(200);

		var $panel = $tab.next('.tabs-01-panel');
		if ($panel.length) {
			$panel.find('> .tabs-01-panel-item').removeClass('is-active').eq(idx).addClass('is-active');
		}
	});

	$(document).off('click.klicAccordion').on('click.klicAccordion', '.accordion-st > ul > li:not(.dis) > button.tit', function(e) {
		e.preventDefault();
		var $li = $(this).closest('li');
		var $accordion = $li.closest('.accordion-st');
		var $content = $li.find('> .cntnts');
		var isOpen = $li.hasClass('on');

		$accordion.find('> ul > li.on').not($li).removeClass('on').find('> .cntnts').stop(true, true).slideUp(200);

		if (isOpen) {
			$li.removeClass('on');
			$content.stop(true, true).slideUp(200);
		} else {
			$li.addClass('on');
			$content.stop(true, true).slideDown(250);
		}
	});

	$(document).off('click.klicDiscloser').on('click.klicDiscloser', '.discloser-st > button.tit', function(e) {
		e.preventDefault();
		var $box = $(this).closest('.discloser-st');
		var $content = $box.find('> .cntnts');
		if ($box.hasClass('on')) {
			$box.removeClass('on');
			$content.stop(true, true).slideUp(200);
		} else {
			$box.addClass('on');
			$content.stop(true, true).slideDown(250);
		}
	});
})(window.jQuery);

// FAQ : A타입 — 이벤트 위임 방식으로 동적 콘텐츠에서도 동작
$(document).off('click.concom_faq').on('click.concom_faq', '.bbs_FaqA .faq > a', function() {
	var title = $(this).parent('.faq');
	if (title.hasClass('on')) {
		title.removeClass('on').find('.faq_A').stop().slideUp();
	} else {
		$('.bbs_FaqA .faq').not(title).removeClass('on');
		$('.bbs_FaqA .faq .faq_A').stop().slideUp();
		title.addClass('on').find('.faq_A').stop().slideDown();
	}
});

function bbs_Faq(){
	// 하위 호환 — 이벤트 위임으로 전환했으므로 별도 초기화 불필요
}

