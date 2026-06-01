import { useCallback } from 'react';
import { html as html_beautify } from 'js-beautify';
import { cleanTableHtml, updateStylesOnly } from '../cleanTableHtml';
import { RE_WHITESPACE } from '../utils/constants';

export default function useEditorActions({
    editorRef, config, formattedWidthString, setContent, triggerToast, openTableEditModal
}) {
    const handleClear = useCallback(() => {
        if (editorRef.current) editorRef.current.clear();
        setContent('');
        triggerToast('삭제되었습니다.');
    }, [editorRef, setContent, triggerToast]);

    const handleManualClean = useCallback(async () => {
        const currentVal = editorRef.current?.getInstance()?.value;
        if (!currentVal) return triggerToast('정리할 내용이 없습니다.');

        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 50)));

        try {
            const cleanedHtml = cleanTableHtml(currentVal, config, formattedWidthString);
            if (editorRef.current) editorRef.current.setFullContent(cleanedHtml);
            setContent(cleanedHtml);
            triggerToast('문서 정리가 완료되었습니다.');
        } catch (error) {
            console.error("Clean Document Error", error);
            triggerToast('정리 중 오류가 발생했습니다.', 'error');
        }
    }, [editorRef, config, formattedWidthString, setContent, triggerToast]);

    const handleCopy = useCallback(async () => {
        const currentVal = editorRef.current?.getInstance()?.value;
        if (!currentVal) return triggerToast('복사할 내용이 없습니다.');

        let finalHtml = updateStylesOnly(currentVal, config, formattedWidthString);

        const tempParser = new DOMParser();
        const tempDoc = tempParser.parseFromString(finalHtml, 'text/html');
        tempDoc.querySelectorAll('[data-local-config]').forEach(el => el.removeAttribute('data-local-config'));
        tempDoc.querySelectorAll('[data-local-colwidths]').forEach(el => el.removeAttribute('data-local-colwidths'));
        tempDoc.querySelectorAll('[data-temp-id]').forEach(el => el.removeAttribute('data-temp-id'));
        tempDoc.querySelectorAll('[data-origin-html]').forEach(el => el.removeAttribute('data-origin-html'));
        tempDoc.querySelectorAll('td, th').forEach(cell => {
            const text = cell.textContent.replace(RE_WHITESPACE, '');
            if (text === '' && cell.querySelectorAll('img, iframe, table').length === 0) cell.innerHTML = '';
        });

        finalHtml = tempDoc.body.innerHTML;
        finalHtml = finalHtml.replace(/<p>\s*<br\s*\/?>\s*<\/p>\s*$/i, '');
        finalHtml = finalHtml.replace(/<br\s+class=["']vt-br["']\s*\/?>/gi, '<br />');

        try {
            const beautified = html_beautify(finalHtml, {
                indent_size: 2, preserve_newlines: false, max_preserve_newlines: 1, wrap_line_length: 0,
                unformatted: ['a', 'span', 'strong', 'em', 'code', 'i', 'b', 'u'],
            });

            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(beautified);
                triggerToast('복사되었습니다.');
            } else {
                triggerToast('현재 환경에서는 클립보드 복사 기능을 지원하지 않습니다.');
            }
        } catch (err) {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(finalHtml)
                    .then(() => triggerToast('복사되었습니다.(정렬 실패)'))
                    .catch(() => triggerToast('복사 실패'));
            } else {
                triggerToast('복사 실패: 지원하지 않는 환경입니다.');
            }
        }
    }, [editorRef, config, formattedWidthString, triggerToast]);

    const handleExternalTableEdit = useCallback(() => {
        const instance = editorRef.current?.getInstance();
        if (!instance) return triggerToast('에디터를 찾을 수 없습니다.');

        const current = instance.s.current();
        const target = current?.nodeType === 3 ? current.parentElement : current;
        let table = target?.closest('table');

        if (!table) {
            const allTables = instance.editor.querySelectorAll('table');
            if (allTables.length === 1) table = allTables[0];
        }

        if (table) {
            let targetToProcess = table;
            if (table.parentElement && table.parentElement.tagName === 'DIV' && (table.parentElement.className.includes('tbl') || table.parentElement.className.includes('scroll'))) {
                targetToProcess = table.parentElement;
            }

            const tempId = 'tbl-edit-' + Math.random().toString(36).substr(2, 9);
            targetToProcess.setAttribute('data-temp-id', tempId);

            let passedConfig = null;
            let passedColWidths = null;
            if (targetToProcess.hasAttribute('data-local-config')) {
                try { passedConfig = JSON.parse(targetToProcess.getAttribute('data-local-config')); } catch(e) {}
            }
            if (targetToProcess.hasAttribute('data-local-colwidths')) {
                try { passedColWidths = JSON.parse(targetToProcess.getAttribute('data-local-colwidths')); } catch(e) {}
            }

            openTableEditModal(targetToProcess.outerHTML, tempId, passedConfig, passedColWidths);
        } else {
            triggerToast('표(Table) 내부를 클릭한 후 설정 버튼을 눌러주세요.');
        }
    }, [editorRef, triggerToast, openTableEditModal]);

    return { handleClear, handleManualClean, handleCopy, handleExternalTableEdit };
}
