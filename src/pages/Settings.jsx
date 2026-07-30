// src/pages/Settings.jsx
import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { Save, Building2, UserCheck, RefreshCcw, AlertCircle, Laptop, Download, Power, Cloud, CheckCircle2, XCircle, Bot, Sparkles, Sliders, ShieldCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import * as api from '@/lib/api'

/**
 * [HALAMAN: PENGATURAN]
 * Kelola identitas dinas, pejabat penandatangan, integrasi Google Drive, dan DeepSeek AI Co-Pilot.
 */
export default function Settings() {
  const isElectron = typeof window !== 'undefined' && !!window.api
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const resetSettings = useStore(s => s.resetSettings)
  const user = useStore(s => s.user)

  const [activeTab, setActiveTab] = useState('skpd') // 'skpd' | 'pejabat' | 'ai' | 'system'
  const [form, setForm] = useState({ ...settings })
  const [isSaving, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // DeepSeek API test & models state
  const [deepseekTestStatus, setDeepseekTestStatus] = useState({ loading: false, result: null })
  const [availableModels, setAvailableModels] = useState([
    { id: 'deepseek-chat', name: 'deepseek-chat (V3 - Default, Cepat & Cerdas)' },
    { id: 'deepseek-reasoner', name: 'deepseek-reasoner (R1 - Penalaran Mendalam)' }
  ])
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // Auto-update states
  const [updateStatus, setUpdateStatus] = useState(isElectron ? 'Standby' : 'Mode web aktif')
  const [updateInfo, setUpdateInfo] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [updatePhase, setUpdatePhase] = useState('idle')

  // Google Drive connection states
  const [driveStatus, setDriveStatus] = useState({ loading: false, result: null })

  // Sync form when settings change (e.g. after reset)
  useEffect(() => {
    setForm({ ...settings })
  }, [settings])

  useEffect(() => {
    if (window.api?.onUpdateMessage) {
      window.api.onUpdateMessage((msg) => {
        setUpdateStatus(msg.text || 'Standby')
        setUpdatePhase(msg.type || 'idle')
        if (msg.type === 'available') {
          setUpdateInfo(msg.data || null)
        } else if (msg.type === 'download-progress') {
          setDownloadProgress(Math.round(msg.data?.percent || 0))
        }
      })
    }
  }, [])

  const handleCheckUpdate = async () => {
    if (!window.api?.checkForUpdate) {
      setUpdatePhase('error')
      setUpdateStatus('Pembaruan desktop hanya tersedia di aplikasi Electron.')
      return
    }
    const res = await window.api.checkForUpdate()
    if (res && !res.success && res.error) {
      setUpdatePhase('error')
      setUpdateStatus(`Error update: ${res.error}`)
    }
  }

  const handleDownloadUpdate = async () => {
    const res = await window.api?.downloadUpdate()
    if (res && !res.success && res.error) {
      setUpdatePhase('error')
      setUpdateStatus(`Error update: ${res.error}`)
    }
  }

  const handleInstallUpdate = async () => {
    const res = await window.api?.quitAndInstall()
    if (res && !res.success && res.error) {
      setUpdatePhase('error')
      setUpdateStatus(`Error update: ${res.error}`)
    }
  }

  const handleLoginDrive = async () => {
    setDriveStatus({ loading: true, result: null })
    try {
      const res = await api.loginGoogleDrive()
      if (res?.success) {
        handleTestDrive()
      } else {
        setDriveStatus({ loading: false, result: res })
      }
    } catch (error) {
      setDriveStatus({ loading: false, result: { success: false, error: error.message } })
    }
  }

  const handleTestDrive = async () => {
    setDriveStatus({ loading: true, result: null })
    try {
      const res = await api.testGoogleDrive()
      setDriveStatus({ loading: false, result: res })
    } catch (error) {
      setDriveStatus({ loading: false, result: { success: false, error: error.message } })
    }
  }

  const handleTestDeepSeek = async () => {
    if (!form.deepseek_api_key?.trim()) {
      setDeepseekTestStatus({ loading: false, result: { success: false, error: 'Masukkan DeepSeek API Key terlebih dahulu.' } })
      return
    }
    setDeepseekTestStatus({ loading: true, result: null })
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${form.deepseek_api_key.trim()}`
        },
        body: JSON.stringify({
          model: form.deepseek_model || 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are a test assistant.' },
            { role: 'user', content: 'Halo' }
          ],
          max_tokens: 10
        })
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      setDeepseekTestStatus({ loading: false, result: { success: true, message: 'DeepSeek API Key Valid & Siap Digunakan!' } })
    } catch (err) {
      setDeepseekTestStatus({ loading: false, result: { success: false, error: err.message } })
    }
  }

  const handleFetchDeepSeekModels = async () => {
    if (!form.deepseek_api_key?.trim()) {
      setDeepseekTestStatus({ loading: false, result: { success: false, error: 'Masukkan DeepSeek API Key terlebih dahulu.' } })
      return
    }
    setIsLoadingModels(true)
    try {
      const response = await fetch('https://api.deepseek.com/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${form.deepseek_api_key.trim()}`
        }
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (Array.isArray(data.data) && data.data.length > 0) {
        const fetched = data.data.map(m => ({
          id: m.id,
          name: `${m.id} ${m.id === 'deepseek-chat' ? '(V3 General)' : m.id === 'deepseek-reasoner' ? '(R1 Reasoning)' : ''}`
        }))
        setAvailableModels(fetched)
        setDeepseekTestStatus({ loading: false, result: { success: true, message: `Berhasil mengambil ${data.data.length} model DeepSeek dari server!` } })
      }
    } catch (err) {
      setDeepseekTestStatus({ loading: false, result: { success: false, error: `Gagal mengambil daftar model: ${err.message}` } })
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    await new Promise(r => setTimeout(r, 400))
    updateSettings(form)
    setIsSubmitting(false)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const handleReset = () => {
    resetSettings()
    setShowResetConfirm(false)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-700/40">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
            <Sliders size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wide">Pengaturan Sistem BendaharaApp</h1>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] uppercase font-black">
                v1.2.3 Stable
              </Badge>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5 font-medium">
              Kelola identitas dinas, Kop Surat BKU, Pejabat Penandatangan, dan Integrasi DeepSeek AI Co-Pilot
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {showSuccess && (
            <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 size={14} /> Berhasil Disimpan
            </div>
          )}

          {user?.role !== 'viewer' && (
            <Button 
              variant="secondary" 
              onClick={() => setShowResetConfirm(true)}
              className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md"
            >
              <RefreshCcw size={14} className="mr-1.5" /> Reset
            </Button>
          )}

          {user?.role !== 'viewer' && (
            <Button 
              onClick={handleSubmit} 
              disabled={isSaving}
              className="text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20"
            >
              {isSaving ? 'Menyimpan...' : (
                <span className="flex items-center gap-1.5">
                  <Save size={14} /> Simpan Semua
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Reset Alert */}
      {showResetConfirm && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 shadow-sm">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertCircle size={20} className="shrink-0 text-amber-600" />
            <p className="text-xs font-semibold">Apakah Anda yakin ingin mengembalikan seluruh pengaturan ke nilai awal bawaan pabrik?</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowResetConfirm(false)} className="h-8 px-3 text-xs font-bold">Batal</Button>
            <Button onClick={handleReset} className="h-8 px-4 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white">Ya, Reset</Button>
          </div>
        </div>
      )}

      {/* Tab Bar Navigation */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('skpd')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'skpd'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Building2 size={16} className={activeTab === 'skpd' ? 'text-indigo-600' : 'text-slate-400'} />
          <span>Identitas SKPD & Kop Surat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pejabat')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'pejabat'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <UserCheck size={16} className={activeTab === 'pejabat' ? 'text-indigo-600' : 'text-slate-400'} />
          <span>Pejabat Penandatangan Laporan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'ai'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Bot size={16} className={activeTab === 'ai' ? 'text-indigo-600' : 'text-slate-400'} />
          <span>Asisten AI & DeepSeek LLM</span>
          {form.deepseek_api_key?.trim() ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'system'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Cloud size={16} className={activeTab === 'system' ? 'text-indigo-600' : 'text-slate-400'} />
          <span>Integrasi Cloud & System Update</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset disabled={user?.role === 'viewer'} className="space-y-6">

          {/* TAB 1: IDENTITAS SKPD */}
          {activeTab === 'skpd' && (
            <Card className="p-6 space-y-6 border-t-4 border-t-indigo-600 shadow-md">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800">Identitas Organisasi & Header Kop Surat BKU</h3>
                  <p className="text-xs text-slate-500">Data ini digunakan untuk header resmi Laporan BKU, DPA, SPJ, dan Berita Acara Pemeriksaan Kas.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Input 
                    label="Pemerintah Daerah (Header Baris 1)" 
                    value={form.pemda_name} 
                    onChange={e => setForm({...form, pemda_name: e.target.value})}
                    placeholder="PEMERINTAH PROVINSI JAWA BARAT"
                    required 
                  />
                </div>
                <div>
                  <Input 
                    label="Kode Sub Kegiatan / SKPD" 
                    value={form.unit_kerja_kode} 
                    onChange={e => setForm({...form, unit_kerja_kode: e.target.value})}
                    placeholder="5.02.0.00.0.00.02.0000"
                    required 
                  />
                </div>
                <div className="md:col-span-3">
                  <Input 
                    label="Nama Unit Kerja / SKPD Resmi (Header Baris 2)" 
                    value={form.unit_kerja} 
                    onChange={e => setForm({...form, unit_kerja: e.target.value})}
                    placeholder="UPTD PUSAT PENGELOLAAN PENDAPATAN DAERAH KABUPATEN TASIKMALAYA"
                    required 
                  />
                </div>
                <div className="md:col-span-1">
                  <Input 
                    label="Lokasi Kecamatan/Kota (Tanggal Berita Acara)" 
                    value={form.lokasi} 
                    onChange={e => setForm({...form, lokasi: e.target.value})}
                    placeholder="Sukaraja"
                    required 
                  />
                </div>
                <div className="md:col-span-2">
                  <Input 
                    label="Nama Wilayah (Kop Surat Baris 3)" 
                    value={form.lokasi_wilayah} 
                    onChange={e => setForm({...form, lokasi_wilayah: e.target.value})}
                    placeholder="KABUPATEN TASIKMALAYA"
                    required 
                  />
                </div>
                <div className="md:col-span-2">
                  <Input 
                    label="Alamat Lengkap Kantor" 
                    value={form.alamat_kantor} 
                    onChange={e => setForm({...form, alamat_kantor: e.target.value})}
                    placeholder="Jalan Raya Cikatomas Sukaraja"
                    required 
                  />
                </div>
                <div>
                  <Input 
                    label="Kode Pos" 
                    value={form.kode_pos_line} 
                    onChange={e => setForm({...form, kode_pos_line: e.target.value})}
                    placeholder="46183"
                  />
                </div>
                <div className="md:col-span-3">
                  <Input 
                    label="Faksimil & Telepon / E-mail Kantor" 
                    value={form.fax_email} 
                    onChange={e => setForm({...form, fax_email: e.target.value})}
                    placeholder="Telepon (0265) 565149 Faksimil (0265) 566917 E-mail: p3dwkabtsm@gmail.com"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* TAB 2: PEJABAT PENANDATANGAN */}
          {activeTab === 'pejabat' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* KPA Card */}
                <Card className="p-5 border-t-4 border-t-indigo-600 shadow-md">
                  <div className="flex items-center gap-2 mb-4 text-indigo-700 border-b border-slate-100 pb-3">
                    <UserCheck size={18} />
                    <h3 className="font-black text-xs uppercase tracking-wider">Kuasa Pengguna Anggaran (KPA)</h3>
                  </div>
                  <div className="space-y-3.5">
                    <Input 
                      label="Nomenklatur Jabatan KPA" 
                      value={form.kpa_jabatan} 
                      onChange={e => setForm({...form, kpa_jabatan: e.target.value})}
                      required 
                    />
                    <Input 
                      label="Nama Lengkap & Gelar KPA" 
                      value={form.kpa_nama} 
                      onChange={e => setForm({...form, kpa_nama: e.target.value})}
                      required 
                    />
                    <Input 
                      label="NIP KPA" 
                      value={form.kpa_nip} 
                      onChange={e => setForm({...form, kpa_nip: e.target.value})}
                      required 
                    />
                  </div>
                </Card>

                {/* BPP Card */}
                <Card className="p-5 border-t-4 border-t-emerald-600 shadow-md">
                  <div className="flex items-center gap-2 mb-4 text-emerald-700 border-b border-slate-100 pb-3">
                    <UserCheck size={18} />
                    <h3 className="font-black text-xs uppercase tracking-wider">Bendahara Pengeluaran Pembantu</h3>
                  </div>
                  <div className="space-y-3.5">
                    <Input 
                      label="Nomenklatur Jabatan Bendahara" 
                      value={form.bpp_jabatan} 
                      onChange={e => setForm({...form, bpp_jabatan: e.target.value})}
                      required 
                    />
                    <Input 
                      label="Nama Lengkap & Gelar Bendahara" 
                      value={form.bpp_nama} 
                      onChange={e => setForm({...form, bpp_nama: e.target.value})}
                      required 
                    />
                    <Input 
                      label="NIP Bendahara" 
                      value={form.bpp_nip} 
                      onChange={e => setForm({...form, bpp_nip: e.target.value})}
                      required 
                    />
                  </div>
                </Card>

                {/* PPTK Card */}
                <Card className="p-5 border-t-4 border-t-amber-500 shadow-md">
                  <div className="flex items-center gap-2 mb-4 text-amber-700 border-b border-slate-100 pb-3">
                    <UserCheck size={18} />
                    <h3 className="font-black text-xs uppercase tracking-wider">Pejabat Pelaksana Teknis Kegiatan (PPTK)</h3>
                  </div>
                  <div className="space-y-3.5">
                    <Input 
                      label="Nomenklatur Jabatan PPTK" 
                      value={form.pptk_jabatan} 
                      onChange={e => setForm({...form, pptk_jabatan: e.target.value})}
                      required 
                    />
                    <Input 
                      label="Nama Lengkap & Gelar PPTK" 
                      value={form.pptk_nama} 
                      onChange={e => setForm({...form, pptk_nama: e.target.value})}
                      required 
                    />
                    <Input 
                      label="NIP PPTK" 
                      value={form.pptk_nip} 
                      onChange={e => setForm({...form, pptk_nip: e.target.value})}
                      required 
                    />
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 3: ASISTEN AI & DEEPSEEK */}
          {activeTab === 'ai' && (
            <Card className="p-6 space-y-6 border-t-4 border-t-indigo-600 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-bold shadow-sm">
                    <Bot size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                      Integrasi DeepSeek LLM API & Custom AI Rules
                    </h3>
                    <p className="text-xs text-slate-500">Hubungkan API Key DeepSeek untuk percakapan AI interaktif, pencarian data keuangan, dan audit kode rekening.</p>
                  </div>
                </div>

                {form.deepseek_api_key?.trim() ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase text-[9px] font-black px-3 py-1">
                    🟢 Connected (DeepSeek AI)
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-50 text-amber-700 border border-amber-200 uppercase text-[9px] font-black px-3 py-1">
                    ⚠️ Mode Offline (Local Search)
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="DeepSeek API Key"
                      type="password"
                      placeholder="sk-..."
                      value={form.deepseek_api_key || ''}
                      onChange={e => setForm({ ...form, deepseek_api_key: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Dapatkan API Key di <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">platform.deepseek.com</a>. Kunci disimpan dengan aman di penyimpanan lokal Anda.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Model DeepSeek
                    </label>
                    <select
                      value={form.deepseek_model || 'deepseek-chat'}
                      onChange={e => setForm({ ...form, deepseek_model: e.target.value })}
                      className="w-full text-xs font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-2xs"
                    >
                      {availableModels.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Aturan & Instruksi Khusus AI */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Aturan & Instruksi Khusus AI (Custom Permanent Rules)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={form.custom_ai_instructions || ''}
                    onChange={e => setForm({ ...form, custom_ai_instructions: e.target.value })}
                    placeholder="Contoh: Selalu sapa saya dengan 'Pak Bendahara'. Jangan gunakan angka desimal pada nominal Rupiah. Utamakan analisis belanja BBM."
                    className="w-full text-xs font-medium p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-2xs leading-relaxed text-slate-800 placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Aturan ini akan disimpan dan disuntikkan secara permanen pada setiap percakapan dan analisis data keuangan oleh AI.
                  </p>
                </div>

                {/* Test Result Alert */}
                {deepseekTestStatus.result && (
                  <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 border transition-all animate-in fade-in slide-in-from-top-2 ${
                    deepseekTestStatus.result.success 
                      ? 'bg-emerald-50/60 border-emerald-100 text-emerald-800 shadow-inner' 
                      : 'bg-rose-50/60 border-rose-100 text-rose-800 shadow-inner'
                  }`}>
                    {deepseekTestStatus.result.success ? (
                      <>
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-black uppercase tracking-wider text-[10px] text-emerald-700 mb-0.5">Koneksi API Berhasil!</p>
                          <p className="font-medium opacity-90">{deepseekTestStatus.result.message}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-black uppercase tracking-wider text-[10px] text-rose-700 mb-0.5">Koneksi API Gagal</p>
                          <p className="font-mono leading-relaxed mt-1 bg-white/60 p-2 rounded-lg border border-rose-100/50 break-all text-[10px] text-rose-900">{deepseekTestStatus.result.error}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap justify-end items-center gap-3 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    onClick={handleFetchDeepSeekModels}
                    disabled={isLoadingModels}
                    variant="secondary"
                    className="text-xs font-bold h-10 px-4 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-none"
                  >
                    {isLoadingModels ? (
                      <span className="flex items-center gap-2"><RefreshCcw size={14} className="animate-spin" /> Mengambil Model...</span>
                    ) : (
                      <span className="flex items-center gap-1.5">🔍 Cek Model Tersedia</span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleTestDeepSeek}
                    disabled={deepseekTestStatus.loading}
                    variant="secondary"
                    className="text-xs font-bold h-10 px-4 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-none"
                  >
                    {deepseekTestStatus.loading ? 'Menguji API Key...' : '⚡ Uji Koneksi DeepSeek API'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 4: GOOGLE DRIVE & SYSTEM UPDATE */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              
              {/* Google Drive Integration */}
              <Card className="p-6 border-t-4 border-t-emerald-500 shadow-md">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Cloud size={22} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800">Integrasi Google Drive Personal Backup</h3>
                      <p className="text-xs text-slate-500">Unggah salinan berkas Bukti Bayar / Nota belanja langsung ke Google Drive pribadi Anda (OAuth 2.0).</p>
                    </div>
                  </div>

                  {driveStatus.result?.success ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase text-[9px] font-black px-3 py-1">TERHUBUNG</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 uppercase text-[9px] font-black px-3 py-1">BELUM LOGIN</Badge>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Fitur ini mengizinkan aplikasi mengunggah salinan Nota SPJ secara aman. Pastikan berkas <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-600 border border-slate-200 text-[10px]">oauth-credentials.json</code> sudah tersedia di direktori aplikasi.
                  </p>

                  {!isElectron && (
                    <div className="p-4 rounded-2xl text-xs border bg-amber-50 border-amber-200 text-amber-800">
                      <p className="font-black uppercase tracking-wider text-[10px] mb-1">Mode Web Browser Terdeteksi</p>
                      <p>Login OAuth Google Drive membutuhkan aplikasi Electron desktop untuk mendengarkan callback autentikasi lokal secara aman.</p>
                    </div>
                  )}

                  {driveStatus.result && (
                    <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 border transition-all animate-in fade-in slide-in-from-top-2 ${
                      driveStatus.result.success 
                        ? 'bg-emerald-50/60 border-emerald-100 text-emerald-800 shadow-inner' 
                        : 'bg-rose-50/60 border-rose-100 text-rose-800 shadow-inner'
                    }`}>
                      {driveStatus.result.success ? (
                        <>
                          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-black uppercase tracking-wider text-[10px] text-emerald-700 mb-0.5">Koneksi Google Drive Sukses!</p>
                            <p className="font-medium opacity-90">Folder "Keuangan / Bukti Bayar-Transfer" akan otomatis dibuat di Google Drive pribadi Anda.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-black uppercase tracking-wider text-[10px] text-rose-700 mb-0.5">Terjadi Kesalahan Login</p>
                            <p className="font-mono leading-relaxed mt-1 bg-white/60 p-2 rounded-lg border border-rose-100/50 break-all text-[10px] text-rose-900">{driveStatus.result.error}</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap justify-end items-center gap-3 pt-3 border-t border-slate-100">
                    {driveStatus.result?.success ? (
                      <>
                        <Button 
                          type="button"
                          onClick={handleLogoutDrive} 
                          disabled={driveStatus.loading}
                          variant="secondary"
                          className="text-xs font-bold h-10 px-4 border-rose-200 text-rose-600 hover:bg-rose-50 shadow-none"
                        >
                          Putus Koneksi
                        </Button>
                        <Button 
                          type="button"
                          onClick={handleTestDrive} 
                          disabled={driveStatus.loading}
                          variant="secondary"
                          className="text-xs font-bold h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none"
                        >
                          {driveStatus.loading ? 'Menghubungkan...' : 'Cek Koneksi'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          type="button"
                          onClick={handleTestDrive} 
                          disabled={driveStatus.loading || !isElectron}
                          variant="secondary"
                          className="text-xs font-bold h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none"
                        >
                          Cek Koneksi Tersimpan
                        </Button>
                        <Button 
                          type="button"
                          onClick={handleLoginDrive} 
                          disabled={driveStatus.loading || !isElectron}
                          className="text-xs font-bold h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/10 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {driveStatus.loading ? (
                            <span className="flex items-center gap-2"><RefreshCcw size={14} className="animate-spin" /> Membuka Login...</span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Cloud size={14} />
                              Hubungkan Akun Google (Login)
                            </span>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* Electron Auto Update */}
              <Card className="p-6 border-t-4 border-t-slate-700 shadow-md">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                      <Laptop size={22} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-800">Pembaruan & Versi Aplikasi Desktop</h3>
                      <p className="text-xs text-slate-500">Manajemen rilis otomatis dan update versi aplikasi Electron.</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-mono font-bold text-xs">
                    v{window.api?.appVersion || '1.2.3'}
                  </Badge>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
                  <div className="flex-1 space-y-1.5">
                    <p className="text-xs font-bold text-slate-700">Status System Update: <span className="text-indigo-600 font-mono">{updateStatus}</span></p>
                    {!isElectron && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                        Menu auto-update aktif penuh pada versi desktop Electron yang terinstall.
                      </p>
                    )}
                    {updateInfo && updatePhase === 'available' && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        Versi baru ditemukan: <span className="font-bold text-indigo-700">{updateInfo.version}</span> ({updateInfo.releaseDate})
                      </p>
                    )}
                    
                    {updatePhase === 'download-progress' && (
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-2">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-300" 
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2.5 shrink-0">
                    {(updatePhase === 'idle' || updatePhase === 'not-available' || updatePhase === 'error') && (
                      <Button onClick={handleCheckUpdate} variant="secondary" className="text-xs font-bold h-10 px-4" disabled={!isElectron}>
                        <RefreshCcw size={14} className="mr-1.5" /> Cek Pembaruan
                      </Button>
                    )}

                    {updatePhase === 'available' && (
                      <Button onClick={handleDownloadUpdate} className="text-xs font-bold h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!isElectron}>
                        <Download size={14} className="mr-1.5" /> Unduh Sekarang
                      </Button>
                    )}

                    {updatePhase === 'downloaded' && (
                      <Button onClick={handleInstallUpdate} className="text-xs font-bold h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!isElectron}>
                        <Power size={14} className="mr-1.5" /> Pasang & Restart
                      </Button>
                    )}
                  </div>
                </div>
              </Card>

            </div>
          )}

        </fieldset>
      </form>

      {/* Floating Save Footer Bar */}
      {user?.role !== 'viewer' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl border border-slate-700/60 flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <span className="text-xs text-slate-300 font-medium hidden sm:inline">Perubahan pengaturan belum disimpan secara permanen</span>
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              onClick={handleSubmit} 
              disabled={isSaving}
              className="text-xs font-extrabold h-9 px-5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg rounded-full"
            >
              {isSaving ? 'Menyimpan...' : (
                <span className="flex items-center gap-1.5">
                  <Save size={14} /> Simpan Perubahan
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
