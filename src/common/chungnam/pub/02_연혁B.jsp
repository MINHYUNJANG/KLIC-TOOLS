<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
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
				<c:param name="templateType" value="${templateType}" />
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
						<c:param name="templateType" value="${templateType}" />
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
										<button aria-expanded="false" aria-controls="snb-panel-1">depth 01 메뉴 :
											Active</button><!-- 현재 메뉴 -->
										<ul>
											<li><a href=""><span>depth 01 메뉴명</span></a></li>
											<li><a href=""><span>depth 01 메뉴명</span></a></li>
											<li><a href=""><span>depth 01 메뉴명</span></a></li>
											<li><a href=""><span>depth 01 메뉴명</span></a></li>
											<li><a href=""><span>depth 01 메뉴명</span></a></li>
										</ul>
									</div>
									<div class="dep dep02">
										<button aria-expanded="false" aria-controls="snb-panel-2">depth 02 메뉴 :
											Active</button><!-- 현재 메뉴 -->
										<ul>
											<li><a href="" target="_blank" title="새창"><span>depth 02 메뉴명</span></a></li>
											<li><a href="" target="_blank" title="새창"><span>depth 02 메뉴명</span></a></li>
											<li><a href="" target="_blank" title="새창"><span>depth 02 메뉴명</span></a></li>
											<li><a href="" target="_blank" title="새창"><span>depth 02 메뉴명</span></a></li>
											<li><a href="" target="_blank" title="새창"><span>depth 02 메뉴명</span></a></li>
										</ul>
									</div>
									<div class="dep dep03">
										<button aria-expanded="false" aria-controls="snb-panel-3">depth 03 메뉴 :
											Active</button><!-- 현재 메뉴 -->
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
									<div class="history tyB wideCnt"><!-- 이미지 있을 시 'ty-img'-->
										<!-- !!! 연혁 Type B는 각 탭의 연혁 리스트 영역마다 데이터양의 길이가 100wh 정도 일 경우에 추천드립니다. !!! -->

										<div class="container">

											<!-- 이미지 있을 시, -->
											<!-- <div class="obj"><img src="/00_common/images/sub_com/history_B_bg.png" alt=""></div> -->

											<div class="inner">

												<div class="history-sticky">

													<!-- 중앙 year -->
													<div class="history-header">
														<h4>학생을 위한 좋은 학교<br> <strong>케이엘 학교</strong></h4>

														<!-- 이미지 없을 시 -->
														<strong class="year-title">2020 ~ 현재</strong>

														<div class="year">
															<ul>
																<li><a href="javascript:void(0);" data-target="history1">2020 ~ 현재</a></li>
																<li><a href="javascript:void(0);" data-target="history2">2010 ~ 2019</a></li>
																<li><a href="javascript:void(0);" data-target="history3">2000 ~ 2009</a></li>
																<li><a href="javascript:void(0);" data-target="history4">1990 ~ 1999</a></li>
																<li><a href="javascript:void(0);" data-target="history5">이전 ~ 1989</a></li>
															</ul>
														</div>
													</div>
												</div>

												<!-- 연혁 콘텐츠 -->
												<div class="list-wrap">
												
													<p class="progress"><span></span></p>
													<div class="list" id="history1">
												
														<dl>
															<dt>2025</dt>
															<dd>
																<ul class="bu-st3 list">
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																</ul>
															</dd>
														</dl>
												
														<dl>
															<dt>2024</dt>
															<dd>
																<ul class="bu-st3 list">
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																</ul>
															</dd>
														</dl>
												
														<dl>
															<dt>2023</dt>
															<dd>
																<ul class="bu-st3 list">
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																</ul>
															</dd>
														</dl>
													</div>
													<div class="list" id="history2">
												
														<dl>
															<dt>2012</dt>
															<dd>
																<ul class="bu-st3 list">
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																</ul>
															</dd>
														</dl>
														<dl>
															<dt>2011</dt>
															<dd>
																<ul class="bu-st3 list">
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																</ul>
															</dd>
														</dl>
												
														<dl>
															<dt>2010</dt>
															<dd>
																<ul class="bu-st3 list">
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																</ul>
															</dd>
														</dl>
													</div>
												
													<div class="list" id="history3">
														<dl>
															<dt>2002</dt>
															<dd>
																<ul class="bu-st3 list">
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																</ul>
															</dd>
														</dl>
														<dl>
															<dt>2001</dt>
															<dd>
																<ul class="bu-st3 list">
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다
																			</p>
																		</div>
																	</li>
																</ul>
															</dd>
														</dl>
														<dl>
															<dt>2000</dt>
															<dd>
																<ul class="bu-st3 list">
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이
																				들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이
																				들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이
																				들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이
																				들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이
																				들어갑니다</p>
																		</div>
																	</li>
																</ul>
															</dd>
														</dl>
													</div>
													<div class="list" id="history4">
														<dl>
															<dt>1999</dt>
															<dd>
																<ul class="bu-st3 list">
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																</ul>
															</dd>
														</dl>
													</div>
													<div class="list" id="history5">
														<dl>
															<dt>1989 - 이전</dt>
															<dd>
																<ul class="bu-st3 list">
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																	<li><strong>08.20</strong>
																		<div class="inr">
																			<p>학교 연혁 내용이 들어갑니다 학교 연혁 내용이 들어갑니다</p>
																		</div>
																	</li>
																</ul>
															</dd>
														</dl>
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