import { useLocation } from 'react-router-dom'
import { Calendar, LogOut, User } from 'lucide-react'
import { useStore } from '@/store/useStore'

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
  const logout = useStore(s => s.logout)
  const user = useStore(s => s.user)

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

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-900 leading-none capitalize">{user?.username}</p>
            <p className="text-[10px] text-slate-400 leading-none mt-1 uppercase tracking-tighter">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-all group"
            title="Keluar"
          >
            <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
            <span className="text-xs font-semibold">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  )
}
