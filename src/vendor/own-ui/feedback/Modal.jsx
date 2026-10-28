import { useEffect, useRef } from 'react'
import { Icon } from '../icons/Icons.jsx'
import './Modal.css'

// OWN Library Modal, with focus containment and focus restoration for the editor.
export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement
    const focusable = () => [...(panelRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])') || [])]
    const onKey = (event) => {
      if (event.key === 'Escape') { onClose?.(); return }
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (!elements.length) { event.preventDefault(); return }
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    focusable()[0]?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="own-modal" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}>
      <div className={`own-modal__panel own-modal__panel--${size}`} role="dialog" aria-modal="true" aria-label={title} ref={panelRef}>
        <div className="own-modal__head">
          <h3>{title}</h3>
          <button type="button" className="own-modal__close" aria-label="Close dialog" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="own-modal__body">{children}</div>
        {footer && <div className="own-modal__footer">{footer}</div>}
      </div>
    </div>
  )
}
