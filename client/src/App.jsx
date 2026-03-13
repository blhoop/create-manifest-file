import { useState } from 'react'
import FileUpload from './components/FileUpload.jsx'
import PreviewTable from './components/PreviewTable.jsx'
import './App.css'

export default function App() {
  const [rows, setRows] = useState(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleParsed = (data, name) => {
    setRows(data)
    setFileName(name.replace(/\.[^.]+$/, '') + '_manifest')
    setError('')
  }

  const handleError = (msg) => {
    setError(msg)
    setRows(null)
  }

  const buildCsvContent = () => {
    const headers = ['name', 'type', 'special comments']
    return [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n')
  }

  const downloadCsv = async () => {
    if (!rows?.length) return
    const csvContent = buildCsvContent()
    const safeName = (fileName.trim() || 'manifest') + '.csv'

    // Use File System Access API for native save dialog (Chrome/Edge)
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: safeName,
          types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }],
        })
        const writable = await handle.createWritable()
        await writable.write(csvContent)
        await writable.close()
        return
      } catch (err) {
        if (err.name === 'AbortError') return // user cancelled
      }
    }

    // Fallback: standard anchor download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = safeName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Manifest File Creator</h1>
        <p>Upload a spreadsheet or architecture diagram to generate a CSV manifest</p>
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
            <PreviewTable rows={rows} onRowsChange={setRows} />
            <div className="download-bar">
              <span>{rows.length} row{rows.length !== 1 ? 's' : ''} found</span>
              <div className="download-controls">
                <div className="filename-input-wrapper">
                  <input
                    className="filename-input"
                    type="text"
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    placeholder="filename"
                    spellCheck={false}
                  />
                  <span className="filename-ext">.csv</span>
                </div>
                <button className="btn-download" onClick={downloadCsv}>
                  Download CSV
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
