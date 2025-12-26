export default function AdminTable({ columns = [], rows = [], emptyText = "No data" }) {
  return (
    <div className="adminTableWrap">
      <table className="adminTable">
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="adminTableEmpty" colSpan={columns.length}>{emptyText}</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r.id || i}>
                {columns.map((c) => <td key={c.key}>{r[c.key]}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
