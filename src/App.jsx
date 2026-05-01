import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Penerimaan from './pages/Penerimaan'
import Pengeluaran from './pages/Pengeluaran'
import Anggaran from './pages/Anggaran'
import Laporan from './pages/Laporan'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="penerimaan" element={<Penerimaan />} />
          <Route path="pengeluaran" element={<Pengeluaran />} />
          <Route path="anggaran" element={<Anggaran />} />
          <Route path="laporan" element={<Laporan />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}