import React, { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import { formatRupiah, parseRupiah } from '../lib/format'
import { Calculator, RotateCcw, Info, Wallet, Receipt, ShieldCheck } from 'lucide-react'

const KATEGORI_OPTIONS = [
  { value: 'barang', label: 'Belanja Barang (Toko/Vendor)' },
  { value: 'jasa', label: 'Belanja Jasa / Service (CV/PT)' },
  { value: 'honor', label: 'Honorarium ASN / TNI / Polri' },
  { value: 'sewa', label: 'Sewa Tanah & Bangunan' },
  { value: 'konstruksi', label: 'Jasa Konstruksi (Pelaksanaan)' },
]

const GOLONGAN_OPTIONS = [
  { value: 'IV', label: 'Golongan IV (15%)' },
  { value: 'III', label: 'Golongan III (5%)' },
  { value: 'I/II', label: 'Golongan I & II (0%)' },
]

const KalkulatorPajak = () => {
  const [brutoInput, setBrutoInput] = useState('')
  const [kategori, setKategori] = useState('barang')
  const [hasNpwp, setHasNpwp] = useState(true)
  const [isPkp, setIsPkp] = useState(true)
  const [golongan, setGolongan] = useState('III')

  const bruto = useMemo(() => parseRupiah(brutoInput), [brutoInput])

  const hasil = useMemo(() => {
    if (!bruto) return null

    const isPpnKategori = ['barang', 'jasa', 'konstruksi'].includes(kategori) && isPkp
    let dpp = bruto
    let ppn = 0
    
    if (isPpnKategori) {
      dpp = Math.round(bruto / 1.11)
      ppn = Math.round(dpp * 0.11)
    }

    let pph = 0
    let jenisPph = '-'
    let tarifPersen = 0

    switch (kategori) {
      case 'barang':
        jenisPph = 'PPh 22'
        tarifPersen = hasNpwp ? 1.5 : 3
        pph = Math.round(dpp * (tarifPersen / 100))
        break
      case 'jasa':
        jenisPph = 'PPh 23'
        tarifPersen = hasNpwp ? 2 : 4
        pph = Math.round(dpp * (tarifPersen / 100))
        break
      case 'honor':
        jenisPph = 'PPh 21 Final'
        tarifPersen = golongan === 'IV' ? 15 : golongan === 'III' ? 5 : 0
        pph = Math.round(bruto * (tarifPersen / 100))
        break
      case 'sewa':
        jenisPph = 'PPh 4(2)'
        tarifPersen = 10
        pph = Math.round(dpp * (tarifPersen / 100))
        break
      case 'konstruksi':
        jenisPph = 'PPh 4(2)'
        tarifPersen = hasNpwp ? 2 : 4
        pph = Math.round(dpp * (tarifPersen / 100))
        break
    }

    return {
      dpp,
      ppn,
      pph,
      jenisPph,
      tarifPersen,
      totalPajak: ppn + pph,
      netto: bruto - ppn - pph
    }
  }, [bruto, kategori, hasNpwp, isPkp, golongan])

  const handleReset = () => {
    setBrutoInput('')
    setKategori('barang')
    setHasNpwp(true)
    setIsPkp(true)
    setGolongan('III')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kalkulator Pajak</h1>
          <p className="text-slate-500 text-sm">Simulasi pemotongan PPN & PPh sesuai aturan terbaru</p>
        </div>
        <Button variant="secondary" onClick={handleReset} className="flex items-center gap-2">
          <RotateCcw size={16} /> Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <Calculator size={18} className="text-indigo-500" />
              Parameter Simulasi
            </h3>
            <div className="space-y-5">
              <Input
                label="Nilai Bruto (Termasuk PPN)"
                placeholder="0"
                value={brutoInput}
                onChange={e => setBrutoInput(e.target.value)}
                hint={bruto ? formatRupiah(bruto) : 'Masukkan total kuitansi'}
              />

              <Select
                label="Kategori Transaksi"
                value={kategori}
                onChange={e => setKategori(e.target.value)}
                options={KATEGORI_OPTIONS}
              />

              {kategori === 'honor' ? (
                <Select
                  label="Golongan ASN/TNI/Polri"
                  value={golongan}
                  onChange={e => setGolongan(e.target.value)}
                  options={GOLONGAN_OPTIONS}
                />
              ) : (
                <>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Memiliki NPWP</label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={hasNpwp}
                          onChange={e => setHasNpwp(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                      {hasNpwp ? 'Tarif PPh standar berlaku.' : 'Tarif PPh 100% lebih tinggi karena tidak memiliki NPWP.'}
                    </p>
                  </div>

                  {['barang', 'jasa', 'konstruksi'].includes(kategori) && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700">Status PKP</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={isPkp}
                            onChange={e => setIsPkp(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">
                        {isPkp ? 'Rekanan memungut PPN 11%.' : 'Rekanan non-PKP, tidak ada pungutan PPN.'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
            <Info className="text-amber-500 shrink-0" size={20} />
            <p className="text-xs text-amber-800 leading-relaxed">
              Kalkulator ini hanya alat bantu simulasi. Pastikan kembali kode billing dan tarif pajak pada aplikasi e-Bupot/DJP.
            </p>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {!bruto ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400">
              <Calculator size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Masukkan nilai bruto untuk melihat rincian pajak</p>
            </div>
          ) : (
            <>
              {/* Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6 bg-rose-50 border-rose-100 shadow-sm">
                  <p className="text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">Total Pajak Dipungut</p>
                  <h2 className="text-3xl font-black text-rose-700">{formatRupiah(hasil.totalPajak)}</h2>
                  <div className="mt-4 flex items-center gap-2 text-rose-500 text-xs font-medium">
                    <ShieldCheck size={14} />
                    Potongan PPN & PPh
                  </div>
                </Card>
                <Card className="p-6 bg-emerald-50 border-emerald-100 shadow-sm">
                  <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">Diterima Rekanan (Netto)</p>
                  <h2 className="text-3xl font-black text-emerald-700">{formatRupiah(hasil.netto)}</h2>
                  <div className="mt-4 flex items-center gap-2 text-emerald-500 text-xs font-medium">
                    <Wallet size={14} />
                    Nilai bersih setelah potongan
                  </div>
                </Card>
              </div>

              {/* Detailed Breakdown */}
              <Card className="overflow-hidden border-slate-200">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                  <Receipt size={18} className="text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">Rincian Perhitungan</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500 font-medium">Nilai Bruto (Kuitansi)</span>
                    <span className="text-sm text-slate-800 font-bold">{formatRupiah(bruto)}</span>
                  </div>
                  
                  {['barang', 'jasa', 'konstruksi', 'sewa'].includes(kategori) && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <div>
                        <span className="text-sm text-slate-500 font-medium">DPP (Dasar Pengenaan Pajak)</span>
                        <p className="text-[10px] text-slate-400">{isPkp ? 'Bruto / 1.11' : 'Sama dengan Bruto (Non-PKP)'}</p>
                      </div>
                      <span className="text-sm text-slate-800 font-bold">{formatRupiah(hasil.dpp)}</span>
                    </div>
                  )}

                  {hasil.ppn > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <div>
                        <span className="text-sm text-slate-500 font-medium">PPN (11%)</span>
                        <p className="text-[10px] text-slate-400">Dipungut Bendahara</p>
                      </div>
                      <span className="text-sm text-rose-600 font-bold">-{formatRupiah(hasil.ppn)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <div>
                      <span className="text-sm text-slate-500 font-medium">{hasil.jenisPph} ({hasil.tarifPersen}%)</span>
                      <p className="text-[10px] text-slate-400">
                        {kategori === 'honor' ? 'Dari Nilai Bruto' : 'Dari Nilai DPP'}
                      </p>
                    </div>
                    <span className="text-sm text-rose-600 font-bold">-{formatRupiah(hasil.pph)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <span className="text-base font-bold text-slate-800">Jumlah Bersih</span>
                    <span className="text-lg font-black text-emerald-600">{formatRupiah(hasil.netto)}</span>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default KalkulatorPajak
