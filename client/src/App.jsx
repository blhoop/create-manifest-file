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
    setFileName(name)
    setError('')
  }

  const handleError = (msg) => {
    setError(msg)
    setRows(null)
  }

  const downloadCsv = () => {
    if (!rows?.length) return
    const headers = ['name', 'type', 'special comments']
    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.replace(/\.[^.]+$/, '') + '_manifest.csv'
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
              <button className="btn-download" onClick={downloadCsv}>
                Download CSV
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
