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
					<div class="board tyC">
						
						<div class="bbs-latestA"> <!-- 최신게시물 A타입 -->
							<div class="bbs-box">
								<a href="#">
									<p class="tit">제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분</p>
									<p class="desc">미래를 준비한다는 말은 종종 막연하게 들린다. 그러나 미래를 준비하는 일은 멀리 있는 거창한 계획이 아니라, 오늘의 삶을 조금 덜 불안하게 만드는 것에서 시작된다. 창작을 꿈꾸는 청년이 다음 작품을 이어갈 수 있도록 숨을 고르게 하고, 아이를 키우는 부모가 하루의 시간표를 다시 짜지 않아도 되게 하며, 학생과 학부모가 교육비 걱정 대신 배움에 집중할 수 있게 하는 것. 정부가 올해부터 본격적으로 추진하는 '미래준비 지원' 정책은 이렇게 국민의 일상에 직접 닿는 변화에 초점을 맞췄다.</p>
									<div class="info">
										<div class="">
											<p>홍길동</p>
											<p>2026.00.00</p>
										</div>
										<div class="">
											<p><i class="ri-eye-line"><span class="hid">조회수</span></i> 196</p>
											<p><i class="ri-file-copy-2-line"><span class="hid">첨부파일</span></i>2</p>
										</div>
									</div>
								</a>
							</div>
							<div class="bbs-box">
								<a href="#">
									<p class="tit">제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분</p>
									<p class="desc">미래를 준비한다는 말은 종종 막연하게 들린다. 그러나 미래를 준비하는 일은 멀리 있는 거창한 계획이 아니라, 오늘의 삶을 조금 덜 불안하게 만드는 것에서 시작된다. 창작을 꿈꾸는 청년이 다음 작품을 이어갈 수 있도록 숨을 고르게 하고, 아이를 키우는 부모가 하루의 시간표를 다시 짜지 않아도 되게 하며, 학생과 학부모가 교육비 걱정 대신 배움에 집중할 수 있게 하는 것. 정부가 올해부터 본격적으로 추진하는 '미래준비 지원' 정책은 이렇게 국민의 일상에 직접 닿는 변화에 초점을 맞췄다.</p>
									<div class="info">
										<div>
											<p>홍길동</p>
											<p>2026.00.00</p>
										</div>
										<div>
											<p><i class="ri-eye-line"><span class="hid">조회수</span></i> 196</p>
											<p><i class="ri-file-copy-2-line"><span class="hid">첨부파일</span></i>2</p>
										</div>
									</div>
								</a>
							</div>
						</div>
																
						
						<div class="bbs-srch">
							<form name="srchForm">
								<fieldset>								
									<div class="srch-list srch-detail"> <!-- 상세검색이 있는 옵션 사용 시 srch-detail 추가 사용 -->
										<div class="select-box">
											<select name="searchType" title="검색옵션">
												<option value="all">전체</option>
												<option value="subject">제목</option>
												<option value="contents">내용</option>
												<option value="nm">작성자</option>
											</select>
										</div>
										<div class="select-box">
											<select name="searchType" title="검색옵션">
												<option value="all">전체</option>
												<option value="subject">제목</option>
												<option value="contents">내용</option>
												<option value="nm">작성자</option>
											</select>
										</div>
										<div class="select-box">
											<select name="searchType" title="검색옵션">
												<option value="all">전체</option>
												<option value="subject">제목</option>
												<option value="contents">내용</option>
												<option value="nm">작성자</option>
											</select>
										</div>
										<div class="select-box">
											<select name="searchType" title="검색옵션">
												<option value="all">전체</option>
												<option value="subject">제목</option>
												<option value="contents">내용</option>
												<option value="nm">작성자</option>
											</select>
										</div>
									</div>
									<div class="srch-list">
										<div class="select-box">
											<select name="searchType" title="검색옵션">
												<option value="all">전체</option>
												<option value="subject">제목</option>
												<option value="contents">내용</option>
												<option value="nm">작성자</option>
											</select>
										</div>
										<div class="select-box">
											<select name="searchType" title="검색옵션">
												<option value="all">전체</option>
												<option value="subject">제목</option>
												<option value="contents">내용</option>
												<option value="nm">작성자</option>
											</select>											
										</div>
										<input type="date" title="시작일">
										<input type="text" title="검색단어" maxlength="80" placeholder="검색어를 입력하세요.">
										<button title="검색" class="btn-search">검색</button>
									</div>
								</fieldset>
							</form>
						</div>
						
						<div class="bbs-info">
							<div class="page-total">
								<p class="total">전체<strong>26</strong>건</p>
								<p class="page"><strong>1</strong>3페이지</p>
							</div>
							<div class="page-util">
								<form>
									<fieldset>
										<div class="select-box">
											<select name="listCo" title="한페이지당 게시물 갯수">           
												<option value="10" selected="">10건</option>
												<option value="20">20건</option>
												<option value="30">30건</option>
												<option value="40">40건</option>
												<option value="50">50건</option>
											</select>
										</div>
										<!-- <button title="검색" class="btn-search">확인</button> -->
									</fieldset>
								</form>
							</div>
						</div>
												
						<div class="bbs-list">
							<table>
								<caption></caption>
								<colgroup>
									<col style="width:10%">
									<col style="width:auto">
									<col style="width:10%">
									<col style="width:15%">
									<col style="width:5%">
									<col style="width:10%">
								</colgroup>
								<thead>
									<tr>
										<th scope="col">번호</th>
										<th scope="col">제목</th>
										<th scope="col">작성자</th>
										<th scope="col">등록일</th>
										<th scope="col">첨부</th>
										<th scope="col">조회수</th>
									</tr>
								</thead>							
								<tbody>
									<tr class="notice">
										<td><span class="badge">공지</span></td>									
										<td class="title">
											<a href="">제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분</a>
										</td>
										<td>홍길동</td>
										<td>2026.00.00</td>
										<td class="file mNone"><a href=""><i class="ri-file-copy-2-line"></i><span class="hid">첨부파일 다운로드</span></a></td>
										<td>196</td>
									</tr>
									<tr class="notice">
										<td><span class="badge">공지</span></td>									
										<td class="title">
											<a href="">제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분</a>
										</td>
										<td>홍길동</td>
										<td>2026.00.00</td>
										<td class="file mNone"><a href=""><i class="ri-file-copy-2-line"></i><span class="hid">첨부파일 다운로드</span></a></td>
										<td>196</td>
									</tr>
									
									
									<tr>
										<td>154</td>									
										<td class="title">
											<a href="">제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분</a>
										</td>
										<td>홍길동</td>
										<td>2026.00.00</td>
										<td class="file mNone"><a href=""><i class="ri-file-copy-2-line"></i><span class="hid">첨부파일 다운로드</span></a></td>
										<td>196</td>
									</tr>
									<tr>
										<td>153</td>									
										<td class="title">
											<a href="">제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분</a>
										</td>
										<td>홍길동</td>
										<td>2026.00.00</td>
										<td class="file mNone"><a href=""><i class="ri-file-copy-2-line"></i><span class="hid">첨부파일 다운로드</span></a></td>
										<td>196</td>
									</tr>
									<tr>
										<td>152</td>									
										<td class="title">
											<a href="">제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분 제목출력 부분</a>
										</td>
										<td>홍길동</td>
										<td>2026.00.00</td>
										<td class="file mNone"><a href=""><i class="ri-file-copy-2-line"></i><span class="hid">첨부파일 다운로드</span></a></td>
										<td>196</td>
									</tr>
								</tbody>
							</table>
						</div>
						
						
						<div class="bbs-pager">
							<button type="button" class="bbs-arr" aria-label="첫 페이지"><i class="ri-skip-left-line"></i></button>
							<button type="button" class="bbs-arr" aria-label="이전 페이지"><i class="ri-arrow-left-s-line"></i></button>
						
							<div class="bbs-pager-num">
								<button type="button" class="num active" title="현재페이지">1</button>
								<button type="button" class="num">2</button>
								<button type="button" class="num">3</button>
								<button type="button" class="num">4</button>
								<button type="button" class="num">5</button>
								<button type="button" class="num">6</button>
								<button type="button" class="num">7</button>
								<button type="button" class="num">8</button>
								<button type="button" class="num">9</button>
								<button type="button" class="num">10</button>
							</div>
						
							<button type="button" class="bbs-arr" aria-label="다음 페이지"><i class="ri-arrow-right-s-line"></i></button>
							<button type="button" class="bbs-arr" aria-label="끝 페이지"><i class="ri-skip-right-line"></i></button>
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
