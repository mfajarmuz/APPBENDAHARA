import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { Outlet } from 'react-router-dom'
import { Bot, Sparkles } from 'lucide-react'
import AiAssistantDrawer from './ai/AiAssistantDrawer'

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024)
  const [isAiOpen, setIsAiOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="flex h-screen w-full bg-bg font-sans text-text-primary overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:relative flex shrink-0 h-full overflow-hidden ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
      >
        <Sidebar 
          isCollapsed={!isSidebarOpen}
          onClose={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }} 
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden w-full lg:w-auto relative z-0">
        <Topbar 
          onMenuClick={() => setSidebarOpen(!isSidebarOpen)} 
          onAiClick={() => setIsAiOpen(true)}
        />
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Floating AI Button (Bottom Right) */}
      <button
        onClick={() => setIsAiOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 text-white rounded-full shadow-2xl hover:shadow-indigo-500/25 border border-indigo-700/50 hover:scale-105 transition-all duration-300 group"
        title="Tanyakan Sisa Pagu, RAK, atau Simulasi Belanja"
      >
        <div className="relative">
          <Bot size={20} className="text-emerald-400 group-hover:rotate-12 transition-transform" />
          <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-1 -right-1 animate-ping" />
        </div>
        <span className="text-xs font-black tracking-wide pr-1">Asisten AI</span>
        <Sparkles size={14} className="text-amber-300 animate-pulse" />
      </button>

      {/* AI Assistant Drawer */}
      <AiAssistantDrawer isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  )
}
