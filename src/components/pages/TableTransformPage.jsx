import { useState, useCallback, useRef } from 'react';
import { TableConfigProvider, useTableConfig, useTableConfigDispatch } from '../tableTransform/TableConfigContext';
import { cleanTableHtml } from '../../utils/tableTransform/cleanTableHtml';
import { OL_OPTIONS, UL_NONE_VALUE } from '../../utils/tableTransform/constants';
import JoditEditorWrapper from '../tableTransform/JoditEditorWrapper';

// ─── 패널: 테이블 구조 ────────────────────────────────────────────────────────

function StructurePanel({ open, onToggle }) {
    const config = useTableConfig();
    const { updateConfig, handleTableTypeChange } = useTableConfigDispatch();

    return (
        <section className={`canvas-panel ${open ? 'is-open' : ''}`}>
            <button type="button" className="canvas-panel-toggle" onClick={onToggle}>
                <span>테이블 구조</span>
                <span aria-hidden="true">{open ? '−' : '+'}</span>
            </button>
            {open && (
                <div className="canvas-panel-body">
                    <div className="tbl-row">
                        <label className="tbl-field-label">헤더 방향</label>
                        <div className="tbl-btn-group">
                            {[
                                { val: 'default', label: '기본' },
                                { val: 'col', label: '상단' },
                                { val: 'row', label: '좌측' },
                            ].map(({ val, label }) => (
                                <button
                                    key={val}
                                    type="button"
                                    className={`tbl-tog${config.tableType === val ? ' is-active' : ''}`}
                                    onClick={() => handleTableTypeChange(val)}
                                >{label}</button>
                            ))}
                        </div>
                    </div>

                    {config.tableType !== 'row' && (
                        <div className="tbl-row">
                            <label className="tbl-field-label">헤더 행 수</label>
                            <input
                                type="number" min="0" max="10"
                                className="tbl-num"
                                value={config.headerRows}
                                onChange={e => updateConfig('headerRows', parseInt(e.target.value) || 0)}
                            />
                        </div>
                    )}
                    {config.tableType === 'row' && (
                        <div className="tbl-row">
                            <label className="tbl-field-label">헤더 열 수</label>
                            <input
                                type="number" min="0" max="10"
                                className="tbl-num"
                                value={config.headerCols}
                                onChange={e => updateConfig('headerCols', parseInt(e.target.value) || 0)}
                            />
                        </div>
                    )}

                    <div className="tbl-row">
                        <label className="tbl-field-label">래퍼 클래스</label>
                        <input
                            type="text"
                            className="tbl-text"
                            value={config.wrapperClassName}
                            onChange={e => updateConfig('wrapperClassName', e.target.value)}
                            placeholder="예: tbl-st"
                        />
                    </div>

                    <div className="tbl-row">
                        <button
                            type="button"
                            className={`tbl-tog${config.isWrapDiv ? ' is-active' : ''}`}
                            onClick={() => updateConfig('isWrapDiv', !config.isWrapDiv)}
                        >DIV로 감싸기</button>
                        <button
                            type="button"
                            className={`tbl-tog${config.isVerticalHeader ? ' is-active' : ''}`}
                            onClick={() => updateConfig('isVerticalHeader', !config.isVerticalHeader)}
                        >세로 헤더</button>
                    </div>
                </div>
            )}
        </section>
    );
}

// ─── 패널: 표 내부 리스트 ──────────────────────────────────────────────────────

function TableListPanel({ open, onToggle }) {
    const config = useTableConfig();
    const { updateConfig } = useTableConfigDispatch();

    return (
        <section className={`canvas-panel ${open ? 'is-open' : ''}`}>
            <button type="button" className="canvas-panel-toggle" onClick={onToggle}>
                <span>표 내부 리스트</span>
                <span aria-hidden="true">{open ? '−' : '+'}</span>
            </button>
            {open && (
                <div className="canvas-panel-body">
                    <div className="tbl-row">
                        <label className="tbl-field-label">UL 클래스</label>
                        <input
                            type="text"
                            className="tbl-text"
                            value={config.tableUlClassName === UL_NONE_VALUE ? '' : config.tableUlClassName}
                            onChange={e => updateConfig('tableUlClassName', e.target.value || UL_NONE_VALUE)}
                            placeholder="예: list_st (비우면 p태그)"
                        />
                    </div>
                    <div className="tbl-row">
                        <label className="tbl-field-label">OL 형식</label>
                        <div className="tbl-btn-group tbl-btn-wrap">
                            {OL_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`tbl-tog${config.tableOlType.includes(opt.value) ? ' is-active' : ''}`}
                                    onClick={() => updateConfig(
                                        'tableOlType',
                                        config.tableOlType.includes(opt.value) ? [] : [opt.value]
                                    )}
                                >{opt.label}</button>
                            ))}
                        </div>
                    </div>
                    <div className="tbl-row">
                        <button
                            type="button"
                            className={`tbl-tog${config.tableKeepMarker ? ' is-active' : ''}`}
                            onClick={() => updateConfig('tableKeepMarker', !config.tableKeepMarker)}
                        >기호 유지</button>
                        <button
                            type="button"
                            className={`tbl-tog${config.tableIsColorMode ? ' is-active' : ''}`}
                            onClick={() => updateConfig('tableIsColorMode', !config.tableIsColorMode)}
                        >색상 모드</button>
                    </div>
                </div>
            )}
        </section>
    );
}

// ─── 패널: 콘텐츠 리스트 ──────────────────────────────────────────────────────

function ContentListPanel({ open, onToggle }) {
    const config = useTableConfig();
    const { updateConfig } = useTableConfigDispatch();

    return (
        <section className={`canvas-panel ${open ? 'is-open' : ''}`}>
            <button type="button" className="canvas-panel-toggle" onClick={onToggle}>
                <span>콘텐츠 리스트</span>
                <span aria-hidden="true">{open ? '−' : '+'}</span>
            </button>
            {open && (
                <div className="canvas-panel-body">
                    <div className="tbl-row">
                        <label className="tbl-field-label">UL 클래스</label>
                        <input
                            type="text"
                            className="tbl-text"
                            value={config.ulClassName === UL_NONE_VALUE ? '' : config.ulClassName}
                            onChange={e => updateConfig('ulClassName', e.target.value || UL_NONE_VALUE)}
                            placeholder="예: list_st (비우면 p태그)"
                        />
                    </div>
                    <div className="tbl-row">
                        <label className="tbl-field-label">OL 형식</label>
                        <div className="tbl-btn-group tbl-btn-wrap">
                            {OL_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    className={`tbl-tog${config.olType.includes(opt.value) ? ' is-active' : ''}`}
                                    onClick={() => updateConfig(
                                        'olType',
                                        config.olType.includes(opt.value) ? [] : [opt.value]
                                    )}
                                >{opt.label}</button>
                            ))}
                        </div>
                    </div>
                    <div className="tbl-row">
                        <button
                            type="button"
                            className={`tbl-tog${config.keepMarker ? ' is-active' : ''}`}
                            onClick={() => updateConfig('keepMarker', !config.keepMarker)}
                        >기호 유지</button>
                        <button
                            type="button"
                            className={`tbl-tog${config.isColorMode ? ' is-active' : ''}`}
                            onClick={() => updateConfig('isColorMode', !config.isColorMode)}
                        >색상 모드</button>
                    </div>
                </div>
            )}
        </section>
    );
}

// ─── Inner Page ───────────────────────────────────────────────────────────────

function TableTransformInner() {
    const config = useTableConfig();
    const configRef = useRef(config);
    configRef.current = config;

    const editorRef = useRef(null);
    const [openPanel, setOpenPanel] = useState('structure');
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState('');

    const togglePanel = (name) => setOpenPanel(p => p === name ? null : name);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 2000);
    };

    const handleTransform = useCallback(() => {
        const html = editorRef.current?.getValue() || '';
        const text = html.replace(/<[^>]+>/g, '').trim();
        if (!text) { showToast('내용을 입력해주세요.'); return; }
        try {
            const result = cleanTableHtml(html, configRef.current);
            editorRef.current?.setValue(result);
        } catch (e) {
            showToast('변환 중 오류가 발생했습니다.');
        }
    }, []);

    const handleCopy = useCallback(() => {
        const html = editorRef.current?.getValue() || '';
        if (!html.trim()) { showToast('먼저 변환을 실행해주세요.'); return; }
        navigator.clipboard.writeText(html).then(() => {
            setCopied(true);
            showToast('복사되었습니다.');
            setTimeout(() => setCopied(false), 2000);
        });
    }, []);

    const handleClear = useCallback(() => {
        editorRef.current?.clear();
    }, []);

    return (
        <div className="tbl-page">
            <div className="tbl-header">
                <h2 className="tbl-title">테이블 변환</h2>
                <p className="tbl-desc">웹/엑셀/HWP 등에서 표를 복사해 붙여넣으면 자동으로 HTML로 변환합니다.</p>
            </div>

            <div className="tbl-layout">
                <aside className="tbl-sidebar">
                    <StructurePanel
                        open={openPanel === 'structure'}
                        onToggle={() => togglePanel('structure')}
                    />
                    <TableListPanel
                        open={openPanel === 'tableList'}
                        onToggle={() => togglePanel('tableList')}
                    />
                    <ContentListPanel
                        open={openPanel === 'contentList'}
                        onToggle={() => togglePanel('contentList')}
                    />

                    <div className="tbl-actions">
                        <button type="button" className="tbl-action-primary" onClick={handleTransform}>
                            변환하기
                        </button>
                        <button
                            type="button"
                            className={`tbl-action-secondary${copied ? ' is-copied' : ''}`}
                            onClick={handleCopy}
                        >
                            {copied ? '복사됨 ✓' : '복사'}
                        </button>
                        <button type="button" className="tbl-action-reset" onClick={handleClear}>
                            초기화
                        </button>
                    </div>
                </aside>

                <div className="tbl-editor-area">
                    <JoditEditorWrapper
                        ref={editorRef}
                        placeholder="웹 페이지 / 엑셀 / HWP에서 표를 복사해 붙여넣으세요."
                    />
                </div>
            </div>

            {toast && <div className="tbl-toast">{toast}</div>}
        </div>
    );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function TableTransformPage() {
    return (
        <TableConfigProvider>
            <TableTransformInner />
        </TableConfigProvider>
    );
}
