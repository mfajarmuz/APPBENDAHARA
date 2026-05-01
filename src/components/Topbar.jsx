import { useLocation } from 'react-router-dom'
import { Calendar, LogOut, Menu } from 'lucide-react'
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

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] ?? 'Bendahara App'
  const logout = useStore(s => s.logout)
  const user = useStore(s => s.user)

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm gap-4">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick} 
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors lg:hidden"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-slate-900 font-bold text-lg hidden sm:block">{title}</h1>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <div className="hidden sm:flex items-center gap-2.5 text-slate-600 text-sm font-medium">
          <Calendar size={16} className="text-slate-400" />
          <span>{today()}</span>
        </div>

        <div className="hidden sm:block h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-900 leading-none capitalize">{user?.username}</p>
            <p className="text-[10px] text-slate-400 leading-none mt-1 uppercase tracking-tighter">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center text-slate-400 hover:text-red-600 w-10 h-10 rounded-xl hover:bg-red-50 transition-all group"
            title="Keluar"
          >
            <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  )
}
