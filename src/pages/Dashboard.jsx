import { useEffect, useMemo, useState, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, TrendingUp, TrendingDown, Wallet, PieChart as PieIcon, Info, ExternalLink } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRupiah, formatTanggal, persen } from '@/lib/format'
import { getBkuRows } from '@/lib/bku'
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
  const navigate = useNavigate()
  const subKegiatan = useStore(s => s.subKegiatan)
  const pengeluaran = useStore(s => s.pengeluaran)
  const penerimaan = useStore(s => s.penerimaan)
  const isLoading = useStore(s => s.isLoading)
  const fetchSubKegiatan = useStore(s => s.fetchSubKegiatan)
  const fetchPengeluaran = useStore(s => s.fetchPengeluaran)
  const fetchPenerimaan = useStore(s => s.fetchPenerimaan)

  const [expandedItems, setExpandedItems] = useState({})
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [expandedRakSk, setExpandedRakSk] = useState({})

  const toggleExpand = (id) => {
    setExpandedItems(prev => {
      const current = prev[id]
      if (id.startsWith('sk-') || id.startsWith('rek-')) {
        return { ...prev, [id]: !current }
      }
      return { ...prev, [id]: current === undefined ? false : !current }
    })
  }

  const toggleExpandRakSk = (id) => {
    setExpandedRakSk(prev => ({ ...prev, [id]: !prev[id] }))
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
      const skReal = pengeluaran.filter(p => p.sub_kegiatan_id === sk.id && p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS').reduce((sum, p) => sum + (p.jumlah ?? 0), 0)
      const skData = {
        ...sk, total_pagu: skPagu, realisasi: skReal, persen: persen(skReal, skPagu),
        kode_rekening: (sk.kode_rekening ?? []).map(rek => {
          const rekTx = pengeluaran
            .filter(p => p.kode_rekening_id === rek.id && p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS')
            .sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''))
          const rekReal = rekTx.reduce((sum, p) => sum + (p.jumlah ?? 0), 0)
          return { ...rek, realisasi: rekReal, persen: persen(rekReal, rek.pagu_anggaran), transaksi: rekTx }
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
  const totalPenerimaan = useMemo(() => penerimaan.filter(p => p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS').reduce((sum, p) => sum + (p.jumlah ?? 0), 0), [penerimaan])
  const totalPengeluaran = useMemo(() => pengeluaran.filter(p => p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS').reduce((sum, p) => sum + (p.jumlah ?? 0), 0), [pengeluaran])

  // Breakdown Penerimaan
  const penerimaanLS = useMemo(() => penerimaan.filter(p => p.jenis === 'LS').reduce((s, p) => s + p.jumlah, 0), [penerimaan])
  const penerimaanUPGU = useMemo(() => penerimaan.filter(p => p.jenis === 'UP' || p.jenis === 'GU').reduce((s, p) => s + p.jumlah, 0), [penerimaan])
  const penerimaanPajak = useMemo(() => penerimaan.filter(p => p.jenis === 'Pajak').reduce((s, p) => s + p.jumlah, 0), [penerimaan])

  // Breakdown Pengeluaran
  const pengeluaranLS = useMemo(() => pengeluaran.filter(p => p.jenis === 'LS').reduce((s, p) => s + p.jumlah, 0), [pengeluaran])
  const pengeluaranGU = useMemo(() => pengeluaran.filter(p => ['GU', 'UP', 'TU', 'KKPD'].includes(p.jenis)).reduce((s, p) => s + p.jumlah, 0), [pengeluaran])
  const pengeluaranPajak = useMemo(() => {
    return pengeluaran.filter(p => {
      const rincianText = p.pengeluaran_rincian?.length > 0
        ? p.pengeluaran_rincian.map(r => r.uraian).join(', ')
        : p.keterangan || ''
      return rincianText.startsWith('Setoran PP')
    }).reduce((s, p) => s + p.jumlah, 0)
  }, [pengeluaran])

  const sisaSaldoKas = penerimaanUPGU - pengeluaranGU
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

  const bkuIndexMap = useMemo(() => {
    const allBku = getBkuRows(penerimaan, pengeluaran)
    
    // Kelompokkan item BKU per bulan (tahun-bulan)
    const monthGroups = {}
    allBku.forEach(item => {
      if (!item.tanggal) return
      const parts = item.tanggal.split('-')
      if (parts.length >= 2) {
        const ymKey = `${parts[0]}-${parts[1]}`
        if (!monthGroups[ymKey]) monthGroups[ymKey] = []
        monthGroups[ymKey].push(item)
      }
    })

    const map = {}
    allBku.forEach((item, globalIdx) => {
      let bulanBku = '-'
      let noUrutBulan = globalIdx + 1
      if (item.tanggal) {
        const parts = item.tanggal.split('-')
        if (parts.length >= 2) {
          const ymKey = `${parts[0]}-${parts[1]}`
          const mIdx = parseInt(parts[1], 10) - 1
          if (mIdx >= 0 && mIdx < 12) {
            bulanBku = INDO_MONTHS[mIdx]
          }
          if (monthGroups[ymKey]) {
            const idxInMonth = monthGroups[ymKey].findIndex(mItem => mItem.id === item.id)
            if (idxInMonth !== -1) {
              noUrutBulan = idxInMonth + 1
            }
          }
        }
      }
      map[item.id] = {
        noUrut: noUrutBulan, // Nomor urut BKU Bulanan (dimulai dari #1 setiap bulan baru)
        noUrutTahunan: globalIdx + 1, // Nomor urut BKU Akumulatif Tahunan
        bulanBku
      }
    })
    return map
  }, [penerimaan, pengeluaran, INDO_MONTHS])

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

  const RAK_KEYS = useMemo(() => [
    'rak_jan', 'rak_feb', 'rak_mar', 'rak_apr', 'rak_mei', 'rak_jun',
    'rak_jul', 'rak_agu', 'rak_sep', 'rak_okt', 'rak_nov', 'rak_des'
  ], [])

  const rakMonitoringData = useMemo(() => {
    return subKegiatan.map(sk => {
      const keysToSum = RAK_KEYS.slice(0, selectedMonth)
      const targetRak = (sk.kode_rekening ?? []).reduce((sumRek, rek) => {
        const rekSum = keysToSum.reduce((sumBulan, key) => sumBulan + (rek[key] ?? 0), 0)
        return sumRek + rekSum
      }, 0)

      const realisasi = pengeluaran
        .filter(p => {
          if (p.sub_kegiatan_id !== sk.id || !p.tanggal) return false
          const parts = p.tanggal.split('-')
          if (parts.length < 2) return false
          const pMonth = parseInt(parts[1], 10)
          return pMonth <= selectedMonth
        })
        .reduce((sum, p) => sum + (p.jumlah ?? 0), 0)

      const sisa = targetRak - realisasi
      const persenPenyerapan = targetRak > 0 ? Math.round((realisasi / targetRak) * 100) : 0

      const rekeningDetails = (sk.kode_rekening ?? []).map(rek => {
        const rekTargetRak = keysToSum.reduce((sumBulan, key) => sumBulan + (rek[key] ?? 0), 0)
        const rekRealisasi = pengeluaran
          .filter(p => p.kode_rekening_id === rek.id && p.tanggal)
          .filter(p => {
            const parts = p.tanggal.split('-')
            const pMonth = parseInt(parts[1], 10)
            return pMonth <= selectedMonth
          })
          .reduce((sum, p) => sum + (p.jumlah ?? 0), 0)

        const rekSisa = rekTargetRak - rekRealisasi
        const rekPersen = rekTargetRak > 0 ? Math.round((rekRealisasi / rekTargetRak) * 100) : 0

        return {
          id: rek.id,
          kode: rek.kode,
          uraian: rek.uraian,
          targetRak: rekTargetRak,
          realisasi: rekRealisasi,
          sisa: rekSisa,
          persen: rekPersen
        }
      }).sort((a, b) => a.kode.localeCompare(b.kode))

      return {
        id: sk.id,
        kode: sk.kode,
        nama: sk.nama,
        targetRak,
        realisasi,
        sisa,
        persen: persenPenyerapan,
        rekening: rekeningDetails
      }
    }).sort((a, b) => a.kode.localeCompare(b.kode))
  }, [subKegiatan, pengeluaran, selectedMonth, RAK_KEYS])

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
            { label: 'Total Belanja', value: formatRupiah(pengeluaranGU), className: 'text-red-500' },
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

      {/* Detail Realisasi Anggaran (Drill-down Hierarkis) - Full Width */}
      <Card>
        <h2 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="w-1 h-4 bg-emerald-600 rounded-full" />
          Detail Realisasi Anggaran (Drill-down Hierarkis)
        </h2>
        {hierarchicalData.length === 0 ? (
          <EmptyState message="Belum ada data anggaran" />
        ) : (
          <div className="space-y-4">
            {hierarchicalData.map(prog => {
              const isProgExpanded = expandedItems[`prog-${prog.id}`] !== false

              return (
                <div key={prog.id} className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
                  <div 
                    onClick={() => toggleExpand(`prog-${prog.id}`)}
                    className="p-4 bg-slate-50/50 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-200 text-slate-400 group-hover:text-indigo-600 transition-colors">
                        {isProgExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      <div>
                        <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-tighter mb-1 inline-block">PROGRAM</span>
                        <h3 className="text-sm font-black text-slate-800 leading-tight">{prog.kode} {prog.nama}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Realisasi</p>
                        <p className="text-sm font-black text-slate-900">{formatRupiah(prog.realisasi)} <span className="text-xs text-slate-400 font-normal">/ {formatRupiah(prog.total_pagu)}</span></p>
                      </div>
                      <Badge variant={statusVariant(prog.persen)}>{prog.persen}%</Badge>
                    </div>
                  </div>

                  {isProgExpanded && (
                    <div className="p-2 sm:p-4 space-y-3 bg-white border-t border-slate-100">
                      {prog.kegiatan.map(keg => {
                        const isKegExpanded = expandedItems[`keg-${keg.id}`] !== false

                        return (
                          <div key={keg.id} className="border border-slate-50 rounded-xl overflow-hidden">
                            <div 
                              onClick={() => toggleExpand(`keg-${keg.id}`)}
                              className="p-3 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-slate-400">
                                  {isKegExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                                <div>
                                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter block">KEGIATAN</span>
                                  <h4 className="text-xs font-bold text-slate-700 leading-tight">{keg.kode} {keg.nama}</h4>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                  <span className="text-xs font-bold text-slate-600">{formatRupiah(keg.realisasi)}</span>
                                  <span className="text-[10px] text-slate-400 block font-normal">/ {formatRupiah(keg.total_pagu)}</span>
                                </div>
                                <span className="text-[10px] font-black text-indigo-600">{keg.persen}%</span>
                              </div>
                            </div>

                            {isKegExpanded && (
                              <div className="p-3 space-y-4 border-t border-slate-50">
                                {keg.sub_kegiatan.map(sk => {
                                  const isSkExpanded = !!expandedItems[`sk-${sk.id}`]

                                  return (
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
                                              {isSkExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
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

                                      {isSkExpanded && (
                                  <div className="mt-3 ml-2 sm:ml-4 pl-3 sm:pl-4 border-l-2 border-emerald-200/60 space-y-2.5 py-2">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      Kode Rekening Belanja ({sk.kode_rekening.length})
                                    </div>
                                    {sk.kode_rekening.map(rek => {
                                      const isRekExpanded = !!expandedItems[`rek-${rek.id}`]
                                      const txList = rek.transaksi || []

                                      return (
                                        <div key={rek.id} className="bg-slate-50/70 rounded-xl border border-slate-200/70 overflow-hidden transition-all shadow-2xs hover:border-slate-300">
                                          <div 
                                            onClick={() => toggleExpand(`rek-${rek.id}`)}
                                            className="p-2.5 flex items-start justify-between cursor-pointer hover:bg-slate-100/60 transition-colors group"
                                          >
                                            <div className="flex items-start gap-2 min-w-0 flex-1 mr-3">
                                              <div className="p-1 rounded bg-white border border-slate-200 text-slate-400 group-hover:text-emerald-600 transition-colors mt-0.5 shrink-0">
                                                {isRekExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                              </div>
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                  <span className="text-[9px] font-mono font-black text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">{rek.kode}</span>
                                                  <span className="text-[9px] font-black bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                                                    {txList.length} Transaksi
                                                  </span>
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">{rek.uraian}</p>
                                              </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <p className="text-xs font-black text-slate-900 leading-none">{formatRupiah(rek.realisasi)}</p>
                                              <p className="text-[9px] text-slate-400 font-bold mt-1">/{formatRupiah(rek.pagu_anggaran)}</p>
                                            </div>
                                          </div>

                                          <div className="px-2.5 pb-2">
                                            <div className="w-full bg-slate-200/70 h-1 rounded-full overflow-hidden">
                                              <div 
                                                className={`h-full rounded-full transition-all ${
                                                  rek.persen >= 100 ? 'bg-red-500' : 
                                                  rek.persen >= 75 ? 'bg-emerald-500' : 'bg-indigo-500'
                                                }`}
                                                style={{ width: `${Math.min(rek.persen, 100)}%` }}
                                              />
                                            </div>
                                          </div>

                                          {isRekExpanded && (
                                            <div className="bg-white border-t border-slate-200/70 p-3 space-y-2">
                                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                                                <span>Rincian Transaksi Pengeluaran ({txList.length})</span>
                                              </div>
                                              {txList.length === 0 ? (
                                                <div className="p-3 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs font-medium italic">
                                                  Belum ada transaksi pengeluaran tercatat pada kode rekening ini.
                                                </div>
                                              ) : (
                                                  <div className="overflow-x-auto rounded-lg border border-slate-200/60">
                                                    <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                                                      <thead>
                                                        <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                                          <th className="py-2 px-3 text-center w-20">No. BKU</th>
                                                          <th className="py-2 px-3">Bulan BKU</th>
                                                          <th className="py-2 px-3">Tanggal</th>
                                                          <th className="py-2 px-3">Jenis</th>
                                                          <th className="py-2 px-3">Uraian / Rincian</th>
                                                          <th className="py-2 px-3 text-right">Jumlah</th>
                                                          <th className="py-2 px-3 text-center w-24">Aksi</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                                        {txList.map(tx => {
                                                          const bkuInfo = bkuIndexMap[tx.id] || { noUrut: '-', bulanBku: '-' }
                                                          const rincianText = tx.pengeluaran_rincian?.length > 0
                                                            ? tx.pengeluaran_rincian.map(r => `${r.uraian}${r.volume ? ` (${r.volume} ${r.satuan || ''})` : ''}`).join(', ')
                                                            : tx.keterangan || 'Belanja'

                                                          return (
                                                            <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                                                              <td className="py-2 px-3 text-[10px] font-mono font-black text-indigo-600 text-center whitespace-nowrap">
                                                                #{bkuInfo.noUrut}
                                                              </td>
                                                              <td className="py-2 px-3 text-[10px] font-bold text-slate-700 whitespace-nowrap">
                                                                {bkuInfo.bulanBku}
                                                              </td>
                                                              <td className="py-2 px-3 text-[10px] font-mono font-bold text-slate-600 whitespace-nowrap">
                                                                {formatTanggal(tx.tanggal)}
                                                              </td>
                                                              <td className="py-2 px-3 whitespace-nowrap">
                                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                                                  tx.jenis === 'LS' ? 'bg-blue-100 text-blue-700' :
                                                                  tx.jenis === 'GU' ? 'bg-emerald-100 text-emerald-700' :
                                                                  'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                  {tx.jenis}
                                                                </span>
                                                              </td>
                                                              <td className="py-2 px-3 text-slate-800 text-[11px] font-medium leading-tight">
                                                                <div>{rincianText}</div>
                                                                {tx.penerima_nama && (
                                                                  <span className="text-[9px] text-slate-400 block font-bold mt-0.5">Penerima: {tx.penerima_nama}</span>
                                                                )}
                                                              </td>
                                                              <td className="py-2 px-3 text-right font-black font-mono text-slate-900 whitespace-nowrap">
                                                                {formatRupiah(tx.jumlah)}
                                                              </td>
                                                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                                                <button
                                                                  type="button"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    navigate('/pengeluaran', {
                                                                      state: {
                                                                        searchKeyword: tx.pengeluaran_rincian?.[0]?.uraian || tx.keterangan || rincianText,
                                                                        highlightTxId: String(tx.id)
                                                                      }
                                                                    })
                                                                  }}
                                                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-md text-[10px] font-extrabold transition-all shadow-xs cursor-pointer group"
                                                                  title="Loncat ke Halaman Pengeluaran untuk transaksi ini"
                                                                >
                                                                  <span>Buka</span>
                                                                  <ExternalLink size={10} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                                </button>
                                                              </td>
                                                            </tr>
                                                          )
                                                        })}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
          </div>
        )}
      </Card>

      {/* Rekap Pengeluaran Bulanan (GU & LS) - Dikebawahkan */}
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

      {/* Tabel Monitoring RAK Bulanan Kumulatif */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <span className="w-1 h-4 bg-indigo-600 rounded-full" />
              Monitoring Rencana Anggaran Kas (RAK) Kumulatif
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-3">
              Akumulasi Rencana Penarikan Kas vs Pengeluaran Riil Seluruh Sub Kegiatan
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold whitespace-nowrap">s.d. Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="text-xs font-black text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {INDO_MONTHS.map((m, idx) => (
                <option key={idx} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {rakMonitoringData.length === 0 ? (
           <EmptyState message="Belum ada data anggaran kas" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Sub Kegiatan</th>
                  <th className="py-3 px-4 text-right">Target RAK Kumulatif</th>
                  <th className="py-3 px-4 text-right">Realisasi Belanja</th>
                  <th className="py-3 px-4 text-right">Sisa Kuota RAK</th>
                  <th className="py-3 px-4 text-center w-48">Persentase & Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                {rakMonitoringData.map(item => {
                  const isOver = item.sisa < 0
                  const isExpanded = !!expandedRakSk[item.id]
                  const statusText = 
                    item.persen > 100 ? 'Over-Limit' :
                    item.persen >= 90 ? 'Kritis' :
                    item.persen >= 50 ? 'Optimal' :
                    item.persen > 0 ? 'Rendah' : 'Belum Ada'

                  const badgeVariant =
                    item.persen > 100 ? 'danger' :
                    item.persen >= 90 ? 'warning' :
                    item.persen >= 50 ? 'success' : 'default'

                  return (
                    <Fragment key={item.id}>
                      <tr 
                        className={`hover:bg-slate-50/80 transition-all cursor-pointer ${isExpanded ? 'bg-indigo-50/30' : ''}`}
                        onClick={() => toggleExpandRakSk(item.id)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`text-slate-400 transition-transform shrink-0 ${isExpanded ? 'rotate-90 text-indigo-600 font-bold' : ''}`}>
                              <ChevronRight size={14} />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-mono text-slate-400 font-bold block mb-0.5">{item.kode}</span>
                              <span className="text-slate-800 text-xs font-black uppercase truncate block">{item.nama}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-900 font-black font-mono">
                          {formatRupiah(item.targetRak)}
                        </td>
                        <td className="py-3 px-4 text-right text-indigo-600 font-black font-mono">
                          {formatRupiah(item.realisasi)}
                        </td>
                        <td className={`py-3 px-4 text-right font-black font-mono ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatRupiah(item.sisa)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mb-0.5">
                              <Badge variant={badgeVariant}>{statusText}</Badge>
                              <span className={`font-mono font-black ${isOver ? 'text-rose-600' : 'text-slate-600'}`}>
                                {item.persen}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  item.persen > 100 ? 'bg-rose-500 animate-pulse' :
                                  item.persen >= 90 ? 'bg-amber-500' :
                                  item.persen >= 50 ? 'bg-emerald-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${Math.min(100, item.persen)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={5} className="p-0 border-t border-b border-slate-200/50 bg-slate-50/15">
                            <div className="px-6 py-4 border-l-4 border-indigo-600 bg-slate-50/20 space-y-3">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-200/40">
                                Rincian Kode Rekening Belanja
                              </div>
                              <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white shadow-sm">
                                <table className="w-full text-left text-[11px] text-slate-600 border-collapse min-w-[700px]">
                                  <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                      <th className="py-2.5 px-4 text-left">Kode & Uraian Rekening</th>
                                      <th className="py-2.5 px-4 text-right w-36">Target RAK Kumulatif</th>
                                      <th className="py-2.5 px-4 text-right w-36">Realisasi Belanja</th>
                                      <th className="py-2.5 px-4 text-right w-36">Sisa Kuota RAK</th>
                                      <th className="py-2.5 px-4 text-center w-48">Penyerapan</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                                    {item.rekening.map(rek => {
                                      const rekOver = rek.sisa < 0
                                      const rekStatusText = 
                                        rek.persen > 100 ? 'Over-Limit' :
                                        rek.persen >= 90 ? 'Kritis' :
                                        rek.persen >= 50 ? 'Optimal' :
                                        rek.persen > 0 ? 'Rendah' : 'Belum Ada'

                                      const rekBadgeVariant =
                                        rek.persen > 100 ? 'danger' :
                                        rek.persen >= 90 ? 'warning' :
                                        rek.persen >= 50 ? 'success' : 'default'

                                      return (
                                        <tr key={rek.id} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="py-2.5 px-4">
                                            <div className="flex flex-col">
                                              <span className="font-mono text-[9px] text-slate-400 font-bold block mb-0.5">{item.kode}.{rek.kode}</span>
                                              <span className="text-slate-800 text-xs font-black uppercase leading-tight line-clamp-1" title={rek.uraian}>{rek.uraian}</span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-4 text-right text-slate-900 font-black font-mono">
                                            {formatRupiah(rek.targetRak)}
                                          </td>
                                          <td className="py-2.5 px-4 text-right text-indigo-600 font-black font-mono">
                                            {formatRupiah(rek.realisasi)}
                                          </td>
                                          <td className={`py-2.5 px-4 text-right font-black font-mono ${rekOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {formatRupiah(rek.sisa)}
                                          </td>
                                          <td className="py-2.5 px-4">
                                            <div className="space-y-1 max-w-[160px] mx-auto">
                                              <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 mb-0.5">
                                                <Badge variant={rekBadgeVariant}>{rekStatusText}</Badge>
                                                <span className={`font-mono font-black ${rekOver ? 'text-rose-600' : 'text-slate-600'}`}>{rek.persen}%</span>
                                              </div>
                                              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                                <div
                                                  className={`h-full rounded-full transition-all ${
                                                    rek.persen > 100 ? 'bg-rose-500' :
                                                    rek.persen >= 90 ? 'bg-amber-500' :
                                                    rek.persen >= 50 ? 'bg-emerald-500' : 'bg-indigo-500'
                                                  }`}
                                                  style={{ width: `${Math.min(100, rek.persen)}%` }}
                                                />
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

