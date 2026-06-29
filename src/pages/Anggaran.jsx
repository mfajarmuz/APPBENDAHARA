// src/pages/Anggaran.jsx
import { useEffect, useState, useMemo } from 'react'
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, Folder, List, Tag, FileText } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRupiah, persen } from '@/lib/format'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const EMPTY_SK = { kode: '', nama: '', sumber_dana: 'PAD', tahun_anggaran: '2026' }
const EMPTY_REK = {
  kode: '',
  uraian: '',
  pagu_anggaran: '',
  rak_jan: '', rak_feb: '', rak_mar: '',
  rak_apr: '', rak_mei: '', rak_jun: '',
  rak_jul: '', rak_agu: '', rak_sep: '',
  rak_okt: '', rak_nov: '', rak_des: ''
}
const EMPTY_PARENT = { kode: '', nama: '' }

export default function Anggaran() {
  const subKegiatan = useStore(s => s.subKegiatan)
  const pengeluaran = useStore(s => s.pengeluaran)
  const settings = useStore(s => s.settings)
  const isLoading = useStore(s => s.isLoading)
  const fetchSubKegiatan = useStore(s => s.fetchSubKegiatan)
  const fetchPengeluaran = useStore(s => s.fetchPengeluaran)
  
  const updateProgram = useStore(s => s.updateProgram)
  const addProgram = useStore(s => s.addProgram)
  const updateKegiatan = useStore(s => s.updateKegiatan)
  const addKegiatan = useStore(s => s.addKegiatan)
  const updateSubKegiatan = useStore(s => s.updateSubKegiatan)
  const addSubKegiatan = useStore(s => s.addSubKegiatan)
  const deleteSubKegiatan = useStore(s => s.deleteSubKegiatan)
  
  const addKodeRekening = useStore(s => s.addKodeRekening)
  const updateKodeRekening = useStore(s => s.updateKodeRekening)
  const deleteKodeRekening = useStore(s => s.deleteKodeRekening)
  const parseRakPdf = useStore(s => s.parseRakPdf)
  const saveBulkRekening = useStore(s => s.saveBulkRekening)
  const user = useStore(s => s.user)

  const [expanded, setExpanded] = useState({})
  const [expandedRak, setExpandedRak] = useState({})
  const [saving, setSaving] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parsedPdfData, setParsedPdfData] = useState(null)
  const [pdfPreviewModal, setPdfPreviewModal] = useState(false)

  const [deleteSkId, setDeleteSkId] = useState(null)
  const [deleteRekId, setDeleteRekId] = useState(null)

  // Modals state
  const [progModal, setProgModal] = useState(false)
  const [progForm, setProgForm] = useState(EMPTY_PARENT)
  const [editingProgId, setEditingProgId] = useState(null)

  const [kegModal, setKegModal] = useState(false)
  const [kegForm, setKegForm] = useState(EMPTY_PARENT)
  const [editingKegId, setEditingKegId] = useState(null)

  const [skModal, setSkModal] = useState(false)
  const [skForm, setSkForm] = useState(EMPTY_SK)
  const [editingSk, setEditingSk] = useState(null)

  const [rekModal, setRekModal] = useState(false)
  const [rekForm, setRekForm] = useState(EMPTY_REK)
  const [editingRekId, setEditingRekId] = useState(null)
  const [rekParentId, setRekParentId] = useState(null)

  useEffect(() => {
    fetchSubKegiatan()
    fetchPengeluaran()
  }, [])

  const hierarchicalData = useMemo(() => {
    const progs = {}
    subKegiatan.forEach(sk => {
      const prog = sk.kegiatan?.program
      const keg = sk.kegiatan
      if (!prog || !keg) return
      if (!progs[prog.id]) progs[prog.id] = { ...prog, kegiatans: {}, totalPagu: 0 }
      if (!progs[prog.id].kegiatans[keg.id]) progs[prog.id].kegiatans[keg.id] = { ...keg, subKegiatans: [], totalPagu: 0 }
      const skPagu = (sk.kode_rekening ?? []).reduce((s, r) => s + (r.pagu_anggaran ?? 0), 0)
      progs[prog.id].kegiatans[keg.id].subKegiatans.push({ ...sk, calculatedPagu: skPagu })
      progs[prog.id].kegiatans[keg.id].totalPagu += skPagu
      progs[prog.id].totalPagu += skPagu
    })
    return Object.values(progs).sort((a, b) => a.kode.localeCompare(b.kode)).map(p => ({
      ...p,
      kegiatans: Object.values(p.kegiatans).sort((a, b) => a.kode.localeCompare(b.kode)).map(k => ({
        ...k,
        subKegiatans: k.subKegiatans.sort((a, b) => a.kode.localeCompare(b.kode))
      }))
    }))
  }, [subKegiatan])

  const realisasiPerRek = useMemo(() => {
    const map = {}
    pengeluaran.forEach(p => {
      if (p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS') {
        map[p.kode_rekening_id] = (map[p.kode_rekening_id] ?? 0) + p.jumlah
      }
    })
    return map
  }, [pengeluaran])

  const sumRAK = useMemo(() => {
    return (parseInt(rekForm.rak_jan || 0, 10)) + (parseInt(rekForm.rak_feb || 0, 10)) + (parseInt(rekForm.rak_mar || 0, 10)) +
      (parseInt(rekForm.rak_apr || 0, 10)) + (parseInt(rekForm.rak_mei || 0, 10)) + (parseInt(rekForm.rak_jun || 0, 10)) +
      (parseInt(rekForm.rak_jul || 0, 10)) + (parseInt(rekForm.rak_agu || 0, 10)) + (parseInt(rekForm.rak_sep || 0, 10)) +
      (parseInt(rekForm.rak_okt || 0, 10)) + (parseInt(rekForm.rak_nov || 0, 10)) + (parseInt(rekForm.rak_des || 0, 10));
  }, [rekForm])

  const paguVal = useMemo(() => {
    return parseInt(rekForm.pagu_anggaran || 0, 10);
  }, [rekForm.pagu_anggaran])

  const diffVal = paguVal - sumRAK;

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))
  const toggleExpandRak = (id) => setExpandedRak(e => ({ ...e, [id]: !e[id] }))

  // Sub Kegiatan
  function openNewSk(kegId) {
    setEditingSk(null)
    setSkForm({ ...EMPTY_SK, kegiatan_id: kegId })
    setSkModal(true)
  }
  function openEditSk(sk) {
    setEditingSk(sk)
    setSkForm({ kode: sk.kode, nama: sk.nama, sumber_dana: sk.sumber_dana, tahun_anggaran: String(sk.tahun_anggaran), kegiatan_id: sk.kegiatan_id })
    setSkModal(true)
  }
  async function handleSkSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { ...skForm, tahun_anggaran: parseInt(skForm.tahun_anggaran, 10) }
      const res = editingSk 
        ? await updateSubKegiatan({ id: editingSk.id, ...payload })
        : await addSubKegiatan(payload)
      if (res && !res.success) {
        throw new Error(res.error || 'Gagal menyimpan sub kegiatan')
      }
      setSkModal(false)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  // Program
  function openNewProg() {
    setEditingProgId(null)
    setProgForm(EMPTY_PARENT)
    setProgModal(true)
  }
  function openEditProg(prog) {
    setEditingProgId(prog.id); setProgForm({ kode: prog.kode, nama: prog.nama }); setProgModal(true)
  }
  async function handleProgSubmit(e) {
    e.preventDefault(); setSaving(true)
    try { 
      const res = editingProgId 
        ? await updateProgram(editingProgId, progForm)
        : await addProgram(progForm);
      if (res && !res.success) {
        throw new Error(res.error || 'Gagal menyimpan program')
      }
      setProgModal(false) 
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  // Kegiatan
  function openNewKeg(progId) {
    setEditingKegId(null)
    setKegForm({ ...EMPTY_PARENT, program_id: progId })
    setKegModal(true)
  }
  function openEditKeg(keg) {
    setEditingKegId(keg.id); setKegForm({ kode: keg.kode, nama: keg.nama, program_id: keg.program_id }); setKegModal(true)
  }
  async function handleKegSubmit(e) {
    e.preventDefault(); setSaving(true)
    try { 
      const res = editingKegId 
        ? await updateKegiatan(editingKegId, kegForm)
        : await addKegiatan(kegForm);
      if (res && !res.success) {
        throw new Error(res.error || 'Gagal menyimpan kegiatan')
      }
      setKegModal(false) 
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  // Rekening
  function openNewRek(skId) { setEditingRekId(null); setRekParentId(skId); setRekForm(EMPTY_REK); setRekModal(true) }
  function openEditRek(rek, skId) {
    setEditingRekId(rek.id); setRekParentId(skId); setRekForm({
      kode: rek.kode,
      uraian: rek.uraian,
      pagu_anggaran: String(rek.pagu_anggaran),
      rak_jan: String(rek.rak_jan || 0),
      rak_feb: String(rek.rak_feb || 0),
      rak_mar: String(rek.rak_mar || 0),
      rak_apr: String(rek.rak_apr || 0),
      rak_mei: String(rek.rak_mei || 0),
      rak_jun: String(rek.rak_jun || 0),
      rak_jul: String(rek.rak_jul || 0),
      rak_agu: String(rek.rak_agu || 0),
      rak_sep: String(rek.rak_sep || 0),
      rak_okt: String(rek.rak_okt || 0),
      rak_nov: String(rek.rak_nov || 0),
      rak_des: String(rek.rak_des || 0)
    })
    setRekModal(true)
  }
  async function handleRekSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      const payload = {
        kode: rekForm.kode.trim(),
        uraian: rekForm.uraian.trim(),
        pagu_anggaran: parseInt(rekForm.pagu_anggaran, 10),
        sub_kegiatan_id: rekParentId,
        rak_jan: parseInt(rekForm.rak_jan || 0, 10),
        rak_feb: parseInt(rekForm.rak_feb || 0, 10),
        rak_mar: parseInt(rekForm.rak_mar || 0, 10),
        rak_apr: parseInt(rekForm.rak_apr || 0, 10),
        rak_mei: parseInt(rekForm.rak_mei || 0, 10),
        rak_jun: parseInt(rekForm.rak_jun || 0, 10),
        rak_jul: parseInt(rekForm.rak_jul || 0, 10),
        rak_agu: parseInt(rekForm.rak_agu || 0, 10),
        rak_sep: parseInt(rekForm.rak_sep || 0, 10),
        rak_okt: parseInt(rekForm.rak_okt || 0, 10),
        rak_nov: parseInt(rekForm.rak_nov || 0, 10),
        rak_des: parseInt(rekForm.rak_des || 0, 10)
      }

      // Validasi sum RAK == pagu_anggaran
      const sumRAK =
        payload.rak_jan + payload.rak_feb + payload.rak_mar +
        payload.rak_apr + payload.rak_mei + payload.rak_jun +
        payload.rak_jul + payload.rak_agu + payload.rak_sep +
        payload.rak_okt + payload.rak_nov + payload.rak_des;

      if (sumRAK !== payload.pagu_anggaran) {
        alert(`Gagal menyimpan! Total RAK Belanja (Rp ${sumRAK.toLocaleString('id-ID')}) harus sama dengan Pagu Anggaran (Rp ${payload.pagu_anggaran.toLocaleString('id-ID')}).\nSisa yang belum dialokasikan: Rp ${(payload.pagu_anggaran - sumRAK).toLocaleString('id-ID')}`);
        setSaving(false);
        return;
      }

      const res = editingRekId 
        ? await updateKodeRekening({ id: editingRekId, ...payload })
        : await addKodeRekening(payload)
      if (res && !res.success) {
        throw new Error(res.error || 'Gagal menyimpan kode rekening')
      }
      setRekModal(false)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  function autoSplit12() {
    const pagu = parseInt(rekForm.pagu_anggaran, 10) || 0
    if (pagu <= 0) return
    const base = Math.floor(pagu / 12)
    const rem = pagu % 12
    setRekForm(f => ({
      ...f,
      rak_jan: String(base),
      rak_feb: String(base),
      rak_mar: String(base),
      rak_apr: String(base),
      rak_mei: String(base),
      rak_jun: String(base),
      rak_jul: String(base),
      rak_agu: String(base),
      rak_sep: String(base),
      rak_okt: String(base),
      rak_nov: String(base),
      rak_des: String(base + rem)
    }))
  }

  async function handleImportPdfClick() {
    try {
      const selectedFile = await (window.api ? window.api.selectPdfFile() : null)
      if (!selectedFile) return
      
      setIsParsing(true)
      const res = await parseRakPdf(selectedFile.path)
      if (res && res.success) {
        setParsedPdfData(res.data)
        setPdfPreviewModal(true)
      } else {
        alert(res?.error || 'Gagal membaca berkas PDF RAK Belanja.')
      }
    } catch (err) {
      alert(`Terjadi kesalahan: ${err.message}`)
    } finally {
      setIsParsing(false)
    }
  }

  async function handleConfirmImport() {
    if (!parsedPdfData) return
    setSaving(true)
    try {
      const res = await saveBulkRekening(parsedPdfData)
      if (res && res.success) {
        setPdfPreviewModal(false)
        setParsedPdfData(null)
        alert('Berhasil mengimpor RAK Belanja dari PDF!')
      } else {
        alert(res?.error || 'Gagal menyimpan data ke database.')
      }
    } catch (err) {
      alert(`Terjadi kesalahan saat menyimpan: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading && subKegiatan.length === 0) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-6 pb-20">
      {/* Sub Unit Organisasi Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
              <Tag size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Sub Unit Organisasi</p>
              <h1 className="text-lg font-black text-slate-800 leading-tight">
                <span className="text-indigo-600 mr-2">{settings.unit_kerja_kode}</span>
                {settings.unit_kerja}
              </h1>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
            <div className="bg-slate-50 px-6 py-3 rounded-xl border border-slate-100 text-left sm:text-right w-full sm:w-auto shrink-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pagu Anggaran</p>
              <p className="text-xl font-black text-slate-800">
                {formatRupiah(hierarchicalData.reduce((s, p) => s + p.totalPagu, 0))}
              </p>
            </div>
            {user?.role !== 'viewer' && (
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
                <Button variant="secondary" onClick={handleImportPdfClick} disabled={isParsing} className="h-12 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-sm transition-all shrink-0">
                  <FileText size={18} /> {isParsing ? 'Membaca PDF...' : 'Import RAK dari PDF'}
                </Button>
                <Button onClick={openNewProg} className="h-12 shadow-md shadow-indigo-600/20 shrink-0">
                  <Plus size={18} /> Tambah Program
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {hierarchicalData.length === 0 ? (
        <Card><EmptyState message="Belum ada data anggaran" /></Card>
      ) : (
        hierarchicalData.map(prog => (
          <div key={prog.id} className="space-y-4">
            {/* Program Header */}
            <div className="flex items-center justify-between group px-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/10 rounded-lg text-indigo-600"><Folder size={20} /></div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-500/60 uppercase tracking-tighter block leading-none mb-1">{prog.kode}</span>
                  <h2 className="text-sm font-black text-slate-800 uppercase leading-none">{prog.nama}</h2>
                </div>
                {user?.role !== 'viewer' && (
                  <>
                    <button 
                      onClick={() => openEditProg(prog)} 
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
                      title="Edit Program"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => openNewKeg(prog.id)} 
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
                      title="Tambah Kegiatan"
                    >
                      <Plus size={14} />
                    </button>
                  </>
                )}
              </div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Pagu Program</p>
                <p className="text-sm font-black text-indigo-600 leading-none">{formatRupiah(prog.totalPagu)}</p>
              </div>
            </div>

            {prog.kegiatans.map(keg => {
              const kegExpanded = !!expanded[keg.id]
              return (
                <div key={keg.id} className="ml-8 space-y-3">
                  <div 
                    className="flex items-center justify-between p-4 bg-white border border-slate-200 shadow-sm rounded-2xl cursor-pointer hover:border-indigo-200 transition-all group/keg"
                    onClick={() => toggleExpand(keg.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-1.5 rounded-lg transition-colors ${kegExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {kegExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-mono text-slate-400 font-bold">{keg.kode}</span>
                          {user?.role !== 'viewer' && (
                            <>
                              <button 
                                onClick={(e) => { e.stopPropagation(); openEditKeg(keg) }} 
                                className="p-1 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 rounded-md transition-all shadow-sm"
                                title="Edit Kegiatan"
                              >
                                <Pencil size={12} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); openNewSk(keg.id) }} 
                                className="p-1 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 rounded-md transition-all shadow-sm"
                                title="Tambah Sub Kegiatan"
                              >
                                <Plus size={12} />
                              </button>
                            </>
                          )}
                        </div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase leading-none">{keg.nama}</h3>
                      </div>
                    </div>
                    <div className="text-right border-l border-slate-100 pl-6">
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider leading-none mb-1">Total Kegiatan</p>
                      <p className="text-xs font-black text-slate-800 leading-none">{formatRupiah(keg.totalPagu)}</p>
                    </div>
                  </div>

                  {kegExpanded && (
                    <div className="ml-6 space-y-2 border-l-2 border-slate-100/50 pl-6">
                      {keg.subKegiatans.map(sk => {
                        const skExpanded = !!expanded[sk.id]
                        const skReal = (sk.kode_rekening ?? []).reduce((sum, r) => sum + (realisasiPerRek[r.id] ?? 0), 0)
                        const p = persen(skReal, sk.calculatedPagu)
                        return (
                          <div key={sk.id} className="space-y-2">
                            <Card className="p-0 overflow-hidden border-slate-200 shadow-none hover:shadow-lg transition-all group/sk">
                              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/50" onClick={() => toggleExpand(sk.id)}>
                                <div className={`text-slate-300 transition-transform ${skExpanded ? 'rotate-90' : ''}`}><ChevronRight size={16} /></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-mono text-indigo-400 font-black">{sk.kode}</span>
                                    <Badge variant={p > 90 ? 'danger' : p > 70 ? 'warning' : 'success'}>{p}%</Badge>
                                  </div>
                                  <p className="text-xs font-bold text-slate-800 uppercase truncate">{sk.nama}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-[9px] text-slate-400 uppercase font-black leading-none mb-1">Pagu Sub Kegiatan</p>
                                  <p className="text-xs font-black text-slate-900 leading-none">{formatRupiah(sk.calculatedPagu)}</p>
                                </div>
                                {user?.role !== 'viewer' && (
                                  <div className="flex items-center gap-1 ml-4" onClick={e => e.stopPropagation()}>
                                    <button 
                                      onClick={() => openEditSk(sk)} 
                                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
                                      title="Edit Sub Kegiatan"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button 
                                      onClick={() => setDeleteSkId(sk.id)} 
                                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
                                      title="Hapus Sub Kegiatan"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </div>
                              {skExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50/20 pb-2">
                                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Rekening Belanja</span>
                                    {user?.role !== 'viewer' && (
                                      <button onClick={() => openNewRek(sk.id)} className="text-[10px] text-indigo-600 font-black flex items-center gap-1 hover:underline"><Plus size={14} /> TAMBAH REKENING</button>
                                    )}
                                  </div>
                                  <div className="px-3 overflow-x-auto">
                                    <table className="w-full text-[11px] border-separate border-spacing-0 min-w-[800px]">
                                      <thead>
                                        <tr className="text-slate-400">
                                          <th className="text-left px-3 py-2 font-black uppercase tracking-tighter">Kode Rekening</th>
                                          <th className="text-left px-3 py-2 font-black uppercase tracking-tighter">Uraian</th>
                                          <th className="text-right px-3 py-2 font-black uppercase tracking-tighter">Pagu</th>
                                          <th className="text-right px-3 py-2 font-black uppercase tracking-tighter">Realisasi</th>
                                          <th className="w-20" />
                                        </tr>
                                      </thead>
                                      <tbody>
                                          {sk.kode_rekening.sort((a,b) => a.kode.localeCompare(b.kode)).map(rek => {
                                            const real = realisasiPerRek[rek.id] ?? 0
                                            const isExpanded = !!expandedRak[rek.id]
                                            return (
                                              <>
                                                <tr key={rek.id} className="hover:bg-white transition-colors group/rek">
                                                  <td className="px-3 py-2.5 font-mono text-slate-400 border-t border-slate-100">{sk.kode}.{rek.kode}</td>
                                                  <td className="px-3 py-2.5 text-slate-700 font-bold border-t border-slate-100">
                                                    <div className="flex items-center gap-2">
                                                      <span>{rek.uraian}</span>
                                                      <button 
                                                        onClick={() => toggleExpandRak(rek.id)} 
                                                        className={`px-2 py-0.5 rounded transition-all text-[8px] font-black uppercase tracking-widest border ${
                                                          isExpanded 
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100' 
                                                            : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/50'
                                                        }`}
                                                        title="Tampilkan Detail RAK Bulanan"
                                                      >
                                                        {isExpanded ? 'TUTUP RAK' : 'RAK BELANJA'}
                                                      </button>
                                                    </div>
                                                  </td>
                                                  <td className="px-3 py-2.5 text-right font-black text-slate-900 border-t border-slate-100">{formatRupiah(rek.pagu_anggaran)}</td>
                                                  <td className="px-3 py-2.5 text-right font-bold text-red-500 border-t border-slate-100">{formatRupiah(real)}</td>
                                                  <td className="px-3 py-2.5 border-t border-slate-100">
                                                    {user?.role !== 'viewer' && (
                                                      <div className="flex items-center justify-end gap-1 transition-all">
                                                        <button 
                                                          onClick={() => openEditRek(rek, sk.id)} 
                                                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
                                                          title="Edit Rekening"
                                                        >
                                                          <Pencil size={12} />
                                                        </button>
                                                        <button
                                                          onClick={() => setDeleteRekId(rek.id)}
                                                          className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
                                                          title="Hapus Rekening"
                                                        >
                                                          <Trash2 size={12} />
                                                        </button>
                                                      </div>
                                                    )}
                                                  </td>
                                                </tr>
                                                {isExpanded && (
                                                  <tr className="bg-slate-50/30">
                                                    <td colSpan={5} className="px-4 py-3 border-t border-slate-100 bg-slate-50/30">
                                                      <div className="grid grid-cols-4 md:grid-cols-12 gap-2 text-[10px] bg-white p-4 rounded-2xl border border-slate-100 shadow-inner">
                                                        <div className="col-span-4 md:col-span-12 border-b border-slate-100 pb-2 mb-1 flex items-center justify-between">
                                                          <span className="font-black text-indigo-600 uppercase tracking-widest text-[9px]">Distribusi Anggaran Kas Bulanan (RAK Belanja)</span>
                                                          <span className="font-black text-slate-500">
                                                            Total Alokasi RAK: {formatRupiah(
                                                              (rek.rak_jan || 0) + (rek.rak_feb || 0) + (rek.rak_mar || 0) +
                                                              (rek.rak_apr || 0) + (rek.rak_mei || 0) + (rek.rak_jun || 0) +
                                                              (rek.rak_jul || 0) + (rek.rak_agu || 0) + (rek.rak_sep || 0) +
                                                              (rek.rak_okt || 0) + (rek.rak_nov || 0) + (rek.rak_des || 0)
                                                            )}
                                                          </span>
                                                        </div>
                                                        <div className="flex flex-col p-1.5 bg-slate-50 rounded border border-slate-100 text-center"><span className="text-slate-400 font-bold text-[8px] uppercase">Jan</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_jan || 0)}</span></div>
                                                        <div className="flex flex-col p-1.5 bg-slate-50 rounded border border-slate-100 text-center"><span className="text-slate-400 font-bold text-[8px] uppercase">Feb</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_feb || 0)}</span></div>
                                                        <div className="flex flex-col p-1.5 bg-slate-50 rounded border border-slate-100 text-center"><span className="text-slate-400 font-bold text-[8px] uppercase">Mar</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_mar || 0)}</span></div>
                                                        <div className="flex flex-col p-1.5 bg-slate-50 rounded border border-slate-100 text-center"><span className="text-slate-400 font-bold text-[8px] uppercase">Apr</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_apr || 0)}</span></div>
                                                        <div className="flex flex-col p-1.5 bg-slate-50 rounded border border-slate-100 text-center"><span className="text-slate-400 font-bold text-[8px] uppercase">Mei</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_mei || 0)}</span></div>
                                                        <div className="flex flex-col p-1.5 bg-slate-50 rounded border border-slate-100 text-center"><span className="text-slate-400 font-bold text-[8px] uppercase">Jun</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_jun || 0)}</span></div>
                                                        <div className="flex flex-col p-1.5 bg-slate-50 rounded border border-slate-100 text-center"><span className="text-slate-400 font-bold text-[8px] uppercase">Jul</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_jul || 0)}</span></div>
                                                        <div className="flex flex-col p-1.5 bg-slate-50 rounded border border-slate-100 text-center"><span className="text-slate-400 font-bold text-[8px] uppercase">Agu</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_agu || 0)}</span></div>
                                                        <div className="flex flex-col p-1.5 bg-slate-50 rounded border border-slate-100 text-center"><span className="text-slate-400 font-bold text-[8px] uppercase">Sep</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_sep || 0)}</span></div>
                                                        <div className="flex flex-col p-1.5 bg-slate-50 rounded border border-slate-100 text-center"><span className="text-slate-400 font-bold text-[8px] uppercase">Okt</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_okt || 0)}</span></div>
                                                        <div className="flex flex-col p-1.5 bg-slate-50 rounded border border-slate-100 text-center"><span className="text-slate-400 font-bold text-[8px] uppercase">Nov</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_nov || 0)}</span></div>
                                                        <div className="flex flex-col p-1.5 bg-slate-50 rounded border border-slate-100 text-center"><span className="text-slate-400 font-bold text-[8px] uppercase">Des</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_des || 0)}</span></div>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                )}
                                              </>
                                            )
                                          })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </Card>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))
      )}

      {/* Modals */}
      <Modal open={progModal} onClose={() => setProgModal(false)} title={editingProgId ? 'Edit Program' : 'Tambah Program'}>
        <form onSubmit={handleProgSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Kode Program" value={progForm.kode} onChange={e => setProgForm({...progForm, kode: e.target.value})} required />
            <Input label="Nama Program" value={progForm.nama} onChange={e => setProgForm({...progForm, nama: e.target.value})} required />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setProgModal(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={kegModal} onClose={() => setKegModal(false)} title={editingKegId ? 'Edit Kegiatan' : 'Tambah Kegiatan'}>
        <form onSubmit={handleKegSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Kode Kegiatan" value={kegForm.kode} onChange={e => setKegForm({...kegForm, kode: e.target.value})} required />
            <Input label="Nama Kegiatan" value={kegForm.nama} onChange={e => setKegForm({...kegForm, nama: e.target.value})} required />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setKegModal(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={skModal} onClose={() => setSkModal(false)} title={editingSk ? 'Edit Sub Kegiatan' : 'Tambah Sub Kegiatan'}>
        <form onSubmit={handleSkSubmit} className="space-y-4">
          <Input label="Kode Sub Kegiatan" value={skForm.kode} onChange={e => setSkForm({...skForm, kode: e.target.value})} required />
          <Input label="Nama Sub Kegiatan" value={skForm.nama} onChange={e => setSkForm({...skForm, nama: e.target.value})} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Sumber Dana" value={skForm.sumber_dana} onChange={e => setSkForm({...skForm, sumber_dana: e.target.value})} />
            <Input label="Tahun" type="number" value={skForm.tahun_anggaran} onChange={e => setSkForm({...skForm, tahun_anggaran: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setSkModal(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={rekModal} onClose={() => setRekModal(false)} title={editingRekId ? 'Edit Rekening' : 'Tambah Rekening'}>
        <form onSubmit={handleRekSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Kode Rekening" value={rekForm.kode} onChange={e => setRekForm({...rekForm, kode: e.target.value})} placeholder="5.1.02..." required />
            <Input label="Pagu Anggaran" type="number" value={rekForm.pagu_anggaran} onChange={e => setRekForm({...rekForm, pagu_anggaran: e.target.value})} required />
          </div>
          <Textarea label="Uraian Belanja" value={rekForm.uraian} onChange={e => setRekForm({...rekForm, uraian: e.target.value})} required rows={2} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setRekModal(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteSkId}
        onClose={() => setDeleteSkId(null)}
        onConfirm={async () => {
          if (deleteSkId) {
            const res = await deleteSubKegiatan(deleteSkId)
            if (res && !res.success) alert(`Gagal menghapus: ${res.error}`)
            setDeleteSkId(null)
          }
        }}
        message="Hapus Sub Kegiatan ini beserta seluruh rekening di dalamnya?"
      />

      <ConfirmDialog
        open={!!deleteRekId}
        onClose={() => setDeleteRekId(null)}
        onConfirm={async () => {
          if (deleteRekId) {
            const res = await deleteKodeRekening(deleteRekId)
            if (res && !res.success) alert(`Gagal menghapus: ${res.error}`)
            setDeleteRekId(null)
          }
        }}
        message="Hapus Rekening Belanja ini?"
      />

      <Modal open={pdfPreviewModal} onClose={() => setPdfPreviewModal(false)} title="Pratinjau Impor RAK Belanja dari PDF">
        {parsedPdfData && (
          <div className="space-y-6 max-h-[80vh] overflow-y-auto px-2">
            {/* Header Metadata Info */}
            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/60 space-y-3 animate-in fade-in zoom-in-95">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block border-b border-indigo-100/40 pb-1">Metadata Sub Kegiatan Terdeteksi</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div><span className="text-slate-400 font-bold">Program:</span> <span className="font-extrabold text-slate-700">{parsedPdfData.header.programKode} — {parsedPdfData.header.programNama}</span></div>
                <div><span className="text-slate-400 font-bold">Kegiatan:</span> <span className="font-extrabold text-slate-700">{parsedPdfData.header.kegiatanKode} — {parsedPdfData.header.kegiatanNama}</span></div>
                <div className="md:col-span-2"><span className="text-slate-400 font-bold">Sub Kegiatan:</span> <span className="font-extrabold text-indigo-700">{parsedPdfData.header.subKegiatanKode} — {parsedPdfData.header.subKegiatanNama}</span></div>
                <div><span className="text-slate-400 font-bold">Unit Organisasi:</span> <span className="font-extrabold text-slate-700">{parsedPdfData.header.subUnitOrganisasi || parsedPdfData.header.unitOrganisasi}</span></div>
                <div><span className="text-slate-400 font-bold">Total Nilai Anggaran:</span> <span className="font-black text-emerald-600">{formatRupiah(parsedPdfData.header.totalAnggaran)}</span></div>
              </div>
            </div>

            {/* Rekening List */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Daftar Rekening Belanja & Anggaran Kas ({parsedPdfData.rekening.length} Rekening)</span>
              
              <div className="space-y-3">
                {parsedPdfData.rekening.map((rek, idx) => {
                  const subTotal = 
                    rek.rak_jan + rek.rak_feb + rek.rak_mar +
                    rek.rak_apr + rek.rak_mei + rek.rak_jun +
                    rek.rak_jul + rek.rak_agu + rek.rak_sep +
                    rek.rak_okt + rek.rak_nov + rek.rak_des;
                  
                  const isBalanced = subTotal === rek.pagu_anggaran;

                  return (
                    <Card key={idx} className="p-4 border-slate-200 shadow-sm hover:border-indigo-100 hover:shadow transition-all space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 font-mono text-[10px] text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200">{rek.kode}</span>
                          <span className="text-xs font-black text-slate-800 uppercase">{rek.uraian}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none mb-0.5">Pagu Rekening</span>
                          <span className="text-xs font-black text-slate-900">{formatRupiah(rek.pagu_anggaran)}</span>
                        </div>
                      </div>

                      {/* 12-month Grid display */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-[9px]">
                        <div className="bg-slate-50 p-2 rounded text-center border border-slate-100"><span className="text-slate-400 font-bold block mb-0.5">Jan</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_jan)}</span></div>
                        <div className="bg-slate-50 p-2 rounded text-center border border-slate-100"><span className="text-slate-400 font-bold block mb-0.5">Feb</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_feb)}</span></div>
                        <div className="bg-slate-50 p-2 rounded text-center border border-slate-100"><span className="text-slate-400 font-bold block mb-0.5">Mar</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_mar)}</span></div>
                        <div className="bg-slate-50 p-2 rounded text-center border border-slate-100"><span className="text-slate-400 font-bold block mb-0.5">Apr</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_apr)}</span></div>
                        <div className="bg-slate-50 p-2 rounded text-center border border-slate-100"><span className="text-slate-400 font-bold block mb-0.5">Mei</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_mei)}</span></div>
                        <div className="bg-slate-50 p-2 rounded text-center border border-slate-100"><span className="text-slate-400 font-bold block mb-0.5">Jun</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_jun)}</span></div>
                        <div className="bg-slate-50 p-2 rounded text-center border border-slate-100"><span className="text-slate-400 font-bold block mb-0.5">Jul</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_jul)}</span></div>
                        <div className="bg-slate-50 p-2 rounded text-center border border-slate-100"><span className="text-slate-400 font-bold block mb-0.5">Agu</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_agu)}</span></div>
                        <div className="bg-slate-50 p-2 rounded text-center border border-slate-100"><span className="text-slate-400 font-bold block mb-0.5">Sep</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_sep)}</span></div>
                        <div className="bg-slate-50 p-2 rounded text-center border border-slate-100"><span className="text-slate-400 font-bold block mb-0.5">Okt</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_okt)}</span></div>
                        <div className="bg-slate-50 p-2 rounded text-center border border-slate-100"><span className="text-slate-400 font-bold block mb-0.5">Nov</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_nov)}</span></div>
                        <div className="bg-slate-50 p-2 rounded text-center border border-slate-100"><span className="text-slate-400 font-bold block mb-0.5">Des</span><span className="font-extrabold text-slate-700">{formatRupiah(rek.rak_des)}</span></div>
                      </div>

                      {/* Balanced Indicator */}
                      <div className={`p-2 rounded-xl text-[9px] font-bold text-center border ${
                        isBalanced 
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                          : 'bg-red-50 border-red-100 text-red-700'
                      }`}>
                        {isBalanced 
                          ? '✓ Alokasi RAK 12 Bulan Sesuai dengan Pagu Rekening' 
                          : `⚠ Selisih Alokasi RAK: ${formatRupiah(rek.pagu_anggaran - subTotal)} (Harus Rp 0)`
                        }
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setPdfPreviewModal(false)} type="button">Batal</Button>
              <Button type="button" onClick={handleConfirmImport} disabled={saving}>
                {saving ? 'Mengimpor...' : 'Impor Sekarang (Upsert)'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
