import React from 'react';
import { updateStylesOnly } from '../cleanTableHtml';

const PreviewModal = React.memo(({ content, config, widthString, onClose, layout, fadeStyle }) => (
    <div className={layout.modalPopWrap} style={fadeStyle}>
        <div className={layout.modalPop}>
            <div className={layout.titWrap}>
                <h4 className="tit2" style={{ marginBottom: "0" }}>미리보기</h4>
                <button onClick={onClose} className="btn_gr">닫기</button>
            </div>
            <div style={{ overflow: 'auto', maxHeight: '80vh' }}>
                <div dangerouslySetInnerHTML={{ __html: updateStylesOnly(content, config, widthString) }} />
            </div>
        </div>
    </div>
));

PreviewModal.displayName = "PreviewModal";
export default PreviewModal;
