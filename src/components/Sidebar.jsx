import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  FileText,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/penerimaan', icon: ArrowDownCircle, label: 'Penerimaan' },
  { to: '/pengeluaran', icon: ArrowUpCircle, label: 'Pengeluaran' },
  { to: '/anggaran', icon: BookOpen, label: 'Anggaran / DPA' },
  { to: '/laporan', icon: FileText, label: 'Laporan' },
]

export default function Sidebar() {
  return (
    <aside
      className="sidebar-scroll flex flex-col overflow-y-auto bg-slate-900 border-r border-slate-800"
      style={{ width: 220, minWidth: 220 }}
    >
      {/* Logo / Nama Unit */}
      <div className="px-4 py-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-lg"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
          >
            B
          </div>
          <span className="text-white font-bold text-sm">Bendahara</span>
        </div>
        <p className="text-slate-400 text-[11px] leading-snug pl-11 font-medium">
          UPTD BAPENDA<br />Kab. Tasikmalaya
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-accent text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Info Tahun Anggaran */}
      <div className="px-4 py-5 border-t border-slate-700/50 bg-slate-800/30">
        <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-2">
          Tahun Anggaran
        </p>
        <p className="text-white font-bold text-lg">2026</p>
      </div>
    </aside>
  )
}
