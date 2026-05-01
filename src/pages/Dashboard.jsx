import { useEffect, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { formatRupiah, formatTanggal, persen } from '@/lib/format'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { KPICard } from '@/components/DashboardCharts'

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function statusVariant(p) {
  if (p >= 80) return 'success'
  if (p >= 50) return 'default'
  if (p >= 20) return 'warning'
  return 'danger'
}

function statusLabel(p) {
  if (p >= 80) return 'Baik'
  if (p >= 50) return 'Sedang'
  if (p >= 20) return 'Rendah'
  return 'Kritis'
}

export default function Dashboard() {
  const subKegiatan = useStore(s => s.subKegiatan)
  const pengeluaran = useStore(s => s.pengeluaran)
  const penerimaan = useStore(s => s.penerimaan)
  const isLoading = useStore(s => s.isLoading)
  const fetchSubKegiatan = useStore(s => s.fetchSubKegiatan)
  const fetchPengeluaran = useStore(s => s.fetchPengeluaran)
  const fetchPenerimaan = useStore(s => s.fetchPenerimaan)

  useEffect(() => {
    fetchSubKegiatan()
    fetchPengeluaran()
    fetchPenerimaan()
  }, [])

  const totalPagu = useMemo(
    () => subKegiatan.reduce((sum, sk) => sum + (sk.total_pagu ?? 0), 0),
    [subKegiatan]
  )

  const totalPenerimaan = useMemo(
    () => penerimaan.reduce((sum, p) => sum + (p.jumlah ?? 0), 0),
    [penerimaan]
  )

  const totalPengeluaran = useMemo(
    () => pengeluaran.reduce((sum, p) => sum + (p.jumlah ?? 0), 0),
    [pengeluaran]
  )

  const totalUPGU = useMemo(
    () => penerimaan.filter(p => p.jenis === 'UP' || p.jenis === 'GU').reduce((sum, p) => sum + (p.jumlah ?? 0), 0),
    [penerimaan]
  )

  const sisaSaldoKas = totalUPGU - totalPengeluaran
  const sisaQuotaAnggaran = totalPagu - totalPengeluaran
  const persenTotal = persen(totalPengeluaran, totalPagu)

  const realisasiPerSk = useMemo(() =>
    subKegiatan.map(sk => {
      const real = pengeluaran
        .filter(p => p.sub_kegiatan_id === sk.id)
        .reduce((sum, p) => sum + (p.jumlah ?? 0), 0)
      return { ...sk, realisasi: real, persen: persen(real, sk.total_pagu) }
    }),
    [subKegiatan, pengeluaran]
  )

  const monthlyData = useMemo(() =>
    BULAN.map((bulan, i) => ({
      bulan,
      total: pengeluaran
        .filter(p => {
          const d = new Date(p.tanggal)
          return d.getMonth() === i && d.getFullYear() === 2026
        })
        .reduce((sum, p) => sum + (p.jumlah ?? 0), 0),
    })),
    [pengeluaran]
  )

  const transaksiTerakhir = pengeluaran.slice(0, 5)

  if (isLoading && subKegiatan.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          label="Total Penerimaan" 
          value={formatRupiah(totalPenerimaan)} 
          variant="primary"
        />
        <KPICard 
          label="Total Pengeluaran" 
          value={formatRupiah(totalPengeluaran)} 
          variant="danger"
        />
        <KPICard 
          label="Saldo Kas Riil" 
          value={formatRupiah(sisaSaldoKas)} 
          subtext="Dana UP & GU dikurangi Pengeluaran"
          variant={sisaSaldoKas < 0 ? 'danger' : 'success'}
        />
        <KPICard 
          label="Sisa Quota Pagu" 
          value={formatRupiah(sisaQuotaAnggaran)} 
          subtext={`${persenTotal}% terpakai dari Pagu`}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Realisasi per Sub Kegiatan */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <h2 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-600 rounded-full" />
              Detail Realisasi per Sub Kegiatan
            </h2>
            {realisasiPerSk.length === 0 ? (
              <EmptyState message="Belum ada data sub kegiatan" />
            ) : (
              <div className="space-y-6">
                {realisasiPerSk.map(sk => (
                  <div key={sk.id} className="group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-xs font-black text-indigo-600 uppercase tracking-tighter mb-1">{sk.kode}</p>
                        <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                          {sk.nama}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-black text-slate-900">{formatRupiah(sk.realisasi)}</span>
                        <Badge variant={statusVariant(sk.persen)}>{statusLabel(sk.persen)}</Badge>
                      </div>
                    </div>
                    <ProgressBar value={sk.persen} />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pagu: {formatRupiah(sk.total_pagu)}</span>
                      <span className="text-[10px] font-black text-indigo-600">{sk.persen}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Transaksi Terakhir */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <h2 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-indigo-600 rounded-full" />
              Pengeluaran Terakhir
            </h2>
            {transaksiTerakhir.length === 0 ? (
              <EmptyState message="Belum ada transaksi" />
            ) : (
              <div className="space-y-4 flex-1">
                {transaksiTerakhir.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-indigo-600 mb-0.5">{p.no_bukti}</p>
                      <p className="text-xs text-slate-700 font-medium truncate w-32 md:w-48">{p.keterangan || 'Belanja'}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{formatTanggal(p.tanggal)}</p>
                    </div>
                    <p className="text-sm font-black text-red-600">{formatRupiah(p.jumlah)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

