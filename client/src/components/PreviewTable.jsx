import { useState } from 'react'
import './PreviewTable.css'

const COLUMNS = [
  'spoke_name', 'environment', 'location', 'service_type',
  'app_repo', 'special_comments', 'existing_app_repo',
  'subscription_id', 'spn_client_id', 'vnet_cidr',
]

const TOOLTIPS = {
  spoke_name: 'Name of the Azure Resource',
  environment: 'dev | stg | qa | prod',
  location: 'Azure Region',
  service_type: 'Azure Resource Type',
  app_repo: 'CTM-Infrastructure/Repo Name',
}
const REQUIRED = new Set(['spoke_name', 'environment', 'location', 'service_type'])

const EXAMPLE_ROWS = [
  {
    spoke_name: 'orders-web',
    environment: 'dev',
    location: 'australiaeast',
    service_type: 'App Service',
    app_repo: 'https://github.com/org/orders-api',
    special_comments: 'Connected to: orders-db, service-bus',
    existing_app_repo: '',
    subscription_id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    spn_client_id: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',
    vnet_cidr: '10.1.0.0/24',
  },
  {
    spoke_name: 'orders-db',
    environment: 'prod',
    location: 'eastus',
    service_type: 'SQL Database',
    app_repo: '',
    special_comments: '',
    existing_app_repo: '',
    subscription_id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    spn_client_id: '',
    vnet_cidr: '10.1.0.0/24',
  },
]

export default function PreviewTable({ rows, onRowsChange, onDetach }) {
  const [editingCell, setEditingCell] = useState(null) // { row: i, col: string }
  const [editValue, setEditValue] = useState('')
  const [showExample, setShowExample] = useState(false)

  if (!rows?.length) return null

  const startEdit = (rowIdx, col) => {
    setEditingCell({ row: rowIdx, col })
    setEditValue(rows[rowIdx][col] ?? '')
  }

  const commitEdit = (nextCell) => {
    if (!editingCell) return
    const updated = rows.map((r, i) =>
      i === editingCell.row ? { ...r, [editingCell.col]: editValue } : r
    )
    onRowsChange(updated)
    if (nextCell) {
      setEditingCell(nextCell)
      setEditValue(updated[nextCell.row]?.[nextCell.col] ?? '')
    } else {
      setEditingCell(null)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setEditingCell(null); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(null); return }
    if (e.key === 'Tab') {
      e.preventDefault()
      const colIdx = COLUMNS.indexOf(editingCell.col)
      const nextColIdx = e.shiftKey ? colIdx - 1 : colIdx + 1
      if (nextColIdx >= 0 && nextColIdx < COLUMNS.length) {
        commitEdit({ row: editingCell.row, col: COLUMNS[nextColIdx] })
      } else if (!e.shiftKey && editingCell.row < rows.length - 1) {
        commitEdit({ row: editingCell.row + 1, col: COLUMNS[0] })
      } else if (e.shiftKey && editingCell.row > 0) {
        commitEdit({ row: editingCell.row - 1, col: COLUMNS[COLUMNS.length - 1] })
      } else {
        commitEdit(null)
      }
    }
  }

  const deleteRow = (rowIdx) => {
    onRowsChange(rows.filter((_, i) => i !== rowIdx))
    if (editingCell?.row === rowIdx) setEditingCell(null)
  }

  const addRow = () => {
    const empty = Object.fromEntries(COLUMNS.map(c => [c, '']))
    onRowsChange([...rows, empty])
  }

  return (
    <div className="table-wrapper">
      <div className="table-header">
        <h2 className="table-heading">
          Preview
          <span className="required-legend">(*) Required Fields</span>
          <span className="row-count">{rows.length} {rows.length === 1 ? 'row' : 'rows'}</span>
        </h2>
        <div className="table-header-actions">
          <button className="btn-show-example" onClick={() => setShowExample(v => !v)}>
            {showExample ? 'Hide Example' : 'Show Example'}
          </button>
          <button className="btn-add-row" onClick={addRow}>+ Add Row</button>
          <button className="btn-detach" onClick={onDetach}>Detach File</button>
        </div>
      </div>
      <div className="table-scroll">
        <table className="manifest-table">
          <thead>
            <tr>
              <th className="col-rownum" />
              {COLUMNS.map(col => (
                <th key={col}>
                  {REQUIRED.has(col) && <span className="required-star">*</span>}
                  {TOOLTIPS[col] ? (
                    <span className="th-tooltip" data-tooltip={TOOLTIPS[col]}>{col}</span>
                  ) : col}
                </th>
              ))}
              <th className="col-actions" />
            </tr>
          </thead>
          {showExample && (
            <tbody className="example-tbody">
              {EXAMPLE_ROWS.map((row, i) => (
                <tr key={`ex-${i}`} className="example-row">
                  <td className="col-rownum"><span className="row-num">{i + 1}</span></td>
                  {COLUMNS.map(col => (
                    <td key={col} className="editable-cell">
                      <span className="cell-text">{row[col] ?? ''}</span>
                    </td>
                  ))}
                  <td className="col-actions" />
                </tr>
              ))}
            </tbody>
          )}
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="col-rownum"><span className="row-num">{i + 1}</span></td>
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
                          onBlur={() => commitEdit(null)}
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
                    tabIndex={-1}
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
