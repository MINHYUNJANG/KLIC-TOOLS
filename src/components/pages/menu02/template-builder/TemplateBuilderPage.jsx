import { useState } from 'react';

const templateTabs = [
  { label: '인사말빌더', iframeSrc: '/cms-builder/template-greeting.html' },
  { label: '역대교장빌더', iframeSrc: '/cms-builder/template-principal.html' },
  { label: '상징빌더', iframeSrc: '/cms-builder/template-symbol.html' },
  { label: '연혁빌더', iframeSrc: '/cms-builder/template-history.html' },
];

export default function TemplateBuilderPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = templateTabs[activeIndex] || templateTabs[0];

  return (
    <main className="builder-placeholder-page">
      <div className="builder-placeholder-page-inner">
        <div className="builder-tabbar" role="tablist" aria-label="템플릿 빌더 선택">
          {templateTabs.map((tab, index) => (
            <button
              key={tab.label}
              type="button"
              className={`builder-tab${index === activeIndex ? ' is-active' : ''}`}
              role="tab"
              aria-selected={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <iframe
          key={activeTab.iframeSrc}
          className="builder-placeholder-iframe"
          src={activeTab.iframeSrc}
          title={activeTab.label}
        />
      </div>
    </main>
  );
}
