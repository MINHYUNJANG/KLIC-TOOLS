<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>

<script>
    $(document).ready(function() {
        $("#con_com_box > div").hide(); // Initially hide all content
        $("#tabs li:first").attr("id","current"); // Activate first tab
        $("#con_com_box > div:first").fadeIn(); // Show first tab content
        
        $('#tabs a').click(function(e) {
            e.preventDefault();        
            $("#con_com_box > div").hide(); //Hide all content
            $("#tabs li").attr("id",""); //Reset id's
            $(this).parent().attr("id","current"); // Activate this
            $('#' + $(this).attr('title')).fadeIn(); // Show content for current tab
        });
    });

    function codeCopy(btn) {
        const text = $(btn).closest('.badge').next('textarea').val();
        const $icon = $(btn).find('i');

        navigator.clipboard.writeText(text).then(function () {
            $icon.fadeOut(150, function () {
            $icon.removeClass('ri-file-copy-line').addClass('ri-check-line').fadeIn(150);

            setTimeout(function () {
                    $icon.fadeOut(150, function () {
                    $icon.removeClass('ri-check-line').addClass('ri-file-copy-line').fadeIn(150);
                });
            }, 1000);
            });
        });
    }
</script>

<style>
    .Guide_con{ color: #000; line-height: 1.5;}
    .Guide_con .titWrap h3:not(.tit-st){ font-size: 2rem; font-weight: 800; line-height: 1; color: var(--color-primary);}
    .Guide_con h4:not(.tit-st){ font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;}
    .Guide_con h4:not(.tit-st):after{ content:"\EA4E"; display: inline-block; margin-left: 0.5rem; font-family: 'remixicon'; }
    .Guide_con h5:not(.tit-st){ position:relative; padding-left: 0.7rem; margin-bottom: 0.25rem; font-size: 0.85rem; font-weight: 700;}
    .Guide_con h5:not(.tit-st):before{ content:""; position:absolute; left: 0; top: 0.5rem; width: 0.2rem; height: 0.2rem; border-radius: 50%; background: #000;}
    .Guide_con * + h4:not(.tit-st),
    .Guide_con * + h5:not(.tit-st){ margin-top: 2rem;}

    .Guide_con section{ word-break: keep-all;}
    .Guide_con section + section{ padding-top: 2.5rem; margin-top: 2.5rem; border-top:1px solid #ccc;}
    .Guide_con article + article{ padding-top: 2rem; margin-top: 2rem; border-top:1px solid #ddd;}
    
    .Guide_con section .titWrap{ display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;}
    .Guide_con section .titWrap p{ margin-top: 1rem; font-weight: 500;}
    .Guide_con section .contents{ flex: 1; min-width: 0px;}
    .Guide_con section .contents textarea{ width: 100%; height: auto; border: 0; margin: 0.5rem 0; padding: 1rem; background:#f8f8f8; border-radius: var(--box-radius);}
    .Guide_con section .contents .sub + .sub{ margin-top: 0.5rem; }
    .Guide_con section .contents .box-st .sub{ min-height: 4rem; margin-top: 0.5rem; padding-left: 0.5rem; border-left: 2px solid #777;}
    .Guide_con section .contents .box-st > img{ display: inline-block; margin: 4px 10px;}
    .Guide_con section .color-list{ display: flex; gap: 0.5rem; justify-content: start;}
    .Guide_con section .color-list li{ text-align: center; font-size: 13px; font-weight: 500; }
    .Guide_con section .color-list li p{ width: 4.4rem; height: 4.4rem; display: flex; align-items: center; justify-content: center; margin-top: 0.25rem;}

    /* gray color */
    .Guide_con section .color-list li.c_000 p{ background:#000; color: #fff;}
    .Guide_con section .color-list li.c_333 p{ background:#333; color: #fff;}
    .Guide_con section .color-list li.c_555 p{ background:#555; color: #fff;}
    .Guide_con section .color-list li.c_CCC p{ border: 1px solid var(--color-gray-line); }
    .Guide_con section .color-list li.c_DDD p{ border: 1px solid var(--color-gray-line-ligth); }
    .Guide_con section .color-list li.c_f5 p{ background:var(--color-gray-bg); }

    /* Core Color */
    .Guide_con section .color-list.core strong{ display: block; margin-bottom: 1rem; font-size: 0.8rem; text-align: center; line-height: 1.5rem; color:#fff; font-weight: 700; background:#000;}
    .Guide_con section .color-list.core li{ border: 1px solid #000; padding: 0.25rem; font-weight: 700;}
    .Guide_con section .color-list.core p{ color:#fff; font-weight: 400;}
    .Guide_con section .color-list.core p:not(:last-of-type){ margin-bottom: 1rem;}
    .Guide_con section .color-list.core .c_Purple .c_pri{ background:#4400D3; }
    .Guide_con section .color-list.core .c_Purple .c_sec{ background:#8A5CEA; }
    .Guide_con section .color-list.core .c_Purple .c_ter{ background:#F6F2FF; color:#000; }
    .Guide_con section .color-list.core .c_Purple .c_acc{ background:#C0066B; }
    .Guide_con section .color-list.core .c_Blue .c_pri{ background:#0046C8; }
    .Guide_con section .color-list.core .c_Blue .c_sec{ background:#0095FF; }
    .Guide_con section .color-list.core .c_Blue .c_ter{ background:#EDF7FF; color:#000; }
    .Guide_con section .color-list.core .c_Blue .c_acc{ background:#E56C01; }
    .Guide_con section .color-list.core .c_Green .c_pri{ background:#0d4514; }
    .Guide_con section .color-list.core .c_Green .c_sec{ background:#169139; }
    .Guide_con section .color-list.core .c_Green .c_ter{ background:#EAF6EC; color:#000; }
    .Guide_con section .color-list.core .c_Green .c_acc{ background:#ffd900; color:#000; }
    .Guide_con section .color-list.core .c_Navy .c_pri{ background:#030460; }
    .Guide_con section .color-list.core .c_Navy .c_sec{ background:#0078b5; }
    .Guide_con section .color-list.core .c_Navy .c_ter{ background:#EBF8FE; color:#000; }
    .Guide_con section .color-list.core .c_Navy .c_acc{ background:#78B800; }
    .Guide_con section .color-list.core .c_Mint .c_pri{ background:#13A39C; }
    .Guide_con section .color-list.core .c_Mint .c_sec{ background:#2CC3C8; }
    .Guide_con section .color-list.core .c_Mint .c_ter{ background:#E4FBFB; color:#000; }
    .Guide_con section .color-list.core .c_Mint .c_acc{ background:#1B2A41; }
    .Guide_con section .color-list.core .c_Red .c_pri{ background:#13A39C; }
    .Guide_con section .color-list.core .c_Red .c_sec{ background:#2CC3C8; }
    .Guide_con section .color-list.core .c_Red .c_ter{ background:#E4FBFB; color:#000; }
    .Guide_con section .color-list.core .c_Red .c_acc{ background:#1B2A41; }
    .Guide_con section .color-list.core .c_Orange .c_pri{ background:#E56C01; }
    .Guide_con section .color-list.core .c_Orange .c_sec{ background:#FF973C; }
    .Guide_con section .color-list.core .c_Orange .c_ter{ background:#FFF4EA; color:#000; }
    .Guide_con section .color-list.core .c_Orange .c_acc{ background:#003DAD; }
    .Guide_con section .color-list.core .c_Yellow .c_pri{ background:#f5a100; color:#000; }
    .Guide_con section .color-list.core .c_Yellow .c_sec{ background:#ffd25b; color:#000; }
    .Guide_con section .color-list.core .c_Yellow .c_ter{ background:#FFFAEB; color:#000; }
    .Guide_con section .color-list.core .c_Yellow .c_acc{ background:#013d59; }

    /* System Color */
    .Guide_con section .color-list li.c_Dgr p{ background: var(--color-dgr); color: #fff;}
    .Guide_con section .color-list li.c_Warn p{ background: var(--color-warn); color: #fff;}
    .Guide_con section .color-list li.c_Suc p{ background: var(--color-suc); color: #fff;}
    .Guide_con section .color-list li.c_info p{ background: var(--color-info); color: #fff;}

    /* box column */
    .Guide_con section .col-wrap{ display: flex; flex-wrap: wrap; gap: 2rem; }
    .Guide_con section .col-wrap.col-2 .inr{ width: calc((100% - 2rem)/2); }
    .Guide_con section .col-wrap.col-4 .inr{ width: calc((100% - 6rem)/4); }
    .Guide_con section .ex_ico{ display: flex; gap: 2rem; margin-top: 2rem; flex-wrap: wrap; align-items: center;}

    /* box badge */
    .Guide_con section .badge{ display: flex; gap: 0.5rem; margin-top: 1.5rem; align-items: center;}
    .Guide_con section .badge > span{ min-width: 3rem; text-align: center; display: inline-block; padding: 0 0.75rem; border-radius: 1rem; line-height: 1.5rem; font-size: 0.75rem; font-weight: 600; background: #eee; }
    .Guide_con section .badge > button{ border-radius: 1rem; line-height: 1.5rem; padding: 0 0.5rem;}

    /* toast */
    #copyToast{ display: none; position: fixed; left: 50%; top: 50%; border-radius: var(--box-radius); background:var(--color-secondary); color:#fff; padding: 0.5rem 1rem; transform: translate(-50%, -50%); box-shadow: 0 0 5px rgba(0,0,0,0.5);}

    @media screen and (max-width: 1024px){
        .Guide_con section .col-wrap{ flex-direction: column;}
        .Guide_con section .col-wrap .inr{ width: 100% !important;}
    } 
    
    @media screen and (max-width: 768px){
        .Guide_con section .titWrap{ flex-direction: column; align-items: start; gap: 0;}
    }

</style>

<div class="Guide_con">

    <!-- 여기부터 -->
    <div id="con_com_box">

        <section id="cntnsColor">
            <!-- COLOR -->
            <div class="titWrap">
                <h3>Color</h3>
                <p>색상에 대한 전반적인 설명을 작성합니다.</p>
            </div>

            <div class="contents">
                <article>
                    <h4>Gray Color</h4>
                    <p class="sub">Gray Color은 주요 UI 요소와 조화를 이루는 중립적인 색상으로 주로 폰트(타이틀, 텍스트 등), 구분선, 배경색에 사용합니다.</p>
                    <div class="box-st basic">
                        <ul class="color-list">
                            <li class="c_000">#000000<p>폰트배경색</p></li>
                            <li class="c_333">#333333<p>폰트배경색</p></li>
                            <li class="c_555">#555555<p>폰트배경색</p></li>
                            <li class="c_CCC">#CCCCCC<p>구분선</p></li>
                            <li class="c_DDD">#DDDDDD<p>구분선</p></li>
                            <li class="c_f5">#F5F5F5<p>배경색</p></li>
                        </ul>
                    </div>
                </article>

                <article>
                    <h4>Core Color</h4>
                    <p class="sub">Core Color은 브랜드 아이덴티티를 드러내고 주요 UI를 강조합니다. </p>
                    <p class="sub">Primary는 가장 중요한 대표 색상, Secondary·Tertiary는 보조 역할, Accent는 딱 눈길을 끌 포인트로 들어갑니다.</p>
                    <p class="sub">Core Color는 브랜드와 규모 등을 고려하여 같은 톤 계열, 보색대비, 중립 보조로 정의하여 일관성 있게 적용해 봅니다.</p>
                    <div class="box-st basic">
                        <ul class="color-list core">
                            <li class="c_Purple"><strong>Purple</strong>
                                Primary<p class="c_pri">#4400D3</p>
                                Secondary<p class="c_sec">#8A5CEA</p>
                                Tertiary<p class="c_ter">#F6F2FF</p>
                                Accent<p class="c_acc">#C0066B</p>
                            </li>
                            <li class="c_Blue"><strong>Blue</strong>
                                Primary<p class="c_pri">#0046C8</p>
                                Secondary<p class="c_sec">#0095FF</p>
                                Tertiary<p class="c_ter">#EDF7FF</p>
                                Accent<p class="c_acc">#E56C01</p>
                            </li>
                            <li class="c_Green"><strong>Green</strong>
                                Primary<p class="c_pri">#0d4514</p>
                                Secondary<p class="c_sec">#169139</p>
                                Tertiary<p class="c_ter">#EAF6EC</p>
                                Accent<p class="c_acc">#ffd900</p>
                            </li>
                            <li class="c_Navy"><strong>Navy</strong>
                                Primary<p class="c_pri">#030460</p>
                                Secondary<p class="c_sec">#0078b5</p>
                                Tertiary<p class="c_ter">#EBF8FE</p>
                                Accent<p class="c_acc">#78B800</p>
                            </li>
                            <li class="c_Mint"><strong>Mint</strong>
                                Primary<p class="c_pri">#13A39C</p>
                                Secondary<p class="c_sec">#2CC3C8</p>
                                Tertiary<p class="c_ter">#E4FBFB</p>
                                Accent<p class="c_acc">#1B2A41</p>
                            </li>
                            <!-- <li class="c_Red"><strong>Red</strong>
                                Primary<p class="c_pri">#C7007E</p>
                                Secondary<p class="c_sec">#E93CAA</p>
                                Tertiary<p class="c_ter">#FFEEEF</p>
                                Accent<p class="c_acc">#C0066B</p>
                            </li> -->
                            <li class="c_Orange"><strong>Orange</strong>
                                Primary<p class="c_pri">#E56C01</p>
                                Secondary<p class="c_sec">#FF973C</p>
                                Tertiary<p class="c_ter">#FFF4EA</p>
                                Accent<p class="c_acc">#003DAD</p>
                            </li>
                            <!-- <li class="c_Yellow"><strong>Yellow</strong>
                                Primary<p class="c_pri">#f5a100</p>
                                Secondary<p class="c_sec">#ffd25b</p>
                                Tertiary<p class="c_ter">#FFFAEB</p>
                                Accent<p class="c_acc">#013d59</p>
                            </li> -->
                        </ul>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span></p>
                    <textarea>
<html lang="ko" data-theme="default"></html>
                    </textarea>

                    <p class="bu-st1">data-theme에 테마 값 부여 시, 전체 일괄 변경됨</p>
                    <p class="bu-st1">default 색상 : purple</p>
                    <p class="bu-st1">테마 색상 CSS : theme.css</p>
                    <!-- code -->
                </article>

                <article>
                    <h4>System Color</h4>
                    <p class="sub">System Color은 사용자가 바로 이해해야하는 정보 (성공/실패/주의/안내)를 직관적으로 전달합니다.</p>
                    <div class="box-st basic">
                        <ul class="color-list">
                            <li class="c_Dgr">Danger<p>#E43030</p></li>
                            <li class="c_Warn">Warning<p>#F8910D</p></li>
                            <li class="c_Suc">Sucess<p>#00995E</p></li>
                            <li class="c_info">Information<p>#2067D5</p></li>
                        </ul>
                    </div>
                </article>
            </div>
            <!-- //COLOR -->
        </section>

        <section id="cntnsTitle">
            <!-- TITLE -->
            <div class="titWrap">
                <h3>Title</h3>
                <p>타이틀에 대한 전반적인 설명을 작성합니다.</p>
            </div>
            
            <div class="contents">
                <article>
                    <h4>Section Title</h4>
                    <p class="sub">섹션 타이틀 입니다.  페이지의 주요 주제를 나타내는 데 사용하며, 반드시 콘텐츠 구조 상 최상위에 위치해야 합니다.</p>
                    <p class="sub">Pretendard, Bold, 32px, #000, line-height:150%</p>
                    <div class="box-st basic">
                        <h3 class="tit-st section">섹션 타이틀</h3>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<h3 class="tit-st section">섹션 타이틀</h3>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Contents Title</h4>
                    <p class="sub">콘텐츠 타이틀 입니다. 반드시 섹션 타이틀 하위에 사용해야 합니다. 섹션 타이틀 없이 단독으로 사용 할 수 없습니다.</p>
                    <p class="sub">Pretendard, Bold, 24px, #Main_col, line-height:150%</p>
                    <div class="box-st basic">
                        <h4 class="tit-st contents">콘텐츠 타이틀</h4>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<h4 class="tit-st contents">콘텐츠 타이틀</h4>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Unit Title</h4>
                    <p class="sub">유닛 타이틀 입니다. 유닛 단위의 타이틀로 사용 합니다.</p>
                    <p class="sub">Pretendard, Bold, 20px, #000, line-height:150%</p>
                    <div class="box-st basic">
                        <h5 class="tit-st unit">유닛 타이틀</h5>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<h5 class="tit-st unit">유닛 타이틀</h5>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Item Title</h4>
                    <p class="sub">아이템 타이틀은 사용을 지양하며, label, dt과 동일하게 사용한다.</p>
                    <p class="sub">Pretendard, SemiBold, 17px, #000, line-height:150%</p>
                    <div class="box-st basic">
                        <h6 class="tit-st item">아이템 타이틀</h6>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<h6 class="tit-st item">아이템 타이틀</h6>
                    </textarea>
                    <!-- code -->
                </article>
            </div>
            <!-- //TITLE -->
        </section>

        <section id="cntnsTxt">
            <!-- TEXT -->
            <div class="titWrap">
                <h3>Text</h3>
                <p>본문 텍스트에 대한 전반적인 설명을 작성합니다.</p>
            </div>
            
            <div class="contents">
                <article>
                    <h4>Lead Paragraph</h4>
                    <p class="sub">리드 텍스트 입니다. 섹션이나 콘텐츠 영역에서 구체적인 주제나 강조하는 문장이 필요할 시 사용합니다.</p>
                    <p class="sub">font-size:19px; font-weight:medium; color:#000; line-height:150%;</p>
                    <div class="box-st basic">
                        <p class="txt-st laed">섹션이나 콘텐츠의 리드 텍스트 입니다.</p>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<p class="txt-st laed">섹션이나 콘텐츠의 리드 텍스트 입니다.</p>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Paragraph</h4>
                    <p class="sub">본문 텍스트를 담는 가장 일반적인 블록 요소입니다.</p>
                    <p class="sub">font-size:18px; font-weight:regular; color:#333; line-height:150%;</p>
                    <div class="box-st basic">
                        <p class="txt-st">본문 텍스트 입니다. </p>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<p class="txt-st">본문 텍스트 입니다. </p>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Text Bullet</h4>
                    <p class="sub">단순 블릿 체계</p>
                    <p class="sub">리스트 형식이 아닌 본문의 비계층적 구조에 사용합니다.</p>
                    <div class="box-st basic">
                        <p class="bu-st1">텍스트 입니다. 텍스트 입니다. 텍스트 입니다. </p>
                        <p class="bu-st2">텍스트 입니다. 텍스트 입니다. 텍스트 입니다. </p>
                        <p class="bu-st3">텍스트 입니다. 텍스트 입니다. 텍스트 입니다. </p>
                        <p class="bu-st4">텍스트 입니다. 텍스트 입니다. 텍스트 입니다. </p>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<p class="bu-st1">텍스트 입니다. 텍스트 입니다. 텍스트 입니다. </p>
<p class="bu-st2">텍스트 입니다. 텍스트 입니다. 텍스트 입니다. </p>
<p class="bu-st3">텍스트 입니다. 텍스트 입니다. 텍스트 입니다. </p>
<p class="bu-st4">텍스트 입니다. 텍스트 입니다. 텍스트 입니다. </p>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Unordered List</h4>
                    <p class="sub">텍스트 순서없는 목록 1~4차</p>
                    <p class="sub">목록은 ul 안에 ul을 포함하여 계층적 구조를 표현하며, 들여쓰기로 구분합니다. 각 단계는 상위 항목의 세부 항목으로 이해합니다.</p>
                    <div class="box-st basic"> 
                        <ul class="bu-st1 list">
                            <li>텍스트 순서없는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:150%; 텍스트 순서없는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:150%;
                            </li>
                            <li>텍스트 순서없는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:150%; 텍스트 순서없는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:150%;
                                <ul class="bu-st2 list">
                                    <li>텍스트 순서없는 목록 2차 입니다. font-size:18px; font-weight:regular; color:#444; line-height:150%; 텍스트 순서없는 목록 2차 입니다. font-size:18px; font-weight:regular; color:#444; line-height:150%;
                                        <ul class="bu-st3 list">
                                            <li>텍스트 순서없는 목록 3차 입니다. font-size:18px; font-weight:regular; color:#444; line-height:150%; 텍스트 순서없는 목록 3차 입니다. font-size:18px; font-weight:regular; color:#444; line-height:150%; 
                                                <ul class="bu-st4 list">
                                                    <li>텍스트 순서 없는 목록 4차 입니다. font-size:17px; font-weight: regular; color:#555; line-height:150%; 텍스트 순서 없는 목록 4차 입니다. font-size:17px; font-weight: regular; color:#555; line-height:150%;</li>
                                                    <li>텍스트 순서 없는 목록 4차 입니다. font-size:17px; font-weight: regular; color:#555; line-height:150%; </li>
                                                </ul>
                                            </li>
                                        </ul>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<ul class="bu-st1 list">
    <li>텍스트 순서없는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:150%; 텍스트 순서없는 목록 1차 입니다.
        font-size:18px; font-weight:regular; color:#333; line-height:150%;
    </li>
    <li>텍스트 순서없는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:150%; 텍스트 순서없는 목록 1차 입니다.
        font-size:18px; font-weight:regular; color:#333; line-height:150%;
        <ul class="bu-st2 list">
            <li>텍스트 순서없는 목록 2차 입니다. font-size:18px; font-weight:regular; color:#444; line-height:150%; 텍스트 순서없는 목록 2차
                입니다. font-size:18px; font-weight:regular; color:#444; line-height:150%;
                <ul class="bu-st3 list">
                    <li>텍스트 순서없는 목록 3차 입니다. font-size:18px; font-weight:regular; color:#444; line-height:150%; 텍스트 순서없는
                        목록 3차 입니다. font-size:18px; font-weight:regular; color:#444; line-height:150%;
                        <ul class="bu-st4 list">
                            <li>텍스트 순서 없는 목록 4차 입니다. font-size:17px; font-weight: regular; color:#555; line-height:150%;
                                텍스트 순서 없는 목록 4차 입니다. font-size:17px; font-weight: regular; color:#555; line-height:150%;
                            </li>
                            <li>텍스트 순서 없는 목록 4차 입니다. font-size:17px; font-weight: regular; color:#555; line-height:150%;
                            </li>
                        </ul>
                    </li>
                </ul>
            </li>
        </ul>
    </li>
</ul>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Ordered List</h4>
                    <p class="sub">텍스트 순서있는 목록 1~2차</p>
                    <p class="sub">목록은 ol 안에 ol을 포함하여 계층적 구조를 표현하며, 들여쓰기로 구분합니다. 각 단계는 상위 항목의 세부 항목으로 이해합니다.</p>
                    <div class="box-st basic">
                        <ul class="order-st1">
                            <li><span class="mrk">A</span>텍스트 순서있는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:auto; 텍스트 순서있는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:150%; 
                                <ul class="order-st2">
                                    <li><span class="mrk">01</span>텍스트 순서있는 목록 2차 입니다. font-size:17px; font-weight: regular; color:#444; line-height:150%; 텍스트 순서있는 목록 2차 입니다. font-size:17px; font-weight: regular; color:#444; line-height:150%;</li>
                                    <li><span class="mrk">02</span>텍스트 순서있는 목록 2차 입니다. font-size:17px; font-weight: regular; color:#444; line-height:150%; 텍스트 순서있는 목록 2차 입니다. font-size:17px; font-weight: regular; color:#444; line-height:150%;</li>
                                </ul>
                            </li>
                            <li><span class="mrk">B</span>텍스트 순서있는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:auto; 텍스트 순서있는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:150%; </li>
                        </ul>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<ul class="order-st1">
    <li><span class="mrk">A</span>텍스트 순서있는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:auto; 텍스트 순서있는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:150%; 
        <ul class="order-st2">
            <li><span class="mrk">01</span>텍스트 순서있는 목록 2차 입니다. font-size:17px; font-weight: regular; color:#444; line-height:150%; 텍스트 순서있는 목록 2차 입니다. font-size:17px; font-weight: regular; color:#444; line-height:150%;</li>
            <li><span class="mrk">02</span>텍스트 순서있는 목록 2차 입니다. font-size:17px; font-weight: regular; color:#444; line-height:150%; 텍스트 순서있는 목록 2차 입니다. font-size:17px; font-weight: regular; color:#444; line-height:150%;</li>
        </ul>
    </li>
    <li><span class="mrk">B</span>텍스트 순서있는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:auto; 텍스트 순서있는 목록 1차 입니다. font-size:18px; font-weight:regular; color:#333; line-height:150%; </li>
</ul>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Text Link</h4>
                    <p class="sub">텍스트에 링크하는 경우 아래와 같이 사용합니다.</p>
                    <div class="box-st basic">
                        <p>텍스트에 새창 링크하는 경우에는 이렇게 사용합니다. <a href="" target="_blank" title="새창" class="txt-st link">텍스트 <i class="ri-external-link-line" aria-hidden="true"></i></a></p>
                        <p>텍스트에 다운로드 링크의 경우에는 이렇게 사용합니다. <a href="" title="다운로드" class="txt-st link">다운로드 <i class="ri-download-2-line" aria-hidden="true"></i></a></p>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<p>텍스트에 새창 링크하는 경우에는 이렇게 사용합니다. <a href="" target="_blank" title="새창" class="txt-st link">텍스트 <i class="ri-external-link-line" aria-hidden="true"></i></a></p>
<p>텍스트에 다운로드 링크의 경우에는 이렇게 사용합니다. <a href="" title="다운로드" class="txt-st link">다운로드 <i class="ri-download-2-line" aria-hidden="true"></i></a></p>
                    </textarea>
                    <!-- code -->
                </article>
            </div>
            <!-- //TEXT -->
        </section>

        <section id="cntnsBox">
            <!-- BOX -->
            <div class="titWrap">
                <h3>Box</h3>
                <p>콘텐츠 내에서 특정 부분을 강조하거나 단락을 구분할 필요가 있을 때 사용합니다. 박스 내 타이틀 사용은 지양합니다.</p>
            </div>
            
            <div class="contents">
                <article>
                    <h4>Basic Box</h4>
                    <p class="sub">기본 박스입니다.</p>
                    <p class="sub">border:1px solid #ccc; padding:20px 30px; Gap:8px;</p>
                    <div class="box-st basic">
                        <div class="box-st basic">
                            기본박스입니다
                        </div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<div class="box-st basic">
    기본박스입니다
</div>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Emphasis Box</h4>
                    <p class="sub">강조 박스입니다.</p>
                    <p class="sub">border:1px solid #Main col; padding:20px 30px; Gap:8px;</p>
                    <div class="box-st basic">
                        <div class="box-st emp">
                            강조 박스입니다
                        </div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<div class="box-st emp">
    강조 박스입니다
</div>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>info Box</h4>
                    <p class="sub">정보성 컨텐츠 박스입니다.</p>
                    <p class="sub">background:#Tertiary col; padding:20px 30px; Gap:8px;</p>
                    <div class="box-st basic">
                        <div class="box-st info">
                            정보성 박스입니다
                        </div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<div class="box-st info">
    정보성 박스입니다
</div>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Image Box</h4>
                    <p class="sub">이미지를 감싸는 박스가 필요할 때 사용합니다.</p>
                    <p class="sub">작은 해상도의 화면에서는 이미지 확대보기 버튼이 나타나, 클릭시 이미지 새창으로 이동합니다.</p>
                    <p class="sub">border:1px solid #ccc; padding:40px; Text-align:center;</p>
                    <div class="box-st basic">
                        <div class="box-st img rsp_img ac">
                            <img src="/common/images/con_com/img_temp.png" alt="임시 이미지">
                        </div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<div class="box-st img rsp_img ac">
    <img src="/common/images/con_com/img_temp.png" alt="임시 이미지">
</div>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Intro Box</h4>
                    <p class="sub">인트로 박스는 반드시 페이지의 최상위에 위치해야 합니다.</p>
                    <div class="box-st basic">
                        <div class="box-st info intro">
                            <p class="ico" data-ico="ico-box1" aria-hidden="true"></p>
                            <div class="inner">
                                <h4 class="tit-st">인트로박스 타이틀</h4>
                                <p class="txt-st lead">인트로박스 리드 텍스트 입니다. 타이틀 없이 최상단에 작성도 가능합니다. </p>
                                <p>인트로박스 본문 입니다. 기본 텍스트 스타일과 동일하게 사용합니다.</p>
                            </div>
                        </div>

                        <div class="ex_ico">
                            <p class="ico" data-ico="ico-box1" aria-hidden="true"></p>
                            <p class="ico" data-ico="ico-box2" aria-hidden="true"></p>
                            <p class="ico" data-ico="ico-box3" aria-hidden="true"></p>
                            <p class="ico" data-ico="ico-box4" aria-hidden="true"></p>
                            <p class="ico" data-ico="ico-box5" aria-hidden="true"></p>
                            <p class="ico" data-ico="ico-box6" aria-hidden="true"></p>
                            <p class="ico" data-ico="ico-box7" aria-hidden="true"></p>
                            <p class="ico" data-ico="ico-box8" aria-hidden="true"></p>
                            <p class="ico" data-ico="ico-box9" aria-hidden="true"></p>
                            <p class="ico" data-ico="ico-box10" aria-hidden="true"></p>
                            <p class="ico" data-ico="ico-box11" aria-hidden="true"></p>
                        </div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea rows="10">
<div class="box-st info intro">
    <p class="ico" data-ico="ico-box1" aria-hidden="true"></p>
    <div class="inner">
        <h4 class="tit-st">인트로박스 타이틀</h4>
        <p class="txt-st lead">인트로박스 리드 텍스트 입니다. 타이틀 없이 최상단에 작성도 가능합니다. </p>
        <p>인트로박스 본문 입니다. 기본 텍스트 스타일과 동일하게 사용합니다.</p>
    </div>
</div>

--- 아이콘 종류 ---
<div class="ex_ico">
    <p class="ico" data-ico="ico-box1" aria-hidden="true"></p>
    <p class="ico" data-ico="ico-box2" aria-hidden="true"></p>
    <p class="ico" data-ico="ico-box3" aria-hidden="true"></p>
    <p class="ico" data-ico="ico-box4" aria-hidden="true"></p>
    <p class="ico" data-ico="ico-box5" aria-hidden="true"></p>
    <p class="ico" data-ico="ico-box6" aria-hidden="true"></p>
    <p class="ico" data-ico="ico-box7" aria-hidden="true"></p>
    <p class="ico" data-ico="ico-box8" aria-hidden="true"></p>
    <p class="ico" data-ico="ico-box9" aria-hidden="true"></p>
    <p class="ico" data-ico="ico-box10" aria-hidden="true"></p>
    <p class="ico" data-ico="ico-box11" aria-hidden="true"></p>
</div>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Info Box</h4>
                    <p class="sub">본문 내 특정 메시지나 주의사항을 시각적으로 구분하여 제공하는 보조 정보 영역입니다.</p>
                    <p class="sub">페이지 상단에 위치하는 박스와는 달리, 본문 콘텐츠 중간에 삽입되어 맥락에 맞는 정보를 사용자에게 전달합니다.</p>
                    <div class="box-st basic">
                        <h5>Single Info Box</h5>
                        <div class="box-st info slim">
                            <p class="txt-st info">콘텐츠 중간에 사용자의 이해를 돕기 위해 안내 내용을 제공할 때 활용됩니다. </p>
                        </div>
                        <p class="sub">페이지 중간 영역에서 특정 정보나 알림을 짧게 표시할 때 사용</p>

                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea>
<div class="box-st info slim">
    <p class="txt-st info">콘텐츠 중간에 사용자의 이해를 돕기 위해 안내 내용을 제공할 때 활용됩니다. </p>
</div>
                        </textarea>
                        <!-- code -->
                        
                        <h5>Multiple Info Box</h5>
                        <div class="box-st info slim">
                            <p class="tit-st txt-st info">인포박스 타이틀</p>
                            <p class="txt-st indent">본문 내 특정 메시지나 주의사항을 시각적으로 구분하여 제공하는 보조 정보 영역이다.</p>
                            <p class="line-dot"></p>
                            <ul class="bu-st1 list">
                                <li>텍스트 순서없는 목록 1차 입니다.
                                    <ul class="bu-st2 list">
                                        <li>텍스트 순서없는 목록 2차 입니다. 
                                            <ul class="bu-st3 list">
                                                <li>텍스트 순서없는 목록 3차 입니다. 
                                                    <ul class="bu-st4 list">
                                                        <li>텍스트 순서 없는 목록 4차 입니다. </li>
                                                    </ul>
                                                </li>
                                            </ul>
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                        <p class="sub">페이지 중간에서 세부 정보나 주의사항을 정리해 제공할 때 사용</p>

                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea>
 <div class="box-st info slim">
    <p class="tit-st txt-st info">인포박스 타이틀</p>
    <p class="txt-st indent">본문 내 특정 메시지나 주의사항을 시각적으로 구분하여 제공하는 보조 정보 영역이다.</p>
    <p class="line-dot"></p>
    <ul class="bu-st1 list">
        <li>텍스트 순서없는 목록 1차 입니다.
            <ul class="bu-st2 list">
                <li>텍스트 순서없는 목록 2차 입니다. 
                    <ul class="bu-st3 list">
                        <li>텍스트 순서없는 목록 3차 입니다. 
                            <ul class="bu-st4 list">
                                <li>텍스트 순서 없는 목록 4차 입니다. </li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        </li>
    </ul>
</div>
                        </textarea>
                        <!-- code -->
                    </div>
                </article>
            </div>
            <!-- //BOX -->
        </section>

        <section id="cntnsTabMenu">
            <!-- Tab Menu -->
            <div class="titWrap">
                <h3>Tab Menu</h3>
                <p>콘텐츠 최상단에 위치하며 4차와 5차 메뉴를 탭으로 출력할때 사용합니다.</p>
            </div>
            
            <div class="contents">
                <article>
                    <p class="sub">콘텐츠 탭은 단일 구조로 하고, 세부 내용은 탭 콘텐츠 안에서 박스 구분 / 소제목 / 아코디언 등으로 작성합니다.</p>
                    <div class="box-st basic">
                        <div class="tab-st depth01">
                            <ul>
                                <li class="on"><a href="">1차 탭 : Active</a></li>
                                <li><a href="">1차 탭 : Hover</a></li>
                                <li><a href="">1차 탭 : Enable</a></li>
                                <li><a href="" target="_blank" title-="새창">1차 탭 : Focus</a></li>
                            </ul>
                        </div>

                        <div class="tab-st depth02">
                            <ul>
                                <li class="on"><a href="">2차 탭 : Active</a></li>
                                <li><a href="">2차 탭 : Hover</a></li>
                                <li><a href="">2차 탭 : Enable</a></li>
                                <li><a href="" target="_blank" title-="새창">2차 탭 : Focus</a></li>
                            </ul>
                        </div>

                        <!-- 모바일 반응형 탭 사용 안할 시, 'not-js' 추가 -->
                        <!-- <div class="tab-st depth01 not-js">
                            <ul>
                                <li class="on"><a href="">1차 탭 : Active</a></li>
                                <li><a href="">1차 탭 : Hover</a></li>
                                <li><a href="">1차 탭 : Enable</a></li>
                                <li><a href="" target="_blank" title-="새창">1차 탭 : Focus</a></li>
                            </ul>
                        </div>

                        <div class="tab-st depth02 not-js">
                            <ul>
                                <li class="on"><a href="">2차 탭 : Active</a></li>
                                <li><a href="">2차 탭 : Hover</a></li>
                                <li><a href="">2차 탭 : Enable</a></li>
                                <li><a href="" target="_blank" title-="새창">2차 탭 : Focus</a></li>
                            </ul>
                        </div> -->
                    </div>

                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea>
<!-- 1차 탭 -->
<div class="tab-st depth01">
    <ul>
        <li class="on"><a href="">1차 탭 : Active</a></li>
        <li><a href="">1차 탭 : Hover</a></li>
        <li><a href="">1차 탭 : Enable</a></li>
        <li><a href="" target="_blank" title-="새창">1차 탭 : Focus</a></li>
    </ul>
</div>

<!-- 2차 탭 -->
<div class="tab-st depth02">
    <ul>
        <li class="on"><a href="">2차 탭 : Active</a></li>
        <li><a href="">2차 탭 : Hover</a></li>
        <li><a href="">2차 탭 : Enable</a></li>
        <li><a href="" target="_blank" title-="새창">2차 탭 : Focus</a></li>
    </ul>
</div>
                        </textarea>
                        <!-- code -->
                </article>
            </div>
            <!-- //Tab Menu -->
        </section>

        <section id="cntnsTab">
            <!-- TAB -->
            <div class="titWrap">
                <h3>Contents Tab</h3>
                <p>콘텐츠 탭은 콘텐츠 중간에 배치되어 같은 주제의 세부 내용을 구분할 때 사용합니다. </p>
            </div>
            
            <div class="contents">
                <article>
                    <h4>Tab</h4>
                    <p class="sub">콘텐츠 탭은 단일 구조로 하고, 세부 내용은 탭 콘텐츠 안에서 박스 구분 / 소제목 / 아코디언 등으로 작성합니다.</p>
                    <div class="box-st basic">
                        <div class="tab-st cntnts">
                            <ul>
                                <li class="on"><a href="">본문 탭 : Active</a></li>
                                <li><a href="">본문 탭 : Hover</a></li>
                                <li><a href="">본문 탭 : Enable</a></li>
                                <li><a href="" target="_blank" title="새창">본문 탭 : Focus 본문 탭 : Focus 본문 탭 : Focus 본문 탭 : Focus</a></li>
                                <li><a href="" class="dis">본문 탭 : Disabled</a></li>
                            </ul>
                        </div>
                    </div>

                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea>
 <div class="tab-st cntnts">
    <ul>
        <li class="on"><a href="">본문 탭 : Active</a></li>
        <li><a href="">본문 탭 : Hover</a></li>
        <li><a href="">본문 탭 : Enable</a></li>
        <li><a href="" target="_blank" title="새창">본문 탭 : Focus 본문 탭 : Focus 본문 탭 : Focus 본문 탭 : Focus</a></li>
        <li><a href="" class="dis">본문 탭 : Disabled</a></li>
    </ul>
</div>
                        </textarea>
                        <!-- code -->
                </article>
            </div>
            <!-- //TAB -->
        </section>

        <section id="cntnsProsess">
            <!-- PROSESS -->
            <div class="titWrap">
                <h3>Process</h3>
                <p>제목을 클릭했을 때 영역이 확장/축소 되는 방식으로 여러 패널이 셋트로 구성됩니다. 하나가 열리면 다른 건 닫히는 인터랙션으로 동작합니다.</p>
            </div>
            
            <div class="contents">
                <article>
                    <p class="sub">콘텐츠 성격에 따라 적합한 타입에 맞춰 사용한다.</p>
                    <div class="box-st basic">
                        <h5>Horizontal Process(Basic)</h5>
                        <ul class="prosess-st horiz">
                            <li><div class="tit">
                                <h6>민원접수</h6>
                                <p>민원실</p>
                            </div></li>
                            <li><div class="tit">
                                <h6>해당부서 송부</h6>
                                <p>민원실</p>
                            </div></li>
                            <li><div class="tit">
                                <h6>검토처리</h6>
                                <p>민원실</p>
                            </div></li>
                            <li class="fin"><div class="tit">
                                <h6>처리결과 통보</h6>
                            </div></li>
                        </ul>

                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea rows="10">
<ul class="prosess-st horiz">
    <li><div class="tit">
        <h6>민원접수</h6>
        <p>민원실</p>
    </div></li>
    <li><div class="tit">
        <h6>해당부서 송부</h6>
        <p>민원실</p>
    </div></li>
    <li><div class="tit">
        <h6>검토처리</h6>
        <p>민원실</p>
    </div></li>
    <li class="fin"><div class="tit">
        <h6>처리결과 통보</h6>
    </div></li>
</ul>
                        </textarea>
                        <!-- code -->
                        
                        <h5>Vertical Process (Detail)</h5>
                        <ul class="prosess-st verti">
                            <li>
                                <div class="tit">
                                    <h6>민원접수</h6><p>민원실</p>
                                </div>
                                <div class="inr">
                                    <ul class="bu-st1 list">
                                        <li>텍스트 순서없는 목록 1차 입니다.
                                            <ul class="bu-st2 list">
                                                <li>텍스트 순서없는 목록 2차 입니다. 
                                                    <ul class="bu-st3 list">
                                                        <li>텍스트 순서없는 목록 3차 입니다. 
                                                            <ul class="bu-st4 list">
                                                                <li>텍스트 순서 없는 목록 4차 입니다. </li>
                                                            </ul>
                                                        </li>
                                                    </ul>
                                                </li>
                                            </ul>
                                        </li>
                                    </ul>
                                </div>
                            </li>
                            <li>
                                <div class="tit">
                                    <h6>해당부서 송부</h6>
                                    <p>민원실</p>
                                </div>
                                <div class="inr">
                                    <ul class="list-st1">
                                        <li>텍스트 순서없는 목록 1차 입니다.
                                            <ul class="list-st2">
                                                <li>텍스트 순서없는 목록 2차 입니다. </li>
                                            </ul>
                                        </li>
                                    </ul>
                                </div>
                            </li>
                            <li>
                                <div class="tit">
                                    <h6>검토처리</h6>
                                    <p>민원실</p>
                                </div>
                                <div class="inr">텍스트입니다</div>
                            </li>
                            <li class="fin">
                                <div class="tit">
                                    <h6>처리결과 통보</h6>
                                </div>
                            </li>
                        </ul>
                        

                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea rows="20">
<ul class="prosess-st verti">
    <li>
        <div class="tit">
            <h6>민원접수</h6>
            <p>민원실</p>
        </div>
        <div class="inr">
            <ul class="bu-st1 list">
                <li>텍스트 순서없는 목록 1차 입니다.
                    <ul class="bu-st2 list">
                        <li>텍스트 순서없는 목록 2차 입니다.
                            <ul class="bu-st3 list">
                                <li>텍스트 순서없는 목록 3차 입니다.
                                    <ul class="bu-st4 list">
                                        <li>텍스트 순서 없는 목록 4차 입니다. </li>
                                    </ul>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
    </li>
    <li>
        <div class="tit">
            <h6>해당부서 송부</h6>
            <p>민원실</p>
        </div>
        <div class="inr">
            <ul class="list-st1">
                <li>텍스트 순서없는 목록 1차 입니다.
                    <ul class="list-st2">
                        <li>텍스트 순서없는 목록 2차 입니다. </li>
                    </ul>
                </li>
            </ul>
        </div>
    </li>
    <li>
        <div class="tit">
            <h6>검토처리</h6>
            <p>민원실</p>
        </div>
        <div class="inr">텍스트입니다</div>
    </li>
    <li class="fin">
        <div class="tit">
            <h6>처리결과 통보</h6>
        </div>
    </li>
</ul>
                        </textarea>
                        <!-- code -->
                    </div>
                </article>
            </div>
            <!-- //PROSESS -->
        </section>

        <section id="cntnsAccordion">
            <!-- PROSESS -->
            <div class="titWrap">
                <h3>Accordion</h3>
                <p>콘텐츠 내에서 특정 부분을 강조하거나 단락을 구분할 필요가 있을 때 사용합니다. 박스 내 타이틀 사용은 지양합니다.</p>
            </div>
            
            <div class="contents">
                <article>
                    <h4>Guide</h4>
                    <p class="sub">Shape, Size, State로 구분하여 안내합니다.</p>
                    <p class="badge"><span>Shape</span> 기본(라인) 형태와 박스 형태의 아코디언을 활용합니다.</p>
                    <div class="box-st basic">
                        <div class="col-wrap col-2">
                            <div class="inr">
                                <h5>Basic Accordion (기본)</h5>
                                <div class="accordion-st basic">
                                    <ul>
                                        <li class="on"><button class="tit">기본 아코디언 A</button>
                                            <div class="cntnts">
                                                내용이 나옵니다.
                                            </div>
                                        </li>
                                        <li><button class="tit">기본 아코디언 B</button>
                                            <div class="cntnts">
                                                내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 
                                            </div>
                                        </li>
                                    </ul>
                                </div>

                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<div class="accordion-st basic">
    <ul>
        <li class="on"><button class="tit">기본 아코디언 A</button>
            <div class="cntnts">
                내용이 나옵니다.
            </div>
        </li>
        <li><button class="tit">기본 아코디언 B</button>
            <div class="cntnts">
                내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 내용이 나옵니다. 
            </div>
        </li>
    </ul>
</div>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>Box Accordion</h5>
                                <div class="accordion-st box">
                                    <ul>
                                        <li class="on"><button class="tit">박스 아코디언 A</button>
                                            <div class="cntnts">
                                                내용이 나옵니다.
                                            </div>
                                        </li>
                                        <li><button class="tit">박스 아코디언 B</button>
                                            <div class="cntnts">
                                                내용이 나옵니다.
                                            </div>
                                        </li>
                                    </ul>
                                </div>

                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<div class="accordion-st box">
    <ul>
        <li class="on"><button class="tit">박스 아코디언 A</button>
            <div class="cntnts">
                내용이 나옵니다.
            </div>
        </li>
        <li><button class="tit">박스 아코디언 B</button>
            <div class="cntnts">
                내용이 나옵니다.
            </div>
        </li>
    </ul>
</div>
                                </textarea>
                                <!-- //code -->
                            </div>
                        </div>
                    </div>
                    
                    <p class="badge"><span>Size</span> 콘텐츠 내에서 적합한 계층을 가진 크기로 사용합니다.</p>
                    <div class="box-st basic">
                        <div class="col-wrap col-2">
                            <div class="inr">
                                <h5>Medium (본문 내 다단 콘텐츠 그룹)</h5>
                                <div class="accordion-st basic size-md">
                                    <ul>
                                        <li><button class="tit">기본 아코디언</button>
                                            <div class="cntnts">
                                                내용이 나옵니다.
                                            </div>
                                        </li>
                                        <li><button class="tit">기본 아코디언</button>
                                            <div class="cntnts">
                                                내용이 나옵니다.
                                            </div>
                                        </li>
                                    </ul>
                                </div>

                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<div class="accordion-st basic size-md">
    <ul>
        <li><button class="tit">기본 아코디언</button>
            <div class="cntnts">
                내용이 나옵니다.
            </div>
        </li>
        <li><button class="tit">기본 아코디언</button>
            <div class="cntnts">
                내용이 나옵니다.
            </div>
        </li>
    </ul>
</div>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>Large (FAQ, 메뉴)</h5>
                                <div class="accordion-st box size-lg">
                                    <ul>
                                        <li><button class="tit">박스 아코디언 A</button>
                                            <div class="cntnts">
                                                내용이 나옵니다.
                                            </div>
                                        </li>
                                        <li><button class="tit">박스 아코디언 B</button>
                                            <div class="cntnts">
                                                내용이 나옵니다.
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                

                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<div class="accordion-st box size-lg">
    <ul>
        <li><button class="tit">박스 아코디언 A</button>
            <div class="cntnts">
                내용이 나옵니다.
            </div>
        </li>
        <li><button class="tit">박스 아코디언 B</button>
            <div class="cntnts">
                내용이 나옵니다.
            </div>
        </li>
    </ul>
</div>
                                </textarea>
                                <!-- //code -->
                            </div>
                        </div>
                    </div>
                    
                    <p class="badge"><span>State</span> 사용자의 상호작용과 상태 변화를 표현하는 속성입니다.</p>
                    <div class="box-st basic">
                        <div class="accordion-st basic size-md">
                            <ul>
                                <li><button class="tit">기본 아코디언 </button>
                                    <div class="cntnts">
                                        내용이 나옵니다.
                                    </div>
                                </li>
                                <li class="dis"><button class="tit">기본 아코디언 disabled</button>
                                    <div class="cntnts">
                                        내용이 나옵니다.
                                    </div>
                                </li>
                            </ul>
                        </div>
                                

                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<div class="accordion-st basic size-md">
    <ul>
        <li><button class="tit">기본 아코디언 </button>
            <div class="cntnts">
                내용이 나옵니다.
            </div>
        </li>
        <li class="dis"><button class="tit">기본 아코디언 disabled</button>
            <div class="cntnts">
                내용이 나옵니다.
            </div>
        </li>
    </ul>
</div>
                                </textarea>
                                <!-- //code -->
                    </div>
                </article>
            </div>
        </section>

        <section id="cntnsDiscloser">
            <!-- PROSESS -->
            <div class="titWrap">
                <h3>Discloser</h3>
                <p>콘텐츠 내에서 특정 부분을 강조하거나 단락을 구분할 필요가 있을 때 사용합니다. 박스 내 타이틀 사용은 지양합니다.</p>
            </div>
            
            <div class="contents">
                <article>
                    <h4>Guide</h4>
                    <p class="sub">State로 구분하여 안내합니다.</p>
                    <p class="badge"><span>State</span> 사용자의 상호작용과 상태 변화를 표현하는 속성입니다.</p>
                    
                    <div class="box-st basic">
                        <div class="col-wrap col-2">
                            <div class="inr">
                                <h5>Close</h5>
                                <div class="discloser-st">
                                    <button class="tit">Discloser : Closed</button>
                                    <div class="cntnts">
                                        내용이 나옵니다.
                                    </div>
                                </div>
                            </div>
                            <div class="inr">
                                <h5>Open</h5>
                                <div class="discloser-st on">
                                    <button class="tit">Discloser : Open</button>
                                    <div class="cntnts">
                                        내용이 나옵니다.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    
                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea rows="5">
<div class="discloser-st">
    <button class="tit">Discloser : Closed</button>
    <div class="cntnts">
        내용이 나옵니다.
    </div>
</div>
                    </textarea>
                    <!-- //code -->
                </article>
            </div>
        </section>

        <section id="cntnsButton">
            <!-- PROSESS -->
            <div class="titWrap">
                <h3>Button</h3>
                <p>버튼은 사용자가 시스템에 명령을 전달하거나 행동을 실행하도록 유도하는 인터페이스 요소입니다.</p>
            </div>
            
            <div class="contents">
                <article>
                    <h4>Guide</h4>
                    <p class="sub">Type, Size, State, Icon으로 구분하여 안내합니다.</p>
                    <p class="badge"><span>State</span> 사용자의 상호작용과 상태 변화를 표현하는 속성입니다.</p>

                    <div class="box-st basic">
                        <div class="col-wrap col-2">
                            <div class="inr">
                                <h5>Primary</h5>
                                <button class="btn-st pri">Medium Button</button>
                                <p class="sub">화면에서 가장 중요한 단일 행동을 수행할 때 사용 <br>
                                    저장, 제출, 신청, 다음 단계 이동<br>
                                    한 화면에 1개만 배치</p>
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st pri">Medium Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>Secondary</h5>
                                <button class="btn-st sec">Medium Button</button>
                                <p class="sub">Primary 다음으로 중요한 보조 행동에 사용<br>
                                    취소, 미리보기, 임시저장<br>
                                    Primary와 함께 노출되어도 시각적으로 구분되어야 함</p>
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st sec">Medium Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>Tertiary (default)</h5>
                                <button class="btn-st">Medium Button</button>
                                <p class="sub">부가 기능이나 중요도가 낮은 행동에 사용<br>
                                    더보기, 설정, 링크 이동 등 텍스트 중심으로 표현<br>
                                    화면 전반에서 불필요한 강조를 줄이기 위해, ‘Teriary’를 기본으로 사용</p>
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st">Medium Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>Accent</h5>
                                <button class="btn-st acc">Medium Button</button>
                                <p class="sub">특정 상황에서 강조 필요할 때 사용<br>
                                    이벤트 참여, 추천 기능 등</p>
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st acc">Medium Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                        </div>
                    </div>
                    
                    <p class="badge"><span>Color</span> 상태변화 외 예외로 사용하는 색상 버튼입니다.</p>

                    <div class="box-st basic">
                        <div class="col-wrap col-2">
                            <div class="inr">
                                <h5>gray</h5>
                                <button class="btn-st gray">Medium Button</button>
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st gray">Medium Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>blue</h5>
                                <button class="btn-st blue">Medium Button</button>
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st blue">Medium Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>green</h5>
                                <button class="btn-st green">Medium Button</button>
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st green">Medium Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>red</h5>
                                <button class="btn-st red">Medium Button</button>
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st red">Medium Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                        </div>
                    </div>
                    
                    <p class="badge"><span>Size</span> 버튼 사이즈는 4가지로 Small, Medium, Large, Extra Large이며 Medium size를 기본으로 사용합니다.</p>

                    <div class="box-st basic">
                        <div class="col-wrap col-4">
                            <div class="inr">
                                <h5>Medium (default)</h5>
                                <button class="btn-st size-md">Medium Button</button>
                                <p class="sub">H : 45px, Fs : 18px<br>
                                    태그 버튼, 보조 액션, 테이블 내 작은 버튼</p>
                                    
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
 <button class="btn-st size-md">Medium Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>Small Button</h5>
                                <button class="btn-st size-sm">Small Button</button>
                                <p class="sub">H : 34px, Fs : 15px<br>
                                    태그 버튼, 보조 액션, 테이블 내 작은 버튼</p>
                                    
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
 <button class="btn-st size-sm">Small Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>Large Button</h5>
                                <button class="btn-st size-lg">Large Button</button>
                                <p class="sub">H : 50px, Fs : 20px<br>
                                    주요 CTA 버튼, 모바일 터치 영역 확보 필요할 때</p>
                                    
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st size-lg">Large Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>Extra Large Button</h5>
                                <button class="btn-st size-exlg">Extra Large Button</button>
                                <p class="sub">H : 60px, Fs : 20px<br>
                                    메인 화면 Hero CTA, 프로모션 영역</p>
                                    
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
 <button class="btn-st size-exlg">Extra Large Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                        </div>
                    </div>
                    
                    <p class="badge"><span>Icon</span> 텍스트를 보완하거나 독립적으로 사용되어, 버튼의 기능과 의미를 직관적으로 전달하는 시각적 요소입니다.</p>

                    <div class="box-st basic">
                        <div class="col-wrap col-4">
                            <div class="inr">
                                <h5>Prefix Icon</h5>
                                <button class="btn-st icon"><i class="ri-external-link-line" aria-hidden="true"></i>Medium Button</button>
                                    
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st icon"><i class="ri-external-link-line" aria-hidden="true"></i>Medium Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>Suffix Icon</h5>
                                <button class="btn-st icon"><i class="ri-phone-fill" aria-hidden="true"></i>Medium Button</button>
                                    
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st icon"><i class="ri-phone-fill" aria-hidden="true"></i>Medium Button</button>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>Prefix + Suffix Icon</h5>
                                <button class="btn-st icon"><i class="ri-phone-fill" aria-hidden="true"></i>Medium Button<i class="ri-external-link-line" aria-hidden="true"></i></button>
                                    
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st icon"><i class="ri-phone-fill" aria-hidden="true"></i>Medium Button<i class="ri-external-link-line" aria-hidden="true"></i></button>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <h5>Icon-only</h5>
                                <button class="btn-st icon-only"><i class="ri-external-link-line" aria-hidden="true"></i></button>
                                    
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<button class="btn-st icon-only"><i class="ri-external-link-line" aria-hidden="true"></i></button>
                                </textarea>
                                <!-- //code -->
                            </div>
                        </div>
                    </div>
                    
                    <p class="badge"><span>File Download</span> 각 파일타입과 다운로드 or 새창여부를 표시하는 버튼 유형입니다.</p>

                    <div class="box-st basic">
                        <a href="" target="download" title="PDF 파일 다운로드" class="btn-st file">
                            <span><i class="ri-file-pdf-2-line" aria-hidden="true"></i></span>
                            PDF 다운로드 버튼
                            <i class="ri-download-2-line" aria-hidden="true"></i>
                        </a>
                        <a href="" target="download" title="File 파일 다운로드" class="btn-st file">
                            <span><i class="ri-file-list-2-line" aria-hidden="true"></i></span>
                            File 다운로드 버튼
                            <i class="ri-download-2-line" aria-hidden="true"></i>
                        </a>
                        <a href="" target="download" title="Excel 파일 다운로드" class="btn-st file">
                            <span><i class="ri-file-excel-2-line" aria-hidden="true"></i></span>
                            Excel 다운로드 버튼
                            <i class="ri-download-2-line" aria-hidden="true"></i>
                        </a>
                        <a href="" target="download" title="Hwp 파일 다운로드" class="btn-st file">
                            <span><i class="ri-file-hwp-line" aria-hidden="true"></i></span>
                            Hwp 다운로드 버튼
                            <i class="ri-download-2-line" aria-hidden="true"></i>
                        </a>
                                    
                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea>
<a href="" target="download" title="PDF 파일 다운로드" class="btn-st file">
    <span><i class="ri-file-pdf-2-line" aria-hidden="true"></i></span>
    PDF 다운로드 버튼
    <i class="ri-download-2-line" aria-hidden="true"></i>
</a>
<a href="" target="download" title="File 파일 다운로드" class="btn-st file">
    <span><i class="ri-file-list-2-line" aria-hidden="true"></i></span>
    File 다운로드 버튼
    <i class="ri-download-2-line" aria-hidden="true"></i>
</a>
<a href="" target="download" title="Excel 파일 다운로드" class="btn-st file">
    <span><i class="ri-file-excel-2-line" aria-hidden="true"></i></span>
    Excel 다운로드 버튼
    <i class="ri-download-2-line" aria-hidden="true"></i>
</a>
<a href="" target="download" title="Hwp 파일 다운로드" class="btn-st file">
    <span><i class="ri-file-hwp-line" aria-hidden="true"></i></span>
    Hwp 다운로드 버튼
    <i class="ri-download-2-line" aria-hidden="true"></i>
</a>
                        </textarea>
                        <!-- //code -->

                        <p class="line-dot"></p>
                        
                        <a href="" target="_blank" title="새창" class="btn-st file">
                            <span><i class="ri-file-pdf-2-line" aria-hidden="true"></i></span>
                            PDF 새창 보기 버튼
                            <i class="ri-share-box-line" aria-hidden="true"></i>
                        </a>
                        <a href="" target="_blank" title="새창" class="btn-st file">
                            <span><i class="ri-file-list-2-line" aria-hidden="true"></i></span>
                            File 새창 보기 버튼
                            <i class="ri-share-box-line" aria-hidden="true"></i>
                        </a>
                        <a href="" target="_blank" title="새창" class="btn-st file">
                            <span><i class="ri-file-excel-2-line" aria-hidden="true"></i></span>
                            Excel 새창 보기 버튼
                            <i class="ri-share-box-line" aria-hidden="true"></i>
                        </a>
                        <a href="" target="_blank" title="새창" class="btn-st file">
                            <span><i class="ri-file-hwp-line" aria-hidden="true"></i></span>
                            Hwp 새창 보기 버튼
                            <i class="ri-share-box-line" aria-hidden="true"></i>
                        </a>
                                    
                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea>
 <a href="" target="_blank" title="새창" class="btn-st file">
    <span><i class="ri-file-pdf-2-line" aria-hidden="true"></i></span>
    PDF 새창 보기 버튼
    <i class="ri-share-box-line" aria-hidden="true"></i>
</a>
<a href="" target="_blank" title="새창" class="btn-st file">
    <span><i class="ri-file-list-2-line" aria-hidden="true"></i></span>
    File 새창 보기 버튼
    <i class="ri-share-box-line" aria-hidden="true"></i>
</a>
<a href="" target="_blank" title="새창" class="btn-st file">
    <span><i class="ri-file-excel-2-line" aria-hidden="true"></i></span>
    Excel 새창 보기 버튼
    <i class="ri-share-box-line" aria-hidden="true"></i>
</a>
<a href="" target="_blank" title="새창" class="btn-st file">
    <span><i class="ri-file-hwp-line" aria-hidden="true"></i></span>
    Hwp 새창 보기 버튼
    <i class="ri-share-box-line" aria-hidden="true"></i>
</a>
                        </textarea>
                        <!-- //code -->
                    </div>
                    
                    <p class="badge"><span>File Download Align</span> 각 파일타입과 다운로드 or 새창여부를 표시하는 버튼의 정렬 스타일입니다.</p>

                    <div class="box-st basic">
                        <div class="align-wrap col-2 btn-file">
                            <a href="" target="download" title="PDF 파일 다운로드" class="btn-st file">
                                <span><i class="ri-file-pdf-2-line" aria-hidden="true"></i></span>
                                PDF 다운로드 버튼
                                <i class="ri-download-2-line" aria-hidden="true"></i>
                            </a>
                            <a href="" target="_blank" title="새창" class="btn-st file">
                                <span><i class="ri-file-excel-2-line" aria-hidden="true"></i></span>
                                Excel 새창 보기 버튼
                                <i class="ri-share-box-line" aria-hidden="true"></i>
                            </a>
                        </div>
                                    
                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea>
<div class="align-wrap col-2 btn-file">
    <a href="" target="download" title="PDF 파일 다운로드" class="btn-st file">
        <span><i class="ri-file-pdf-2-line" aria-hidden="true"></i></span>
        PDF 다운로드 버튼
        <i class="ri-download-2-line" aria-hidden="true"></i>
    </a>
    <a href="" target="_blank" title="새창" class="btn-st file">
        <span><i class="ri-file-excel-2-line" aria-hidden="true"></i></span>
        Excel 새창 보기 버튼
        <i class="ri-share-box-line" aria-hidden="true"></i>
    </a>
</div>
                        </textarea>
                        <!-- //code -->

                        <p class="line-dot"></p>
                        
                        <div class="align-wrap col-3 btn-file">
                            <a href="" target="download" title="PDF 파일 다운로드" class="btn-st file">
                                <span><i class="ri-file-pdf-2-line" aria-hidden="true"></i></span>
                                PDF 다운로드 버튼
                                <i class="ri-download-2-line" aria-hidden="true"></i>
                            </a>
                            <a href="" target="_blank" title="새창" class="btn-st file">
                                <span><i class="ri-file-excel-2-line" aria-hidden="true"></i></span>
                                Excel 새창 보기 버튼
                                <i class="ri-share-box-line" aria-hidden="true"></i>
                            </a>
                            <a href="" target="download" title="File 파일 다운로드" class="btn-st file">
                                <span><i class="ri-file-list-2-line" aria-hidden="true"></i></span>
                                File 다운로드 버튼
                                <i class="ri-download-2-line" aria-hidden="true"></i>
                            </a>
                        </div>
                                    
                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea>
<div class="align-wrap col-3 btn-file">
    <a href="" target="download" title="PDF 파일 다운로드" class="btn-st file">
        <span><i class="ri-file-pdf-2-line" aria-hidden="true"></i></span>
        PDF 다운로드 버튼
        <i class="ri-download-2-line" aria-hidden="true"></i>
    </a>
    <a href="" target="_blank" title="새창" class="btn-st file">
        <span><i class="ri-file-excel-2-line" aria-hidden="true"></i></span>
        Excel 새창 보기 버튼
        <i class="ri-share-box-line" aria-hidden="true"></i>
    </a>
    <a href="" target="download" title="File 파일 다운로드" class="btn-st file">
        <span><i class="ri-file-list-2-line" aria-hidden="true"></i></span>
        File 다운로드 버튼
        <i class="ri-download-2-line" aria-hidden="true"></i>
    </a>
</div>
                        </textarea>
                        <!-- //code -->

                        <p class="line-dot"></p>
                        
                        <div class="align-wrap btn-file">
                            <a href="" target="_blank" title="새창" class="btn-st file">
                                <span><i class="ri-file-pdf-2-line" aria-hidden="true"></i></span>
                                PDF 새창 보기 버튼
                                <i class="ri-share-box-line" aria-hidden="true"></i>
                            </a>
                            <a href="" target="_blank" title="새창" class="btn-st file">
                                <span><i class="ri-file-list-2-line" aria-hidden="true"></i></span>
                                File 새창 보기 버튼
                                <i class="ri-share-box-line" aria-hidden="true"></i>
                            </a>
                            <a href="" target="_blank" title="새창" class="btn-st file">
                                <span><i class="ri-file-excel-2-line" aria-hidden="true"></i></span>
                                Excel 새창 보기 버튼
                                <i class="ri-share-box-line" aria-hidden="true"></i>
                            </a>
                            <a href="" target="_blank" title="새창" class="btn-st file">
                                <span><i class="ri-file-hwp-line" aria-hidden="true"></i></span>
                                Hwp 새창 보기 버튼
                                <i class="ri-share-box-line" aria-hidden="true"></i>
                            </a>
                        </div>
                                    
                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea>
<div class="align-wrap btn-file">
    <a href="" target="_blank" title="새창" class="btn-st file">
        <span><i class="ri-file-pdf-2-line" aria-hidden="true"></i></span>
        PDF 새창 보기 버튼
        <i class="ri-share-box-line" aria-hidden="true"></i>
    </a>
    <a href="" target="_blank" title="새창" class="btn-st file">
        <span><i class="ri-file-list-2-line" aria-hidden="true"></i></span>
        File 새창 보기 버튼
        <i class="ri-share-box-line" aria-hidden="true"></i>
    </a>
    <a href="" target="_blank" title="새창" class="btn-st file">
        <span><i class="ri-file-excel-2-line" aria-hidden="true"></i></span>
        Excel 새창 보기 버튼
        <i class="ri-share-box-line" aria-hidden="true"></i>
    </a>
    <a href="" target="_blank" title="새창" class="btn-st file">
        <span><i class="ri-file-hwp-line" aria-hidden="true"></i></span>
        Hwp 새창 보기 버튼
        <i class="ri-share-box-line" aria-hidden="true"></i>
    </a>
</div>
                        </textarea>
                        <!-- //code -->

                        <p class="line-dot"></p>

                        <div class="align-wrap col-5 btn-file">
                            <a href="" target="_blank" title="새창" class="btn-st file">
                                <span><i class="ri-file-pdf-2-line" aria-hidden="true"></i></span>
                                PDF 새창 보기 버튼
                                <i class="ri-share-box-line" aria-hidden="true"></i>
                            </a>
                            <a href="" target="_blank" title="새창" class="btn-st file">
                                <span><i class="ri-file-list-2-line" aria-hidden="true"></i></span>
                                File 새창 보기 버튼
                                <i class="ri-share-box-line" aria-hidden="true"></i>
                            </a>
                            <a href="" target="_blank" title="새창" class="btn-st file">
                                <span><i class="ri-file-excel-2-line" aria-hidden="true"></i></span>
                                Excel 새창 보기 버튼
                                <i class="ri-share-box-line" aria-hidden="true"></i>
                            </a>
                            <a href="" target="_blank" title="새창" class="btn-st file">
                                <span><i class="ri-file-hwp-line" aria-hidden="true"></i></span>
                                Hwp 새창 보기 버튼
                                <i class="ri-share-box-line" aria-hidden="true"></i>
                            </a>
                            <a href="" target="_blank" title="새창" class="btn-st file">
                                <span><i class="ri-file-ppt-2-line" aria-hidden="true"></i></span>
                                PPT 새창 보기 버튼
                                <i class="ri-share-box-line" aria-hidden="true"></i>
                            </a>
                        </div>
                                    
                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea>
<div class="align-wrap col-5 btn-file">
    <a href="" target="_blank" title="새창" class="btn-st file">
        <span><i class="ri-file-pdf-2-line" aria-hidden="true"></i></span>
        PDF 새창 보기 버튼
        <i class="ri-share-box-line" aria-hidden="true"></i>
    </a>
    <a href="" target="_blank" title="새창" class="btn-st file">
        <span><i class="ri-file-list-2-line" aria-hidden="true"></i></span>
        File 새창 보기 버튼
        <i class="ri-share-box-line" aria-hidden="true"></i>
    </a>
    <a href="" target="_blank" title="새창" class="btn-st file">
        <span><i class="ri-file-excel-2-line" aria-hidden="true"></i></span>
        Excel 새창 보기 버튼
        <i class="ri-share-box-line" aria-hidden="true"></i>
    </a>
    <a href="" target="_blank" title="새창" class="btn-st file">
        <span><i class="ri-file-hwp-line" aria-hidden="true"></i></span>
        Hwp 새창 보기 버튼
        <i class="ri-share-box-line" aria-hidden="true"></i>
    </a>
    <a href="" target="_blank" title="새창" class="btn-st file">
        <span><i class="ri-file-ppt-2-line" aria-hidden="true"></i></span>
        PPT 새창 보기 버튼
        <i class="ri-share-box-line" aria-hidden="true"></i>
    </a>
</div>
                        </textarea>
                        <!-- //code -->
                    </div>
                </article>
            </div>
        </section>

        <section id="cntnsTable">
            <!-- PROSESS -->
            <div class="titWrap">
                <h3>Table</h3>
                <p>데이터를 행(Row)과 열(Column) 구조로 배치하여 비교·분석·정렬하기 쉽게 만든 UI 요소입니다.</p>
            </div>
            
            <div class="contents">
                <article>
                    <h4>Guide</h4>
                    <p class="sub">Type, Etc로 구분하여 안내합니다.</p>
                    <p class="badge"><span>Type</span> 단순 정보제공형 테이블 기준으로 크게 3가지로 형태로 구분합니다.</p>

                    <div class="box-st basic">
                        <h5>Basic Table (Column/Row)</h5>
                        <div class="col-wrap col-2">
                            <div class="inr">
                                <div class="tbl-st">
                                    <table>
                                        <caption>Basic Table (Column/Row)</caption>
                                        <colgroup>
                                            <col span="4" style="width:25%;">
                                        </colgroup>
                                        <thead>
                                            <tr>
                                                <th scope="col">th</th>
                                                <th scope="col">th</th>
                                                <th scope="col">th</th>
                                                <th scope="col">th</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>td</td>
                                                <td>td</td>
                                                <td>td</td>
                                                <td>td</td>
                                            </tr>
                                            <tr>
                                                <td>td</td>
                                                <td>td</td>
                                                <td>td</td>
                                                <td>td</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<div class="tbl-st">
    <table>
        <caption>Basic Table (Column/Row)</caption>
        <colgroup>
            <col span="4" style="width:25%;">
        </colgroup>
        <thead>
            <tr>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
            </tr>
            <tr>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
            </tr>
        </tbody>
    </table>
</div>
                                </textarea>
                                <!-- //code -->
                            </div>
                            <div class="inr">
                                <div class="tbl-st">
                                    <table>
                                        <caption>Basic Table (Column/Row)</caption>
                                        <colgroup>
                                            <col span="2" style="width:50%;">
                                        </colgroup>
                                        <tbody>
                                            <tr>
                                                <th scope="row">th</th>
                                                <td>td</td>
                                            </tr>
                                            <tr>
                                                <th scope="row">th</th>
                                                <td>td</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <!-- code -->
                                <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                                <textarea>
<div class="tbl-st">
    <table>
        <caption>Basic Table (Column/Row)</caption>
        <colgroup>
            <col span="2" style="width:50%;">
        </colgroup>
        <tbody>
            <tr>
                <th scope="row">th</th>
                <td>td</td>
            </tr>
            <tr>
                <th scope="row">th</th>
                <td>td</td>
            </tr>
        </tbody>
    </table>
</div>
                                </textarea>
                                <!-- //code -->
                            </div>
                        </div>
                    </div>
                    
                    <h5>Grouped Table (Colgroup/Rowgroup)</h5>
                    <div class="col-wrap col-2">
                        <div class="inr">
                            <div class="tbl-st">
                                <table>
                                    <caption>Grouped Table (Colgroup)</caption>
                                    <colgroup>
                                        <col span="4" style="width:25%;">
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th scope="col" colspan="4">Colgroup</th>
                                        </tr>
                                        <tr>
                                            <th scope="col">th</th>
                                            <th scope="col">th</th>
                                            <th scope="col">th</th>
                                            <th scope="col">th</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>td</td>
                                            <td>td</td>
                                            <td>td</td>
                                            <td>td</td>
                                        </tr>
                                        <tr>
                                            <td>td</td>
                                            <td>td</td>
                                            <td>td</td>
                                            <td>td</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="inr">
                            <div class="tbl-st">
                                <table>
                                    <caption>Grouped Table (Rowgroup)</caption>
                                    <colgroup>
                                        <col span="2" style="width:25%;">
                                        <col style="width:50%;">
                                    </colgroup>
                                    <tbody>
                                        <tr>
                                            <th scope="col" rowspan="3">Colgroup</th>
                                            <th>th</th>
                                            <td>td</td>
                                        </tr>
                                        <tr>
                                            <th>th</th>
                                            <td>td</td>
                                        </tr>
                                        <tr>
                                            <th>th</th>
                                            <td>td</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <h5>Scrollable Table(Web)</h5>
                    <div class="tbl-st scroll-w">
                        <table>
                            <caption>Grouped Table (Colgroup)</caption>
                            <colgroup>
                                <col style="width: auto;">
                            </colgroup>
                            <thead>
                                <tr>
                                    <th scope="col" colspan="20">Colgroup</th>
                                </tr>
                                <tr>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                    <td>Scrollable Table Scrollable Table</td>
                                </tr>
                                <tr>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                                
                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<div class="tbl-st scroll-w">
    <table>
        <caption>Grouped Table (Colgroup)</caption>
        <colgroup>
            <col style="width: auto;">
        </colgroup>
        <thead>
            <tr>
                <th scope="col" colspan="20">Colgroup</th>
            </tr>
            <tr>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
                <td>Scrollable Table Scrollable Table</td>
            </tr>
            <tr>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
            </tr>
        </tbody>
    </table>
</div>
                    </textarea>
                    <!-- //code -->
                    
                    <h5>Scrollable Table(Mobile)</h5>
                    <div class="tbl-st scroll-m">
                        <table>
                            <caption>Grouped Table (Colgroup)</caption>
                            <colgroup>
                                <col span="4" style="width:25%;">
                            </colgroup>
                            <thead>
                                <tr>
                                    <th scope="col" colspan="4">Colgroup</th>
                                </tr>
                                <tr>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                    <th scope="col">th</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                </tr>
                                <tr>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                    <td>td</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                                
                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<div class="tbl-st scroll-m">
    <table>
        <caption>Grouped Table (Colgroup)</caption>
        <colgroup>
            <col span="4" style="width:25%;">
        </colgroup>
        <thead>
            <tr>
                <th scope="col" colspan="4">Colgroup</th>
            </tr>
            <tr>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
                <th scope="col">th</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
            </tr>
            <tr>
                <td>td</td>
                <td>td</td>
                <td>td</td>
                <td>td</td>
            </tr>
        </tbody>
    </table>
</div>
                    </textarea>
                    <!-- //code -->
                </article>
            </div>
        </section>

        <section id="cntnsNoData">
            <!-- 콘텐츠가 없습니다 -->
            <div class="titWrap">
                <h3>콘텐츠가 없습니다</h3>
                <p>콘텐츠가 없을 시, 나오는 페이지입니다</p>
            </div>
            
            <div class="contents">
                <article>
                    <h4>Guide</h4>
                    <div class="box-st basic">
                        <div class="Coming-soon">
                            <i class="ri-user-smile-line" aria-hidden="true"></i>
                            <h3>콘텐츠를 <strong>준비중</strong>입니다</h3>
                            <p>보다 나은 서비스 제공을 위해 페이지를 준비하고 있으니 잠시만 기다려 주시기 바랍니다.</p>
                        </div>
                                
                        <!-- code -->
                        <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                        <textarea>
<div class="Coming-soon">
    <i class="ri-user-smile-line" aria-hidden="true"></i>
    <h3>콘텐츠를 <strong>준비중</strong>입니다</h3>
    <p>보다 나은 서비스 제공을 위해 페이지를 준비하고 있으니 잠시만 기다려 주시기 바랍니다.</p>
</div>
                        </textarea>
                        <!-- //code -->
                    </div>
                </article>
            </div>
        </section>

        <section id="cntnsimgAlign">
            <!-- Tab Menu -->
            <div class="titWrap">
                <h3>Image Align</h3>
                <p>이미지 또는 이미지와 텍스트 정렬이 필요할때 사용합니다.</p>
            </div>
            
            <div class="contents">
                <article>
                    <h4>Type 1</h4>
                    <p class="sub">이미지와 텍스트를 가로로 정렬합니다</p>

                    <h3 class="tit-st section">Type1 : 이미지와 텍스트 출력의 경우</h3>
                    <div class="img-txt-align ty1">
                        <div class="inr">
                            <p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p>
                            <div class="txt">
                                <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
                                <h5 class="tit-st unit">Title3. 콘텐츠 타이틀 2번째 있을 경우</h5>
                                <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                            </div>
                        </div>
                        <div class="inr">
                            <p class="img rsp_img"><img src="/common/images/con_com/img_temp2.png" alt="임시 이미지"></p>
                            <div class="txt">
                                <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
                                <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                            </div>
                        </div>
                        <div class="inr">
                            <p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p>
                            <div class="txt">
                                <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
                                <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                            </div>
                        </div>
                        <div class="inr">
                            <p class="img rsp_img"><img src="/common/images/con_com/img_temp2.png" alt="임시 이미지"></p>
                            <div class="txt">
                                <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
                                <h5 class="tit-st unit">Title3. 콘텐츠 타이틀 2번째 있을 경우</h5>
                                <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                                <h5 class="tit-st unit">Title3. 콘텐츠 타이틀 2번째 있을 경우</h5>
                                <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                            </div>
                        </div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea rows="10">
<div class="img-txt-align ty1">
    <div class="inr">
        <p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p>
        <div class="txt">
            <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
            <h5 class="tit-st unit">Title3. 콘텐츠 타이틀 2번째 있을 경우</h5>
            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
        </div>
    </div>
    <div class="inr">
        <p class="img rsp_img"><img src="/common/images/con_com/img_temp2.png" alt="임시 이미지"></p>
        <div class="txt">
            <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
        </div>
    </div>
    <div class="inr">
        <p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p>
        <div class="txt">
            <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
        </div>
    </div>
    <div class="inr">
        <p class="img rsp_img"><img src="/common/images/con_com/img_temp2.png" alt="임시 이미지"></p>
        <div class="txt">
            <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
            <h5 class="tit-st unit">Title3. 콘텐츠 타이틀 2번째 있을 경우</h5>
            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
            <h5 class="tit-st unit">Title3. 콘텐츠 타이틀 2번째 있을 경우</h5>
            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
        </div>
    </div>
</div>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>Type 2</h4>
                    <p class="sub">이미지와 텍스트를 세로로 정렬합니다</p>
                    <p class="sub">열 개수에 따라 col-3 / col-2 / col-5 클래스 추가 (기본 : 4개)</p>

                    <h3 class="tit-st section">Type2 : 이미지와 텍스트 출력의 경우</h3>

                    <!-- 열 개수에 따라 col-3 / col-2 / col-5 클래스 추가 (기본 : 4개)-->
                    <div class="img-txt-align ty2 col-3">
                        <div class="inr">
                            <p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p>
                            <div class="txt">
                                <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
                                <h5 class="tit-st unit">Title3. 콘텐츠 타이틀 2번째 있을 경우</h5>
                                <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                            </div>
                        </div>
                        <div class="inr">
                            <p class="img rsp_img"><img src="/common/images/con_com/img_temp2.png" alt="임시 이미지"></p>
                            <div class="txt">
                                <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
                                <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                            </div>
                        </div>
                        <div class="inr">
                            <p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p>
                            <div class="txt">
                                <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
                                <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                            </div>
                        </div>
                        <div class="inr">
                            <p class="img rsp_img"><img src="/common/images/con_com/img_temp2.png" alt="임시 이미지"></p>
                            <div class="txt">
                                <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
                                <h5 class="tit-st unit">Title3. 콘텐츠 타이틀 2번째 있을 경우</h5>
                                <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                                <h5 class="tit-st unit">Title3. 콘텐츠 타이틀 2번째 있을 경우</h5>
                                <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                            </div>
                        </div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea rows="10">
<div class="img-txt-align ty2 col-3">
    <div class="inr">
        <p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p>
        <div class="txt">
            <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
            <h5 class="tit-st unit">Title3. 콘텐츠 타이틀 2번째 있을 경우</h5>
            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
        </div>
    </div>
    <div class="inr">
        <p class="img rsp_img"><img src="/common/images/con_com/img_temp2.png" alt="임시 이미지"></p>
        <div class="txt">
            <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
        </div>
    </div>
    <div class="inr">
        <p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p>
        <div class="txt">
            <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
        </div>
    </div>
    <div class="inr">
        <p class="img rsp_img"><img src="/common/images/con_com/img_temp2.png" alt="임시 이미지"></p>
        <div class="txt">
            <h4 class="tit-st contents">Title2. 콘텐츠 타이틀</h4>
            <h5 class="tit-st unit">Title3. 콘텐츠 타이틀 2번째 있을 경우</h5>
            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
            <h5 class="tit-st unit">Title3. 콘텐츠 타이틀 2번째 있을 경우</h5>
            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
        </div>
    </div>
</div>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>이미지 정렬</h4>
                    <p class="sub">이미지 한줄에 여러개 들어갈 경우</p>
                    <p class="sub">열 개수에 따라 col-3 / col-2 / col-5 클래스 추가 (기본 : 4개)</p>

                    <h4 class="tit-st contents">이미지 W : 50% H : auto</h4>
                    <div class="align-wrap col-2">
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<div class="align-wrap col-2">
    <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
    <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
</div>
                    </textarea>
                    <!-- code -->

                    <h4 class="tit-st contents">이미지 W : 33% H : auto</h4>
                    <div class="align-wrap col-3">
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<div class="align-wrap col-3">
    <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
    <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
    <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
</div>
                    </textarea>
                    <!-- code -->

                    <h4 class="tit-st contents">이미지 W : 25% H : auto</h4>
                    <div class="align-wrap">
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<div class="align-wrap">
    <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
    <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
    <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
    <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
</div>
                    </textarea>
                    <!-- code -->

                    <h4 class="tit-st contents">이미지 W : 20% H : auto</h4>
                    <div class="align-wrap col-5">
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
 <div class="align-wrap col-5">
        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
        <div class="inr"><p class="img rsp_img"><img src="/common/images/con_com/img_temp1.png" alt="임시 이미지"></p></div>
    </div>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>텍스트 정렬</h4>
                    <p class="sub">텍스트 한줄에 여러개 들어갈 경우</p>
                    <p class="sub">열 개수에 따라 col-3 / col-2 / col-5 클래스 추가 (기본 : 4개)</p>
                    <p class="sub pc_red">** Title3은 필수 아님. 어떤 텍스트가 들어가도 상관 없게 작업 요청</p>

                    
                    <h3 class="tit-st section">텍스트 W : 50% H : auto</h3>
                    <div class="align-wrap col-2">
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
 <div class="align-wrap col-2">
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
</div>
                    </textarea>
                    <!-- code -->

                    <h3 class="tit-st section">텍스트 W : 33% H : auto</h3>
                    <div class="align-wrap col-3">
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<div class="align-wrap col-3">
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
</div>
                    </textarea>
                    <!-- code -->

                    <h3 class="tit-st section">텍스트 W : 25% H : auto</h3>
                    <div class="align-wrap">
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<div class="align-wrap">
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
</div>
                    </textarea>
                    <!-- code -->

                    <h3 class="tit-st section">텍스트 W : 20% H : auto</h3>
                    <div class="align-wrap col-5">
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
<div class="align-wrap col-5">
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
</div>
                    </textarea>
                    <!-- code -->
                </article>
                <article>
                    <h4>텍스트 정렬</h4>
                    <p class="sub">텍스트 한줄에 여러개 들어갈 경우</p>
                    <p class="sub">열 개수에 따라 col-3 / col-2 / col-5 클래스 추가 (기본 : 4개)</p>
                    <p class="sub pc_red">** Title3은 필수 아님. 어떤 텍스트가 들어가도 상관 없게 작업 요청</p>

                    
                    <h3 class="tit-st section">텍스트 W : 50% H : auto</h3>
                    <div class="align-wrap col-2">
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                        <div class="inr">
                            <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
                            <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
                            <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
                        </div>
                    </div>

                    <!-- code -->
                    <p class="badge"><span>Code</span> <button class="btn-st sec" onclick="codeCopy(this)"><i class="ri-file-copy-line" aria-hidden="true"></i></button></p>
                    <textarea>
 <div class="align-wrap col-2">
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
    <div class="inr">
        <h4 class="tit-st contents">Title2 텍스트 W : 50% H : auto</h4>
        <h5 class="tit-st unit">Title3 콘텐츠 타이틀이 있을 경우</h5>
        <p>서비스 이용을 위해 필요한 기본 정보가 이 영역에 표시됩니다.해당 화면은 실제 데이터가 아닌 예시 데이터로 구성되어 있습니다.</p>
    </div>
</div>
                    </textarea>
                    <!-- code -->
                </article>
            </div>
        </section>
    </div>
</div>