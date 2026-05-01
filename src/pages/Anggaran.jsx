// src/pages/Anggaran.jsx
import { useEffect, useState, useMemo } from 'react'
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { formatRupiah, persen } from '@/lib/format'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

const EMPTY_SK = { kode: '', nama: '', total_pagu: '', sumber_dana: 'PAD', tahun_anggaran: '2026' }
const EMPTY_REK = { kode: '', uraian: '', pagu_anggaran: '' }

export default function Anggaran() {
  const subKegiatan = useAppStore(s => s.subKegiatan)
  const pengeluaran = useAppStore(s => s.pengeluaran)
  const loading = useAppStore(s => s.loading)
  const fetchSubKegiatan = useAppStore(s => s.fetchSubKegiatan)
  const fetchPengeluaran = useAppStore(s => s.fetchPengeluaran)
  const createSubKegiatan = useAppStore(s => s.createSubKegiatan)
  const updateSubKegiatan = useAppStore(s => s.updateSubKegiatan)
  const deleteSubKegiatan = useAppStore(s => s.deleteSubKegiatan)
  const createRekening = useAppStore(s => s.createRekening)
  const updateRekening = useAppStore(s => s.updateRekening)
  const deleteRekening = useAppStore(s => s.deleteRekening)

  const [expanded, setExpanded] = useState({}) // { [skId]: boolean }
  const [skModal, setSkModal] = useState(false)
  const [skEditing, setSkEditing] = useState(null)
  const [skForm, setSkForm] = useState(EMPTY_SK)
  const [rekModal, setRekModal] = useState(false)
  const [rekEditing, setRekEditing] = useState(null)
  const [rekParentId, setRekParentId] = useState(null)
  const [rekForm, setRekForm] = useState(EMPTY_REK)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchSubKegiatan()
    fetchPengeluaran()
  }, [])

  // Realisasi per sub_kegiatan
  const realisasiPerSk = useMemo(() => {
    const map = {}
    pengeluaran.forEach(p => {
      map[p.sub_kegiatan_id] = (map[p.sub_kegiatan_id] ?? 0) + p.jumlah
    })
    return map
  }, [pengeluaran])

  // Realisasi per kode_rekening
  const realisasiPerRek = useMemo(() => {
    const map = {}
    pengeluaran.forEach(p => {
      map[p.kode_rekening_id] = (map[p.kode_rekening_id] ?? 0) + p.jumlah
    })
    return map
  }, [pengeluaran])

  function toggleExpand(id) {
    setExpanded(e => ({ ...e, [id]: !e[id] }))
  }

  // Sub Kegiatan modal handlers
  function openNewSk() {
    setSkEditing(null)
    setSkForm(EMPTY_SK)
    setErrors({})
    setSkModal(true)
  }

  function openEditSk(sk) {
    setSkEditing(sk)
    setSkForm({
      kode: sk.kode,
      nama: sk.nama,
      total_pagu: String(sk.total_pagu),
      sumber_dana: sk.sumber_dana,
      tahun_anggaran: String(sk.tahun_anggaran),
    })
    setErrors({})
    setSkModal(true)
  }

  async function handleSkSubmit(e) {
    e.preventDefault()
    const err = {}
    if (!skForm.kode.trim()) err.kode = 'Kode wajib diisi'
    if (!skForm.nama.trim()) err.nama = 'Nama wajib diisi'
    if (!skForm.total_pagu || parseInt(skForm.total_pagu, 10) <= 0) err.total_pagu = 'Pagu harus positif'
    if (Object.keys(err).length) { setErrors(err); return }
    setSaving(true)
    try {
      const payload = {
        kode: skForm.kode.trim(),
        nama: skForm.nama.trim(),
        total_pagu: parseInt(skForm.total_pagu, 10),
        sumber_dana: skForm.sumber_dana,
        tahun_anggaran: parseInt(skForm.tahun_anggaran, 10),
      }
      if (skEditing) await updateSubKegiatan({ id: skEditing.id, ...payload })
      else await createSubKegiatan(payload)
      setSkModal(false)
    } catch (err) {
      setErrors({ global: err.message })
    } finally {
      setSaving(false)
    }
  }

  // Rekening modal handlers
  function openNewRek(skId) {
    setRekEditing(null)
    setRekParentId(skId)
    setRekForm(EMPTY_REK)
    setErrors({})
    setRekModal(true)
  }

  function openEditRek(rek, skId) {
    setRekEditing(rek)
    setRekParentId(skId)
    setRekForm({ kode: rek.kode, uraian: rek.uraian, pagu_anggaran: String(rek.pagu_anggaran) })
    setErrors({})
    setRekModal(true)
  }

  async function handleRekSubmit(e) {
    e.preventDefault()
    const err = {}
    if (!rekForm.kode.trim()) err.kode = 'Kode wajib diisi'
    if (!rekForm.uraian.trim()) err.uraian = 'Uraian wajib diisi'
    if (!rekForm.pagu_anggaran || parseInt(rekForm.pagu_anggaran, 10) <= 0) err.pagu_anggaran = 'Pagu harus positif'
    if (Object.keys(err).length) { setErrors(err); return }
    setSaving(true)
    try {
      const payload = {
        kode: rekForm.kode.trim(),
        uraian: rekForm.uraian.trim(),
        pagu_anggaran: parseInt(rekForm.pagu_anggaran, 10),
        sub_kegiatan_id: rekParentId,
      }
      if (rekEditing) await updateRekening({ id: rekEditing.id, ...payload })
      else await createRekening(payload)
      setRekModal(false)
    } catch (err) {
      setErrors({ global: err.message })
    } finally {
      setSaving(false)
    }
  }

  const totalPagu = subKegiatan.reduce((s, sk) => s + sk.total_pagu, 0)
  const totalReal = Object.values(realisasiPerSk).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          Total Pagu: <span className="font-semibold text-text-primary">{formatRupiah(totalPagu)}</span>
          <span className="mx-2">·</span>
          Realisasi: <span className="font-semibold text-danger">{formatRupiah(totalReal)}</span>
        </p>
        <Button onClick={openNewSk}>
          <Plus size={15} /> Tambah Sub Kegiatan
        </Button>
      </div>

      {/* List */}
      {loading && subKegiatan.length === 0 ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : subKegiatan.length === 0 ? (
        <Card><EmptyState message="Belum ada sub kegiatan DPA" /></Card>
      ) : (
        <div className="space-y-2">
          {subKegiatan.map(sk => {
            const real = realisasiPerSk[sk.id] ?? 0
            const p = persen(real, sk.total_pagu)
            const isOpen = !!expanded[sk.id]

            return (
              <Card key={sk.id} className="p-0 overflow-hidden">
                {/* Sub kegiatan row */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-bg/60 transition-colors"
                  onClick={() => toggleExpand(sk.id)}
                >
                  <span className="text-text-secondary">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-text-secondary font-mono">{sk.kode}</span>
                    </div>
                    <p className="text-sm font-medium text-text-primary truncate">{sk.nama}</p>
                    <div className="mt-1.5 max-w-xs">
                      <ProgressBar value={p} />
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-text-secondary">Pagu</p>
                    <p className="text-sm font-semibold text-text-primary">{formatRupiah(sk.total_pagu)}</p>
                    <p className="text-xs text-danger">{formatRupiah(real)} terpakai</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => openEditSk(sk)}
                      className="p-1.5 rounded-lg text-text-secondary hover:bg-accent-light hover:text-accent transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('Hapus sub kegiatan dan semua rekening di dalamnya?'))
                          await deleteSubKegiatan(sk.id)
                      }}
                      className="p-1.5 rounded-lg text-text-secondary hover:bg-red-100 hover:text-danger transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Kode rekening rows (expanded) */}
                {isOpen && (
                  <div className="border-t border-border bg-bg">
                    <div className="flex items-center justify-between px-5 py-2.5">
                      <span className="text-xs font-medium text-text-secondary">Kode Rekening</span>
                      <button
                        onClick={() => openNewRek(sk.id)}
                        className="text-xs text-accent flex items-center gap-1 hover:underline"
                      >
                        <Plus size={12} /> Tambah Rekening
                      </button>
                    </div>
                    {(sk.kode_rekening ?? []).length === 0 ? (
                      <p className="px-5 pb-4 text-xs text-text-secondary">Belum ada kode rekening</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-t border-border">
                            <th className="text-left font-medium text-text-secondary px-5 py-2">Kode</th>
                            <th className="text-left font-medium text-text-secondary px-5 py-2">Uraian</th>
                            <th className="text-right font-medium text-text-secondary px-5 py-2">Pagu</th>
                            <th className="text-right font-medium text-text-secondary px-5 py-2">Realisasi</th>
                            <th className="text-right font-medium text-text-secondary px-5 py-2">Sisa</th>
                            <th className="px-5 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {(sk.kode_rekening ?? []).map(rek => {
                            const rekReal = realisasiPerRek[rek.id] ?? 0
                            return (
                              <tr key={rek.id} className="border-t border-border hover:bg-surface/80">
                                <td className="px-5 py-2 font-mono text-text-secondary">{rek.kode}</td>
                                <td className="px-5 py-2 text-text-primary max-w-xs truncate">{rek.uraian}</td>
                                <td className="px-5 py-2 text-right">{formatRupiah(rek.pagu_anggaran)}</td>
                                <td className="px-5 py-2 text-right text-danger">{formatRupiah(rekReal)}</td>
                                <td className="px-5 py-2 text-right text-success">
                                  {formatRupiah(rek.pagu_anggaran - rekReal)}
                                </td>
                                <td className="px-5 py-2">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => openEditRek(rek, sk.id)}
                                      className="p-1 rounded text-text-secondary hover:text-accent"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (confirm('Hapus kode rekening ini?'))
                                          await deleteRekening(rek.id)
                                      }}
                                      className="p-1 rounded text-text-secondary hover:text-danger"
                                    >
                                      <Trash2 size={12} />
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
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Sub Kegiatan Modal */}
      <Modal open={skModal} onClose={() => setSkModal(false)} title={skEditing ? 'Edit Sub Kegiatan' : 'Tambah Sub Kegiatan'}>
        <form onSubmit={handleSkSubmit} className="space-y-4">
          {errors.global && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-danger">{errors.global}</div>}
          <Input label="Kode" value={skForm.kode} onChange={e => setSkForm(f => ({ ...f, kode: e.target.value }))} placeholder="5.02.01.1.06.0005" required error={errors.kode} />
          <Input label="Nama Sub Kegiatan" value={skForm.nama} onChange={e => setSkForm(f => ({ ...f, nama: e.target.value }))} required error={errors.nama} />
          <Input label="Total Pagu (Rp)" type="number" value={skForm.total_pagu} onChange={e => setSkForm(f => ({ ...f, total_pagu: e.target.value }))} required error={errors.total_pagu} hint={skForm.total_pagu ? formatRupiah(parseInt(skForm.total_pagu, 10) || 0) : ''} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setSkModal(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : skEditing ? 'Simpan' : 'Tambah'}</Button>
          </div>
        </form>
      </Modal>

      {/* Rekening Modal */}
      <Modal open={rekModal} onClose={() => setRekModal(false)} title={rekEditing ? 'Edit Kode Rekening' : 'Tambah Kode Rekening'}>
        <form onSubmit={handleRekSubmit} className="space-y-4">
          {errors.global && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-danger">{errors.global}</div>}
          <Input label="Kode Rekening" value={rekForm.kode} onChange={e => setRekForm(f => ({ ...f, kode: e.target.value }))} placeholder="5.1.02.01.001.00024" required error={errors.kode} />
          <Input label="Uraian" value={rekForm.uraian} onChange={e => setRekForm(f => ({ ...f, uraian: e.target.value }))} required error={errors.uraian} />
          <Input label="Pagu Anggaran (Rp)" type="number" value={rekForm.pagu_anggaran} onChange={e => setRekForm(f => ({ ...f, pagu_anggaran: e.target.value }))} required error={errors.pagu_anggaran} hint={rekForm.pagu_anggaran ? formatRupiah(parseInt(rekForm.pagu_anggaran, 10) || 0) : ''} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setRekModal(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : rekEditing ? 'Simpan' : 'Tambah'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
