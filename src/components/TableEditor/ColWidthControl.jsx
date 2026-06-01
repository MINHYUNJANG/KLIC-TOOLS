import React, { useState, useRef, useEffect } from 'react';

const ColWidthControl = React.memo(({ colWidths, setColWidths, layout, isGuideMode, guideMessage }) => {
    const inputRefs = useRef([]);
    const [localWidths, setLocalWidths] = useState(colWidths);

    useEffect(() => {
        setLocalWidths(colWidths);
    }, [colWidths]);

    const handleBlur = (idx) => {
        if (localWidths[idx] !== colWidths[idx]) {
            const next = [...colWidths];
            next[idx] = localWidths[idx];
            setColWidths(next);
        }
    };

    const handleChange = (idx, val) => {
        const next = [...localWidths];
        next[idx] = val;
        setLocalWidths(next);
    };

    const handleAdd = () => {
        const current = (localWidths.length === 1 && localWidths[0] === 'auto-calc') ? [] : localWidths;
        const next = [...current, ''];
        setLocalWidths(next);
        setColWidths(next);
        setTimeout(() => { inputRefs.current[next.length - 1]?.focus(); }, 0);
    };

    const handleRemove = (idx) => {
        const next = localWidths.filter((_, i) => i !== idx);
        const final = next.length ? next : [''];
        setLocalWidths(final);
        setColWidths(final);
    };

    const handleClearAll = () => {
        setLocalWidths(['']);
        setColWidths(['']);
    };

    const isAutoMode = localWidths.length === 1 && localWidths[0] === 'auto-calc';

    const handleAutoCalcToggle = () => {
        if (isAutoMode) {
            setLocalWidths(['']); setColWidths(['']);
        } else {
            setLocalWidths(['auto-calc']); setColWidths(['auto-calc']);
        }
    };

    const displayWidths = isAutoMode ? [''] : localWidths;

    return (
        <div className={`${layout.colWrap} ${isGuideMode ? `${layout.guideTarget} ${layout.guideBottom}` : ""}`} data-guide={isGuideMode ? guideMessage : undefined}>
            <div className={`${layout.flexCol} ${layout.gap2}`}>
                <label><span className={layout.tit}>열 너비</span></label>
                <div className={layout.toggleWrap}>
                    <div className={layout.toggleSlider} style={{ transform: isAutoMode ? "translateX(0%)" : "translateX(100%)" }} />
                    <button className={`${layout.toggleBtn} ${isAutoMode ? layout.toggleActive : ""}`} onClick={handleAutoCalcToggle}>자동</button>
                    <button className={`${layout.toggleBtn} ${!isAutoMode ? layout.toggleActive : ""}`} onClick={handleAutoCalcToggle}>수동</button>
                </div>
            </div>
            {!isAutoMode && (
                <div className={`${layout.flexCol} ${layout.gap0} ${layout.colWidth}`}>
                    <div className={layout.colBox}>
                        {displayWidths.map((width, index) => (
                            <div key={index} className={layout.colItem}>
                                <input
                                    className={`${layout.Inp} ${layout.colInp}`}
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    type="text" maxLength={10}
                                    value={isAutoMode ? "" : width}
                                    placeholder="예) 20"
                                    disabled={isAutoMode}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    onBlur={() => handleBlur(index)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
                                        if (e.key === "Backspace" && width === "" && index > 0) {
                                            e.preventDefault();
                                            inputRefs.current[index - 1]?.focus();
                                            handleRemove(index);
                                        }
                                    }}
                                />
                                <button onClick={() => handleRemove(index)} className={layout.removeBtn} title="삭제">
                                    <i className="ri-close-fill"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className={layout.colBtn}>
                        <button onClick={handleAdd} className={`${layout.autoBtn}`}><span>추가</span></button>
                        <button onClick={handleClearAll} className={layout.allDelteBtn}><span>초기화</span></button>
                    </div>
                </div>
            )}
        </div>
    );
});

ColWidthControl.displayName = "ColWidthControl";
export default ColWidthControl;
