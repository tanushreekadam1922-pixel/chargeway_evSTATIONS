import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

/** Small pop-up messages: toast('Saved', 'good') or toast(error.message, 'bad'). */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const nextId = useRef(1);

  const toast = useCallback((message, type = '') => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, message, type }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status">
        {items.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx.toast;
}
