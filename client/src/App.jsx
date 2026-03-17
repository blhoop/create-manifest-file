import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload.jsx'
import PreviewTable from './components/PreviewTable.jsx'
import './App.css'

const STORAGE_KEY = 'manifest_session'

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
  const defaultSubscription = { subscription_name: '', environment: '', default_location: '', product_code: '', vnet_cidr: '', subscription_id: '', spn_client_id: '' }
  const [rows, setRows] = useState(session?.rows ?? null)
  const [fileName, setFileName] = useState(session?.fileName ?? '')
  const [sheets, setSheets] = useState(session?.sheets ?? null)
  const [activeSheetIdx, setActiveSheetIdx] = useState(session?.activeSheetIdx ?? 0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [auditLog, setAuditLog] = useState(session?.auditLog ?? [])
  const [showAuditDialog, setShowAuditDialog] = useState(false)
  const [subscription, setSubscription] = useState(session?.subscription ?? defaultSubscription)

  const sortByType = (data) =>
    [...data].sort((a, b) => (a.type ?? '').localeCompare(b.type ?? ''))

  useEffect(() => {
    if (rows) saveSession(rows, fileName, sheets, activeSheetIdx, auditLog, subscription)
  }, [rows, fileName, sheets, activeSheetIdx, auditLog, subscription])

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

  // Quote a YAML scalar value if it contains characters that would produce invalid YAML
  const yamlScalar = (val) => {
    if (!val) return ''
    const s = String(val)
    // Needs quoting if: contains colon, hash, YAML structural chars, or leading special chars
    if (/[:#\{\}\[\]\n]/.test(s) || /^[-?!|>%@`&*]/.test(s.trim())) {
      return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    }
    return s
  }

  const buildYamlContent = () => {
    const lines = []
    const sub = subscription

    lines.push('# ---------------------------------------------------------------------------')
    lines.push('# REQUIRED — Subscription identity')
    lines.push('# ---------------------------------------------------------------------------')
    if (sub.subscription_name) lines.push(`subscription_name: ${yamlScalar(sub.subscription_name)}`)
    if (sub.environment) lines.push(`environment: ${yamlScalar(sub.environment)}`)
    if (sub.default_location) lines.push(`default_location: ${yamlScalar(sub.default_location)}`)

    const optionalSubFields = ['product_code', 'vnet_cidr', 'subscription_id', 'spn_client_id']
    const hasOptional = optionalSubFields.some(k => sub[k])
    if (hasOptional) {
      lines.push('')
      lines.push('# ---------------------------------------------------------------------------')
      lines.push('# OPTIONAL — Overrides and existing infrastructure')
      lines.push('# ---------------------------------------------------------------------------')
      optionalSubFields.forEach(k => { if (sub[k]) lines.push(`${k}: ${yamlScalar(sub[k])}`) })
    }

    lines.push('')
    lines.push('# ---------------------------------------------------------------------------')
    lines.push('# RESOURCES')
    lines.push('# ---------------------------------------------------------------------------')
    lines.push('resources:')
    rows.forEach(row => {
      lines.push(`  - name: ${yamlScalar(row.name ?? '')}`)
      lines.push(`    type: ${yamlScalar(row.type ?? '')}`)
      if (row.location) lines.push(`    location: ${yamlScalar(row.location)}`)
      if (row.repo) lines.push(`    repo: ${yamlScalar(row.repo)}`)
      if (row.comments) lines.push(`    comments: ${yamlScalar(row.comments)}`)
    })

    return lines.join('\n')
  }

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
      await yamlWritable.write(buildYamlContent())
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
      const yamlBlob = new Blob([buildYamlContent()], { type: 'application/yaml' })
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
        <FileUpload
          onParsed={handleParsed}
          onError={handleError}
          setLoading={setLoading}
          loading={loading}
        />

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
                <span className="subscription-panel-title">Subscription</span>
                <span className="subscription-panel-hint">Required fields define the spoke identity</span>
              </div>
              <div className="subscription-fields">
                <div className="sub-field-group required-group">
                  <div className="sub-field">
                    <label>subscription_name <span className="sub-required">*</span></label>
                    <input
                      type="text"
                      value={subscription.subscription_name}
                      onChange={e => setSubscription(s => ({ ...s, subscription_name: e.target.value }))}
                      placeholder="e.g. Order Book"
                    />
                  </div>
                  <div className="sub-field">
                    <label>environment <span className="sub-required">*</span></label>
                    <select
                      value={subscription.environment}
                      onChange={e => setSubscription(s => ({ ...s, environment: e.target.value }))}
                    >
                      <option value="">— select —</option>
                      {['dev','test','uat','preprod','prod','lab'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="sub-field">
                    <label>default_location <span className="sub-required">*</span></label>
                    <select
                      value={subscription.default_location}
                      onChange={e => setSubscription(s => ({ ...s, default_location: e.target.value }))}
                    >
                      <option value="">— select —</option>
                      {['australiaeast','eastasia','global','eastus','eastus2','westus','westus2','centralus','northeurope','westeurope','uksouth','southeastasia','canadacentral'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="sub-field-group optional-group">
                  <div className="sub-field">
                    <label>product_code</label>
                    <input type="text" value={subscription.product_code} onChange={e => setSubscription(s => ({ ...s, product_code: e.target.value }))} placeholder="e.g. ob" />
                  </div>
                  <div className="sub-field">
                    <label>vnet_cidr</label>
                    <input type="text" value={subscription.vnet_cidr} onChange={e => setSubscription(s => ({ ...s, vnet_cidr: e.target.value }))} placeholder="e.g. 10.3.0.0/22" />
                  </div>
                  <div className="sub-field">
                    <label>subscription_id</label>
                    <input type="text" value={subscription.subscription_id} onChange={e => setSubscription(s => ({ ...s, subscription_id: e.target.value }))} placeholder="UUID" />
                  </div>
                  <div className="sub-field">
                    <label>spn_client_id</label>
                    <input type="text" value={subscription.spn_client_id} onChange={e => setSubscription(s => ({ ...s, spn_client_id: e.target.value }))} placeholder="UUID" />
                  </div>
                </div>
              </div>
            </div>
            <PreviewTable rows={rows} onRowsChange={r => setRows(sortByType(r))} onDetach={handleDetach} onAudit={addAudit} getYaml={buildYamlContent} />
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
