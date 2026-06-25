import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Penerimaan from './pages/Penerimaan'
import Pengeluaran from './pages/Pengeluaran'
import Anggaran from './pages/Anggaran'
import Laporan from './pages/Laporan'
import KalkulatorPajak from './pages/KalkulatorPajak'
import Settings from './pages/Settings'
import Trash from './pages/Trash'
import Login from './pages/Login'
import { useStore } from './store/useStore'

function ProtectedRoute({ children }) {
  const user = useStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return children
}

/**
 * [ENTRY POINT: App]
 * Konfigurasi Routing Utama dan Proteksi Halaman (Auth).
 * Menggunakan HashRouter untuk kompatibilitas Electron.
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="penerimaan" element={<Penerimaan />} />
          <Route path="pengeluaran" element={<Pengeluaran />} />
          <Route path="anggaran" element={<Anggaran />} />
          <Route path="laporan" element={<Laporan />} />
          <Route path="pajak" element={<KalkulatorPajak />} />
          <Route path="settings" element={<Settings />} />
          <Route path="trash" element={<Trash />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
