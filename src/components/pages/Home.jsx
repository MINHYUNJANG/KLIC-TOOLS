const menuCards = [
  {
    label: '크롤링 마크업',
    iconSrc: '/icons/dazzle/browser.svg',
    desc: 'URL을 입력하면 해당 페이지의 본문을 자동으로 크롤링하여 웹 표준에 맞는 HTML 마크업을 생성합니다. CSS 셀렉터를 직접 지정하거나 자동 감지 방식을 사용할 수 있습니다.',
  },
  // {
  //   label: '콘텐츠 일괄 마크업',
  //   iconSrc: '/icons/dazzle/file-contract.svg',
  //   desc: 'KLIC 가이드 및 디자인 템플릿을 기반으로, 크롤링된 학교 사이트 콘텐츠가 선택한 서브콘텐츠 템플릿에 자동으로 입혀집니다. 여러 학교를 한 번에 처리해 반복 마크업 작업 시간을 대폭 줄여줍니다.',
  // },
  {
    label: 'MCP 마크업',
    iconSrc: '/icons/dazzle/pen-line.svg',
    desc: 'Claude 채팅에서 MCP로 추출한 HTML/CSS를 붙여넣어 미리보기·다운로드합니다. Figma API 토큰 없이 MCP 분석 결과를 바로 활용할 수 있습니다.',
  },
  {
    label: '테이블 변환',
    iconSrc: '/icons/dazzle/table-convert.svg',
    desc: '복잡한 HTML 테이블 구조를 KLIC 웹 표준에 맞게 자동으로 변환합니다. 병합 셀, 헤더 구조, 스타일 정리 등을 일괄 처리하여 마크업 수작업을 줄여줍니다.',
  },
  {
    label: 'KL서브콘텐츠빌더',
    iconSrc: '/icons/dazzle/gallery-thumbnails.svg',
    desc: '인사말, 연혁, 상징, 교육목표, 조직도, 오시는 길 등 다양한 콘텐츠 구조를 시각적으로 편집하고 마크업으로 변환할 수 있는 빌더 도구 모음입니다.',
    page: 'KL콘텐츠빌더',
  },
  {
    label: '웹검사도구',
    iconSrc: '/icons/dazzle/hexagon-check.svg',
    desc: '웹 표준 및 웹 접근성 준수 여부를 자동으로 검사합니다. WCAG·KWCAG 기준에 따른 항목별 결과와 증적 자료를 자동으로 생성하여 보고서 작성 시간을 줄여줍니다.',
  },
  {
    label: '대체텍스트 생성',
    iconSrc: '/icons/dazzle/image-user.svg',
    desc: '퍼블리싱으로 구현하기 어려운 이미지 콘텐츠의 URL을 입력하거나 이미지를 업로드하면, AI가 KWCAG 2.1에 맞는 alt 또는 숨김(sr-only) 대체텍스트 마크업을 자동으로 생성합니다.',
  },
];

export default function Home({ setCurrentPage }) {
  return (
    <main className="home">
      <div className="home-inner">
        <div className="home-header">
          <h1 className="home-title">KLIC TOOLs</h1>
          <p className="home-subtitle">AI 기반 자동 마크업 및 웹 검사 플랫폼</p>
        </div>
        <div className="home-grid">
          {menuCards.map((card) => (
            <button
              key={card.label}
              className="home-card"
              onClick={() => setCurrentPage(card.label)}
            >
              <span className="home-card-icon" aria-hidden="true">
                <img src={card.iconSrc} alt="" />
              </span>
              <h2 className="home-card-title">{card.label}</h2>
              <p className="home-card-desc">{card.desc}</p>
              <span className="home-card-arrow">→</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
