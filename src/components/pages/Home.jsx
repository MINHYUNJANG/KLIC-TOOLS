const menuCards = [
  {
    label: '마크업 도구',
    page: 'school-integrated-markup',
    iconSrc: '/icons/dazzle/browser.svg',
    desc: '학교통합 마크업, MCP 마크업, 테이블 변환도구를 한곳에서 사용합니다.',
    tools: [
      { label: '학교통합 마크업', page: 'school-integrated-markup' },
      { label: 'MCP 마크업', page: 'mcp-markup' },
      { label: '테이블 변환도구', page: 'table-transform' },
    ],
  },
  {
    label: 'CMS빌더',
    iconSrc: '/icons/dazzle/gallery-thumbnails.svg',
    desc: '인사말, 연혁, 상징, 교육목표, 조직도, 오시는 길 등 다양한 콘텐츠 구조를 시각적으로 편집하고 마크업으로 변환할 수 있는 빌더 도구 모음입니다.',
    page: 'cms-builder',
    tools: [
      { label: '인사말빌더', page: 'greeting-builder' },
      { label: '연혁빌더', page: 'history-builder' },
      { label: '역대교장빌더', page: 'principal-builder' },
      { label: '학교상징빌더', page: 'symbol-builder' },
      { label: '콘텐츠빌더', page: 'content-builder' },
      { label: '교육목표빌더', page: 'goal-builder' },
      { label: '조직도빌더', page: 'organization-builder' },
      { label: '오시는길빌더', page: 'location-builder' },
    ],
  },
  {
    label: '웹검사 도구',
    page: 'web-standard',
    iconSrc: '/icons/dazzle/hexagon-check.svg',
    desc: '웹표준검사, 웹접근성검사, 대체텍스트 생성을 한곳에서 사용합니다.',
    tools: [
      { label: '웹표준검사', page: 'web-standard' },
      { label: '웹접근성검사', page: 'web-accessibility' },
      { label: '대체텍스트 생성', page: 'alt-text' },
    ],
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
            <section
              key={card.label}
              className={`home-card${card.page === 'cms-builder' ? ' home-card--cms-builder' : ''}`}
            >
              {card.page === 'cms-builder' && (
                <div className="home-card-actions" aria-label="CMS빌더 참고 링크">
                  <a
                    href="https://app.notion.com/p/CMS-9069a95cdee94d52a699d46451546e26"
                    target="_blank"
                    rel="noreferrer"
                    className="home-card-action"
                  >
                    <span>프로젝트 노션</span>
                    <span aria-hidden="true">→</span>
                  </a>
                  <button type="button" className="home-card-action" disabled>
                    <span>빌더 가이드</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
              <span className="home-card-icon" aria-hidden="true">
                <img src={card.iconSrc} alt="" />
              </span>
              <h2 className="home-card-title">{card.label}</h2>
              <p className="home-card-desc">{card.desc}</p>
              <div className="home-card-tools" aria-label={`${card.label} 세부 도구`}>
                {card.tools.map(tool => (
                  <button
                    type="button"
                    key={tool.page || tool.href}
                    className="home-card-tool"
                    onClick={() => {
                      if (tool.href) {
                        window.open(tool.href, '_blank', 'noopener,noreferrer');
                        return;
                      }
                      setCurrentPage(tool.page);
                    }}
                  >
                    <span>{tool.label}</span>
                    <span aria-hidden="true">→</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
