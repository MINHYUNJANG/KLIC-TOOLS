import { useState } from 'react';

const navItems = [
  { label: '크롤링 마크업', href: '#' },
  // { label: '콘텐츠 일괄 마크업', href: '#' },
  { label: 'MCP 마크업', href: '#', dividerAfter: true },
  { label: '테이블 변환', href: '#', dividerAfter: true },
  {
    label: 'KL콘텐츠빌더',
    href: '#',
    dividerAfter: true,
    children: [
      { label: '콘텐츠 빌더', disabled: true },
      { label: '교육목표 빌더', href: 'https://klic-tools-goal.vercel.app/', external: true },
      { label: '조직도 빌더', href: 'https://grid-buider-organ.vercel.app/', external: true },
      { label: '오시는길 빌더', disabled: true },
      { label: '공통서브 빌더', disabled: true },
    ],
  },
  {
    label: '웹검사도구',
    href: '#',
    children: [
      { label: '웹표준검사', href: '#' },
      { label: '웹접근성검사', href: '#' },
    ],
  },
  { label: '대체텍스트 생성', href: '#' },
];

export default function Header({ currentPage, setCurrentPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

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
    setCurrentPage(item.label);
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
                className={`nav-item ${(currentPage === item.label || item.children?.some(c => c.label === currentPage)) ? 'is-active' : ''} ${hoveredItem === item.label ? 'is-active' : ''} ${item.dividerAfter ? 'has-divider' : ''}`}
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
                      <li key={child.label}>
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
                            onClick={(e) => {
                              if (!child.external) {
                                e.preventDefault();
                                setCurrentPage(child.label);
                              }
                              setMenuOpen(false);
                            }}
                          >
                            {child.label}
                          </a>
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
          <a href="https://uimoa.klic.kr/" target="_blank" rel="noreferrer" className="btn-login">UIMOA</a>
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
