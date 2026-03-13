import './PreviewTable.css'

const COLUMNS = ['name', 'type', 'special comments']

export default function PreviewTable({ rows }) {
  if (!rows?.length) return null

  return (
    <div className="table-wrapper">
      <h2 className="table-heading">Preview</h2>
      <div className="table-scroll">
        <table className="manifest-table">
          <thead>
            <tr>
              {COLUMNS.map(col => <th key={col}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {COLUMNS.map(col => (
                  <td key={col}>{row[col] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
