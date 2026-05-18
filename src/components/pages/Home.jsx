const menuCards = [
  {
    label: 'URL 크롤링 마크업',
    iconSrc: '/icons/dazzle/browser.svg',
    desc: 'URL을 입력하면 해당 페이지의 본문을 자동으로 크롤링하여 웹 표준에 맞는 HTML 마크업을 생성합니다. CSS 셀렉터를 직접 지정하거나 자동 감지 방식을 사용할 수 있습니다.',
  },
  {
    label: '콘텐츠 일괄 마크업',
    iconSrc: '/icons/dazzle/file-contract.svg',
    desc: 'KLIC 가이드 및 디자인 템플릿을 기반으로, 크롤링된 학교 사이트 콘텐츠가 선택한 서브콘텐츠 템플릿에 자동으로 입혀집니다. 여러 학교를 한 번에 처리해 반복 마크업 작업 시간을 대폭 줄여줍니다.',
  },
  {
    label: '피그마 마크업',
    iconSrc: '/icons/dazzle/pen-line.svg',
    desc: '피그마 디자인 파일의 URL을 입력하면 디자인을 분석하여 HTML 마크업을 자동으로 생성합니다. 디자인과 마크업 작업을 동시에 진행할 수 있습니다.',
  },
  {
    label: 'KL캔버스',
    iconSrc: '/icons/dazzle/gallery-thumbnails.svg',
    desc: '교사와 교직원이 팝업, 비주얼, 가정통신문, 공지 등에 필요한 이미지와 마크업을 손쉽게 만들 수 있도록 돕는 제작 도구입니다.',
  },
  {
    label: '웹표준검사',
    iconSrc: '/icons/dazzle/hexagon-check.svg',
    desc: '웹 페이지의 웹 표준 준수 여부를 자동으로 검사합니다. 검사 결과와 함께 증적 자료를 자동으로 생성하여 보고서 작성 시간을 줄여줍니다.',
  },
  {
    label: '웹접근성검사',
    iconSrc: '/icons/dazzle/accessibility.svg',
    desc: '웹 페이지의 웹 접근성 준수 여부를 자동으로 검사합니다. WCAG 및 KWCAG 기준에 따라 항목별 결과와 증적 자료를 자동으로 생성합니다.',
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
