import React, { useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import { html as html_beautify } from 'js-beautify';

const JoditEditor = dynamic(() => import('jodit-react'), {
    ssr: false,
    loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#999' }}>에디터 로딩중...</div>
});

const BEAUTIFY_OPTIONS = {
    indent_size: 2, preserve_newlines: false, max_preserve_newlines: 1, wrap_line_length: 0,
    unformatted: ['a', 'span', 'strong', 'em', 'code'],
};

const JoditCustomEditor = React.memo(forwardRef(({ initialData, onChange, onPreview, onTableSelect, editorClasses, triggerToast }, ref) => {
    const editorRef = useRef(null);
    const handlersRef = useRef({ onChange, onPreview, onTableSelect, triggerToast });
    const classesRef = useRef(editorClasses || { tit1: 'tit1', tit2: 'tit2', tit3: 'tit3' });

    useEffect(() => {
        handlersRef.current = { onChange, onPreview, onTableSelect, triggerToast };
    }, [onChange, onPreview, onTableSelect, triggerToast]);

    useEffect(() => {
        classesRef.current = editorClasses || { tit1: 'tit1', tit2: 'tit2', tit3: 'tit3' };
        if (editorRef.current && editorRef.current.options?.controls?.paragraph) {
            editorRef.current.options.controls.paragraph.list = {
                'h3': `${classesRef.current.tit1} (H3)`,
                'h4': `${classesRef.current.tit2} (H4)`,
                'h5': `${classesRef.current.tit3} (H5)`
            };
        }
    }, [editorClasses]);

    useImperativeHandle(ref, () => ({
        clear: () => { if (editorRef.current) editorRef.current.value = ''; },
        setFullContent: (html) => { if (editorRef.current) editorRef.current.value = html; },
        getInstance: () => editorRef.current
    }));

    const config = useMemo(() => ({
        readonly: false,
        height: '100%',
        language: 'ko',
        theme: 'default',
        adaptive: false,
        toolbarAdaptive: false,
        useAceEditor: false,
        sourceEditor: 'area',
        iframe: true,
        iframeCSSLinks: ['/basic.css', '/con_com.css', '/theme.css'],
        allowResizeX: false,
        allowResizeY: false,
        cleanHTML: { fillEmptyParagraph: true, replaceOldTags: false, removeEmptyNodes: false },
        buttons: ['source', '|', 'paragraph', 'table', '|', 'bold', 'italic', 'underline', '|', 'symbols', 'find', 'undo', 'redo'],
        extraButtons: [
            {
                name: 'toggleTh',
                icon: 'th',
                tooltip: 'TD/TH 전환',
                exec: (editor) => {
                    try {
                        let selectedCells = [];
                        const doc = editor.editorDocument || document;
                        const styleTags = Array.from(doc.querySelectorAll('style'));

                        selectedCells = Array.from(editor.editor.querySelectorAll(
                            'td.jodit-selected-cell, th.jodit-selected-cell, td[data-jodit-selected-cell], th[data-jodit-selected-cell], td.jodit_selected_cell, th.jodit_selected_cell'
                        ));

                        if (selectedCells.length === 0) {
                            let selectors = [];
                            styleTags.forEach(style => {
                                const className = style.getAttribute('class') || '';
                                if (className.includes('jodit-table-container') && style.innerHTML.includes('{')) {
                                    const selectorPart = style.innerHTML.split('{')[0].trim();
                                    if (selectorPart) selectors.push(selectorPart);
                                }
                            });
                            if (selectors.length > 0) {
                                try {
                                    const fullSelector = selectors.join(', ');
                                    const elements = Array.from(doc.querySelectorAll(fullSelector));
                                    selectedCells = elements.filter(el => el.tagName === 'TD' || el.tagName === 'TH');
                                } catch (e) {}
                            }
                        }

                        if (selectedCells.length === 0) {
                            const current = editor.s.current();
                            if (current) {
                                const target = current.nodeType === 3 ? current.parentElement : current;
                                const cell = target.closest('td, th');
                                if (cell) selectedCells = [cell];
                            }
                        }

                        if (selectedCells.length === 0) {
                            handlersRef.current.triggerToast?.('테이블 셀(TD/TH) 내부를 선택해주세요.');
                            return;
                        }

                        let lastNewCell = null;
                        selectedCells.forEach(cell => {
                            const newTagName = cell.tagName.toLowerCase() === 'td' ? 'th' : 'td';
                            const newCell = editor.create.element(newTagName);
                            newCell.innerHTML = cell.innerHTML;
                            Array.from(cell.attributes).forEach(attr => { newCell.setAttribute(attr.name, attr.value); });
                            cell.replaceWith(newCell);
                            lastNewCell = newCell;
                        });

                        if (lastNewCell) editor.s.setCursorIn(lastNewCell);
                        if (handlersRef.current.onChange) handlersRef.current.onChange(editor.value);
                    } catch (e) {
                        console.error("TD/TH 전환 중 오류 발생:", e);
                    }
                }
            },
        ],
        showXPathInStatusbar: false,
        showCharsCounter: false,
        showWordsCounter: false,
        showPlaceholder: false,
        askBeforePasteHTML: false,
        askBeforePasteFromWord: false,
        defaultActionOnPaste: 'insert_as_html',
        events: {
            beforeInit: (editor) => {
                if (editor.options.controls.paragraph) {
                    editor.options.controls.paragraph.list = {
                        'h3': `${classesRef.current.tit1} (H3)`,
                        'h4': `${classesRef.current.tit2} (H4)`,
                        'h5': `${classesRef.current.tit3} (H5)`
                    };
                }
            },
            blur: () => {
                if (editorRef.current && handlersRef.current.onChange) {
                    handlersRef.current.onChange(editorRef.current.value);
                }
            },
            mouseup: function (e) {
                if (this && typeof this.getMode === 'function' && this.getMode() !== 1) return;
                if (!handlersRef.current.onTableSelect) return;
                if (!e || !e.target || typeof e.target.closest !== 'function') return;
                try {
                    const table = e.target.closest('table');
                    handlersRef.current.onTableSelect(table);
                } catch (err) {}
            },
            keyup: function (e) {
                if (this && typeof this.getMode === 'function' && this.getMode() !== 1) return;
                if (!handlersRef.current.onTableSelect) return;
                try {
                    if (this && this.selection && typeof this.selection.current === 'function') {
                        const current = this.selection.current();
                        if (current && typeof current.closest === 'function') {
                            const table = current.closest('table');
                            handlersRef.current.onTableSelect(table);
                            return;
                        }
                    }
                    handlersRef.current.onTableSelect(null);
                } catch (err) {}
            },
            beforeSetMode: (instance) => {
                try { instance.value = html_beautify(instance.value, BEAUTIFY_OPTIONS); } catch (e) {}
            },
            afterInit: (instance) => {
                editorRef.current = instance;
                if (initialData && !instance.value) instance.value = initialData;

                const blockJoditSyncBug = (e) => {
                    if (instance.getMode() === 2 && e.target && e.target.classList && e.target.classList.contains('jodit-source__mirror')) {
                        e.stopPropagation();
                    }
                };
                if (instance.container) {
                    instance.container.addEventListener('mousedown', blockJoditSyncBug, true);
                    instance.container.addEventListener('mouseup', blockJoditSyncBug, true);
                    instance.container.addEventListener('click', blockJoditSyncBug, true);
                }
            }
        }
    }), []);

    return (
        <div className="jodit-wrapper">
            <JoditEditor config={config} />
        </div>
    );
}), (prevProps, nextProps) => {
    return (
        prevProps.editorClasses.tit1 === nextProps.editorClasses.tit1 &&
        prevProps.editorClasses.tit2 === nextProps.editorClasses.tit2 &&
        prevProps.editorClasses.tit3 === nextProps.editorClasses.tit3
    );
});

JoditCustomEditor.displayName = 'JoditCustomEditor';
export default JoditCustomEditor;
