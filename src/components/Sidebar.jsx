import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  FileText,
  Calculator,
  Settings as SettingsIcon,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/penerimaan', icon: ArrowDownCircle, label: 'Penerimaan' },
  { to: '/pengeluaran', icon: ArrowUpCircle, label: 'Pengeluaran' },
  { to: '/anggaran', icon: BookOpen, label: 'Anggaran / DPA' },
  { to: '/laporan', icon: FileText, label: 'Laporan' },
  { to: '/pajak', icon: Calculator, label: 'Kalkulator Pajak' },
  { to: '/settings', icon: SettingsIcon, label: 'Pengaturan' },
]

export default function Sidebar({ onClose, isCollapsed = false }) {
  return (
    <aside className={`bg-slate-900 h-full flex flex-col shadow-xl transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`p-6 border-b border-slate-800/50 flex flex-col ${isCollapsed ? 'items-center justify-center p-4' : ''}`}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20 shrink-0">
            B
          </div>
          {!isCollapsed && <h2 className="text-lg font-bold text-white tracking-tight">Bendahara</h2>}
        </div>
        {!isCollapsed && (
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">
            UPTD BAPENDA<br />Kab. Tasikmalaya
          </p>
        )}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            title={isCollapsed ? item.label : ''}
            className={({ isActive }) =>
              `flex items-center rounded-xl text-sm font-bold transition-all duration-200 group ${
                isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
              } ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <item.icon size={20} className="transition-transform duration-200 group-hover:scale-110 shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={`p-6 bg-slate-950/50 border-t border-slate-800/30 flex flex-col ${isCollapsed ? 'items-center justify-center p-4' : ''}`}>
        {!isCollapsed && (
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-2">
            Tahun Anggaran
          </p>
        )}
        <p className={`text-white font-bold ${isCollapsed ? 'text-xs' : 'text-lg'}`}>{new Date().getFullYear()}</p>
      </div>
    </aside>
  )
}
