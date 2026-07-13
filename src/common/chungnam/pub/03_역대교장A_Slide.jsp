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
					<div class="pri-his tyA slide wideCnt">

						<div class="history-header">
							<img src="/00_common/images/sub_com/pri_history_ico1.png" alt="" class="obj1">
							<p class="txt">학교를 빛내주신 <strong class="col">역대교장</strong>을 <strong>소개</strong>드립니다.</p>
							<img src="/00_common/images/sub_com/pri_history_ico2.png" alt="" class="obj2">
						</div>
					
						<div class="list-wrap">
							<!-- control-->
							<div class="control">
								<button class="btn-prev"><span class="hid">역대교장 슬라이드 이전으로</span><i class="ri-arrow-left-s-line" aria-hidden="true"></i></button>
								<button class="btn-next"><span class="hid">역대교장 슬라이드 다음으로</span><i class="ri-arrow-right-s-line" aria-hidden="true"></i></button>
							</div>

							<!-- 역대교장 swiper -->
							<div class="swiper priHisSwiper">
								<div class="swiper-wrapper">
									<div class="swiper-slide"><div class="card">
										<div class="inner">
											<p class="img"><img src="/00_common/images/sub_com/pri_history_A_temp.png" alt=""></p>
											<div class="info">
												<span class="order">제 <strong>01</strong> 대</span>
												<p><strong>홍길동</strong> 교장</p>
												<div class="term">
													<strong>재임기간</strong>
													2023.03.01. ~ 현재
												</div>
											</div>
											<p class="bg" aria-hidden="true"></p>
										</div>
										<a href="" class="btn-view">약력보기</a>
									</div></div>
									<div class="swiper-slide"><div class="card">
										<div class="inner">
											<p class="img"><img src="/00_common/images/sub_com/pri_history_A_temp.png" alt=""></p>
											<div class="info">
												<span class="order">제 <strong>02</strong> 대</span>
												<p><strong>홍길동</strong> 교장</p>
												<div class="term">
													<strong>재임기간</strong>
													2023.03.01. ~ 현재
												</div>
											</div>
											<p class="bg" aria-hidden="true"></p>
										</div>
										<a href="" class="btn-view">약력보기</a>
									</div></div>
									<div class="swiper-slide"><div class="card">
										<div class="inner">
											<p class="img"><img src="/00_common/images/sub_com/pri_history_A_temp.png" alt=""></p>
											<div class="info">
												<span class="order">제 <strong>03</strong> 대</span>
												<p><strong>홍길동</strong> 교장</p>
												<div class="term">
													<strong>재임기간</strong>
													2023.03.01. ~ 현재
												</div>
											</div>
											<p class="bg" aria-hidden="true"></p>
										</div>
										<a href="" class="btn-view">약력보기</a>
									</div></div>
									<div class="swiper-slide"><div class="card">
										<div class="inner">
											<p class="img"><img src="/00_common/images/sub_com/pri_history_A_temp.png" alt=""></p>
											<div class="info">
												<span class="order">제 <strong>04</strong> 대</span>
												<p><strong>홍길동</strong> 교장</p>
												<div class="term">
													<strong>재임기간</strong>
													2023.03.01. ~ 현재
												</div>
											</div>
											<p class="bg" aria-hidden="true"></p>
										</div>
										<a href="" class="btn-view">약력보기</a>
									</div></div>
									<div class="swiper-slide"><div class="card">
										<div class="inner">
											<p class="img"><img src="/00_common/images/sub_com/pri_history_A_temp.png" alt=""></p>
											<div class="info">
												<span class="order">제 <strong>05</strong> 대</span>
												<p><strong>홍길동</strong> 교장</p>
												<div class="term">
													<strong>재임기간</strong>
													2023.03.01. ~ 현재
												</div>
											</div>
											<p class="bg" aria-hidden="true"></p>
										</div>
										<a href="" class="btn-view">약력보기</a>
									</div></div>
									<div class="swiper-slide"><div class="card">
										<div class="inner">
											<p class="img"><img src="/00_common/images/sub_com/pri_history_A_temp.png" alt=""></p>
											<div class="info">
												<span class="order">제 <strong>06</strong> 대</span>
												<p><strong>홍길동</strong> 교장</p>
												<div class="term">
													<strong>재임기간</strong>
													2023.03.01. ~ 현재
												</div>
											</div>
											<p class="bg" aria-hidden="true"></p>
										</div>
										<a href="" class="btn-view">약력보기</a>
									</div></div>
								</div>
							</div>
						</div>
					</div>
						
					<!-- 약력보기 팝업 -->
					<div class="pri-his popup" id="preHisPopup" role="dialog" aria-modal="true" aria-hidden="true" tabindex="-1">
						<div class="popup-wrap">
							<div class="info-wrap">
								<p class="img"><img src="/00_common/images/sub_com/pri_history_A_temp.png" alt=""></p>
								<div class="info">
									<span class="order">제 <strong>01</strong> 대</span>
									<p><strong>홍길동</strong> 교장</p>
									<div class="term">
										<strong>재임기간</strong>
										2023.03.01. ~ 현재
									</div>
								</div>
							</div>
							<div class="list-wrap">
								<h4 class="tit-st unit">학력</h4>
								<ul>
									<li><strong>1982</strong>
										<p>00대학교 00학과 졸업</p>
										<p>00대학교 00학과 졸업</p>
									</li>
									<li><strong>1982</strong>
										<p>00대학교 00학과 졸업</p>
									</li>
								</ul>

								<h4 class="tit-st unit">주요 업적</h4>
								<ul>
									<li><strong>1999</strong>
										<p>영어전용교실 개설</p>
									</li>
									<li><strong>2000</strong>
										<p>국제교류 준비위원회 구성</p>
									</li>
									<li><strong>2002</strong>
										<p>교육과정 다양화 프로그램 시작</p>
									</li>
									<li><strong>2003 ~ 2004</strong>
										<p>교육시설 친환경 개선사업 착수</p>
									</li>
									<li><strong>2006</strong>
										<p>전 교실 디지털 철판 설치</p>
									</li>
									<li><strong>2010 ~ 2004</strong>
										<p>00초등학교 교감</p>
									</li>
								</ul>
							</div>
							<p class="bg" aria-hidden="true"></p>
							<button class="btn-close"><span class="hid">약력보기 팝업 닫기</span><i class="ri-close-line" aria-hidden="true"></i></button>
						</div>
					</div>
					<!-- //약력보기 팝업-->

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
