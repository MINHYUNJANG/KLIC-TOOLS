import { useState, useCallback, useRef, useEffect } from 'react';

const FADE_DURATION = 300;

const INITIAL_MODALS = {
    preview: false, guide: false, aiRefine: false,
    globalTableConfig: false, contentConfig: false,
    HwpModal: false, PsdModal: false, tableEdit: false,
};

const EXCLUSIVE_MODALS = ['globalTableConfig', 'contentConfig', 'HwpModal', 'PsdModal', 'tableEdit'];

const INITIAL_TABLE_EDIT_DATA = { html: '', tempId: '', existingConfig: null, existingColWidths: null };

export default function useModals() {
    const [modals, setModals] = useState(INITIAL_MODALS);
    const [visibleModals, setVisibleModals] = useState(INITIAL_MODALS);
    const [isGuideMode, setIsGuideMode] = useState(false);
    const [tableEditData, setTableEditData] = useState(INITIAL_TABLE_EDIT_DATA);

    const timersRef = useRef({});

    const toggleModal = useCallback((name, show) => {
        if (timersRef.current[name]) {
            clearTimeout(timersRef.current[name]);
            delete timersRef.current[name];
        }
        if (show) {
            if (EXCLUSIVE_MODALS.includes(name)) {
                EXCLUSIVE_MODALS.forEach(key => {
                    if (key === name) return;
                    if (timersRef.current[key]) { clearTimeout(timersRef.current[key]); delete timersRef.current[key]; }
                });
                const closeUpdate = Object.fromEntries(EXCLUSIVE_MODALS.filter(k => k !== name).map(k => [k, false]));
                setModals(prev => ({ ...prev, ...closeUpdate }));
                setVisibleModals(prev => ({ ...prev, ...closeUpdate }));
            }
            setModals(prev => ({ ...prev, [name]: true }));
            timersRef.current[name] = setTimeout(() => {
                setVisibleModals(prev => ({ ...prev, [name]: true }));
                delete timersRef.current[name];
            }, 10);
        } else {
            setVisibleModals(prev => ({ ...prev, [name]: false }));
            timersRef.current[name] = setTimeout(() => {
                setModals(prev => ({ ...prev, [name]: false }));
                delete timersRef.current[name];
            }, FADE_DURATION);
        }
    }, []);

    useEffect(() => {
        return () => { Object.values(timersRef.current).forEach(clearTimeout); timersRef.current = {}; };
    }, []);

    const getFadeStyle = useCallback((name) => ({
        opacity: visibleModals[name] ? 1 : 0,
        transition: `opacity ${FADE_DURATION}ms`,
        pointerEvents: visibleModals[name] ? 'auto' : 'none',
    }), [visibleModals]);

    const openTableEditModal = useCallback((html, tempId, existingConfig, existingColWidths) => {
        setTableEditData({ html, tempId, existingConfig, existingColWidths });
        toggleModal('tableEdit', true);
    }, [toggleModal]);

    const closeTableEditModal = useCallback(() => {
        toggleModal('tableEdit', false);
        setTimeout(() => setTableEditData(INITIAL_TABLE_EDIT_DATA), FADE_DURATION);
    }, [toggleModal]);

    return {
        modals, visibleModals, getFadeStyle, toggleModal,
        isGuideMode, setIsGuideMode,
        tableEditModal: { show: modals.tableEdit, ...tableEditData },
        openTableEditModal, closeTableEditModal,
    };
}
