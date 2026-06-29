import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { Save, Building2, UserCheck, RefreshCcw, AlertCircle, Laptop, Download, Power, Cloud, CheckCircle2, XCircle } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import * as api from '@/lib/api'

/**
 * [HALAMAN: PENGATURAN]
 * Kelola identitas dinas, pejabat penandatangan, dan integrasi eksternal (Google Drive).
 */
export default function Settings() {
  const isElectron = typeof window !== 'undefined' && !!window.api
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const resetSettings = useStore(s => s.resetSettings)
  const user = useStore(s => s.user)

  const [form, setForm] = useState({ ...settings })
  const [isSaving, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)

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

  const handleLogoutDrive = async () => {
    if (confirm('Apakah Anda yakin ingin memutus koneksi Google Drive?')) {
      setDriveStatus({ loading: true, result: null })
      try {
        await api.logoutGoogleDrive()
        setDriveStatus({ loading: false, result: null })
      } catch (error) {
        setDriveStatus({ loading: false, result: { success: false, error: error.message } })
      }
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Artificial delay
    await new Promise(r => setTimeout(r, 600))
    
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pengaturan Aplikasi</h2>
          <p className="text-sm text-slate-500">Kelola identitas dinas dan pejabat penandatangan laporan</p>
        </div>
        <div className="flex items-center gap-3">
          {showSuccess && (
            <div className="bg-emerald-50 text-emerald-600 text-xs font-bold px-4 py-2 rounded-full border border-emerald-100 animate-bounce">
              ✓ Berhasil disimpan
            </div>
          )}
          {user?.role !== 'viewer' && (
            <Button 
              variant="secondary" 
              onClick={() => setShowResetConfirm(true)}
              className="text-xs font-bold border-slate-200"
            >
              <RefreshCcw size={14} className="mr-2" /> Reset
            </Button>
          )}
        </div>
      </div>

      {showResetConfirm && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">Reset semua pengaturan ke nilai default?</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowResetConfirm(false)} className="h-8 px-4 text-xs">Batal</Button>
            <Button onClick={handleReset} className="h-8 px-4 text-xs bg-amber-600 hover:bg-amber-700">Ya, Reset</Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={user?.role === 'viewer'} className="space-y-6 border-0 p-0 m-0">
          {/* Identitas Unit Kerja */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <Building2 size={18} />
            <h3 className="font-bold text-sm uppercase tracking-wider">Identitas Unit Kerja</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-1">
              <Input 
                label="Kode Unit Kerja" 
                value={form.unit_kerja_kode} 
                onChange={e => setForm({...form, unit_kerja_kode: e.target.value})}
                placeholder="Contoh: 5.02.0..."
                required 
              />
            </div>
            <div className="md:col-span-2">
              <Input 
                label="Nama Unit Kerja / SKPD" 
                value={form.unit_kerja} 
                onChange={e => setForm({...form, unit_kerja: e.target.value})}
                placeholder="Contoh: UPTD PUSAT PENGELOLAAN PENDAPATAN DAERAH..."
                required 
              />
            </div>
            <div className="md:col-span-3">
              <Input 
                label="Lokasi (Kecamatan/Kota)" 
                value={form.lokasi} 
                onChange={e => setForm({...form, lokasi: e.target.value})}
                placeholder="Contoh: Sukaraja"
                required 
              />
            </div>
            <div className="md:col-span-3">
              <Input 
                label="Nama Wilayah (Header)" 
                value={form.lokasi_wilayah} 
                onChange={e => setForm({...form, lokasi_wilayah: e.target.value})}
                placeholder="Contoh: KABUPATEN TASIKMALAYA"
                required 
              />
            </div>
            <div className="md:col-span-3">
              <Input 
                label="Alamat Lengkap (Kop Surat)" 
                value={form.alamat_kantor} 
                onChange={e => setForm({...form, alamat_kantor: e.target.value})}
                placeholder="Contoh: Jalan Raya Cikatomas Sukaraja Telepon (0265) 565149"
                required 
              />
            </div>
            <div className="md:col-span-2">
              <Input 
                label="Faksimil / E-mail (Kop Surat)" 
                value={form.fax_email} 
                onChange={e => setForm({...form, fax_email: e.target.value})}
                placeholder="Faksimil : (0265) 566917 E-mail : p3dwkabtsm@gmail.com"
              />
            </div>
            <div className="md:col-span-1">
              <Input 
                label="Kode Pos (Kop Surat)" 
                value={form.kode_pos_line} 
                onChange={e => setForm({...form, kode_pos_line: e.target.value})}
                placeholder="Kabupaten Tasikmalaya – 46183"
              />
            </div>
          </div>
        </Card>

        {/* Pejabat Penandatangan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6 text-indigo-600">
              <UserCheck size={18} />
              <h3 className="font-bold text-sm uppercase tracking-wider">Kuasa Pengguna Anggaran (KPA)</h3>
            </div>
            <div className="space-y-4">
              <Input 
                label="Jabatan" 
                value={form.kpa_jabatan} 
                onChange={e => setForm({...form, kpa_jabatan: e.target.value})}
                required 
              />
              <Input 
                label="Nama Lengkap & Gelar" 
                value={form.kpa_nama} 
                onChange={e => setForm({...form, kpa_nama: e.target.value})}
                required 
              />
              <Input 
                label="NIP" 
                value={form.kpa_nip} 
                onChange={e => setForm({...form, kpa_nip: e.target.value})}
                required 
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6 text-indigo-600">
              <UserCheck size={18} />
              <h3 className="font-bold text-sm uppercase tracking-wider">Bendahara Pengeluaran</h3>
            </div>
            <div className="space-y-4">
              <Input 
                label="Jabatan" 
                value={form.bp_jabatan} 
                onChange={e => setForm({...form, bp_jabatan: e.target.value})}
                required 
              />
              <Input 
                label="Nama Lengkap & Gelar" 
                value={form.bp_nama} 
                onChange={e => setForm({...form, bp_nama: e.target.value})}
                required 
              />
              <Input 
                label="NIP" 
                value={form.bp_nip} 
                onChange={e => setForm({...form, bp_nip: e.target.value})}
                required 
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6 text-indigo-600">
              <UserCheck size={18} />
              <h3 className="font-bold text-sm uppercase tracking-wider">Bendahara Pengeluaran Pembantu</h3>
            </div>
            <div className="space-y-4">
              <Input 
                label="Jabatan" 
                value={form.bpp_jabatan} 
                onChange={e => setForm({...form, bpp_jabatan: e.target.value})}
                required 
              />
              <Input 
                label="Nama Lengkap & Gelar" 
                value={form.bpp_nama} 
                onChange={e => setForm({...form, bpp_nama: e.target.value})}
                required 
              />
              <Input 
                label="NIP" 
                value={form.bpp_nip} 
                onChange={e => setForm({...form, bpp_nip: e.target.value})}
                required 
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6 text-indigo-600">
              <UserCheck size={18} />
              <h3 className="font-bold text-sm uppercase tracking-wider">Pejabat Pelaksana Teknis Kegiatan (PPTK)</h3>
            </div>
            <div className="space-y-4">
              <Input 
                label="Jabatan" 
                value={form.pptk_jabatan} 
                onChange={e => setForm({...form, pptk_jabatan: e.target.value})}
                required 
              />
              <Input 
                label="Nama Lengkap & Gelar" 
                value={form.pptk_nama} 
                onChange={e => setForm({...form, pptk_nama: e.target.value})}
                required 
              />
              <Input 
                label="NIP" 
                value={form.pptk_nip} 
                onChange={e => setForm({...form, pptk_nip: e.target.value})}
                required 
              />
            </div>
          </Card>
        </div>

        {user?.role !== 'viewer' && (
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSaving} className="px-8 h-12 shadow-lg shadow-indigo-600/20">
              {isSaving ? 'Menyimpan...' : (
                <span className="flex items-center gap-2">
                  <Save size={18} /> Simpan Perubahan
                </span>
              )}
            </Button>
          </div>
        )}
        </fieldset>
      </form>

      {/* Integrasi Google Drive */}
      <Card className="p-6 mt-8 border-t-4 border-t-emerald-500 shadow-md shadow-emerald-500/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-emerald-600">
            <Cloud size={18} />
            <h3 className="font-bold text-sm uppercase tracking-wider">Integrasi Google Drive</h3>
          </div>
          {driveStatus.result?.success ? (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase text-[9px] tracking-wider font-black px-3">TERHUBUNG</Badge>
          ) : (
            <Badge variant="secondary" className="bg-slate-100 text-slate-500 uppercase text-[9px] tracking-wider font-black px-3">BELUM LOGIN</Badge>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Fitur ini memungkinkan aplikasi mengunggah berkas Bukti Bayar/Transfer langsung ke Google Drive pribadi Anda (<span className="font-semibold text-slate-700">Google OAuth 2.0</span>) memanfaatkan 15GB kuota gratis Anda secara resmi.
            Pastikan berkas <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-600 border border-slate-200 text-[10px]">oauth-credentials.json</code> sudah diletakkan di direktori aplikasi sebelum memulai login.
          </p>

          {!isElectron && (
            <div className="p-4 rounded-2xl text-xs border bg-amber-50 border-amber-200 text-amber-800">
              <p className="font-black uppercase tracking-wider text-[10px] mb-1">Mode Web Terdeteksi</p>
              <p>Login Google Drive tidak bisa dijalankan dari browser/Tailscale karena fitur ini bergantung pada Electron main process, browser lokal, dan callback OAuth di mesin desktop. Untuk login Google, jalankan app versi desktop Electron.</p>
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
                    <p className="font-black uppercase tracking-wider text-[10px] text-emerald-700 mb-0.5">Koneksi Sukses!</p>
                    <p className="font-medium opacity-90">Akun Google Drive pribadi Anda berhasil terhubung. Folder "Keuangan / Bukti Bayar-Transfer" akan otomatis dibuat di Drive utama Anda.</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black uppercase tracking-wider text-[10px] text-rose-700 mb-0.5">Terjadi Kesalahan</p>
                    <p className="font-mono leading-relaxed mt-1 bg-white/60 p-2 rounded-lg border border-rose-100/50 break-all text-[10px] text-rose-900">{driveStatus.result.error}</p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-100 mt-4">
            {driveStatus.result?.success ? (
              <>
                <Button 
                  onClick={handleLogoutDrive}
                  disabled={driveStatus.loading}
                  variant="secondary"
                  className="text-xs font-bold h-10 px-4 text-rose-600 border-rose-200 hover:bg-rose-50 shadow-none"
                >
                  Putuskan Koneksi (Logout)
                </Button>
                <Button 
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
                  onClick={handleTestDrive} 
                  disabled={driveStatus.loading || !isElectron}
                  variant="secondary"
                  className="text-xs font-bold h-10 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 shadow-none"
                >
                  Cek Koneksi Tersimpan
                </Button>
                <Button 
                  onClick={handleLoginDrive} 
                  disabled={driveStatus.loading || !isElectron}
                  className="text-xs font-bold h-10 px-5 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Pembaruan Aplikasi */}
      <Card className="p-6 mt-8 border-t-4 border-t-indigo-500">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-indigo-600">
            <Laptop size={18} />
            <h3 className="font-bold text-sm uppercase tracking-wider">Pembaruan Aplikasi</h3>
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-slate-600">v{window.api?.appVersion || 'desktop'}</Badge>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-bold text-slate-700">Status: <span className="text-indigo-600">{updateStatus}</span></p>
            {!isElectron && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                Menu pembaruan ini aktif penuh hanya di versi desktop Electron yang sudah di-install.
              </p>
            )}
            {updateInfo && updatePhase === 'available' && (
              <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                Versi baru ditemukan: <span className="font-bold">{updateInfo.version}</span> ({updateInfo.releaseDate})
              </p>
            )}
            
            {updatePhase === 'download-progress' && (
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300" 
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            {(updatePhase === 'idle' || updatePhase === 'not-available' || updatePhase === 'error') ? (
              <Button onClick={handleCheckUpdate} variant="secondary" className="text-xs" disabled={!isElectron}>
                <RefreshCcw size={14} className="mr-2" /> Cek Pembaruan
              </Button>
            ) : null}

            {updatePhase === 'available' && (
              <Button onClick={handleDownloadUpdate} className="text-xs bg-emerald-600 hover:bg-emerald-700" disabled={!isElectron}>
                <Download size={14} className="mr-2" /> Unduh Sekarang
              </Button>
            )}

            {updatePhase === 'downloaded' && (
              <Button onClick={handleInstallUpdate} className="text-xs bg-indigo-600 hover:bg-indigo-700" disabled={!isElectron}>
                <Power size={14} className="mr-2" /> Pasang & Restart
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

