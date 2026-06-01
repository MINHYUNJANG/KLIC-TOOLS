import React, { useState, useEffect } from 'react';

export default function PsdModal({ onClose, layout, fadeStyle }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 1000);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className={layout.PsdModal} style={fadeStyle} onClick={(e) => e.stopPropagation()}>
            <div className={layout.PsdHeader}>
                <button onClick={onClose} className={layout.PsdClose} aria-label="닫기">
                    <i className="ri-close-line"></i>
                </button>
            </div>
            <iframe
                style={{ width: '100%', height: '100vh' }}
                src="https://www.photopea.com"
                title="Photopea Editor"
                allow="clipboard-read *; clipboard-write *"
            />
        </div>
    );
}
