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
      className="sidebar-scroll flex flex-col overflow-y-auto"
      style={{ width: 200, minWidth: 200, background: '#12121F' }}
    >
      {/* Logo / Nama Unit */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: '#7C3AED' }}
          >
            B
          </div>
          <span className="text-white font-semibold text-sm">Bendahara</span>
        </div>
        <p className="text-white/40 text-[10px] leading-tight pl-9">
          UPTD BAPENDA<br />Kab. Tasikmalaya
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Info Tahun Anggaran */}
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">
          Tahun Anggaran
        </p>
        <p className="text-white font-semibold text-sm">2026</p>
      </div>
    </aside>
  )
}
