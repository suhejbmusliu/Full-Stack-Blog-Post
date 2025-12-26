export default function FormRow({ label, hint, children }) {
  return (
    <label className="adminFormRow">
      <div className="adminFormTop">
        <span className="adminFormLabel">{label}</span>
        {hint ? <span className="adminFormHint">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}
