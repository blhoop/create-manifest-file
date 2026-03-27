import { useState, useMemo } from 'react'
import { getCommentFields } from '../config/resourceCommentFields'
import { extractJsonComment } from '../utils/extractJsonComment'
import './ResourceCommentPopup.css'

const normalizeType = t => t?.toLowerCase().replace(/[\s_/]+/g, '') ?? ''

function MiMultiSelect({ value, miNames, onChange }) {
  const selected = (value ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const available = miNames.filter(mi => !selected.includes(mi))
  const add = (mi) => { if (mi) onChange([...selected, mi].join(', ')) }
  const remove = (mi) => onChange(selected.filter(s => s !== mi).join(', '))
  return (
    <div className="rcp-mi-multiselect">
      <select className="rcp-select" value="" onChange={e => add(e.target.value)}>
        <option value="">{miNames.length === 0 ? '— no managed identities in sheet —' : '— add identity —'}</option>
        {available.map(mi => <option key={mi} value={mi}>{mi}</option>)}
      </select>
      {selected.length > 0 && (
        <div className="rcp-mi-tags">
          {selected.map(mi => (
            <span key={mi} className="rcp-mi-tag">
              {mi}
              <button className="rcp-mi-tag-remove" onClick={() => remove(mi)} title="Remove">✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Types that get an NSG Rules tab
const NSG_TYPES = new Set(['web_app', 'app_service', 'app_service_plan', 'function_app'])
// Types that get a Consumers tab
const CONSUMER_TYPES = new Set(['key_vault'])

/** Parse a `key:value, key:value` comment string back into field values + leftover notes. */
function parseComment(comment) {
  const values = {}
  const noteParts = []
  if (!comment) return { values, notes: '' }
  comment.split(', ').forEach(part => {
    const colonIdx = part.indexOf(':')
    if (colonIdx > 0) {
      values[part.slice(0, colonIdx).trim()] = part.slice(colonIdx + 1).trim()
    } else if (part.trim()) {
      noteParts.push(part.trim())
    }
  })
  return { values, notes: noteParts.join(', ') }
}

/** Build a comment string from field values + optional notes. Skips empty values. */
function buildComment(fields, values, notes) {
  const parts = fields
    .filter(f => values[f.key]?.trim())
    .map(f => `${f.key}:${values[f.key].trim()}`)
  if (notes?.trim()) parts.push(notes.trim())
  return parts.join(', ')
}

const DEFAULT_RULE = {
  name: '',
  priority: 100,
  direction: 'Inbound',
  access: 'Allow',
  protocol: '*',
  source_address_prefix: 'VirtualNetwork',
  destination_port_range: '*',
  description: '',
}

function NsgRulesTab({ rules, onChange }) {
  const setRule = (i, field, val) => {
    const updated = rules.map((r, idx) => idx === i ? { ...r, [field]: val } : r)
    onChange(updated)
  }
  const addRule = () => onChange([...rules, { ...DEFAULT_RULE, priority: 100 + rules.length * 100 }])
  const removeRule = (i) => onChange(rules.filter((_, idx) => idx !== i))

  return (
    <div className="rcp-nsg-tab">
      {rules.length === 0 && (
        <p className="rcp-nsg-empty">No rules defined — default deny-all-inbound applies.</p>
      )}
      {rules.map((rule, i) => (
        <div key={i} className="rcp-nsg-rule">
          <div className="rcp-nsg-rule-header">
            <span className="rcp-nsg-rule-num">Rule {i + 1}</span>
            <button className="btn-rcp-remove-rule" onClick={() => removeRule(i)} title="Remove rule">✕</button>
          </div>
          <div className="rcp-nsg-grid">
            <div className="rcp-nsg-field rcp-nsg-full">
              <label>Name</label>
              <input className="rcp-input" value={rule.name}
                placeholder="e.g. allow-vnet-inbound"
                onChange={e => setRule(i, 'name', e.target.value)} />
            </div>
            <div className="rcp-nsg-field">
              <label>Priority</label>
              <input className="rcp-input" type="number" min={100} max={4096} value={rule.priority}
                onChange={e => setRule(i, 'priority', Number(e.target.value))} />
            </div>
            <div className="rcp-nsg-field">
              <label>Direction</label>
              <select className="rcp-select" value={rule.direction}
                onChange={e => setRule(i, 'direction', e.target.value)}>
                {['Inbound', 'Outbound'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="rcp-nsg-field">
              <label>Access</label>
              <select className="rcp-select" value={rule.access}
                onChange={e => setRule(i, 'access', e.target.value)}>
                {['Allow', 'Deny'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="rcp-nsg-field">
              <label>Protocol</label>
              <select className="rcp-select" value={rule.protocol}
                onChange={e => setRule(i, 'protocol', e.target.value)}>
                {['*', 'Tcp', 'Udp', 'Icmp'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="rcp-nsg-field rcp-nsg-full">
              <label>Source</label>
              <input className="rcp-input" value={rule.source_address_prefix}
                placeholder="VirtualNetwork, Internet, CIDR, or *"
                list={`rcp-source-${i}`}
                onChange={e => setRule(i, 'source_address_prefix', e.target.value)} />
              <datalist id={`rcp-source-${i}`}>
                {['VirtualNetwork', 'Internet', 'AzureLoadBalancer', '*'].map(v => <option key={v} value={v} />)}
              </datalist>
            </div>
            <div className="rcp-nsg-field rcp-nsg-full">
              <label>Destination Port</label>
              <input className="rcp-input" value={rule.destination_port_range}
                placeholder="443, 80-443, or *"
                onChange={e => setRule(i, 'destination_port_range', e.target.value)} />
            </div>
            <div className="rcp-nsg-field rcp-nsg-full">
              <label>Description</label>
              <input className="rcp-input" value={rule.description}
                placeholder="optional"
                onChange={e => setRule(i, 'description', e.target.value)} />
            </div>
          </div>
        </div>
      ))}
      <button className="btn-rcp-add-rule" onClick={addRule}>+ Add Rule</button>
    </div>
  )
}

function ConsumersTab({ consumers, onChange }) {
  const setConsumer = (i, val) => onChange(consumers.map((c, idx) => idx === i ? val : c))
  const addConsumer = () => onChange([...consumers, ''])
  const removeConsumer = (i) => onChange(consumers.filter((_, idx) => idx !== i))

  return (
    <div className="rcp-consumers-tab">
      <p className="rcp-consumers-hint">
        Resource IDs or references that receive RBAC role assignments on this Key Vault.
      </p>
      {consumers.map((c, i) => (
        <div key={i} className="rcp-consumer-row">
          <input className="rcp-input" value={c}
            placeholder="e.g. $ref:mi_functions.principal_id"
            onChange={e => setConsumer(i, e.target.value)} />
          <button className="btn-rcp-remove-rule" onClick={() => removeConsumer(i)} title="Remove">✕</button>
        </div>
      ))}
      <button className="btn-rcp-add-rule" onClick={addConsumer}>+ Add Consumer</button>
    </div>
  )
}

export default function ResourceCommentPopup({ row, currentComment, currentNsgRules, currentConsumers, aspNames = [], miNames = [], onClose, onCommit }) {
  const typeConfig = getCommentFields(row?.type)
  const hasFields = !!typeConfig
  const showNsgTab = NSG_TYPES.has(row?.type)
  const showConsumersTab = CONSUMER_TYPES.has(row?.type)
  const hasTabs = hasFields && (showNsgTab || showConsumersTab)

  const [activeTab, setActiveTab] = useState('properties')

  const { values: initialValues, notes: initialNotes } = useMemo(
    () => parseComment(currentComment),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const [fieldValues, setFieldValues] = useState(() => {
    const defaults = {}
    if (typeConfig) {
      for (const f of typeConfig.fields) {
        if (f.default !== undefined && !(f.key in initialValues)) defaults[f.key] = f.default
      }
    }
    return { ...defaults, ...initialValues }
  })
  const [notes, setNotes] = useState(initialNotes)
  const [freeText, setFreeText] = useState(currentComment ?? '')
  const [extractMsg, setExtractMsg] = useState(null)
  const [nsgRules, setNsgRules] = useState(currentNsgRules ?? [])
  const [consumers, setConsumers] = useState(currentConsumers ?? [])

  const preview = hasFields
    ? buildComment(typeConfig.fields, fieldValues, notes)
    : freeText.trim()

  const hasChanges =
    preview !== (currentComment ?? '').trim() ||
    JSON.stringify(nsgRules) !== JSON.stringify(currentNsgRules ?? []) ||
    JSON.stringify(consumers) !== JSON.stringify(currentConsumers ?? [])

  const setField = (key, val) => setFieldValues(prev => ({ ...prev, [key]: val }))

  const handleExtract = () => {
    const result = extractJsonComment(freeText.trim())
    if (!result) {
      setExtractMsg({ type: 'warn', text: 'No useful fields found.' })
      return
    }
    setFreeText(result)
    setExtractMsg({ type: 'success', text: 'Extracted from JSON.' })
  }

  const handleDone = () => {
    onCommit({ comment: preview, nsgRules, consumers })
    onClose()
  }

  const looksLikeJson = freeText.trim().startsWith('{')

  const TABS = [
    { key: 'properties', label: 'Properties' },
    ...(showNsgTab ? [{ key: 'nsg', label: 'NSG Rules' }] : []),
    ...(showConsumersTab ? [{ key: 'consumers', label: 'Consumers' }] : []),
  ]

  return (
    <div className="rcp-overlay" onMouseDown={onClose}>
      <div className="rcp-dialog" onMouseDown={e => e.stopPropagation()}>

        <div className="rcp-header">
          <h3 className="rcp-title">
            {hasFields ? typeConfig.label : (row?.type || 'Comment')}
          </h3>
          {hasTabs ? (
            <div className="rcp-tabs">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`rcp-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {tab.key === 'nsg' && nsgRules.length > 0 && (
                    <span className="rcp-tab-badge">{nsgRules.length}</span>
                  )}
                  {tab.key === 'consumers' && consumers.length > 0 && (
                    <span className="rcp-tab-badge">{consumers.length}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="rcp-desc">
              {hasFields
                ? 'Select values to build a structured comment.'
                : 'Type a free-form comment for this resource.'}
            </p>
          )}
        </div>

        <div className="rcp-body">

          {activeTab === 'properties' && (
            <>
              {hasFields ? (
                <div className="rcp-fields">
                  {typeConfig.fields.map((f, i) => (
                    <div key={f.key} className="rcp-field-row">
                      <label className="rcp-field-label">{f.label}{f.required && <span className="rcp-required"> *</span>}</label>
                      {f.type === 'plan_select' ? (
                        <div className="rcp-plan-select">
                          <input
                            type="checkbox"
                            id={`rcp-plan-cb-${f.key}`}
                            className="rcp-plan-checkbox"
                            checked={!!(fieldValues[f.key])}
                            onChange={e => setField(f.key, e.target.checked ? (aspNames[0] ?? '') : '')}
                          />
                          <select
                            className="rcp-select rcp-plan-dropdown"
                            disabled={!fieldValues[f.key]}
                            value={fieldValues[f.key] ?? ''}
                            onChange={e => setField(f.key, e.target.value)}
                          >
                            {aspNames.length === 0
                              ? <option value="">— no plans in sheet —</option>
                              : aspNames.map(n => <option key={n} value={n}>{n}</option>)
                            }
                          </select>
                        </div>
                      ) : f.type === 'mi_multiselect' ? (
                        <MiMultiSelect
                          value={fieldValues[f.key] ?? ''}
                          miNames={miNames}
                          onChange={val => setField(f.key, val)}
                        />

                      ) : f.type === 'select' ? (
                        <select
                          className="rcp-select"
                          autoFocus={i === 0}
                          value={fieldValues[f.key] ?? ''}
                          onChange={e => setField(f.key, e.target.value)}
                        >
                          <option value="">—</option>
                          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          className="rcp-input"
                          type="text"
                          autoFocus={i === 0}
                          placeholder={f.placeholder ?? ''}
                          value={fieldValues[f.key] ?? ''}
                          onChange={e => setField(f.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                  <div className="rcp-field-row rcp-notes-row">
                    <label className="rcp-field-label">Notes</label>
                    <input
                      className="rcp-input"
                      type="text"
                      placeholder="any additional notes"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="rcp-fallback">
                  <textarea
                    className="rcp-textarea"
                    autoFocus
                    placeholder="Type a comment, or paste Azure portal JSON..."
                    value={freeText}
                    onChange={e => { setFreeText(e.target.value); setExtractMsg(null) }}
                    onKeyDown={e => e.key === 'Escape' && onClose()}
                    rows={6}
                    spellCheck={false}
                  />
                  {looksLikeJson && (
                    <button className="btn-rcp-extract" onClick={handleExtract}>
                      Extract from JSON
                    </button>
                  )}
                  {extractMsg && (
                    <p className={`rcp-msg rcp-msg-${extractMsg.type}`}>{extractMsg.text}</p>
                  )}
                </div>
              )}

              {preview && (
                <div className="rcp-preview">
                  <span className="rcp-preview-label">Comment</span>
                  <span className="rcp-preview-value">{preview}</span>
                </div>
              )}
            </>
          )}

          {activeTab === 'nsg' && (
            <NsgRulesTab rules={nsgRules} onChange={setNsgRules} />
          )}

          {activeTab === 'consumers' && (
            <ConsumersTab consumers={consumers} onChange={setConsumers} />
          )}

        </div>

        <div className="rcp-footer">
          <button className="btn-rcp-cancel" onClick={onClose}>Cancel</button>
          <button
            className={`btn-rcp-done ${hasChanges ? 'has-changes' : ''}`}
            onClick={handleDone}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  )
}
