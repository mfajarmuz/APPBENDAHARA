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
    <header className="sticky top-0 z-40 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm gap-4 transition-all duration-300">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick} 
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-slate-900 font-bold text-lg hidden sm:block tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <div className="hidden sm:flex items-center gap-2.5 text-slate-500 text-sm font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 shadow-inner">
          <Calendar size={14} className="text-indigo-500" />
          <span>{today()}</span>
        </div>

        <div className="hidden sm:block h-8 w-px bg-slate-200/60" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-900 leading-none capitalize">{user?.username}</p>
            <p className="text-[10px] text-slate-400 leading-none mt-1 uppercase tracking-tighter">{user?.role}</p>
          </div>
          <button 
            onClick={logout} 
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
            title="Keluar"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
