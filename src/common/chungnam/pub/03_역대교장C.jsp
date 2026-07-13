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
					<div class="pri-his tyC ty-img"><!-- 이미지 있을 시 'ty-img'-->
						<div class="list-wrap">
							<!-- 역대교장 List -->
							<ul>
								<li>
									<div class="info-wrap">
										<!-- 이미지 있을 시 -->
										<p class="img"><img src="/00_common/images/sub_com/pri_history_C_temp.png" alt=""></p>
										<div class="inr">
											<span class="order">제 <strong>01</strong> 대</span>
											<p><strong>홍길동</strong> 교장</p>
											<div class="term">
												<strong>재임기간</strong>
												2023.03.01. ~ 현재
											</div>
										</div>
									</div>
									<!-- 이미지 있을 시 -->
									<div class="his-wrap">
										<dl>
											<dt>주요업적</dt>
											<dd>
												<p class="bu-st3">디지털 교과서 시범 운영 (2005년)</p>
												<p class="bu-st3">개교 20주년 기념행사 개최 (2005년) 개교 20주년 기념행사 개최 (2005년) 개교 20주년 기념행사 개최 (2005년) 개교 20주년 기념행사 개최 (2005년)</p>
												<p class="bu-st3">교육 정보화 우수학교 선정 (2005년)</p>
												<p class="bu-st3">창의성 계발 프로그램 도입 (2006년)</p>
											</dd>
										</dl>
										<dl>
											<dt>주요업적</dt>
											<dd>
												<p class="bu-st3">디지털 교과서 시범 운영 (2005년)</p>
												<p class="bu-st3">개교 20주년 기념행사 개최 (2005년) 개교 20주년 기념행사 개최 (2005년) 개교 20주년 기념행사 개최 (2005년) 개교 20주년 기념행사 개최 (2005년)</p>
												<p class="bu-st3">교육 정보화 우수학교 선정 (2005년)</p>
												<p class="bu-st3">창의성 계발 프로그램 도입 (2006년)</p>
											</dd>
										</dl>
									</div>
									<!-- //이미지 있을 시 -->
								</li>
								<li>
									<div class="info-wrap">
										<!-- 이미지 있을 시 -->
										<p class="img"><img src="/00_common/images/sub_com/pri_history_C_temp.png" alt=""></p>
										<div class="inr">
											<span class="order">제 <strong>02</strong> 대</span>
											<p><strong>홍길동</strong> 교장</p>
											<div class="term">
												<strong>재임기간</strong>
												2023.03.01. ~ 2023.03.01.
											</div>
										</div>
									</div>
									<!-- 이미지 있을 시 -->
									<div class="his-wrap">
										<dl>
											<dt>주요업적</dt>
											<dd>
												<p class="bu-st3">디지털 교과서 시범 운영 (2005년)</p>
												<p class="bu-st3">개교 20주년 기념행사 개최 (2005년) 개교 20주년 기념행사 개최 (2005년) 개교 20주년 기념행사 개최 (2005년) 개교 20주년 기념행사 개최 (2005년)</p>
												<p class="bu-st3">교육 정보화 우수학교 선정 (2005년)</p>
												<p class="bu-st3">창의성 계발 프로그램 도입 (2006년)</p>
											</dd>
										</dl>
									</div>
									<!-- //이미지 있을 시 -->
								</li>
								<li>
									<div class="info-wrap">
										<!-- 이미지 있을 시 -->
										<!-- <p class="img"><img src="/00_common/images/sub_com/pri_history_C_temp.png" alt=""></p> -->
										<div class="inr">
											<span class="order">제 <strong>03</strong> 대</span>
											<p><strong>홍길동</strong> 교장</p>
											<div class="term">
												<strong>재임기간</strong>
												2023.03.01. ~ 2023.03.01.
											</div>
										</div>
									</div>
									<!-- 이미지 있을 시 -->
									<!-- <div class="his-wrap">
										<h5>주요업적</h5>
										<p class="bu-st3">디지털 교과서 시범 운영 (2005년)</p>
										<p class="bu-st3">개교 20주년 기념행사 개최 (2005년)</p>
									</div> -->
								</li>
								<li>
									<div class="info-wrap">
										<!-- 이미지 있을 시 -->
										<!-- <p class="img"><img src="/00_common/images/sub_com/pri_history_C_temp.png" alt=""></p> -->
										<div class="inr">
											<span class="order">제 <strong>04</strong> 대</span>
											<p><strong>홍길동</strong> 교장</p>
											<div class="term">
												<strong>재임기간</strong>
												2023.03.01. ~ 2023.03.01.
											</div>
										</div>
									</div>
									<!-- 이미지 있을 시 -->
									<!-- <div class="his-wrap">
										<h5>주요업적</h5>
										<p class="bu-st3">디지털 교과서 시범 운영 (2005년)</p>
										<p class="bu-st3">개교 20주년 기념행사 개최 (2005년)</p>
										<p class="bu-st3">교육 정보화 우수학교 선정 (2005년)</p>
										<p class="bu-st3">창의성 계발 프로그램 도입 (2006년)</p>
										<p class="bu-st3">디지털 교과서 시범 운영 (2005년)</p>
										<p class="bu-st3">개교 20주년 기념행사 개최 (2005년)</p>
										<p class="bu-st3">교육 정보화 우수학교 선정 (2005년)</p>
									</div> -->
								</li>
								<li>
									<div class="info-wrap">
										<!-- 이미지 있을 시 -->
										<!-- <p class="img"><img src="/00_common/images/sub_com/pri_history_C_temp.png" alt=""></p> -->
										<div class="inr">
											<span class="order">제 <strong>05</strong> 대</span>
											<p><strong>홍길동</strong> 교장</p>
											<div class="term">
												<strong>재임기간</strong>
												2023.03.01. ~ 2023.03.01.
											</div>
										</div>
									</div>
									<!-- 이미지 있을 시 -->
									<!-- <div class="his-wrap">
										<h5>주요업적</h5>
										<p class="bu-st3">디지털 교과서 시범 운영 (2005년)</p>
										<p class="bu-st3">개교 20주년 기념행사 개최 (2005년)</p>
										<p class="bu-st3">교육 정보화 우수학교 선정 (2005년)</p>
										<p class="bu-st3">창의성 계발 프로그램 도입 (2006년)</p>
									</div> -->
								</li>
							</ul>
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
