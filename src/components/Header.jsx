import { useState } from 'react';

const navItems = [
  {
    label: '마크업 도구',
    id: 'markup-tools',
    href: '#',
    children: [
      { label: '학교통합 마크업', id: 'school-integrated-markup', href: '#' },
      { label: 'MCP 마크업', id: 'mcp-markup', href: '#' },
      { label: '테이블 변환도구', id: 'table-transform', href: '#' },
    ],
  },
  {
    label: 'CMS빌더',
    id: 'cms-builder',
    href: '#',
    children: [
      {
        label: '템플릿빌더',
        id: 'template-builder',
        href: '#',
        children: [
          { label: '인사말빌더', id: 'greeting-builder', href: '#' },
          { label: '연혁빌더', id: 'history-builder', href: '#' },
          { label: '역대교장빌더', id: 'principal-builder', href: '#' },
          { label: '학교상징빌더', id: 'symbol-builder', href: '#' },
        ],
      },
      { label: '콘텐츠빌더', id: 'content-builder', href: '#' },
      { label: '교육목표빌더', id: 'goal-builder', href: '#' },
      { label: '조직도빌더', id: 'organization-builder', href: '#' },
      { label: '오시는길빌더', id: 'location-builder', href: '#' },
    ],
  },
  {
    label: '웹검사 도구',
    id: 'web-inspection',
    href: '#',
    children: [
      { label: '웹표준검사', id: 'web-standard', href: '#' },
      { label: '웹접근성검사', id: 'web-accessibility', href: '#' },
      { label: '대체텍스트 생성', id: 'alt-text', href: '#' },
    ],
  },
];

export default function Header({ currentPage, setCurrentPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const includesCurrentPage = item => (
    item.id === currentPage || item.children?.some(child => includesCurrentPage(child))
  );

  function handleNavClick(e, item) {
    if (item.children) {
      e.preventDefault();
      return;
    }
    if (item.external) {
      setMenuOpen(false);
      return;
    }
    e.preventDefault();
    setCurrentPage(item.id);
    setMenuOpen(false);
  }

  return (
    <header className="header">
      <div className="header-inner">
        <a href="#" className="header-logo" onClick={e => { e.preventDefault(); setCurrentPage(null); }}>
          <img src="/logo.png" alt="Klic 케이엘정보통신" className="logo-img" />
        </a>

        <nav className={`header-nav ${menuOpen ? 'is-open' : ''}`}>
          <ul className="nav-list">
            {navItems.map((item) => (
              <li
                key={item.label}
                className={`nav-item ${includesCurrentPage(item) ? 'is-active' : ''} ${hoveredItem === item.label ? 'is-active' : ''}`}
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <a
                  href={item.href}
                  className="nav-link"
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noreferrer' : undefined}
                  aria-haspopup={item.children ? 'true' : undefined}
                  onClick={e => handleNavClick(e, item)}
                >
                  {item.label}
                </a>
                {item.children && (
                  <ul className="nav-submenu" aria-label={`${item.label} 하위 메뉴`}>
                    {item.children.map((child) => (
                      <li key={child.label} className={`nav-submenu-item ${child.children ? 'has-children' : ''}`}>
                        {child.disabled ? (
                          <span className="nav-submenu-link is-disabled" aria-disabled="true">
                            {child.label}
                          </span>
                        ) : (
                          <a
                            href={child.href}
                            className="nav-submenu-link"
                            target={child.external ? '_blank' : undefined}
                            rel={child.external ? 'noreferrer' : undefined}
                            aria-haspopup={child.children ? 'true' : undefined}
                            onClick={(e) => {
                              if (child.children) {
                                e.preventDefault();
                              } else if (!child.external) {
                                e.preventDefault();
                                setCurrentPage(child.id);
                              }
                              if (!child.children) setMenuOpen(false);
                            }}
                          >
                            {child.label}
                          </a>
                        )}
                        {child.children && (
                          <ul className="nav-thirdmenu" aria-label={`${child.label} 하위 메뉴`}>
                            {child.children.map(grandchild => (
                              <li key={grandchild.label}>
                                <a
                                  href={grandchild.href}
                                  className="nav-submenu-link"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(grandchild.id);
                                    setMenuOpen(false);
                                  }}
                                >
                                  {grandchild.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="header-actions">
          <a href="https://uimoa.klic.kr/" target="_blank" rel="noreferrer" className="btn-login">
            <img src="/uimoa-icon.png" alt="" className="btn-login-icon" aria-hidden="true" />
            <span>UIMOA</span>
          </a>
          <button
            className="btn-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="메뉴"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}
