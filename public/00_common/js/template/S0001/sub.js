
$(document).ready(function(){
	// 라인맵
	var LINEMAP = (function(){
		var $btn = $('.box_line_map_2 > a'),
			$winWid = $(window).width();
		$btn.bind('click',function(){
			var $this = $(this),
				$target = $this.next('.box_snb_1'),
				$all_target = $target.closest('.box_line_map_1').find('.box_snb_1');
			if ($target.hasClass('on')){
				$target.removeClass('on').stop().animate({ maxHeight : '0' },function(){
					var $this = $(this);
					$this.css('display','none');
				});
			} else {
				$all_target.removeClass('on').stop().animate({ maxHeight : '0' },function(){
					var $this = $(this);
					$this.css('display','none');
				});
				$target.addClass('on').stop().css('display','block').animate({ maxHeight : '562px' });
			}
			return false;
		});
	}());
});


$(function () {
    navCtl();
});

	
function navCtl() { 
    var sideLink = $('.sideNavi a'); 
	var current = $.trim($('#location strong').text());
	  
	$('.sideNavi li').each(function(e){
		if($(this).find('ul').length > 0){
			$(this).addClass("dep");
		}		
	});	

   sideLink.each(function() {
         if ($(this).text() == current) {
                $(this).addClass('lock');
                if ( $(this).parent().parent().size() > 0) {
                    $(this).parent().parent().prev('a').addClass('lock').next().slideToggle();
                    $(this).parent().parent().prev('a').addClass('on');
                }
                $(this).parents('.sideNavi').prev().addClass('on');
         }
    });
   sideLink.on('click',function(e) {
        if ($(this).next('ul').size() > 0) {
            e.preventDefault();  
            $(this).toggleClass('on').next().slideToggle();
        } 
    });  
}


//sns
$(function () {
    $('.snsBox button.btnShare').click(function() {
        $(this).next().stop().slideToggle(300);
    });

});

// document ready
$(function(){
	listsList();
	faqList();
});

// 리스트
function listsList(){
	$('.listDetail .view > a').off('click');
	$('.listDetail .view > a').on('click' , function(){
		var title = $(this).parent('.view');
		if (title.hasClass('on')){
			$(".listDetail .view").removeClass("on");
		} else {
			title.addClass("on");
			$(".listDetail .view").not(title).removeClass("on");
		}
	});
}
// 자주묻는질문(FAQ)
function faqList(){
	$('.faqDetail .faq > a').off('click');
	$('.faqDetail .faq > a').on('click' , function(){
		var title = $(this).parent('.faq');
		if (title.hasClass('on')){
			$(".faqDetail .faq").removeClass("on");
		} else {
			title.addClass("on");
			$(".faqDetail .faq").not(title).removeClass("on");
		}
	});
}
