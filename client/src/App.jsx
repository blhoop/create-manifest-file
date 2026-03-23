import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload.jsx'
import PreviewTable from './components/PreviewTable.jsx'
import { buildYamlContent } from './utils/buildYaml.js'
import './App.css'

const STORAGE_KEY = 'manifest_session_v2'

function loadSession() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch { return null }
}

function saveSession(rows, fileName, sheets, activeSheetIdx, auditLog, subscription) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows, fileName, sheets, activeSheetIdx, auditLog, subscription }))
  } catch {}
}

export default function App() {
  const session = loadSession()
  const defaultSubscription = {
    spoke_name: '', owner: '', product: '', environment: '', default_location: '',
    tags: { owner: '[TBD]', cost_center: '[TBD]', project: 'my-project', data_classification: 'internal', CostType: '', CostRegion: '' },
    infra_repo: '', sku_mode: '', management_group_id: '', vnet_cidr: '',
    new_subscription: 'true', subscription_id: '', description: '',
  }
  const [rows, setRows] = useState(session?.rows ?? null)
  const [fileName, setFileName] = useState(session?.fileName ?? '')
  const [sheets, setSheets] = useState(session?.sheets ?? null)
  const [activeSheetIdx, setActiveSheetIdx] = useState(session?.activeSheetIdx ?? 0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [auditLog, setAuditLog] = useState(session?.auditLog ?? [])
  const [showAuditDialog, setShowAuditDialog] = useState(false)
  const [showTagsPopup, setShowTagsPopup] = useState(false)
  const [subscription, setSubscription] = useState(() => {
    const saved = session?.subscription ?? {}
    return { ...defaultSubscription, ...saved, tags: { ...defaultSubscription.tags, ...(saved.tags ?? {}) } }
  })

  const sortByType = (data) =>
    [...data].sort((a, b) => (a.type ?? '').localeCompare(b.type ?? ''))

  useEffect(() => {
    if (rows) saveSession(rows, fileName, sheets, activeSheetIdx, auditLog, subscription)
  }, [rows, fileName, sheets, activeSheetIdx, auditLog, subscription])

  // Auto-derive infra_repo from spoke_name unless the user has manually overridden it
  useEffect(() => {
    setSubscription(s => {
      const prevAuto = s._prev_spoke_name ? `${s._prev_spoke_name}-infra` : ''
      if (!s.infra_repo || s.infra_repo === prevAuto) {
        return { ...s, infra_repo: s.spoke_name ? `${s.spoke_name}-infra` : '', _prev_spoke_name: s.spoke_name }
      }
      return { ...s, _prev_spoke_name: s.spoke_name }
    })
  }, [subscription.spoke_name])

  const addAudit = (entry) => {
    setAuditLog(prev => [...prev, { ...entry, timestamp: new Date().toISOString() }])
  }

  const handleParsed = (data, name, incomingSheets, incomingSubscription) => {
    const baseName = name.replace(/\.[^.]+$/, '')
    if (incomingSheets?.length > 1) {
      setSheets(incomingSheets)
      setActiveSheetIdx(0)
      setRows(sortByType(incomingSheets[0].rows))
    } else {
      setSheets(null)
      setActiveSheetIdx(0)
      setRows(sortByType(data))
    }
    setFileName(baseName)
    setError('')
    setSubscription(incomingSubscription
      ? { ...defaultSubscription, ...incomingSubscription }
      : defaultSubscription
    )
  }

  const handleSheetSelect = (idx) => {
    setActiveSheetIdx(idx)
    setRows(sortByType(sheets[idx].rows))
    addAudit({ type: 'SHEET_SWITCH', sheetName: sheets[idx].name })
  }

  const handleError = (msg) => {
    setError(msg)
    setRows(null)
    setSheets(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const handleDetach = () => {
    setRows(null)
    setFileName('')
    setSheets(null)
    setActiveSheetIdx(0)
    setError('')
    setAuditLog([])
    setSubscription(defaultSubscription)
    localStorage.removeItem(STORAGE_KEY)
  }

  const getYaml = () => buildYamlContent(rows, subscription)

  const formatAuditLog = () => {
    const started = auditLog[0]?.timestamp
      ? new Date(auditLog[0].timestamp).toLocaleString()
      : new Date().toLocaleString()

    const lines = [
      '=== Manifest File Creator — Session Audit ===',
      `File: ${(fileName.trim() || 'manifest')}.yml`,
      `Session started: ${started}`,
      '',
    ]

    auditLog.forEach(e => {
      const time = new Date(e.timestamp).toLocaleTimeString()
      switch (e.type) {
        case 'CELL_EDIT':
          lines.push(`[${time}] CELL EDIT — Row ${e.row + 1}, ${e.col}: "${e.oldVal}" → "${e.newVal}"`)
          break
        case 'ROW_DELETED':
          lines.push(`[${time}] ROW DELETED — Row ${e.rowNum + 1}: name="${e.rowData.name}", type="${e.rowData.type}", location="${e.rowData.location}"`)
          break
        case 'ROW_ADDED':
          lines.push(`[${time}] ROW ADDED — Empty row appended`)
          break
        case 'PARSE_SPOKE_NAMES':
          lines.push(`[${time}] PARSE SPOKE NAMES — stripped "${e.terms.join('", "')}" from ${e.changes.length} name ${e.changes.length === 1 ? 'value' : 'values'}`)
          e.changes.forEach(c => lines.push(`  ${c.before} → ${c.after}`))
          break
        case 'SET_ALL':
          lines.push(`[${time}] SET ALL — ${e.col} set to "${e.value}" (${e.count} rows)`)
          break
        case 'FIND_REPLACE':
          lines.push(`[${time}] FIND & REPLACE — ${e.col}: "${e.find}" → "${e.replace}" (${e.count} rows)`)
          break
        case 'SHEET_SWITCH':
          lines.push(`[${time}] SHEET SWITCH — switched to "${e.sheetName}"`)
          break
        default:
          break
      }
    })

    lines.push('')
    lines.push(`=== Session closed: ${rows?.length ?? 0} rows exported ===`)
    return lines.join('\n')
  }

  const saveFiles = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker()
      const baseName = fileName.trim() || 'manifest'

      // Write YAML
      const yamlHandle = await dirHandle.getFileHandle(baseName + '.yml', { create: true })
      const yamlWritable = await yamlHandle.createWritable()
      await yamlWritable.write(getYaml())
      await yamlWritable.close()

      // Write audit
      const auditHandle = await dirHandle.getFileHandle(baseName + '-session-audit.txt', { create: true })
      const auditWritable = await auditHandle.createWritable()
      await auditWritable.write(formatAuditLog())
      await auditWritable.close()

      setShowAuditDialog(false)
    } catch (err) {
      if (err.name === 'AbortError') return
      // Fallback: download both via anchor
      const baseName = fileName.trim() || 'manifest'
      const yamlBlob = new Blob([getYaml()], { type: 'application/yaml' })
      const yamlUrl = URL.createObjectURL(yamlBlob)
      const a1 = document.createElement('a')
      a1.href = yamlUrl; a1.download = baseName + '.yml'; a1.click()
      URL.revokeObjectURL(yamlUrl)

      const auditBlob = new Blob([formatAuditLog()], { type: 'text/plain' })
      const auditUrl = URL.createObjectURL(auditBlob)
      const a2 = document.createElement('a')
      a2.href = auditUrl; a2.download = baseName + '-session-audit.txt'; a2.click()
      URL.revokeObjectURL(auditUrl)

      setShowAuditDialog(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Manifest File Creator</h1>
        <p>Upload a spreadsheet, architecture diagram, or existing yaml to generate a YAML manifest</p>
      </header>

      <main className="app-main">
        {!rows && !loading && (
          <FileUpload
            onParsed={handleParsed}
            onError={handleError}
            setLoading={setLoading}
            loading={loading}
          />
        )}

        {error && <div className="error-banner">{error}</div>}

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <span>Analyzing file…</span>
          </div>
        )}

        {rows && !loading && (
          <>
            {sheets?.length > 1 && (
              <div className="sheet-tabs">
                {sheets.map((s, i) => (
                  <button
                    key={i}
                    className={`sheet-tab ${i === activeSheetIdx ? 'active' : ''}`}
                    onClick={() => handleSheetSelect(i)}
                  >{s.name}</button>
                ))}
              </div>
            )}
            <div className="subscription-panel">
              <div className="subscription-panel-header">
                <span className="subscription-panel-title">Spoke</span>
                <span className="subscription-panel-hint">Required fields define the spoke identity</span>
              </div>
              <div className="subscription-fields">

                {/* Row 1 — Identity + Tags */}
                <div className="sub-field-group required-group">
                  <div className="sub-field">
                    <label>spoke_name <span className="sub-required">*</span></label>
                    <input type="text" value={subscription.spoke_name}
                      onChange={e => setSubscription(s => ({ ...s, spoke_name: e.target.value }))}
                      placeholder="e.g. order-book-001" />
                  </div>
                  <div className="sub-field sub-field--sm">
                    <label>product <span className="sub-required">*</span></label>
                    <input type="text" value={subscription.product}
                      onChange={e => setSubscription(s => ({ ...s, product: e.target.value }))}
                      placeholder="e.g. ob" />
                  </div>
                  <div className="sub-field sub-field--sm">
                    <label>environment <span className="sub-required">*</span></label>
                    <select value={subscription.environment}
                      onChange={e => setSubscription(s => ({ ...s, environment: e.target.value }))}>
                      <option value="">— select —</option>
                      {['dev','test','uat','preprod','prod','lab'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="sub-field sub-field--sm">
                    <label>location <span className="sub-required">*</span></label>
                    <select value={subscription.default_location}
                      onChange={e => setSubscription(s => ({ ...s, default_location: e.target.value }))}>
                      <option value="">— select —</option>
                      {['australiaeast','eastasia','eastus','eastus2','northcentralus','southeastasia','uksouth','westus3','westeurope','canadacentral','centralus','westus2'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="sub-field sub-field--tags-btn">
                    <label>Tags <span className="sub-required">*</span></label>
                    <button className="tags-popup-btn" onClick={() => setShowTagsPopup(true)}>
                      {Object.values(subscription.tags ?? {}).some(v => v && v !== '[TBD]')
                        ? 'Edit Tags ✓'
                        : 'Set Tags…'}
                    </button>
                  </div>
                </div>

                {/* Row 2 — Infrastructure */}
                <div className="sub-field-group optional-group">
                  <div className="sub-field sub-field--narrow">
                    <label>infra_repo</label>
                    <input type="text" value={subscription.infra_repo}
                      onChange={e => setSubscription(s => ({ ...s, infra_repo: e.target.value }))}
                      placeholder="e.g. my-spoke-001-infra" />
                  </div>
                  <div className="sub-field sub-field--narrow">
                    <label>sku_mode</label>
                    <select value={subscription.sku_mode}
                      onChange={e => setSubscription(s => ({ ...s, sku_mode: e.target.value }))}>
                      <option value="">— select —</option>
                      {['premium','standard'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="sub-field sub-field--narrow">
                    <label>vnet_cidr</label>
                    <input type="text" value={subscription.vnet_cidr}
                      onChange={e => setSubscription(s => ({ ...s, vnet_cidr: e.target.value }))}
                      placeholder="e.g. 10.3.0.0/24" />
                  </div>
                  <div className="sub-field sub-field--narrow">
                    <label>management_group_id</label>
                    <input type="text" value={subscription.management_group_id}
                      onChange={e => setSubscription(s => ({ ...s, management_group_id: e.target.value }))}
                      placeholder="e.g. converge" />
                  </div>
                  <div className="sub-field sub-field--narrow">
                    <label>new_subscription</label>
                    <select value={subscription.new_subscription}
                      onChange={e => setSubscription(s => ({ ...s, new_subscription: e.target.value }))}>
                      {['true','false'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  {subscription.new_subscription === 'false' && (
                    <div className="sub-field sub-field--narrow">
                      <label>subscription_id</label>
                      <input type="text" value={subscription.subscription_id}
                        onChange={e => setSubscription(s => ({ ...s, subscription_id: e.target.value }))}
                        placeholder="UUID" />
                    </div>
                  )}
                  <div className="sub-field">
                    <label>description</label>
                    <input type="text" value={subscription.description}
                      onChange={e => setSubscription(s => ({ ...s, description: e.target.value }))}
                      placeholder="Short description of the workload" />
                  </div>
                </div>

              </div>
            </div>
            <PreviewTable rows={rows} onRowsChange={r => setRows(sortByType(r))} onDetach={handleDetach} onAudit={addAudit} getYaml={getYaml} />
            <div className="download-bar">
              <span>{rows.length} row{rows.length !== 1 ? 's' : ''} found</span>
              <div className="download-controls">
                <div className="filename-input-wrapper">
                  <input
                    className="filename-input"
                    type="text"
                    value={fileName}
                    onChange={e => { setFileName(e.target.value); saveSession(rows, e.target.value, sheets, activeSheetIdx, auditLog, subscription) }}
                    placeholder="filename"
                    spellCheck={false}
                  />
                  <span className="filename-ext">.yml</span>
                </div>
                <button className="btn-download" onClick={() => setShowAuditDialog(true)}>
                  Download YAML
                </button>
              </div>
            </div>
          </>
        )}

        {showTagsPopup && (
          <div className="audit-overlay" onMouseDown={() => setShowTagsPopup(false)}>
            <div className="tags-popup" onMouseDown={e => e.stopPropagation()}>
              <div className="tags-popup-header">
                <span className="tags-popup-title">Spoke Tags <span className="sub-required">*</span></span>
                <span className="tags-popup-hint">Applied to all resources via the tags module</span>
              </div>
              <div className="tags-popup-body">
                {[
                  { key: 'owner',              label: 'owner',              required: false, placeholder: 'e.g. Platform Engineering' },
                  { key: 'cost_center',        label: 'cost_center',        required: false, placeholder: 'e.g. CC-1234' },
                  { key: 'project',            label: 'project',            required: false, placeholder: 'e.g. my-project' },
                  { key: 'data_classification',label: 'data_classification',required: false, options: ['internal','confidential','public','restricted'] },
                  { key: 'CostType',           label: 'CostType',           required: true,  options: ['opex','capex'] },
                  { key: 'CostRegion',         label: 'CostRegion',         required: true,  options: ['anz','asia','europe','group','usa'] },
                ].map(({ key, label, required, options, placeholder }) => (
                  <div key={key} className="tags-popup-field">
                    <label>{label}{required && <span className="sub-required"> *</span>}</label>
                    {options ? (
                      <select
                        value={subscription.tags?.[key] ?? ''}
                        onChange={e => setSubscription(s => ({ ...s, tags: { ...s.tags, [key]: e.target.value } }))}
                      >
                        <option value="">— select —</option>
                        {options.map(o => o.startsWith('—')
                          ? <option key={o} disabled>{o}</option>
                          : <option key={o} value={o}>{o}</option>
                        )}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={subscription.tags?.[key] ?? ''}
                        placeholder={placeholder}
                        onChange={e => setSubscription(s => ({ ...s, tags: { ...s.tags, [key]: e.target.value } }))}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="tags-popup-footer">
                <button className="btn-tags-done" onClick={() => setShowTagsPopup(false)}>Done</button>
              </div>
            </div>
          </div>
        )}

        {showAuditDialog && (
          <div className="audit-overlay" onMouseDown={() => setShowAuditDialog(false)}>
            <div className="audit-dialog" onMouseDown={e => e.stopPropagation()}>
              <div className="audit-dialog-header">
                <h3 className="audit-dialog-title">Audit Trail</h3>
                <p className="audit-dialog-note">Copy and paste contents or save .txt file to a directory.</p>
              </div>
              <textarea
                className="audit-textarea"
                readOnly
                value={formatAuditLog()}
                onFocus={e => e.target.select()}
              />
              <div className="audit-dialog-actions">
                <button
                  className="btn-audit-copy"
                  onClick={() => navigator.clipboard.writeText(formatAuditLog())}
                >Copy to Clipboard</button>
                <button className="btn-audit-save" onClick={saveFiles}>Save Files</button>
                <button className="btn-audit-close" onClick={() => setShowAuditDialog(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
