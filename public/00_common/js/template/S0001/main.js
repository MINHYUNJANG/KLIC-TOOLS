$(document).ready(function(){
	if ($('#m_visual > li').length > 1) {
		var mVisualSlider = $('#m_visual').bxSlider({
			auto: true,
			autoControls: true,
			autoDelay: 3000
		});
		$('.main_visual a.bx-stop').click(function(){	
			$(this).css('display','none');
			$('.main_visual a.bx-start').css('display','block');
			mVisualSlider.stopAuto();
		});
		$('.main_visual a.bx-start').click(function(){	
			$(this).css('display','none');
			$('.main_visual a.bx-stop').css('display','block');
			mVisualSlider.startAuto(); 
		});
		$('.main_visual a').focusin(function(){
			mVisualSlider.stopAuto();
		});
	}
 
	//팝업 리스트보기
	$("#Pop_ListOpen").click(function (e) {
		e.preventDefault();
		$(".pop_layer_box").css("display", "block");
	});
	$("#Pop_ListClose").click(function (e) {
		e.preventDefault();
		$(".pop_layer_box").css("display", "none");
	}); 	
	
	//공지사항 탭
	$("div[class*='notice'] h2 a").on("click", function(e){
		$(this).parent("h2").siblings(".list_box").removeClass('on');
	    $(this).parent("h2").siblings().find('a').removeClass('current');
	    $(this).parent("h2").next('.list_box').addClass('on');
		$(this).addClass('current');
		e.preventDefault();
	});
	
	//팝업존
	var total_index = $('.pop_img li').length;
	$('.nss_pg  .total').text(total_index);

	var mySlider =  $('.pop_img').bxSlider({
		auto: true,
		autoDelay: 3000,
		controls :false,
		touchEnabled : (navigator.maxTouchPoints > 0),
		autoControls :false,
		pager :false,
		onSlideAfter: function($slideElement, oldIndex, newIndex) {
			var current_index = parseInt(newIndex + 1); 

			if(current_index > 8){
			$('.nss_pg  .now').text(current_index);
			}else{
			$('.nss_pg  .now').text( current_index);
			};
		}
		});
	$('.nss_pg').children('.prev').on("click", function(){
		// 이전 슬라이드 배너로 이동된다.
		mySlider.goToPrevSlide();
		// <a>의 링크를 차단한다.
		return false;
	});
	$('.nss_pg').children('.next').on("click", function(){
		// 이전 슬라이드 배너로 이동된다.
		mySlider.goToNextSlide();
		// <a>의 링크를 차단한다.
		return false;
	});

	$(window).on('load reszie',function(){
		var display = $('.pop3025 .nss_pg a').css('display'); 
	
		$('.nss_pg').children('.stop').click(function(){
			$(this).css('display','none');
			$('.nss_pg').children('.play').css('display',display);
			mySlider.stopAuto(); 
		});
		$('.nss_pg').children('.play').click(function(){
			$(this).css('display','none');
			$('.nss_pg').children('.stop').css('display',display);
			mySlider.startAuto(); 
		});

	});
	
});


$(window).on("load resize", function () {
	setTimeout(function () { thumbResize(); }); //이미지비율조정
});

//thumbResize
var thumbResize = function () {
	var divs = document.querySelectorAll('div[class*="gallery"] .img');
	for (var i = 0; i < divs.length; ++i) {
		var div = divs[i];
		var divAspect = div.offsetHeight / div.offsetWidth;
		div.style.overflow = 'hidden';

		var img = div.querySelector('div[class*="gallery"] .img > img');
		var imgAspect = img.height / img.width;

		if (imgAspect <= divAspect) {
			// 이미지가 div보다 납작한 경우 세로를 div에 맞추고 가로는 잘라낸다
			var imgWidthActual = div.offsetHeight / imgAspect;
			var imgWidthToBe = div.offsetHeight / divAspect;
			var marginLeft = -Math.round((imgWidthActual - imgWidthToBe) / 2)
			img.style.cssText = 'width: auto;height:100%;';
		} else {
			// 이미지가 div보다 길쭉한 경우 가로를 div에 맞추고 세로를 잘라낸다
			img.style.cssText = 'width:100%; height:auto;';
		}
	}
}

//배너존
$(function(){
	var bnSlider =  $('.banner_zone ul').bxSlider({
		auto: true, 
		autoDelay: 3000,
		pager: false,
		controls :false,
		minSlides: 5,
		maxSlides: 5,
		moveSlides: 1,
		slideWidth: 200,
		onSliderLoad: function(){ 
			$(".bx-clone").find("a").prop("tabindex","-1"); 
		}, 
		onSlideAfter: function(){ 
			$(".banner_zone").children("li").each(function(){ 
				if($(this).attr("aria-hidden") == "false"){ 
					$(this).find("a").attr("tabindex","0"); 
				}else{ 
					$(this).find("a").attr("tabindex","-1"); 
				} 
			}); 
		} 
	}); 
	$('.banner_zone .btn').children('.prev').on("click", function(){ 
		bnSlider.goToPrevSlide(); 
		return false;
	});
	$('.banner_zone .btn').children('.next').on("click", function(){ 
		bnSlider.goToNextSlide();
		return false;
	});
	$('.banner_zone .btn').children('.stop').click(function(){
		$(this).css('display','none');
		$('.banner_zone .btn').children('.play').css('display','block').focus();
		bnSlider.stopAuto(); 
	});
	$('.banner_zone .btn').children('.play').click(function(){
		$(this).css('display','none');
		$('.banner_zone .btn').children('.stop').css('display','block').focus();
		bnSlider.startAuto(); 
	});

	//배너존 접근성
	$('.banner_zone a').on('focus',function(){
		bnSlider.stopAuto();
	}); 
	
	//배너존 반응형
	$(window).on('load resize',function(){
		if($(window).width() <= 800 && $(window).width() > 580){ 
			bnSlider.reloadSlider({
				auto: true, 
				autoDelay: 3000,
				pager: false,
				controls :false,
				minSlides: 3,
				maxSlides: 3,
				moveSlides: 1,
				slideWidth: 200
			}); 
		}else if($(window).width() <= 580 && $(window).width() > 380){ 
			bnSlider.reloadSlider({
				auto: true, 
				autoDelay: 3000,
				pager: false,
				controls :false,
				minSlides: 2,
				maxSlides: 2,
				moveSlides: 1,
				slideWidth: 200
			});  
		}else if($(window).width() <= 380 && $(window).width() > 200){ 
			bnSlider.reloadSlider({
				auto: true, 
				autoDelay: 3000,
				pager: false,
				controls :false,
				minSlides: 1,
				maxSlides: 1,
				moveSlides: 1,
				slideWidth: 200
			});  
		}else{ 
			bnSlider.reloadSlider({
				auto: true, 
				autoDelay: 3000,
				pager: false,
				controls :false,
				minSlides: 5,
				maxSlides: 5,
				moveSlides: 1,
				slideWidth: 200,
				onSliderLoad: function(){ 
					$(".bx-clone").find("a").prop("tabindex","-1"); 
				}, 
				onSlideAfter: function(){ 
					$(".banner_zone").children("li").each(function(){ 
						if($(this).attr("aria-hidden") == "false"){ 
							$(this).find("a").attr("tabindex","0"); 
						}else{ 
							$(this).find("a").attr("tabindex","-1"); 
						} 
					}); 
				} 
			});  
		}
	});

});