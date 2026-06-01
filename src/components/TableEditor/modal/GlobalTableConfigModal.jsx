import React, { useState, useEffect } from 'react';
import ColWidthControl from '../ColWidthControl';
import { TABLE_CLASS_SUGGESTIONS, UL_CLASS_SUGGESTIONS, OL_OPTIONS, UL_NONE_VALUE, GUIDE_MESSAGES } from '../utils/constants';
import { useModalDrag } from '../hooks/useModalDrag';

export default function GlobalTableConfigModal({ onClose, onApply, globalConfig, colWidths, layout, isGuideMode, setIsGuideMode, fadeStyle }) {
    const [localConfig, setLocalConfig] = useState({ ...globalConfig });
    const [localColWidths, setLocalColWidths] = useState([...colWidths]);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const { dragStyle, handleDragStart } = useModalDrag();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('[data-dropdown="true"]')) setActiveDropdown(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const updateConfig = (key, value) => setLocalConfig(prev => ({ ...prev, [key]: value }));
    const handleApply = () => onApply(localConfig, localColWidths);

    const handleTableOlToggle = (e, optValue) => {
        e.preventDefault();
        const current = Array.isArray(localConfig.tableOlType) ? localConfig.tableOlType : [];
        const next = current.includes(optValue) ? current.filter(v => v !== optValue) : [...current, optValue];
        updateConfig('tableOlType', next);
    };

    return (
        <div className={`${layout.modalContentBox}`} style={{ ...dragStyle, ...fadeStyle }}>
            <h2 className={layout.modalTitle} onMouseDown={handleDragStart}>
                <span>테이블 설정<em>ㅣ 테이블 맞춤 옵션 변경</em></span>
                <div className={layout.swichBtnWrap}>
                    <span className={layout.colTit}>색상모드</span>
                    <div className={layout.swichBtnGroup}>
                        <button className={`${layout.toggleSwitch} ${localConfig.tableIsColorMode ? layout.active : ''} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} onClick={() => updateConfig('tableIsColorMode', !localConfig.tableIsColorMode)} data-guide={isGuideMode ? GUIDE_MESSAGES.modeSelect : undefined}>
                            <span className={layout.toggleKnob}></span>
                        </button>
                    </div>
                </div>
                <button className={layout.guideBtn} onClick={() => setIsGuideMode(!isGuideMode)} title={isGuideMode ? '가이드를 종료합니다.' : '가이드'}>
                    <div className={`${layout.guide} ${isGuideMode ? `${layout.guideClose}` : ''}`}>
                        <img src="/images/con_com/guide.svg" alt="아이콘"/>
                    </div>
                </button>
            </h2>

            <div className={layout.modalBody}>
                <div className={layout.configSection}>
                    <span className={layout.configLabel}><img src="/images/con_com/modal_tit.svg" alt="아이콘"/>헤더</span>
                    <div className={`${layout.flexCol} ${layout.gap15}`}>
                        <div className={`${layout.flexRow} ${layout.gap0}`}>
                            <span className={layout.modalLabelSpan}>클래스</span>
                            <div className={`${layout.relative} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.classTableConfig : undefined} data-dropdown="true">
                                <input className={`${layout.Inp} ${layout.selectInp} ${layout.tbl}`} type="text"
                                    value={localConfig.wrapperClassName || ''}
                                    onChange={(e) => updateConfig('wrapperClassName', e.target.value)}
                                    onClick={() => setActiveDropdown('tableClass')}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { setActiveDropdown(null); e.target.blur(); } }}
                                />
                                <i className={activeDropdown === 'tableClass' ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} onClick={() => setActiveDropdown(activeDropdown === 'tableClass' ? null : 'tableClass')} style={{ cursor: 'pointer' }}></i>
                                {activeDropdown === 'tableClass' && (
                                    <ul className={`${layout.dropdownStyle}`}>
                                        {TABLE_CLASS_SUGGESTIONS.map((cls, idx) => (
                                            <li key={idx} className={layout.listItemStyle} onMouseDown={(e) => { e.preventDefault(); updateConfig('wrapperClassName', cls); setActiveDropdown(null); }}>{cls}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className={`${layout.flexRow} ${layout.gap0}`}>
                            <span className={layout.modalLabelSpan}>방향</span>
                            <div className={`${layout.flexCol} ${layout.gap2}`}>
                                <label className={`${layout.radioItem} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.HeaderTop : undefined}>
                                    <input type="radio" checked={localConfig.tableType === 'default'} onChange={() => { updateConfig('tableType', 'default'); updateConfig('headerRows', 1); updateConfig('headerCols', 1); }} />
                                    <span className={layout.modalLabelSpan}>Col</span>
                                </label>
                                <label className={`${layout.radioItem} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.HeaderLeft : undefined}>
                                    <input type="radio" checked={localConfig.tableType === 'row'} onChange={() => { updateConfig('tableType', 'row'); updateConfig('headerRows', 1); updateConfig('headerCols', 1); }} />
                                    <span className={layout.modalLabelSpan}>Row</span>
                                </label>
                            </div>
                        </div>
                        <div className={`${layout.flexRow} ${layout.gap0}`}>
                            <span className={layout.modalLabelSpan}>기준 행(시작)</span>
                            <div className={`${layout.relative} ${layout.gap0} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.HeaderConfig : undefined}>
                                <input type="number" min="0" max="10" className={`${layout.Inp} ${layout.numInp}`}
                                    value={localConfig.tableType === 'default' ? localConfig.headerRows : localConfig.headerCols}
                                    onChange={(e) => updateConfig(localConfig.tableType === 'default' ? 'headerRows' : 'headerCols', e.target.value === '' ? '' : parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={layout.configSection}>
                    <span className={layout.configLabel}><img src="/images/con_com/modal_tit.svg" alt="아이콘"/> 리스트</span>
                    <div className={layout.flexCol}>
                        <div className={`${layout.flexCol} ${layout.gap2}`}>
                            <span className={layout.modalLabelSpan}>ul</span>
                            <div className={`${layout.relative} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.classUlConfig : undefined} data-dropdown="true">
                                <input className={`${layout.Inp} ${layout.selectInp}`} type="text"
                                    value={localConfig.tableUlClassName === UL_NONE_VALUE ? '' : (localConfig.tableUlClassName || '')}
                                    placeholder={localConfig.tableUlClassName === UL_NONE_VALUE ? '선택 안함' : ''}
                                    onChange={(e) => updateConfig('tableUlClassName', e.target.value)}
                                    onClick={() => setActiveDropdown('tableUl')}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { setActiveDropdown(null); e.target.blur(); } }}
                                />
                                <i className={activeDropdown === 'tableUl' ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} onClick={() => setActiveDropdown(activeDropdown === 'tableUl' ? null : 'tableUl')} style={{ cursor: 'pointer' }}></i>
                                {activeDropdown === 'tableUl' && (
                                    <ul className={`${layout.dropdownStyle}`}>
                                        <li className={layout.listItemStyle} onMouseDown={(e) => { e.preventDefault(); updateConfig('tableUlClassName', UL_NONE_VALUE); setActiveDropdown(null); }}>선택 안함 <i className="ri-close-circle-line pc_red"></i></li>
                                        {UL_CLASS_SUGGESTIONS.map((cls, idx) => (
                                            <li key={idx} className={layout.listItemStyle} onMouseDown={(e) => { e.preventDefault(); updateConfig('tableUlClassName', cls); setActiveDropdown(null); }}>{cls}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className={`${layout.flexCol} ${layout.gap2}`}>
                            <span className={layout.modalLabelSpan}>ol</span>
                            <div className={`${layout.relative} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.classOlConfig : undefined} data-dropdown="true">
                                <input className={`${layout.Inp} ${layout.selectInp}`} type="text" readOnly
                                    value={Array.isArray(localConfig.tableOlType) && localConfig.tableOlType.length > 0 ? localConfig.tableOlType.map(val => OL_OPTIONS.find(opt => opt.value === val)?.label).filter(Boolean).join(', ') : ''}
                                    placeholder="선택 안함"
                                    onClick={() => setActiveDropdown('tableOlType')}
                                />
                                <i className={activeDropdown === 'tableOlType' ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} onClick={() => setActiveDropdown(activeDropdown === 'tableOlType' ? null : 'tableOlType')} style={{ cursor: 'pointer' }}></i>
                                {activeDropdown === 'tableOlType' && (
                                    <ul className={`${layout.dropdownStyle}`}>
                                        <li className={`${layout.listItemStyle}`} onMouseDown={(e) => { e.preventDefault(); updateConfig('tableOlType', []); setActiveDropdown(null); }}>선택 안함 <i className="ri-close-circle-line pc_red"></i></li>
                                        {OL_OPTIONS.map((opt, index) => (
                                            <li key={index} className={`${layout.listItemStyle}`} onMouseDown={(e) => handleTableOlToggle(e, opt.value)}>
                                                {opt.label} {Array.isArray(localConfig.tableOlType) && localConfig.tableOlType.includes(opt.value) && <i className={`ri-check-line ${layout.checkIcon}`}></i>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className={`${layout.flexCol} ${layout.gap2} ${layout.mgl5}`}>
                            <label className={`${layout.checkItem} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.noList : undefined} data-dropdown="true">
                                <input type="checkbox" checked={localConfig.tableKeepMarker || false} onChange={(e) => updateConfig('tableKeepMarker', e.target.checked)} />
                                <span>기호 유지</span>
                            </label>
                            <label className={`${layout.checkItem} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.List2 : undefined} data-dropdown="true">
                                <input type="checkbox" checked={localConfig.tableListStartFrom2 || false} onChange={(e) => updateConfig('tableListStartFrom2', e.target.checked)} />
                                <span>시작(리스트2)</span>
                            </label>
                            {localConfig.tableIsColorMode && (
                                <label className={layout.checkItem}>
                                    <input type="checkbox" checked={localConfig.tableIsColorClassMode || false} onChange={(e) => updateConfig('tableIsColorClassMode', e.target.checked)} />
                                    <span>색상 클래스</span>
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                <div className={layout.configSection}>
                    <span className={layout.configLabel}><img src="/images/con_com/modal_tit.svg" alt="아이콘"/> 옵션</span>
                    <div className={`${layout.flexCol} ${layout.gap2}`}>
                        <label className={`${layout.checkItem} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.divType : undefined} data-dropdown="true">
                            <input type="checkbox" checked={localConfig.isWrapDiv || false} onChange={(e) => updateConfig('isWrapDiv', e.target.checked)} />
                            <span>DIV 감싸기</span>
                        </label>
                        <label className={`${layout.checkItem} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.verticalHeader : undefined} data-dropdown="true">
                            <input type="checkbox" checked={localConfig.isVerticalHeader || false} onChange={(e) => updateConfig('isVerticalHeader', e.target.checked)} />
                            <span>헤더 수직 정렬</span>
                        </label>
                    </div>
                    <ColWidthControl colWidths={localColWidths} setColWidths={setLocalColWidths} layout={layout} isGuideMode={isGuideMode} guideMessage={GUIDE_MESSAGES.colWidth}/>
                </div>
            </div>

            <div className={layout.modalFooter}>
                <button className={layout.cancelBtn} onClick={onClose}>취소</button>
                <button className={`${layout.applyBtn} ${layout.blue}`} onClick={handleApply}>저장 및 적용하기</button>
            </div>
        </div>
    );
}
