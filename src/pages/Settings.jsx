import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { Save, Building2, UserCheck, MapPin } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function Settings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const [form, setForm] = useState({ ...settings })
  const [isSaving, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pengaturan Aplikasi</h2>
          <p className="text-sm text-slate-500">Kelola identitas dinas dan pejabat penandatangan laporan</p>
        </div>
        {showSuccess && (
          <div className="bg-emerald-50 text-emerald-600 text-xs font-bold px-4 py-2 rounded-full border border-emerald-100 animate-bounce">
            ✓ Pengaturan berhasil disimpan
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas Unit Kerja */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6 text-indigo-600">
            <Building2 size={18} />
            <h3 className="font-bold text-sm uppercase tracking-wider">Identitas Unit Kerja</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Input 
              label="Nama Unit Kerja / SKPD" 
              value={form.unit_kerja} 
              onChange={e => setForm({...form, unit_kerja: e.target.value})}
              placeholder="Contoh: UPTD PUSAT PENGELOLAAN PENDAPATAN DAERAH..."
              required 
            />
            <Input 
              label="Lokasi (Kecamatan/Kota)" 
              value={form.lokasi} 
              onChange={e => setForm({...form, lokasi: e.target.value})}
              placeholder="Contoh: Sukaraja"
              required 
            />
          </div>
        </Card>

        {/* Pejabat Penandatangan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6 text-indigo-600">
              <UserCheck size={18} />
              <h3 className="font-bold text-sm uppercase tracking-wider">Kuasa Pengguna Anggaran (KPA)</h3>
            </div>
            <div className="space-y-4">
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
              <h3 className="font-bold text-sm uppercase tracking-wider">Bendahara Pengeluaran Pembantu</h3>
            </div>
            <div className="space-y-4">
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
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSaving} className="px-8 h-12 shadow-lg shadow-indigo-600/20">
            {isSaving ? 'Menyimpan...' : (
              <span className="flex items-center gap-2">
                <Save size={18} /> Simpan Perubahan
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
