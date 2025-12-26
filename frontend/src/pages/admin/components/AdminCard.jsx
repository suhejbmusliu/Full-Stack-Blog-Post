export default function AdminCard({ title, right, children }) {
  return (
    <section className="adminCard">
      {(title || right) && (
        <div className="adminCardHead">
          <div className="adminCardTitle">{title}</div>
          <div>{right}</div>
        </div>
      )}
      <div className="adminCardBody">{children}</div>
    </section>
  );
}
