$(function() {
  gnb();
  snb();

  //js로딩 후
  setTimeout(function() {
    $('html').addClass('shOn');
  }, 100);
});

function gnb() {

  var $nav = $('#nav');
  $gnb = $('#gnb');
  $blind = $('#blind')
  $w_Check = $gnb.find('.depWidth');
  $depth01 = $gnb.find('.depth01');
  $depth02 = $gnb.find('.depth02');
  $depth03 = $gnb.find('.depth03');
  $w_Check.li = $w_Check.find('> ul > li');
  $depth01.li = $depth01.find('> ul > li');
  $depth02.li = $depth02.find('> ul > li');
  $depth03.li = $depth03.find('> ul > li');
  defaultHeight = $depth01.li.innerHeight();

  //setting
  $gnb.find('li').each(function() {
    ($(this).find('> div').length > 0) ? $(this).addClass('dep'): '';
  });
  $gnb.find('li').last().find('> a').addClass('lastGnb');
  var count = $w_Check.li.length;
  $w_Check.li.css('width', 100 / count + '%');

  //show
  $(document).on('click', '.depth02 li.dep > a', function() {
    $(this).parent('li').toggleClass('active');
  });
  $depth01.find('> ul > li > a').on('focus mouseover', function() {
    $(this).parent().addClass('on').siblings().removeClass();
  });

  $depth01.li.find('> a').on('focus mouseover', function() {
    $gnb.addClass('active');
    $blind.stop().fadeIn();
  });

  //hide
  $gnb.on('mouseleave', function() {
    gnbHide();
  });

  $(document).on('focusout', '#gnb .lastGnb', function() {
    gnbHide();
  });

  function gnbHide() {
    $gnb.removeClass('active').find('li').removeClass('on');
    $blind.stop().fadeOut(100);
    ($nav.hasClass('oneDown') == true) ? $depth02.li.removeClass('active'): '';
  }
}

/* 2020.05.12 SY,CHo 클래스 적용으로 수정 */
$(function() {
  function check() {
    $("#menuOpen").click(function(e) {
      e.preventDefault();
      $("#mNavi").addClass("active");
      $('html, body').scrollTop(0);
    });

    $("#mtitle a").click(function(e) {
      e.preventDefault();
      $("#mNavi").removeClass("active");
    });

    //하위 메뉴 없을 경우
    $("#mNavi #mgnb ul li ul").parent("li").addClass('row');
    $("#mNavi #mgnb ul li.row > a").attr("href", "#none");

    // 하위 메뉴 있는 경우 클릭시 
    $("#mNavi #mgnb ul li.row > a").click(function() {
      $(this).parent().siblings().children('ul').slideUp(300);
      $(this).siblings("ul").slideToggle(300);
      return false;
    });

    // 검색
    $("#searchOpen").click(function(e) {
      e.preventDefault();
      $("#mSearch").addClass("active");
    });
    $(".btnSearchClose").click(function(e) {
      e.preventDefault();
      $("#mSearch").removeClass("active");
    });
  }

  $(window).resize(function() {
    var winWidth = $(window).width();
    if (winWidth > 1024) {
      $("#mNavi").removeClass("active");
    }
  });

  check();

  // 맨위로 가기
  $('.btn_top').hide();
  $(window).scroll(function() {
    if ($(this).scrollTop() > 200) {
      $('.btn_top').fadeIn();
    } else {
      $('.btn_top').fadeOut();
    }
  });
  $('.btn_top').click(function(e) {
    e.preventDefault();
    $('html, body').stop().animate({
      scrollTop: 0
    }, 400);
  });
});


// 서브메뉴  
function snb() {
  var snb = $('#snb .dep01');
  snb.find('li').each(function() {
    if ($(this).find('ul').length > 0) {
      $(this).addClass('dep');
    }
    if ($(this).hasClass('active') == true) {
      var active = $(this).clone().removeAttr('id');
      $(this).after(active).next().removeClass('active').find('ul').remove();
    }
  });
  snb.find('.active:last').parent().addClass('mobSnb');
  snb.find('li.active > a').on('click', function() {
    var $ul = $(this).parent().parent();
    if ($ul.hasClass('open') == true) {
      $ul.removeClass('open');
    } else {
      $('#snb').find('ul.open').removeClass('open');
      $ul.addClass('open');
    }
  });
  $(document).on('click', '#snb li.active > a', function(e) {
    console.log(1);
    e.preventDefault();
  });

  var delta = 100;
  var timer = null;
  $(window).on('resize', function() {
    clearTimeout(timer);
    if ($(window).width() > 1024 || $(window).width() < 1024) {
      timer = setTimeout(resizeDone, delta);
    }
  });

  function resizeDone() {
    snb.removeClass('open').find('ul').removeClass('open');
  }
}


//sns
$(function() {
  $('.snsBox button.btnShare').click(function() {
    $(this).next().stop().slideToggle(300);
  });

});