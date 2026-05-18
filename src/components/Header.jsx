import { useState } from 'react';

const navItems = [
  { label: 'URL 크롤링 마크업', href: '#' },
  { label: '콘텐츠 일괄 마크업', href: '#' },
  { label: '피그마 마크업', href: '#', dividerAfter: true },
  { label: 'KL캔버스', href: '#', dividerAfter: true },
  { label: '웹표준검사', href: '#' },
  { label: '웹접근성검사', href: '#' },
];

export default function Header({ currentPage, setCurrentPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  function handleNavClick(e, label) {
    e.preventDefault();
    setCurrentPage(label);
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
                className={`nav-item ${currentPage === item.label ? 'is-active' : ''} ${hoveredItem === item.label ? 'is-active' : ''} ${item.dividerAfter ? 'has-divider' : ''}`}
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <a href={item.href} className="nav-link" onClick={e => handleNavClick(e, item.label)}>
                  {item.label}
                </a>
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
