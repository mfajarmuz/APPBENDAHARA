import { useLocation } from 'react-router-dom'
import { Calendar, LogOut } from 'lucide-react'

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
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm">
      <div>
        <h1 className="text-slate-900 font-bold text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5 text-slate-600 text-sm font-medium">
          <Calendar size={16} className="text-slate-400" />
          <span>{today()}</span>
        </div>
        <button
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          title="Logout"
        >
          <LogOut size={16} />
          <span className="text-xs">Keluar</span>
        </button>
      </div>
    </header>
  )
}
