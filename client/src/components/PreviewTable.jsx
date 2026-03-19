import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import './PreviewTable.css'
import ResourceCommentPopup from './ResourceCommentPopup'

// Detect lines where a scalar value contains unquoted YAML-unsafe characters
function validateYaml(yaml) {
  const issues = []
  yaml.split('\n').forEach((line, i) => {
    if (/^\s*#/.test(line) || !line.trim()) return
    const match = line.match(/^(\s*[\w_-]+):\s(.+)$/)
    if (!match) return
    const val = match[2]
    const quoted = val.startsWith('"') || val.startsWith("'")
    if (!quoted && /[:#\{\}\[\]]/.test(val)) {
      issues.push({ lineNum: i + 1, text: line.trim() })
    }
  })
  return issues
}

const COLUMNS = ['name', 'type', 'location', 'repo', 'comments']

const TOOLTIPS = {
  name: 'Subsystem/component name (e.g. web, booking-db)',
  type: 'What to deploy. Types: app_service, pg, cosmos, sql, mysql, sqlmi, aks, container_app, vm, redis, static_web_app, key_vault, app_insights, container_registry, servicebus, openai, search, storage_account, data_factory, app_configuration, frontdoor, user_assigned_identity',
  location: 'Azure region override. Omit to use default_location.',
  repo: 'Application source repo (org/repo format). When specified, the pipeline auto-generates CI/CD caller workflows targeting this service from the given repo in a PR.',
  comments: 'Free-text hints that influence the manifest. e.g. "needs pgbouncer", "serverless", "zone redundant ha"',
}

const DISPLAY_LABELS = {
  repo: 'scm repo',
}

const REQUIRED = new Set(['name', 'type'])

const MENU_COLS = new Set(['location'])

// Canonical service types — drives type-column autocomplete suggestions
const TYPE_OPTIONS = [
  'app_service',
  'pg',
  'cosmos',
  'sql',
  'mysql',
  'sqlmi',
  'aks',
  'container_app',
  'vm',
  'redis',
  'static_web_app',
  'key_vault',
  'app_insights',
  'container_registry',
  'servicebus',
  'openai',
  'search',
  'storage_account',
  'data_factory',
  'app_configuration',
  'frontdoor',
  'user_assigned_identity',
]

const OPTIONS_FOR = {
  location: [
    'australiaeast', 'eastus', 'eastus2',
    'northcentralus', 'southeastasia', 'uksouth', 'westus3',
  ],
}

const EXAMPLE_ROWS = [
  {
    name: 'web',
    type: 'app_service',
    location: 'australiaeast',
    repo: 'MyOrg/ob-app',
    comments: 'main web app',
  },
  {
    name: 'booking-db',
    type: 'pg',
    location: '',
    repo: '',
    comments: 'needs pgbouncer',
  },
]

// Comments now include parent links in structured format, just display as-is
const getCommentDisplayText = (row) => row.comments ?? ''

export default function PreviewTable({ rows, onRowsChange, onDetach, onAudit, getYaml }) {
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [suggestionIdx, setSuggestionIdx] = useState(-1)
  const [showExample, setShowExample] = useState(false)

  const [selectedRows, setSelectedRows] = useState(new Set())
  const [lastClickedIdx, setLastClickedIdx] = useState(null)

  const [showParseText, setShowParseText] = useState(false)
  const [parseTextVal, setParseTextVal] = useState('')
  const [showYamlPreview, setShowYamlPreview] = useState(false)
  const [yamlCopied, setYamlCopied] = useState(false)
  const [yamlIssues, setYamlIssues] = useState([])

  const [jsonPopupRow, setJsonPopupRow] = useState(null)

  const [fillDrag, setFillDrag] = useState(null)
  const fillDragRef = useRef(null)

  const [colMenu, setColMenu] = useState(null)
  const [menuMode, setMenuMode] = useState('setall')
  const [menuSetVal, setMenuSetVal] = useState('')
  const [menuFind, setMenuFind] = useState('')
  const [menuReplace, setMenuReplace] = useState('')
  const menuRef = useRef(null)

  const [serviceTypeFilter, setServiceTypeFilter] = useState(new Set())
  const [showServiceFilter, setShowServiceFilter] = useState(false)
  const serviceFilterRef = useRef(null)

  useEffect(() => {
    if (!colMenu) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setColMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colMenu])

  useEffect(() => {
    if (!showServiceFilter) return
    const handler = (e) => {
      if (serviceFilterRef.current && !serviceFilterRef.current.contains(e.target)) setShowServiceFilter(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showServiceFilter])

  const suggestions = useMemo(() => {
    if (!editingCell || !editValue.trim()) return []
    const lower = editValue.toLowerCase()
    const currentRowIdx = editingCell.row
    const existingValues = rows
      .filter((r, i) => i !== currentRowIdx && r[editingCell.col])
      .map(r => r[editingCell.col])
    const pool = editingCell.col === 'type'
      ? [...new Set([...TYPE_OPTIONS, ...existingValues])]
      : [...new Set(existingValues)]
    return pool
      .filter(v => v.toLowerCase().includes(lower) && v !== editValue)
      .sort()
      .slice(0, 10)
  }, [editingCell, editValue, rows])

  useEffect(() => { setSuggestionIdx(-1) }, [suggestions])

  const acceptSuggestion = useCallback((val) => {
    setEditValue(val)
    setSuggestionIdx(-1)
  }, [])

  const openMenu = (col) => {
    setColMenu(col)
    setMenuMode('setall')
    setMenuSetVal(OPTIONS_FOR[col][0])
    setMenuFind('')
    setMenuReplace(OPTIONS_FOR[col][0])
  }

  const applySetAll = () => {
    if (onAudit) onAudit({ type: 'SET_ALL', col: colMenu, value: menuSetVal, count: rows.length })
    onRowsChange(rows.map(r => ({ ...r, [colMenu]: menuSetVal })))
    setColMenu(null)
  }

  const applyClearAll = () => {
    const count = rows.filter(r => r[colMenu]).length
    if (onAudit) onAudit({ type: 'SET_ALL', col: colMenu, value: '', count })
    onRowsChange(rows.map(r => ({ ...r, [colMenu]: '' })))
    setColMenu(null)
  }

  const matchCount = menuFind.trim()
    ? rows.filter(r => r[colMenu] === menuFind).length
    : 0

  const applyFindReplace = () => {
    if (!menuFind.trim()) return
    if (onAudit) onAudit({ type: 'FIND_REPLACE', col: colMenu, find: menuFind, replace: menuReplace, count: matchCount })
    onRowsChange(rows.map(r =>
      r[colMenu] === menuFind ? { ...r, [colMenu]: menuReplace } : r
    ))
    setColMenu(null)
  }

  const parseTextTerms = parseTextVal
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  const parseTextMatchCount = parseTextTerms.length
    ? rows.filter(r => parseTextTerms.some(t =>
        String(r.name ?? '').toLowerCase().includes(t.toLowerCase())
      )).length
    : 0

  const applyParseTextRemove = () => {
    const escaped = parseTextTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const patterns = parseTextTerms.map((t, i) => ({
      re: new RegExp(escaped[i], 'gi'),
      term: t.toLowerCase(),
    }))
    const changes = []
    const updatedRows = rows.map(r => {
      let nameVal = String(r.name ?? '')
      const matches = patterns.some(({ term }) => nameVal.toLowerCase().includes(term))
      if (!matches) return r
      const before = nameVal
      patterns.forEach(({ re }) => { nameVal = nameVal.replace(re, '') })
      changes.push({ before, after: nameVal })
      return { ...r, name: nameVal }
    })
    if (onAudit && changes.length) onAudit({ type: 'PARSE_SPOKE_NAMES', terms: parseTextTerms, changes })
    onRowsChange(updatedRows)
    setShowParseText(false)
    setParseTextVal('')
  }

  // Unique types for filter popover
  const allServiceTypes = [...new Set(rows.map(r => r.type).filter(Boolean))].sort()

  const toggleServiceType = (st) => {
    setServiceTypeFilter(prev => {
      const next = new Set(prev)
      if (next.has(st)) next.delete(st)
      else next.add(st)
      return next
    })
  }

  // Display rows: filtered view with original indices preserved
  const displayRows = rows.reduce((acc, row, idx) => {
    if (serviceTypeFilter.size === 0 || serviceTypeFilter.has(row.type) || !row.type) {
      acc.push({ row, idx })
    }
    return acc
  }, [])

  const fillRange = useMemo(() => {
    if (!fillDrag) return new Set()
    const { sourceDispIdx, endDispIdx } = fillDrag
    const s = new Set()
    const from = Math.min(sourceDispIdx, endDispIdx)
    const to = Math.max(sourceDispIdx, endDispIdx)
    for (let i = from; i <= to; i++) {
      if (i !== sourceDispIdx) s.add(i)
    }
    return s
  }, [fillDrag])

  if (!rows?.length) return null

  const startEdit = (rowIdx, col) => {
    setEditingCell({ row: rowIdx, col })
    setEditValue(rows[rowIdx][col] ?? '')
  }

  const commitEdit = (nextCell) => {
    if (!editingCell) return
    const oldVal = rows[editingCell.row][editingCell.col] ?? ''
    if (onAudit && editValue !== oldVal) {
      onAudit({ type: 'CELL_EDIT', row: editingCell.row, col: editingCell.col, oldVal, newVal: editValue })
    }
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
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSuggestionIdx(i => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSuggestionIdx(i => Math.max(i - 1, -1))
        return
      }
      if (e.key === 'Enter' && !e.shiftKey && suggestionIdx >= 0) {
        e.preventDefault()
        acceptSuggestion(suggestions[suggestionIdx])
        return
      }
    }
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
    if (onAudit) onAudit({ type: 'ROW_DELETED', rowNum: rowIdx, rowData: rows[rowIdx] })
    onRowsChange(rows.filter((_, i) => i !== rowIdx))
    if (editingCell?.row === rowIdx) setEditingCell(null)
  }

  const addRow = () => {
    if (onAudit) onAudit({ type: 'ROW_ADDED' })
    const empty = Object.fromEntries(COLUMNS.map(c => [c, '']))
    onRowsChange([...rows, empty])
  }

  const startFillDrag = (e, dispIdx) => {
    e.preventDefault()
    e.stopPropagation()
    const value = displayRows[dispIdx]?.row.comments ?? ''
    const drag = { sourceDispIdx: dispIdx, endDispIdx: dispIdx, value }
    fillDragRef.current = drag
    setFillDrag({ ...drag })
    document.body.classList.add('fill-dragging')

    const onMouseMove = (mv) => {
      const el = document.elementFromPoint(mv.clientX, mv.clientY)
      const tr = el?.closest('tr[data-disp-idx]')
      if (!tr) return
      const di = parseInt(tr.dataset.dispIdx, 10)
      if (isNaN(di) || di === fillDragRef.current.endDispIdx) return
      fillDragRef.current = { ...fillDragRef.current, endDispIdx: di }
      setFillDrag({ ...fillDragRef.current })
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.classList.remove('fill-dragging')
      const { sourceDispIdx, endDispIdx, value } = fillDragRef.current
      const from = Math.min(sourceDispIdx, endDispIdx)
      const to = Math.max(sourceDispIdx, endDispIdx)
      if (from !== to) {
        const toUpdate = new Set()
        for (let i = from; i <= to; i++) {
          if (i !== sourceDispIdx && displayRows[i]) toUpdate.add(displayRows[i].idx)
        }
        if (toUpdate.size > 0) {
          onRowsChange(rows.map((r, i) => toUpdate.has(i) ? { ...r, comments: value } : r))
          if (onAudit) onAudit({ type: 'FILL_DOWN_COMMENTS', sourceRow: displayRows[sourceDispIdx].idx, count: toUpdate.size })
        }
      }
      fillDragRef.current = null
      setFillDrag(null)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const handleJsonCommentCommit = (rowIdx, commitData) => {
    const newComment = (commitData && typeof commitData === 'object' && !Array.isArray(commitData))
      ? (commitData.comment ?? '')
      : (commitData ?? '')

    const oldComment = rows[rowIdx].comments ?? ''
    if (onAudit && newComment !== oldComment) {
      onAudit({ type: 'JSON_COMMENT_APPEND', row: rowIdx, oldVal: oldComment, newVal: newComment })
    }

    const updatedRow = { ...rows[rowIdx], comments: newComment }

    onRowsChange(rows.map((r, i) => i === rowIdx ? updatedRow : r))
    setJsonPopupRow(null)
  }

  const handleRowNumClick = (idx, e) => {
    e.preventDefault()
    if (e.shiftKey && lastClickedIdx !== null) {
      // Range select using current display order
      const displayIndices = displayRows.map(d => d.idx)
      const anchorPos = displayIndices.indexOf(lastClickedIdx)
      const clickPos = displayIndices.indexOf(idx)
      const [from, to] = anchorPos <= clickPos ? [anchorPos, clickPos] : [clickPos, anchorPos]
      const range = displayIndices.slice(from, to + 1)
      setSelectedRows(prev => {
        const next = new Set(prev)
        range.forEach(i => next.add(i))
        return next
      })
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedRows(prev => {
        const next = new Set(prev)
        if (next.has(idx)) next.delete(idx)
        else next.add(idx)
        return next
      })
      setLastClickedIdx(idx)
    } else {
      if (selectedRows.size === 1 && selectedRows.has(idx)) {
        setSelectedRows(new Set())
        setLastClickedIdx(null)
      } else {
        setSelectedRows(new Set([idx]))
        setLastClickedIdx(idx)
      }
    }
  }

  const filterActive = serviceTypeFilter.size > 0

  const openYamlPreview = () => {
    const yaml = getYaml()
    setYamlIssues(validateYaml(yaml))
    setShowYamlPreview(true)
  }

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(getYaml()).then(() => {
      setYamlCopied(true)
      setTimeout(() => setYamlCopied(false), 2000)
    })
  }

  return (
    <div className="table-wrapper">
      {jsonPopupRow !== null && (
        <ResourceCommentPopup
          row={rows[jsonPopupRow]}
          currentComment={rows[jsonPopupRow]?.comments ?? ''}
          onClose={() => setJsonPopupRow(null)}
          onCommit={(comment) => handleJsonCommentCommit(jsonPopupRow, comment)}
        />
      )}
      {showYamlPreview && (
        <div className="yaml-preview-overlay" onMouseDown={() => setShowYamlPreview(false)}>
          <div className="yaml-preview-dialog" onMouseDown={e => e.stopPropagation()}>
            <div className="yaml-preview-header">
              <div className="yaml-preview-title-row">
                <h3 className="yaml-preview-title">YAML Preview</h3>
                {yamlIssues.length === 0
                  ? <span className="yaml-valid-badge">✓ Valid YAML</span>
                  : <span className="yaml-invalid-badge">⚠ {yamlIssues.length} issue{yamlIssues.length > 1 ? 's' : ''} found</span>
                }
              </div>
              {yamlIssues.length > 0 && (
                <ul className="yaml-issues-list">
                  {yamlIssues.map((iss, i) => (
                    <li key={i}>Line {iss.lineNum}: <code>{iss.text}</code></li>
                  ))}
                </ul>
              )}
            </div>
            <pre className="yaml-preview-content">{getYaml()}</pre>
            <div className="yaml-preview-actions">
              <button className="btn-yaml-copy" onClick={handleCopyYaml}>
                {yamlCopied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button className="btn-yaml-close" onClick={() => setShowYamlPreview(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showParseText && (
        <div className="parse-text-overlay" onMouseDown={() => { setShowParseText(false); setParseTextVal('') }}>
          <div className="parse-text-dialog" onMouseDown={e => e.stopPropagation()}>
            <h3 className="parse-text-title">Parse Names</h3>
            <p className="parse-text-desc">Enter one or more comma-separated values to strip from <strong>name</strong>. The rest of each value is kept.</p>
            <input
              className="parse-text-input"
              autoFocus
              placeholder="e.g. -na, -prod, func-, orders-api"
              value={parseTextVal}
              onChange={e => setParseTextVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setShowParseText(false); setParseTextVal('') } }}
            />
            {parseTextTerms.length > 0 && (
              <p className="parse-text-count">
                {parseTextMatchCount === 0
                  ? 'No matches found'
                  : `${parseTextMatchCount} name ${parseTextMatchCount === 1 ? 'value' : 'values'} will be updated`}
              </p>
            )}
            <div className="parse-text-actions">
              <button
                className="btn-parse-remove"
                onClick={applyParseTextRemove}
                disabled={parseTextMatchCount === 0}
              >Remove</button>
              <button
                className="btn-parse-cancel"
                onClick={() => { setShowParseText(false); setParseTextVal('') }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div className="table-header">
        <h2 className="table-heading">
          Preview
          <span className="required-legend">(*) Required Fields</span>
          <span className="row-count">
            {filterActive
              ? `${displayRows.length} of ${rows.length} rows`
              : `${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`}
          </span>
        </h2>
        <div className="table-header-actions">
          <button className="btn-yaml-preview" onClick={openYamlPreview}>
            Preview YAML
          </button>
          <button className="btn-parse-text" onClick={() => { setParseTextVal(''); setShowParseText(true) }}>
            Parse Names
          </button>
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
              <th className="col-rownum">
                {selectedRows.size > 0 && (
                  <button
                    className="btn-deselect-rows"
                    title={`Clear ${selectedRows.size} selected row${selectedRows.size > 1 ? 's' : ''}`}
                    onMouseDown={e => { e.preventDefault(); setSelectedRows(new Set()); setLastClickedIdx(null) }}
                  >⊠</button>
                )}
              </th>
              {COLUMNS.map(col => {
                const isMenuCol = MENU_COLS.has(col)
                const menuOpen = colMenu === col
                const uniqueColVals = isMenuCol
                  ? [...new Set(rows.map(r => r[col]).filter(Boolean))].sort()
                  : []
                const isServiceType = col === 'type'
                return (
                  <th key={col}>
                    {REQUIRED.has(col) && <span className="required-star">*</span>}
                    {TOOLTIPS[col] ? (
                      <span className="th-tooltip" data-tooltip={TOOLTIPS[col]}>{DISPLAY_LABELS[col] ?? col}</span>
                    ) : (DISPLAY_LABELS[col] ?? col)}
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
                              <button
                                className={menuMode === 'clearall' ? 'active' : ''}
                                onClick={() => setMenuMode('clearall')}
                              >Clear all</button>
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
                            ) : menuMode === 'findreplace' ? (
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
                            ) : (
                              <div className="col-popover-body">
                                <p className="col-popover-clear-desc">
                                  Remove the value from all {rows.length} rows in this column.
                                </p>
                                <button className="col-popover-apply col-popover-apply-danger" onClick={applyClearAll}>
                                  Clear all rows
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </span>
                    )}
                    {isServiceType && (
                      <span className="col-filter-wrap" ref={showServiceFilter ? serviceFilterRef : null}>
                        <button
                          className={`col-filter-btn ${filterActive ? 'active' : ''}`}
                          onClick={() => setShowServiceFilter(v => !v)}
                          title="Filter by service type"
                        >⊟</button>
                        {showServiceFilter && (
                          <div className="col-filter-popover">
                            <div className="col-filter-header">
                              <span>Filter by type</span>
                              {filterActive && (
                                <button className="col-filter-clear" onClick={() => setServiceTypeFilter(new Set())}>
                                  Clear
                                </button>
                              )}
                            </div>
                            <div className="col-filter-list">
                              {allServiceTypes.map(st => (
                                <label key={st} className="col-filter-item">
                                  <input
                                    type="checkbox"
                                    checked={serviceTypeFilter.has(st)}
                                    onChange={() => toggleServiceType(st)}
                                  />
                                  <span>{st}</span>
                                </label>
                              ))}
                            </div>
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
            {displayRows.map(({ row, idx }, dispIdx) => (
              <tr
                key={idx}
                data-disp-idx={dispIdx}
                className={[selectedRows.has(idx) ? 'row-selected' : '', fillRange.has(dispIdx) ? 'fill-target' : ''].filter(Boolean).join(' ')}
              >
                <td className="col-rownum" onMouseDown={e => handleRowNumClick(idx, e)}>
                  <span className="row-num">{idx + 1}</span>
                </td>
                {COLUMNS.map(col => {
                  const isEditing = editingCell?.row === idx && editingCell?.col === col
                  return (
                    <td
                      key={col}
                      className={`editable-cell ${isEditing ? 'editing' : ''}`}
                      onClick={() => !isEditing && startEdit(idx, col)}
                    >
                      {isEditing ? (
                        <>
                          <textarea
                            autoFocus
                            className="cell-input"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(null)}
                            onKeyDown={onKeyDown}
                            rows={col === 'comments' ? 3 : 1}
                          />
                          {suggestions.length > 0 && (
                            <ul className="cell-suggestions">
                              {suggestions.map((s, i) => (
                                <li
                                  key={s}
                                  className={`cell-suggestion-item ${i === suggestionIdx ? 'active' : ''}`}
                                  onMouseDown={e => { e.preventDefault(); acceptSuggestion(s) }}
                                >{s}</li>
                              ))}
                            </ul>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="cell-text">
                            {col === 'comments' ? getCommentDisplayText(row) : (row[col] ?? '')}
                          </span>
                          {col === 'comments' && (
                            <>
                              <button
                                className="btn-json-comment"
                                title="Edit comment and parent links"
                                onClick={e => { e.stopPropagation(); setJsonPopupRow(idx) }}
                              >✎</button>
                              <div
                                className="fill-handle"
                                title="Drag to fill down"
                                onMouseDown={e => startFillDrag(e, dispIdx)}
                              />
                            </>
                          )}
                        </>
                      )}
                    </td>
                  )
                })}
                <td className="col-actions">
                  <button
                    className="btn-delete-row"
                    title="Delete row"
                    tabIndex={-1}
                    onClick={() => deleteRow(idx)}
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
