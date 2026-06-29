// src/pages/Trash.jsx
import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { Trash2, Undo, AlertCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

/**
 * [HALAMAN: TEMPAT SAMPAH]
 * Dasbor pemulihan data transaksi (Penerimaan/Pengeluaran) yang dihapus sementara.
 */
export default function Trash() {
  const deletedRecords = useStore(s => s.deletedRecords || [])
  const fetchDeletedRecords = useStore(s => s.fetchDeletedRecords)
  const restoreRecord = useStore(s => s.restoreRecord)
  const hardDeleteRecord = useStore(s => s.hardDeleteRecord)
  const periodeKunci = useStore(s => s.periodeKunci)
  const fetchPeriodeKunci = useStore(s => s.fetchPeriodeKunci)
  const user = useStore(s => s.user)

  useEffect(() => {
    fetchDeletedRecords()
    if (fetchPeriodeKunci) fetchPeriodeKunci()
  }, [])

  const isDateLocked = (dateStr) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return false
    const m = d.getMonth() + 1
    const y = d.getFullYear()
    return (periodeKunci || []).some(pk => pk.bulan === m && pk.tahun === y)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Trash2 size={24} className="text-rose-500" /> Tempat Sampah (Soft Delete)
          </h2>
          <p className="text-sm text-slate-500">
            Pulihkan data transaksi yang dihapus sementara atau hapus secara permanen dari database
          </p>
        </div>
        <Badge variant="secondary" className="bg-rose-50 text-rose-700 border border-rose-100 uppercase text-xs font-black px-4 py-1">
          {deletedRecords.length} Data Terhapus
        </Badge>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed flex items-center gap-1.5">
            <AlertCircle size={14} className="text-slate-400 shrink-0" />
            Transaksi yang terhapus sementara di bawah ini tidak akan muncul di Buku Kas Umum (BKU) atau laporan keuangan lainnya. 
            Modifikasi data yang berada pada periode bulan yang terkunci 🔒 tidak diperbolehkan.
          </p>

          {deletedRecords.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              Tempat sampah kosong. Tidak ada data yang dihapus sementara.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipe</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tanggal Transaksi</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Keterangan / Uraian</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Jumlah</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tanggal Dihapus</th>
                    {user?.role !== 'viewer' && (
                      <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {deletedRecords.map((item) => {
                    const isLocked = isDateLocked(item.tanggal)
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            item.tipe === 'Penerimaan' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-orange-50 text-orange-700 border border-orange-100'
                          }`}>
                            {item.tipe}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-bold">
                          {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 max-w-xs truncate" title={item.keterangan || item.uraian}>
                          {item.keterangan || item.uraian || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-black text-slate-800">
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
                                onClick={async () => {
                                  if (isLocked) {
                                    alert(`Tidak dapat memulihkan transaksi ini karena periode bulan transaksi tersebut sedang dikunci 🔒. Harap buka kunci periode terlebih dahulu di menu Laporan.`)
                                    return
                                  }
                                  if (confirm(`Apakah Anda yakin ingin memulihkan transaksi ini?`)) {
                                    const res = await restoreRecord(item.tipe, item.id)
                                    if (res && !res.success) alert(res.error)
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 px-2 py-1 bg-indigo-50 hover:bg-indigo-100/75 rounded-lg transition-colors"
                              >
                                <Undo size={12} /> Pulihkan
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (isLocked) {
                                    alert(`Tidak dapat menghapus permanen transaksi ini karena periode bulan transaksi tersebut sedang dikunci 🔒. Harap buka kunci periode terlebih dahulu di menu Laporan.`)
                                    return
                                  }
                                  if (confirm(`PERINGATAN Keras! Anda akan menghapus transaksi ini secara PERMANEN dari database dan tidak dapat dipulihkan lagi. Apakah Anda yakin?`)) {
                                    const res = await hardDeleteRecord(item.tipe, item.id)
                                    if (res && !res.success) alert(res.error)
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-600 hover:text-rose-800 px-2 py-1 bg-rose-50 hover:bg-rose-100/75 rounded-lg transition-colors"
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
    </div>
  )
}
