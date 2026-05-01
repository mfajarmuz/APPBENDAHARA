// src/pages/Pengeluaran.jsx
import { useEffect, useState, useMemo } from 'react'
import { Plus, Trash2, PlusCircle, MinusCircle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { formatRupiah, formatTanggal, persen } from '@/lib/format'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

const EMPTY_FORM = {
  tanggal: '',
  no_bukti: '',
  sub_kegiatan_id: '',
  kode_rekening_id: '',
  keterangan: '',
}
const EMPTY_RINCIAN = { uraian: '', volume: '', jumlah: '' }

export default function Pengeluaran() {
  const subKegiatan = useAppStore(s => s.subKegiatan)
  const pengeluaran = useAppStore(s => s.pengeluaran)
  const loading = useAppStore(s => s.loading)
  const fetchSubKegiatan = useAppStore(s => s.fetchSubKegiatan)
  const fetchPengeluaran = useAppStore(s => s.fetchPengeluaran)
  const createPengeluaran = useAppStore(s => s.createPengeluaran)
  const deletePengeluaran = useAppStore(s => s.deletePengeluaran)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [rincian, setRincian] = useState([{ ...EMPTY_RINCIAN }])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [filterSk, setFilterSk] = useState('')

  useEffect(() => {
    fetchSubKegiatan()
    fetchPengeluaran()
  }, [])

  // Selected sub kegiatan object
  const selectedSk = useMemo(
    () => subKegiatan.find(sk => sk.id === form.sub_kegiatan_id) ?? null,
    [subKegiatan, form.sub_kegiatan_id]
  )

  // Kode rekening options for selected sub kegiatan
  const rekeningOptions = useMemo(
    () => (selectedSk?.kode_rekening ?? []).map(r => ({ value: r.id, label: `${r.kode} — ${r.uraian}` })),
    [selectedSk]
  )

  // Realisasi per kode rekening (for saldo panel)
  const realisasiPerRek = useMemo(() => {
    if (!selectedSk) return {}
    const map = {}
    pengeluaran
      .filter(p => p.sub_kegiatan_id === selectedSk.id)
      .forEach(p => {
        map[p.kode_rekening_id] = (map[p.kode_rekening_id] ?? 0) + p.jumlah
      })
    return map
  }, [selectedSk, pengeluaran])

  // Total realisasi for selected sub kegiatan
  const realisasiSk = Object.values(realisasiPerRek).reduce((a, b) => a + b, 0)

  // Total jumlah from rincian rows
  const totalRincian = rincian.reduce((sum, r) => sum + (parseInt(r.jumlah, 10) || 0), 0)

  function openNew() {
    setForm(EMPTY_FORM)
    setRincian([{ ...EMPTY_RINCIAN }])
    setErrors({})
    setModalOpen(true)
  }

  function addRincian() {
    setRincian(r => [...r, { ...EMPTY_RINCIAN }])
  }

  function removeRincian(i) {
    setRincian(r => r.filter((_, idx) => idx !== i))
  }

  function updateRincian(i, field, val) {
    setRincian(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  function validate() {
    const e = {}
    if (!form.tanggal) e.tanggal = 'Tanggal wajib diisi'
    if (!form.no_bukti.trim()) e.no_bukti = 'No. Bukti wajib diisi'
    if (!form.sub_kegiatan_id) e.sub_kegiatan_id = 'Pilih sub kegiatan'
    if (!form.kode_rekening_id) e.kode_rekening_id = 'Pilih kode rekening'
    if (rincian.length === 0) e.rincian = 'Tambahkan minimal 1 rincian'
    rincian.forEach((r, i) => {
      if (!r.uraian.trim()) e[`rincian_uraian_${i}`] = 'Uraian wajib diisi'
      if (!r.jumlah || parseInt(r.jumlah, 10) <= 0) e[`rincian_jumlah_${i}`] = 'Jumlah harus positif'
    })
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setSaving(true)
    try {
      await createPengeluaran({
        pengeluaran: {
          tanggal: form.tanggal,
          no_bukti: form.no_bukti,
          sub_kegiatan_id: form.sub_kegiatan_id,
          kode_rekening_id: form.kode_rekening_id,
          jumlah: totalRincian,
          keterangan: form.keterangan || null,
        },
        rincian: rincian.map(r => ({
          uraian: r.uraian,
          volume: r.volume || null,
          jumlah: parseInt(r.jumlah, 10),
        })),
      })
      setModalOpen(false)
    } catch (err) {
      setErrors({ global: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus pengeluaran ini?')) return
    await deletePengeluaran(id)
  }

  // Filtered list
  const filtered = filterSk
    ? pengeluaran.filter(p => p.sub_kegiatan_id === filterSk)
    : pengeluaran

  const skOptions = subKegiatan.map(sk => ({ value: sk.id, label: `${sk.kode} — ${sk.nama}` }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <select
            value={filterSk}
            onChange={e => setFilterSk(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Semua Sub Kegiatan</option>
            {subKegiatan.map(sk => (
              <option key={sk.id} value={sk.id}>{sk.kode} — {sk.nama}</option>
            ))}
          </select>
        </div>
        <Button onClick={openNew}>
          <Plus size={15} /> Tambah Pengeluaran
        </Button>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading && pengeluaran.length === 0 ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState message="Belum ada data pengeluaran" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bg">
              <tr>
                <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Tanggal</th>
                <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">No. Bukti</th>
                <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Sub Kegiatan</th>
                <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Kode Rekening</th>
                <th className="text-right text-xs font-medium text-text-secondary px-5 py-3">Jumlah</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-t border-border hover:bg-bg/60 transition-colors">
                  <td className="px-5 py-3 text-text-secondary text-xs">{formatTanggal(item.tanggal)}</td>
                  <td className="px-5 py-3 font-medium text-text-primary">{item.no_bukti}</td>
                  <td className="px-5 py-3 text-xs text-text-secondary max-w-[180px] truncate">
                    {item.sub_kegiatan?.nama ?? '-'}
                  </td>
                  <td className="px-5 py-3 text-xs text-text-secondary max-w-[160px] truncate">
                    {item.kode_rekening?.uraian ?? '-'}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-danger">{formatRupiah(item.jumlah)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-text-secondary hover:bg-red-100 hover:text-danger transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modal Form */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Pengeluaran"
        width={720}
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-3">
              {errors.global && (
                <div className="col-span-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-danger">
                  {errors.global}
                </div>
              )}
              <Input
                label="Tanggal"
                type="date"
                value={form.tanggal}
                onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                required
                error={errors.tanggal}
              />
              <Input
                label="No. Bukti / SPP"
                value={form.no_bukti}
                onChange={e => setForm(f => ({ ...f, no_bukti: e.target.value }))}
                placeholder="Contoh: SPP/001/2026"
                required
                error={errors.no_bukti}
              />
              <Select
                label="Sub Kegiatan"
                value={form.sub_kegiatan_id}
                onChange={e => setForm(f => ({ ...f, sub_kegiatan_id: e.target.value, kode_rekening_id: '' }))}
                options={skOptions}
                required
                error={errors.sub_kegiatan_id}
              />
              <Select
                label="Kode Rekening"
                value={form.kode_rekening_id}
                onChange={e => setForm(f => ({ ...f, kode_rekening_id: e.target.value }))}
                options={rekeningOptions}
                placeholder={selectedSk ? 'Pilih rekening...' : 'Pilih sub kegiatan dulu'}
                required
                error={errors.kode_rekening_id}
              />
              <Input
                label="Keterangan"
                value={form.keterangan}
                onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                placeholder="Opsional"
              />

              {/* Saldo Panel */}
              {selectedSk && (
                <div className="bg-accent-light rounded-lg p-3 text-xs space-y-1.5 mt-2">
                  <p className="font-semibold text-accent mb-2">{selectedSk.nama}</p>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Pagu</span>
                    <span className="font-medium">{formatRupiah(selectedSk.total_pagu)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Realisasi</span>
                    <span className="font-medium text-danger">{formatRupiah(realisasiSk)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Sisa</span>
                    <span className="font-medium text-success">{formatRupiah(selectedSk.total_pagu - realisasiSk)}</span>
                  </div>
                  <ProgressBar value={persen(realisasiSk, selectedSk.total_pagu)} />
                </div>
              )}
            </div>

            {/* Right column — Rincian */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-text-secondary">Rincian Belanja</label>
                <button
                  type="button"
                  onClick={addRincian}
                  className="text-accent text-xs flex items-center gap-1 hover:underline"
                >
                  <PlusCircle size={13} /> Tambah Baris
                </button>
              </div>
              {errors.rincian && <p className="text-xs text-danger mb-2">{errors.rincian}</p>}

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {rincian.map((row, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2 relative">
                    {rincian.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRincian(i)}
                        className="absolute top-2 right-2 text-text-secondary hover:text-danger"
                      >
                        <MinusCircle size={13} />
                      </button>
                    )}
                    <Input
                      label="Uraian"
                      value={row.uraian}
                      onChange={e => updateRincian(i, 'uraian', e.target.value)}
                      placeholder="Nama barang/jasa"
                      error={errors[`rincian_uraian_${i}`]}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        label="Volume/Satuan"
                        value={row.volume}
                        onChange={e => updateRincian(i, 'volume', e.target.value)}
                        placeholder="Contoh: 10 Lembar"
                      />
                      <Input
                        label="Jumlah (Rp)"
                        type="number"
                        value={row.jumlah}
                        onChange={e => updateRincian(i, 'jumlah', e.target.value)}
                        placeholder="0"
                        error={errors[`rincian_jumlah_${i}`]}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-3 flex justify-between items-center border-t border-border pt-3">
                <span className="text-xs text-text-secondary font-medium">Total Pengeluaran</span>
                <span className="font-bold text-danger">{formatRupiah(totalRincian)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Pengeluaran'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
