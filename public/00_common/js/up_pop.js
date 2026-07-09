$(function() {
  //Slide 
  var upPopSlide = $('#upPopSlide').bxSlider({
    auto: true,
    autoControls: true,
    moveSlides: 1,
    autoDelay: 3000,
    maxSlides: 2,
    minSlides: 2,
    slideWidth: 600,
    slideMargin: 110,
	//nfiniteLoop: false,
    pager: false,
    onSliderLoad: function(currentIndex) {
      $('.count').text(currentIndex + 1 + ' / ' + $('#upPopSlide > li:not(.bx-clone)').length);
      $(".bx-clone").find("a").prop("tabIndex","-1");
    },
    onSlideBefore: function($slideElement, oldIndex, newIndex) {
      $('.count').text(newIndex + 1 + ' / ' + $('#upPopSlide > li:not(.bx-clone)').length);
    },
    onSlideAfter: function() {
	    $("#upPopSlide").children("li").each(function() {
	        if ($(this).attr("aria-hidden") == "false") {
	            $(this).find("a").attr("tabIndex", "0");
	        } else {
	            $(this).find("a").attr("tabIndex", "-1");
	        }
	    });
	}
  });

  //Slide responsive
  $(window).on('load resize', function() {
    var slideCount;
    var slideWidth;

    if ($(window).width() < 1200) {
      slideCount = 1;
      slideWidth = 1024;
    } else {
      slideCount = 2;
      slideWidth = 650;
    }

    upPopSlide.reloadSlider({
      auto: true,
      autoControls: true,
      moveSlides: 1,
      autoDelay: 3000,
      maxSlides: slideCount,
      minSlides: slideCount,
      slideWidth: slideWidth,
	  //infiniteLoop: false,
      pager: false,
      onSliderLoad: function(currentIndex) {
        $('.count').text(currentIndex + 1 + ' / ' + $('#upPopSlide > li:not(.bx-clone)').length);
        $(".bx-clone").find("a").prop("tabIndex","-1");
      },
      onSlideBefore: function($slideElement, oldIndex, newIndex) {
        $('.count').text(newIndex + 1 + ' / ' + $('#upPopSlide > li:not(.bx-clone)').length);
      },
      onSlideAfter: function() {
		    $("#upPopSlide").children("li").each(function() {
		        if ($(this).attr("aria-hidden") == "false") {
		            $(this).find("a").attr("tabIndex", "0");
		        } else {
		            $(this).find("a").attr("tabIndex", "-1");
		        }
		    });
		}
    });
  });
  $('.up_pop a').focusin(function() {
    upPopSlide.stopAuto();
  });

    //pop active 240409 
  $('.popBtn').on('click', function() {
    if ($('#wrap').hasClass('openPop')) {
      $('#wrap').removeClass('openPop');
		$('.popBtn').prop('title','팝업영역 열기');
    } else {
      $('#wrap').addClass('openPop');
		$('.popBtn').prop('title','팝업영역 닫기');
    }
  });
	$(window).on('load', function() {
		if ($('#wrap').hasClass('openPop')) {
		$('.popBtn').prop('title','팝업영역 닫기');
    } else {
		$('.popBtn').prop('title','팝업영역 열기');
    }
	});

	/* common.js로 대체
	$('.pop_close').on('click',function(){ 
	    $('#wrap').removeClass('openPop'); 
	})
	*/
});