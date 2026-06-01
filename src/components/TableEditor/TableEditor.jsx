import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import layout from './layout.module.css';
import { cleanTableHtml, updateStylesOnly } from './cleanTableHtml';
import { mergeAdjacentTable } from './utils/tableProcessor';
import TableConfigToolbar from './TableConfigToolbar';
import { GUIDE_MESSAGES, RE_NUMERIC } from './utils/constants';

import ErrorBoundary from './modal/ErrorBoundary';
import useToast from './hooks/useToast';
import useVersionCheck from './hooks/useVersionCheck';
import { TableConfigProvider, useTableConfig, useTableConfigDispatch } from './TableConfigContext';
import JoditCustomEditor from './JoditCustomEditor';

import PreviewModal from './modal/PreviewModal';
import TableEditModal from './modal/TableEditModal';
import GlobalTableConfigModal from './modal/GlobalTableConfigModal';
import ContentConfigModal from './modal/ContentConfigModal';
import HwpModal from './modal/HwpModal';
import PsdModal from './modal/PsdModal';

import useModals from './hooks/useModals';
import useEditorActions from './hooks/useEditorActions';

export default function TableEditorWrapper() {
    return (
        <TableConfigProvider>
            <TableEditor />
        </TableConfigProvider>
    );
}

function TableEditor() {
    const config = useTableConfig();
    const { updateConfig, updateMultipleConfig } = useTableConfigDispatch();
    const [content, setContent] = useState('');
    const [colWidths, setColWidths] = useState(['']);
    const [selectedTableNode, setSelectedTableNode] = useState(null);
    const selectedTableNodeRef = useRef(null);
    const editorComponentRef = useRef(null);
    const editBoxRef = useRef(null);
    const [tableBtnPos, setTableBtnPos] = useState(null);

    const { toast, triggerToast } = useToast();
    const { isUpdateAvailable, reloadPage } = useVersionCheck();

    const {
        modals, getFadeStyle, toggleModal, isGuideMode, setIsGuideMode,
        tableEditModal, openTableEditModal, closeTableEditModal
    } = useModals();

    const formattedWidthString = useMemo(() =>
        colWidths.map(w => RE_NUMERIC.test(w.trim()) ? w.trim() + '%' : w).join(','),
    [colWidths]);

    const editorClasses = useMemo(() => ({
        tit1: config.tit1Class,
        tit2: config.tit2Class,
        tit3: config.tit3Class
    }), [config.tit1Class, config.tit2Class, config.tit3Class]);

    const { handleClear, handleManualClean, handleCopy, handleExternalTableEdit } = useEditorActions({
        editorRef: editorComponentRef,
        config,
        formattedWidthString,
        setContent,
        triggerToast,
        openTableEditModal,
    });


    useEffect(() => {
        if (isGuideMode) {
            const blockClick = (e) => {
                if (e.target.closest('[class*="guideBtn"]')) return;
                e.preventDefault();
                e.stopPropagation();
            };
            document.addEventListener('click', blockClick, true);
            return () => document.removeEventListener('click', blockClick, true);
        }
    }, [isGuideMode]);

    useEffect(() => {
        selectedTableNodeRef.current = selectedTableNode;
    }, [selectedTableNode]);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!selectedTableNodeRef.current) return;
            const editorInstance = editorComponentRef.current?.getInstance();
            if (!editorInstance) return;
            const isInsideEditor = editorInstance.container && editorInstance.container.contains(e.target);
            const isInsideBtn = e.target.closest(`.${layout.tableBtn}`);
            if (!isInsideEditor && !isInsideBtn) {
                setSelectedTableNode(null);
                setTableBtnPos(null);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, []);

    const updateBtnPos = useCallback(() => {
        const tableEl = selectedTableNodeRef.current;
        if (!tableEl || !editBoxRef.current) { setTableBtnPos(null); return; }
        const tableRect = tableEl.getBoundingClientRect();
        const boxRect = editBoxRef.current.getBoundingClientRect();
        setTableBtnPos({
            top: Math.round(tableRect.top - boxRect.top) - 40,
            left: Math.round(tableRect.right - boxRect.left),
        });
    }, []);

    useEffect(() => { updateBtnPos(); }, [selectedTableNode, updateBtnPos]);

    useEffect(() => {
        if (!selectedTableNode) { setTableBtnPos(null); return; }
        window.addEventListener('scroll', updateBtnPos, true);
        window.addEventListener('resize', updateBtnPos);
        return () => {
            window.removeEventListener('scroll', updateBtnPos, true);
            window.removeEventListener('resize', updateBtnPos);
        };
    }, [selectedTableNode, updateBtnPos]);

    useEffect(() => {
        if (!editorComponentRef.current) return;
        const instance = editorComponentRef.current.getInstance();
        if (!instance) return;
        if (instance.getMode() === 2) return;
        const isEditorFocused = instance.editor && (instance.editor.contains(document.activeElement) || document.activeElement === instance.editor);
        let markers = null;
        if (isEditorFocused) {
            try { markers = instance.s.save(); } catch (e) {}
        }
        const currentContent = instance.value;
        if (!currentContent) {
            if (isEditorFocused && markers) { try { instance.s.restore(markers); } catch(e) {} }
            return;
        }
        const updatedHtml = updateStylesOnly(currentContent, config, formattedWidthString);
        if (updatedHtml !== currentContent) {
            instance.value = updatedHtml;
            if (isEditorFocused && markers) { try { instance.s.restore(markers); } catch (e) {} }
            instance.events.fire('synchro');
            if (editorComponentRef.current.setFullContent) editorComponentRef.current.setFullContent(updatedHtml);
            setContent(updatedHtml);
        } else {
            if (isEditorFocused && markers) { try { instance.s.restore(markers); } catch (e) {} }
        }
    }, [config, formattedWidthString]);

    const handleTableEditApply = useCallback((localConfig, localColWidths) => {
        const instance = editorComponentRef.current?.getInstance();
        if (!instance || !tableEditModal.tempId) return;

        const targetNode = instance.editor.querySelector(`[data-temp-id="${tableEditModal.tempId}"]`);

        if (targetNode) {
            const formattedWidth = localColWidths.map(w => RE_NUMERIC.test(w.trim()) ? w.trim() + '%' : w).join(',');
            const tempParserDiv = document.createElement('div');
            tempParserDiv.innerHTML = tableEditModal.html;
            tempParserDiv.querySelectorAll('[data-local-config]').forEach(el => el.removeAttribute('data-local-config'));
            tempParserDiv.querySelectorAll('[data-local-colwidths]').forEach(el => el.removeAttribute('data-local-colwidths'));

            let nextNodeToRemove = null;

            if (localConfig.isMergeTables) {
                let sibling = targetNode.nextElementSibling;
                while (sibling) {
                    const txt = sibling.textContent.replace(/[\s ​-‍﻿]/g, "");
                    if (sibling.tagName === 'TABLE' || sibling.querySelector('table')) break;
                    if (txt !== '' || sibling.querySelectorAll('img, iframe').length > 0) { sibling = null; break; }
                    sibling = sibling.nextElementSibling;
                }
                if (sibling) {
                    const baseTable = tempParserDiv.querySelector('table');
                    const nextTableEl = sibling.tagName === 'TABLE' ? sibling : sibling.querySelector('table');
                    if (baseTable && nextTableEl) {
                        if (mergeAdjacentTable(baseTable, nextTableEl)) {
                            nextNodeToRemove = sibling;
                        } else {
                            setTimeout(() => triggerToast('열 수가 달라 병합이 취소되었습니다.', 'error'), 0);
                        }
                    }
                } else {
                    setTimeout(() => triggerToast('병합할 다음 표를 찾을 수 없습니다.', 'error'), 0);
                }
            }

            const cleanedHtml = cleanTableHtml(tempParserDiv.innerHTML, { ...localConfig, isMergeTables: false }, formattedWidth);

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cleanedHtml;
            const newTargetNode = tempDiv.firstElementChild;

            if (newTargetNode) {
                const savedConfig = { ...localConfig, isMergeTables: false };
                newTargetNode.setAttribute('data-local-config', JSON.stringify(savedConfig));
                newTargetNode.setAttribute('data-local-colwidths', JSON.stringify(localColWidths));
                newTargetNode.setAttribute('data-temp-id', tableEditModal.tempId);
                targetNode.replaceWith(newTargetNode);
                if (nextNodeToRemove) nextNodeToRemove.remove();

                const newEditorHtml = instance.editor.innerHTML;
                instance.value = newEditorHtml;
                instance.events.fire('change');
                if (editorComponentRef.current.setFullContent) editorComponentRef.current.setFullContent(newEditorHtml);
                setContent(newEditorHtml);
                setSelectedTableNode(newTargetNode);
                triggerToast('선택한 표의 설정이 개별 변경되었습니다.');
            }
        }
        closeTableEditModal();
    }, [tableEditModal, triggerToast, closeTableEditModal]);

    const handlePreviewOpen = useCallback(() => {
        toggleModal('preview', true);
    }, [toggleModal]);

    const handleGlobalTableConfigApply = useCallback((newConfig, newColWidths) => {
        updateMultipleConfig(newConfig);
        setColWidths(newColWidths);
        toggleModal('globalTableConfig', false);
        triggerToast('테이블 기본 설정이 변경되었습니다.');
    }, [updateMultipleConfig, setColWidths, toggleModal, triggerToast]);

    const handleContentConfigApply = useCallback((newConfig) => {
        updateMultipleConfig(newConfig);
        toggleModal('contentConfig', false);
        triggerToast('컨텐츠 기본 설정이 변경되었습니다.');
    }, [updateMultipleConfig, toggleModal, triggerToast]);

    return (
        <div className={layout.tableWrap} suppressHydrationWarning>
            {isUpdateAvailable && (
                <div className={layout.updateBanner}>
                    <span>🚀 새로운 버전이 업데이트되었습니다! 최신 상태로 새로고침 해주세요.</span>
                    <button onClick={reloadPage} className={layout.reloadBtn}>지금 새로고침</button>
                </div>
            )}

            <div className={layout.contBox}>
                <TableConfigToolbar
                    isGuideMode={isGuideMode}
                    toggleModal={toggleModal}
                    modals={modals}
                    handleCopy={handleCopy}
                    handleClear={handleClear}
                    handleManualClean={handleManualClean}
                />

                <div ref={editBoxRef} className={`${layout.editBox} ${isGuideMode ? `${layout.guideTarget} ${layout.guideCenter}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.editorConfig : undefined}>
                    {tableBtnPos && (
                        <div className={layout.tableBtn} style={{ top: tableBtnPos.top, left: tableBtnPos.left }}>
                            <button onClick={handleExternalTableEdit} className={`${layout.Btn} ${isGuideMode ? `${layout.guideTarget} ${layout.guideLeft}` : ''}`} data-guide={isGuideMode ? GUIDE_MESSAGES.tableBtn : undefined}>
                                <i className="ri-settings-4-line"></i>
                            </button>
                        </div>
                    )}

                    <ErrorBoundary key="editor-boundary">
                        <JoditCustomEditor
                            ref={editorComponentRef}
                            initialData={""}
                            onChange={setContent}
                            onPreview={handlePreviewOpen}
                            onTableSelect={setSelectedTableNode}
                            editorClasses={editorClasses}
                            triggerToast={triggerToast}
                        />
                    </ErrorBoundary>
                </div>
            </div>

            {isGuideMode && <div className={layout.guideWrap}/>}
            {toast.show && <div key={toast.id} className="toast-popup">{toast.message}</div>}

            {modals.preview && <PreviewModal content={content} config={config} widthString={formattedWidthString} onClose={() => toggleModal('preview', false)} layout={layout} fadeStyle={getFadeStyle('preview')} />}

            {modals.tableEdit && (
                <TableEditModal
                    onClose={closeTableEditModal}
                    onApply={handleTableEditApply}
                    globalConfig={config}
                    layout={layout}
                    existingConfig={tableEditModal.existingConfig}
                    existingColWidths={tableEditModal.existingColWidths}
                    fadeStyle={getFadeStyle('tableEdit')}
                />
            )}

            {modals.globalTableConfig && (
                <GlobalTableConfigModal
                    onClose={() => toggleModal('globalTableConfig', false)}
                    onApply={handleGlobalTableConfigApply}
                    globalConfig={config}
                    colWidths={colWidths}
                    layout={layout}
                    isGuideMode={isGuideMode}
                    setIsGuideMode={setIsGuideMode}
                    fadeStyle={getFadeStyle('globalTableConfig')}
                />
            )}
            {modals.contentConfig && (
                <ContentConfigModal
                    onClose={() => toggleModal('contentConfig', false)}
                    onApply={handleContentConfigApply}
                    globalConfig={config}
                    layout={layout}
                    isGuideMode={isGuideMode}
                    setIsGuideMode={setIsGuideMode}
                    fadeStyle={getFadeStyle('contentConfig')}
                />
            )}
            {modals.HwpModal && (
                <HwpModal
                    onClose={() => toggleModal('HwpModal', false)}
                    layout={layout}
                    fadeStyle={getFadeStyle('HwpModal')}
                />
            )}
            {modals.PsdModal && (
                <PsdModal
                    onClose={() => toggleModal('PsdModal', false)}
                    layout={layout}
                    fadeStyle={getFadeStyle('PsdModal')}
                />
            )}
        </div>
    );
}
