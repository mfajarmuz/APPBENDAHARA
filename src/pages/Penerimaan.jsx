// src/pages/Penerimaan.jsx
import { useEffect, useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Filter, RefreshCcw } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRupiah, formatTanggal } from '@/lib/format'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import SearchableSelect from '@/components/ui/SearchableSelect'
import Textarea from '@/components/ui/Textarea'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const EMPTY_FORM = { jenis: 'LS', tanggal: new Date().toISOString().split('T')[0], nomor_ls: '', sub_kegiatan_id: '', kode_rekening_id: '', jumlah: '', ppn: '', pph: '', pph_jenis: 'PPh 23', keterangan: '', langsung_bayar: false }

const JENIS_OPTIONS = [
  { value: 'UP', label: 'UP (Uang Persediaan)' },
  { value: 'GU', label: 'GU (Ganti Uang)' },
  { value: 'LS', label: 'LS' },
  { value: 'Pajak', label: 'Pajak' },
  { value: 'Pajak LS', label: 'Pajak LS' }
]

const PPH_OPTIONS = [
  { value: 'PPh 21', label: 'PPh 21' },
  { value: 'PPh 22', label: 'PPh 22' },
  { value: 'PPh 23', label: 'PPh 23' },
  { value: 'PPh Pasal 4 ayat 2', label: 'PPh Pasal 4 ayat 2' },
]

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export default function Penerimaan() {
  const penerimaan = useStore(s => s.penerimaan)
  const subKegiatan = useStore(s => s.subKegiatan)
  const isLoading = useStore(s => s.isLoading)
  const fetchPenerimaan = useStore(s => s.fetchPenerimaan)
  const fetchSubKegiatan = useStore(s => s.fetchSubKegiatan)
  const addPenerimaan = useStore(s => s.addPenerimaan)
  const addPengeluaran = useStore(s => s.addPengeluaran)
  const updatePenerimaan = useStore(s => s.updatePenerimaan)
  const deletePenerimaan = useStore(s => s.deletePenerimaan)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = new, object = edit
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [deleteId, setDeleteId] = useState(null)

  // Filters
  const [filterBulan, setFilterBulan] = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [searchNo, setSearchNo] = useState('')
  const [searchKet, setSearchKet] = useState('')

  useEffect(() => { 
    fetchPenerimaan()
    fetchSubKegiatan()
  }, [])

  const resetFilters = () => {
    setFilterBulan('')
    setFilterJenis('')
    setSearchNo('')
    setSearchKet('')
  }

  const filtered = useMemo(() => {
    return penerimaan.filter(p => {
      if (filterBulan !== '') {
        const d = new Date(p.tanggal)
        if (d.getMonth() !== parseInt(filterBulan, 10)) return false
      }
      if (filterJenis && p.jenis !== filterJenis) return false
      if (searchNo && !(p.nomor_ls || '').toLowerCase().includes(searchNo.toLowerCase())) return false
      if (searchKet && !(p.keterangan || '').toLowerCase().includes(searchKet.toLowerCase())) return false
      return true
    }).sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
  }, [penerimaan, filterBulan, filterJenis, searchNo, searchKet])

  function openNew() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, tanggal: new Date().toISOString().split('T')[0] })
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      jenis: item.jenis ?? 'LS',
      tanggal: item.tanggal ?? '',
      nomor_ls: item.nomor_ls ?? '',
      sub_kegiatan_id: item.sub_kegiatan_id ?? '',
      kode_rekening_id: item.kode_rekening_id ?? '',
      jumlah: String(item.jumlah ?? ''),
      ppn: '',
      pph: '',
      pph_jenis: 'PPh 23',
      keterangan: item.keterangan ?? '',
      langsung_bayar: false,
    })
    setErrors({})
    setModalOpen(true)
  }

  function validate() {
    const e = {}
    if (!form.jenis) e.jenis = 'Jenis wajib dipilih'
    if (!form.tanggal) e.tanggal = 'Tanggal wajib diisi'
    if (form.jenis === 'LS') {
      if (!form.sub_kegiatan_id) e.sub_kegiatan_id = 'Sub Kegiatan wajib dipilih untuk LS'
      if (!form.kode_rekening_id) e.kode_rekening_id = 'Kode Rekening wajib dipilih untuk LS'
    }
    if (!form.jumlah || isNaN(Number(form.jumlah)) || Number(form.jumlah) <= 0) e.jumlah = 'Jumlah harus angka positif'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setSaving(true)
    try {
      let res;
      let rawKet = form.keterangan || ''
      
      // Bersihkan prefix jika ada (mencegah duplikasi jika diedit ulang)
      rawKet = rawKet.replace(/^(diterima belanja|dibayar belanja|belanja|diterima|dibayar)\s+/i, '').trim()

      if (editing) {
        const payload = {
          jenis: form.jenis,
          tanggal: form.tanggal,
          nomor_ls: form.nomor_ls || null,
          sub_kegiatan_id: form.jenis === 'LS' ? form.sub_kegiatan_id : null,
          kode_rekening_id: form.jenis === 'LS' ? form.kode_rekening_id : null,
          jumlah: parseInt(form.jumlah, 10),
          keterangan: rawKet || null,
        }
        res = await updatePenerimaan({ id: editing.id, ...payload })
      } else {
        const payloads = []
        
        // 1. LS Utama (Penerimaan)
        const ketPenerimaan = form.jenis === 'LS' ? `Diterima Belanja ${rawKet}`.trim() : rawKet
        payloads.push({
          jenis: form.jenis,
          tanggal: form.tanggal,
          nomor_ls: form.nomor_ls || null,
          sub_kegiatan_id: form.jenis === 'LS' ? form.sub_kegiatan_id : null,
          kode_rekening_id: form.jenis === 'LS' ? form.kode_rekening_id : null,
          jumlah: parseInt(form.jumlah, 10),
          keterangan: ketPenerimaan || null,
        })

        // 2. Pajak PPN (Penerimaan/Pungutan)
        if (form.jenis === 'LS' && form.ppn && parseInt(form.ppn, 10) > 0) {
          payloads.push({
            jenis: 'Pajak LS',
            tanggal: form.tanggal,
            nomor_ls: form.nomor_ls || null,
            sub_kegiatan_id: form.sub_kegiatan_id,
            kode_rekening_id: form.kode_rekening_id,
            jumlah: parseInt(form.ppn, 10),
            keterangan: 'Diterima PPN',
          })
        }

        // 3. Pajak PPh (Penerimaan/Pungutan)
        if (form.jenis === 'LS' && form.pph && parseInt(form.pph, 10) > 0) {
          payloads.push({
            jenis: 'Pajak LS',
            tanggal: form.tanggal,
            nomor_ls: form.nomor_ls || null,
            sub_kegiatan_id: form.sub_kegiatan_id,
            kode_rekening_id: form.kode_rekening_id,
            jumlah: parseInt(form.pph, 10),
            keterangan: `Diterima ${form.pph_jenis || 'PPh'}`,
          })
        }

        res = await addPenerimaan(payloads)

        // OTOMATIS BAYAR (Jika Opsi Dipilih)
        if (res && res.success && form.jenis === 'LS' && form.langsung_bayar) {
          const amount = parseInt(form.jumlah, 10)
          const ketPengeluaran = `Dibayar Belanja ${rawKet}`.trim()
          
          // 1. Pengeluaran Utama
          await addPengeluaran({
            pengeluaran: {
              tanggal: form.tanggal,
              jenis: 'LS',
              no_bukti: form.nomor_ls || `LS-${Date.now()}`,
              sub_kegiatan_id: form.sub_kegiatan_id,
              kode_rekening_id: form.kode_rekening_id,
              jumlah: amount,
              keterangan: ketPengeluaran || null,
            },
            rincian: [{
              uraian: ketPengeluaran || 'Pembayaran LS',
              volume: null,
              jumlah: amount,
            }]
          })

          // 2. Setoran PPN (Pengeluaran)
          if (form.ppn && parseInt(form.ppn, 10) > 0) {
            await addPengeluaran({
              pengeluaran: {
                tanggal: form.tanggal,
                jenis: 'Pajak LS',
                no_bukti: form.nomor_ls || `LS-${Date.now()}`,
                sub_kegiatan_id: form.sub_kegiatan_id,
                kode_rekening_id: form.kode_rekening_id,
                jumlah: parseInt(form.ppn, 10),
                keterangan: 'Disetor PPN',
              },
              rincian: []
            })
          }

          // 3. Setoran PPh (Pengeluaran)
          if (form.pph && parseInt(form.pph, 10) > 0) {
            await addPengeluaran({
              pengeluaran: {
                tanggal: form.tanggal,
                jenis: 'Pajak LS',
                no_bukti: form.nomor_ls || `LS-${Date.now()}`,
                sub_kegiatan_id: form.sub_kegiatan_id,
                kode_rekening_id: form.kode_rekening_id,
                jumlah: parseInt(form.pph, 10),
                keterangan: `Disetor ${form.pph_jenis || 'PPh'}`,
              },
              rincian: []
            })
          }
        }
      }
      
      if (res && !res.success) {
        throw new Error(res.error || 'Terjadi kesalahan saat menyimpan data.')
      }
      
      setModalOpen(false)
    } catch (err) {
      setErrors({ global: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    const res = await deletePenerimaan(deleteId)
    if (res && !res.success) alert(`Gagal menghapus: ${res.error}`)
    setDeleteId(null)
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

  const handleJumlahChange = (e) => {
    const val = e.target.value
    // Bersihkan karakter selain angka (sehingga bisa menerima paste "Rp 1.000.000")
    const digits = val.replace(/\D/g, '')
    setForm(f => ({ ...f, jumlah: digits }))
  }

  const handlePpnChange = (e) => {
    const val = e.target.value
    const digits = val.replace(/\D/g, '')
    setForm(f => ({ ...f, ppn: digits }))
  }

  const handlePphChange = (e) => {
    const val = e.target.value
    const digits = val.replace(/\D/g, '')
    setForm(f => ({ ...f, pph: digits }))
  }

  const totalPenerimaan = penerimaan.reduce((sum, p) => sum + (p.jumlah ?? 0), 0)
const selectedSk = subKegiatan.find(sk => sk.id === form.sub_kegiatan_id)
const kodeRekeningOptions = selectedSk?.kode_rekening?.map(r => ({
  value: r.id, label: `${r.kode} - ${r.uraian}`
})) || []

return (
  <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary text-sm">
            Total: <span className="font-semibold text-success">{formatRupiah(totalPenerimaan)}</span>
            <span className="ml-2 text-xs">({penerimaan.length} Transaksi)</span>
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={15} /> Tambah Penerimaan
        </Button>
      </div>
{/* Filters */}
<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
      <Filter size={14} className="text-indigo-600" /> Filter Data Penerimaan
    </h3>
    <button 
      onClick={resetFilters}
      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase tracking-wider transition-colors"
    >
      <RefreshCcw size={10} /> Reset Filter
    </button>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        {JENIS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>

    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block pl-1 text-indigo-600">No. Ref / LS</label>
      <input
        type="text"
        value={searchNo}
        onChange={e => setSearchNo(e.target.value)}
        placeholder="Cari nomor..."
        className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
      />
    </div>

    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block pl-1 text-indigo-600">Keterangan</label>
      <input
        type="text"
        value={searchKet}
        onChange={e => setSearchKet(e.target.value)}
        placeholder="Cari keterangan..."
        className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
      />
    </div>
  </div>
</div>

{/* Table */}
<Card className="p-0 overflow-hidden">
  {isLoading && penerimaan.length === 0 ? (
    <div className="flex justify-center py-16"><Spinner /></div>
  ) : filtered.length === 0 ? (
    <EmptyState message="Tidak ada data yang sesuai dengan filter" />
  ) : (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-sm min-w-[800px]">
        <thead>
          <tr className="bg-bg/50 border-b border-border">
            <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Tanggal</th>
            <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Jenis</th>
            <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Keterangan</th>
            <th className="text-right text-xs font-medium text-text-secondary px-5 py-3">Jumlah</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((item, i) => (
                  <tr
                    key={item.id}
                    className="border-t border-border hover:bg-bg/60 transition-colors"
                  >
                    <td className="px-5 py-3 text-text-secondary text-xs">{formatTanggal(item.tanggal)}</td>
                    <td className="px-5 py-3 font-medium text-text-primary">{item.jenis ?? 'LS'}</td>
                    <td className="px-5 py-3 text-text-secondary text-xs max-w-xs truncate">{item.keterangan ?? '-'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-success">{formatRupiah(item.jumlah)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-text-secondary hover:bg-accent-light hover:text-accent transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-1.5 rounded-lg text-text-secondary hover:bg-red-100 hover:text-danger transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Form */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Penerimaan' : 'Tambah Penerimaan'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.global && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-danger">
              {errors.global}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Jenis Penerimaan"
              value={form.jenis}
              onChange={e => setForm(f => ({ ...f, jenis: e.target.value }))}
              options={JENIS_OPTIONS}
              required
              error={errors.jenis}
            />
            <Input
              label="Tanggal"
              type="date"
              value={form.tanggal}
              onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
              onPaste={handlePasteTanggal}
              required
              error={errors.tanggal}
            />
          </div>

          {form.jenis === 'LS' && (
            <div className="grid grid-cols-1 gap-4">
              <SearchableSelect
                label="Sub Kegiatan"
                value={form.sub_kegiatan_id}
                onChange={e => setForm(f => ({ ...f, sub_kegiatan_id: e.target.value, kode_rekening_id: '' }))}
                options={subKegiatan.map(sk => ({ value: sk.id, label: `${sk.kode} - ${sk.nama}` }))}
                required
                error={errors.sub_kegiatan_id}
              />
              <SearchableSelect
                label="Kode Rekening"
                value={form.kode_rekening_id}
                onChange={e => setForm(f => ({ ...f, kode_rekening_id: e.target.value }))}
                options={kodeRekeningOptions}
                disabled={!form.sub_kegiatan_id}
                required
                error={errors.kode_rekening_id}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="No. Referensi / LS"
              value={form.nomor_ls}
              onChange={e => setForm(f => ({ ...f, nomor_ls: e.target.value }))}
              placeholder="Contoh: 23/LS/2026"
            />
            <Input
              label="Jumlah (Rp)"
              type="text"
              inputMode="numeric"
              value={form.jumlah}
              onChange={handleJumlahChange}
              placeholder="0"
              required
              error={errors.jumlah}
              hint={form.jumlah ? formatRupiah(parseInt(form.jumlah, 10) || 0) : ''}
            />
          </div>

          {form.jenis === 'LS' && !editing && (
            <div className="space-y-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="langsung_bayar"
                  checked={form.langsung_bayar}
                  onChange={e => setForm(f => ({ ...f, langsung_bayar: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="langsung_bayar" className="text-xs font-black text-indigo-700 cursor-pointer uppercase tracking-tight">
                  Dapat langsung dibayarkan beserta dengan pajaknya
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="PPN (Opsional)"
                  type="text"
                  inputMode="numeric"
                  value={form.ppn}
                  onChange={handlePpnChange}
                  placeholder="0"
                  hint={form.ppn ? formatRupiah(parseInt(form.ppn, 10) || 0) : ''}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="PPh (Opsional)"
                  type="text"
                  inputMode="numeric"
                  value={form.pph}
                  onChange={handlePphChange}
                  placeholder="0"
                  hint={form.pph ? formatRupiah(parseInt(form.pph, 10) || 0) : ''}
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

          <Textarea
            label="Keterangan"
            value={form.keterangan}
            onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
            placeholder="Opsional"
            rows={2}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : form.langsung_bayar ? 'Simpan & Bayar' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        message="Apakah Anda yakin ingin menghapus data penerimaan ini?"
      />
    </div>
  )
}
