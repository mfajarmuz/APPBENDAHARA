import { useLocation } from 'react-router-dom'
import { Calendar } from 'lucide-react'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/penerimaan': 'Penerimaan',
  '/pengeluaran': 'Pengeluaran',
  '/anggaran': 'Anggaran / DPA',
  '/laporan': 'Laporan',
}

function today() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Topbar() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] ?? 'Bendahara App'

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
      <h1 className="text-text-primary font-semibold text-base">{title}</h1>
      <div className="flex items-center gap-2 text-text-secondary text-sm">
        <Calendar size={15} />
        <span>{today()}</span>
      </div>
    </header>
  )
}
