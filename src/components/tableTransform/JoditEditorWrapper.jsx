import { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import { html as html_beautify } from 'js-beautify';

const BEAUTIFY_OPTIONS = {
    indent_size: 2,
    preserve_newlines: false,
    max_preserve_newlines: 1,
    wrap_line_length: 0,
    unformatted: ['a', 'span', 'strong', 'em', 'code'],
};

const JoditEditor = dynamic(() => import('jodit-react'), { ssr: false });

const JoditEditorWrapper = forwardRef(({ placeholder }, ref) => {
    const instanceRef = useRef(null);

    useImperativeHandle(ref, () => ({
        getValue: () => instanceRef.current?.value || '',
        setValue: (html) => {
            if (instanceRef.current) instanceRef.current.value = html;
        },
        clear: () => {
            if (instanceRef.current) instanceRef.current.value = '';
        },
    }));

    const config = useMemo(() => ({
        readonly: false,
        height: '100%',
        language: 'ko',
        theme: 'default',
        adaptive: false,
        toolbarAdaptive: false,
        iframe: true,
        iframeCSSLinks: ['/basic.css', '/con_com.css', '/theme.css'],
        sourceEditor: 'area',
        allowResizeX: false,
        allowResizeY: false,
        cleanHTML: { fillEmptyParagraph: true, replaceOldTags: false, removeEmptyNodes: false },
        buttons: ['source', '|', 'table', '|', 'bold', 'italic', 'underline', '|', 'undo', 'redo'],
        showXPathInStatusbar: false,
        showCharsCounter: false,
        showWordsCounter: false,
        showPlaceholder: !!placeholder,
        placeholder: placeholder || '',
        askBeforePasteHTML: false,
        askBeforePasteFromWord: false,
        defaultActionOnPaste: 'insert_as_html',
        events: {
            afterInit: (instance) => {
                instanceRef.current = instance;
            },
            beforeSetMode: () => {
                try {
                    if (instanceRef.current) {
                        instanceRef.current.value = html_beautify(instanceRef.current.value, BEAUTIFY_OPTIONS);
                    }
                } catch (e) {}
            },
        },
    }), [placeholder]);

    return (
        <div className="tbl-jodit-wrapper">
            <JoditEditor config={config} />
        </div>
    );
});

JoditEditorWrapper.displayName = 'JoditEditorWrapper';
export default JoditEditorWrapper;
