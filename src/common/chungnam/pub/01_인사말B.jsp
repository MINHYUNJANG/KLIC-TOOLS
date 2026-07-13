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
					<div class="greeting tyB wideCnt"><!-- 이미지 있을 시 'ty-img'-->
						<div class="container">
							<!-- 이미지 있을 시 -->
							<!-- <div class="img-wrap">
								<div class="img">
									<p><img src="/00_common/images/sub_com/greeting_B_temp.png" alt="교장 홍길동 사진"></p>
								</div>
								<div class="sign">케이엘학교 교장 <strong>홍 길 동</strong></div>
							</div> -->
								
							<div class="inner">
								<div class="lead-wrap">
									<!-- lead text -->
									<div class="lead-txt">
										<h4>Great School!</h4>
										<p>더 강한 학교로 더 빛나는 미래를 향해</p>
									</div>

									<!-- sign : 이미지 !!"""없을 시"""!! -->
									<div class="sign">케이엘학교 교장 <strong>홍 길 동</strong></div>
								</div>

								<div class="txt-wrap">
									<div class="txt">
										<p>
											우리 학교는 배움 속에서 성장하고, 나눔 속에서 행복을 느끼는 학교 라는 교육 비전을 가지고 있습니다.<br>
											학교는 단순히 지식을 전달하는 공간이 아니라, 아이들이 자신의 꿈을 발견하고 서로 존중하며 협력하는 법을 배우는 삶의 터전이라고 생각합니다.
										</p>
										<p>
											학생들은 이곳에서 기초 학력과 창의적 역량을 키우고, 더불어 살아가는 사회 속에서 필요한 배려와 공동체 정신을 익히며 자라나게 될 것입니다.
										</p>
										<p>
											이를 위해 우리 교직원 모두는 학생 한 명 한 명의 눈높이에 맞춘 교육을 실천하고, <br>
											미래 사회를 살아갈 힘을 기를 수 있도록 다양한 교육 활동을 펼쳐 나가겠습니다.
										</p>
										<p>
											또한, 학교는 학부모님과 지역사회와 함께할 때 더욱 든든해집니다. <br>
											학부모님들께서 보내주시는 따뜻한 관심과 격려, 그리고 지역사회의 아낌없는 지원은 우리 아이들이 행복하게 성장할 수 있는 큰 힘이 됩니다.<br>
											앞으로도 가정·학교·지역사회가 손잡고 아이들의 꿈을 키워가는 데 함께하길 기대합니다.
										</p>
										<p>
											앞으로도 모든 분들께 사랑받는 학교, 신뢰받는 학교가 되도록 <br>최선을 다하겠습니다.
										</p>
										<p>감사합니다.</p>
									</div>
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
