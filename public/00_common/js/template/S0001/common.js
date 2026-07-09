$(function(){
	gnb();
});

function gnb(){
	
	var $gnb = $('#gnb');        
		$depth01 = $gnb.find('.lstDep1');
		$depth02 = $gnb.find('.lstDep2'); 
		$depth01.li = $depth01.find('> li'); 

	//setting
	$depth02.find('li').each(function(){
		($(this).find('> ul').length > 0)? $(this).addClass('dep') : '';
	}); 
	$gnb.find('li').last().find('> a').addClass('lastGnb');

	$depth01.li.on('mouseover focus', function(){
		$(this).addClass('active').siblings().removeClass('active');
	}); 
	$depth01.li.on('mouseleave', function(){
		$depth01.li.removeClass('active');
	});
	
	//show 
	$('.dep > a').on('click',function(){ 
		$(this).parent().toggleClass('active').siblings().removeClass('active');
	})

	$depth01.li.find('> a').on('focus mouseover', function(){
		$gnb.addClass('active');
		$blind.stop().fadeIn();
	});
	
	//hide
	$gnb.on('mouseleave', function(){  
		gnbHide();
	});

	$(document).on('focusout', '#gnb .lastGnb', function(){
		gnbHide();
	});
			
	function gnbHide(){
		$gnb.removeClass('active').find('li').removeClass('on');    
	}
	
}
/* 2020.05.12 SY,CHo 클래스 적용으로 수정 */
$(function () {
    function check() {
        $("#menuOpen").click(function (e) {
			e.preventDefault();
            $("#mNavi").addClass("active");
        });
		
        $("#mtitle a").click(function (e) {
			e.preventDefault();
            $("#mNavi").removeClass("active");
        });		
		
		$("#mNavi #mgnb ul li ul li ul").parent("li").addClass('row');
		
		// 1차메뉴 클릭시 
		$(".dep").click(function () {
			$(this).parent().siblings().children('ul').slideUp(300);
			$(this).siblings("ul").slideToggle(300);
            return false;	
		});
		
		// 2차메뉴 클릭시 
		$(".dep2").click(function () { 
			$(this).parent().siblings().children('ul').slideUp(300);
			$(this).siblings("ul").slideToggle(300);
			$(this).parent('li').toggleClass("on");
			$(this).parent().siblings("li").removeClass('on');
            return false;	
		});
		
		// 검색
		$("#searchOpen").click(function (e) {
			e.preventDefault();
            $("#mSearch").addClass("active");
        });
        $(".btnSearchClose").click(function (e) {
			e.preventDefault();
            $("#mSearch").removeClass("active");
        });		
    }
		
    $(window).resize(function () {
		var winWidth = $(window).width();
		if (winWidth > 1024) {
            $("#mNavi").removeClass("active");
		}		
    });
	
	check();
	
	// 맨위로 가기
	$('.btn_top').hide();
	$(window).scroll(function(){
		if($(this).scrollTop() > 200){
			$('.btn_top').fadeIn();
		}else{
			$('.btn_top').fadeOut();
		}
	});
	$('.btn_top').click(function(e){
		e.preventDefault();
		$('html, body').stop().animate({scrollTop:0}, 400);
	});

	/* footer 링크 */
    $('#baseLink a').not('.blank').click(function(ev) {
        ev.preventDefault();
        var url = $(this).attr('href');
        $('#floatLink').hide();
    });
	
    $('.footBtn button, .footer_link button').click(function() {
        $(this).next().slideToggle(300);
    });
});
 


	