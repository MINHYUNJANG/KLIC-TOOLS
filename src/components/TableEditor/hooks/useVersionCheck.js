import { useState, useEffect, useCallback } from 'react';

export default function useVersionCheck() {
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

    useEffect(() => {
        let currentVersion = null;

        const checkVersion = async () => {
            try {
                const res = await fetch(`/version.json?t=${new Date().getTime()}`);
                if (!res.ok) return;
                const data = await res.json();
                if (!currentVersion) {
                    currentVersion = data.version;
                } else if (currentVersion !== data.version) {
                    setIsUpdateAvailable(true);
                }
            } catch (error) {}
        };

        checkVersion();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') checkVersion();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        const intervalId = setInterval(checkVersion, 30 * 60 * 1000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(intervalId);
        };
    }, []);

    const reloadPage = useCallback(() => { window.location.reload(); }, []);

    return { isUpdateAvailable, reloadPage };
}
