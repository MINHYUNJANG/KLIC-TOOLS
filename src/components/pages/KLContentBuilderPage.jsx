const builderItems = [
  {
    label: '교육목표 빌더',
    href: 'https://grid-builder-smoky.vercel.app/',
    desc: '학교 교육목표를 시각적으로 구성하고 HTML 마크업으로 변환합니다.',
    iconSrc: '/icons/dazzle/hexagon-check.svg',
  },
  {
    label: '조직도 빌더',
    href: 'https://grid-buider-organ.vercel.app/',
    desc: '학교 조직도를 드래그&드롭으로 구성하고 HTML 마크업으로 내보냅니다.',
    iconSrc: '/icons/dazzle/gallery-thumbnails.svg',
  },
];

export default function KLContentBuilderPage() {
  return (
    <main className="home">
      <div className="home-inner">
        <div className="home-header">
          <h1 className="home-title">KL콘텐츠빌더</h1>
          <p className="home-subtitle">콘텐츠 구조를 시각적으로 편집하고 마크업으로 변환하는 빌더 도구 모음</p>
        </div>
        <div className="home-grid">
          {builderItems.map((item) => (
            <a
              key={item.label}
              className="home-card"
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="home-card-icon" aria-hidden="true">
                <img src={item.iconSrc} alt="" />
              </span>
              <h2 className="home-card-title">{item.label}</h2>
              <p className="home-card-desc">{item.desc}</p>
              <span className="home-card-arrow">↗</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
