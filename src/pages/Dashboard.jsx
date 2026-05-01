import { useEffect, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { formatRupiah, formatTanggal, persen } from '@/lib/format'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { 
  KPICard, 
  ExpenditureTrendsChart, 
  RealizationVsBudgetChart 
} from '@/components/DashboardCharts'

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

  const totalCair = useMemo(
    () => penerimaan.reduce((sum, p) => sum + (p.jumlah ?? 0), 0),
    [penerimaan]
  )

  const totalRealisasi = useMemo(
    () => pengeluaran.reduce((sum, p) => sum + (p.jumlah ?? 0), 0),
    [pengeluaran]
  )

  const sisaSaldoKas = totalCair - totalRealisasi
  const sisaQuotaAnggaran = totalPagu - totalRealisasi
  const persenTotal = persen(totalRealisasi, totalPagu)

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
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard 
          label="Pagu Anggaran (DPA)" 
          value={formatRupiah(totalPagu)} 
          variant="primary"
        />
        <KPICard 
          label="Dana Cair (SP2D)" 
          value={formatRupiah(totalCair)} 
          variant="success"
        />
        <KPICard 
          label="Saldo Kas Riil" 
          value={formatRupiah(sisaSaldoKas)} 
          subtext="Uang yang bisa dibelanjakan"
          variant={sisaSaldoKas < 0 ? 'danger' : 'success'}
        />
        <KPICard 
          label="Sisa Quota Pagu" 
          value={formatRupiah(sisaQuotaAnggaran)} 
          subtext={`${persenTotal}% terpakai`}
          variant="warning"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenditureTrendsChart data={monthlyData} />
        <RealizationVsBudgetChart data={realisasiPerSk} />
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Realisasi per Sub Kegiatan */}
        <Card className="lg:col-span-3">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Detail Realisasi per Sub Kegiatan</h2>
          {realisasiPerSk.length === 0 ? (
            <EmptyState message="Belum ada data sub kegiatan" />
          ) : (
            <div className="space-y-4">
              {realisasiPerSk.map(sk => (
                <div key={sk.id} className="group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                        {sk.nama}
                      </p>
                      <p className="text-xs text-text-secondary">{sk.kode}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-text-primary">{formatRupiah(sk.realisasi)}</span>
                      <Badge variant={statusVariant(sk.persen)}>{statusLabel(sk.persen)}</Badge>
                    </div>
                  </div>
                  <ProgressBar value={sk.persen} />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-text-secondary">Pagu: {formatRupiah(sk.total_pagu)}</span>
                    <span className="text-[10px] text-text-secondary">{sk.persen}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Transaksi Terakhir */}
        <Card className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Pengeluaran Terakhir</h2>
          {transaksiTerakhir.length === 0 ? (
            <EmptyState message="Belum ada transaksi pengeluaran" />
          ) : (
            <div className="space-y-3">
              {transaksiTerakhir.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{p.no_bukti}</p>
                    <p className="text-[10px] text-text-secondary">{formatTanggal(p.tanggal)}</p>
                  </div>
                  <p className="text-xs font-bold text-danger">{formatRupiah(p.jumlah)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

