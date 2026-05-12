import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, TrendingUp, TrendingDown, Wallet, PieChart as PieIcon, Info } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRupiah, formatTanggal, persen } from '@/lib/format'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

function statusVariant(p) {
  if (p === 0) return 'default'
  if (p >= 75) return 'success'
  if (p >= 40) return 'primary'
  if (p >= 20) return 'warning'
  return 'danger'
}

function statusLabel(p) {
  if (p === 0) return '0%'
  if (p >= 75) return 'Optimal'
  if (p >= 40) return 'Sedang'
  if (p >= 20) return 'Rendah'
  return 'Kritis'
}

function InteractiveKPICard({ label, value, subtext, variant = 'primary', icon: Icon, details = [] }) {
  const [isOpen, setIsOpen] = useState(false)
  
  const variants = {
    primary: 'from-blue-600 to-indigo-700 shadow-blue-200',
    success: 'from-emerald-500 to-teal-700 shadow-emerald-200',
    danger: 'from-rose-500 to-red-700 shadow-red-200',
    warning: 'from-amber-500 to-orange-600 shadow-amber-200',
  }

  const bgVariants = {
    primary: 'bg-blue-50/50 border-blue-100',
    success: 'bg-emerald-50/50 border-emerald-100',
    danger: 'bg-red-50/50 border-red-100',
    warning: 'bg-amber-50/50 border-amber-100',
  }

  return (
    <div className={`relative overflow-hidden border rounded-3xl transition-all duration-300 shadow-sm hover:shadow-xl ${bgVariants[variant]} ${isOpen ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}>
      <div className="p-4 sm:p-5" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        <div className="flex justify-between items-start mb-3">
          <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${variants[variant]} text-white shadow-lg`}>
            {Icon && <Icon size={18} />}
          </div>
          {details.length > 0 && (
            <div className={`p-1 rounded-full transition-transform duration-300 ${isOpen ? 'rotate-180 bg-slate-200' : 'bg-slate-100 text-slate-400'}`}>
              <ChevronDown size={14} />
            </div>
          )}
        </div>
        
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 truncate" title={label}>{label}</p>
        <h3 className="text-lg sm:text-xl xl:text-lg 2xl:text-xl font-black text-slate-900 leading-tight mb-1 break-all">{value}</h3>
        {subtext && <p className="text-[10px] font-bold text-slate-400 italic line-clamp-1">{subtext}</p>}
      </div>

      {isOpen && details.length > 0 && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-white/50 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
          {details.map((item, i) => (
            <div key={i} className="flex justify-between items-center gap-2 group">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700 transition-colors truncate">{item.label}</span>
              <span className={`text-[10px] font-black whitespace-nowrap ${item.className || 'text-slate-800'}`}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const subKegiatan = useStore(s => s.subKegiatan)
  const pengeluaran = useStore(s => s.pengeluaran)
  const penerimaan = useStore(s => s.penerimaan)
  const isLoading = useStore(s => s.isLoading)
  const fetchSubKegiatan = useStore(s => s.fetchSubKegiatan)
  const fetchPengeluaran = useStore(s => s.fetchPengeluaran)
  const fetchPenerimaan = useStore(s => s.fetchPenerimaan)

  const [expandedItems, setExpandedItems] = useState({})

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    fetchSubKegiatan()
    fetchPengeluaran()
    fetchPenerimaan()
  }, [])

  // Hierarchical Data Transformation
  const hierarchicalData = useMemo(() => {
    const programsMap = {}
    subKegiatan.forEach(sk => {
      const keg = sk.kegiatan
      const prog = keg?.program
      if (!prog) return
      if (!programsMap[prog.id]) programsMap[prog.id] = { ...prog, kegiatan: {}, total_pagu: 0, realisasi: 0 }
      if (!programsMap[prog.id].kegiatan[keg.id]) programsMap[prog.id].kegiatan[keg.id] = { ...keg, sub_kegiatan: {}, total_pagu: 0, realisasi: 0 }
      const skPagu = (sk.kode_rekening ?? []).reduce((s, r) => s + (r.pagu_anggaran ?? 0), 0)
      const skReal = pengeluaran.filter(p => p.sub_kegiatan_id === sk.id).reduce((sum, p) => sum + (p.jumlah ?? 0), 0)
      const skData = {
        ...sk, total_pagu: skPagu, realisasi: skReal, persen: persen(skReal, skPagu),
        kode_rekening: (sk.kode_rekening ?? []).map(rek => {
          const rekReal = pengeluaran.filter(p => p.kode_rekening_id === rek.id).reduce((sum, p) => sum + (p.jumlah ?? 0), 0)
          return { ...rek, realisasi: rekReal, persen: persen(rekReal, rek.pagu_anggaran) }
        })
      }
      programsMap[prog.id].kegiatan[keg.id].sub_kegiatan[sk.id] = skData
      programsMap[prog.id].total_pagu += skPagu
      programsMap[prog.id].realisasi += skReal
      programsMap[prog.id].kegiatan[keg.id].total_pagu += skPagu
      programsMap[prog.id].kegiatan[keg.id].realisasi += skReal
    })
    return Object.values(programsMap).map(p => ({
      ...p, persen: persen(p.realisasi, p.total_pagu),
      kegiatan: Object.values(p.kegiatan).map(k => ({
        ...k, persen: persen(k.realisasi, k.total_pagu),
        sub_kegiatan: Object.values(k.sub_kegiatan)
      }))
    }))
  }, [subKegiatan, pengeluaran])

  const totalPagu = useMemo(() => hierarchicalData.reduce((sum, p) => sum + p.total_pagu, 0), [hierarchicalData])
  const totalPenerimaan = useMemo(() => penerimaan.reduce((sum, p) => sum + (p.jumlah ?? 0), 0), [penerimaan])
  const totalPengeluaran = useMemo(() => pengeluaran.reduce((sum, p) => sum + (p.jumlah ?? 0), 0), [pengeluaran])

  // Breakdown Penerimaan
  const penerimaanLS = useMemo(() => penerimaan.filter(p => p.jenis === 'LS').reduce((s, p) => s + p.jumlah, 0), [penerimaan])
  const penerimaanUPGU = useMemo(() => penerimaan.filter(p => p.jenis === 'UP' || p.jenis === 'GU').reduce((s, p) => s + p.jumlah, 0), [penerimaan])
  const penerimaanPajak = useMemo(() => penerimaan.filter(p => p.jenis === 'Pajak').reduce((s, p) => s + p.jumlah, 0), [penerimaan])

  // Breakdown Pengeluaran
  const pengeluaranLS = useMemo(() => pengeluaran.filter(p => p.jenis === 'LS').reduce((s, p) => s + p.jumlah, 0), [pengeluaran])
  const pengeluaranGU = useMemo(() => pengeluaran.filter(p => p.jenis === 'GU').reduce((s, p) => s + p.jumlah, 0), [pengeluaran])
  const pengeluaranPajak = useMemo(() => {
    return pengeluaran.filter(p => {
      const rincianText = p.pengeluaran_rincian?.length > 0
        ? p.pengeluaran_rincian.map(r => r.uraian).join(', ')
        : p.keterangan || ''
      return rincianText.startsWith('Setoran PP')
    }).reduce((s, p) => s + p.jumlah, 0)
  }, [pengeluaran])

  const sisaSaldoKas = penerimaanUPGU - totalPengeluaran
  const sisaQuotaAnggaran = totalPagu - totalPengeluaran
  const persenTotal = persen(totalPengeluaran, totalPagu)

  // Breakdown Pajak Terperinci
  const pajakDetails = useMemo(() => {
    const types = [
      { id: 'ppn', label: 'PPN', regex: /PPN/i },
      { id: 'pph21', label: 'PPh 21', regex: /PPh\s*21/i },
      { id: 'pph22', label: 'PPh 22', regex: /PPh\s*22/i },
      { id: 'pph23', label: 'PPh 23', regex: /PPh\s*23/i },
      { id: 'pph4', label: 'PPh 4 (2)', regex: /PPh\s*(?:Pasal\s*)?4/i },
    ]

    const result = types.map(t => {
      const dipungut = penerimaan
        .filter(p => p.jenis === 'Pajak' && t.regex.test(p.keterangan || ''))
        .reduce((s, p) => s + p.jumlah, 0)
      
      const disetor = pengeluaran
        .filter(p => {
          const u = p.pengeluaran_rincian?.length > 0
            ? p.pengeluaran_rincian.map(r => r.uraian).join(', ')
            : p.keterangan || ''
          return u.startsWith('Setoran PP') && t.regex.test(u)
        })
        .reduce((s, p) => s + p.jumlah, 0)

      return { ...t, dipungut, disetor }
    })

    return result
  }, [penerimaan, pengeluaran])

  const totalPajakDipungut = useMemo(() => pajakDetails.reduce((s, p) => s + p.dipungut, 0), [pajakDetails])
  const totalPajakDisetor = useMemo(() => pajakDetails.reduce((s, p) => s + p.disetor, 0), [pajakDetails])

  const INDO_MONTHS = useMemo(() => [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ], [])

  const monthlyRecap = useMemo(() => {
    let year = new Date().getFullYear()
    const firstWithDate = pengeluaran.find(p => p.tanggal)
    if (firstWithDate) {
      const pYear = parseInt(firstWithDate.tanggal.split('-')[0], 10)
      if (!isNaN(pYear)) year = pYear
    }

    const list = INDO_MONTHS.map((monthName, monthIdx) => ({
      key: `${year}-${String(monthIdx + 1).padStart(2, '0')}`,
      year,
      monthName,
      totalGU: 0,
      totalLS: 0,
      totalAll: 0
    }))
    
    pengeluaran.forEach(p => {
      if (!p.tanggal) return
      const parts = p.tanggal.split('-')
      if (parts.length < 2) return
      const monthIdx = parseInt(parts[1], 10) - 1
      if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return
      
      const jumlah = p.jumlah ?? 0
      if (p.jenis === 'LS') {
        list[monthIdx].totalLS += jumlah
      } else if (p.jenis === 'GU') {
        list[monthIdx].totalGU += jumlah
      }
      list[monthIdx].totalAll += jumlah
    })
    
    return list
  }, [pengeluaran, INDO_MONTHS])

  if (isLoading && subKegiatan.length === 0) {
    return <div className="flex items-center justify-center h-64"><Spinner size={28} /></div>
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* KPI Cards Interaktif */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
        <InteractiveKPICard 
          label="Total Penerimaan" 
          value={formatRupiah(totalPenerimaan)} 
          variant="primary"
          icon={TrendingUp}
          subtext="Total seluruh dana masuk"
          details={[
            { label: 'LS (Langsung)', value: formatRupiah(penerimaanLS) },
            { label: 'UP / GU', value: formatRupiah(penerimaanUPGU) },
            { label: 'Pajak', value: formatRupiah(penerimaanPajak), className: 'text-indigo-600' }
          ]}
        />
        <InteractiveKPICard 
          label="Total Pengeluaran" 
          value={formatRupiah(totalPengeluaran)} 
          variant="danger"
          icon={TrendingDown}
          subtext="Realisasi belanja & setoran"
          details={[
            { label: 'Belanja LS', value: formatRupiah(pengeluaranLS) },
            { label: 'Belanja GU', value: formatRupiah(pengeluaranGU) },
            { label: 'Setoran Pajak', value: formatRupiah(pengeluaranPajak), className: 'text-red-600' }
          ]}
        />
        <InteractiveKPICard 
          label="Status Pajak" 
          value={formatRupiah(totalPajakDipungut)} 
          variant="warning"
          icon={PieIcon}
          subtext={`${formatRupiah(totalPajakDisetor)} telah disetor`}
          details={[
            ...pajakDetails.map(p => ({
              label: p.label,
              value: `${formatRupiah(p.dipungut)} / ${formatRupiah(p.disetor)}`,
              className: p.dipungut > p.disetor ? 'text-amber-600' : 'text-emerald-600'
            })),
            { label: 'Sisa Belum Setor', value: formatRupiah(totalPajakDipungut - totalPajakDisetor), className: 'text-red-600 border-t pt-1 mt-1' }
          ]}
        />
        <InteractiveKPICard 
          label="Saldo Kas Riil" 
          value={formatRupiah(sisaSaldoKas)} 
          variant={sisaSaldoKas < 0 ? 'danger' : 'success'}
          icon={Wallet}
          subtext="Sisa dana UP/GU di tangan"
          details={[
            { label: 'Total UP/GU', value: formatRupiah(penerimaanUPGU) },
            { label: 'Total Belanja', value: formatRupiah(totalPengeluaran), className: 'text-red-500' },
            { label: 'Status', value: sisaSaldoKas < 0 ? 'Defisit' : 'Tersedia', className: sisaSaldoKas < 0 ? 'text-red-700' : 'text-emerald-700' }
          ]}
        />
        <InteractiveKPICard 
          label="Sisa Quota Pagu" 
          value={formatRupiah(sisaQuotaAnggaran)} 
          variant="warning"
          icon={PieIcon}
          subtext={`${persenTotal}% Anggaran Terpakai`}
          details={[
            { label: 'Total Pagu', value: formatRupiah(totalPagu) },
            { label: 'Sisa Anggaran', value: formatRupiah(sisaQuotaAnggaran), className: 'text-amber-700' },
            { label: 'Penyerapan', value: `${persenTotal}%` }
          ]}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5">
          <Card>
            <h2 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-indigo-600 rounded-full" />
              Rekap Pengeluaran Bulanan (GU & LS)
            </h2>
            {monthlyRecap.length === 0 ? (
              <EmptyState message="Belum ada data pengeluaran" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Bulan</th>
                      <th className="py-3 px-4 text-right">Belanja GU</th>
                      <th className="py-3 px-4 text-right">Belanja LS</th>
                      <th className="py-3 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                    {monthlyRecap.map(item => (
                      <tr key={item.key} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-black text-slate-900">{item.monthName} {item.year}</td>
                        <td className="py-3.5 px-4 text-right text-emerald-600">{formatRupiah(item.totalGU)}</td>
                        <td className="py-3.5 px-4 text-right text-blue-600">{formatRupiah(item.totalLS)}</td>
                        <td className="py-3.5 px-4 text-right text-slate-900 font-black">{formatRupiah(item.totalAll)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="xl:col-span-7">
          <Card>
            <h2 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-600 rounded-full" />
              Detail Realisasi Anggaran (Drill-down Hierarkis)
            </h2>
          {hierarchicalData.length === 0 ? (
            <EmptyState message="Belum ada data anggaran" />
          ) : (
            <div className="space-y-4">
              {hierarchicalData.map(prog => (
                <div key={prog.id} className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
                  <div 
                    onClick={() => toggleExpand(`prog-${prog.id}`)}
                    className="p-4 bg-slate-50/50 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-400 group-hover:text-indigo-600 transition-colors">
                        {expandedItems[`prog-${prog.id}`] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      <div>
                        <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-tighter mb-1 inline-block">PROGRAM</span>
                        <h3 className="text-sm font-black text-slate-800 leading-tight">{prog.kode} {prog.nama}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Realisasi</p>
                        <p className="text-sm font-black text-slate-900">{formatRupiah(prog.realisasi)}</p>
                      </div>
                      <Badge variant={statusVariant(prog.persen)}>{prog.persen}%</Badge>
                    </div>
                  </div>

                  {expandedItems[`prog-${prog.id}`] && (
                    <div className="p-2 sm:p-4 space-y-3 bg-white border-t border-slate-100">
                      {prog.kegiatan.map(keg => (
                        <div key={keg.id} className="border border-slate-50 rounded-xl overflow-hidden">
                          <div 
                            onClick={() => toggleExpand(`keg-${keg.id}`)}
                            className="p-3 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-slate-400">
                                {expandedItems[`keg-${keg.id}`] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </div>
                              <div>
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter block">KEGIATAN</span>
                                <h4 className="text-xs font-bold text-slate-700 leading-tight">{keg.kode} {keg.nama}</h4>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-slate-600 hidden sm:inline-block">{formatRupiah(keg.realisasi)}</span>
                              <span className="text-[10px] font-black text-indigo-600">{keg.persen}%</span>
                            </div>
                          </div>

                          {expandedItems[`keg-${keg.id}`] && (
                            <div className="p-3 space-y-4 border-t border-slate-50">
                              {keg.sub_kegiatan.map(sk => (
                                <div key={sk.id} className="group">
                                  <div 
                                    onClick={() => toggleExpand(`sk-${sk.id}`)}
                                    className="flex items-start justify-between mb-2 cursor-pointer"
                                  >
                                    <div className="flex-1 min-w-0 mr-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">SUB KEGIATAN</span>
                                        <p className="text-[10px] font-black text-emerald-600 tracking-tighter">{sk.kode}</p>
                                        <div className="text-slate-400">
                                          {expandedItems[`sk-${sk.id}`] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                        </div>
                                      </div>
                                      <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-600 transition-colors leading-tight">
                                        {sk.nama}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <span className="text-xs font-black text-slate-900">{formatRupiah(sk.realisasi)}</span>
                                      <Badge variant={statusVariant(sk.persen)}>{statusLabel(sk.persen)}</Badge>
                                    </div>
                                  </div>
                                  <ProgressBar value={sk.persen} variant={statusVariant(sk.persen)} />
                                  <div className="flex justify-between mt-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pagu: {formatRupiah(sk.total_pagu)}</span>
                                    <span className="text-[9px] font-black text-emerald-600">{sk.persen}%</span>
                                  </div>

                                  {expandedItems[`sk-${sk.id}`] && (
                                    <div className="mt-3 ml-4 pl-4 border-l-2 border-emerald-50 space-y-2 py-2">
                                      {sk.kode_rekening.map(rek => (
                                        <div key={rek.id} className="bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                          <div className="flex justify-between items-start mb-1">
                                            <div className="min-w-0 flex-1">
                                              <p className="text-[9px] font-mono text-slate-400 leading-none mb-1">{rek.kode}</p>
                                              <p className="text-[11px] font-medium text-slate-600 leading-tight">{rek.uraian}</p>
                                            </div>
                                            <div className="text-right ml-3">
                                              <p className="text-xs font-black text-slate-800 leading-none">{formatRupiah(rek.realisasi)}</p>
                                              <p className="text-[9px] text-slate-400 font-bold mt-1">/{formatRupiah(rek.pagu_anggaran)}</p>
                                            </div>
                                          </div>
                                          <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full ${
                                                rek.persen >= 100 ? 'bg-red-500' : 
                                                rek.persen >= 75 ? 'bg-emerald-500' : 'bg-indigo-500'
                                              }`}
                                              style={{ width: `${Math.min(rek.persen, 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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

