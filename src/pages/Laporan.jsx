// src/pages/Laporan.jsx
import { useEffect, useState, useMemo } from 'react'
import { FileText, Download } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRupiah, formatTanggal } from '@/lib/format'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { exportBKUPdf, exportBukuPembantuPdf, exportRealisasiPdf, exportRekapBulananPdf } from '@/lib/export-pdf'
import { exportBKUExcel, exportRealisasiExcel } from '@/lib/export-excel'

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function Laporan() {
  const subKegiatan = useStore(s => s.subKegiatan)
  const penerimaan = useStore(s => s.penerimaan)
  const pengeluaran = useStore(s => s.pengeluaran)
  const isLoading = useStore(s => s.isLoading)
  const fetchSubKegiatan = useStore(s => s.fetchSubKegiatan)
  const fetchPenerimaan = useStore(s => s.fetchPenerimaan)
  const fetchPengeluaran = useStore(s => s.fetchPengeluaran)

  const [tab, setTab] = useState('bku')
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth())

  useEffect(() => {
    fetchSubKegiatan()
    fetchPenerimaan()
    fetchPengeluaran()
  }, [])

  // BKU Data Transformation
  const bkuRows = useMemo(() => {
    const combined = [
      ...penerimaan.map(p => ({
        tanggal: p.tanggal,
        uraian: `Diterima Penerimaan SP2D ${p.no_sp2d || ''} ${p.keterangan || ''}`.trim(),
        no_bukti: p.no_sp2d,
        debet: p.jumlah,
        kredit: 0,
        kode_rekening: '',
      })),
      ...pengeluaran.map(p => {
        // Construct full code: SK.Rek
        const fullCode = p.sub_kegiatan && p.kode_rekening 
          ? `${p.sub_kegiatan.kode}.${p.kode_rekening.kode}`
          : ''
          
        // Combine all rincian text
        const rincianText = p.pengeluaran_rincian?.length > 0
          ? p.pengeluaran_rincian.map(r => r.uraian).join(', ')
          : p.keterangan || ''

        return {
          tanggal: p.tanggal,
          uraian: `Dibayar ${rincianText} pada kegiatan ${p.sub_kegiatan?.nama || ''} ${p.no_bukti}`.trim(),
          no_bukti: p.no_bukti,
          debet: 0,
          kredit: p.jumlah,
          kode_rekening: fullCode,
        }
      }),
    ].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))

    return combined
  }, [penerimaan, pengeluaran])

  // Filtered BKU by Month
  const filteredBku = useMemo(() => {
    return bkuRows.filter(r => new Date(r.tanggal).getMonth() === filterBulan)
  }, [bkuRows, filterBulan])

  // Realisasi per Rekening for LRA
  const realisasiPerRek = useMemo(() => {
    const map = {}
    pengeluaran.forEach(p => {
      map[p.kode_rekening_id] = (map[p.kode_rekening_id] ?? 0) + p.jumlah
    })
    return map
  }, [pengeluaran])

  // Rekap Bulanan
  const rekapBulanan = useMemo(() => {
    return BULAN.map((nama, i) => {
      const pen = penerimaan.filter(p => new Date(p.tanggal).getMonth() === i).reduce((s, p) => s + p.jumlah, 0)
      const peng = pengeluaran.filter(p => new Date(p.tanggal).getMonth() === i).reduce((s, p) => s + p.jumlah, 0)
      return { bulan: nama, penerimaan: pen, pengeluaran: peng }
    })
  }, [penerimaan, pengeluaran])

  function handleExportPdf() {
    if (tab === 'bku') exportBKUPdf(filteredBku, filterBulan)
    else if (tab === 'pembantu') {
      const groups = subKegiatan.flatMap(sk => 
        (sk.kode_rekening ?? []).map(rek => ({
          rekening: rek,
          rows: pengeluaran.filter(p => p.kode_rekening_id === rek.id)
        })).filter(g => g.rows.length > 0)
      )
      exportBukuPembantuPdf(groups)
    }
    else if (tab === 'lra') exportRealisasiPdf(subKegiatan, realisasiPerRek)
    else if (tab === 'rekap') exportRekapBulananPdf(rekapBulanan)
  }

  function handleExportExcel() {
    if (tab === 'bku') exportBKUExcel(filteredBku)
    else if (tab === 'lra') exportRealisasiExcel(subKegiatan, realisasiPerRek)
    else alert('Export Excel hanya tersedia untuk BKU dan LRA')
  }

  if (isLoading && subKegiatan.length === 0) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-5">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border">
        {[
          { id: 'bku', label: 'BKU' },
          { id: 'pembantu', label: 'Buku Pembantu' },
          { id: 'lra', label: 'LRA / SPJ' },
          { id: 'rekap', label: 'Rekap Bulanan' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {tab === 'bku' && (
            <select
              value={filterBulan}
              onChange={e => setFilterBulan(parseInt(e.target.value, 10))}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-surface"
            >
              {BULAN.map((b, i) => <option key={i} value={i}>{b}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExportPdf}>
            <Download size={15} /> Export PDF
          </Button>
          <Button variant="secondary" onClick={handleExportExcel}>
            <Download size={15} /> Export Excel
          </Button>
        </div>
      </div>

      {/* Content */}
      <Card className="p-0 overflow-hidden">
        {tab === 'bku' && (
          <table className="w-full text-xs">
            <thead className="bg-bg">
              <tr>
                <th className="px-5 py-3 text-left">Tanggal</th>
                <th className="px-5 py-3 text-left">No. Bukti</th>
                <th className="px-5 py-3 text-left">Uraian</th>
                <th className="px-5 py-3 text-right">Debet</th>
                <th className="px-5 py-3 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody>
              {filteredBku.length === 0 ? (
                <tr><td colSpan={5}><EmptyState /></td></tr>
              ) : filteredBku.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-5 py-2.5">{formatTanggal(r.tanggal)}</td>
                  <td className="px-5 py-2.5 font-medium">{r.no_bukti}</td>
                  <td className="px-5 py-2.5 text-text-secondary">{r.uraian}</td>
                  <td className="px-5 py-2.5 text-right text-success font-medium">
                    {r.debet > 0 ? formatRupiah(r.debet) : ''}
                  </td>
                  <td className="px-5 py-2.5 text-right text-danger font-medium">
                    {r.kredit > 0 ? formatRupiah(r.kredit) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'lra' && (
          <table className="w-full text-xs">
            <thead className="bg-bg">
              <tr>
                <th className="px-5 py-3 text-left">Kode / Uraian</th>
                <th className="px-5 py-3 text-right">Pagu</th>
                <th className="px-5 py-3 text-right">Realisasi</th>
                <th className="px-5 py-3 text-right">Sisa</th>
              </tr>
            </thead>
            <tbody>
              {subKegiatan.map(sk => {
                const skReal = (sk.kode_rekening ?? []).reduce((s, r) => s + (realisasiPerRek[r.id] ?? 0), 0)
                return (
                  <div key={sk.id} className="contents">
                    <tr className="bg-bg/40 font-bold">
                      <td className="px-5 py-2">{sk.kode} {sk.nama}</td>
                      <td className="px-5 py-2 text-right">{formatRupiah(sk.total_pagu)}</td>
                      <td className="px-5 py-2 text-right">{formatRupiah(skReal)}</td>
                      <td className="px-5 py-2 text-right">{formatRupiah(sk.total_pagu - skReal)}</td>
                    </tr>
                    {(sk.kode_rekening ?? []).map(rek => {
                      const real = realisasiPerRek[rek.id] ?? 0
                      return (
                        <tr key={rek.id} className="border-t border-border">
                          <td className="pl-8 pr-5 py-2 text-text-secondary">{rek.kode} {rek.uraian}</td>
                          <td className="px-5 py-2 text-right">{formatRupiah(rek.pagu_anggaran)}</td>
                          <td className="px-5 py-2 text-right">{formatRupiah(real)}</td>
                          <td className="px-5 py-2 text-right">{formatRupiah(rek.pagu_anggaran - real)}</td>
                        </tr>
                      )
                    })}
                  </div>
                )
              })}
            </tbody>
          </table>
        )}

        {tab === 'rekap' && (
          <table className="w-full text-xs">
            <thead className="bg-bg">
              <tr>
                <th className="px-5 py-3 text-left">Bulan</th>
                <th className="px-5 py-3 text-right">Penerimaan</th>
                <th className="px-5 py-3 text-right">Pengeluaran</th>
                <th className="px-5 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {rekapBulanan.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-5 py-2.5 font-medium">{r.bulan}</td>
                  <td className="px-5 py-2.5 text-right text-success">{formatRupiah(r.penerimaan)}</td>
                  <td className="px-5 py-2.5 text-right text-danger">{formatRupiah(r.pengeluaran)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold">
                    {formatRupiah(r.penerimaan - r.pengeluaran)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'pembantu' && (
          <div className="p-8 text-center text-text-secondary text-sm">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>Laporan Buku Pembantu Kas dikelompokkan per Kode Rekening.</p>
            <p className="mt-1">Gunakan tombol <b>Export PDF</b> untuk mengunduh laporan lengkap.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
