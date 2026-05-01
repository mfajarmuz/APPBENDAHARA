import { useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAppStore } from '@/store/useAppStore'
import { formatRupiah, formatTanggal, persen } from '@/lib/format'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']

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
  const subKegiatan = useAppStore(s => s.subKegiatan)
  const pengeluaran = useAppStore(s => s.pengeluaran)
  const loading = useAppStore(s => s.loading)
  const fetchSubKegiatan = useAppStore(s => s.fetchSubKegiatan)
  const fetchPengeluaran = useAppStore(s => s.fetchPengeluaran)

  useEffect(() => {
    fetchSubKegiatan()
    fetchPengeluaran()
  }, [])

  const totalPagu = useMemo(
    () => subKegiatan.reduce((sum, sk) => sum + (sk.total_pagu ?? 0), 0),
    [subKegiatan]
  )

  const totalRealisasi = useMemo(
    () => pengeluaran.reduce((sum, p) => sum + (p.jumlah ?? 0), 0),
    [pengeluaran]
  )

  const sisaAnggaran = totalPagu - totalRealisasi
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

  if (loading && subKegiatan.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size={28} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-text-secondary mb-1">Total Pagu Anggaran</p>
          <p className="text-xl font-bold text-text-primary">{formatRupiah(totalPagu)}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary mb-1">Total Realisasi</p>
          <p className="text-xl font-bold text-accent">{formatRupiah(totalRealisasi)}</p>
          <p className="text-xs text-text-secondary mt-1">{persenTotal}% dari pagu</p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary mb-1">Sisa Anggaran</p>
          <p className={`text-xl font-bold ${sisaAnggaran < 0 ? 'text-danger' : 'text-success'}`}>
            {formatRupiah(sisaAnggaran)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* Realisasi per Sub Kegiatan */}
        <Card className="col-span-3">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Realisasi per Sub Kegiatan</h2>
          {realisasiPerSk.length === 0 ? (
            <EmptyState message="Belum ada data sub kegiatan" />
          ) : (
            <div className="space-y-3">
              {realisasiPerSk.map(sk => (
                <div key={sk.id}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-xs font-medium text-text-primary truncate">{sk.nama}</p>
                      <p className="text-[10px] text-text-secondary">{sk.kode}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-text-secondary">{formatRupiah(sk.realisasi)}</span>
                      <Badge variant={statusVariant(sk.persen)}>{statusLabel(sk.persen)}</Badge>
                    </div>
                  </div>
                  <ProgressBar value={sk.persen} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Bar Chart */}
        <Card className="col-span-2">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Pengeluaran per Bulan</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F8" vertical={false} />
              <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: '#9090B0' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={v => v === 0 ? '0' : `${(v / 1_000_000).toFixed(0)}jt`}
                tick={{ fontSize: 10, fill: '#9090B0' }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                formatter={(v) => [formatRupiah(v), 'Pengeluaran']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #F0F0F8' }}
              />
              <Bar dataKey="total" fill="#7C3AED" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Transaksi Terakhir */}
      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-4">Pengeluaran Terakhir</h2>
        {transaksiTerakhir.length === 0 ? (
          <EmptyState message="Belum ada transaksi pengeluaran" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-text-secondary pb-2">Tanggal</th>
                <th className="text-left text-xs font-medium text-text-secondary pb-2">No Bukti</th>
                <th className="text-left text-xs font-medium text-text-secondary pb-2">Sub Kegiatan</th>
                <th className="text-right text-xs font-medium text-text-secondary pb-2">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {transaksiTerakhir.map((p, i) => (
                <tr key={p.id} className={i < transaksiTerakhir.length - 1 ? 'border-b border-border' : ''}>
                  <td className="py-2 text-text-secondary text-xs">{formatTanggal(p.tanggal)}</td>
                  <td className="py-2 text-text-primary font-medium">{p.no_bukti}</td>
                  <td className="py-2 text-text-secondary text-xs truncate max-w-[200px]">
                    {p.sub_kegiatan?.nama ?? '-'}
                  </td>
                  <td className="py-2 text-right font-medium">{formatRupiah(p.jumlah)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
