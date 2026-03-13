import { useState } from 'react'
import './PreviewTable.css'

const COLUMNS = ['name', 'type', 'special comments']

export default function PreviewTable({ rows, onRowsChange }) {
  const [editingCell, setEditingCell] = useState(null) // { row: i, col: 'name' }
  const [editValue, setEditValue] = useState('')

  if (!rows?.length) return null

  const startEdit = (rowIdx, col) => {
    setEditingCell({ row: rowIdx, col })
    setEditValue(rows[rowIdx][col] ?? '')
  }

  const commitEdit = () => {
    if (!editingCell) return
    const updated = rows.map((r, i) =>
      i === editingCell.row ? { ...r, [editingCell.col]: editValue } : r
    )
    onRowsChange(updated)
    setEditingCell(null)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditingCell(null)
  }

  const deleteRow = (rowIdx) => {
    onRowsChange(rows.filter((_, i) => i !== rowIdx))
  }

  const addRow = () => {
    onRowsChange([...rows, { name: '', type: '', 'special comments': '' }])
  }

  return (
    <div className="table-wrapper">
      <div className="table-header">
        <h2 className="table-heading">Preview</h2>
        <button className="btn-add-row" onClick={addRow}>+ Add Row</button>
      </div>
      <div className="table-scroll">
        <table className="manifest-table">
          <thead>
            <tr>
              {COLUMNS.map(col => <th key={col}>{col}</th>)}
              <th className="col-actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {COLUMNS.map(col => {
                  const isEditing = editingCell?.row === i && editingCell?.col === col
                  return (
                    <td
                      key={col}
                      className={`editable-cell ${isEditing ? 'editing' : ''}`}
                      onClick={() => !isEditing && startEdit(i, col)}
                    >
                      {isEditing ? (
                        <textarea
                          autoFocus
                          className="cell-input"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={onKeyDown}
                          rows={col === 'special comments' ? 3 : 1}
                        />
                      ) : (
                        <span className="cell-text">{row[col] ?? ''}</span>
                      )}
                    </td>
                  )
                })}
                <td className="col-actions">
                  <button
                    className="btn-delete-row"
                    title="Delete row"
                    onClick={() => deleteRow(i)}
                  >×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
