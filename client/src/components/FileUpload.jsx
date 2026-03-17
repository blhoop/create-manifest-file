import { useRef, useState } from 'react'
import './FileUpload.css'

const ACCEPTED = [
  '.xlsx', '.csv', '.tsv',
  '.xml', '.vsdx', '.svg',
  '.png', '.jpg', '.jpeg',
  '.pdf',
  '.yaml', '.yml',
].join(',')

const SPREADSHEET_EXTS = new Set(['.xlsx', '.csv', '.tsv'])
const DIAGRAM_EXTS = new Set(['.xml', '.vsdx', '.svg', '.png', '.jpg', '.jpeg', '.pdf'])
const YAML_EXTS = new Set(['.yaml', '.yml'])

function getExt(name) {
  return name.slice(name.lastIndexOf('.')).toLowerCase()
}

export default function FileUpload({ onParsed, onError, setLoading, loading }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const processFile = async (file) => {
    const ext = getExt(file.name)
    if (!SPREADSHEET_EXTS.has(ext) && !DIAGRAM_EXTS.has(ext) && !YAML_EXTS.has(ext)) {
      onError(`Unsupported file type: ${ext}`)
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Server error')
      onParsed(json.rows, file.name, json.sheets ?? null, json.subscription ?? null)
    } catch (err) {
      onError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div
      className={`upload-zone ${dragging ? 'dragging' : ''} ${loading ? 'disabled' : ''}`}
      onClick={() => !loading && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={onInputChange}
        style={{ display: 'none' }}
      />
      <div className="upload-icon">📁</div>
      <p className="upload-title">Drop a file here or click to browse</p>
      <p className="upload-subtitle">
        <strong>Spreadsheets:</strong> .xlsx .csv .tsv
      </p>
      <p className="upload-subtitle">
        <strong>Diagrams:</strong> .xml (draw.io) .vsdx (Visio) .svg .png .jpg .pdf
      </p>
      <p className="upload-subtitle">
        <strong>Manifest:</strong> .yaml .yml
      </p>
    </div>
  )
}
