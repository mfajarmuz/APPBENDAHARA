// src/pages/Trash.jsx
import { useEffect, useState, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { Trash2, Undo, AlertCircle, Search, Filter, CalendarDays, Link2, RotateCcw } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

/**
 * [HALAMAN: TEMPAT SAMPAH]
 * Dasbor pemulihan data transaksi (Penerimaan/Pengeluaran) yang dihapus sementara.
 * Terisolasi per Tahun Anggaran dengan dukungan sinkronisasi Paket Transaksi.
 */
export default function Trash() {
  const deletedRecords = useStore(s => s.deletedRecords || [])
  const fetchDeletedRecords = useStore(s => s.fetchDeletedRecords)
  const restoreRecord = useStore(s => s.restoreRecord)
  const hardDeleteRecord = useStore(s => s.hardDeleteRecord)
  const periodeKunci = useStore(s => s.periodeKunci)
  const fetchPeriodeKunci = useStore(s => s.fetchPeriodeKunci)
  const user = useStore(s => s.user)
  const tahunAnggaran = useStore(s => s.tahunAnggaran)
  const daftarTahunAnggaran = useStore(s => s.daftarTahunAnggaran || [2024, 2025, 2026, 2027])

  const [filterTahun, setFilterTahun] = useState(String(tahunAnggaran || 2026))
  const [filterTipe, setFilterTipe] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmState, setConfirmState] = useState(null) // { mode: 'restore' | 'hard-delete' | 'restore-all' | 'empty-trash', item?: obj }
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchDeletedRecords()
    if (fetchPeriodeKunci) fetchPeriodeKunci()
  }, [])

  // Ikuti perubahan Tahun Anggaran global di Topbar
  useEffect(() => {
    if (tahunAnggaran) {
      setFilterTahun(String(tahunAnggaran))
    }
  }, [tahunAnggaran])

  const isDateLocked = (dateStr) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return false
    const m = d.getMonth() + 1
    const y = d.getFullYear()
    return (periodeKunci || []).some(pk => pk.bulan === m && pk.tahun === y)
  }

  // Hitung grup paket transaksi berdasarkan (refCode + tanggal)
  const packageCountMap = useMemo(() => {
    const map = {}
    deletedRecords.forEach(item => {
      const ref = String(item.nomor_ls || item.no_bukti || '').trim()
      if (!ref || !item.tanggal) return
      const key = `${item.tanggal}__${ref}`
      map[key] = (map[key] || 0) + 1
    })
    return map
  }, [deletedRecords])

  const filteredRecords = useMemo(() => {
    return deletedRecords.filter(item => {
      if (filterTahun !== 'ALL') {
        const d = item.tanggal ? new Date(item.tanggal) : null
        const itemYear = d && !isNaN(d.getTime()) ? d.getFullYear() : (item.sub_kegiatan?.tahun_anggaran || 2026)
        if (String(itemYear) !== String(filterTahun)) return false
      }
      if (filterTipe && item.tipe !== filterTipe) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const ket = String(item.keterangan || item.uraian || '').toLowerCase()
        const ref = String(item.nomor_ls || item.no_bukti || '').toLowerCase()
        const jenis = String(item.jenis || '').toLowerCase()
        const rek = String(item.kode_rekening?.kode || item.kode_rekening?.uraian || '').toLowerCase()
        if (!ket.includes(q) && !ref.includes(q) && !jenis.includes(q) && !rek.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [deletedRecords, filterTahun, filterTipe, searchQuery])

  const unlockedFilteredRecords = useMemo(() => {
    return filteredRecords.filter(item => !isDateLocked(item.tanggal))
  }, [filteredRecords, periodeKunci])

  const handleConfirmAction = async () => {
    if (!confirmState) return
    setIsProcessing(true)
    try {
      const { mode, item } = confirmState
      if (mode === 'restore' && item) {
        const res = await restoreRecord(item.tipe, item.id)
        if (res && !res.success) alert(res.error)
      } else if (mode === 'hard-delete' && item) {
        const res = await hardDeleteRecord(item.tipe, item.id)
        if (res && !res.success) alert(res.error)
      } else if (mode === 'restore-all') {
        for (const rec of unlockedFilteredRecords) {
          await restoreRecord(rec.tipe, rec.id)
        }
      } else if (mode === 'empty-trash') {
        for (const rec of unlockedFilteredRecords) {
          await hardDeleteRecord(rec.tipe, rec.id)
        }
      }
    } finally {
      setIsProcessing(false)
      setConfirmState(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Trash2 size={24} className="text-rose-500" /> Tempat Sampah (Soft Delete)
          </h2>
          <p className="text-sm text-slate-500">
            Pulihkan data transaksi beserta paket pajaknya atau hapus secara permanen dari database
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase text-xs font-black px-3 py-1">
            {filterTahun === 'ALL' ? 'Semua Tahun' : `TA ${filterTahun}`}
          </Badge>
          <Badge variant="secondary" className="bg-rose-50 text-rose-700 border border-rose-100 uppercase text-xs font-black px-4 py-1">
            {filteredRecords.length} Data Terhapus
          </Badge>
        </div>
      </div>

      {/* Filter & Bulk Action Bar */}
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block pl-1 flex items-center gap-1">
                <CalendarDays size={11} className="text-indigo-600" /> Tahun Anggaran
              </label>
              <select
                value={filterTahun}
                onChange={e => setFilterTahun(e.target.value)}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              >
                {daftarTahunAnggaran.map(y => (
                  <option key={y} value={String(y)}>Tahun Anggaran {y}{y === tahunAnggaran ? ' (Aktif)' : ''}</option>
                ))}
                <option value="ALL">Semua Tahun Anggaran ({deletedRecords.length})</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block pl-1 flex items-center gap-1">
                <Filter size={11} className="text-indigo-600" /> Tipe Transaksi
              </label>
              <select
                value={filterTipe}
                onChange={e => setFilterTipe(e.target.value)}
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              >
                <option value="">Semua Tipe</option>
                <option value="Penerimaan">Penerimaan</option>
                <option value="Pengeluaran">Pengeluaran</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block pl-1 flex items-center gap-1">
                <Search size={11} className="text-indigo-600" /> Cari Transaksi
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari uraian, ket, no. bukti..."
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
          </div>

          {user?.role !== 'viewer' && unlockedFilteredRecords.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                onClick={() => setConfirmState({ mode: 'restore-all' })}
                disabled={isProcessing}
                className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
              >
                <RotateCcw size={14} /> Pulihkan Semua ({unlockedFilteredRecords.length})
              </Button>
              <Button
                variant="danger"
                onClick={() => setConfirmState({ mode: 'empty-trash' })}
                disabled={isProcessing}
                className="text-xs"
              >
                <Trash2 size={14} /> Kosongkan ({unlockedFilteredRecords.length})
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed flex items-center gap-1.5">
            <AlertCircle size={14} className="text-slate-400 shrink-0" />
            Transaksi di bawah ini tidak muncul di Buku Kas Umum (BKU) atau laporan keuangan. Saat Anda memulihkan atau menghapus permanen transaksi yang tergabung dalam <strong>Paket Transaksi (LS / Pajak)</strong>, pasangan pajaknya akan otomatis ikut disinkronkan.
          </p>

          {filteredRecords.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              Tempat sampah kosong pada filter ini. Tidak ada data yang dihapus sementara.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipe & Jenis</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tanggal</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">No. Bukti / Ref</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Keterangan / Rekening</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Jumlah</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Waktu Dihapus</th>
                    {user?.role !== 'viewer' && (
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRecords.map((item) => {
                    const isLocked = isDateLocked(item.tanggal)
                    const refCode = String(item.nomor_ls || item.no_bukti || '').trim()
                    const pkgCount = refCode && item.tanggal ? (packageCountMap[`${item.tanggal}__${refCode}`] || 1) : 1
                    return (
                      <tr key={`${item.tipe}-${item.id}`} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              item.tipe === 'Penerimaan' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-orange-50 text-orange-700 border border-orange-100'
                            }`}>
                              {item.tipe}
                            </span>
                            {item.jenis && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-bold">
                                {item.jenis}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-bold">
                          {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          {isLocked && <span className="ml-1.5 text-[10px]" title="Periode Terkunci">🔒</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-[10px] text-slate-600 font-semibold">{refCode || '-'}</span>
                            {pkgCount > 1 && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded w-fit">
                                <Link2 size={10} /> Paket ({pkgCount} item)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-medium text-slate-700 truncate" title={item.keterangan || item.uraian}>
                            {item.keterangan || item.uraian || '-'}
                          </div>
                          {item.kode_rekening && (
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {item.kode_rekening.kode} — {item.kode_rekening.uraian}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-black text-slate-800 text-right">
                          {item.jumlah ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.jumlah) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                          {item.deleted_at ? new Date(item.deleted_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                        </td>
                        {user?.role !== 'viewer' && (
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => {
                                  if (isLocked) {
                                    alert(`Tidak dapat memulihkan transaksi ini karena periode bulan transaksi tersebut sedang dikunci 🔒. Harap buka kunci periode terlebih dahulu di menu Laporan.`)
                                    return
                                  }
                                  setConfirmState({ mode: 'restore', item })
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100/75 rounded-lg transition-colors cursor-pointer"
                              >
                                <Undo size={12} /> Pulihkan
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => {
                                  if (isLocked) {
                                    alert(`Tidak dapat menghapus permanen transaksi ini karena periode bulan transaksi tersebut sedang dikunci 🔒. Harap buka kunci periode terlebih dahulu di menu Laporan.`)
                                    return
                                  }
                                  setConfirmState({ mode: 'hard-delete', item })
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-800 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100/75 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={12} /> Hapus Permanen
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={!!confirmState}
        onClose={() => !isProcessing && setConfirmState(null)}
        onConfirm={handleConfirmAction}
        title={
          confirmState?.mode === 'restore'
            ? 'Pulihkan Transaksi'
            : confirmState?.mode === 'restore-all'
            ? 'Pulihkan Semua Transaksi'
            : confirmState?.mode === 'empty-trash'
            ? 'Kosongkan Tempat Sampah'
            : 'Hapus Permanen Transaksi'
        }
        message={
          confirmState?.mode === 'restore'
            ? `Apakah Anda yakin ingin memulihkan transaksi "${confirmState?.item?.keterangan || confirmState?.item?.uraian || '-'}"? Jika transaksi ini memiliki pasangan paket pajak/LS, seluruh paketnya juga akan ikut dipulihkan.`
            : confirmState?.mode === 'restore-all'
            ? `Apakah Anda yakin ingin memulihkan seluruh ${unlockedFilteredRecords.length} transaksi pada tampilan ini ke Buku Kas Umum (BKU)?`
            : confirmState?.mode === 'empty-trash'
            ? `PERINGATAN: Anda akan menghapus permanen seluruh ${unlockedFilteredRecords.length} transaksi pada tampilan ini dari database dan tidak dapat dipulihkan kembali. Lanjutkan?`
            : `PERINGATAN: Anda akan menghapus transaksi "${confirmState?.item?.keterangan || confirmState?.item?.uraian || '-'}" beserta pasangan paketnya secara PERMANEN dari database. Lanjutkan?`
        }
      />
    </div>
  )
}
