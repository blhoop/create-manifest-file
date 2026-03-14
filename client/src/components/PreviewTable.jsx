import { useState, useRef, useEffect } from 'react'
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

const MENU_COLS = new Set(['environment', 'location'])

const OPTIONS_FOR = {
  environment: ['dev', 'stg', 'qa', 'prod'],
  location: [
    'australiaeast', 'eastasia', 'global',
    'eastus', 'eastus2', 'westus', 'westus2', 'centralus',
    'northeurope', 'westeurope', 'uksouth',
    'southeastasia', 'canadacentral',
  ],
}

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
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [showExample, setShowExample] = useState(false)

  const [colMenu, setColMenu] = useState(null)       // col name or null
  const [menuMode, setMenuMode] = useState('setall') // 'setall' | 'findreplace'
  const [menuSetVal, setMenuSetVal] = useState('')
  const [menuFind, setMenuFind] = useState('')
  const [menuReplace, setMenuReplace] = useState('')
  const menuRef = useRef(null)

  useEffect(() => {
    if (!colMenu) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setColMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colMenu])

  const openMenu = (col) => {
    setColMenu(col)
    setMenuMode('setall')
    setMenuSetVal(OPTIONS_FOR[col][0])
    setMenuFind('')
    setMenuReplace(OPTIONS_FOR[col][0])
  }

  const applySetAll = () => {
    onRowsChange(rows.map(r => ({ ...r, [colMenu]: menuSetVal })))
    setColMenu(null)
  }

  const matchCount = menuFind.trim()
    ? rows.filter(r => r[colMenu] === menuFind).length
    : 0

  const applyFindReplace = () => {
    if (!menuFind.trim()) return
    onRowsChange(rows.map(r =>
      r[colMenu] === menuFind ? { ...r, [colMenu]: menuReplace } : r
    ))
    setColMenu(null)
  }

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
              {COLUMNS.map(col => {
                const isMenuCol = MENU_COLS.has(col)
                const menuOpen = colMenu === col
                const uniqueColVals = isMenuCol
                  ? [...new Set(rows.map(r => r[col]).filter(Boolean))].sort()
                  : []
                return (
                  <th key={col}>
                    {REQUIRED.has(col) && <span className="required-star">*</span>}
                    {TOOLTIPS[col] ? (
                      <span className="th-tooltip" data-tooltip={TOOLTIPS[col]}>{col}</span>
                    ) : col}
                    {isMenuCol && (
                      <span className="col-menu-wrap" ref={menuOpen ? menuRef : null}>
                        <button
                          className={`col-menu-btn ${menuOpen ? 'active' : ''}`}
                          onClick={() => menuOpen ? setColMenu(null) : openMenu(col)}
                          title="Bulk edit column"
                        >▾</button>
                        {menuOpen && (
                          <div className="col-popover">
                            <div className="col-popover-tabs">
                              <button
                                className={menuMode === 'setall' ? 'active' : ''}
                                onClick={() => setMenuMode('setall')}
                              >Set all</button>
                              <button
                                className={menuMode === 'findreplace' ? 'active' : ''}
                                onClick={() => setMenuMode('findreplace')}
                              >Find & replace</button>
                            </div>
                            {menuMode === 'setall' ? (
                              <div className="col-popover-body">
                                <label>Set all {rows.length} rows to</label>
                                <select value={menuSetVal} onChange={e => setMenuSetVal(e.target.value)}>
                                  {OPTIONS_FOR[col].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                                <button className="col-popover-apply" onClick={applySetAll}>
                                  Apply to all rows
                                </button>
                              </div>
                            ) : (
                              <div className="col-popover-body">
                                <label>Find</label>
                                <select value={menuFind} onChange={e => setMenuFind(e.target.value)}>
                                  <option value="">— select a value —</option>
                                  {uniqueColVals.map(v => <option key={v} value={v}>{v || '(empty)'}</option>)}
                                </select>
                                <label>Replace with</label>
                                <select value={menuReplace} onChange={e => setMenuReplace(e.target.value)}>
                                  {OPTIONS_FOR[col].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                                {menuFind && (
                                  <span className="col-popover-count">
                                    {matchCount} {matchCount === 1 ? 'row' : 'rows'} will change
                                  </span>
                                )}
                                <button
                                  className="col-popover-apply"
                                  onClick={applyFindReplace}
                                  disabled={!menuFind || matchCount === 0}
                                >Replace</button>
                              </div>
                            )}
                          </div>
                        )}
                      </span>
                    )}
                  </th>
                )
              })}
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
