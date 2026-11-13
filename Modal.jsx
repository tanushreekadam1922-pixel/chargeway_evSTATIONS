import { useEffect } from 'react';

export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-label={title}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
