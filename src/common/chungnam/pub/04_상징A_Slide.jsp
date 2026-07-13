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

<!-- contents motion -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>

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
					<div class="symbol tyA slide">

						<div class="sybmbol-wrap">
							
							<div class="symbol-sticky">
								<div class="slogan">
									<h4>교훈</h4>
									<p><strong>정직 &middot; 사랑 &middot; 꿈</strong>을 가꾸는 <strong>어린이</strong></p>
								</div>
							</div>
						
							<div class="list-wrap">
								<div class="list-sticky">
									<div class="scroll-wrap">
										<div class="h-scroll">
											<div class="box">
												<p class="img"><img src="/00_common/images/sub_com/symbol_temp1.png" alt="00학교 교표 이미지"></p>
												<div class="inner">
													<h4>교표</h4>
													<p>OO학교의 교표입니다.</p>
												</div>
											</div>
											<div class="box">
												<p class="img"><img src="/00_common/images/sub_com/symbol_temp2.png" alt="00학교 교표 이미지"></p>
												<div class="inner">
													<h4>교기</h4>
													<p>OO학교의 교기입니다.</p>
												</div>
											</div>
											<div class="box">
												<p class="img"><img src="/00_common/images/sub_com/symbol_temp3.png" alt="00학교 교표 이미지"></p>
												<div class="inner">
													<h4>교화 <span>연꽃</span></h4>
													<p>진흙속에 뿌리를 박고 맑지 못한 물에서도 끈기있게 자라서 향기롭고 아름다운 꽃을 피우며, 강인한 줄기는 깊이 감추고 있는 자태는 전통적인 한국 여성의 순결성과도 같아 교화로 지정하여 보호하고 있습니다. </p>
												</div>
											</div>
											<div class="box">
												<p class="img"><img src="/00_common/images/sub_com/symbol_temp4.png" alt="00학교 교표 이미지"></p>
												<div class="inner">
													<h4>교화 <span>소나무</span></h4>
													<p>소나무는 사계절 푸르름을 잃지 않아 장수와 영원한 생명을 뜻하며, 거센 추위와 바람에도 굳건히 서 있어 절개와 충절의 상징이 됩니다. </p>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div class="box song-wrap">
							<div class="tit-wrap">
								<h4>교가</h4>
								<div class="btn-wrap">
									<button class="btn-st pri">교가듣기</button>
									<button class="btn-st sec">악보다운로드</button>
								</div>
							</div>
							<div class="inner">
								<div class="img"><p class="rsp_img"><img src="/00_common/images/sub_com/symbol_song.png" alt="00학교 교표 이미지"></p></div>
								<div class="lyr">
								 	<dl>
								 		<dt>교가 1절</dt>
								 		<dd>유구한 역사의 터전 속에서<br>
									우뚝솟은 광교산의 정기를 받아<br>
									새시들의 새싹들이 자라고 있는<br>
									배움의 보금자리 우리의 서원</dd>
								 	</dl>
								 	<dl>
								 		<dt>교가 2절</dt>
								 		<dd>충효의 얼이 깃든 서원 동산에<br>
									심곡혼의 빛난 얼을 가슴에 품고<br>
									우리들의 참된 지혜 초석이 되어<br>
									푸른 꿈 가꿔나갈 서원 어린이</dd>
								 	</dl>
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
