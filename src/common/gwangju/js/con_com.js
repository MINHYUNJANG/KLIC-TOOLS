 
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

	// box-05 등 빌더 콘텐츠의 아이콘(.ico[data-ico])을 채우는 SVG 맵
	// content-common.js(빌더용) ICO_SVG_MAP과 동일한 데이터를 사용자 화면(con_com.js)에도 적용
	var ICO_SVG_MAP = {
		'ico-box1': '<svg width="50" height="57" viewBox="0 0 50 57" fill="none"><g clip-path=""><path d="M35.6 55.4799H14.25L19.78 43.3599H30.07L35.6 55.4799Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M48.59 40.8198C48.59 42.7498 47.03 44.3098 45.1 44.3098H4.74C2.81 44.3098 1.25 42.7498 1.25 40.8198V8.57984C1.25 6.64984 2.81 5.08984 4.74 5.08984H45.1C47.03 5.08984 48.59 6.64984 48.59 8.57984V40.8198Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M12.6396 36.1997H37.1996" class="stroke-primary" stroke-width="2.5"/><path d="M36.8502 13.18C36.8502 19.77 31.5102 25.11 24.9202 25.11C18.3302 25.11 12.9902 19.77 12.9902 13.18C12.9902 6.59 18.3302 1.25 24.9202 1.25C31.5102 1.25 36.8502 6.59 36.8502 13.18Z" class="stroke-accent fill-white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.7305 13.2798L23.7705 17.3198L30.1105 9.0498" class="fill-white"/><path d="M19.7305 13.2798L23.7705 17.3198L30.1105 9.0498" class="stroke-accent" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip0_79_18487"><rect width="49.84" height="56.73" fill="white"/></clipPath></defs></svg>',
		'ico-box2': '<svg width="50" height="51" viewBox="0 0 50 51" fill="none"><g clip-path=""><path d="M22.22 1.25H1.25V48.86H22.22V1.25Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M14.47 6.5H9V20.85H14.47V6.5Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M11.7402 30.3101V37.3101" class="stroke-primary" stroke-width="2.5"/><path d="M48.4397 1.25H27.4697V48.86H48.4397V1.25Z" class="stroke-accent fill-white" stroke-width="2.5" stroke-linejoin="round"/><path d="M40.6897 6.5H35.2197V20.85H40.6897V6.5Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M37.9502 30.3101V37.3101" class="stroke-primary" stroke-width="2.5"/></g><defs><clipPath id="clip0_79_19949"><rect width="49.69" height="50.11" fill="white"/></clipPath></defs></svg>',
		'ico-box3': '<svg width="52" height="55" viewBox="0 0 52 55" fill="none"><g clip-path=""><path d="M35.89 52.8399H16L19.14 41.4399H32.75L35.89 52.8399Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M50.64 39.18C50.64 40.7 49.41 41.92 47.9 41.92H3.99C2.48 41.92 1.25 40.69 1.25 39.18V3.99C1.25 2.48 2.48 1.25 3.99 1.25H47.89C49.4 1.25 50.63 2.48 50.63 3.99V39.18H50.64Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M17.3398 18.04H10.5898V32.01H17.3398V18.04Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M29.4002 11.25H22.6602V32.01H29.4002V11.25Z" class="stroke-accent fill-white" stroke-width="2.5" stroke-linejoin="round"/><path d="M41.4697 15.3999H34.7197V32.0099H41.4697V15.3999Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/></g><defs><clipPath id="clip0_79_18515"><rect width="51.89" height="54.09" fill="white"/></clipPath></defs></svg>',
		'ico-box4': '<svg width="54" height="43" viewBox="0 0 54 43" fill="none"><g clip-path=""><path d="M1.57 1.25H21.81C24.43 1.25 26.55 3.1 26.55 5.39V36.86C26.55 34.57 24.43 32.72 21.81 32.72H1.57C1.46 32.72 1.36 32.73 1.25 32.73V1.26C1.36 1.26 1.46 1.25 1.57 1.25Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M51.5496 1.25H31.3096C28.6896 1.25 26.5596 3.1 26.5596 5.39V36.86C26.5596 34.57 28.6896 32.72 31.3096 32.72H51.5496C51.6596 32.72 51.7596 32.73 51.8696 32.73V1.26C51.7496 1.26 51.6496 1.25 51.5496 1.25Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M8.03027 7.9502H15.0203" class="stroke-primary" stroke-width="2.5"/><path d="M8.03027 14.6001H15.0203" class="stroke-primary" stroke-width="2.5"/><path d="M8.03027 21.2402H15.0203" class="stroke-primary" stroke-width="2.5"/><path d="M38.0898 7.9502H45.0798" class="stroke-accent" stroke-width="2.5"/><path d="M38.0898 14.6001H45.0798" class="stroke-accent" stroke-width="2.5"/><path d="M38.0898 21.2402H45.0798" class="stroke-accent" stroke-width="2.5"/><path d="M0.0595703 41.2402H53.0596" class="stroke-primary" stroke-width="2.5"/></g><defs><clipPath id="clip0_78_2251"><rect width="53.11" height="42.49" fill="white"/></clipPath></defs></svg>',
		'ico-box5': '<svg width="51" height="50" viewBox="0 0 51 50" fill="none"><g clip-path=""><path d="M49.34 45.5001C49.34 46.8501 48.12 47.9401 46.63 47.9401H3.97C2.47 47.9401 1.25 46.8401 1.25 45.5001V19.2701C1.25 17.9201 2.47 16.8301 3.97 16.8301H46.63C48.13 16.8301 49.34 17.9301 49.34 19.2701V45.5001Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M35.0296 47.95H25.2896H15.5596V27.09V11.23L25.2896 1.75L35.0296 11.23V27.09V47.95Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M25.2899 25.1502C27.2892 25.1502 28.9099 23.5294 28.9099 21.5302C28.9099 19.5309 27.2892 17.9102 25.2899 17.9102C23.2907 17.9102 21.6699 19.5309 21.6699 21.5302C21.6699 23.5294 23.2907 25.1502 25.2899 25.1502Z" class="stroke-accent fill-white" stroke-width="2.5"/><path d="M22.1299 32.0898H28.4599" class="stroke-primary" stroke-width="2.5"/></g><defs><clipPath id="clip0_78_2270"><rect width="50.59" height="49.2" fill="white"/></clipPath></defs></svg>',
		'ico-box6': '<svg width="53" height="58" viewBox="0 0 53 58" fill="none"><g clip-path=""><path d="M42.9402 44.5199V30.7299C42.9402 21.5499 35.5002 14.1099 26.3202 14.1099C17.1402 14.1099 9.7002 21.5499 9.7002 30.7299V44.5199" class="fill-tertiary"/><path d="M42.9402 44.5199V30.7299C42.9402 21.5499 35.5002 14.1099 26.3202 14.1099C17.1402 14.1099 9.7002 21.5499 9.7002 30.7299V44.5199" class="stroke-primary" stroke-width="2.5"/><path d="M23.8602 21.1602C19.9402 21.1602 16.7402 24.3502 16.7402 28.2702L23.8602 21.1602Z" class="fill-tertiary"/><path d="M23.8602 21.1602C19.9402 21.1602 16.7402 24.3502 16.7402 28.2702" class="stroke-primary" stroke-width="2.5"/><path d="M51.39 54.0301C51.39 48.9701 47.29 44.8701 42.22 44.8701H10.41C5.35 44.8701 1.25 48.9701 1.25 54.0301V56.2401H51.39V54.0301Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M26.3193 0V7.49" class="stroke-accent" stroke-width="2.5"/><path d="M10.4697 4.25L14.2097 10.73" class="stroke-accent" stroke-width="2.5"/><path d="M38.4297 10.73L42.1697 4.25" class="stroke-accent" stroke-width="2.5"/></g><defs><clipPath id="clip0_78_2279"><rect width="52.64" height="57.5" fill="white"/></clipPath></defs></svg>',
		'ico-box7': '<svg width="51" height="50" viewBox="0 0 51 50" fill="none"><g clip-path=""><path d="M39.83 5.29004H44.72C45.02 5.29004 45.31 5.32004 45.59 5.38004C45.87 5.44004 46.14 5.52004 46.4 5.63004C46.66 5.74004 46.91 5.87004 47.14 6.03004C47.37 6.19004 47.58 6.36004 47.78 6.56004C47.98 6.76004 48.16 6.97004 48.31 7.20004C48.47 7.43004 48.6 7.68004 48.71 7.94004C48.82 8.20004 48.91 8.47004 48.96 8.75004C49.02 9.03004 49.05 9.32004 49.05 9.62004V13.87V18.11V22.35V26.6V30.84V35.09V39.33V43.58C49.05 43.88 49.02 44.17 48.96 44.45C48.9 44.73 48.82 45 48.71 45.26C48.6 45.52 48.47 45.77 48.31 46C48.16 46.23 47.98 46.45 47.78 46.64C47.58 46.84 47.37 47.01 47.14 47.17C46.91 47.33 46.66 47.46 46.4 47.57C46.14 47.68 45.87 47.76 45.59 47.82C45.31 47.88 45.02 47.91 44.72 47.91H39.83H34.94H30.05H25.16H20.27H15.38H10.49H5.58C5.28 47.91 4.99 47.88 4.71 47.82C4.43 47.76 4.16 47.68 3.9 47.57C3.64 47.46 3.39 47.33 3.16 47.17C2.93 47.02 2.72 46.84 2.52 46.64C2.32 46.44 2.15 46.23 1.99 46C1.83 45.77 1.7 45.52 1.59 45.26C1.48 45 1.39 44.73 1.34 44.45C1.28 44.17 1.25 43.88 1.25 43.58V39.33V35.09V30.84V26.6V22.35V18.11V13.87V9.62004C1.25 9.32004 1.28 9.03004 1.34 8.75004C1.4 8.47004 1.48 8.19004 1.59 7.94004C1.7 7.67004 1.83 7.43004 1.99 7.20004C2.15 6.97004 2.32 6.76004 2.52 6.56004C2.72 6.36004 2.93 6.18004 3.16 6.03004C3.39 5.87004 3.64 5.74004 3.9 5.63004C4.16 5.52004 4.43 5.44004 4.71 5.38004C4.99 5.32004 5.28 5.29004 5.58 5.29004H10.47" class="fill-tertiary"/><path d="M39.83 5.29004H44.72C45.02 5.29004 45.31 5.32004 45.59 5.38004C45.87 5.44004 46.14 5.52004 46.4 5.63004C46.66 5.74004 46.91 5.87004 47.14 6.03004C47.37 6.19004 47.58 6.36004 47.78 6.56004C47.98 6.76004 48.16 6.97004 48.31 7.20004C48.47 7.43004 48.6 7.68004 48.71 7.94004C48.82 8.20004 48.91 8.47004 48.96 8.75004C49.02 9.03004 49.05 9.32004 49.05 9.62004V13.87V18.11V22.35V26.6V30.84V35.09V39.33V43.58C49.05 43.88 49.02 44.17 48.96 44.45C48.9 44.73 48.82 45 48.71 45.26C48.6 45.52 48.47 45.77 48.31 46C48.16 46.23 47.98 46.45 47.78 46.64C47.58 46.84 47.37 47.01 47.14 47.17C46.91 47.33 46.66 47.46 46.4 47.57C46.14 47.68 45.87 47.76 45.59 47.82C45.31 47.88 45.02 47.91 44.72 47.91H39.83H34.94H30.05H25.16H20.27H15.38H10.49H5.58C5.28 47.91 4.99 47.88 4.71 47.82C4.43 47.76 4.16 47.68 3.9 47.57C3.64 47.46 3.39 47.33 3.16 47.17C2.93 47.02 2.72 46.84 2.52 46.64C2.32 46.44 2.15 46.23 1.99 46C1.83 45.77 1.7 45.52 1.59 45.26C1.48 45 1.39 44.73 1.34 44.45C1.28 44.17 1.25 43.88 1.25 43.58V39.33V35.09V30.84V26.6V22.35V18.11V13.87V9.62004C1.25 9.32004 1.28 9.03004 1.34 8.75004C1.4 8.47004 1.48 8.19004 1.59 7.94004C1.7 7.67004 1.83 7.43004 1.99 7.20004C2.15 6.97004 2.32 6.76004 2.52 6.56004C2.72 6.36004 2.93 6.18004 3.16 6.03004C3.39 5.87004 3.64 5.74004 3.9 5.63004C4.16 5.52004 4.43 5.44004 4.71 5.38004C4.99 5.32004 5.28 5.29004 5.58 5.29004H10.47" class="stroke-primary" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.2598 5.29004H25.1498H30.0498" class="fill-tertiary"/><path d="M20.2598 5.29004H25.1498H30.0498" class="stroke-primary" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5098 1.25V9.6" class="stroke-primary" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M34.7998 1.25V9.6" class="stroke-primary" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.67969 17.3799H48.0497" class="stroke-primary" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M32.5103 39.0501L31.7103 34.3901C31.7103 34.3901 34.8503 31.2801 34.9903 31.1401C36.6203 29.5501 36.3103 27.9801 34.3903 27.4301L29.2003 26.6801L26.9403 22.1101C25.9003 20.4001 24.3903 20.4001 23.3403 22.1101L21.0803 26.6801L15.8903 27.4301C13.9703 27.9801 13.6603 29.5501 15.2903 31.1401C15.4303 31.2801 18.5703 34.3901 18.5703 34.3901L17.7703 39.0501C17.4503 41.3901 18.9003 42.3801 21.0703 41.2401C21.2703 41.1401 25.1203 39.1601 25.1203 39.1601C25.1203 39.1601 28.9803 41.1401 29.1703 41.2401C31.3803 42.3801 32.8303 41.3901 32.5103 39.0501Z" class="stroke-accent fill-white" stroke-width="2.5"/></g><defs><clipPath id="clip0_78_2341"><rect width="50.31" height="49.16" fill="white"/></clipPath></defs></svg>',
		'ico-box8': '<svg width="43" height="56" viewBox="0 0 43 56" fill="none"><g clip-path=""><path d="M35.2103 34.9501C42.9203 27.2401 42.9203 14.7401 35.2103 7.03006C27.5003 -0.679941 15.0003 -0.679941 7.29031 7.03006C-0.419687 14.7401 -0.419687 27.2401 7.29031 34.9501L21.2503 48.9001L35.2103 34.9501Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M27.9803 19.8699C27.9803 23.5899 24.9703 26.5999 21.2603 26.5999C17.5403 26.5999 14.5303 23.5899 14.5303 19.8699C14.5303 16.1599 17.5403 13.1499 21.2603 13.1499C24.9703 13.1399 27.9803 16.1599 27.9803 19.8699Z" class="stroke-accent fill-white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1.25 54.1001H41.25" class="stroke-accent" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip0_78_2335"><rect width="42.5" height="55.35" fill="white"/></clipPath></defs></svg>',
		'ico-box9': '<svg width="53" height="50" viewBox="0 0 53 50" fill="none"><g clip-path=""><path d="M18.21 48.4C16.32 48.4 13.67 47.3 12.33 45.97L3.68 37.32C2.34 35.98 1.25 33.34 1.25 31.44V4.69C1.25 2.8 2.8 1.25 4.69 1.25H38.12C40.01 1.25 41.56 2.8 41.56 4.69V44.96C41.56 46.85 40.01 48.4 38.12 48.4H18.21Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M11.3296 34.8799C13.2196 34.8799 14.7696 36.4299 14.7696 38.3199V44.9499C14.7696 46.8399 13.6796 47.2999 12.3296 45.9599L3.67957 37.3099C2.33957 35.9699 2.79957 34.8799 4.68957 34.8799H11.3296Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M51.65 21.12C51.65 27.71 46.31 33.05 39.72 33.05C33.13 33.05 27.79 27.71 27.79 21.12C27.79 14.53 33.13 9.18996 39.72 9.18996C46.31 9.17996 51.65 14.53 51.65 21.12Z" class="stroke-accent fill-tertiary" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M34.5303 21.21L38.5603 25.25L44.9103 16.98" class="fill-tertiary"/><path d="M34.5303 21.21L38.5603 25.25L44.9103 16.98" class="stroke-accent" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.55957 12.25H13.5596" class="stroke-primary" stroke-width="2.5"/><path d="M6.55957 22.25H13.5596" class="stroke-primary" stroke-width="2.5"/></g><defs><clipPath id="clip0_78_2366"><rect width="52.9" height="49.65" fill="white"/></clipPath></defs></svg>',
		'ico-box10': '<svg width="47" height="49" viewBox="0 0 47 49" fill="none"><g clip-path=""><path d="M44.93 1.25H1.25V34.23H44.93V1.25Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M19.3398 11.3599L30.3998 17.7399L19.3398 24.1299V11.3599Z" class="stroke-accent fill-white" stroke-width="2.5"/><path d="M0 43.96H15.87" class="stroke-accent" stroke-width="2.5"/><path d="M23.3604 43.96H46.1804" class="stroke-accent" stroke-width="2.5"/><path d="M23.3597 43.9601C23.3597 45.9301 21.7597 47.5201 19.7897 47.5201C17.8197 47.5201 16.2197 45.9201 16.2197 43.9601C16.2197 41.9901 17.8197 40.3901 19.7897 40.3901C21.7597 40.4001 23.3597 42.0001 23.3597 43.9601Z" class="stroke-accent fill-white" stroke-width="2.5"/></g><defs><clipPath id="clip0_79_18496"><rect width="46.18" height="48.78" fill="white"/></clipPath></defs></svg>',
		'ico-box11': '<svg width="56" height="47" viewBox="0 0 56 47" fill="none"><g clip-path=""><path d="M23.1602 18.17H15.9902V6.32C15.9902 3.52 18.2602 1.25 21.0702 1.25H48.7202C51.5202 1.25 53.7902 3.52 53.7902 6.32V25.35C53.7902 28.15 51.5202 30.42 48.7202 30.42H43.1402V42.09L30.8302 30.42H26.5502V21.56C26.5502 19.69 25.0302 18.17 23.1602 18.17Z" class="stroke-primary fill-white" stroke-width="2.5" stroke-linejoin="round"/><path d="M4.65 18.1699H23.16C25.03 18.1699 26.56 19.6899 26.56 21.5699V34.2999C26.56 36.1799 25.04 37.6999 23.16 37.6999H16.62L8.39 45.5099V37.6999H4.65C2.77 37.6999 1.25 36.1799 1.25 34.2999V21.5599C1.25 19.6899 2.77 18.1699 4.65 18.1699Z" class="stroke-primary fill-tertiary" stroke-width="2.5" stroke-linejoin="round"/><path d="M43.15 9.7002H35.54" class="stroke-accent" stroke-width="2.5"/><path d="M43.15 17.5601H35.54" class="stroke-accent" stroke-width="2.5"/></g><defs><clipPath id="clip0_79_18506"><rect width="55.03" height="46.76" fill="white"/></clipPath></defs></svg>',
		'ico-box12': '<svg width="54" height="51" viewBox="0 0 54 51" fill="none"><g clip-path=""><path d="M47.5198 44.0501C47.5198 45.4701 46.3698 46.6301 44.9398 46.6301H8.6298C7.2098 46.6301 6.0498 45.4801 6.0498 44.0501V11.4101C6.0498 9.99008 7.1998 8.83008 8.6298 8.83008H44.9398C46.3598 8.83008 47.5198 9.98008 47.5198 11.4101V44.0501Z" class="stroke-primary fill-tertiary" stroke-width="2.5"/><path d="M1.25 41.4199V44.8799C1.25 47.3199 3.23 49.2899 5.66 49.2899H47.91C50.35 49.2899 52.32 47.3099 52.32 44.8799V41.4199H1.25Z" class="stroke-primary fill-white" stroke-width="2.5"/><path d="M36.0803 1.25H19.0803C16.8703 1.25 15.0703 3.04 15.0703 5.26V16.41C15.0703 18.62 16.8603 20.42 19.0803 20.42H23.8403V27.89L30.1403 20.42H36.0703C38.2803 20.42 40.0703 18.63 40.0703 16.41V5.26C40.0903 3.04 38.2903 1.25 36.0803 1.25Z" class="stroke-accent fill-tertiary" stroke-width="2.5"/><path d="M23.1006 7.4502H32.0706" class="stroke-accent fill-tertiary" stroke-width="2.5"/><path d="M23.1006 13H32.0706" class="stroke-accent fill-tertiary" stroke-width="2.5"/></g><defs><clipPath id="clip0_63_7054"><rect width="53.58" height="50.54" fill="white"/></clipPath></defs></svg>'
	};

	function renderIcoSvg(root) {
		$(root || document).find('.ico[data-ico]').each(function() {
			var $ico = $(this);
			var icoId = $ico.attr('data-ico');
			var svg = ICO_SVG_MAP[icoId];
			if (svg && !$ico.children('svg').length) {
				$ico.html(svg);
			}
		});
	}

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
		renderIcoSvg(root);
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

