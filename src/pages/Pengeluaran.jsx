// src/pages/Pengeluaran.jsx
import { useEffect, useState, useMemo } from 'react'
import { Plus, Trash2, PlusCircle, MinusCircle, Pencil, FileDown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRupiah, formatTanggal, persen } from '@/lib/format'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ImportModal from '@/components/ui/ImportModal'

const EMPTY_FORM = {
  tanggal: new Date().toISOString().split('T')[0],
  sub_kegiatan_id: '',
  kode_rekening_id: '',
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
  const updatePengeluaran = useStore(s => s.updatePengeluaran)
  const deletePengeluaran = useStore(s => s.deletePengeluaran)

  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [rincian, setRincian] = useState([{ ...EMPTY_RINCIAN }])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [filterSk, setFilterSk] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    fetchSubKegiatan()
    fetchPengeluaran()
    fetchPenerimaan()
  }, [])

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
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditingItem(item)
    setForm({
      tanggal: item.tanggal,
      sub_kegiatan_id: item.sub_kegiatan_id,
      kode_rekening_id: item.kode_rekening_id,
    })
    setRincian(item.pengeluaran_rincian?.length > 0 
      ? item.pengeluaran_rincian.map(r => ({ uraian: r.uraian, jumlah: String(r.jumlah) }))
      : [{ uraian: item.keterangan || '', jumlah: String(item.jumlah) }]
    )
    setErrors({})
    setModalOpen(true)
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
    const bgNoBukti = `BPP-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Date.now()}`

    const payload = {
      pengeluaran: {
        tanggal: form.tanggal,
        no_bukti: bgNoBukti,
        sub_kegiatan_id: form.sub_kegiatan_id,
        kode_rekening_id: form.kode_rekening_id,
        jumlah: amount,
        keterangan: rincian[0]?.uraian || null,
      },
      rincian: rincian.map(r => ({
        uraian: r.uraian,
        volume: null,
        jumlah: parseInt(String(r.jumlah).replace(/\./g, ''), 10),
      })),
    }

    console.log('--- START SUBMIT DIAGNOSTICS ---')
    console.log('Payload Pengeluaran:', payload.pengeluaran)
    console.log('Payload Rincian:', payload.rincian)

    try {
      let res
      if (editingItem) {
        console.log('Mode: EDIT, ID:', editingItem.id)
        res = await updatePengeluaran(editingItem.id, payload)
      } else {
        console.log('Mode: NEW')
        res = await addPengeluaran(payload)
      }


      console.log('API Response:', res)

      if (res && res.success) {
        console.log('Save SUCCESS')
        setModalOpen(false)
      } else {
        console.error('Save FAILED:', res?.error)
        setErrors({ global: res?.error || 'Gagal menyimpan data ke database' })
      }
    } catch (err) {
      console.error('Submit EXCEPTION:', err)
      setErrors({ global: err.message })
    } finally {
      setSaving(false)
      console.log('--- END SUBMIT DIAGNOSTICS ---')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    const res = await deletePengeluaran(deleteId)
    if (res && !res.success) alert(`Gagal menghapus: ${res.error}`)
    setDeleteId(null)
  }

  const filtered = filterSk
    ? pengeluaran.filter(p => p.sub_kegiatan_id === filterSk)
    : pengeluaran

  const skOptions = subKegiatan.map(sk => ({ value: sk.id, label: `${sk.kode} — ${sk.nama}` }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex-1 max-w-md">
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block pl-1">Filter Sub Kegiatan</label>
          <select
            value={filterSk}
            onChange={e => setFilterSk(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          >
            <option value="">Semua Sub Kegiatan</option>
            {subKegiatan.map(sk => (
              <option key={sk.id} value={sk.id}>{sk.kode} — {sk.nama}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setImportModalOpen(true)} className="h-11 px-6 border-slate-200 hover:bg-slate-50">
            <FileDown size={18} /> Import Excel
          </Button>
          <Button onClick={openNew} className="h-11 px-6 shadow-lg shadow-indigo-600/10 active:scale-95 transition-transform">
            <Plus size={18} /> Tambah Pengeluaran Baru
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-slate-200/60 shadow-xl">
        <div className="overflow-x-auto">
          {isLoading && pengeluaran.length === 0 ? (
            <div className="flex justify-center py-20"><Spinner size={32} /></div>
          ) : filtered.length === 0 ? (
            <EmptyState message="Belum ada data pengeluaran untuk ditampilkan" />
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-10 text-center">No.</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-32 text-center">Tanggal</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-48">Kode Rekening</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Uraian / Keterangan</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-40 text-right">Jumlah (Rp)</th>
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
                    : item.keterangan || 'belanja'
                  
                  // Clean redundant "Dibayar" or "kegiatan" from input to avoid "Dibayar Dibayar..."
                  rincianText = rincianText.replace(/^(dibayar|kegiatan)\s+/i, '').trim()
                  const parentName = keg?.nama || subK?.nama || '-'

                  return (
                    <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-6 py-4 text-xs text-slate-400 font-medium text-center">{idx + 1}</td>
                      <td className="px-6 py-4 text-xs text-slate-600 font-semibold text-center">{formatTanggal(item.tanggal)}</td>
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 group-hover:border-indigo-200 group-hover:text-indigo-600 transition-colors">
                          {fullCode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          Dibayar {rincianText} pada kegiatan {parentName}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-red-600">{formatRupiah(item.jumlah)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 transition-all">
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
        width={800}
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input
                label="Tanggal"
                type="date"
                value={form.tanggal}
                onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                required
              />
              <Select
                label="Sub Kegiatan"
                value={form.sub_kegiatan_id}
                onChange={e => setForm(f => ({ ...f, sub_kegiatan_id: e.target.value, kode_rekening_id: '' }))}
                options={skOptions}
                required
              />
              <Select
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
