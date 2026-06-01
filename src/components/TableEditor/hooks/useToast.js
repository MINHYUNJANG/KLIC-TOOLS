import { useState, useCallback, useRef, useEffect } from 'react';

export default function useToast() {
    const [toast, setToast] = useState({ show: false, message: '', id: 0 });
    const toastTimer = useRef(null);

    useEffect(() => {
        return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
    }, []);

    const triggerToast = useCallback((message, type = 'info') => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ show: true, message, type, id: Date.now() });
        toastTimer.current = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2000);
    }, []);

    return { toast, triggerToast };
}
