export default function AdminModal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="adminModalOverlay" onClick={onClose}>
      <div className="adminModal" onClick={(e) => e.stopPropagation()}>
        <div className="adminModalHead">
          <div className="adminModalTitle">{title}</div>
          <button className="adminIconBtn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="adminModalBody">{children}</div>
      </div>
    </div>
  );
}
