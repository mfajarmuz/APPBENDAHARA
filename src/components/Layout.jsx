import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { Outlet } from 'react-router-dom'

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024)

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
        <Topbar onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
