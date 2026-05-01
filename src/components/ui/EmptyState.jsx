import { Inbox } from 'lucide-react'

export default function EmptyState({ message = 'Belum ada data', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
      <Icon size={40} strokeWidth={1.2} className="mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
