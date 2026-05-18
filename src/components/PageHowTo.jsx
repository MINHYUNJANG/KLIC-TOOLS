import { useState } from 'react';

export default function PageHowTo({ title, children, style }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="page-how-to" style={style}>
      <div className="page-how-to-copy">
        <div className="page-how-to-head">
          <span className="ai-intro-kicker">사용방법</span>
          <button
            type="button"
            className="page-how-to-toggle"
            onClick={() => setOpen(prev => !prev)}
            aria-expanded={open}
            aria-label={open ? '사용방법 접기' : '사용방법 펼치기'}
          >
            {open ? '↑' : '↓'}
          </button>
        </div>
        <h3>{title}</h3>
        {open && (
          <div className="page-how-to-detail">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
