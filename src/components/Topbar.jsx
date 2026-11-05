import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Calendar, LogOut, Menu, Bot, CalendarDays, ChevronDown, Check, Plus, AlertCircle, Sparkles } from 'lucide-react'
import { useStore } from '@/store/useStore'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/penerimaan': 'Penerimaan',
  '/pengeluaran': 'Pengeluaran',
  '/anggaran': 'Anggaran / DPA',
  '/laporan': 'Laporan',
  '/pajak': 'Kalkulator Pajak',
  '/settings': 'Pengaturan',
  '/trash': 'Tempat Sampah',
}

function today() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function Topbar({ onMenuClick, onAiClick }) {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] ?? 'Bendahara App'
  const logout = useStore(s => s.logout)
  const user = useStore(s => s.user)

  // Fiscal Year Store
  const tahunAnggaran = useStore(s => s.tahunAnggaran)
  const daftarTahunAnggaran = useStore(s => s.daftarTahunAnggaran)
  const setTahunAnggaran = useStore(s => s.setTahunAnggaran)
  const addTahunAnggaran = useStore(s => s.addTahunAnggaran)

  // Dropdown & Modal states
  const [isYearOpen, setIsYearOpen] = useState(false)
  const [isModalAddOpen, setIsModalAddOpen] = useState(false)
  const [newYearInput, setNewYearInput] = useState('')
  const [copyStructure, setCopyStructure] = useState(true)
  const [isAddingYear, setIsAddingYear] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccessMsg, setAddSuccessMsg] = useState('')

  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsYearOpen(false)
      }
    }
    if (isYearOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isYearOpen])

  const handleSelectYear = (year) => {
    setTahunAnggaran(year)
    setIsYearOpen(false)
  }

  const handleOpenAddModal = () => {
    setIsYearOpen(false)
    const nextYear = Math.max(...(daftarTahunAnggaran || [2026])) + 1
    setNewYearInput(String(nextYear))
    setCopyStructure(true)
    setAddError('')
    setAddSuccessMsg('')
    setIsModalAddOpen(true)
  }

  const handleSaveNewYear = async (e) => {
    e.preventDefault()
    setAddError('')
    setAddSuccessMsg('')

    const val = parseInt(newYearInput.trim(), 10)
    if (!val || isNaN(val) || val < 2000 || val > 2100) {
      setAddError('Tahun anggaran harus berupa 4 digit angka valid (antara 2000 - 2100).')
      return
    }

    if (daftarTahunAnggaran.includes(val)) {
      setAddError(`Tahun Anggaran ${val} sudah terdaftar.`)
      return
    }

    setIsAddingYear(true)
    try {
      const res = await addTahunAnggaran(val, {
        copyFromYear: copyStructure ? tahunAnggaran : null
      })

      if (res && !res.success) {
        setAddError(res.error || 'Gagal menambahkan tahun anggaran.')
      } else {
        setAddSuccessMsg(res?.message || `Tahun Anggaran ${val} berhasil ditambahkan dan diaktifkan!`)
        setTimeout(() => {
          setIsModalAddOpen(false)
        }, 1200)
      }
    } catch (err) {
      setAddError(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setIsAddingYear(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm gap-4 transition-all duration-300">
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick} 
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-slate-900 font-bold text-lg hidden sm:block tracking-tight">{title}</h1>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Fiscal Year Switcher Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsYearOpen(!isYearOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-xs border transition-all shadow-sm active:scale-95 select-none ${
                isYearOpen 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200' 
                  : 'bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border-indigo-200/80'
              }`}
              title="Klik untuk berpindah atau menambah Tahun Anggaran"
            >
              <CalendarDays size={14} className={isYearOpen ? 'text-white' : 'text-indigo-600'} />
              <span>TA {tahunAnggaran}</span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${isYearOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isYearOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3.5 py-1.5 border-b border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pilih Tahun Anggaran</p>
                </div>

                <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                  {(daftarTahunAnggaran || [2026]).map((year) => {
                    const isActive = year === tahunAnggaran
                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => handleSelectYear(year)}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold text-left transition-colors ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 font-extrabold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-indigo-600 ring-2 ring-indigo-200' : 'bg-slate-300'}`} />
                          Tahun {year}
                        </span>
                        {isActive && <Check size={14} className="text-indigo-600" />}
                      </button>
                    )
                  })}
                </div>

                {user?.role !== 'viewer' && (
                  <div className="pt-1.5 mt-1 border-t border-slate-100 px-2">
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all border border-dashed border-indigo-200"
                    >
                      <Plus size={13} />
                      <span>Tambah Tahun Anggaran</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tombol Trigger Asisten AI */}
          <button
            onClick={onAiClick}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-xs hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md shadow-indigo-200 group"
            title="Buka Asisten AI Bendahara"
          >
            <Bot size={15} className="text-emerald-300 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Asisten AI</span>
          </button>

          <div className="hidden sm:flex items-center gap-2.5 text-slate-500 text-sm font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 shadow-inner">
            <Calendar size={14} className="text-indigo-500" />
            <span>{today()}</span>
          </div>

          <div className="hidden sm:block h-8 w-px bg-slate-200/60" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-900 leading-none capitalize">{user?.username}</p>
              <p className="text-[10px] text-slate-400 leading-none mt-1 uppercase tracking-tighter">{user?.role}</p>
            </div>
            <button 
              onClick={logout} 
              className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
              title="Keluar"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Modal Tambah Tahun Anggaran */}
      <Modal
        open={isModalAddOpen}
        onClose={() => !isAddingYear && setIsModalAddOpen(false)}
        title="Tambah Tahun Anggaran Baru"
        size="md"
      >
        <form onSubmit={handleSaveNewYear} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Menambahkan tahun anggaran baru memungkinkan Anda mengelola DPA, pencatatan BKU, dan laporan keuangan untuk periode anggaran berikutnya atau sebelumnya secara terisolasi.
          </p>

          {addError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          {addSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <Check size={16} className="shrink-0" />
              <span>{addSuccessMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tahun Anggaran (4 Digit Angka)
            </label>
            <Input
              type="number"
              min="2000"
              max="2100"
              value={newYearInput}
              onChange={(e) => setNewYearInput(e.target.value)}
              placeholder="Contoh: 2027"
              required
              disabled={isAddingYear}
              className="text-base font-bold"
            />
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={copyStructure}
                onChange={(e) => setCopyStructure(e.target.checked)}
                disabled={isAddingYear}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-extrabold text-slate-800 block">
                  Salin Struktur Sub Kegiatan & Rekening dari TA {tahunAnggaran}
                </span>
                <span className="text-slate-500 text-[11px] block mt-0.5">
                  Menyalin daftar Program, Kegiatan, Sub Kegiatan, dan Kode Rekening dari tahun aktif saat ini. Seluruh nominal Pagu Anggaran dan RAK awal akan di-set Rp 0 agar siap diisi baru.
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalAddOpen(false)}
              disabled={isAddingYear}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isAddingYear}
              className="gap-2"
            >
              {isAddingYear ? 'Menyimpan...' : 'Tambah & Aktifkan'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
