import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, width = 540, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const widthClass = size === 'sm' ? 360 : size === 'lg' ? 720 : width

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-border/50"
        style={{ width: widthClass, minWidth: 320 }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/30 shrink-0">
          <h2 className="font-semibold text-text-primary text-base">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-2 rounded-lg hover:bg-bg transition-all duration-200"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}
