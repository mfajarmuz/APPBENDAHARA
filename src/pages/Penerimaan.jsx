// src/pages/Penerimaan.jsx
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatRupiah, formatTanggal } from '@/lib/format'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

const EMPTY_FORM = { tanggal: '', no_sp2d: '', jumlah: '', keterangan: '' }

export default function Penerimaan() {
  const penerimaan = useStore(s => s.penerimaan)
  const isLoading = useStore(s => s.isLoading)
  const fetchPenerimaan = useStore(s => s.fetchPenerimaan)
  const addPenerimaan = useStore(s => s.addPenerimaan)
  const updatePenerimaan = useStore(s => s.updatePenerimaan)
  const deletePenerimaan = useStore(s => s.deletePenerimaan)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = new, object = edit
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => { fetchPenerimaan() }, [])

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      tanggal: item.tanggal ?? '',
      no_sp2d: item.no_sp2d ?? '',
      jumlah: String(item.jumlah ?? ''),
      keterangan: item.keterangan ?? '',
    })
    setErrors({})
    setModalOpen(true)
  }

  function validate() {
    const e = {}
    if (!form.tanggal) e.tanggal = 'Tanggal wajib diisi'
    if (!form.jumlah || isNaN(Number(form.jumlah)) || Number(form.jumlah) <= 0) e.jumlah = 'Jumlah harus angka positif'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setSaving(true)
    try {
      const payload = {
        tanggal: form.tanggal,
        no_sp2d: form.no_sp2d || null,
        jumlah: parseInt(form.jumlah, 10),
        keterangan: form.keterangan || null,
      }
      if (editing) {
        await updatePenerimaan({ id: editing.id, ...payload })
      } else {
        await addPenerimaan(payload)
      }
      setModalOpen(false)
    } catch (err) {
      setErrors({ global: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus penerimaan ini?')) return
    await deletePenerimaan(id)
  }

  const totalPenerimaan = penerimaan.reduce((sum, p) => sum + (p.jumlah ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary text-sm">
            Total: <span className="font-semibold text-success">{formatRupiah(totalPenerimaan)}</span>
            <span className="ml-2 text-xs">({penerimaan.length} SP2D)</span>
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={15} /> Tambah SP2D
        </Button>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading && penerimaan.length === 0 ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : penerimaan.length === 0 ? (
          <EmptyState message="Belum ada penerimaan SP2D" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bg">
              <tr>
                <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Tanggal</th>
                <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">No. SP2D</th>
                <th className="text-left text-xs font-medium text-text-secondary px-5 py-3">Keterangan</th>
                <th className="text-right text-xs font-medium text-text-secondary px-5 py-3">Jumlah</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {penerimaan.map((item, i) => (
                <tr
                  key={item.id}
                  className="border-t border-border hover:bg-bg/60 transition-colors"
                >
                  <td className="px-5 py-3 text-text-secondary text-xs">{formatTanggal(item.tanggal)}</td>
                  <td className="px-5 py-3 font-medium text-text-primary">{item.no_sp2d ?? '-'}</td>
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
                        onClick={() => handleDelete(item.id)}
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
        )}
      </Card>

      {/* Modal Form */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Penerimaan SP2D' : 'Tambah Penerimaan SP2D'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.global && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-danger">
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
            label="No. SP2D"
            value={form.no_sp2d}
            onChange={e => setForm(f => ({ ...f, no_sp2d: e.target.value }))}
            placeholder="Contoh: 23/SP2D/2026"
          />
          <Input
            label="Jumlah (Rp)"
            type="number"
            value={form.jumlah}
            onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))}
            placeholder="0"
            required
            error={errors.jumlah}
            hint={form.jumlah ? formatRupiah(parseInt(form.jumlah, 10) || 0) : ''}
          />
          <Input
            label="Keterangan"
            value={form.keterangan}
            onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
            placeholder="Opsional"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
