import React from 'react';
import layout from './layout.module.css';
import { GUIDE_MESSAGES } from './utils/constants';

const TableConfigToolbar = React.memo(({
    isGuideMode, toggleModal, modals,
    handleCopy, handleClear, handleManualClean,
}) => {
    return (
        <div className={layout.tableBtnWrap}>
            <div className={layout.btnBox}>
                <button onClick={handleManualClean} className={`${layout.cleanBtn} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.cleanBtn : undefined}><img src="/images/con_com/btn_ico01.svg" alt='코드 정리'/><span>코드 정리</span></button>
                <button onClick={handleCopy} className={`${layout.copyBtn} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.copyBtn : undefined}><img src="/images/con_com/btn_ico02.svg" alt='코드 복사'/><span>코드 복사</span></button>
                <button onClick={handleClear} className={`${layout.removeBtn} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.removeBtn : undefined}><img src="/images/con_com/btn_ico04.svg" alt='전체 삭제'/><span>전체 삭제</span></button>
                <button onClick={() => toggleModal('globalTableConfig', true)} className={`${layout.tableSettingBtn} ${modals?.globalTableConfig ? layout.tableSettingBtnOpen : ''}`} title='테이블 설정'>
                    <i className="ri-settings-4-line"></i>
                    <span>테이블 설정</span>
                </button>
            </div>
        </div>
    );
});

TableConfigToolbar.displayName = "TableConfigToolbar";
export default TableConfigToolbar;
