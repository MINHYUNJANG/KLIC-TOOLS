export default function WebCheckPage({ setCurrentPage }) {
  const tools = [
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

  return (
    <main className="home">
      <div className="home-inner">
        <div className="home-header">
          <h1 className="home-title">웹검사도구</h1>
          <p className="home-subtitle">웹 표준 및 웹 접근성 자동 검사 도구</p>
        </div>
        <div className="home-grid">
          {tools.map((tool) => (
            <button
              key={tool.label}
              className="home-card"
              onClick={() => setCurrentPage(tool.label)}
            >
              <span className="home-card-icon" aria-hidden="true">
                <img src={tool.iconSrc} alt="" />
              </span>
              <h2 className="home-card-title">{tool.label}</h2>
              <p className="home-card-desc">{tool.desc}</p>
              <span className="home-card-arrow">→</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
