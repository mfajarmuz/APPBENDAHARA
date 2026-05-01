import Modal from './Modal'
import Button from './Button'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Konfirmasi Hapus', message = 'Apakah Anda yakin ingin menghapus data ini?', confirmText = 'Hapus', cancelText = 'Batal', isDanger = true }) {
  return (
    <Modal open={open} onClose={onClose} title="" width={400}>
      <div className="flex flex-col items-center text-center px-4 py-6">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-8">{message}</p>
        <div className="flex items-center gap-3 w-full">
          <Button variant="secondary" onClick={onClose} className="flex-1 h-12" type="button">
            {cancelText}
          </Button>
          <Button 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`flex-1 h-12 shadow-lg ${isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : ''}`}
            type="button"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}