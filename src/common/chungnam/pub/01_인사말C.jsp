<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<% request.setCharacterEncoding("UTF-8"); %>

<c:set var="templateType" value="T1001" />
<c:set var="supportID" value="" />
<c:set var="sysID" value="" />
<c:set var="layoutType" value="sub" />
<c:set var="schoolName" value="경기도 지원청" />

<!DOCTYPE html>
<html lang="ko" data-theme="default"><!-- color theme -->
<c:import url="/pub/template/metaTag.jsp">
	<c:param name="templateType" value="${templateType}"/>
	<c:param name="supportID" value="${supportID}" /> 
	<c:param name="sysID" value="${sysID}" /> 
	<c:param name="layoutType" value="${layoutType}" /> 
	<c:param name="schoolName" value="${schoolName}" /> 
</c:import>

<body> 
<!-- 바로가기 -->
<div id="skipArea"> 
	<a href="#container">본문으로 바로가기</a>
	<a href="#gnb">메인메뉴 바로가기</a>
</div>
<!-- //바로가기 -->
<div id="wrap" data-theme="purple">
	
	<c:import url="/pub/template/header.jsp">
		<c:param name="templateType" value="${templateType}"/>
		<c:param name="supportID" value="${supportID}" /> 
		<c:param name="sysID" value="${sysID}" /> 
		<c:param name="layoutType" value="${layoutType}" /> 
		<c:param name="schoolName" value="${schoolName}" /> 
	</c:import>

	<!-- 컨테이너 -->
	<div id="sub_container">

		<c:import url="/pub/template/location.jsp"></c:import>

		<div class="subCntBody">

			<!-- 서브메뉴 시작 --> 
			<aside id="snb">
				<nav class="snb-wrap container"> 
					<div class="dep dep01">
						<button aria-expanded="false" aria-controls="snb-panel-1">depth 01 메뉴 : Active</button><!-- 현재 메뉴 -->
						<ul>
							<li><a href=""><span>depth 01 메뉴명</span></a></li>
							<li><a href=""><span>depth 01 메뉴명</span></a></li>
							<li><a href=""><span>depth 01 메뉴명</span></a></li>
							<li><a href=""><span>depth 01 메뉴명</span></a></li>
							<li><a href=""><span>depth 01 메뉴명</span></a></li>
						</ul>
					</div>
					<div class="dep dep02">
						<button aria-expanded="false" aria-controls="snb-panel-2">depth 02 메뉴 : Active</button><!-- 현재 메뉴 -->
						<ul>
							<li><a href="" target="_blank" title="새창"><span>depth 02 메뉴명</span></a></li>
							<li><a href="" target="_blank" title="새창"><span>depth 02 메뉴명</span></a></li>
							<li><a href="" target="_blank" title="새창"><span>depth 02 메뉴명</span></a></li>
							<li><a href="" target="_blank" title="새창"><span>depth 02 메뉴명</span></a></li>
							<li><a href="" target="_blank" title="새창"><span>depth 02 메뉴명</span></a></li>
						</ul>
					</div>
					<div class="dep dep03">
						<button aria-expanded="false" aria-controls="snb-panel-3">depth 03 메뉴 : Active</button><!-- 현재 메뉴 -->
						<ul>
							<li class="active"><a href=""><span>depth 03 메뉴명</span></a></li>
							<li><a href="" target="_blank" title="새창"><span>depth 03 메뉴명</span></a></li>
						</ul>
					</div>
				</nav> 
			</aside>
			<!-- //서브메뉴 끝 -->

			<!-- 서브컨텐츠 blur overlay -->
			<p class="snb-dim"></p>

			<!-- 4차메뉴 TAB 영역 -->
			<div class="tab-wrap container">
				<div class="tab-st depth01 not-js sub-snb">
					<ul>
						<li class="on"><a href="">1차 탭 : Active</a></li>
						<li><a href="">1차 탭 : Hover</a></li>
						<li><a href="">1차 탭 : Enable</a></li>
						<li><a href="" target="_blank" title-="새창">1차 탭 : Focus</a></li>
					</ul>
				</div>
			</div>
			<!-- //4차메뉴 TAB 영역 -->

			<!-- 서브 영역 -->
			<section id="subContent" class="container">

				<div>
					<!-- contents -->
					<div class="greeting tyC ty-img wideCnt"><!-- 이미지 있을 시 'ty-img'-->
						<div class="container">
							<div class="obj">
								<p class="mask mask1"></p>
								<p class="mask mask2"></p>
								<p class="mask mask3"></p>
							</div>
				
							<div class="inner">
								<div class="lead-wrap">
									<!-- lead text -->
									<div class="lead-txt">
										<h4>안녕하십니까 ? <br><strong>케이엘학교 교장 홍길동</strong>입니다.</h4>
										<p>우리 학교에 오신 것을 환영합니다.</p>
									</div>
									
									<!-- 이미지 있을 시 -->
									<div class="img"><p><img src="/00_common/images/sub_com/greeting_C_temp.png" alt="교장 홍길동 사진"></p></div>
								</div>
								<div class="txt-wrap">
				
									<div class="txt">
										<p>
											우리 학교 홈페이지에 방문해 주셔서 정말 고맙습니다.<br>
											이곳에서 우리 아이들의 밝은 웃음소리와 열정적인 배움의 모습을 느끼실 수 있기를 바랍니다.
										</p>
											
										<p>케이엘 학교는 단순히 지식을 전달하는 곳이 아닙니다.<br>
											아이들이 꿈을 키우고, 친구들과 함께 성장하며, 세상을 바라보는 넓은 시각을 기를 수 있는 
											따뜻한 보금자리입니다.
										</p>

										<h4 class="tit-st contents">우리가 추구하는 자세</h4>
										<ul class="bu-st1 list">
											<li>아이들의 개성과 재능을 발견하고 키워주는 교육</li>
											<li>서로를 존중하고 배려하는 마음을 기르는 교육</li>
											<li>세계와 소통하며 미래를 준비하는 교육</li>
											<li>건강한 몸과 마음으로 행복한 삶을 살아가는 교육</li>
										</ul>

										<p>매일매일 아이들과 함께 웃고, 함께 배우며, 함께 꿈을 그려가는 우리 선생님들과 함께 여러분의 소중한 자녀가 건강하고 행복하게 성장할 수 있도록 최선을 다하겠습니다.</p>

										<p>언제든지 궁금한 것이 있으시면 편하게 연락해 주세요.<br>
										우리는 모두 한 가족입니다!</p>

										<p>감사합니다.</p>
									</div>
									
									<div class="sign">케이엘학교 교장 <strong>홍 길 동</strong></div>
								</div>
							</div>
						</div>
					</div>
					<!-- contents -->
				</div>
			</section>
			<!-- //서브 영역 -->
		</div> 
	</div>

	<c:import url="/pub/template/footer.jsp"></c:import>
	
</div>
</body>
</html>
