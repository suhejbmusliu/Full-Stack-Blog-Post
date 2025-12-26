export default function AdminToast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className={`adminToast adminToast--${toast.type || "info"}`}>
      <div className="adminToastText">{toast.message}</div>
      <button className="adminIconBtn" onClick={onClose} aria-label="Close toast">✕</button>
    </div>
  );
}
