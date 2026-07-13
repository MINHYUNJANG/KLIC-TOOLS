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
						<div class="bbs-latestB"> <!-- 최신게시물 B타입 -->							
							<div class="bbs-latest-main">
								<a href="#">
									<div class="thumb">
										<img src="/00_common/images/board/gallery_img01.png" alt="">
									</div>
									<div class="text">
										<p class="tit">청년의 창작부터 유아 교육·보육까지…올해 지원 폭 넓힌다</p>
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
									</div>
								</a>							
							</div>
							<div class="bbs-latest-side">
								<div class="bbs-box">
									<a href="#">
										<div class="thumb">
											<img src="/00_common/images/board/gallery_img02.png" alt="">
										</div>
										<div class="text">
											<p class="tit">두번째 최신글 제목 출력 부분입니다. 두번째 최신글 제목 출력 부분입니다. 두번째 최신글 제목 출력 부분입니다. 두번째 최신글 제목 출력 부분입니다.</p>
											<p class="date">2026.00.00</p>
										</div>
									</a>
								</div>
								<div class="bbs-box">
									<a href="#">
										<div class="thumb">
											<img src="/00_common/images/board/gallery_img03.png" alt="">
										</div>
										<div class="text">
											<p class="tit">세번째 최신글 제목 출력 부분입니다.</p>
											<p class="date">2026.00.00</p>
										</div>
									</a>
								</div>
								<div class="bbs-box">
									<a href="#">
										<div class="thumb">
											<img src="/00_common/images/board/gallery_img04.png" alt="">
										</div>
										<div class="text">
											<p class="tit">네번째 최신글 제목 출력 부분입니다.</p>
											<p class="date">2026.00.00</p>
										</div>
									</a>
								</div>
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
												
						<div class="bbs-gallery">
							<ul>
								<li>
									<a href="">
										<div class="thumb">
											<img src="/00_common/images/board/gallery_img01.png" alt="">
										</div>
										<div class="txt">
											<p class="tit">'아이의 신체 변화 당황하지 마세요' 수원교육지원청이 전하는 자녀 성장 보고서</p>
											<p class="date">2026.03.23</p>
										</div>
									</a>
								</li>
								<li>
									<a href="">
										<div class="thumb">
											<img src="/00_common/images/board/gallery_img02.png" alt="">
										</div>
										<div class="txt">
											<p class="tit">수원교육지원청, 학교급식 잔식 기부사업 본격 운영…총 14개 학교 참여</p>
											<p class="date">2026.03.19</p>
										</div>
									</a>
								</li>
								<li>
									<a href="">										
										<div class="thumb">
											<img src="/00_common/images/board/gallery_img03.png" alt="">
										</div>
										<div class="txt">
											<p class="tit">2026 수원교육지원청 상반기 ‘지역교권보호위원회 심의위원’ 역량강화 연수 개최</p>
											<p class="date">2026.03.19</p>
										</div>
									</a>
								</li>
								<li>
									<a href="">										
										<div class="thumb">
											<img src="/00_common/images/board/gallery_img04.png" alt="">
										</div>										
										<div class="txt">
											<p class="tit">“교복 사러 멀리 갈 필요 없어요” 수원교육지원청, 학교로 찾아가는 교복은행 운영</p>
											<p class="date">2026.03.18</p>
										</div>
									</a>
								</li>
								<li>
									<a href="">										
										<div class="thumb">
											<img src="/00_common/images/board/gallery_img05.png" alt="">
										</div>
										<div class="txt">
											<p class="tit">2026 수원교육지원청 상반기 ‘지역교권보호위원회 심의위원’ 역량강화 연수 개최</p>
											<p class="date">2026.03.19</p>
										</div>
									</a>
								</li>
								<li>
									<a href="">										
										<div class="thumb">
											<img src="/00_common/images/board/gallery_img06.png" alt="">
										</div>										
										<div class="txt">
											<p class="tit">“교복 사러 멀리 갈 필요 없어요” 수원교육지원청, 학교로 찾아가는 교복은행 운영</p>
											<p class="date">2026.03.18</p>
										</div>
									</a>
								</li>
							</ul>
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
