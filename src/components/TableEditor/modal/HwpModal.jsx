import React, { useRef } from 'react';

export default function HwpModal({ onClose, layout, fadeStyle }) {
    const iframeRef = useRef(null);

    return (
        <div className={layout.HwpModal} style={fadeStyle} onClick={(e) => e.stopPropagation()}>
            <div className={layout.HwpHeader}>
                <button onClick={onClose} className={layout.HwpClose} aria-label="닫기">
                    <i className="ri-close-line"></i>
                </button>
            </div>
            <iframe
                style={{ width: '100%', height: '100vh' }}
                ref={iframeRef}
                src="https://edwardkim.github.io/rhwp/"
                className="flex-1 w-full border-0"
                title="rhwp HWP Viewer"
                allow="clipboard-read *; clipboard-write *"
            />
        </div>
    );
}
