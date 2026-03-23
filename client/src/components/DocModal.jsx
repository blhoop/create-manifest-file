import { useEffect } from 'react'
import './DocModal.css'

export default function DocModal({ title, content, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="doc-modal-overlay" onClick={onClose}>
      <div className="doc-modal" onClick={e => e.stopPropagation()}>
        <div className="doc-modal-header">
          <span className="doc-modal-title">{title}</span>
          <button className="doc-modal-close" onClick={onClose}>✕</button>
        </div>
        <pre className="doc-modal-body">{content}</pre>
      </div>
    </div>
  )
}
