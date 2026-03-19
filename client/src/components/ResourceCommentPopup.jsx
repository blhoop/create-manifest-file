import { useState, useMemo } from 'react'
import { getCommentFields } from '../config/resourceCommentFields'
import { extractJsonComment } from '../utils/extractJsonComment'
import './ResourceCommentPopup.css'

const normalizeType = t => t?.toLowerCase().replace(/[\s_/]+/g, '') ?? ''

// Maps normalized slot types to normalized parent type patterns they can clone from
const CLONE_PARENT_MAP = {
  'appserviceslots': ['appservice', 'webapp'],   // app_service_slots, Web App/Slots
  'webappslots':     ['appservice', 'webapp'],   // Web App/Slots
  'functionappslots': ['functionapp'],            // function_app_slots, Function App/Slots
}

// Maps child resource types to their parent reference config
const PARENT_REFERENCES = {
  'sqldatabase': {
    field: 'server_name',
    parentTypes: ['sqlserver', 'sql'],
    label: 'SQL Server',
  },
  'appserviceslots': {
    field: 'plan_name',
    parentTypes: ['appserviceplan'],
    label: 'App Service Plan',
  },
  'webappslots': {
    field: 'plan_name',
    parentTypes: ['appserviceplan'],
    label: 'App Service Plan',
  },
  'functionappslots': {
    field: 'function_app_name',
    parentTypes: ['functionapp'],
    label: 'Function App',
  },
}

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

export default function ResourceCommentPopup({ row, currentComment, rows, onClose, onCommit }) {
  const typeConfig = getCommentFields(row?.type)
  const hasFields = !!typeConfig

  const { values: initialValues, notes: initialNotes } = useMemo(
    () => parseComment(currentComment),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Structured mode state
  const [fieldValues, setFieldValues] = useState(initialValues)
  const [notes, setNotes] = useState(initialNotes)

  // Fallback (no fields defined) state
  const [freeText, setFreeText] = useState(currentComment ?? '')
  const [extractMsg, setExtractMsg] = useState(null)

  // Clone from parent state
  const parentTypes = CLONE_PARENT_MAP[normalizeType(row?.type)]
  const [cloneEnabled, setCloneEnabled] = useState(false)
  const [selectedCloneParent, setSelectedCloneParent] = useState('')

  const cloneParentRows = useMemo(() => {
    if (!parentTypes || !rows) return []
    return rows.filter(r => r.name && parentTypes.includes(normalizeType(r.type)))
  }, [parentTypes, rows])

  // Parent reference state (for linking to parent resources)
  const parentRefConfig = PARENT_REFERENCES[normalizeType(row?.type)]
  const [parentLinkEnabled, setParentLinkEnabled] = useState(false)
  const [selectedParentLink, setSelectedParentLink] = useState(row?.[parentRefConfig?.field] ?? '')

  const parentLinkRows = useMemo(() => {
    if (!parentRefConfig || !rows) return []
    return rows.filter(r => r.name && r.name !== row?.name && parentRefConfig.parentTypes.includes(normalizeType(r.type)))
  }, [parentRefConfig, rows, row])

  const handleCloneToggle = (checked) => {
    setCloneEnabled(checked)
    if (!checked) setSelectedCloneParent('')
  }

  const handleCloneParentSelect = (parentName) => {
    setSelectedCloneParent(parentName)
    if (!parentName) return
    const parentRow = cloneParentRows.find(r => r.name === parentName)
    if (!parentRow) return
    const { values, notes: parentNotes } = parseComment(parentRow.comments ?? '')
    setFieldValues(values)
    setNotes(parentNotes)
  }

  const handleParentLinkToggle = (checked) => {
    setParentLinkEnabled(checked)
    if (!checked) setSelectedParentLink('')
  }

  const handleParentLinkSelect = (parentName) => {
    setSelectedParentLink(parentName)
  }

  const preview = hasFields
    ? buildComment(typeConfig.fields, fieldValues, notes)
    : freeText.trim()

  const hasChanges = preview !== (currentComment ?? '').trim()

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
    const commitData = {
      comment: preview,
      parentLink: parentLinkEnabled && selectedParentLink ? {
        field: parentRefConfig.field,
        value: selectedParentLink,
      } : null,
    }
    onCommit(commitData)
    onClose()
  }

  const looksLikeJson = freeText.trim().startsWith('{')

  return (
    <div className="rcp-overlay" onMouseDown={onClose}>
      <div className="rcp-dialog" onMouseDown={e => e.stopPropagation()}>

        <div className="rcp-header">
          <h3 className="rcp-title">
            {hasFields ? typeConfig.label : (row?.type || 'Comment')}
          </h3>
          <p className="rcp-desc">
            {hasFields
              ? 'Select values to build a structured comment.'
              : 'Type a free-form comment for this resource.'}
          </p>
        </div>

        <div className="rcp-body">

          {parentRefConfig && (
            <div className="rcp-clone-section">
              <label className="rcp-clone-label">
                <input
                  type="checkbox"
                  checked={parentLinkEnabled}
                  onChange={e => handleParentLinkToggle(e.target.checked)}
                />
                Link to Parent {parentRefConfig.label}
              </label>
              {parentLinkEnabled && (
                <select
                  className="rcp-clone-select"
                  value={selectedParentLink}
                  onChange={e => handleParentLinkSelect(e.target.value)}
                >
                  <option value="">— select parent —</option>
                  {parentLinkRows.map(r => (
                    <option key={r.name} value={r.name}>
                      {r.name} ({r.type})
                    </option>
                  ))}
                </select>
              )}
              {parentLinkEnabled && parentLinkRows.length === 0 && (
                <p className="rcp-clone-empty">No matching {parentRefConfig.label.toLowerCase()} resources found in the table.</p>
              )}
            </div>
          )}

          {parentTypes && (
            <div className="rcp-clone-section">
              <label className="rcp-clone-label">
                <input
                  type="checkbox"
                  checked={cloneEnabled}
                  onChange={e => handleCloneToggle(e.target.checked)}
                />
                Clone from Parent
              </label>
              {cloneEnabled && (
                <select
                  className="rcp-clone-select"
                  value={selectedCloneParent}
                  onChange={e => handleCloneParentSelect(e.target.value)}
                >
                  <option value="">— select parent —</option>
                  {cloneParentRows.map(r => (
                    <option key={r.name} value={r.name}>
                      {r.name} ({r.type})
                    </option>
                  ))}
                </select>
              )}
              {cloneEnabled && cloneParentRows.length === 0 && (
                <p className="rcp-clone-empty">No matching parent resources found in the table.</p>
              )}
            </div>
          )}

          {hasFields ? (
            <div className="rcp-fields">
              {typeConfig.fields.map((f, i) => (
                <div key={f.key} className="rcp-field-row">
                  <label className="rcp-field-label">{f.label}</label>
                  {f.type === 'select' ? (
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

          {(preview || (parentLinkEnabled && selectedParentLink)) && (
            <div className="rcp-preview">
              {preview && (
                <>
                  <span className="rcp-preview-label">Comment</span>
                  <span className="rcp-preview-value">{preview}</span>
                </>
              )}
              {parentRefConfig && parentLinkEnabled && selectedParentLink && (
                <>
                  <span className="rcp-preview-label" style={{marginTop: preview ? '0.5rem' : 0}}>Parent Link</span>
                  <span className="rcp-preview-value">{parentRefConfig.label}: {selectedParentLink}</span>
                </>
              )}
            </div>
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
