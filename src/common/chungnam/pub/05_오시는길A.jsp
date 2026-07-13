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
					<div class="roadmap tyA wideCnt">
						<div class="container">
							<h3 class="title"><span>오시는 길</span>을 <span>소개</span>합니다.</h3>
							<div class="info">
								<ul class="info-list">
									<li class="w100"><span>주소.</span> [35203] 대전광역시 서구 둔산대로 117번길, 95 케이엘학교</li>
									<li><span>Tel.</span> 123-456-7890</li>
									<li><span>Fax.</span> 123-456-7899</li>
								</ul>
								<a href="" class="btn-search">카카오맵 길찾기</a>
							</div>
							<div class="map-wrap">
								<div class="map-box">
									<img src="/00_common/images/sub_com/map.png" alt="">
								</div>
							</div>
							<div class="map-list">
								<div class="box bus">
									<span>버스</span>
									<ul>
										<li><span>주변버스</span>
											<ul class="bus-list">
												<li><em class="org">지선</em>123, 456</li>
												<li><em class="grn">순환</em>78, 90, 100</li>
											</ul>
										</li>
										<li><span>주변정류장</span>
											<ul class="stop-list">
												<li><em>1</em>케이엘유치원</li>
												<li><em>2</em>케이엘초등학교</li>
												<li><em>3</em>케이엘중학교</li>
												<li><em>4</em>케이엘고등학교</li>
											</ul>
										</li>
									</ul>
								</div>
								<div class="box subway">
									<span>지하철</span>
									<ul>
										<li><span>1호선 이용</span><em class="org">1</em>대한역 3번 출구 도보 5분</li>
										<li><span>5호선 이용</span><em class="brown">5</em>민국역 1번 출구 도보 12분</li>
									</ul>
								</div>
								<div class="box car">
									<span>자가용</span>
									<ul>
										<li><span>대한IC 이용</span>대한교차로에서 입구 고가도로 방향 직진 → 국민사거리 지나 직진 → 농협사거리 지나 직진 → <br>대한파출소 지나 바로 우회전하고 한 블럭 다시 좌회전 (소요시간 약 11분)</li>
									</ul>
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
