import React, { useEffect, useState, useMemo } from 'react'
import { FileText, Download, Calendar, Printer, GripVertical, ChevronDown, ChevronRight, Lock, Unlock } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'

import { useStore } from '@/store/useStore'
import { formatRupiah, formatTanggal } from '@/lib/format'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import { exportBKUPdf, exportBKUSubKegPdf, exportBAPemeriksaanKasPdf, exportBukuPembantuPdf, exportRealisasiPdf, exportRekapBulananPdf, exportLPJAdministratifPdf, exportLPJPeriodePdf, exportBukuPembantuPajakPdf, exportBukuSimpananBankPdf, exportRegisterKasPdf, exportRPPUAPdf, exportRPPUPPdf, exportBAPenutupanKasPdf, terbilang } from '@/lib/export-pdf'
import { exportBKUExcel, exportRealisasiExcel } from '@/lib/export-excel'
import { getBkuRows } from '@/lib/bku'
import logoJabar from '@/assets/logo-jabar.png'

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

// Sortable Row Component
function SortableRow({ r, i, formatTanggal, formatRupiah, isSelected, onToggleSelect, isDragEnabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: r.id, disabled: !isDragEnabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: isDragging ? 'relative' : 'static',
  }

  return (
    <tr 
      ref={setNodeRef} 
      style={style} 
      className={`hover:bg-indigo-50/30 transition-colors group ${isDragging ? 'bg-indigo-50 shadow-2xl scale-[1.01]' : ''} ${isSelected ? 'bg-indigo-50/50' : ''}`}
    >
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <input 
            type="checkbox" 
            checked={isSelected}
            onChange={() => onToggleSelect(r.id)}
            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          {isDragEnabled ? (
            <button 
              {...attributes} 
              {...listeners} 
              className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-indigo-600 transition-colors"
              title="Geser untuk mengatur urutan"
            >
              <GripVertical size={14} />
            </button>
          ) : (
            <div className="p-1 text-slate-200 cursor-not-allowed" title="Aktifkan Urut Manual untuk memindahkan">
              <GripVertical size={14} />
            </div>
          )}
          <span className="text-[10px] text-slate-400 font-bold w-4">{i + 1}</span>
        </div>
      </td>
      <td className="px-3 py-3 text-[11px] text-slate-600 font-bold text-center">{formatTanggal(r.tanggal)}</td>
      <td className="px-3 py-3">
        {r.kode_rekening && (
          <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 group-hover:border-indigo-200 group-hover:text-indigo-600 transition-colors">
            {r.kode_rekening}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-[11px] text-slate-800 font-medium leading-tight break-words">
          {r.uraian}
        </div>
      </td>
      <td className="px-4 py-3 text-right text-emerald-600 font-black text-xs">
        {r.debet > 0 ? formatRupiah(r.debet).replace('Rp', '').trim() : ''}
      </td>
      <td className="px-4 py-3 text-right text-red-600 font-black text-xs">
        {r.kredit > 0 ? formatRupiah(r.kredit).replace('Rp', '').trim() : ''}
      </td>
    </tr>
  )
}

/**
 * [HALAMAN: LAPORAN]
 * Modul pusat untuk mencetak seluruh laporan keuangan (BKU, BA Kas, Register Kas, dll).
 * Mendukung fitur:
 * 1. Filter periode (Bulan & Tahun).
 * 2. Pratinjau (Preview) UI yang responsif.
 * 3. Ekspor PDF (Native & jsPDF) dan Excel.
 * 4. Pengaturan urutan baris BKU (Drag & Drop).
 */
export default function Laporan() {
  const subKegiatan = useStore(s => s.subKegiatan)
  const penerimaan = useStore(s => s.penerimaan)
  const pengeluaran = useStore(s => s.pengeluaran)
  const isLoading = useStore(s => s.isLoading)
  const fetchSubKegiatan = useStore(s => s.fetchSubKegiatan)
  const fetchPenerimaan = useStore(s => s.fetchPenerimaan)
  const fetchPengeluaran = useStore(s => s.fetchPengeluaran)
  const updateBkuUrutan = useStore(s => s.updateBkuUrutan)

  const [tab, setTab] = useState('bku')
  const [filterBulan, setFilterBulan] = useState(new Date().getMonth())
  const [filterTahun, setFilterTahun] = useState(new Date().getFullYear())
  const [tipeLaporan, setTipeLaporan] = useState('akhir') // 'akhir' atau 'pertengahan'
  const [customDates, setCustomDates] = useState({
    akhir: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    pertengahan: new Date().toISOString().split('T')[0]
  })
  const [collapsedSk, setCollapsedSk] = useState({})
  const [penerimaanCollapsed, setPenerimaanCollapsed] = useState(true)
  const [pengeluaranCollapsed, setPengeluaranCollapsed] = useState(true)
  const [showFullLs, setShowFullLs] = useState(true)
  const [showFullGu, setShowFullGu] = useState(true)
  const [isDragEnabled, setIsDragEnabled] = useState(false)
  const [cashUnits, setCashUnits] = useState({
    kertas_100k: 0, kertas_50k: 0, kertas_20k: 0, kertas_10k: 0, kertas_5k: 0, kertas_2k: 0, kertas_1k: 0, kertas_500: 0,
    logam_1000: 0, logam_500: 0, logam_200: 0, logam_100: 0, logam_50: 0, logam_25: 0
  })

  const toggleSk = (skId) => {
    setCollapsedSk(prev => ({
      ...prev,
      [skId]: !prev[skId]
    }))
  }

  // Selection State
  const [selectedIds, setSelectedIds] = useState([])

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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

  // Local state for BKU rows to allow instant UI updates during drag
  const [localBku, setLocalBku] = useState([])

  useEffect(() => {
    setLocalBku(filteredBku)
    setSelectedIds([]) // Reset selection when filter changes
    
    // Update end of month date when filter changes
    const lastDay = new Date(filterTahun, filterBulan + 1, 0).toISOString().split('T')[0]
    setCustomDates(prev => ({ ...prev, akhir: lastDay }))
  }, [filteredBku, filterBulan, filterTahun])

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === localBku.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(localBku.map(r => r.id))
    }
  }

  async function handleDragEnd(event) {
    if (!isDragEnabled) return
    const { active, over } = event
    if (!over) return

    if (active.id !== over.id) {
      const isPartOfSelection = selectedIds.includes(active.id)
      const overIndex = localBku.findIndex(r => r.id === over.id)
      
      let newRows = [...localBku]
      
      if (isPartOfSelection) {
        // Move all selected items
        const selectedItems = localBku.filter(r => selectedIds.includes(r.id))
        const remainingItems = localBku.filter(r => !selectedIds.includes(r.id))
        
        // Find new index in the remaining items list
        const adjustedOverIndex = remainingItems.findIndex(r => r.id === over.id)
        
        // Splice selected items into the remaining list
        remainingItems.splice(adjustedOverIndex, 0, ...selectedItems)
        newRows = remainingItems
      } else {
        // Just move the single item
        const oldIndex = localBku.findIndex(r => r.id === active.id)
        newRows = arrayMove(localBku, oldIndex, overIndex)
      }

      setLocalBku(newRows)

      // Sync to database
      const updatePayload = newRows.map((row, index) => ({
        id: row.id,
        urutan: index + 1,
        type: row.type
      }))
      
      await updateBkuUrutan(updatePayload)
    }
  }

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

  const bkuCalculations = useMemo(() => {
    const totalDebetIni = localBku.reduce((sum, r) => sum + (r.debet || 0), 0)
    const totalKreditIni = localBku.reduce((sum, r) => sum + (r.kredit || 0), 0)
    
    const totalDebetLalu = totalsBulanLalu.debet || 0
    const totalKreditLalu = totalsBulanLalu.kredit || 0

    const totalDebetSemua = totalDebetIni + totalDebetLalu
    const totalKreditSemua = totalKreditIni + totalKreditLalu

    const saldo = totalDebetSemua - totalKreditSemua
    
    const lastDay = new Date(filterTahun, filterBulan + 1, 0).getDate()
    const monthName = BULAN[filterBulan]

    return {
      totalDebetIni,
      totalKreditIni,
      totalDebetLalu,
      totalKreditLalu,
      totalDebetSemua,
      totalKreditSemua,
      saldo,
      lastDay,
      monthName
    }
  }, [localBku, totalsBulanLalu, filterBulan, filterTahun])

  const registerKasData = useMemo(() => {
    const relevantRows = bkuRows.filter(r => {
      const d = new Date(r.tanggal)
      return d.getFullYear() < filterTahun || (d.getFullYear() === filterTahun && d.getMonth() <= filterBulan)
    })
    const sortedRows = [...relevantRows].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
    const firstRow = sortedRows[0]
    const startDateText = firstRow ? formatTanggal(firstRow.tanggal) : `01 Januari ${filterTahun}`
    
    return {
      startDateText,
      totalDebetIni: bkuCalculations.totalDebetIni,
      totalKreditIni: bkuCalculations.totalKreditIni,
      totalDebetSemua: bkuCalculations.totalDebetSemua,
      totalKreditSemua: bkuCalculations.totalKreditSemua,
      saldo: bkuCalculations.saldo,
      month: filterBulan + 1,
      year: filterTahun
    }
  }, [bkuRows, bkuCalculations, filterBulan, filterTahun])

  const registerKasCalcs = useMemo(() => {
    const paperDenoms = [
      { d: 100000, k: 'kertas_100k', label: '100.000' }, { d: 50000, k: 'kertas_50k', label: '50.000' }, 
      { d: 20000, k: 'kertas_20k', label: '20.000' }, { d: 10000, k: 'kertas_10k', label: '10.000' }, 
      { d: 5000, k: 'kertas_5k', label: '5.000' }, { d: 2000, k: 'kertas_2k', label: '2.000' }, 
      { d: 1000, k: 'kertas_1k', label: '1.000' }, { d: 500, k: 'kertas_500', label: '500' }
    ]
    const coinDenoms = [
      { d: 1000, k: 'logam_1000', label: '1.000' }, { d: 500, k: 'logam_500', label: '500' }, 
      { d: 200, k: 'logam_200', label: '200' }, { d: 100, k: 'logam_100', label: '100' }, 
      { d: 50, k: 'logam_50', label: '50' }, { d: 25, k: 'logam_25', label: '25' }
    ]
    const sumPaper = paperDenoms.reduce((acc, item) => acc + ((cashUnits[item.k] || 0) * item.d), 0)
    const sumCoin = coinDenoms.reduce((acc, item) => acc + ((cashUnits[item.k] || 0) * item.d), 0)
    const totalCash = sumPaper + sumCoin
    const item3Balance = registerKasData.saldo - totalCash
    return { sumPaper, sumCoin, totalCash, item3Balance, paperDenoms, coinDenoms }
  }, [cashUnits, registerKasData])

  const nonPajakBkuRows = useMemo(() => {
    return bkuRows.filter(r => {
      return !(r.jenis === 'Pajak' || r.jenis === 'Pajak LS' || r.jenis === 'Setoran Pajak' || r.kode_rekening === 'Pajak')
    })
  }, [bkuRows])

  const bankTotalsBulanLalu = useMemo(() => {
    const pastRows = nonPajakBkuRows.filter(r => {
      const d = new Date(r.tanggal)
      return d.getFullYear() < filterTahun || (d.getFullYear() === filterTahun && d.getMonth() < filterBulan)
    })
    return pastRows.reduce((acc, r) => {
      acc.debet += r.debet || 0
      acc.kredit += r.kredit || 0
      return acc
    }, { debet: 0, kredit: 0 })
  }, [nonPajakBkuRows, filterBulan, filterTahun])

  const filteredBankBku = useMemo(() => {
    return localBku.filter(r => {
      return !(r.jenis === 'Pajak' || r.jenis === 'Pajak LS' || r.jenis === 'Setoran Pajak' || r.kode_rekening === 'Pajak')
    })
  }, [localBku])

  const pajakBkuRows = useMemo(() => {
    return bkuRows.filter(r => {
      return r.jenis === 'Pajak' || r.jenis === 'Pajak LS' || r.jenis === 'Setoran Pajak'
    })
  }, [bkuRows])

  const filteredPajakBku = useMemo(() => {
    return pajakBkuRows.filter(r => {
      const d = new Date(r.tanggal)
      return d.getMonth() === filterBulan && d.getFullYear() === filterTahun
    })
  }, [pajakBkuRows, filterBulan, filterTahun])

  const pajakTotalsBulanLalu = useMemo(() => {
    return pajakBkuRows.filter(r => {
      const d = new Date(r.tanggal)
      return d.getFullYear() === filterTahun && d.getMonth() < filterBulan
    }).reduce((acc, r) => {
      acc.debet += r.debet || 0
      acc.kredit += r.kredit || 0
      return acc
    }, { debet: 0, kredit: 0 })
  }, [pajakBkuRows, filterBulan, filterTahun])

  const pajakCalculations = useMemo(() => {
    const debetIni = filteredPajakBku.reduce((s, r) => s + (r.debet || 0), 0)
    const kreditIni = filteredPajakBku.reduce((s, r) => s + (r.kredit || 0), 0)
    const debetLalu = pajakTotalsBulanLalu.debet
    const kreditLalu = pajakTotalsBulanLalu.kredit
    const debetSemua = debetIni + debetLalu
    const kreditSemua = kreditIni + kreditLalu
    const saldo = debetSemua - kreditSemua

    const monthName = BULAN[filterBulan] || ''
    const lastDay = new Date(filterTahun, filterBulan + 1, 0).getDate()

    return {
      debetIni,
      kreditIni,
      debetLalu,
      kreditLalu,
      debetSemua,
      kreditSemua,
      saldo,
      monthName,
      lastDay
    }
  }, [filteredPajakBku, pajakTotalsBulanLalu, filterBulan, filterTahun])


  const realisasiPerRek = useMemo(() => {
    const map = {}
    pengeluaran.forEach(p => {
      if (new Date(p.tanggal).getFullYear() === filterTahun) {
        map[p.kode_rekening_id] = (map[p.kode_rekening_id] ?? 0) + p.jumlah
      }
    })
    return map
  }, [pengeluaran, filterTahun])

  const realisasiLpj = useMemo(() => {
    return subKegiatan.map(sk => {
      let skPagu = 0
      let skLsLalu = 0
      let skLsIni = 0
      let skLsSd = 0
      let skGuLalu = 0
      let skGuIni = 0
      let skGuSd = 0
      let skTotalReal = 0
      
      const rekenings = (sk.kode_rekening ?? []).map(rek => {
        const rp = pengeluaran.filter(p => p.kode_rekening_id === rek.id)
        
        // LS Lalu
        const lsLalu = rp.filter(p => 
          p.jenis === 'LS' && 
          new Date(p.tanggal).getFullYear() === filterTahun && 
          new Date(p.tanggal).getMonth() < filterBulan
        ).reduce((s, p) => s + p.jumlah, 0)

        // LS Ini
        const lsIni = rp.filter(p => 
          p.jenis === 'LS' && 
          new Date(p.tanggal).getFullYear() === filterTahun && 
          new Date(p.tanggal).getMonth() === filterBulan
        ).reduce((s, p) => s + p.jumlah, 0)

        const lsSd = lsLalu + lsIni

        // GU Lalu
        const guLalu = rp.filter(p => 
          ['GU', 'UP', 'TU', 'KKPD'].includes(p.jenis) && 
          new Date(p.tanggal).getFullYear() === filterTahun && 
          new Date(p.tanggal).getMonth() < filterBulan
        ).reduce((s, p) => s + p.jumlah, 0)

        // GU Ini
        const guIni = rp.filter(p => 
          ['GU', 'UP', 'TU', 'KKPD'].includes(p.jenis) && 
          new Date(p.tanggal).getFullYear() === filterTahun && 
          new Date(p.tanggal).getMonth() === filterBulan
        ).reduce((s, p) => s + p.jumlah, 0)

        const guSd = guLalu + guIni

        const totalReal = lsSd + guSd
        const sisa = (rek.pagu_anggaran ?? 0) - totalReal
        const belanjaBulanIni = lsIni + guIni

        skPagu += (rek.pagu_anggaran ?? 0)
        skLsLalu += lsLalu
        skLsIni += lsIni
        skLsSd += lsSd
        skGuLalu += guLalu
        skGuIni += guIni
        skGuSd += guSd
        skTotalReal += totalReal

        return {
          ...rek,
          lsLalu,
          lsIni,
          lsSd,
          guLalu,
          guIni,
          guSd,
          totalReal,
          sisa,
          belanjaBulanIni
        }
      })

      const skSisa = skPagu - skTotalReal

      return {
        ...sk,
        rekenings,
        pagu: skPagu,
        lsLalu: skLsLalu,
        lsIni: skLsIni,
        lsSd: skLsSd,
        guLalu: skGuLalu,
        guIni: skGuIni,
        guSd: skGuSd,
        totalReal: skTotalReal,
        sisa: skSisa
      }
    })
  }, [subKegiatan, pengeluaran, filterBulan, filterTahun])

  const grandTotalsLpj = useMemo(() => {
    let pagu = 0
    let lsLalu = 0
    let lsIni = 0
    let lsSd = 0
    let guLalu = 0
    let guIni = 0
    let guSd = 0
    let totalReal = 0
    let sisa = 0

    realisasiLpj.forEach(sk => {
      pagu += sk.pagu || 0
      lsLalu += sk.lsLalu || 0
      lsIni += sk.lsIni || 0
      lsSd += sk.lsSd || 0
      guLalu += sk.guLalu || 0
      guIni += sk.guIni || 0
      guSd += sk.guSd || 0
      totalReal += sk.totalReal || 0
      sisa += sk.sisa || 0
    })

    return {
      pagu,
      lsLalu,
      lsIni,
      lsSd,
      guLalu,
      guIni,
      guSd,
      totalReal,
      sisa
    }
  }, [realisasiLpj])

  const lpjSummary = useMemo(() => {
    const midDate = new Date(customDates.pertengahan); midDate.setHours(23, 59, 59, 999);
    const endDate = new Date(customDates.akhir); endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(filterTahun, filterBulan, 1);

    const filterByTime = (items, timeKey) => items.filter(p => {
      const d = new Date(p.tanggal)
      if (timeKey === 'lalu') return d < startDate
      if (timeKey === 'p1') return d >= startDate && d <= midDate
      if (timeKey === 'p2') return d > midDate && d <= endDate
      return false
    })

    const sumJ = (items) => items.reduce((s, p) => s + p.jumlah, 0)
    const sumP = (items, jenisList, timeKey) => {
      const list = items.filter(p => jenisList.includes(p.jenis))
      return sumJ(filterByTime(list, timeKey))
    }

    const getPenerimaanAgg = (jenisList) => {
      const lalu = sumP(penerimaan, jenisList, 'lalu')
      const p1 = sumP(penerimaan, jenisList, 'p1')
      const p2 = sumP(penerimaan, jenisList, 'p2')
      return { lalu, p1, p2, ini: p1 + p2, sd: lalu + p1 + p2 }
    }

    const penLS = getPenerimaanAgg(['LS'])
    const penGU = getPenerimaanAgg(['UP', 'GU', 'TU', 'KKPD'])
    const upPen = getPenerimaanAgg(['UP'])
    const guPen = getPenerimaanAgg(['GU'])
    const tuPen = getPenerimaanAgg(['TU'])
    const lsPen = getPenerimaanAgg(['LS'])
    const kkpdPen = getPenerimaanAgg(['KKPD'])

    const isTaxFromLS = (p) => (p.jenis === 'Pajak LS' || p.jenis === 'LS' || !!p.no_sp2d || !!p.nomor_ls)

    const getTaxAgg = (regex) => {
      const items = penerimaan.filter(p => (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(p.keterangan || ''))
      const lsItems = items.filter(p => isTaxFromLS(p))
      const guItems = items.filter(p => !isTaxFromLS(p))
      
      const res = (list) => ({
        lalu: sumJ(filterByTime(list, 'lalu')),
        p1: sumJ(filterByTime(list, 'p1')),
        p2: sumJ(filterByTime(list, 'p2')),
        ini: 0, sd: 0
      })
      
      const ls = res(lsItems); ls.ini = ls.p1 + ls.p2; ls.sd = ls.lalu + ls.ini
      const gu = res(guItems); gu.ini = gu.p1 + gu.p2; gu.sd = gu.lalu + gu.ini
      return { ls, gu }
    }

    const taxPPN = getTaxAgg(/PPN/i)
    const taxPPh21 = getTaxAgg(/PPh\s*21/i)
    const taxPPh22 = getTaxAgg(/PPh\s*22/i)
    const taxPPh23 = getTaxAgg(/PPh\s*23/i)
    const taxPPh4 = getTaxAgg(/PPh\s*(?:Pasal\s*)?4/i)

    const taxPenerimaanTotal = {
      ls: {
        lalu: taxPPN.ls.lalu + taxPPh21.ls.lalu + taxPPh22.ls.lalu + taxPPh23.ls.lalu + taxPPh4.ls.lalu,
        ini: taxPPN.ls.ini + taxPPh21.ls.ini + taxPPh22.ls.ini + taxPPh23.ls.ini + taxPPh4.ls.ini,
        sd: taxPPN.ls.sd + taxPPh21.ls.sd + taxPPh22.ls.sd + taxPPh23.ls.sd + taxPPh4.ls.sd
      },
      gu: {
        lalu: taxPPN.gu.lalu + taxPPh21.gu.lalu + taxPPh22.gu.lalu + taxPPh23.gu.lalu + taxPPh4.gu.lalu,
        ini: taxPPN.gu.ini + taxPPh21.gu.ini + taxPPh22.gu.ini + taxPPh23.gu.ini + taxPPh4.gu.ini,
        sd: taxPPN.gu.sd + taxPPh21.gu.sd + taxPPh22.gu.sd + taxPPh23.gu.sd + taxPPh4.gu.sd
      }
    }

    const totalPenerimaan = {
      ls: {
        lalu: penLS.lalu + taxPenerimaanTotal.ls.lalu,
        ini: penLS.ini + taxPenerimaanTotal.ls.ini,
        sd: penLS.sd + taxPenerimaanTotal.ls.sd
      },
      gu: {
        lalu: penGU.lalu + taxPenerimaanTotal.gu.lalu,
        ini: penGU.ini + taxPenerimaanTotal.gu.ini,
        sd: penGU.sd + taxPenerimaanTotal.gu.sd
      }
    }

    const getPengeluaranAgg = (jenisList) => {
      const lalu = sumP(pengeluaran, jenisList, 'lalu')
      const p1 = sumP(pengeluaran, jenisList, 'p1')
      const p2 = sumP(pengeluaran, jenisList, 'p2')
      return { lalu, p1, p2, ini: p1 + p2, sd: lalu + p1 + p2 }
    }

    const pengLS = getPengeluaranAgg(['LS'])
    const pengGU = getPengeluaranAgg(['UP', 'GU', 'TU', 'KKPD'])
    const upPeng = getPengeluaranAgg(['UP'])
    const guPeng = getPengeluaranAgg(['GU'])
    const tuPeng = getPengeluaranAgg(['TU'])
    const lsPeng = getPengeluaranAgg(['LS'])
    const kkpdPeng = getPengeluaranAgg(['KKPD'])

    const getTaxSetoranAgg = (regex) => {
      const items = pengeluaran.filter(p => {
        const u = p.pengeluaran_rincian?.length > 0 ? p.pengeluaran_rincian.map(r => r.uraian).join(', ') : p.keterangan || ''
        return (u.startsWith('Setoran') || u.startsWith('Dibayar') || p.jenis === 'Pajak' || p.jenis === 'Pajak LS') && regex.test(u)
      })
      const lsItems = items.filter(p => isTaxFromLS(p))
      const guItems = items.filter(p => !isTaxFromLS(p))

      const res = (list) => ({
        lalu: sumJ(filterByTime(list, 'lalu')),
        p1: sumJ(filterByTime(list, 'p1')),
        p2: sumJ(filterByTime(list, 'p2')),
        ini: 0, sd: 0
      })

      const ls = res(lsItems); ls.ini = ls.p1 + ls.p2; ls.sd = ls.lalu + ls.ini
      const gu = res(guItems); gu.ini = gu.p1 + gu.p2; gu.sd = gu.lalu + gu.ini
      return { ls, gu }
    }

    const setPPN = getTaxSetoranAgg(/PPN/i)
    const setPPh21 = getTaxSetoranAgg(/PPh\s*21/i)
    const setPPh22 = getTaxSetoranAgg(/PPh\s*22/i)
    const setPPh23 = getTaxSetoranAgg(/PPh\s*23/i)
    const setPPh4 = getTaxSetoranAgg(/PPh\s*(?:Pasal\s*)?4/i)

    const taxPengeluaranTotal = {
      ls: {
        lalu: setPPN.ls.lalu + setPPh21.ls.lalu + setPPh22.ls.lalu + setPPh23.ls.lalu + setPPh4.ls.lalu,
        ini: setPPN.ls.ini + setPPh21.ls.ini + setPPh22.ls.ini + setPPh23.ls.ini + setPPh4.ls.ini,
        sd: setPPN.ls.sd + setPPh21.ls.sd + setPPh22.ls.sd + setPPh23.ls.sd + setPPh4.ls.sd
      },
      gu: {
        lalu: setPPN.gu.lalu + setPPh21.gu.lalu + setPPh22.gu.lalu + setPPh23.gu.lalu + setPPh4.gu.lalu,
        ini: setPPN.gu.ini + setPPh21.gu.ini + setPPh22.gu.ini + setPPh23.gu.ini + setPPh4.gu.ini,
        sd: setPPN.gu.sd + setPPh21.gu.sd + setPPh22.gu.sd + setPPh23.gu.sd + setPPh4.gu.sd
      }
    }

    const totalPengeluaran = {
      ls: {
        lalu: pengLS.lalu + taxPengeluaranTotal.ls.lalu,
        ini: pengLS.ini + taxPengeluaranTotal.ls.ini,
        sd: pengLS.sd + taxPengeluaranTotal.ls.sd
      },
      gu: {
        lalu: pengGU.lalu + taxPengeluaranTotal.gu.lalu,
        ini: pengGU.ini + taxPengeluaranTotal.gu.ini,
        sd: pengGU.sd + taxPengeluaranTotal.gu.sd
      }
    }

    const saldoKasRiil = totalPenerimaan.gu.sd - totalPengeluaran.gu.sd

    return {
      penLS, penGU, upPen, guPen, tuPen, lsPen, kkpdPen,
      taxPPN, taxPPh21, taxPPh22, taxPPh23, taxPPh4, taxPenerimaanTotal, totalPenerimaan,
      pengLS, pengGU, upPeng, guPeng, tuPeng, lsPeng, kkpdPeng,
      setPPN, setPPh21, setPPh22, setPPh23, setPPh4, taxPengeluaranTotal, totalPengeluaran,
      saldoKasRiil
    }
  }, [penerimaan, pengeluaran, filterBulan, filterTahun])

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

  const rppuaCalculations = useMemo(() => {
    let runSaldo = 0; let totalPen = 0; let totalPeng = 0
    rekapBulanan.forEach((r, i) => {
      if (i <= filterBulan) {
        runSaldo += (r.penerimaan || 0) - (r.pengeluaran || 0)
        totalPen += (r.penerimaan || 0)
        totalPeng += (r.pengeluaran || 0)
      }
    })
    return { runSaldo, totalPen, totalPeng }
  }, [rekapBulanan, filterBulan])

  const rekapPajakBulanan = useMemo(() => {
    const taxMap = {
      ppn: /PPN/i,
      pph21: /PPh\s*21/i,
      pph22: /PPh\s*22/i,
      pph23: /PPh\s*23/i,
      pph4: /PPh\s*(?:Pasal\s*)?4/i
    }
    return BULAN.map((nama, i) => {
      const monthlyRows = pajakBkuRows.filter(r => {
        const d = new Date(r.tanggal)
        return d.getMonth() === i && d.getFullYear() === filterTahun
      })
      const obj = { bulan: nama, pph21: 0, pph22: 0, pph23: 0, ppn: 0, pph4: 0, totalPen: 0, penyetoran: 0 }
      monthlyRows.forEach(r => {
        const desc = r.uraian || ''
        if ((r.debet || 0) > 0) {
          if (taxMap.ppn.test(desc)) obj.ppn += r.debet
          else if (taxMap.pph21.test(desc)) obj.pph21 += r.debet
          else if (taxMap.pph22.test(desc)) obj.pph22 += r.debet
          else if (taxMap.pph23.test(desc)) obj.pph23 += r.debet
          else if (taxMap.pph4.test(desc)) obj.pph4 += r.debet
        } else if ((r.kredit || 0) > 0) {
          obj.penyetoran += r.kredit
        }
      })
      obj.totalPen = obj.pph21 + obj.pph22 + obj.pph23 + obj.ppn + obj.pph4
      return obj
    })
  }, [pajakBkuRows, filterTahun])

  const rppupCalculations = useMemo(() => {
    let runSaldo = 0, sum21 = 0, sum22 = 0, sum23 = 0, sumPPN = 0, sum4 = 0, sumTotalPen = 0, sumPaid = 0
    rekapPajakBulanan.forEach((r, i) => {
      if (i <= filterBulan) {
        runSaldo += (r.totalPen || 0) - (r.penyetoran || 0)
        sum21 += (r.pph21 || 0); sum22 += (r.pph22 || 0); sum23 += (r.pph23 || 0)
        sumPPN += (r.ppn || 0); sum4 += (r.pph4 || 0); sumTotalPen += (r.totalPen || 0)
        sumPaid += (r.penyetoran || 0)
      }
    })
    return { runSaldo, sum21, sum22, sum23, sumPPN, sum4, sumTotalPen, sumPaid }
  }, [rekapPajakBulanan, filterBulan])

  const formatLRAValue = (val) => {
    if (val == null || val < 1) return '-'
    return formatRupiah(val)
  }

  const pembantuGroups = useMemo(() => {
    return subKegiatan.flatMap(sk => 
      (sk.kode_rekening ?? []).map(rek => ({
        rekening: rek,
        subKegiatan: sk,
        rows: pengeluaran.filter(p => p.kode_rekening_id === rek.id && new Date(p.tanggal).getFullYear() === filterTahun)
      })).filter(g => g.rows.length > 0)
    )
  }, [subKegiatan, pengeluaran, filterTahun])

  async function handleExportPdf() {
    const customDate = customDates[tipeLaporan]
    if (tab === 'bku') exportBKUPdf(localBku, filterBulan, filterTahun, totalsBulanLalu, customDate)
    else if (tab === 'bank') await exportBukuSimpananBankPdf(filteredBankBku, filterBulan, filterTahun, bankTotalsBulanLalu, customDate)
    else if (tab === 'pajak') await exportBukuPembantuPajakPdf(filteredPajakBku, filterBulan, filterTahun, pajakTotalsBulanLalu, customDate)
    else if (tab === 'pembantu_rek') exportBukuPembantuPdf(pembantuGroups)
    else if (tab === 'lra') exportRealisasiPdf(subKegiatan, realisasiPerRek, filterTahun)
    else if (tab === 'register_kas') exportRegisterKasPdf(registerKasData, cashUnits, filterBulan, filterTahun, customDate)
    else if (tab === 'rppua') exportRPPUAPdf(rekapBulanan, filterBulan, filterTahun, customDate)
    else if (tab === 'rppup') exportRPPUPPdf(rekapPajakBulanan, filterBulan, filterTahun, customDate)
    else if (tab === 'ba_pemeriksaan') await exportBAPemeriksaanKasPdf(filterBulan, filterTahun, bkuCalculations.saldo, customDate)
    else if (tab === 'ba_penutupan') await exportBAPenutupanKasPdf(registerKasData, useStore.getState().settings, customDate)
  }

  function handleExportExcel() {
    if (tab === 'bku') exportBKUExcel(localBku)
    else if (tab === 'bank') exportBKUExcel(filteredBankBku)
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
          { id: 'bank', label: 'Buku Simpanan Bank' },
          { id: 'pajak', label: 'Buku Pembantu Pajak' },
          { id: 'pembantu_rek', label: 'Buku Pembantu Rekening' },
          { id: 'lra', label: 'Realisasi / SPJ' },
          { id: 'register_kas', label: 'Register Kas' },
          { id: 'rppua', label: 'RPPUA' },
          { id: 'rppup', label: 'RPPUP' },
          { id: 'ba_pemeriksaan', label: 'BA Pemeriksaan Kas' },
          { id: 'ba_penutupan', label: 'BA Penutupan Kas' },
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
          {(tab === 'bku' || tab === 'bank' || tab === 'lra' || tab === 'pajak' || tab === 'pembantu_rek' || tab === 'register_kas' || tab === 'rppua' || tab === 'rppup' || tab === 'ba_pemeriksaan' || tab === 'ba_penutupan') && (
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

              <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    name="tipeLaporan"
                    checked={tipeLaporan === 'akhir'}
                    onChange={() => setTipeLaporan('akhir')}
                    className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  Akhir Bulan
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    name="tipeLaporan"
                    checked={tipeLaporan === 'pertengahan'}
                    onChange={() => setTipeLaporan('pertengahan')}
                    className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  Pertengahan Bulan
                </label>
              </div>

              {(tipeLaporan === 'pertengahan' || tipeLaporan === 'akhir' || tab === 'lra') && (
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 transition-all">
                  {(tab === 'lra' || tipeLaporan === 'akhir' || tipeLaporan === 'pertengahan') && <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Tanggal Laporan:</span>}
                  <input
                    type="date"
                    value={customDates[tipeLaporan]}
                    onChange={e => setCustomDates(prev => ({ ...prev, [tipeLaporan]: e.target.value }))}
                    className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
                  />
                </div>
              )}

              {tab === 'bku' && (
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                  <button
                    onClick={() => setIsDragEnabled(!isDragEnabled)}
                    className={`flex items-center gap-1.5 text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-tighter ring-1 transition-all duration-200 active:scale-95 select-none ${
                      isDragEnabled 
                        ? 'bg-emerald-50 text-emerald-600 ring-emerald-200 hover:bg-emerald-100' 
                        : 'bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isDragEnabled ? <Unlock size={12} /> : <Lock size={12} />}
                    <span>{isDragEnabled ? 'Urut Manual: AKTIF' : 'Urut Manual: TERKUNCI'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {false && (
            <div className="flex items-center gap-2"></div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {tab === 'bku' && (
            <Button 
              variant="primary" 
              onClick={() => {
                const customDate = customDates[tipeLaporan]
                exportBKUSubKegPdf(localBku, filterBulan, filterTahun, totalsBulanLalu, subKegiatan, customDate)
              }}
              className="h-[42px] px-5 rounded-full group flex items-center justify-center gap-2.5 font-semibold shadow-md shadow-indigo-600/20 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 hover:scale-[1.03]"
            >
              <Printer size={15} className="group-hover:scale-110 transition-transform text-white opacity-90 flex-shrink-0" />
              <div className="flex flex-col items-start text-left leading-[1.1]">
                <span className="text-[11px] font-bold text-white tracking-tight">Cetak</span>
                <span className="text-[9px] font-semibold tracking-wider text-indigo-100 uppercase whitespace-nowrap">BKU-SubKeg</span>
              </div>
            </Button>
          )}

          {tab === 'lra' && (
            <>
              <Button 
                variant="primary" 
                onClick={() => exportLPJAdministratifPdf(filterBulan, filterTahun, subKegiatan, pengeluaran, penerimaan, customDates[tipeLaporan])}
                className="h-[42px] px-5 rounded-full group flex items-center justify-center gap-2.5 font-semibold shadow-md shadow-indigo-600/20 transition-all duration-300 hover:scale-[1.03]"
              >
                <Printer size={15} className="group-hover:scale-110 transition-transform text-white opacity-90 flex-shrink-0" />
                <div className="flex flex-col items-start text-left leading-[1.1]">
                  <span className="text-[11px] font-bold text-white tracking-tight">Cetak</span>
                  <span className="text-[9px] font-semibold tracking-wider text-indigo-100 uppercase whitespace-nowrap">LPJ F4</span>
                </div>
              </Button>
              
              <Button 
                variant="primary" 
                onClick={() => exportLPJPeriodePdf(filterBulan, filterTahun, subKegiatan, pengeluaran, penerimaan, customDates.pertengahan, customDates.akhir)}
                className="h-[42px] px-5 rounded-full group flex items-center justify-center gap-2.5 font-semibold shadow-md shadow-indigo-600/20 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 hover:scale-[1.03]"
              >
                <Printer size={15} className="group-hover:scale-110 transition-transform text-white opacity-90 flex-shrink-0" />
                <div className="flex flex-col items-start text-left leading-[1.1]">
                  <span className="text-[11px] font-bold text-white tracking-tight">Cetak</span>
                  <span className="text-[9px] font-semibold tracking-wider text-indigo-100 uppercase whitespace-nowrap">LPJ Periode</span>
                </div>
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={handleExportExcel} className="h-10 px-4 text-xs font-bold border-slate-200 group">
            <Download size={14} className="mr-2 group-hover:translate-y-0.5 transition-transform" /> Excel
          </Button>
          {tab !== 'lra' && (
            <Button onClick={handleExportPdf} className="h-10 px-6 text-xs font-bold shadow-lg shadow-indigo-600/10 group">
              <Download size={14} className="mr-2 group-hover:translate-y-0.5 transition-transform" /> Export PDF
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <Card className="p-0 overflow-hidden border-slate-200 shadow-xl ring-1 ring-slate-200/50">
        {/* [TAB: BUKU KAS UMUM (BKU)] */}
        {tab === 'bku' && (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-16 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={localBku.length > 0 && selectedIds.length === localBku.length}
                          onChange={toggleSelectAll}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>No</span>
                      </div>
                    </th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24 text-center">Tanggal</th>
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-40">Kode Rekening</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uraian</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-32 text-right">Debet (Rp)</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-32 text-right">Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {localBku.length === 0 ? (
                    <tr><td colSpan={6}><EmptyState message="Tidak ada transaksi di bulan ini" /></td></tr>
                  ) : (
                    <SortableContext
                      items={localBku.map(r => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {localBku.map((r, i) => (
                        <SortableRow 
                          key={r.id} 
                          r={r} 
                          i={i} 
                          formatTanggal={formatTanggal} 
                          formatRupiah={formatRupiah} 
                          isSelected={selectedIds.includes(r.id)}
                          onToggleSelect={toggleSelect}
                          isDragEnabled={isDragEnabled}
                        />
                      ))}
                    </SortableContext>
                  )}
                </tbody>
                {localBku.length > 0 && (
                  <tfoot className="bg-slate-50/80 border-t-2 border-slate-200">
                    <tr className="border-b border-slate-200/60">
                      <td colSpan={4} className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Jumlah Bulan Ini
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-black text-xs">
                        {formatRupiah(bkuCalculations.totalDebetIni).replace('Rp', '').trim()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600 font-black text-xs">
                        {formatRupiah(bkuCalculations.totalKreditIni).replace('Rp', '').trim()}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200/60">
                      <td colSpan={4} className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Jumlah s/d Bulan Lalu
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-black text-xs">
                        {formatRupiah(bkuCalculations.totalDebetLalu).replace('Rp', '').trim()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600 font-black text-xs">
                        {formatRupiah(bkuCalculations.totalKreditLalu).replace('Rp', '').trim()}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200/60">
                      <td colSpan={4} className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Jumlah Semua s/d Tanggal {bkuCalculations.lastDay} {bkuCalculations.monthName} {filterTahun}
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-black text-xs">
                        {formatRupiah(bkuCalculations.totalDebetSemua).replace('Rp', '').trim()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600 font-black text-xs">
                        {formatRupiah(bkuCalculations.totalKreditSemua).replace('Rp', '').trim()}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Saldo Buku
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-black text-xs">
                        -
                      </td>
                      <td className="px-4 py-2.5 text-right text-red-600 font-black text-xs">
                        {formatRupiah(bkuCalculations.saldo).replace('Rp', '').trim()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </DndContext>
          </div>
        )}
        {/* ... (rest of the tabs remain the same) */}


        {tab === 'bank' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-16 text-center">No</th>
                  <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24 text-center">Tanggal</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uraian</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-32 text-right">Debet (Rp)</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-32 text-right">Kredit (Rp)</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-32 text-right">Saldo (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Saldo Awal Row */}
                <tr className="bg-slate-50/30 font-bold text-slate-900 border-b-2 border-slate-200/60">
                  <td className="px-4 py-3 text-center"></td>
                  <td className="px-3 py-3 text-center"></td>
                  <td className="px-4 py-3 text-[11px] italic font-black text-slate-500 uppercase tracking-wider">Saldo Bulan Lalu</td>
                  <td className="px-4 py-3 text-right"></td>
                  <td className="px-4 py-3 text-right"></td>
                  <td className="px-4 py-3 text-right text-xs font-black text-indigo-700">
                    {formatRupiah(bankTotalsBulanLalu.debet - bankTotalsBulanLalu.kredit).replace('Rp', '').trim()}
                  </td>
                </tr>
                
                {filteredBankBku.length === 0 ? (
                  <tr><td colSpan={6}><EmptyState message="Tidak ada transaksi bank di bulan ini" /></td></tr>
                ) : (() => {
                  let running = bankTotalsBulanLalu.debet - bankTotalsBulanLalu.kredit;
                  return filteredBankBku.map((r, i) => {
                    running += (r.debet || 0) - (r.kredit || 0);
                    return (
                      <tr key={r.id} className="hover:bg-indigo-50/20 transition-colors group">
                        <td className="px-4 py-3 text-center text-[10px] text-slate-400 font-bold">{i + 1}</td>
                        <td className="px-3 py-3 text-[11px] text-slate-600 font-bold text-center">{formatTanggal(r.tanggal)}</td>
                        <td className="px-4 py-3 text-[11px] text-slate-800 font-medium">{r.uraian}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-black text-xs">
                          {r.debet > 0 ? formatRupiah(r.debet).replace('Rp', '').trim() : ''}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 font-black text-xs">
                          {r.kredit > 0 ? formatRupiah(r.kredit).replace('Rp', '').trim() : ''}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-900 text-xs bg-slate-50/30 group-hover:bg-indigo-50/50">
                          {formatRupiah(running).replace('Rp', '').trim()}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'pembantu_rek' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  Buku Pembantu Rekening
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Laporan pengeluaran per rincian objek belanja (per kode rekening)</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 shrink-0">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Rekening Aktif</span>
                <span className="text-base font-black text-indigo-700">{pembantuGroups.length} Akun</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pembantuGroups.map((group, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-md transition-all group">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">{group.rekening.kode}</span>
                    <span className="text-xs font-bold text-slate-800 line-clamp-2 min-h-[32px]">{group.rekening.uraian}</span>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Total Belanja</span>
                      <span className="text-sm font-black text-slate-900">{formatRupiah(group.rows.reduce((s, r) => s + (r.jumlah || 0), 0))}</span>
                    </div>
                  </div>
                </div>
              ))}
              {pembantuGroups.length === 0 && <div className="col-span-full"><EmptyState message="Tidak ada rincian belanja di tahun ini" /></div>}
            </div>
          </div>
        )}

        {tab === 'pajak' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  Buku Pembantu Pajak
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Laporan pencatatan penerimaan dan penyetoran pajak bendahara</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 shrink-0">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Saldo Pajak Saat Ini</span>
                <span className="text-base font-black text-indigo-700">{formatRupiah(pajakCalculations.saldo)}</span>
              </div>
            </div>

            {filteredPajakBku.length === 0 ? (
              <EmptyState message="Tidak ada transaksi pajak pada bulan ini" />
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center w-16 border-r border-slate-200">No</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center w-28 border-r border-slate-200">Tanggal</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-200">Uraian</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right w-44 border-r border-slate-200">Penerimaan</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right w-44 border-r border-slate-200">Pengeluaran</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right w-44">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        let runningSaldo = pajakTotalsBulanLalu.debet - pajakTotalsBulanLalu.kredit
                        return filteredPajakBku.map((r, i) => {
                          runningSaldo += (r.debet || 0) - (r.kredit || 0)
                          return (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-3.5 text-center text-xs text-slate-500 font-medium border-r border-slate-100">{i + 1}</td>
                              <td className="px-6 py-3.5 text-center text-xs text-slate-500 font-medium border-r border-slate-100">{formatTanggal(r.tanggal)}</td>
                              <td className="px-6 py-3.5 text-xs text-slate-700 font-medium border-r border-slate-100">{r.uraian}</td>
                              <td className="px-6 py-3.5 text-right text-xs font-bold text-slate-800 border-r border-slate-100">{r.debet > 0 ? formatRupiah(r.debet).replace('Rp', '').trim() : '-'}</td>
                              <td className="px-6 py-3.5 text-right text-xs font-bold text-slate-800 border-r border-slate-100">{r.kredit > 0 ? formatRupiah(r.kredit).replace('Rp', '').trim() : '-'}</td>
                              <td className="px-6 py-3.5 text-right text-xs font-bold text-slate-900">{runningSaldo > 0 ? formatRupiah(runningSaldo).replace('Rp', '').trim() : '-'}</td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-300 font-bold text-slate-900">
                      <tr className="border-b border-slate-200">
                        <td colSpan={3} className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 border-r border-slate-200">Jumlah Bulan Ini</td>
                        <td className="px-6 py-3 text-right text-xs font-black text-slate-800 border-r border-slate-100">{pajakCalculations.debetIni > 0 ? formatRupiah(pajakCalculations.debetIni).replace('Rp', '').trim() : '-'}</td>
                        <td className="px-6 py-3 text-right text-xs font-black text-slate-800 border-r border-slate-100">{pajakCalculations.kreditIni > 0 ? formatRupiah(pajakCalculations.kreditIni).replace('Rp', '').trim() : '-'}</td>
                        <td className="px-6 py-3 text-right text-xs font-bold text-slate-400">-</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td colSpan={3} className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 border-r border-slate-200">Jumlah s/d Bulan Lalu</td>
                        <td className="px-6 py-3 text-right text-xs font-black text-slate-800 border-r border-slate-100">{pajakCalculations.debetLalu > 0 ? formatRupiah(pajakCalculations.debetLalu).replace('Rp', '').trim() : '-'}</td>
                        <td className="px-6 py-3 text-right text-xs font-black text-slate-800 border-r border-slate-100">{pajakCalculations.kreditLalu > 0 ? formatRupiah(pajakCalculations.kreditLalu).replace('Rp', '').trim() : '-'}</td>
                        <td className="px-6 py-3 text-right text-xs font-bold text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 border-r border-slate-200">
                          Jumlah Semua s/d Tanggal {pajakCalculations.lastDay} {pajakCalculations.monthName} {filterTahun}
                        </td>
                        <td className="px-6 py-3 text-right text-xs font-black text-slate-800 border-r border-slate-100">{pajakCalculations.debetSemua > 0 ? formatRupiah(pajakCalculations.debetSemua).replace('Rp', '').trim() : '-'}</td>
                        <td className="px-6 py-3 text-right text-xs font-black text-slate-800 border-r border-slate-100">{pajakCalculations.kreditSemua > 0 ? formatRupiah(pajakCalculations.kreditSemua).replace('Rp', '').trim() : '-'}</td>
                        <td className="px-6 py-3 text-right text-xs font-black text-indigo-700">{pajakCalculations.saldo > 0 ? formatRupiah(pajakCalculations.saldo).replace('Rp', '').trim() : '-'}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'lra' && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse min-w-[1500px]">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th rowSpan={2} className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest align-middle border-r border-slate-200">Kode / Uraian</th>
                  <th rowSpan={2} className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-36 text-right align-middle border-r border-slate-200">Pagu (Rp)</th>
                  <th 
                    colSpan={showFullLs ? 3 : 1} 
                    onClick={() => setShowFullLs(!showFullLs)}
                    className="px-6 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center border-b border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                    title={showFullLs ? "Klik untuk ringkas" : "Klik untuk detail"}
                  >
                    <div className="flex items-center justify-center gap-1">
                      SPJ - LS (Rp)
                      <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${showFullLs ? '' : '-rotate-90'}`} />
                    </div>
                  </th>
                  <th 
                    colSpan={showFullGu ? 3 : 1}
                    onClick={() => setShowFullGu(!showFullGu)}
                    className="px-6 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center border-b border-r border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                    title={showFullGu ? "Klik untuk ringkas" : "Klik untuk detail"}
                  >
                    <div className="flex items-center justify-center gap-1">
                      SPJ - UP/GU (Rp)
                      <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${showFullGu ? '' : '-rotate-90'}`} />
                    </div>
                  </th>
                  <th rowSpan={2} className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-36 text-right align-middle border-r border-slate-200">Total Realisasi</th>
                  <th rowSpan={2} className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-36 text-right align-middle">Sisa Anggaran</th>
                </tr>
                <tr>
                  {showFullLs && <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right border-r border-slate-100">s/d Bln Lalu</th>}
                  <th className={`px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>Bulan Ini</th>
                  {showFullLs && <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right border-r border-slate-200">s/d Bulan Ini</th>}
                  {showFullGu && <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right border-r border-slate-100">s/d Bln Lalu</th>}
                  <th className={`px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>Bulan Ini</th>
                  {showFullGu && <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right border-r border-slate-200">s/d Bulan Ini</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {realisasiLpj.map(sk => {
                  const isCollapsed = !!collapsedSk[sk.id]
                  return (
                    <React.Fragment key={sk.id}>
                      <tr 
                        className="bg-slate-50/40 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                        onClick={() => toggleSk(sk.id)}
                      >
                        <td className="px-6 py-3 font-black text-slate-900 border-r border-slate-200">
                          <div className="flex items-center gap-3">
                            {isCollapsed ? (
                              <ChevronRight size={16} className="text-slate-400 shrink-0" />
                            ) : (
                              <ChevronDown size={16} className="text-slate-400 shrink-0" />
                            )}
                            <div>
                              <p className="text-[10px] text-indigo-600 mb-0.5">{sk.kode}</p>
                              <p className="text-xs">{sk.nama}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right text-xs font-bold text-slate-800 border-r border-slate-200">{formatLRAValue(sk.pagu)}</td>
                        {showFullLs && <td className="px-3 py-3 text-right text-xs font-semibold text-slate-600 border-r border-slate-100">{formatLRAValue(sk.lsLalu)}</td>}
                        <td className={`px-3 py-3 text-right text-xs font-bold text-slate-700 ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(sk.lsIni)}</td>
                        {showFullLs && <td className="px-3 py-3 text-right text-xs font-extrabold text-slate-900 border-r border-slate-200">{formatLRAValue(sk.lsSd)}</td>}
                        {showFullGu && <td className="px-3 py-3 text-right text-xs font-semibold text-slate-600 border-r border-slate-100">{formatLRAValue(sk.guLalu)}</td>}
                        <td className={`px-3 py-3 text-right text-xs font-bold text-slate-700 ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(sk.guIni)}</td>
                        {showFullGu && <td className="px-3 py-3 text-right text-xs font-extrabold text-slate-900 border-r border-slate-200">{formatLRAValue(sk.guSd)}</td>}
                        <td className="px-6 py-3 text-right text-xs font-extrabold text-indigo-700 border-r border-slate-200">{formatLRAValue(sk.totalReal)}</td>
                        <td className="px-6 py-3 text-right text-xs font-extrabold text-emerald-600">{formatLRAValue(sk.sisa)}</td>
                      </tr>
                      {!isCollapsed && (sk.rekenings ?? [])
                        .filter(rek => rek.belanjaBulanIni > 0)
                        .map(rek => (
                          <tr key={rek.id} className="hover:bg-slate-50 transition-colors group border-b border-slate-100">
                            <td className="pl-12 pr-6 py-3 border-r border-slate-200">
                              <p className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-500 transition-colors">{rek.kode}</p>
                              <p className="text-xs text-slate-600 font-medium">{rek.uraian}</p>
                            </td>
                            <td className="px-6 py-3 text-right text-xs text-slate-500 font-medium border-r border-slate-200">{formatLRAValue(rek.pagu_anggaran)}</td>
                            {showFullLs && <td className="px-3 py-3 text-right text-xs text-slate-400 font-medium border-r border-slate-100">{formatLRAValue(rek.lsLalu)}</td>}
                            <td className={`px-3 py-3 text-right text-xs text-slate-600 font-semibold ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(rek.lsIni)}</td>
                            {showFullLs && <td className="px-3 py-3 text-right text-xs text-slate-700 font-bold border-r border-slate-200">{formatLRAValue(rek.lsSd)}</td>}
                            {showFullGu && <td className="px-3 py-3 text-right text-xs text-slate-400 font-medium border-r border-slate-100">{formatLRAValue(rek.guLalu)}</td>}
                            <td className={`px-3 py-3 text-right text-xs text-slate-600 font-semibold ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(rek.guIni)}</td>
                            {showFullGu && <td className="px-3 py-3 text-right text-xs text-slate-700 font-bold border-r border-slate-200">{formatLRAValue(rek.guSd)}</td>}
                            <td className="px-6 py-3 text-right text-xs text-indigo-600/90 font-bold border-r border-slate-200">{formatLRAValue(rek.totalReal)}</td>
                            <td className="px-6 py-3 text-right text-xs text-emerald-600 font-bold">{formatLRAValue(rek.sisa)}</td>
                          </tr>
                        ))}
                    </React.Fragment>
                  )
                })}

                {/* JUMLAH ROW */}
                <tr className="bg-slate-100/95 font-extrabold text-slate-900 border-t-2 border-slate-300">
                  <td className="px-6 py-4 text-xs font-extrabold border-r border-slate-200 text-center">JUMLAH</td>
                  <td className="px-6 py-4 text-right text-xs font-extrabold border-r border-slate-200">{formatLRAValue(grandTotalsLpj.pagu)}</td>
                  {showFullLs && <td className="px-3 py-4 text-right text-xs font-extrabold border-r border-slate-100">{formatLRAValue(grandTotalsLpj.lsLalu)}</td>}
                  <td className={`px-3 py-4 text-right text-xs font-extrabold ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(grandTotalsLpj.lsIni)}</td>
                  {showFullLs && <td className="px-3 py-4 text-right text-xs font-extrabold border-r border-slate-200">{formatLRAValue(grandTotalsLpj.lsSd)}</td>}
                  {showFullGu && <td className="px-3 py-4 text-right text-xs font-extrabold border-r border-slate-100">{formatLRAValue(grandTotalsLpj.guLalu)}</td>}
                  <td className={`px-3 py-4 text-right text-xs font-extrabold ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(grandTotalsLpj.guIni)}</td>
                  {showFullGu && <td className="px-3 py-4 text-right text-xs font-extrabold border-r border-slate-200">{formatLRAValue(grandTotalsLpj.guSd)}</td>}
                  <td className="px-6 py-4 text-right text-xs font-extrabold border-r border-slate-200 text-indigo-800">{formatLRAValue(grandTotalsLpj.totalReal)}</td>
                  <td className="px-6 py-4 text-right text-xs font-extrabold text-emerald-600">{formatLRAValue(grandTotalsLpj.sisa)}</td>
                </tr>

                {/* PENERIMAAN SECTION */}
                <tr 
                  className="bg-indigo-50/40 cursor-pointer hover:bg-indigo-100/50 transition-colors select-none font-bold border-t border-slate-200"
                  onClick={() => setPenerimaanCollapsed(!penerimaanCollapsed)}
                >
                  <td className="px-6 py-3 border-r border-slate-200">
                    <div className="flex items-center gap-3">
                      {penerimaanCollapsed ? (
                        <ChevronRight size={16} className="text-indigo-600 shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-indigo-600 shrink-0" />
                      )}
                      <span className="text-indigo-950 text-xs font-extrabold tracking-wide">PENERIMAAN</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-xs text-slate-500 font-bold border-r border-slate-200">-</td>
                  {showFullLs && <td className="px-3 py-3 text-right text-xs font-bold text-slate-700 border-r border-slate-100">{formatLRAValue(lpjSummary.totalPenerimaan.ls.lalu)}</td>}
                  <td className={`px-3 py-3 text-right text-xs font-bold text-slate-700 ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(lpjSummary.totalPenerimaan.ls.ini)}</td>
                  {showFullLs && <td className="px-3 py-3 text-right text-xs font-extrabold text-slate-900 border-r border-slate-200">{formatLRAValue(lpjSummary.totalPenerimaan.ls.sd)}</td>}
                  {showFullGu && <td className="px-3 py-3 text-right text-xs font-bold text-slate-700 border-r border-slate-100">{formatLRAValue(lpjSummary.totalPenerimaan.gu.lalu)}</td>}
                  <td className={`px-3 py-3 text-right text-xs font-bold text-slate-700 ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(lpjSummary.totalPenerimaan.gu.ini)}</td>
                  {showFullGu && <td className="px-3 py-3 text-right text-xs font-extrabold text-slate-900 border-r border-slate-200">{formatLRAValue(lpjSummary.totalPenerimaan.gu.sd)}</td>}
                  <td className="px-6 py-3 text-right text-xs font-extrabold text-indigo-700 border-r border-slate-200">{formatLRAValue(lpjSummary.totalPenerimaan.ls.sd + lpjSummary.totalPenerimaan.gu.sd)}</td>
                  <td className="px-6 py-3 text-right text-xs font-bold text-slate-500">-</td>
                </tr>

                {!penerimaanCollapsed && (
                  <>
                    {/* SPJ - (LS+UP/GU/TU) */}
                    <tr className="bg-slate-50/20">
                      <td className="pl-10 pr-6 py-2.5 font-bold text-xs text-slate-700 border-r border-slate-200">- SPJ - (LS+UP/GU/TU)</td>
                      <td className="px-6 py-2.5 text-right text-xs text-slate-500 border-r border-slate-200">-</td>
                      {showFullLs && <td className="px-3 py-2.5 text-right text-xs text-slate-600 border-r border-slate-100">{formatLRAValue(lpjSummary.penLS.lalu)}</td>}
                      <td className={`px-3 py-2.5 text-right text-xs text-slate-600 ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(lpjSummary.penLS.ini)}</td>
                      {showFullLs && <td className="px-3 py-2.5 text-right text-xs text-slate-800 font-semibold border-r border-slate-200">{formatLRAValue(lpjSummary.penLS.sd)}</td>}
                      {showFullGu && <td className="px-3 py-2.5 text-right text-xs text-slate-600 border-r border-slate-100">{formatLRAValue(lpjSummary.penGU.lalu)}</td>}
                      <td className={`px-3 py-2.5 text-right text-xs text-slate-600 ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(lpjSummary.penGU.ini)}</td>
                      {showFullGu && <td className="px-3 py-2.5 text-right text-xs text-slate-800 font-semibold border-r border-slate-200">{formatLRAValue(lpjSummary.penGU.sd)}</td>}
                      <td className="px-6 py-2.5 text-right text-xs text-indigo-600 border-r border-slate-200">{formatLRAValue(lpjSummary.penLS.sd + lpjSummary.penGU.sd)}</td>
                      <td className="px-6 py-2.5 text-right text-xs text-slate-500">-</td>
                    </tr>
                    {[
                      { label: '  a. UP', gu: lpjSummary.upPen },
                      { label: '  b. GU', gu: lpjSummary.guPen },
                      { label: '  c. TU', gu: lpjSummary.tuPen },
                      { label: '  d. LS', ls: lpjSummary.lsPen },
                      { label: '  e. KKPD', gu: lpjSummary.kkpdPen }
                    ].map((sub, idx) => (
                      <tr key={`pen-spj-sub-${idx}`} className="hover:bg-slate-50/50">
                        <td className="pl-14 pr-6 py-2 text-xs text-slate-500 border-r border-slate-200">{sub.label}</td>
                        <td className="px-6 py-2 text-right text-xs text-slate-500 border-r border-slate-200">-</td>
                        {showFullLs && <td className="px-3 py-2 text-right text-xs text-slate-400 border-r border-slate-100">{formatLRAValue(sub.ls?.lalu || 0)}</td>}
                        <td className={`px-3 py-2 text-right text-xs text-slate-400 ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(sub.ls?.ini || 0)}</td>
                        {showFullLs && <td className="px-3 py-2 text-right text-xs text-slate-500 border-r border-slate-200">{formatLRAValue(sub.ls?.sd || 0)}</td>}
                        {showFullGu && <td className="px-3 py-2 text-right text-xs text-slate-400 border-r border-slate-100">{formatLRAValue(sub.gu?.lalu || 0)}</td>}
                        <td className={`px-3 py-2 text-right text-xs text-slate-400 ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(sub.gu?.ini || 0)}</td>
                        {showFullGu && <td className="px-3 py-2 text-right text-xs text-slate-500 border-r border-slate-200">{formatLRAValue(sub.gu?.sd || 0)}</td>}
                        <td className="px-6 py-2 text-right text-xs text-slate-500 border-r border-slate-200">{formatLRAValue((sub.ls?.sd || 0) + (sub.gu?.sd || 0))}</td>
                        <td className="px-6 py-2 text-right text-xs text-slate-400">-</td>
                      </tr>
                    ))}

                    {/* Potongan Pajak */}
                    <tr className="bg-slate-50/20 border-t border-slate-200">
                      <td className="pl-10 pr-6 py-2.5 font-bold text-xs text-slate-700 border-r border-slate-200">- Potongan Pajak</td>
                      <td className="px-6 py-2.5 text-right text-xs text-slate-500 border-r border-slate-200">-</td>
                      {showFullLs && <td className="px-3 py-2.5 text-right text-xs text-slate-600 border-r border-slate-100">{formatLRAValue(lpjSummary.taxPenerimaanTotal.ls.lalu)}</td>}
                      <td className={`px-3 py-2.5 text-right text-xs text-slate-600 ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(lpjSummary.taxPenerimaanTotal.ls.ini)}</td>
                      {showFullLs && <td className="px-3 py-2.5 text-right text-xs text-slate-800 font-semibold border-r border-slate-200">{formatLRAValue(lpjSummary.taxPenerimaanTotal.ls.sd)}</td>}
                      {showFullGu && <td className="px-3 py-2.5 text-right text-xs text-slate-600 border-r border-slate-100">{formatLRAValue(lpjSummary.taxPenerimaanTotal.gu.lalu)}</td>}
                      <td className={`px-3 py-2.5 text-right text-xs text-slate-600 ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(lpjSummary.taxPenerimaanTotal.gu.ini)}</td>
                      {showFullGu && <td className="px-3 py-2.5 text-right text-xs text-slate-800 font-semibold border-r border-slate-200">{formatLRAValue(lpjSummary.taxPenerimaanTotal.gu.sd)}</td>}
                      <td className="px-6 py-2.5 text-right text-xs text-indigo-600 border-r border-slate-200">{formatLRAValue(lpjSummary.taxPenerimaanTotal.ls.sd + lpjSummary.taxPenerimaanTotal.gu.sd)}</td>
                      <td className="px-6 py-2.5 text-right text-xs text-slate-500">-</td>
                    </tr>
                    {[
                      { label: '  a. PPN', ls: lpjSummary.taxPPN.ls, gu: lpjSummary.taxPPN.gu },
                      { label: '  b. PPh.- 21', ls: lpjSummary.taxPPh21.ls, gu: lpjSummary.taxPPh21.gu },
                      { label: '  c. PPh.- 22', ls: lpjSummary.taxPPh22.ls, gu: lpjSummary.taxPPh22.gu },
                      { label: '  d. PPh.- 23', ls: lpjSummary.taxPPh23.ls, gu: lpjSummary.taxPPh23.gu },
                      { label: '  e. PPh. Psl 4 (Ayat 2)', ls: lpjSummary.taxPPh4.ls, gu: lpjSummary.taxPPh4.gu }
                    ].map((sub, idx) => (
                      <tr key={`pen-pajak-sub-${idx}`} className="hover:bg-slate-50/50">
                        <td className="pl-14 pr-6 py-2 text-xs text-slate-500 border-r border-slate-200">{sub.label}</td>
                        <td className="px-6 py-2 text-right text-xs text-slate-500 border-r border-slate-200">-</td>
                        {showFullLs && <td className="px-3 py-2 text-right text-xs text-slate-400 border-r border-slate-100">{formatLRAValue(sub.ls?.lalu || 0)}</td>}
                        <td className={`px-3 py-2 text-right text-xs text-slate-400 ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(sub.ls?.ini || 0)}</td>
                        {showFullLs && <td className="px-3 py-2 text-right text-xs text-slate-500 border-r border-slate-200">{formatLRAValue(sub.ls?.sd || 0)}</td>}
                        {showFullGu && <td className="px-3 py-2 text-right text-xs text-slate-400 border-r border-slate-100">{formatLRAValue(sub.gu?.lalu || 0)}</td>}
                        <td className={`px-3 py-2 text-right text-xs text-slate-400 ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(sub.gu?.ini || 0)}</td>
                        {showFullGu && <td className="px-3 py-2 text-right text-xs text-slate-500 border-r border-slate-200">{formatLRAValue(sub.gu?.sd || 0)}</td>}
                        <td className="px-6 py-2 text-right text-xs text-slate-500 border-r border-slate-200">{formatLRAValue((sub.ls?.sd || 0) + (sub.gu?.sd || 0))}</td>
                        <td className="px-6 py-2 text-right text-xs text-slate-400">-</td>
                      </tr>
                    ))}
                  </>
                )}

                {/* PENGELUARAN SECTION */}
                <tr 
                  className="bg-rose-50/40 cursor-pointer hover:bg-rose-100/50 transition-colors select-none font-bold border-t border-slate-200"
                  onClick={() => setPengeluaranCollapsed(!pengeluaranCollapsed)}
                >
                  <td className="px-6 py-3 border-r border-slate-200">
                    <div className="flex items-center gap-3">
                      {pengeluaranCollapsed ? (
                        <ChevronRight size={16} className="text-rose-600 shrink-0" />
                      ) : (
                        <ChevronDown size={16} className="text-rose-600 shrink-0" />
                      )}
                      <span className="text-rose-950 text-xs font-extrabold tracking-wide">PENGELUARAN</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-xs text-slate-500 font-bold border-r border-slate-200">-</td>
                  {showFullLs && <td className="px-3 py-3 text-right text-xs font-bold text-slate-700 border-r border-slate-100">{formatLRAValue(lpjSummary.totalPengeluaran.ls.lalu)}</td>}
                  <td className={`px-3 py-3 text-right text-xs font-bold text-slate-700 ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(lpjSummary.totalPengeluaran.ls.ini)}</td>
                  {showFullLs && <td className="px-3 py-3 text-right text-xs font-extrabold text-slate-900 border-r border-slate-200">{formatLRAValue(lpjSummary.totalPengeluaran.ls.sd)}</td>}
                  {showFullGu && <td className="px-3 py-3 text-right text-xs font-bold text-slate-700 border-r border-slate-100">{formatLRAValue(lpjSummary.totalPengeluaran.gu.lalu)}</td>}
                  <td className={`px-3 py-3 text-right text-xs font-bold text-slate-700 ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(lpjSummary.totalPengeluaran.gu.ini)}</td>
                  {showFullGu && <td className="px-3 py-3 text-right text-xs font-extrabold text-slate-900 border-r border-slate-200">{formatLRAValue(lpjSummary.totalPengeluaran.gu.sd)}</td>}
                  <td className="px-6 py-3 text-right text-xs font-extrabold text-indigo-700 border-r border-slate-200">{formatLRAValue(lpjSummary.totalPengeluaran.ls.sd + lpjSummary.totalPengeluaran.gu.sd)}</td>
                  <td className="px-6 py-3 text-right text-xs font-bold text-slate-500">-</td>
                </tr>

                {!pengeluaranCollapsed && (
                  <>
                    {/* SPJ - (LS+UP/GU/TU) */}
                    <tr className="bg-slate-50/20">
                      <td className="pl-10 pr-6 py-2.5 font-bold text-xs text-slate-700 border-r border-slate-200">- SPJ - (LS+UP/GU/TU)</td>
                      <td className="px-6 py-2.5 text-right text-xs text-slate-500 border-r border-slate-200">-</td>
                      {showFullLs && <td className="px-3 py-2.5 text-right text-xs text-slate-600 border-r border-slate-100">{formatLRAValue(lpjSummary.pengLS.lalu)}</td>}
                      <td className={`px-3 py-2.5 text-right text-xs text-slate-600 ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(lpjSummary.pengLS.ini)}</td>
                      {showFullLs && <td className="px-3 py-2.5 text-right text-xs text-slate-800 font-semibold border-r border-slate-200">{formatLRAValue(lpjSummary.pengLS.sd)}</td>}
                      {showFullGu && <td className="px-3 py-2.5 text-right text-xs text-slate-600 border-r border-slate-100">{formatLRAValue(lpjSummary.pengGU.lalu)}</td>}
                      <td className={`px-3 py-2.5 text-right text-xs text-slate-600 ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(lpjSummary.pengGU.ini)}</td>
                      {showFullGu && <td className="px-3 py-2.5 text-right text-xs text-slate-800 font-semibold border-r border-slate-200">{formatLRAValue(lpjSummary.pengGU.sd)}</td>}
                      <td className="px-6 py-2.5 text-right text-xs text-indigo-600 border-r border-slate-200">{formatLRAValue(lpjSummary.pengLS.sd + lpjSummary.pengGU.sd)}</td>
                      <td className="px-6 py-2.5 text-right text-xs text-slate-500">-</td>
                    </tr>
                    {[
                      { label: '  a. UP', gu: lpjSummary.upPeng },
                      { label: '  b. GU', gu: lpjSummary.guPeng },
                      { label: '  c. TU', gu: lpjSummary.tuPeng },
                      { label: '  d. LS', ls: lpjSummary.lsPeng },
                      { label: '  e. KKPD', gu: lpjSummary.kkpdPeng }
                    ].map((sub, idx) => (
                      <tr key={`peng-spj-sub-${idx}`} className="hover:bg-slate-50/50">
                        <td className="pl-14 pr-6 py-2 text-xs text-slate-500 border-r border-slate-200">{sub.label}</td>
                        <td className="px-6 py-2 text-right text-xs text-slate-500 border-r border-slate-200">-</td>
                        {showFullLs && <td className="px-3 py-2 text-right text-xs text-slate-400 border-r border-slate-100">{formatLRAValue(sub.ls?.lalu || 0)}</td>}
                        <td className={`px-3 py-2 text-right text-xs text-slate-400 ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(sub.ls?.ini || 0)}</td>
                        {showFullLs && <td className="px-3 py-2 text-right text-xs text-slate-500 border-r border-slate-200">{formatLRAValue(sub.ls?.sd || 0)}</td>}
                        {showFullGu && <td className="px-3 py-2 text-right text-xs text-slate-400 border-r border-slate-100">{formatLRAValue(sub.gu?.lalu || 0)}</td>}
                        <td className={`px-3 py-2 text-right text-xs text-slate-400 ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(sub.gu?.ini || 0)}</td>
                        {showFullGu && <td className="px-3 py-2 text-right text-xs text-slate-500 border-r border-slate-200">{formatLRAValue(sub.gu?.sd || 0)}</td>}
                        <td className="px-6 py-2 text-right text-xs text-slate-500 border-r border-slate-200">{formatLRAValue((sub.ls?.sd || 0) + (sub.gu?.sd || 0))}</td>
                        <td className="px-6 py-2 text-right text-xs text-slate-400">-</td>
                      </tr>
                    ))}

                    {/* Penyetoran Pajak */}
                    <tr className="bg-slate-50/20 border-t border-slate-200">
                      <td className="pl-10 pr-6 py-2.5 font-bold text-xs text-slate-700 border-r border-slate-200">- Penyetoran Pajak</td>
                      <td className="px-6 py-2.5 text-right text-xs text-slate-500 border-r border-slate-200">-</td>
                      {showFullLs && <td className="px-3 py-2.5 text-right text-xs text-slate-600 border-r border-slate-100">{formatLRAValue(lpjSummary.taxPengeluaranTotal.ls.lalu)}</td>}
                      <td className={`px-3 py-2.5 text-right text-xs text-slate-600 ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(lpjSummary.taxPengeluaranTotal.ls.ini)}</td>
                      {showFullLs && <td className="px-3 py-2.5 text-right text-xs text-slate-800 font-semibold border-r border-slate-200">{formatLRAValue(lpjSummary.taxPengeluaranTotal.ls.sd)}</td>}
                      {showFullGu && <td className="px-3 py-2.5 text-right text-xs text-slate-600 border-r border-slate-100">{formatLRAValue(lpjSummary.taxPengeluaranTotal.gu.lalu)}</td>}
                      <td className={`px-3 py-2.5 text-right text-xs text-slate-600 ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(lpjSummary.taxPengeluaranTotal.gu.ini)}</td>
                      {showFullGu && <td className="px-3 py-2.5 text-right text-xs text-slate-800 font-semibold border-r border-slate-200">{formatLRAValue(lpjSummary.taxPengeluaranTotal.gu.sd)}</td>}
                      <td className="px-6 py-2.5 text-right text-xs text-indigo-600 border-r border-slate-200">{formatLRAValue(lpjSummary.taxPengeluaranTotal.ls.sd + lpjSummary.taxPengeluaranTotal.gu.sd)}</td>
                      <td className="px-6 py-2.5 text-right text-xs text-slate-500">-</td>
                    </tr>
                    {[
                      { label: '  a. PPN', ls: lpjSummary.setPPN.ls, gu: lpjSummary.setPPN.gu },
                      { label: '  b. PPh.- 21', ls: lpjSummary.setPPh21.ls, gu: lpjSummary.setPPh21.gu },
                      { label: '  c. PPh.- 22', ls: lpjSummary.setPPh22.ls, gu: lpjSummary.setPPh22.gu },
                      { label: '  d. PPh.- 23', ls: lpjSummary.setPPh23.ls, gu: lpjSummary.setPPh23.gu },
                      { label: '  e. PPh. Psl 4 (Ayat 2)', ls: lpjSummary.setPPh4.ls, gu: lpjSummary.setPPh4.gu }
                    ].map((sub, idx) => (
                      <tr key={`peng-pajak-sub-${idx}`} className="hover:bg-slate-50/50">
                        <td className="pl-14 pr-6 py-2 text-xs text-slate-500 border-r border-slate-200">{sub.label}</td>
                        <td className="px-6 py-2 text-right text-xs text-slate-500 border-r border-slate-200">-</td>
                        {showFullLs && <td className="px-3 py-2 text-right text-xs text-slate-400 border-r border-slate-100">{formatLRAValue(sub.ls?.lalu || 0)}</td>}
                        <td className={`px-3 py-2 text-right text-xs text-slate-400 ${showFullLs ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(sub.ls?.ini || 0)}</td>
                        {showFullLs && <td className="px-3 py-2 text-right text-xs text-slate-500 border-r border-slate-200">{formatLRAValue(sub.ls?.sd || 0)}</td>}
                        {showFullGu && <td className="px-3 py-2 text-right text-xs text-slate-400 border-r border-slate-100">{formatLRAValue(sub.gu?.lalu || 0)}</td>}
                        <td className={`px-3 py-2 text-right text-xs text-slate-400 ${showFullGu ? 'border-r border-slate-100' : 'border-r border-slate-200'}`}>{formatLRAValue(sub.gu?.ini || 0)}</td>
                        {showFullGu && <td className="px-3 py-2 text-right text-xs text-slate-500 border-r border-slate-200">{formatLRAValue(sub.gu?.sd || 0)}</td>}
                        <td className="px-6 py-2 text-right text-xs text-slate-500 border-r border-slate-200">{formatLRAValue((sub.ls?.sd || 0) + (sub.gu?.sd || 0))}</td>
                        <td className="px-6 py-2 text-right text-xs text-slate-400">-</td>
                      </tr>
                    ))}
                  </>
                )}

                {/* SALDO KAS ROW */}
                <tr className="bg-indigo-100/60 font-black border-t border-slate-300">
                  <td colSpan={3 + (showFullLs ? 3 : 1) + (showFullGu ? 3 : 1)} className="px-6 py-3.5 text-right text-xs font-black text-indigo-950 border-r border-slate-200">SALDO KAS</td>
                  <td className="px-6 py-3.5 text-right text-xs font-black text-indigo-900">{formatLRAValue(lpjSummary.saldoKasRiil)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* [TAB: REGISTER PENUTUPAN KAS] */}
        {tab === 'register_kas' && (
          <div className="bg-slate-100 min-h-[800px] flex justify-center py-8 px-4 sm:py-16 overflow-x-auto">
            <div className="bg-white shadow-2xl w-[21.5cm] min-h-[33cm] p-[0.8cm] pt-[0.4cm] text-slate-900 relative flex flex-col rounded border border-slate-300/50">
              <div className="absolute top-6 right-6 bg-indigo-600 text-white text-[10px] font-bold px-4 py-2 rounded-xl animate-bounce shadow-lg z-10 flex items-center gap-2 ring-4 ring-indigo-100">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Isi jumlah lembar/keping di sini!
              </div>
              
              <div className="text-center mb-8 space-y-1">
                <h2 className="font-bold text-sm uppercase tracking-wide text-slate-900 font-sans">Badan Pendapatan Daerah Provinsi Jawa Barat</h2>
                <h1 className="font-black text-base uppercase border-b-2 border-slate-900 pb-1.5 inline-block font-sans">Register Penutupan Kas</h1>
              </div>

              <table className="w-full mb-6 text-[11px] font-medium text-slate-700">
                <tbody>
                  <tr><td className="w-60 py-0.5">Tanggal Penutupan Kas</td><td className="w-4 py-0.5">:</td><td className="font-bold text-slate-900">{customDates[tipeLaporan] ? new Date(customDates[tipeLaporan]).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date(filterTahun, filterBulan + 1, 0).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
                  <tr><td className="py-0.5">Nama Penutup Kas</td><td className="py-0.5">:</td><td className="font-bold text-slate-900">{useStore.getState().settings.bpp_nama || '-'}</td></tr>
                  <tr><td className="py-0.5">Tanggal Penutupan Kas yang lalu</td><td className="py-0.5">:</td><td>-</td></tr>
                  <tr><td className="py-0.5">Jumlah Transaksi s/d bulan</td><td className="py-0.5">:</td><td className="font-bold text-slate-900">{BULAN[filterBulan]} {filterTahun}</td></tr>
                </tbody>
              </table>

              <div className="text-[11px] space-y-0.5 mb-6 border-b border-slate-200 pb-4 font-medium">
                <div className="flex items-center py-1 hover:bg-slate-50 rounded px-2 -ml-2 transition-colors">
                  <div className="flex-1 text-slate-600">Jumlah Penerimaan mulai dari <span className="font-bold text-slate-800">{registerKasData.startDateText}</span> s.d <span className="font-bold text-slate-800">{new Date(filterTahun, filterBulan + 1, 0).getDate()} {BULAN[filterBulan]} {filterTahun}</span></div>
                  <div className="w-8 text-right text-slate-400">Rp.</div>
                  <div className="w-36 text-right font-black text-slate-900 text-xs">{formatRupiah(registerKasData.totalDebetSemua).replace('Rp', '').trim()}</div>
                </div>
                <div className="flex items-center py-1 hover:bg-slate-50 rounded px-2 -ml-2 transition-colors">
                  <div className="flex-1 text-slate-600">Jumlah Pengeluaran mulai dari <span className="font-bold text-slate-800">{registerKasData.startDateText}</span> s.d <span className="font-bold text-slate-800">{new Date(filterTahun, filterBulan + 1, 0).getDate()} {BULAN[filterBulan]} {filterTahun}</span></div>
                  <div className="w-8 text-right text-slate-400">Rp.</div>
                  <div className="w-36 text-right font-black text-slate-900 border-b border-slate-300 text-xs">{formatRupiah(registerKasData.totalKreditSemua).replace('Rp', '').trim()}</div>
                </div>
                <div className="flex items-center justify-end mt-2 pt-1">
                  <div className="mr-4 font-bold text-[10px] uppercase tracking-wider text-slate-500">Saldo Buku ...........................</div>
                  <div className="w-8 text-right font-bold text-slate-400">Rp.</div>
                  <div className="w-36 text-right font-black text-sm text-indigo-700">{formatRupiah(registerKasData.saldo).replace('Rp', '').trim()}</div>
                </div>
                <div className="flex items-center justify-end">
                  <div className="mr-4 font-bold text-[10px] uppercase tracking-wider text-slate-500">Saldo Kas .............................</div>
                  <div className="w-8 text-right font-bold text-slate-400">Rp.</div>
                  <div className="w-36 text-right font-black text-sm text-indigo-700">{formatRupiah(registerKasData.saldo).replace('Rp', '').trim()}</div>
                </div>
              </div>

              <p className="font-black italic text-[11px] mb-3 uppercase tracking-wider text-indigo-900 bg-indigo-50 inline-block px-3 py-1 rounded-lg">Terdiri atas :</p>

              <div className="space-y-4 mb-8">
                {/* Item 1: Uang Kertas */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 font-bold bg-slate-900 text-white text-[11px] rounded flex items-center justify-center shrink-0 shadow-sm">1</div>
                  <div className="flex-1">
                    {registerKasCalcs.paperDenoms.map((item, i) => {
                      const qty = cashUnits[item.k] || 0
                      const rowTotal = qty * item.d
                      return (
                        <div key={i} className="flex items-center text-[11px] py-1 px-2 rounded group hover:bg-indigo-50/60 transition-colors">
                          <div className="flex-1 text-slate-700 font-medium">Lembar Uang Kertas <span className="ml-4 inline-block w-16 text-right font-bold text-slate-900">Rp. {item.label}</span></div>
                          <div className="w-6 text-center text-slate-300">=</div>
                          <div className="w-24 flex items-center justify-end pr-2 gap-1">
                            <input 
                              type="number"
                              min="0"
                              value={qty || ''}
                              onChange={(e) => setCashUnits(prev => ({ ...prev, [item.k]: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                              placeholder="-"
                              className="w-12 h-5 text-right bg-white border border-slate-200 font-black text-indigo-600 focus:border-indigo-500 focus:ring-2 ring-indigo-100 rounded transition-all text-[11px] outline-none shadow-sm"
                            />
                            <span className="text-[9px] text-slate-400 w-10 font-bold">Lembar</span>
                          </div>
                          <div className="w-6 text-right text-slate-400">Rp.</div>
                          <div className="w-28 text-right font-black text-slate-800">{rowTotal > 0 ? formatRupiah(rowTotal).replace('Rp', '').trim() : '-'}</div>
                        </div>
                      )
                    })}
                    <div className="flex items-center justify-end mt-2 text-[11px] font-black px-2">
                      <div className="mr-4 text-[9px] uppercase tracking-widest text-slate-500">Jumlah (1) ...................................................</div>
                      <div className="w-6 text-right text-slate-400">Rp.</div>
                      <div className="w-28 text-right border-t border-slate-300 pt-1">{registerKasCalcs.sumPaper > 0 ? formatRupiah(registerKasCalcs.sumPaper).replace('Rp', '').trim() : '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Item 2: Uang Logam */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 font-bold bg-slate-900 text-white text-[11px] rounded flex items-center justify-center shrink-0 shadow-sm">2</div>
                  <div className="flex-1">
                    {registerKasCalcs.coinDenoms.map((item, i) => {
                      const qty = cashUnits[item.k] || 0
                      const rowTotal = qty * item.d
                      return (
                        <div key={i} className="flex items-center text-[11px] py-1 px-2 rounded group hover:bg-indigo-50/60 transition-colors">
                          <div className="flex-1 text-slate-700 font-medium">Kepingan Uang Logam <span className="ml-4 inline-block w-16 text-right font-bold text-slate-900">Rp. {item.label}</span></div>
                          <div className="w-6 text-center text-slate-300">=</div>
                          <div className="w-24 flex items-center justify-end pr-2 gap-1">
                            <input 
                              type="number"
                              min="0"
                              value={qty || ''}
                              onChange={(e) => setCashUnits(prev => ({ ...prev, [item.k]: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                              placeholder="-"
                              className="w-12 h-5 text-right bg-white border border-slate-200 font-black text-indigo-600 focus:border-indigo-500 focus:ring-2 ring-indigo-100 rounded transition-all text-[11px] outline-none shadow-sm"
                            />
                            <span className="text-[9px] text-slate-400 w-10 font-bold">Keping</span>
                          </div>
                          <div className="w-6 text-right text-slate-400">Rp.</div>
                          <div className="w-28 text-right font-black text-slate-800">{rowTotal > 0 ? formatRupiah(rowTotal).replace('Rp', '').trim() : '-'}</div>
                        </div>
                      )
                    })}
                    <div className="flex items-center justify-end mt-2 text-[11px] font-black px-2">
                      <div className="mr-4 text-[9px] uppercase tracking-widest text-slate-500">Jumlah (2) ...................................................</div>
                      <div className="w-6 text-right text-slate-400">Rp.</div>
                      <div className="w-28 text-right border-t border-slate-300 pt-1">{registerKasCalcs.sumCoin > 0 ? formatRupiah(registerKasCalcs.sumCoin).replace('Rp', '').trim() : '-'}</div>
                    </div>
                    <div className="flex items-center justify-end mt-2 text-[11px] font-black px-2 bg-slate-50 py-2 rounded-lg border border-slate-100">
                      <div className="mr-4 text-[9px] uppercase tracking-widest text-indigo-700">Jumlah (1 + 2) ...............................................</div>
                      <div className="w-6 text-right text-indigo-400">Rp.</div>
                      <div className="w-28 text-right text-indigo-700 font-black text-xs">{registerKasCalcs.totalCash > 0 ? formatRupiah(registerKasCalcs.totalCash).replace('Rp', '').trim() : '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Item 3: Kertas Berharga & Bank */}
                <div className="flex items-start gap-3 pt-2">
                  <div className="w-5 h-5 font-bold bg-slate-900 text-white text-[11px] rounded flex items-center justify-center shrink-0 shadow-sm">3</div>
                  <div className="flex-1">
                    <div className="flex items-end justify-between text-[11px] px-2">
                      <div className="pr-6 text-slate-700 font-medium flex-1 leading-relaxed">
                        Kertas Berharga dan Bagian Hak yang diizinkan Ordonansi / SP2D, Wesel, Cek, Saldo Bank, Materai, dan sebagainya ........................................................
                      </div>
                      <div className="w-6 text-right text-slate-400 mb-0.5">Rp.</div>
                      <div className="w-28 text-right font-black border-b-2 border-slate-800 text-slate-900 text-xs">{formatRupiah(registerKasCalcs.item3Balance).replace('Rp', '').trim()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grand Summary */}
              <div className="border-y-2 border-slate-900 py-2 mb-6 space-y-2 text-[11px] font-black">
                <div className="flex items-center justify-end px-2">
                  <div className="mr-4 tracking-widest text-xs uppercase text-slate-900">JUMLAH SELURUHNYA .............................</div>
                  <div className="w-6 text-right text-slate-900">Rp.</div>
                  <div className="w-28 text-right text-xs">{formatRupiah(registerKasData.saldo).replace('Rp', '').trim()}</div>
                </div>
                <div className="flex items-center justify-end px-2 font-bold text-slate-500">
                  <div className="mr-4 tracking-widest text-[9px] uppercase">Perbedaan Positif .............................</div>
                  <div className="w-6 text-right">Rp.</div>
                  <div className="w-28 text-right border-b border-slate-300">-</div>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-12">
                <div className="w-5 h-5 font-bold bg-slate-900 text-white text-[11px] rounded flex items-center justify-center shrink-0 shadow-sm">4</div>
                <div className="text-[11px] font-medium text-slate-600">Penjelasan Perbedaan Positif  <span className="ml-8">:</span>  <span className="ml-4 font-bold text-slate-800">-</span></div>
              </div>

              {/* Signatures */}
              <div className="mt-auto font-sans">
                <div className="flex justify-end text-[11px] mb-8 text-slate-900 font-bold">
                  {useStore.getState().settings.lokasi || 'Tasikmalaya'}, {customDates[tipeLaporan] ? new Date(customDates[tipeLaporan]).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date(filterTahun, filterBulan + 1, 0).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="grid grid-cols-2 text-[11px] gap-12">
                  <div>
                    <p className="font-bold mb-16 text-slate-700">Mengetahui :<br />{useStore.getState().settings.kpa_jabatan || 'Kuasa Pengguna Anggaran'},</p>
                    <p className="font-black text-slate-900 underline text-sm uppercase">{useStore.getState().settings.kpa_nama || '-'}</p>
                    <p className="text-slate-600">NIP. {useStore.getState().settings.kpa_nip || '-'}</p>
                  </div>
                  <div className="text-right sm:text-left pl-16">
                    <p className="font-bold mb-16 text-slate-700">BENDAHARA PENGELUARAN PEMBANTU,</p>
                    <p className="font-black text-slate-900 underline text-sm uppercase">{useStore.getState().settings.bpp_nama || '-'}</p>
                    <p className="text-slate-600">NIP. {useStore.getState().settings.bpp_nip || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'rppua' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  RPPUA
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Rekapitulasi Penerimaan dan Pengeluaran Uang Anggaran</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center w-16 border-r border-slate-200">No</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-200">Bulan</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right border-r border-slate-200">Penerimaan</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right border-r border-slate-200">Pengeluaran</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      let runSaldo = 0;
                      return rekapBulanan.map((r, i) => {
                        const isAfterCurrent = i > filterBulan;
                        if (!isAfterCurrent) {
                          runSaldo += (r.penerimaan || 0) - (r.pengeluaran || 0);
                        }
                        
                        return (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3.5 text-center text-xs text-slate-500 font-medium border-r border-slate-100">{i + 1}</td>
                            <td className="px-6 py-3.5 text-xs font-bold text-slate-700 border-r border-slate-100 uppercase">{r.bulan}</td>
                            <td className="px-6 py-3.5 text-right text-xs font-bold text-emerald-600 border-r border-slate-100">{(!isAfterCurrent && r.penerimaan > 0) ? formatRupiah(r.penerimaan).replace('Rp', '').trim() : '-'}</td>
                            <td className="px-6 py-3.5 text-right text-xs font-bold text-red-600 border-r border-slate-100">{(!isAfterCurrent && r.pengeluaran > 0) ? formatRupiah(r.pengeluaran).replace('Rp', '').trim() : '-'}</td>
                            <td className="px-6 py-3.5 text-right text-xs font-black text-slate-900">{!isAfterCurrent ? (runSaldo >= 0 ? formatRupiah(runSaldo).replace('Rp', '').trim() : `(${formatRupiah(Math.abs(runSaldo)).replace('Rp', '').trim()})`) : '-'}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-300 font-bold text-slate-900">
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 border-r border-slate-200">Jumlah</td>
                      <td className="px-6 py-4 text-right text-xs font-black text-emerald-600 border-r border-slate-100">{formatRupiah(rppuaCalculations.totalPen).replace('Rp', '').trim()}</td>
                      <td className="px-6 py-4 text-right text-xs font-black text-red-600 border-r border-slate-100">{formatRupiah(rppuaCalculations.totalPeng).replace('Rp', '').trim()}</td>
                      <td className="px-6 py-4 text-right text-xs font-black text-indigo-700">{formatRupiah(rppuaCalculations.runSaldo).replace('Rp', '').trim()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* [TAB: BERITA ACARA PEMERIKSAAN KAS] */}
        {tab === 'ba_pemeriksaan' && (
          <div className="bg-slate-100 min-h-[800px] flex justify-center py-8 px-4 sm:py-16 overflow-x-auto">
            <div className="bg-white shadow-2xl w-[21.5cm] min-h-[33cm] p-[0.8cm] pt-[0.4cm] text-slate-900 relative flex flex-col rounded border border-slate-300/50">


              <div className="flex items-start justify-between border-b-[3px] border-slate-900 pb-1 mb-[1px]">
                <div className="w-[calc(104px+2cm)] pl-[2cm]">
                  <img src={logoJabar} alt="Logo" className="w-full h-auto" />
                </div>
                <div className="flex-1 text-center font-sans">
                  <p className="text-[11px] font-bold">PEMERINTAH DAERAH PROVINSI JAWA BARAT</p>
                  <p className="text-[13px] font-black">BADAN PENDAPATAN DAERAH</p>
                  <p className="text-[12px] font-black">PUSAT PENGELOLAAN PENDAPATAN DAERAH</p>
                  <p className="text-[12px] font-black uppercase">WILAYAH {useStore.getState().settings.lokasi_wilayah || 'KABUPATEN TASIKMALAYA'}</p>
                  <p className="text-[9px] mt-1 font-medium">{useStore.getState().settings.alamat_kantor || 'Jalan Raya Cikatomas Sukaraja Telepon (0265) 565149'}</p>
                  <p className="text-[9px] font-medium">{useStore.getState().settings.fax_email || 'Faksimil : (0265) 566917 E-mail : p3dwkabtsm@gmail.com'}</p>
                  <p className="text-[9px] font-medium">{useStore.getState().settings.kode_pos_line || 'Kabupaten Tasikmalaya – 46183'}</p>
                </div>
                <div className="w-[calc(104px+2cm)]"></div>
              </div>
              <div className="border-b border-slate-900 mb-6"></div>

              <div className="text-center mb-6">
                <h3 className="text-sm font-black uppercase tracking-tight">Berita Acara Pemeriksaan Kas</h3>
                <p className="text-[11px] font-bold uppercase">Bulan {BULAN[filterBulan]} {filterTahun}</p>
                <p className="text-[11px] font-bold">NOMOR : _____/KU.03.01-TU</p>
              </div>

              <div className="text-[11px] space-y-4 text-justify font-serif">
                <p className="leading-relaxed">
                  Pada hari ini <strong>{customDates[tipeLaporan] ? new Date(customDates[tipeLaporan]).toLocaleDateString('id-ID', { weekday: 'long' }) : new Date(filterTahun, filterBulan + 1, 0).toLocaleDateString('id-ID', { weekday: 'long' })}</strong> tanggal <strong>{terbilang(customDates[tipeLaporan] ? new Date(customDates[tipeLaporan]).getDate() : new Date(filterTahun, filterBulan + 1, 0).getDate())}</strong> Bulan <strong>{customDates[tipeLaporan] ? BULAN[new Date(customDates[tipeLaporan]).getMonth()] : BULAN[filterBulan]}</strong> Tahun <strong>{terbilang(filterTahun)}</strong> yang bertanda dibawah ini :
                </p>

                <table className="w-full ml-4">
                  <tbody>
                    <tr><td className="w-24">Nama</td><td className="w-4">:</td><td className="font-bold">{useStore.getState().settings.kpa_nama || ''}</td></tr>
                    <tr><td>NIP</td><td>:</td><td>{useStore.getState().settings.kpa_nip || ''}</td></tr>
                    <tr><td>Jabatan</td><td>:</td><td>{useStore.getState().settings.kpa_jabatan || 'Kuasa Pengguna Anggaran'}</td></tr>
                  </tbody>
                </table>

                <p className="leading-relaxed">
                  Berdasarkan Keputusan Kepala Badan Pendapatan Daerah Provinsi Jawa Barat Nomor : 900/Kep.104-Bapenda/2024 Tanggal 03 Januari 2024 tentang Penunjukan Pejabat Pengelola Keuangan Pada Pusat Pengelolaan Pendapatan Daerah Wilayah Kabupaten Tasikmalaya Tahun Anggaran {filterTahun}, selaku Atasan Langsung / Bendahara Pengeluaran, kami telah melakukan pemeriksaan kas kepada :
                </p>

                <table className="w-full ml-4">
                  <tbody>
                    <tr><td className="w-24">Nama</td><td className="w-4">:</td><td className="font-bold">{useStore.getState().settings.bpp_nama || ''}</td></tr>
                    <tr><td>NIP</td><td>:</td><td>{useStore.getState().settings.bpp_nip || ''}</td></tr>
                    <tr><td>Jabatan</td><td>:</td><td>{useStore.getState().settings.bpp_jabatan || 'Bendahara Pengeluaran Pembantu'}</td></tr>
                  </tbody>
                </table>

                <p className="leading-relaxed">
                  Berdasarkan hasil pemeriksaan kas tersebut terdapat keadaan kas sebagai berikut :
                </p>

                <div className="space-y-1">
                  <div className="flex">
                    <span className="w-6">1.</span>
                    <span className="flex-1">Saldo Kas di BPP menurut BKU</span>
                    <span className="w-32 text-right font-bold">Rp. {formatRupiah(bkuCalculations.saldo).replace('Rp', '').trim()}</span>
                  </div>
                  <div className="flex">
                    <span className="w-6">2.</span>
                    <span className="flex-1">Saldo Kas di BPP menurut Kas Riil</span>
                    <span className="w-32 text-right font-bold">Rp. {formatRupiah(bkuCalculations.saldo).replace('Rp', '').trim()}</span>
                  </div>
                  <div className="flex pl-6 italic text-slate-500 text-[10px]">
                    <span className="flex-1">- Saldo Tunai</span>
                    <span className="w-32 text-right">Rp. {formatRupiah(0).replace('Rp', '').trim()}</span>
                  </div>
                  <div className="flex pl-6 italic text-slate-500 text-[10px]">
                    <span className="flex-1">- Saldo Bank</span>
                    <span className="w-32 text-right border-b border-slate-300">Rp. {formatRupiah(bkuCalculations.saldo).replace('Rp', '').trim()}</span>
                  </div>
                  <div className="flex">
                    <span className="w-6">3.</span>
                    <span className="flex-1">Perbedaan Positif / Negatif</span>
                    <span className="w-32 text-right font-bold">Rp. -</span>
                  </div>
                </div>

                <p className="mt-8">Demikian Berita Acara Pemeriksaan Kas ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
              </div>

              <div className="mt-auto pt-16 grid grid-cols-2 text-[11px] font-sans">
                <div className="text-center">
                  <p>Mengetahui,</p>
                  <p className="uppercase">{useStore.getState().settings.kpa_jabatan || 'Kuasa Pengguna Anggaran'},</p>
                  <div className="mt-16">
                    <p className="font-black underline uppercase text-sm">{useStore.getState().settings.kpa_nama || '-'}</p>
                    <p className="text-[10px]">NIP. {useStore.getState().settings.kpa_nip || '-'}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p>{useStore.getState().settings.lokasi || 'Sukaraja'}, {customDates[tipeLaporan] ? new Date(customDates[tipeLaporan]).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date(filterTahun, filterBulan + 1, 0).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="uppercase">{useStore.getState().settings.bpp_jabatan || 'Bendahara Pengeluaran Pembantu'},</p>
                  <div className="mt-16">
                    <p className="font-black underline uppercase text-sm">{useStore.getState().settings.bpp_nama || '-'}</p>
                    <p className="text-[10px]">NIP. {useStore.getState().settings.bpp_nip || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* [TAB: BERITA ACARA PENUTUPAN KAS] */}
        {tab === 'ba_penutupan' && (() => {
          const _months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
          const _settings = useStore.getState().settings
          const _customRaw = customDates[tipeLaporan]
          let _dateObj = new Date(filterTahun, filterBulan + 1, 0)
          if (_customRaw) { const _p = new Date(_customRaw); if (!isNaN(_p.getTime())) _dateObj = _p }
          const _fullDate = `${_dateObj.getDate()} ${_months[_dateObj.getMonth()]} ${_dateObj.getFullYear()}`
          const _monthName = _months[filterBulan]
          const _year = filterTahun
          const _fmt = (val) => (!val || val === 0) ? '-' : new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(val)
          const _saldoAwal = (registerKasData.saldo || 0) - (registerKasData.totalDebetIni || 0) + (registerKasData.totalKreditIni || 0)

          return (
            <div className="bg-slate-100 min-h-[800px] flex justify-center py-8 px-4 sm:py-16 overflow-x-auto">
              <div className="bg-white shadow-2xl w-[21.5cm] min-h-[33cm] text-slate-900 relative flex flex-col rounded border border-slate-300/50"
                style={{fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt', lineHeight: '1.3', padding: '0.3cm 1.5cm 1cm 1.5cm'}}>

                {/* Kop Surat */}
                <table style={{width: '100%', borderBottom: '3.5px solid black', marginBottom: '1.5px', paddingBottom: '3px'}}>
                  <tbody><tr>
                    <td style={{width: '117px', paddingLeft: '2cm', verticalAlign: 'middle'}}>
                      <img src={logoJabar} alt="Logo" style={{width: '104px'}} />
                    </td>
                    <td style={{textAlign: 'center', verticalAlign: 'middle', fontFamily: 'Arial, sans-serif'}}>
                      <p style={{margin: 0, fontSize: '14pt'}}>PEMERINTAH DAERAH PROVINSI JAWA BARAT</p>
                      <p style={{margin: 0, fontSize: '16pt', fontWeight: 'bold'}}>BADAN PENDAPATAN DAERAH</p>
                      <p style={{margin: 0, fontSize: '15pt', fontWeight: 'bold'}}>PUSAT PENGELOLAAN PENDAPATAN DAERAH</p>
                      <p style={{margin: 0, fontSize: '15pt', fontWeight: 'bold'}}>WILAYAH {(_settings.lokasi_wilayah || 'KABUPATEN TASIKMALAYA').toUpperCase()}</p>
                      <p style={{margin: 0, fontSize: '11pt', marginTop: '3px'}}>{_settings.alamat_kantor || 'Jalan Raya Cikatomas Sukaraja Telepon (0265) 565149'}</p>
                      <p style={{margin: 0, fontSize: '11pt'}}>{_settings.fax_email || 'Faksimil : (0265) 566917 E-mail : p3dwkabtsm@gmail.com'}</p>
                      <p style={{margin: 0, fontSize: '11pt'}}>{_settings.kode_pos_line || 'Kabupaten Tasikmalaya – 46183'}</p>
                    </td>
                  </tr></tbody>
                </table>
                <div style={{borderBottom: '1px solid black', marginBottom: '15px'}}></div>

                {/* Judul */}
                <div style={{textAlign: 'center', marginTop: '10px', marginBottom: '25px', fontFamily: 'Arial, sans-serif'}}>
                  <h3 style={{margin: 0, fontSize: '13pt', fontWeight: 'bold', textTransform: 'uppercase'}}>BERITA ACARA LAPORAN PENUTUPAN KAS</h3>
                  <div style={{fontWeight: 'bold', fontSize: '11pt'}}>Bulan : {_monthName} {_year}</div>
                </div>

                {/* Alamat Tujuan */}
                <div style={{marginBottom: '25px', fontSize: '11pt', lineHeight: '1.5'}}>
                  Kepada Yth.<br />
                  Kepala Pusat Pengelolaan Pendapatan Daerah Wilayah {_settings.lokasi_wilayah || 'Kabupaten Tasikmalaya'}<br />
                  Selaku<br />
                  Kuasa Pengguna Anggaran<br />
                  Di Tempat
                </div>

                {/* Opening Text */}
                <p style={{textAlign: 'justify', marginBottom: '20px', fontSize: '11pt'}}>
                  Dengan memperhatikan Perturan Gubernur Jawa Barat Nomor 5 Tahun 2017 tentang Perubahan Atas Peraturan Gubernur Jawa Barat Nomor 3 Tahun 2016 Tentang Sistem dan Prosedur Pengelolaan keuangan Daerah Provinsi Jawa Barat. Bersama ini kami sampaikan Laporan Penutupan Kas Bulanan yang terdapat di Bendahara Pengeluaran Badan Pendapatan Daerah adalah sejumlah {_fmt(registerKasData.saldo)} dengan perincian sebagai berikut :
                </p>

                {/* Section A — Kas di Bendahara Pengeluaran */}
                <div>
                  <span style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>A. &nbsp;&nbsp;&nbsp; Kas di Bendahara Pengeluaran</span>
                  <table style={{width: 'calc(100% - 25px)', marginLeft: '25px', borderCollapse: 'collapse', fontSize: '11pt', tableLayout: 'fixed', marginBottom: '5px'}}>
                    <tbody>
                      <tr><td style={{width: '38px', padding: '1px 0'}}>A.1</td><td style={{padding: '1px 8px 1px 0'}}>Saldo awal bulan tanggal 01 {_monthName} {_year}</td><td style={{width: '28px', padding: '1px 0'}}>Rp</td><td style={{width: '170px', textAlign: 'right', padding: '1px 0'}}>-</td></tr>
                      <tr><td style={{padding: '1px 0'}}>A.2</td><td style={{padding: '1px 8px 1px 0'}}>Jumlah Penerimaan</td><td style={{padding: '1px 0'}}>Rp</td><td style={{textAlign: 'right', padding: '1px 0'}}>-</td></tr>
                      <tr><td style={{padding: '1px 0'}}>A.3</td><td style={{padding: '1px 8px 1px 0'}}>Jumlah Pengeluaran</td><td style={{padding: '1px 0'}}>Rp</td><td style={{textAlign: 'right', borderBottom: '1px solid black', padding: '1px 0'}}>-</td></tr>
                      <tr style={{fontWeight: 'bold'}}><td style={{padding: '1px 0'}}>A.4</td><td style={{padding: '1px 8px 1px 0'}}>Saldo akhir bulan tanggal {_fullDate}</td><td style={{padding: '1px 0'}}>Rp</td><td style={{textAlign: 'right', padding: '1px 0'}}>-</td></tr>
                    </tbody>
                  </table>
                  <div style={{marginLeft: '25px', marginBottom: '20px', fontSize: '11pt'}}>
                    Saldo akhir bulan tanggal {_fullDate} Terdiri dari saldo di kas tunai sebesar Rp. 0,00 dan saldo bank Sebesar Rp. 0,00
                  </div>
                </div>

                {/* Section B — Kas di Bendahara Pengeluaran Pembantu */}
                <div>
                  <span style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>B. &nbsp;&nbsp;&nbsp; Kas di Bendahara Pengeluaran Pembantu</span>
                  <table style={{width: 'calc(100% - 25px)', marginLeft: '25px', borderCollapse: 'collapse', fontSize: '11pt', tableLayout: 'fixed', marginBottom: '5px'}}>
                    <tbody>
                      <tr><td style={{width: '38px', padding: '1px 0'}}>B.1</td><td style={{padding: '1px 8px 1px 0'}}>Saldo awal bulan tanggal 01 {_monthName} {_year}</td><td style={{width: '28px', padding: '1px 0'}}>Rp</td><td style={{width: '170px', textAlign: 'right', padding: '1px 0'}}>{_fmt(_saldoAwal)}</td></tr>
                      <tr><td style={{padding: '1px 0'}}>B.2</td><td style={{padding: '1px 8px 1px 0'}}>Jumlah Penerimaan</td><td style={{padding: '1px 0'}}>Rp</td><td style={{textAlign: 'right', padding: '1px 0'}}>{_fmt(registerKasData.totalDebetIni)}</td></tr>
                      <tr><td style={{padding: '1px 0'}}>B.3</td><td style={{padding: '1px 8px 1px 0'}}>Jumlah Pengeluaran</td><td style={{padding: '1px 0'}}>Rp</td><td style={{textAlign: 'right', borderBottom: '1px solid black', padding: '1px 0'}}>{_fmt(registerKasData.totalKreditIni)}</td></tr>
                      <tr style={{fontWeight: 'bold'}}><td style={{padding: '1px 0'}}>B.4</td><td style={{padding: '1px 8px 1px 0'}}>Saldo akhir bulan tanggal {_fullDate}</td><td style={{padding: '1px 0'}}>Rp</td><td style={{textAlign: 'right', padding: '1px 0'}}>{_fmt(registerKasData.saldo)}</td></tr>
                    </tbody>
                  </table>
                  <div style={{marginLeft: '25px', marginBottom: '20px', fontSize: '11pt'}}>
                    Saldo akhir tanggal bulan : {_fullDate} Terdiri dari saldo di kas tunai sebesar Rp. 0,00 dan saldo bank Sebesar Rp. {_fmt(registerKasData.saldo)}
                  </div>
                </div>

                {/* Section C — Rekapitulasi Posisi Kas */}
                <div>
                  <span style={{fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>C. &nbsp;&nbsp;&nbsp; Rekapitulasi Posisi Kas di Bendahara Pengeluaran</span>
                  <table style={{width: 'calc(100% - 25px)', marginLeft: '25px', borderCollapse: 'collapse', fontSize: '11pt', tableLayout: 'fixed', marginBottom: '5px'}}>
                    <tbody>
                      <tr><td style={{width: '38px', padding: '1px 0'}}>C.1</td><td style={{padding: '1px 8px 1px 0'}}>Saldo Kas Tunai</td><td style={{width: '28px', padding: '1px 0'}}>Rp</td><td style={{width: '170px', textAlign: 'right', padding: '1px 0'}}>-</td></tr>
                      <tr><td style={{padding: '1px 0'}}>C.2</td><td style={{padding: '1px 8px 1px 0'}}>Saldo Bank</td><td style={{padding: '1px 0'}}>Rp</td><td style={{textAlign: 'right', borderBottom: '1px solid black', padding: '1px 0'}}>-</td></tr>
                      <tr style={{fontWeight: 'bold'}}><td style={{padding: '1px 0'}}>C.3</td><td style={{padding: '1px 8px 1px 0'}}>Saldo Total</td><td style={{padding: '1px 0'}}>Rp</td><td style={{textAlign: 'right', padding: '1px 0'}}>-</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* Tanda Tangan — BPP saja di kanan, sesuai PDF */}
                <table style={{width: '100%', marginTop: '40px', fontSize: '11pt'}}>
                  <tbody><tr>
                    <td style={{width: '50%'}}></td>
                    <td style={{textAlign: 'center'}}>
                      <br />
                      Bendahara Pengeluaran Pembantu
                      <br /><br /><br /><br /><br />
                      <strong><u>{_settings.bpp_nama || ''}</u></strong><br />
                      NIP. {_settings.bpp_nip || ''}
                    </td>
                  </tr></tbody>
                </table>

              </div>
            </div>
          )
        })()}
        {tab === 'rppup' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                  RPPUP
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Rekapitulasi Penerimaan dan Penyetoran Uang Potongan</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th rowSpan={2} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-center w-12 border-r border-slate-200">No</th>
                      <th rowSpan={2} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase border-r border-slate-200">Bulan</th>
                      <th colSpan={6} className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase text-center border-b border-slate-200 border-r border-slate-200">Penerimaan</th>
                      <th colSpan={2} className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase text-center border-b border-slate-200 border-r border-slate-200">Penyetoran</th>
                      <th rowSpan={2} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">Sisa</th>
                    </tr>
                    <tr>
                      <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right border-r border-slate-200">PPh 21</th>
                      <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right border-r border-slate-200">PPh 22</th>
                      <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right border-r border-slate-200">PPh 23</th>
                      <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right border-r border-slate-200">PPN</th>
                      <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right border-r border-slate-200">PPh 4(2)</th>
                      <th className="px-3 py-2 text-[9px] font-black text-slate-600 uppercase text-right border-r border-slate-200">Jumlah</th>
                      <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-center border-r border-slate-200">Tgl</th>
                      <th className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase text-right border-r border-slate-200">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      let runSaldo = 0;
                      return rekapPajakBulanan.map((r, i) => {
                        const isAfterCurrent = i > filterBulan;
                        if (!isAfterCurrent) {
                          runSaldo += (r.totalPen || 0) - (r.penyetoran || 0);
                        }
                        const fmt = (val) => (!isAfterCurrent && val > 0) ? formatRupiah(val).replace('Rp', '').trim() : '-';
                        return (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors text-[11px]">
                            <td className="px-4 py-2.5 text-center text-slate-500 border-r border-slate-100">{i + 1}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-700 uppercase border-r border-slate-100">{r.bulan}</td>
                            <td className="px-3 py-2.5 text-right text-slate-600 border-r border-slate-100">{fmt(r.pph21)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-600 border-r border-slate-100">{fmt(r.pph22)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-600 border-r border-slate-100">{fmt(r.pph23)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-600 border-r border-slate-100">{fmt(r.ppn)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-600 border-r border-slate-100">{fmt(r.pph4)}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-emerald-700 border-r border-slate-100 bg-emerald-50/30">{fmt(r.totalPen)}</td>
                            <td className="px-3 py-2.5 text-center text-slate-400 border-r border-slate-100">-</td>
                            <td className="px-3 py-2.5 text-right text-red-600 border-r border-slate-100">{fmt(r.penyetoran)}</td>
                            <td className="px-3 py-2.5 text-right font-black text-slate-900 bg-indigo-50/20">
                              {!isAfterCurrent ? (runSaldo > 0 ? formatRupiah(runSaldo).replace('Rp', '').trim() : '-') : '-'}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-300 font-bold text-slate-900 text-[11px]">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-500 border-r border-slate-200">Jumlah</td>
                      <td className="px-3 py-3 text-right border-r border-slate-100">{formatRupiah(rppupCalculations.sum21).replace('Rp', '').trim()}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-100">{formatRupiah(rppupCalculations.sum22).replace('Rp', '').trim()}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-100">{formatRupiah(rppupCalculations.sum23).replace('Rp', '').trim()}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-100">{formatRupiah(rppupCalculations.sumPPN).replace('Rp', '').trim()}</td>
                      <td className="px-3 py-3 text-right border-r border-slate-100">{formatRupiah(rppupCalculations.sum4).replace('Rp', '').trim()}</td>
                      <td className="px-3 py-3 text-right font-black text-emerald-700 border-r border-slate-100 bg-emerald-50/50">{formatRupiah(rppupCalculations.sumTotalPen).replace('Rp', '').trim()}</td>
                      <td className="px-3 py-3 text-center border-r border-slate-100">-</td>
                      <td className="px-3 py-3 text-right text-red-600 border-r border-slate-100">{formatRupiah(rppupCalculations.sumPaid).replace('Rp', '').trim()}</td>
                      <td className="px-3 py-3 text-right font-black text-indigo-700 bg-indigo-50/40">{formatRupiah(rppupCalculations.runSaldo).replace('Rp', '').trim()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
