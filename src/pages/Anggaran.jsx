// src/pages/Anggaran.jsx
import { useEffect, useState, useMemo } from 'react'
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, Folder, List, Tag } from 'lucide-react'
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
const EMPTY_REK = { kode: '', uraian: '', pagu_anggaran: '' }
const EMPTY_PARENT = { kode: '', nama: '' }

export default function Anggaran() {
  const subKegiatan = useStore(s => s.subKegiatan)
  const pengeluaran = useStore(s => s.pengeluaran)
  const isLoading = useStore(s => s.isLoading)
  const fetchSubKegiatan = useStore(s => s.fetchSubKegiatan)
  const fetchPengeluaran = useStore(s => s.fetchPengeluaran)
  
  const updateProgram = useStore(s => s.updateProgram)
  const updateKegiatan = useStore(s => s.updateKegiatan)
  const updateSubKegiatan = useStore(s => s.updateSubKegiatan)
  const deleteSubKegiatan = useStore(s => s.deleteSubKegiatan)
  
  const addKodeRekening = useStore(s => s.addKodeRekening)
  const updateKodeRekening = useStore(s => s.updateKodeRekening)
  const deleteKodeRekening = useStore(s => s.deleteKodeRekening)

  const [expanded, setExpanded] = useState({})
  const [saving, setSaving] = useState(false)

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
    pengeluaran.forEach(p => { map[p.kode_rekening_id] = (map[p.kode_rekening_id] ?? 0) + p.jumlah })
    return map
  }, [pengeluaran])

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  // Sub Kegiatan
  function openEditSk(sk) {
    setEditingSk(sk)
    setSkForm({ kode: sk.kode, nama: sk.nama, sumber_dana: sk.sumber_dana, tahun_anggaran: String(sk.tahun_anggaran) })
    setSkModal(true)
  }
  async function handleSkSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      await updateSubKegiatan({ id: editingSk.id, ...skForm, tahun_anggaran: parseInt(skForm.tahun_anggaran, 10) })
      setSkModal(false)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  // Program
  function openEditProg(prog) {
    setEditingProgId(prog.id); setProgForm({ kode: prog.kode, nama: prog.nama }); setProgModal(true)
  }
  async function handleProgSubmit(e) {
    e.preventDefault(); setSaving(true)
    try { await updateProgram(editingProgId, progForm); setProgModal(false) } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  // Kegiatan
  function openEditKeg(keg) {
    setEditingKegId(keg.id); setKegForm({ kode: keg.kode, nama: keg.nama }); setKegModal(true)
  }
  async function handleKegSubmit(e) {
    e.preventDefault(); setSaving(true)
    try { await updateKegiatan(editingKegId, kegForm); setKegModal(false) } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  // Rekening
  function openNewRek(skId) { setEditingRekId(null); setRekParentId(skId); setRekForm(EMPTY_REK); setRekModal(true) }
  function openEditRek(rek, skId) {
    setEditingRekId(rek.id); setRekParentId(skId); setRekForm({ kode: rek.kode, uraian: rek.uraian, pagu_anggaran: String(rek.pagu_anggaran) })
    setRekModal(true)
  }
  async function handleRekSubmit(e) {
    e.preventDefault(); setSaving(true)
    try {
      const payload = { kode: rekForm.kode.trim(), uraian: rekForm.uraian.trim(), pagu_anggaran: parseInt(rekForm.pagu_anggaran, 10), sub_kegiatan_id: rekParentId }
      if (editingRekId) await updateKodeRekening({ id: editingRekId, ...payload })
      else await addKodeRekening(payload)
      setRekModal(false)
    } catch (err) { alert(err.message) } finally { setSaving(false) }
  }

  if (isLoading && subKegiatan.length === 0) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-6 pb-20">
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
                <button 
                  onClick={() => openEditProg(prog)} 
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"
                  title="Edit Program"
                >
                  <Pencil size={14} />
                </button>
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
                          <button 
                            onClick={(e) => { e.stopPropagation(); openEditKeg(keg) }} 
                            className="p-1 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 rounded-md transition-all shadow-sm"
                            title="Edit Kegiatan"
                          >
                            <Pencil size={12} />
                          </button>
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
                              </div>
                              {skExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50/20 pb-2">
                                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 mb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Rekening Belanja</span>
                                    <button onClick={() => openNewRek(sk.id)} className="text-[10px] text-indigo-600 font-black flex items-center gap-1 hover:underline"><Plus size={14} /> TAMBAH REKENING</button>
                                  </div>
                                  <div className="px-3 overflow-x-auto">
                                    <table className="w-full text-[11px] border-separate border-spacing-0">
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
                                          return (
                                            <tr key={rek.id} className="hover:bg-white transition-colors group/rek">
                                              <td className="px-3 py-2.5 font-mono text-slate-400 border-t border-slate-100">{sk.kode}.{rek.kode}</td>
                                              <td className="px-3 py-2.5 text-slate-700 font-bold border-t border-slate-100">{rek.uraian}</td>
                                              <td className="px-3 py-2.5 text-right font-black text-slate-900 border-t border-slate-100">{formatRupiah(rek.pagu_anggaran)}</td>
                                              <td className="px-3 py-2.5 text-right font-bold text-red-500 border-t border-slate-100">{formatRupiah(real)}</td>
                                              <td className="px-3 py-2.5 border-t border-slate-100">
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
                                                  </button>                                                </div>
                                              </td>
                                            </tr>
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
      <Modal open={progModal} onClose={() => setProgModal(false)} title="Edit Program">
        <form onSubmit={handleProgSubmit} className="space-y-4">
          <Input label="Kode Program" value={progForm.kode} onChange={e => setProgForm({...progForm, kode: e.target.value})} required />
          <Input label="Nama Program" value={progForm.nama} onChange={e => setProgForm({...progForm, nama: e.target.value})} required />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setProgModal(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={kegModal} onClose={() => setKegModal(false)} title="Edit Kegiatan">
        <form onSubmit={handleKegSubmit} className="space-y-4">
          <Input label="Kode Kegiatan" value={kegForm.kode} onChange={e => setKegForm({...kegForm, kode: e.target.value})} required />
          <Input label="Nama Kegiatan" value={kegForm.nama} onChange={e => setKegForm({...kegForm, nama: e.target.value})} required />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setKegModal(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={skModal} onClose={() => setSkModal(false)} title="Edit Sub Kegiatan">
        <form onSubmit={handleSkSubmit} className="space-y-4">
          <Input label="Kode Sub Kegiatan" value={skForm.kode} onChange={e => setSkForm({...skForm, kode: e.target.value})} required />
          <Input label="Nama Sub Kegiatan" value={skForm.nama} onChange={e => setSkForm({...skForm, nama: e.target.value})} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sumber Dana" value={skForm.sumber_dana} onChange={e => setSkForm({...skForm, sumber_dana: e.target.value})} />
            <Input label="Tahun" type="number" value={skForm.tahun_anggaran} onChange={e => setSkForm({...skForm, tahun_anggaran: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setSkModal(false)} type="button">Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={rekModal} onClose={() => setRekModal(false)} title={editingRekId ? 'Edit Rekening' : 'Tambah Rekening'}>
        <form onSubmit={handleRekSubmit} className="space-y-4">
          <Input label="Kode Rekening" value={rekForm.kode} onChange={e => setRekForm({...rekForm, kode: e.target.value})} placeholder="5.1.02..." required />
          <Textarea label="Uraian Belanja" value={rekForm.uraian} onChange={e => setRekForm({...rekForm, uraian: e.target.value})} required rows={2} />
          <Input label="Pagu Anggaran" type="number" value={rekForm.pagu_anggaran} onChange={e => setRekForm({...rekForm, pagu_anggaran: e.target.value})} required />
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
            await deleteSubKegiatan(deleteSkId)
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
            await deleteKodeRekening(deleteRekId)
            setDeleteRekId(null)
          }
        }}
        message="Hapus Rekening Belanja ini?"
      />

    </div>
  )
}
