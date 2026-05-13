import { useEffect, useState, useMemo } from 'react'
import { Plus, Trash2, PlusCircle, MinusCircle, Pencil, FileDown, Download, Filter, RefreshCcw, ArrowUp, ArrowDown, Printer, FileText, Paperclip, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRupiah, formatTanggal, persen } from '@/lib/format'
import { exportNPDPdf, exportNPDBatchPdf } from '@/lib/export-pdf'
import { getBkuRows } from '@/lib/bku'
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
  pph: '',
  pph_jenis: 'PPh 23',
  pajak_pungut: true,
}
const EMPTY_RINCIAN = { uraian: '', jumlah: '' }

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

  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [rincian, setRincian] = useState([{ ...EMPTY_RINCIAN }])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [selectedPdf, setSelectedPdf] = useState(null) // { path, name }
  
  // Advanced Filters
  const [filterBulan, setFilterBulan] = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [filterProgram, setFilterProgram] = useState('')
  const [filterKegiatan, setFilterKegiatan] = useState('')
  const [filterSubKegiatan, setFilterSubKegiatan] = useState('')
  const [filterKodeRekening, setFilterKodeRekening] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'tanggal', direction: 'desc' })
  
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    fetchSubKegiatan()
    fetchPengeluaran()
    fetchPenerimaan()
  }, [])

  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const resetFilters = () => {
    setFilterBulan('')
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
        const query = searchQuery.toLowerCase()
        const rincianText = p.pengeluaran_rincian?.map(r => r.uraian).join(' ') || ''
        const headKeterangan = p.keterangan || ''
        if (!rincianText.toLowerCase().includes(query) && !headKeterangan.toLowerCase().includes(query)) {
          return false
        }
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
      .filter(p => p.sub_kegiatan_id === selectedSk.id && p.id !== editingItem?.id)
      .forEach(p => {
        map[p.kode_rekening_id] = (map[p.kode_rekening_id] ?? 0) + p.jumlah
      })
    return map
  }, [selectedSk, pengeluaran, editingItem])

  const calculatedSkPagu = useMemo(() => {
    return (selectedSk?.kode_rekening ?? []).reduce((s, r) => s + (r.pagu_anggaran ?? 0), 0)
  }, [selectedSk])

  const realisasiSk = Object.values(realisasiPerRek).reduce((a, b) => a + b, 0)

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
    setForm({
      tanggal: item.tanggal,
      jenis: item.jenis || 'GU',
      sub_kegiatan_id: item.sub_kegiatan_id,
      kode_rekening_id: item.kode_rekening_id,
      ppn: '',
      pph: '',
      pph_jenis: 'PPh 23',
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

  const handlePphChange = (val) => {
    const digits = val.replace(/\D/g, '')
    setForm(f => ({ ...f, pph: digits }))
  }

  function handleAmountInput(i, val) {
    const cleaned = val.replace(/[^\d]/g, '')
    setRincian(r => r.map((row, idx) => idx === i ? { ...row, jumlah: cleaned } : row))
  }

  function updateRincian(i, field, val) {
    setRincian(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    // Financial Validations
    const amount = totalRincian
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

    if (amount > currentCash) {
      setErrors({ global: `Saldo Kas tidak mencukupi. Sisa saldo kas riil: ${formatRupiah(currentCash)}` })
      return
    }

    setSaving(true)
    setErrors({})

    // Generate a background no_bukti to satisfy DB constraint
    const d = new Date(form.tanggal)
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const bgNoBukti = `BPP-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Date.now()}-${randomSuffix}`

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
    }

    try {
      let res
      if (editingItem) {
        res = await updatePengeluaran(editingItem.id, payload)
      } else {
        res = await addPengeluaran(payload)
        
        // Save Taxes (PPN/PPh) - DUAL ENTRY (Pungut & Setor)
        if (res && res.success) {
          const taxPenerimaanPayloads = []
          const taxPengeluaranPayloads = []

          // 1. Process PPN
          if (form.ppn && parseInt(form.ppn, 10) > 0) {
            const amount = parseInt(form.ppn, 10)
            const desc = rincian[0]?.uraian || 'Belanja'
            
            // Pungutan (Penerimaan)
            if (form.pajak_pungut !== false) {
              taxPenerimaanPayloads.push({
                jenis: 'Pajak',
                tanggal: form.tanggal,
                no_sp2d: bgNoBukti,
                sub_kegiatan_id: form.sub_kegiatan_id,
                kode_rekening_id: form.kode_rekening_id,
                jumlah: amount,
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
                jumlah: amount,
                keterangan: `Setoran PPN dari Belanja: ${desc}`.trim(),
              },
              rincian: []
            })
          }

          // 2. Process PPh
          if (form.pph && parseInt(form.pph, 10) > 0) {
            const amount = parseInt(form.pph, 10)
            const desc = rincian[0]?.uraian || 'Belanja'
            const jenisPph = form.pph_jenis || 'PPh'
            const jenisPajak = form.jenis === 'LS' ? 'Pajak LS' : 'Pajak'
            
            // Pungutan (Penerimaan)
            if (form.pajak_pungut !== false) {
              taxPenerimaanPayloads.push({
                jenis: jenisPajak,
                tanggal: form.tanggal,
                nomor_ls: bgNoBukti,
                sub_kegiatan_id: form.sub_kegiatan_id,
                kode_rekening_id: form.kode_rekening_id,
                jumlah: amount,
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
                jumlah: amount,
                keterangan: `Setoran ${jenisPph} dari Belanja: ${desc}`.trim(),
              },
              rincian: []
            })
          }

          // Batch Insert Penerimaan
          if (taxPenerimaanPayloads.length > 0) {
            await addPenerimaan(taxPenerimaanPayloads)
          }
          
          // Iterative Insert Pengeluaran (Setoran)
          for (const tp of taxPengeluaranPayloads) {
            await addPengeluaran(tp)
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
      const res = await window.api.downloadTemplate('template-pengeluaran.xlsx')
      if (res && res.success) {
        // Success (user saved the file)
      }
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
          <Button variant="secondary" onClick={() => setImportModalOpen(true)} className="h-11 px-6 border-slate-200 hover:bg-slate-50">
            <FileDown size={18} /> Import Excel
          </Button>
          <Button onClick={openNew} className="h-11 px-6 shadow-lg shadow-indigo-600/10 active:scale-95 transition-transform">
            <Plus size={18} /> Tambah Baru
          </Button>
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

                  return (
                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
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
                          <button
                            onClick={() => openEdit(item)}
                            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl shadow-sm transition-all"
                            title="Edit Data"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="p-2 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-xl shadow-sm transition-all"
                            title="Hapus Data"
                          >
                            <Trash2 size={15} />
                          </button>
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
                <div className="bg-indigo-50/50 rounded-xl p-4 text-xs space-y-2 border border-indigo-100">
                  <p className="font-bold text-indigo-600 uppercase tracking-wider mb-1">{selectedSk.nama}</p>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sisa Quota Pagu</span>
                    <span className="font-bold text-slate-700">{formatRupiah(calculatedSkPagu - realisasiSk)}</span>
                  </div>
                  <ProgressBar value={persen(realisasiSk, calculatedSkPagu)} />
                </div>
              )}

              {/* Unggah Berkas Bukti Bayar/Transfer PDF */}
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
                    <button
                      type="button"
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
                      className="w-full flex flex-col sm:flex-row items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-500 hover:text-indigo-600 px-4 py-4 rounded-2xl transition-all duration-300 text-xs font-bold group"
                    >
                      <Paperclip size={15} className="group-hover:rotate-45 transition-transform text-slate-400 group-hover:text-indigo-500" />
                      <span>Pilih Lampiran PDF Bukti Bayar/Transfer</span>
                    </button>
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
            </div>

            <div className="space-y-4">
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

              {!editingItem && form.jenis !== 'Pajak' && (
                <div className="pt-6 mt-6 border-t border-slate-100 space-y-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="PPh"
                      value={form.pph}
                      onChange={e => handlePphChange(e.target.value)}
                      placeholder="0"
                      hint={form.pph ? formatRupiah(parseInt(form.pph, 10)) : 'Opsional'}
                    />
                    <Select
                      label="Jenis PPh"
                      value={form.pph_jenis}
                      onChange={e => setForm(f => ({ ...f, pph_jenis: e.target.value }))}
                      options={PPH_OPTIONS}
                      disabled={!form.pph || parseInt(form.pph, 10) <= 0}
                    />
                  </div>
                </div>
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

