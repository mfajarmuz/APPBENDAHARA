import { useEffect, useState, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Trash2, PlusCircle, MinusCircle, Pencil, FileDown, Download, Filter, RefreshCcw, ArrowUp, ArrowDown, Printer, FileText, Paperclip, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRupiah, formatTanggal, persen } from '@/lib/format'
import { exportNPDPdf, exportNPDBatchPdf } from '@/lib/export-pdf'
import { getBkuRows } from '@/lib/bku'
import { exportTemplatePengeluaran } from '@/lib/export-excel'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import SearchableSelect from '@/components/ui/SearchableSelect'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ImportModal from '@/components/ui/ImportModal'

const isElectron = typeof window !== 'undefined' && !!window.api

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

const PPH_OPTIONS = [
  { value: 'PPh 21', label: 'PPh 21' },
  { value: 'PPh 22', label: 'PPh 22' },
  { value: 'PPh 23', label: 'PPh 23' },
  { value: 'PPh Pasal 4 ayat 2', label: 'PPh Pasal 4 ayat 2' },
]

const EMPTY_FORM = {
  tanggal: new Date().toISOString().split('T')[0],
  jenis: 'GU',
  sub_kegiatan_id: '',
  kode_rekening_id: '',
  ppn: '',
  pphs: [{ nominal: '', jenis: 'PPh 23' }],
  pajak_pungut: true,
  keterangan_pajak: '',
}
const EMPTY_RINCIAN = { uraian: '', jumlah: '' }

/**
 * [HALAMAN: PENGELUARAN / SPJ]
 * Mengelola transaksi pengeluaran kas, input SPJ, dan sinkronisasi dengan anggaran.
 */
export default function Pengeluaran() {
  const subKegiatan = useStore(s => s.subKegiatan)
  const pengeluaran = useStore(s => s.pengeluaran)
  const penerimaan = useStore(s => s.penerimaan)
  const isLoading = useStore(s => s.isLoading)
  const fetchSubKegiatan = useStore(s => s.fetchSubKegiatan)
  const fetchPengeluaran = useStore(s => s.fetchPengeluaran)
  const fetchPenerimaan = useStore(s => s.fetchPenerimaan)
  const addPengeluaran = useStore(s => s.addPengeluaran)
  const addPenerimaan = useStore(s => s.addPenerimaan)
  const updatePengeluaran = useStore(s => s.updatePengeluaran)
  const deletePengeluaran = useStore(s => s.deletePengeluaran)
  const periodeKunci = useStore(s => s.periodeKunci)
  const fetchPeriodeKunci = useStore(s => s.fetchPeriodeKunci)
  const user = useStore(s => s.user)

  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [rincian, setRincian] = useState([{ ...EMPTY_RINCIAN }])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [selectedPdf, setSelectedPdf] = useState(null) // { path, name }
  const [isDragging, setIsDragging] = useState(false)
  
  const location = useLocation()
  const highlightTxId = location.state?.highlightTxId || null

  // Advanced Filters
  const [filterBulan, setFilterBulan] = useState(() => location.state?.highlightTxId ? '' : String(new Date().getMonth()))
  const [filterJenis, setFilterJenis] = useState('')
  const [filterProgram, setFilterProgram] = useState('')
  const [filterKegiatan, setFilterKegiatan] = useState('')
  const [filterSubKegiatan, setFilterSubKegiatan] = useState('')
  const [filterKodeRekening, setFilterKodeRekening] = useState('')
  const [searchQuery, setSearchQuery] = useState(() => location.state?.searchKeyword || '')
  const [sortConfig, setSortConfig] = useState({ key: 'tanggal', direction: 'desc' })
  
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    if (location.state?.searchKeyword || location.state?.highlightTxId) {
      if (location.state.searchKeyword) setSearchQuery(location.state.searchKeyword)
      if (location.state.highlightTxId) setFilterBulan('')
    }
  }, [location.state])

  useEffect(() => {
    fetchSubKegiatan()
    fetchPengeluaran()
    fetchPenerimaan()
    fetchPeriodeKunci()
  }, [])

  const isDateLocked = useCallback((dateStr) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return false
    const m = d.getMonth() + 1
    const y = d.getFullYear()
    return (periodeKunci || []).some(pk => pk.bulan === m && pk.tahun === y)
  }, [periodeKunci])

  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const resetFilters = () => {
    setFilterBulan(String(new Date().getMonth()))
    setFilterJenis('')
    setFilterProgram('')
    setFilterKegiatan('')
    setFilterSubKegiatan('')
    setFilterKodeRekening('')
    setSearchQuery('')
  }

  // Filter Options Memos
  const programs = useMemo(() => {
    const map = new Map()
    subKegiatan.forEach(sk => {
      const p = sk.kegiatan?.program
      if (p) map.set(p.id, p)
    })
    return Array.from(map.values())
  }, [subKegiatan])

  const kegiatans = useMemo(() => {
    const map = new Map()
    subKegiatan.forEach(sk => {
      const k = sk.kegiatan
      if (k && (!filterProgram || k.program?.id === filterProgram)) {
        map.set(k.id, k)
      }
    })
    return Array.from(map.values())
  }, [subKegiatan, filterProgram])

  const subKegiatanOptions = useMemo(() => {
    return subKegiatan.filter(sk => {
      if (filterProgram && sk.kegiatan?.program?.id !== filterProgram) return false
      if (filterKegiatan && sk.kegiatan_id !== filterKegiatan) return false
      return true
    })
  }, [subKegiatan, filterProgram, filterKegiatan])

  const kodeRekeningOptions = useMemo(() => {
    if (filterSubKegiatan) {
      const sk = subKegiatan.find(s => s.id === filterSubKegiatan)
      return sk?.kode_rekening || []
    }
    const list = []
    const seen = new Set()
    subKegiatanOptions.forEach(sk => {
      (sk.kode_rekening || []).forEach(kr => {
        if (!seen.has(kr.kode)) {
           list.push(kr)
           seen.add(kr.kode)
        }
      })
    })
    return list
  }, [subKegiatan, filterSubKegiatan, subKegiatanOptions])

  const filtered = useMemo(() => {
    return pengeluaran.filter(p => {
      if (filterBulan !== '') {
        const d = new Date(p.tanggal)
        if (d.getMonth() !== parseInt(filterBulan, 10)) return false
      }
      if (filterJenis && p.jenis !== filterJenis) return false
      if (filterProgram && p.sub_kegiatan?.kegiatan?.program_id !== filterProgram) return false
      if (filterKegiatan && p.sub_kegiatan?.kegiatan_id !== filterKegiatan) return false
      if (filterSubKegiatan && p.sub_kegiatan_id !== filterSubKegiatan) return false
      if (filterKodeRekening && p.kode_rekening_id !== filterKodeRekening) return false
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim()
        const rincianText = p.pengeluaran_rincian?.map(r => r.uraian).join(' ') || ''
        const headKeterangan = p.keterangan || ''
        const penerimaNama = p.penerima_nama || ''
        const noBukti = p.no_bukti || p.nomor_ls || ''
        const idStr = String(p.id || '')

        const isMatch = rincianText.toLowerCase().includes(query) ||
                        headKeterangan.toLowerCase().includes(query) ||
                        penerimaNama.toLowerCase().includes(query) ||
                        noBukti.toLowerCase().includes(query) ||
                        idStr === query

        if (!isMatch) return false
      }

      return true
    }).sort((a, b) => {
      const { key, direction } = sortConfig
      let aValue, bValue

      if (key === 'tanggal') {
        aValue = new Date(a.tanggal)
        bValue = new Date(b.tanggal)
      } else if (key === 'kode_rekening') {
        aValue = `${a.sub_kegiatan?.kode || ''}.${a.kode_rekening?.kode || ''}`
        bValue = `${b.sub_kegiatan?.kode || ''}.${b.kode_rekening?.kode || ''}`
      } else if (key === 'uraian') {
        aValue = a.pengeluaran_rincian?.map(r => r.uraian).join(', ') || a.keterangan || ''
        bValue = b.pengeluaran_rincian?.map(r => r.uraian).join(', ') || b.keterangan || ''
      } else if (key === 'jumlah') {
        aValue = a.jumlah
        bValue = b.jumlah
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [pengeluaran, filterBulan, filterJenis, filterProgram, filterKegiatan, filterSubKegiatan, filterKodeRekening, searchQuery, sortConfig])

  const selectedSk = useMemo(
    () => subKegiatan.find(sk => sk.id === form.sub_kegiatan_id) ?? null,
    [subKegiatan, form.sub_kegiatan_id]
  )

  const rekeningOptions = useMemo(
    () => (selectedSk?.kode_rekening ?? []).map(r => ({ value: r.id, label: `${r.kode} — ${r.uraian}` })),
    [selectedSk]
  )

  const realisasiPerRek = useMemo(() => {
    if (!selectedSk) return {}
    const map = {}
    pengeluaran
      .filter(p => p.sub_kegiatan_id === selectedSk.id && p.id !== editingItem?.id && p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS')
      .forEach(p => {
        map[p.kode_rekening_id] = (map[p.kode_rekening_id] ?? 0) + p.jumlah
      })
    return map
  }, [selectedSk, pengeluaran, editingItem])

  const calculatedSkPagu = useMemo(() => {
    return (selectedSk?.kode_rekening ?? []).reduce((s, r) => s + (r.pagu_anggaran ?? 0), 0)
  }, [selectedSk])

  const realisasiSk = Object.values(realisasiPerRek).reduce((a, b) => a + b, 0)

  const selectedRek = useMemo(() => {
    return selectedSk?.kode_rekening?.find(r => r.id === form.kode_rekening_id) ?? null
  }, [selectedSk, form.kode_rekening_id])

  const rakInfo = useMemo(() => {
    if (!selectedRek || !form.tanggal) return null
    const dateParts = form.tanggal.split('-')
    if (dateParts.length < 2) return null
    const year = parseInt(dateParts[0], 10)
    const month = parseInt(dateParts[1], 10) - 1 // 0-indexed month
    
    const rakMonths = [
      selectedRek.rak_jan || 0,
      selectedRek.rak_feb || 0,
      selectedRek.rak_mar || 0,
      selectedRek.rak_apr || 0,
      selectedRek.rak_mei || 0,
      selectedRek.rak_jun || 0,
      selectedRek.rak_jul || 0,
      selectedRek.rak_agu || 0,
      selectedRek.rak_sep || 0,
      selectedRek.rak_okt || 0,
      selectedRek.rak_nov || 0,
      selectedRek.rak_des || 0
    ]

    let accumulatedRAK = 0
    for (let m = 0; m <= month; m++) {
      accumulatedRAK += rakMonths[m]
    }

    // Realisasi pengeluaran untuk Kode Rekening ini SAMPAI DENGAN bulan transaksi pada tahun yang sama (selain item yang sedang diedit)
    const realisasiRekPrev = pengeluaran
      .filter(p => {
        if (p.kode_rekening_id !== form.kode_rekening_id) return false
        if (p.id === editingItem?.id) return false
        if (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') return false
        if (!p.tanggal) return false
        const parts = p.tanggal.split('-')
        if (parts.length < 2) return false
        const pYear = parseInt(parts[0], 10)
        const pMonth = parseInt(parts[1], 10) - 1
        if (pYear !== year) return false
        return pMonth <= month
      })
      .reduce((sum, p) => sum + (p.jumlah || 0), 0)

    const sisaRAK = accumulatedRAK - realisasiRekPrev

    return {
      bulan: BULAN[month],
      rakBulanIni: rakMonths[month],
      rakAccumulated: accumulatedRAK,
      realisasiSebelumnya: realisasiRekPrev,
      sisaRAK: sisaRAK
    }
  }, [selectedRek, form.tanggal, form.kode_rekening_id, pengeluaran, editingItem])

  const totalRincian = rincian.reduce((sum, r) => {
    const val = typeof r.jumlah === 'string' ? r.jumlah.replace(/\./g, '') : r.jumlah
    return sum + (parseInt(val, 10) || 0)
  }, 0)

  function openNew() {
    setEditingItem(null)
    setForm({ ...EMPTY_FORM, tanggal: new Date().toISOString().split('T')[0] })
    setRincian([{ ...EMPTY_RINCIAN }])
    setErrors({})
    setSelectedPdf(null)
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditingItem(item)
    setSelectedPdf(null)

    let ppnVal = ''
    let pphList = [{ nominal: '', jenis: 'PPh 23' }]
    const cleanDesc = item.keterangan || ''

    if (item.jenis === 'Pajak' || item.jenis === 'Pajak LS') {
      const isPpn = cleanDesc.match(/^(?:Setoran|Pungutan) PPN/i)
      if (isPpn) {
        ppnVal = String(item.jumlah)
      } else {
        const pphMatch = cleanDesc.match(/^(?:Setoran|Pungutan) (PPh [^:]+|PPh Pasal \d+ ayat \d+)/i)
        if (pphMatch) {
          pphList = [{ nominal: String(item.jumlah), jenis: pphMatch[1] }]
        } else {
          ppnVal = String(item.jumlah)
        }
      }
    }

    setForm({
      tanggal: item.tanggal,
      jenis: item.jenis || 'GU',
      sub_kegiatan_id: item.sub_kegiatan_id,
      kode_rekening_id: item.kode_rekening_id,
      ppn: ppnVal,
      pphs: pphList,
      pajak_pungut: true,
    })
    setRincian(item.pengeluaran_rincian?.length > 0 
      ? item.pengeluaran_rincian.map(r => ({ uraian: r.uraian, jumlah: String(r.jumlah) }))
      : [{ uraian: item.keterangan || '', jumlah: String(item.jumlah) }]
    )
    setErrors({})
    setModalOpen(true)
  }

  const handlePasteTanggal = (e) => {
    const pasted = e.clipboardData.getData('text')
    // Deteksi format DD-MM-YYYY atau DD/MM/YYYY
    const match = pasted.match(/^\s*(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s*$/)
    if (match) {
      e.preventDefault()
      const d = match[1].padStart(2, '0')
      const m = match[2].padStart(2, '0')
      const y = match[3]
      setForm(f => ({ ...f, tanggal: `${y}-${m}-${d}` }))
    }
  }

  const handlePpnChange = (val) => {
    const digits = val.replace(/\D/g, '')
    setForm(f => ({ ...f, ppn: digits }))
  }

  const handleAddPph = () => {
    setForm(f => ({
      ...f,
      pphs: [...(f.pphs || []), { nominal: '', jenis: 'PPh 23' }]
    }))
  }

  const handleRemovePph = (idx) => {
    setForm(f => ({
      ...f,
      pphs: (f.pphs || []).filter((_, i) => i !== idx)
    }))
  }

  const handlePphItemChange = (idx, field, val) => {
    setForm(f => {
      const newPphs = (f.pphs || []).map((item, i) => {
        if (i !== idx) return item
        if (field === 'nominal') {
          const digits = val.replace(/\D/g, '')
          return { ...item, nominal: digits }
        }
        return { ...item, [field]: val }
      })
      return { ...f, pphs: newPphs }
    })
  }

  function handleAmountInput(i, val) {
    const cleaned = val.replace(/[^\d]/g, '')
    setRincian(r => r.map((row, idx) => idx === i ? { ...row, jumlah: cleaned } : row))
  }

  function updateRincian(i, field, val) {
    setRincian(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Hanya berkas PDF yang diperbolehkan!')
        return
      }

      // Validasi apakah path merupakan absolute path sistem berkas lokal
      const filePath = file.path || ''
      const isAbsolute = /^[a-zA-Z]:[\\/]/.test(filePath) || filePath.includes('/') || filePath.includes('\\')

      if (!isAbsolute) {
        alert(
          `Gagal membaca jalur berkas lokal "${file.name}".\n\n` +
          `Hal ini biasanya terjadi jika Anda menyeret berkas langsung dari browser (seperti Chrome Downloads), aplikasi chat (seperti Telegram), atau arsip ZIP.\n\n` +
          `Solusi: Silakan klik kotak unggah untuk memilih berkas secara manual dari komputer Anda.`
        )
        return
      }

      setSelectedPdf({
        name: file.name,
        path: filePath,
        size: file.size
      })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (isDateLocked(form.tanggal)) {
      setErrors({ global: `Transaksi tidak dapat disimpan karena periode bulan tersebut telah terkunci 🔒` })
      return
    }

    if (editingItem && isDateLocked(editingItem.tanggal)) {
      setErrors({ global: `Transaksi tidak dapat diubah karena periode bulan transaksi asli telah terkunci 🔒` })
      return
    }
    
    // Financial Validations
    const isTaxPayment = form.jenis === 'Pajak' || form.jenis === 'Pajak LS'
    const totalPajak = (parseInt(form.ppn, 10) || 0) + (form.pphs || []).reduce((sum, p) => sum + (parseInt(p.nominal, 10) || 0), 0)
    const amount = isTaxPayment ? totalPajak : totalRincian
    const remainingQuota = (selectedSk?.kode_rekening?.find(r => r.id === form.kode_rekening_id)?.pagu_anggaran ?? 0) - (realisasiPerRek[form.kode_rekening_id] ?? 0)
    
    const totalCair = penerimaan.reduce((s, p) => s + p.jumlah, 0)
    const totalSpent = pengeluaran.reduce((s, p) => s + p.jumlah, 0)
    const currentCash = totalCair - totalSpent + (editingItem ? editingItem.jumlah : 0)

    if (amount <= 0) {
      setErrors({ global: 'Jumlah pengeluaran harus lebih dari 0' })
      return
    }

    if (amount > remainingQuota) {
      setErrors({ global: `Jumlah melebihi sisa quota pagu rekening (${formatRupiah(remainingQuota)})` })
      return
    }

    // Validasi Rencana Anggaran Kas (RAK) Akumulatif Bulanan (Kecuali Transaksi Pajak)
    if (!isTaxPayment && rakInfo && amount > rakInfo.sisaRAK) {
      setErrors({ 
        global: `Jumlah pengeluaran (${formatRupiah(amount)}) melebihi sisa alokasi RAK s.d ${rakInfo.bulan} (${formatRupiah(rakInfo.sisaRAK)}).\n` +
                `Batas RAK Akumulatif: ${formatRupiah(rakInfo.rakAccumulated)} | ` +
                `Realisasi Sebelumnya: ${formatRupiah(rakInfo.realisasiSebelumnya)}`
      })
      return
    }

    if (amount > currentCash) {
      setErrors({ global: `Saldo Kas tidak mencukupi. Sisa saldo kas riil: ${formatRupiah(currentCash)}` })
      return
    }

    setSaving(true)
    setErrors({})

    // Generate a background no_bukti to satisfy DB constraint
    const dateParts = form.tanggal.split('-')
    const currentYear = parseInt(dateParts[0], 10)
    const currentMonth = parseInt(dateParts[1], 10) - 1 // 0-indexed month
    
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const bgNoBukti = editingItem?.no_bukti || `BPP-${currentYear}${String(currentMonth + 1).padStart(2, '0')}-${Date.now()}-${randomSuffix}`

    // Generate dynamic BKU sequence numbering and format file name for Google Drive
    const BULAN_UPPER = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER']
    
    let bkuNumber = 1
    const allBkuRows = getBkuRows(penerimaan, pengeluaran)
    const monthlyBku = allBkuRows.filter(r => {
      const rd = new Date(r.tanggal)
      return rd.getMonth() === currentMonth && rd.getFullYear() === currentYear
    })

    if (editingItem) {
      const idx = monthlyBku.findIndex(r => r.id === editingItem.id)
      bkuNumber = idx !== -1 ? idx + 1 : 1
    } else {
      const tempItem = { id: 'temp', tanggal: form.tanggal, jenis: form.jenis, jumlah: amount, type: 'out', urutan: 0 }
      const simulatedBku = getBkuRows(penerimaan, [...pengeluaran, tempItem])
      const simulatedMonthly = simulatedBku.filter(r => {
        const rd = new Date(r.tanggal)
        return rd.getMonth() === currentMonth && rd.getFullYear() === currentYear
      })
      const idx = simulatedMonthly.findIndex(r => r.id === 'temp')
      bkuNumber = idx !== -1 ? idx + 1 : (monthlyBku.length + 1)
    }

    const bkuNumStr = String(bkuNumber).padStart(3, '0')
    const customFileName = `[${bkuNumStr}] [${BULAN_UPPER[currentMonth]}] [${currentYear}]`

    const payload = {
      pengeluaran: {
        tanggal: form.tanggal,
        jenis: form.jenis,
        no_bukti: bgNoBukti,
        sub_kegiatan_id: form.sub_kegiatan_id,
        kode_rekening_id: form.kode_rekening_id,
        jumlah: amount,
        keterangan: rincian[0]?.uraian || null,
      },
      rincian: rincian.map(r => ({
        uraian: r.uraian,
        volume: null,
        jumlah: parseInt(String(r.jumlah), 10),
      })),
      pdfLocalPath: selectedPdf?.path || null,
      customFileName: customFileName,
    }

    try {
      let res
      if (editingItem) {
        if (isTaxPayment) {
          const isPpn = form.ppn && parseInt(form.ppn, 10) > 0
          const firstPph = form.pphs?.[0]
          const isPph = firstPph && firstPph.nominal && parseInt(firstPph.nominal, 10) > 0
          
          let updatedJumlah = 0
          let updatedKeterangan = ''
          
          if (isPpn) {
            updatedJumlah = parseInt(form.ppn, 10)
            updatedKeterangan = "Setoran PPN"
          } else if (isPph) {
            updatedJumlah = parseInt(firstPph.nominal, 10)
            updatedKeterangan = `Setoran ${firstPph.jenis}`
          } else {
            updatedJumlah = amount
            updatedKeterangan = "Setoran Pajak"
          }
          
          const editPayload = {
            pengeluaran: {
              tanggal: form.tanggal,
              jenis: form.jenis,
              no_bukti: editingItem.no_bukti,
              sub_kegiatan_id: form.sub_kegiatan_id,
              kode_rekening_id: form.kode_rekening_id,
              jumlah: updatedJumlah,
              keterangan: updatedKeterangan,
            },
            rincian: [],
            pdfLocalPath: selectedPdf?.path || null,
            customFileName: customFileName,
          }
          res = await updatePengeluaran(editingItem.id, editPayload)
        } else {
          res = await updatePengeluaran(editingItem.id, payload)
        }
      } else {
        if (isTaxPayment) {
          const taxPenerimaanPayloads = []
          const taxPengeluaranPayloads = []

          // 1. Process PPN
          if (form.ppn && parseInt(form.ppn, 10) > 0) {
            const amountVal = parseInt(form.ppn, 10)
            
            // Pungutan (Penerimaan)
            if (form.pajak_pungut !== false) {
              taxPenerimaanPayloads.push({
                jenis: form.jenis,
                tanggal: form.tanggal,
                nomor_ls: bgNoBukti,
                sub_kegiatan_id: form.sub_kegiatan_id,
                kode_rekening_id: form.kode_rekening_id,
                jumlah: amountVal,
                keterangan: "Pungutan PPN",
              })
            }

            // Setoran (Pengeluaran)
            taxPengeluaranPayloads.push({
              pengeluaran: {
                tanggal: form.tanggal,
                jenis: form.jenis,
                no_bukti: bgNoBukti,
                sub_kegiatan_id: form.sub_kegiatan_id,
                kode_rekening_id: form.kode_rekening_id,
                jumlah: amountVal,
                keterangan: "Setoran PPN",
              },
              rincian: []
            })
          }

          // 2. Process PPh List
          if (form.pphs && form.pphs.length > 0) {
            form.pphs.forEach(pphItem => {
              if (pphItem.nominal && parseInt(pphItem.nominal, 10) > 0) {
                const amountVal = parseInt(pphItem.nominal, 10)
                const jenisPph = pphItem.jenis || 'PPh'
                
                // Pungutan (Penerimaan)
                if (form.pajak_pungut !== false) {
                  taxPenerimaanPayloads.push({
                    jenis: form.jenis,
                    tanggal: form.tanggal,
                    nomor_ls: bgNoBukti,
                    sub_kegiatan_id: form.sub_kegiatan_id,
                    kode_rekening_id: form.kode_rekening_id,
                    jumlah: amountVal,
                    keterangan: `Pungutan ${jenisPph}`,
                  })
                }

                // Setoran (Pengeluaran)
                taxPengeluaranPayloads.push({
                  pengeluaran: {
                    tanggal: form.tanggal,
                    jenis: form.jenis,
                    no_bukti: bgNoBukti,
                    sub_kegiatan_id: form.sub_kegiatan_id,
                    kode_rekening_id: form.kode_rekening_id,
                    jumlah: amountVal,
                    keterangan: `Setoran ${jenisPph}`,
                  },
                  rincian: []
                })
              }
            })
          }

          // Batch Insert Penerimaan
          if (taxPenerimaanPayloads.length > 0) {
            const resPajakPen = await addPenerimaan(taxPenerimaanPayloads)
            if (resPajakPen && !resPajakPen.success) {
              throw new Error(resPajakPen.error || "Gagal menyimpan pungutan pajak otomatis")
            }
          }
          
          // Iterative Insert Pengeluaran (Setoran)
          for (const tp of taxPengeluaranPayloads) {
            const resPajakPeng = await addPengeluaran(tp)
            if (resPajakPeng && !resPajakPeng.success) {
              throw new Error(resPajakPeng.error || "Gagal menyimpan setoran pajak otomatis")
            }
          }

          res = { success: true }
        } else {
          res = await addPengeluaran(payload)
          
          // Save Taxes (PPN/PPh) - DUAL ENTRY (Pungut & Setor)
          if (res && res.success) {
            const taxPenerimaanPayloads = []
            const taxPengeluaranPayloads = []

            // 1. Process PPN
            if (form.ppn && parseInt(form.ppn, 10) > 0) {
              const amountVal = parseInt(form.ppn, 10)
              const desc = rincian[0]?.uraian || 'Belanja'
              
              // Pungutan (Penerimaan)
              if (form.pajak_pungut !== false) {
                taxPenerimaanPayloads.push({
                  jenis: 'Pajak',
                  tanggal: form.tanggal,
                  nomor_ls: bgNoBukti,
                  sub_kegiatan_id: form.sub_kegiatan_id,
                  kode_rekening_id: form.kode_rekening_id,
                  jumlah: amountVal,
                  keterangan: `Pungutan PPN dari Belanja: ${desc}`.trim(),
                })
              }

              // Setoran (Pengeluaran)
              taxPengeluaranPayloads.push({
                pengeluaran: {
                  tanggal: form.tanggal,
                  jenis: 'Pajak',
                  no_bukti: bgNoBukti,
                  sub_kegiatan_id: form.sub_kegiatan_id,
                  kode_rekening_id: form.kode_rekening_id,
                  jumlah: amountVal,
                  keterangan: `Setoran PPN dari Belanja: ${desc}`.trim(),
                },
                rincian: []
              })
            }

            // 2. Process PPh List
            if (form.pphs && form.pphs.length > 0) {
              form.pphs.forEach(pphItem => {
                if (pphItem.nominal && parseInt(pphItem.nominal, 10) > 0) {
                  const amountVal = parseInt(pphItem.nominal, 10)
                  const desc = rincian[0]?.uraian || 'Belanja'
                  const jenisPph = pphItem.jenis || 'PPh'
                  const jenisPajak = form.jenis === 'LS' ? 'Pajak LS' : 'Pajak'
                  
                  // Pungutan (Penerimaan)
                  if (form.pajak_pungut !== false) {
                    taxPenerimaanPayloads.push({
                      jenis: jenisPajak,
                      tanggal: form.tanggal,
                      nomor_ls: bgNoBukti,
                      sub_kegiatan_id: form.sub_kegiatan_id,
                      kode_rekening_id: form.kode_rekening_id,
                      jumlah: amountVal,
                      keterangan: `Pungutan ${jenisPph} dari Belanja: ${desc}`.trim(),
                    })
                  }

                  // Setoran (Pengeluaran)
                  taxPengeluaranPayloads.push({
                    pengeluaran: {
                      tanggal: form.tanggal,
                      jenis: jenisPajak,
                      no_bukti: bgNoBukti,
                      sub_kegiatan_id: form.sub_kegiatan_id,
                      kode_rekening_id: form.kode_rekening_id,
                      jumlah: amountVal,
                      keterangan: `Setoran ${jenisPph} dari Belanja: ${desc}`.trim(),
                    },
                    rincian: []
                  })
                }
              })
            }

            // Batch Insert Penerimaan
            if (taxPenerimaanPayloads.length > 0) {
              const resTaxPen = await addPenerimaan(taxPenerimaanPayloads)
              if (resTaxPen && !resTaxPen.success) {
                throw new Error(resTaxPen.error || "Gagal menyimpan pungutan pajak otomatis untuk belanja ini")
              }
            }
            
            // Iterative Insert Pengeluaran (Setoran)
            for (const tp of taxPengeluaranPayloads) {
              const resTaxPeng = await addPengeluaran(tp)
              if (resTaxPeng && !resTaxPeng.success) {
                throw new Error(resTaxPeng.error || "Gagal menyimpan setoran pajak otomatis untuk belanja ini")
              }
            }
          }
        }
      }

      if (res && res.success) {
        setModalOpen(false)
      } else {
        setErrors({ global: res?.error || 'Gagal menyimpan data ke database' })
      }
    } catch (err) {
      setErrors({ global: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    const res = await deletePengeluaran(deleteId)
    if (res && !res.success) alert(`Gagal menghapus: ${res.error}`)
    setDeleteId(null)
  }

  const handleBatchDownloadNPD = () => {
    if (filterBulan === '') {
      window.alert('Pilih filter bulan terlebih dahulu untuk mengunduh batch NPD.')
      return
    }
    
    // Use filtered items that are not tax payments
    // Sort chronologically for the batch
    const items = filtered
      .filter(p => p.jenis !== 'Pajak')
      .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal) || String(a.id).localeCompare(String(b.id)))
    
    if (items.length === 0) {
      window.alert('Tidak ada data pengeluaran (non-pajak) untuk bulan ini.')
      return
    }

    const allBkuRows = getBkuRows(penerimaan, pengeluaran)
    try {
      exportNPDBatchPdf(items, subKegiatan, pengeluaran, allBkuRows)
    } catch (err) {
      console.error('[NPD Batch Debug] Error:', err)
      window.alert('Gagal mengunduh batch NPD: ' + err.message)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      exportTemplatePengeluaran(pengeluaran)
    } catch (err) {
      console.error('Download Template Error:', err)
      window.alert('Gagal mengunduh template: ' + err.message)
    }
  }

  const skOptions = subKegiatan.map(sk => ({ value: sk.id, label: `${sk.kode} — ${sk.nama}` }))

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ArrowUp size={12} className="opacity-0 group-hover:opacity-30 transition-opacity" />
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={12} className="text-indigo-600" /> 
      : <ArrowDown size={12} className="text-indigo-600" />
  }

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Data Pengeluaran</h2>
        <div className="flex gap-3">
          {filterBulan !== '' && (
            <Button variant="secondary" onClick={handleBatchDownloadNPD} className="h-11 px-6 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm transition-all animate-in fade-in slide-in-from-right-2">
              <Printer size={18} /> Cetak Batch NPD
            </Button>
          )}
          <Button variant="secondary" onClick={handleDownloadTemplate} className="h-11 px-6 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm transition-all">
            <Download size={18} /> Download Template
          </Button>
          {user?.role !== 'viewer' && (
            <>
              <Button variant="secondary" onClick={() => setImportModalOpen(true)} className="h-11 px-6 border-slate-200 hover:bg-slate-50">
                <FileDown size={18} /> Import Excel
              </Button>
              <Button onClick={openNew} className="h-11 px-6 shadow-lg shadow-indigo-600/10 active:scale-95 transition-transform">
                <Plus size={18} /> Tambah Baru
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Filter size={14} className="text-indigo-600" /> Filter & Urutan
          </h3>
          <button 
            onClick={resetFilters}
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase tracking-wider transition-colors"
          >
            <RefreshCcw size={10} /> Reset Filter
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block pl-1 text-indigo-600">Cari Uraian / Keterangan</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ketik untuk mencari..."
                className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block pl-1">Bulan</label>
            <select
              value={filterBulan}
              onChange={e => setFilterBulan(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
            >
              <option value="">Semua Bulan</option>
              {BULAN.map((b, i) => <option key={i} value={i}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block pl-1">Jenis</label>
            <select
              value={filterJenis}
              onChange={e => setFilterJenis(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
            >
              <option value="">Semua Jenis</option>
              <option value="GU">GU (Ganti Uang)</option>
              <option value="LS">LS (Langsung)</option>
              <option value="Pajak">Pajak</option>
              <option value="Pajak LS">Pajak LS</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block pl-1">Program</label>
            <select
              value={filterProgram}
              onChange={e => { setFilterProgram(e.target.value); setFilterKegiatan(''); setFilterSubKegiatan(''); setFilterKodeRekening(''); }}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none truncate"
            >
              <option value="">Semua Program</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.kode} — {p.nama}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block pl-1">Kegiatan</label>
            <select
              value={filterKegiatan}
              onChange={e => { setFilterKegiatan(e.target.value); setFilterSubKegiatan(''); setFilterKodeRekening(''); }}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none truncate"
            >
              <option value="">Semua Kegiatan</option>
              {kegiatans.map(k => <option key={k.id} value={k.id}>{k.kode} — {k.nama}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block pl-1">Sub Kegiatan</label>
            <select
              value={filterSubKegiatan}
              onChange={e => { setFilterSubKegiatan(e.target.value); setFilterKodeRekening(''); }}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none truncate"
            >
              <option value="">Semua Sub Kegiatan</option>
              {subKegiatanOptions.map(sk => <option key={sk.id} value={sk.id}>{sk.kode} — {sk.nama}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block pl-1">Kode Rekening</label>
            <select
              value={filterKodeRekening}
              onChange={e => setFilterKodeRekening(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none truncate"
            >
              <option value="">Semua Rekening</option>
              {kodeRekeningOptions.map(kr => <option key={kr.id} value={kr.id}>{kr.kode} — {kr.uraian}</option>)}
            </select>
          </div>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-slate-200/60 shadow-xl">
        <div className="overflow-x-auto">
          {isLoading && pengeluaran.length === 0 ? (
            <div className="flex justify-center py-20"><Spinner size={32} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState message="Tidak ada data yang sesuai dengan filter" />
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-10 text-center">No.</th>
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-32 text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => requestSort('tanggal')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Tanggal <SortIcon column="tanggal" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-20 text-center">Jenis</th>
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-48 cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => requestSort('kode_rekening')}
                  >
                    <div className="flex items-center gap-1">
                      Kode Rekening <SortIcon column="kode_rekening" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => requestSort('uraian')}
                  >
                    <div className="flex items-center gap-1">
                      Uraian / Keterangan <SortIcon column="uraian" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-40 text-right cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() => requestSort('jumlah')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Jumlah (Rp) <SortIcon column="jumlah" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item, idx) => {
                  const fullCode = item.sub_kegiatan && item.kode_rekening 
                    ? `${item.sub_kegiatan.kode}.${item.kode_rekening.kode}`
                    : '-'
                  
                  const subK = item.sub_kegiatan
                  const keg = subK?.kegiatan
                  
                  let rincianText = item.pengeluaran_rincian?.length > 0
                    ? item.pengeluaran_rincian.map(r => r.uraian).join(', ')
                    : item.keterangan || '-'

                  const isHighlighted = String(item.id) === String(highlightTxId)

                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors group ${
                        isHighlighted 
                          ? 'bg-emerald-100/70 hover:bg-emerald-100 font-semibold ring-2 ring-emerald-500/50' 
                          : 'hover:bg-indigo-50/30'
                      }`}
                    >
                      <td className="px-6 py-4 text-xs text-slate-400 font-medium text-center">{idx + 1}</td>
                      <td className="px-6 py-4 text-xs text-slate-600 font-semibold text-center">{formatTanggal(item.tanggal)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${
                          item.jenis === 'LS' 
                            ? 'bg-orange-50 text-orange-600 border-orange-100' 
                            : item.jenis === 'Pajak'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {item.jenis || 'GU'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 group-hover:border-indigo-200 group-hover:text-indigo-600 transition-colors">
                          {fullCode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {rincianText}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-red-600">{formatRupiah(item.jumlah)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 transition-all">
                          {item.jenis === 'GU' && (
                            <button
                              onClick={() => {
                                // Find BKU sequence number based on chronological order in the currently filtered list or the whole BKU context
                                // BKU includes BOTH penerimaan and pengeluaran
                                const currentMonth = new Date(item.tanggal).getMonth()
                                const currentYear = new Date(item.tanggal).getFullYear()

                                // Use the standardized BKU helper to ensure synchronization with Laporan page
                                const allBkuRows = getBkuRows(penerimaan, pengeluaran)

                                // Filter for the month to get the index in that specific month's report
                                const monthlyBku = allBkuRows.filter(r => {
                                  const d = new Date(r.tanggal)
                                  return d.getMonth() === currentMonth && d.getFullYear() === currentYear
                                })

                                const bkuIdx = monthlyBku.findIndex(r => r.id === item.id && r.type === 'out')

                                try {
                                  exportNPDPdf(item, subKegiatan, pengeluaran, bkuIdx !== -1 ? bkuIdx + 1 : '-');
                                } catch (err) {

                                  console.error('[NPD Debug] Error:', err);
                                  window.alert('Gagal mencetak NPD: ' + (err.message || 'Terjadi kesalahan sistem. Silakan refresh halaman (Ctrl+Shift+R).'));
                                }
                              }}
                              className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 rounded-xl shadow-sm transition-all"
                              title="Cetak NPD"
                            >
                              <Printer size={15} />
                            </button>
                          )}
                          {item.file_pdf_link && (
                            <a
                              href={item.file_pdf_link}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 bg-white border border-slate-200 text-emerald-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 rounded-xl shadow-sm transition-all flex items-center justify-center shrink-0"
                              title={`Buka Lampiran: ${item.file_pdf_name || 'PDF Bukti Bayar/Transfer'}`}
                            >
                              <FileText size={15} />
                            </a>
                          )}
                          {user?.role !== 'viewer' && (
                            <>
                              <button
                                onClick={() => {
                                  if (isDateLocked(item.tanggal)) return
                                  openEdit(item)
                                }}
                                disabled={isDateLocked(item.tanggal)}
                                className={`p-2 bg-white border rounded-xl shadow-sm transition-all ${
                                  isDateLocked(item.tanggal)
                                    ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                                    : 'border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50'
                                }`}
                                title={isDateLocked(item.tanggal) ? "Periode Terkunci 🔒" : "Edit Data"}
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  if (isDateLocked(item.tanggal)) return
                                  setDeleteId(item.id)
                                }}
                                disabled={isDateLocked(item.tanggal)}
                                className={`p-2 bg-white border rounded-xl shadow-sm transition-all ${
                                  isDateLocked(item.tanggal)
                                    ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                                    : 'border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50'
                                }`}
                                title={isDateLocked(item.tanggal) ? "Periode Terkunci 🔒" : "Hapus Data"}
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Data Pengeluaran' : 'Tambah Pengeluaran Baru'}
        size="xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Input
                label="Tanggal"
                type="date"
                value={form.tanggal}
                onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                onPaste={handlePasteTanggal}
                required
              />

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Mekanisme Pembayaran</label>
                <div className="flex gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input 
                      type="radio" 
                      name="jenis"
                      checked={form.jenis === 'GU'}
                      onChange={() => setForm(f => ({ ...f, jenis: 'GU' }))}
                      className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    Ganti Uang (GU)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input 
                      type="radio" 
                      name="jenis"
                      checked={form.jenis === 'LS'}
                      onChange={() => setForm(f => ({ ...f, jenis: 'LS' }))}
                      className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    Langsung (LS)
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input 
                      type="radio" 
                      name="jenis"
                      checked={form.jenis === 'Pajak'}
                      onChange={() => setForm(f => ({ ...f, jenis: 'Pajak' }))}
                      className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    Pajak
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                    <input 
                      type="radio" 
                      name="jenis"
                      checked={form.jenis === 'Pajak LS'}
                      onChange={() => setForm(f => ({ ...f, jenis: 'Pajak LS' }))}
                      className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    Pajak LS
                  </label>
                </div>
              </div>

              <SearchableSelect
                label="Sub Kegiatan"
                value={form.sub_kegiatan_id}
                onChange={e => setForm(f => ({ ...f, sub_kegiatan_id: e.target.value, kode_rekening_id: '' }))}
                options={skOptions}
                required
              />
              <SearchableSelect
                label="Kode Rekening"
                value={form.kode_rekening_id}
                onChange={e => setForm(f => ({ ...f, kode_rekening_id: e.target.value }))}
                options={rekeningOptions}
                placeholder={selectedSk ? 'Pilih rekening...' : 'Pilih sub kegiatan dulu'}
                required
              />

              {selectedSk && (
                <div className="bg-indigo-50/50 rounded-2xl p-5 text-xs space-y-3 border border-indigo-100/60 shadow-sm animate-in fade-in duration-300">
                  <p className="font-black text-indigo-600 uppercase tracking-widest text-[9px] border-b border-indigo-100/40 pb-1.5">{selectedSk.nama}</p>
                  
                  {/* Sisa Quota Pagu Tahunan DPA */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-500">Sisa Quota Pagu DPA (Tahunan)</span>
                      <span className="font-extrabold text-slate-800">{formatRupiah(calculatedSkPagu - realisasiSk)}</span>
                    </div>
                    <ProgressBar value={persen(realisasiSk, calculatedSkPagu)} />
                  </div>

                  {/* Sisa Quota Rencana Anggaran Kas (RAK) Bulanan */}
                  {rakInfo && (
                    <div className="border-t border-slate-200/60 pt-3 mt-3 space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Monitor RAK Belanja (Akumulatif s.d {rakInfo.bulan})</span>
                      <div className="grid grid-cols-2 gap-3 text-[10px] font-bold">
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-400 block text-[8px] uppercase font-bold">RAK Bulan Ini</span>
                          <span className="text-slate-800 font-extrabold">{formatRupiah(rakInfo.rakBulanIni)}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-400 block text-[8px] uppercase font-bold">Batas Akumulatif RAK</span>
                          <span className="text-slate-800 font-extrabold">{formatRupiah(rakInfo.rakAccumulated)}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-400 block text-[8px] uppercase font-bold">Realisasi RAK</span>
                          <span className="text-slate-800 font-extrabold">{formatRupiah(rakInfo.realisasiSebelumnya)}</span>
                        </div>
                        <div className={`p-2.5 rounded-xl border ${rakInfo.sisaRAK >= 0 ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' : 'bg-red-50/50 border-red-100 text-red-700'}`}>
                          <span className="block text-[8px] uppercase font-black opacity-75">Sisa RAK Tersedia</span>
                          <span className="font-black text-[11px]">{formatRupiah(rakInfo.sisaRAK)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Unggah Berkas Bukti Bayar/Transfer PDF */}
              {isElectron && (
                <div className="space-y-1.5 mt-6 pt-6 border-t border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Berkas PDF Pendukung Bukti Bayar/Transfer</label>
                  
                  {selectedPdf ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-xs font-bold text-emerald-800 animate-in zoom-in-95 shadow-sm">
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={16} className="text-emerald-600 shrink-0" />
                        <span className="truncate font-black text-[11px] text-emerald-700">{selectedPdf.name}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setSelectedPdf(null)}
                        className="p-1 hover:bg-emerald-100 text-emerald-600 rounded-full transition-colors flex items-center justify-center shrink-0"
                        title="Hapus Berkas"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div 
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300 text-center flex flex-col items-center justify-center gap-2 cursor-pointer ${
                          isDragging 
                            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99] text-indigo-600 shadow-inner' 
                            : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 text-slate-500'
                        }`}
                        onClick={async () => {
                          try {
                            const file = await window.api?.selectPdfFile()
                            if (file) {
                              setSelectedPdf(file)
                            }
                          } catch (err) {
                            alert('Gagal memilih file: ' + err.message)
                          }
                        }}
                      >
                        <Paperclip size={20} className={`transition-transform duration-300 ${isDragging ? 'rotate-45 scale-110 text-indigo-600' : 'text-slate-400 hover:text-indigo-500'}`} />
                        <div className="space-y-1">
                          <span className="text-xs font-bold block">
                            {isDragging ? 'Lepaskan berkas PDF di sini' : 'Tarik & Lepaskan berkas PDF di sini'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium block">
                            atau klik untuk memilih berkas dari komputer Anda
                          </span>
                        </div>
                      </div>
                      {editingItem?.file_pdf_name && (
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg text-[10px]">
                          <span className="text-slate-500 flex items-center gap-1 truncate font-medium">
                            <FileText size={11} className="text-slate-400" /> Terlampir: <span className="font-bold text-slate-700 truncate">{editingItem.file_pdf_name}</span>
                          </span>
                          <a 
                            href={editingItem.file_pdf_link} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-indigo-600 hover:underline font-bold shrink-0 ml-2"
                          >
                            Lihat PDF ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[9px] text-slate-400 pl-1 leading-tight">
                    * Berkas otomatis diunggah ke Google Drive (Struktur: <span className="font-bold">Keuangan &gt; Bukti Bayar/Transfer</span>).
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {form.jenis === 'Pajak' || form.jenis === 'Pajak LS' ? (
                // UI HANYA Pajak (Pungutan/Potongan)
                <div className="space-y-4">
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Badge variant="primary">Pajak (Pungutan/Potongan)</Badge>
                      </h4>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                          <input 
                            type="radio" 
                            name="mekanisme_pajak"
                            checked={form.pajak_pungut !== false}
                            onChange={() => setForm(f => ({ ...f, pajak_pungut: true }))}
                            className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          Pungut & Setor
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                          <input 
                            type="radio" 
                            name="mekanisme_pajak"
                            checked={form.pajak_pungut === false}
                            onChange={() => setForm(f => ({ ...f, pajak_pungut: false }))}
                            className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          Hanya Setor
                        </label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="PPN"
                        value={form.ppn}
                        onChange={e => handlePpnChange(e.target.value)}
                        placeholder="0"
                        hint={form.ppn ? formatRupiah(parseInt(form.ppn, 10)) : 'Opsional'}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="hidden md:grid md:grid-cols-12 gap-4 text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 px-1">
                        <div className="md:col-span-5">Nominal PPh</div>
                        <div className="md:col-span-5">Jenis PPh</div>
                        <div className="md:col-span-2"></div>
                      </div>

                      {(form.pphs || [{ nominal: '', jenis: 'PPh 23' }]).map((pphItem, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-slate-100/60 pb-3 md:pb-0 md:border-none">
                          <div className="md:col-span-5">
                            <span className="md:hidden text-[10px] font-semibold text-text-secondary uppercase tracking-wide block mb-1">
                              Nominal PPh {idx > 0 ? `#${idx + 1}` : ''}
                            </span>
                            <Input
                              value={pphItem.nominal}
                              onChange={e => handlePphItemChange(idx, 'nominal', e.target.value)}
                              placeholder="0"
                              hint={pphItem.nominal ? formatRupiah(parseInt(pphItem.nominal, 10)) : 'Opsional'}
                            />
                          </div>
                          <div className="md:col-span-5">
                            <span className="md:hidden text-[10px] font-semibold text-text-secondary uppercase tracking-wide block mb-1">
                              Jenis PPh {idx > 0 ? `#${idx + 1}` : ''}
                            </span>
                            <Select
                              value={pphItem.jenis}
                              onChange={e => handlePphItemChange(idx, 'jenis', e.target.value)}
                              options={PPH_OPTIONS}
                              className="[&>select]:py-[10px]"
                              disabled={!pphItem.nominal || parseInt(pphItem.nominal, 10) <= 0}
                            />
                          </div>
                          <div className="md:col-span-2 flex items-center justify-end md:mt-0.5">
                            {idx > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleRemovePph(idx)}
                                className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all h-[38px] w-10 flex items-center justify-center border border-red-100"
                                title="Hapus PPh"
                              >
                                <MinusCircle size={16} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleAddPph}
                                className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all h-[38px] w-10 flex items-center justify-center border border-indigo-100"
                                title="Tambah PPh"
                              >
                                <PlusCircle size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Bayar</span>
                    <span className="text-xl font-black text-indigo-600">
                      {formatRupiah((parseInt(form.ppn, 10) || 0) + (form.pphs || []).reduce((sum, p) => sum + (parseInt(p.nominal, 10) || 0), 0))}
                    </span>
                  </div>
                </div>
              ) : (
                // UI Belanja Biasa (GU/LS)
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rincian Belanja</label>
                    <button type="button" onClick={() => setRincian(r => [...r, { ...EMPTY_RINCIAN }])} className="text-indigo-600 text-[10px] font-black hover:underline flex items-center gap-1">
                      <PlusCircle size={14} /> TAMBAH BARIS
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                    {rincian.map((row, i) => (
                      <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3 relative group">
                        {rincian.length > 1 && (
                          <button type="button" onClick={() => setRincian(r => r.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors">
                            <MinusCircle size={16} />
                          </button>
                        )}
                        <Textarea
                          label="Uraian Rincian"
                          value={row.uraian}
                          onChange={e => updateRincian(i, 'uraian', e.target.value)}
                          placeholder="Apa yang dibayar?"
                          rows={2}
                        />
                        <Input
                          label="Jumlah (Rp)"
                          value={row.jumlah}
                          onChange={e => handleAmountInput(i, e.target.value)}
                          placeholder="0"
                          hint={row.jumlah ? formatRupiah(parseInt(row.jumlah.replace(/\./g, ''), 10)) : 'Bisa copas Excel'}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Bayar</span>
                    <span className="text-xl font-black text-indigo-600">{formatRupiah(totalRincian)}</span>
                  </div>

                  {!editingItem && (
                    <div className="pt-6 mt-6 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Badge variant="primary">Pajak (Pungutan/Potongan)</Badge>
                        </h4>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                            <input 
                              type="radio" 
                              name="mekanisme_pajak"
                              checked={form.pajak_pungut !== false}
                              onChange={() => setForm(f => ({ ...f, pajak_pungut: true }))}
                              className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                            Pungut & Setor
                          </label>
                          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                            <input 
                              type="radio" 
                              name="mekanisme_pajak"
                              checked={form.pajak_pungut === false}
                              onChange={() => setForm(f => ({ ...f, pajak_pungut: false }))}
                              className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                            Hanya Setor
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="PPN"
                          value={form.ppn}
                          onChange={e => handlePpnChange(e.target.value)}
                          placeholder="0"
                          hint={form.ppn ? formatRupiah(parseInt(form.ppn, 10)) : 'Opsional'}
                        />
                      </div>
                      <div className="space-y-3">
                        {/* Header kolom untuk tampilan desktop */}
                        <div className="hidden md:grid md:grid-cols-12 gap-4 text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 px-1">
                          <div className="md:col-span-5">Nominal PPh</div>
                          <div className="md:col-span-5">Jenis PPh</div>
                          <div className="md:col-span-2"></div>
                        </div>

                        {(form.pphs || [{ nominal: '', jenis: 'PPh 23' }]).map((pphItem, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b border-slate-100/60 pb-3 md:pb-0 md:border-none">
                            <div className="md:col-span-5">
                              <span className="md:hidden text-[10px] font-semibold text-text-secondary uppercase tracking-wide block mb-1">
                                Nominal PPh {idx > 0 ? `#${idx + 1}` : ''}
                              </span>
                              <Input
                                value={pphItem.nominal}
                                onChange={e => handlePphItemChange(idx, 'nominal', e.target.value)}
                                placeholder="0"
                                hint={pphItem.nominal ? formatRupiah(parseInt(pphItem.nominal, 10)) : 'Opsional'}
                              />
                            </div>
                            <div className="md:col-span-5">
                              <span className="md:hidden text-[10px] font-semibold text-text-secondary uppercase tracking-wide block mb-1">
                                Jenis PPh {idx > 0 ? `#${idx + 1}` : ''}
                              </span>
                              <Select
                                value={pphItem.jenis}
                                onChange={e => handlePphItemChange(idx, 'jenis', e.target.value)}
                                options={PPH_OPTIONS}
                                className="[&>select]:py-[10px]"
                                disabled={!pphItem.nominal || parseInt(pphItem.nominal, 10) <= 0}
                              />
                            </div>
                            <div className="md:col-span-2 flex items-center justify-end md:mt-0.5">
                              {idx > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemovePph(idx)}
                                  className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all h-[38px] w-10 flex items-center justify-center border border-red-100"
                                  title="Hapus PPh"
                                >
                                  <MinusCircle size={16} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleAddPph}
                                  className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all h-[38px] w-10 flex items-center justify-center border border-indigo-100"
                                  title="Tambah PPh"
                                >
                                  <PlusCircle size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {errors.global && (
            <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠</span>
              <span>{errors.global}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4 pt-6 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving} className="px-10 h-12 shadow-lg shadow-indigo-600/20">
              {saving ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Simpan Transaksi'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        message="Apakah Anda yakin ingin menghapus data pengeluaran ini?"
      />

      <ImportModal 
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </div>
  )
}

