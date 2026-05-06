import React, { useEffect, useState, useMemo } from 'react'
import { FileText, Download, Calendar, Printer } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRupiah, formatTanggal } from '@/lib/format'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { exportBKUPdf, exportBukuPembantuPdf, exportRealisasiPdf, exportRekapBulananPdf, exportLPJAdministratifPdf } from '@/lib/export-pdf'
import { exportBKUExcel, exportRealisasiExcel } from '@/lib/export-excel'
import { getBkuRows } from '@/lib/bku'

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
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchSubKegiatan()
    fetchPenerimaan()
    fetchPengeluaran()
  }, [])

  // BKU Data Transformation
  const bkuRows = useMemo(() => {
    return getBkuRows(penerimaan, pengeluaran)
  }, [penerimaan, pengeluaran])

  const filteredBku = useMemo(() => {
    return bkuRows.filter(r => {
      const d = new Date(r.tanggal)
      return d.getMonth() === filterBulan && d.getFullYear() === filterTahun
    })
  }, [bkuRows, filterBulan, filterTahun])

  const totalsBulanLalu = useMemo(() => {
    const pastRows = bkuRows.filter(r => {
      const d = new Date(r.tanggal)
      return d.getFullYear() < filterTahun || (d.getFullYear() === filterTahun && d.getMonth() < filterBulan)
    })
    return pastRows.reduce((acc, r) => {
      acc.debet += r.debet || 0
      acc.kredit += r.kredit || 0
      return acc
    }, { debet: 0, kredit: 0 })
  }, [bkuRows, filterBulan, filterTahun])

  const realisasiPerRek = useMemo(() => {
    const map = {}
    pengeluaran.forEach(p => {
      if (new Date(p.tanggal).getFullYear() === filterTahun) {
        map[p.kode_rekening_id] = (map[p.kode_rekening_id] ?? 0) + p.jumlah
      }
    })
    return map
  }, [pengeluaran, filterTahun])

  const rekapBulanan = useMemo(() => {
    return BULAN.map((nama, i) => {
      const pen = penerimaan.filter(p => {
        const d = new Date(p.tanggal)
        return d.getMonth() === i && d.getFullYear() === filterTahun
      }).reduce((s, p) => s + p.jumlah, 0)
      
      const peng = pengeluaran.filter(p => {
        const d = new Date(p.tanggal)
        return d.getMonth() === i && d.getFullYear() === filterTahun
      }).reduce((s, p) => s + p.jumlah, 0)
      
      return { bulan: nama, penerimaan: pen, pengeluaran: peng }
    })
  }, [penerimaan, pengeluaran, filterTahun])

  const pembantuGroups = useMemo(() => {
    return subKegiatan.flatMap(sk => 
      (sk.kode_rekening ?? []).map(rek => ({
        rekening: rek,
        subKegiatan: sk,
        rows: pengeluaran.filter(p => p.kode_rekening_id === rek.id && new Date(p.tanggal).getFullYear() === filterTahun)
      })).filter(g => g.rows.length > 0)
    )
  }, [subKegiatan, pengeluaran, filterTahun])

  function handleExportPdf() {
    if (tab === 'bku') exportBKUPdf(filteredBku, filterBulan, filterTahun, totalsBulanLalu)
    else if (tab === 'pembantu') exportBukuPembantuPdf(pembantuGroups)
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
    <div className="space-y-6 pb-12">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'bku', label: 'Buku Kas Umum' },
          { id: 'pembantu', label: 'Buku Pembantu' },
          { id: 'lra', label: 'Realisasi / SPJ' },
          { id: 'rekap', label: 'Rekap Bulanan' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          {(tab === 'bku' || tab === 'lra') && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                <select
                  value={filterBulan}
                  onChange={e => setFilterBulan(parseInt(e.target.value, 10))}
                  className="text-sm border-none focus:ring-0 bg-transparent font-bold text-slate-700 cursor-pointer"
                >
                  {BULAN.map((b, i) => <option key={i} value={i}>{b}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <select
                  value={filterTahun}
                  onChange={e => setFilterTahun(parseInt(e.target.value, 10))}
                  className="text-sm border-none focus:ring-0 bg-transparent font-bold text-slate-700 cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}
          {(tab === 'pembantu' || tab === 'rekap') && (
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <select
                value={filterTahun}
                onChange={e => setFilterTahun(parseInt(e.target.value, 10))}
                className="text-sm border-none focus:ring-0 bg-transparent font-bold text-slate-700 cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
          {tab === 'pembantu' && (
             <p className="text-xs font-bold text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 uppercase tracking-wider">
               {pembantuGroups.length} Akun Aktif
             </p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {tab === 'lra' && (
            <Button 
              variant="secondary" 
              onClick={() => exportLPJAdministratifPdf(filterBulan, 2026, subKegiatan, pengeluaran)}
              className="h-10 px-4 text-xs font-bold border-slate-200 group text-indigo-600 hover:bg-indigo-50"
            >
              <Printer size={14} className="mr-2 group-hover:scale-110 transition-transform" /> Cetak LPJ F4
            </Button>
          )}
          <Button variant="secondary" onClick={handleExportExcel} className="h-10 px-4 text-xs font-bold border-slate-200 group">
            <Download size={14} className="mr-2 group-hover:translate-y-0.5 transition-transform" /> Excel
          </Button>
          <Button onClick={handleExportPdf} className="h-10 px-6 text-xs font-bold shadow-lg shadow-indigo-600/10 group">
            <Download size={14} className="mr-2 group-hover:translate-y-0.5 transition-transform" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Content */}
      <Card className="p-0 overflow-hidden border-slate-200 shadow-xl ring-1 ring-slate-200/50">
        {tab === 'bku' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-12 text-center">No</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-28 text-center">Tanggal</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-48">Kode Rekening</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uraian</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-36 text-right">Debet (Rp)</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-36 text-right">Kredit (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBku.length === 0 ? (
                  <tr><td colSpan={6}><EmptyState message="Tidak ada transaksi di bulan ini" /></td></tr>
                ) : filteredBku.map((r, i) => (
                  <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-6 py-4 text-[10px] text-slate-400 text-center font-bold">{i + 1}</td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-bold text-center">{formatTanggal(r.tanggal)}</td>
                    <td className="px-6 py-4">
                      {r.kode_rekening && (
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 group-hover:border-indigo-200 group-hover:text-indigo-600 transition-colors">
                          {r.kode_rekening}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-800 font-medium leading-relaxed break-words">
                        {r.uraian}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-black text-sm">
                      {r.debet > 0 ? formatRupiah(r.debet).replace('Rp', '').trim() : ''}
                    </td>
                    <td className="px-6 py-4 text-right text-red-600 font-black text-sm">
                      {r.kredit > 0 ? formatRupiah(r.kredit).replace('Rp', '').trim() : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'pembantu' && (
          <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-10">
            {pembantuGroups.length === 0 ? (
              <EmptyState message="Belum ada transaksi pengeluaran" />
            ) : pembantuGroups.map((g, i) => (
              <div key={i} className="space-y-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-tighter">
                        REK {g.rekening.kode}
                      </span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 leading-tight">{g.rekening.uraian}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wide">{g.subKegiatan.nama}</p>
                  </div>
                  <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 text-right shadow-sm shrink-0">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Belanja</p>
                     <p className="text-2xl font-black text-red-600 leading-none">
                       {formatRupiah(g.rows.reduce((s, r) => s + r.jumlah, 0))}
                     </p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tanggal</th>
                          <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Keterangan / Item</th>
                          <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {g.rows.map((row, ri) => (
                          <tr key={ri} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 text-xs text-slate-500 font-medium">{formatTanggal(row.tanggal)}</td>
                            <td className="px-5 py-3 text-xs text-slate-600 italic">
                              {row.pengeluaran_rincian?.length > 0 
                                ? row.pengeluaran_rincian.map(rin => rin.uraian).join(', ')
                                : row.keterangan || '-'}
                            </td>
                            <td className="px-5 py-3 text-right font-black text-slate-900 text-sm">
                              {formatRupiah(row.jumlah)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'lra' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kode / Uraian</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-40 text-right">Pagu (Rp)</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-40 text-right">Realisasi (Rp)</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-40 text-right">Sisa (Rp)</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24 text-center">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subKegiatan.map(sk => {
                  const skReal = (sk.kode_rekening ?? []).reduce((s, r) => s + (realisasiPerRek[r.id] ?? 0), 0)
                  const skPagu = (sk.kode_rekening ?? []).reduce((s, r) => s + (r.pagu_anggaran ?? 0), 0)
                  const skPersen = Math.round((skReal / skPagu) * 100) || 0
                  
                  return (
                    <React.Fragment key={sk.id}>
                      <tr className="bg-slate-50/40">
                        <td className="px-6 py-3 font-black text-slate-900">
                          <p className="text-[10px] text-indigo-600 mb-0.5">{sk.kode}</p>
                          <p className="text-xs">{sk.nama}</p>
                        </td>
                        <td className="px-6 py-3 text-right text-xs font-black">{formatRupiah(skPagu)}</td>
                        <td className="px-6 py-3 text-right text-xs font-black text-red-600">{formatRupiah(skReal)}</td>
                        <td className="px-6 py-3 text-right text-xs font-black text-emerald-600">{formatRupiah(skPagu - skReal)}</td>
                        <td className="px-6 py-3 text-center">
                           <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                             skPersen >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                           }`}>{skPersen}%</span>
                        </td>
                      </tr>
                      {(sk.kode_rekening ?? []).map(rek => {
                        const real = realisasiPerRek[rek.id] ?? 0
                        const rePersen = Math.round((real / rek.pagu_anggaran) * 100) || 0
                        return (
                          <tr key={rek.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="pl-12 pr-6 py-3">
                              <p className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-500 transition-colors">{rek.kode}</p>
                              <p className="text-xs text-slate-600 font-medium">{rek.uraian}</p>
                            </td>
                            <td className="px-6 py-3 text-right text-xs text-slate-500 font-bold">{formatRupiah(rek.pagu_anggaran)}</td>
                            <td className="px-6 py-3 text-right text-xs text-red-500 font-bold">{formatRupiah(real)}</td>
                            <td className="px-6 py-3 text-right text-xs text-emerald-600 font-bold">{formatRupiah(rek.pagu_anggaran - real)}</td>
                            <td className="px-6 py-3 text-center text-[10px] font-bold text-slate-400">{rePersen}%</td>
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'rekap' && (
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bulan Pelaporan</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right w-48">Penerimaan (Rp)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right w-48">Pengeluaran (Rp)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right w-48">Saldo Kas (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rekapBulanan.map((r, i) => (
                <tr key={i} className="hover:bg-indigo-50/20 transition-colors group">
                  <td className="px-6 py-4 text-sm font-black text-slate-800">{r.bulan}</td>
                  <td className="px-6 py-4 text-right text-sm text-emerald-600 font-black">{formatRupiah(r.penerimaan)}</td>
                  <td className="px-6 py-4 text-right text-sm text-red-600 font-black">{formatRupiah(r.pengeluaran)}</td>
                  <td className="px-6 py-4 text-right text-lg font-black text-slate-900">
                    <span className={r.penerimaan - r.pengeluaran < 0 ? 'text-red-700' : ''}>
                      {formatRupiah(r.penerimaan - r.pengeluaran)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
