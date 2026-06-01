import React, { useState, useEffect } from 'react';
import { OL_OPTIONS, UL_CLASS_SUGGESTIONS, UL_NONE_VALUE, GUIDE_MESSAGES, TIT_OPTIONS } from '../utils/constants';
import { useModalDrag } from '../hooks/useModalDrag';

export default function ContentConfigModal({ onClose, onApply, globalConfig, layout, isGuideMode, setIsGuideMode, fadeStyle }) {
    const [localConfig, setLocalConfig] = useState(globalConfig ? { ...globalConfig } : {});
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

    const handleTitleCustomChange = (e, titKey) => updateConfig(titKey, { ...(localConfig[titKey] || {}), type: 'custom', val: e.target.value });

    const handleTitleOptionSelect = (e, titKey, optValue) => {
        e.preventDefault();
        updateConfig(titKey, { ...(localConfig[titKey] || { val: '' }), type: optValue });
        setActiveDropdown(null);
    };

    const handleOlToggle = (e, optValue) => {
        e.preventDefault();
        const current = Array.isArray(localConfig.olType) ? localConfig.olType : [];
        const next = current.includes(optValue) ? current.filter(v => v !== optValue) : [...current, optValue];
        updateConfig('olType', next);
    };

    const handleApply = () => { if (!localConfig) return; onApply(localConfig); };

    return (
        <div className={`${layout.modalContentBox}`} style={{ ...dragStyle, ...fadeStyle }}>
            <h2 className={layout.modalTitle} onMouseDown={handleDragStart}>
                <span>컨텐츠 설정<em>ㅣ스타일 가이드 맞춤 변경</em></span>
                <div className={layout.swichBtnWrap}>
                    <span className={layout.colTit}>색상모드</span>
                    <div className={layout.swichBtnGroup}>
                        <button className={`${layout.toggleSwitch} ${localConfig.isColorMode ? layout.active : ''} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} onClick={() => updateConfig('isColorMode', !localConfig.isColorMode)} data-guide={isGuideMode ? GUIDE_MESSAGES.modeSelect : undefined}>
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
                    <span className={layout.configLabel}><img src="/images/con_com/modal_tit.svg" alt="아이콘"/>타이틀</span>
                    <div className={`${layout.flexCol}`}>
                        {['tit1', 'tit2', 'tit3'].map((titKey, idx) => {
                            const currentType = localConfig[titKey]?.type || 'custom';
                            const isCustom = currentType === 'custom';
                            const currentLabel = TIT_OPTIONS.find(opt => opt.value === currentType)?.label || '직접 입력';
                            const currentClassKey = `${titKey}Class`;

                            return (
                                <div key={titKey} className={`${layout.flexRow} ${layout.gap0}`}>
                                    <span className={layout.modalLabelSpanSm}>H{idx + 3}</span>
                                    <div className={`${layout.flexCol} ${layout.gap1} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES[titKey] : undefined} data-dropdown="true">
                                        <input className={`${layout.Inp}`} type="text"
                                            value={localConfig[currentClassKey] || ''}
                                            onChange={(e) => updateConfig(currentClassKey, e.target.value)} placeholder="tit"
                                        />
                                        <div className={layout.relative}>
                                            <input className={`${layout.Inp} ${layout.selectInp}`} type="text"
                                                value={isCustom ? (localConfig[titKey]?.val || '') : currentLabel}
                                                onChange={(e) => isCustom && handleTitleCustomChange(e, titKey)}
                                                readOnly={!isCustom} onClick={() => setActiveDropdown(titKey)} placeholder="유형 선택"
                                                onKeyDown={(e) => { if (e.key === 'Enter') { setActiveDropdown(null); e.target.blur(); } }}
                                            />
                                            <i className={activeDropdown === titKey ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} onClick={() => setActiveDropdown(activeDropdown === titKey ? null : titKey)} style={{ cursor: 'pointer' }}></i>
                                            {activeDropdown === titKey && (
                                                <ul className={`${layout.dropdownStyle}`}>
                                                    {TIT_OPTIONS.map((opt, index) => (
                                                        <li key={index} className={layout.listItemStyle} onMouseDown={(e) => handleTitleOptionSelect(e, titKey, opt.value)}>{opt.label}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={layout.configSection}>
                    <span className={layout.configLabel}><img src="/images/con_com/modal_tit.svg" alt="아이콘"/>리스트</span>
                    <div className={layout.flexCol}>
                        <div className={`${layout.flexCol} ${layout.gap2}`}>
                            <span className={layout.modalLabelSpan}>ul</span>
                            <div className={`${layout.relative} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.classUlConfig : undefined} data-dropdown="true">
                                <input className={`${layout.Inp} ${layout.selectInp}`} type="text"
                                    value={localConfig.ulClassName === UL_NONE_VALUE ? '' : (localConfig.ulClassName || '')}
                                    placeholder={localConfig.ulClassName === UL_NONE_VALUE ? '선택 안함' : ''}
                                    onChange={(e) => updateConfig('ulClassName', e.target.value)}
                                    onClick={() => setActiveDropdown('ul')}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { setActiveDropdown(null); e.target.blur(); } }}
                                />
                                <i className={activeDropdown === 'ul' ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} onClick={() => setActiveDropdown(activeDropdown === 'ul' ? null : 'ul')} style={{ cursor: 'pointer' }}></i>
                                {activeDropdown === 'ul' && (
                                    <ul className={`${layout.dropdownStyle}`}>
                                        <li className={layout.listItemStyle} onMouseDown={(e) => { e.preventDefault(); updateConfig('ulClassName', UL_NONE_VALUE); setActiveDropdown(null); }}>선택 안함 <i className="ri-close-circle-line pc_red"></i></li>
                                        {UL_CLASS_SUGGESTIONS.map((cls, index) => (
                                            <li key={index} className={layout.listItemStyle} onMouseDown={(e) => { e.preventDefault(); updateConfig('ulClassName', cls); setActiveDropdown(null); }}>{cls}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className={`${layout.flexCol} ${layout.gap2}`}>
                            <span className={layout.modalLabelSpan}>ol</span>
                            <div className={`${layout.relative} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.classOlConfig : undefined} data-dropdown="true">
                                <input className={`${layout.Inp} ${layout.selectInp}`} type="text" readOnly
                                    value={Array.isArray(localConfig.olType) && localConfig.olType.length > 0 ? localConfig.olType.map(val => OL_OPTIONS.find(opt => opt.value === val)?.label).filter(Boolean).join(', ') : ''}
                                    placeholder="선택 안함"
                                    onClick={() => setActiveDropdown('olType')}
                                />
                                <i className={activeDropdown === 'olType' ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} onClick={() => setActiveDropdown(activeDropdown === 'olType' ? null : 'olType')} style={{ cursor: 'pointer' }}></i>
                                {activeDropdown === 'olType' && (
                                    <ul className={`${layout.dropdownStyle}`}>
                                        <li className={`${layout.listItemStyle}`} onMouseDown={(e) => { e.preventDefault(); updateConfig('olType', []); setActiveDropdown(null); }}>선택 안함 <i className="ri-close-circle-line pc_red"></i></li>
                                        {OL_OPTIONS.map((opt, index) => (
                                            <li key={index} className={`${layout.listItemStyle}`} onMouseDown={(e) => handleOlToggle(e, opt.value)}>
                                                {opt.label} {Array.isArray(localConfig.olType) && localConfig.olType.includes(opt.value) && <i className={`ri-check-line ${layout.checkIcon}`}></i>}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className={`${layout.flexCol} ${layout.gap2} ${layout.mgl5}`}>
                            <label className={`${layout.checkItem} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.noList : undefined}>
                                <input type="checkbox" checked={localConfig.keepMarker || false} onChange={(e) => updateConfig('keepMarker', e.target.checked)} />
                                <span>기호 유지</span>
                            </label>
                            <label className={`${layout.checkItem} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.List2 : undefined} data-dropdown="true">
                                <input type="checkbox" checked={localConfig.listStartFrom2 || false} onChange={(e) => updateConfig('listStartFrom2', e.target.checked)} />
                                <span>시작(리스트2)</span>
                            </label>
                            {localConfig.isColorMode && (
                                <label className={`${layout.checkItem} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.color : undefined}>
                                    <input type="checkbox" checked={localConfig.isColorClassMode || false} onChange={(e) => updateConfig('isColorClassMode', e.target.checked)} />
                                    <span>색상 클래스</span>
                                </label>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className={layout.modalFooter}>
                <button className={layout.cancelBtn} onClick={onClose}>취소</button>
                <button className={`${layout.applyBtn} ${layout.blue}`} onClick={handleApply}>저장 및 적용하기</button>
            </div>
        </div>
    );
}
