import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

/**
 * @param {{ children: React.ReactNode }} props
 */
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState(/** @type {Array<{ id: string, type: string, message: string }>} */ ([]));

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const pushToast = useCallback((type, message) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => removeToast(id), 3500);
    }, [removeToast]);

    const api = useMemo(() => ({
        success: (message) => pushToast('success', message),
        error: (message) => pushToast('error', message),
        info: (message) => pushToast('info', message)
    }), [pushToast]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="fixed top-4 right-4 z-[999] flex flex-col gap-3 max-w-sm">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`toast-base px-4 py-3 rounded-xl text-sm bg-bgCard/90 text-white ${toast.type === 'success'
                            ? 'toast-success'
                            : toast.type === 'error'
                                ? 'toast-danger'
                                : ''}`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return ctx;
};
