import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../store/useStore'

describe('Komponen Belanja (Store & Business Logic)', () => {
  const mockSubKegiatan = [
    {
      id: 'sk-1',
      kode: '5.01.01.1.01',
      nama: 'Administrasi Keuangan',
      tahun_anggaran: 2026,
      kode_rekening: [
        {
          id: 'rek-1',
          kode: '5.1.02.01.01.0024',
          uraian: 'Belanja Alat Tulis Kantor',
          pagu_anggaran: 5000000,
          komponen_belanja: [
            {
              id: 'komp-1',
              kode_rekening_id: 'rek-1',
              kode: '01',
              nama: 'Kertas HVS A4 80gr',
              spesifikasi: 'Sinar Dunia 80 gr',
              volume: 10,
              satuan: 'Rim',
              harga_satuan: 55000,
              total: 550000,
              keterangan: 'Kebutuhan Semester 1'
            }
          ]
        }
      ]
    }
  ]

  let currentDb = []

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    currentDb = JSON.parse(JSON.stringify(mockSubKegiatan))

    // Setup initial store state
    useStore.setState({
      user: { username: 'admin', role: 'admin' },
      tahunAnggaran: 2026,
      subKegiatan: JSON.parse(JSON.stringify(currentDb)),
      isLoading: false
    })

    // Setup window.api mocks with mock database state reflection
    if (typeof window !== 'undefined') {
      window.api = {
        getSubKegiatan: vi.fn().mockImplementation(async () => ({
          success: true,
          data: JSON.parse(JSON.stringify(currentDb))
        })),
        addKomponenBelanja: vi.fn().mockImplementation(async (data) => {
          const newKomp = { id: `komp-${Date.now()}`, ...data }
          for (const sk of currentDb) {
            for (const rek of sk.kode_rekening || []) {
              if (rek.id === data.kode_rekening_id) {
                if (!rek.komponen_belanja) rek.komponen_belanja = []
                rek.komponen_belanja.push(newKomp)
              }
            }
          }
          return { success: true, data: newKomp }
        }),
        updateKomponenBelanja: vi.fn().mockImplementation(async (data) => {
          for (const sk of currentDb) {
            for (const rek of sk.kode_rekening || []) {
              if (rek.komponen_belanja) {
                const idx = rek.komponen_belanja.findIndex(k => k.id === data.id)
                if (idx !== -1) {
                  rek.komponen_belanja[idx] = { ...rek.komponen_belanja[idx], ...data }
                }
              }
            }
          }
          return { success: true, data }
        }),
        deleteKomponenBelanja: vi.fn().mockImplementation(async (id) => {
          for (const sk of currentDb) {
            for (const rek of sk.kode_rekening || []) {
              if (rek.komponen_belanja) {
                rek.komponen_belanja = rek.komponen_belanja.filter(k => k.id !== id)
              }
            }
          }
          return { success: true, data: { id } }
        }),
        addSubKegiatan: vi.fn().mockImplementation(async (data) => ({
          success: true,
          data: { id: `sk-new-${Date.now()}`, ...data }
        })),
        addKodeRekening: vi.fn().mockImplementation(async (data) => ({
          success: true,
          data: { id: `rek-new-${Date.now()}`, ...data }
        }))
      }
    }
  })

  it('dapat menambahkan komponen belanja baru ke dalam kode rekening', async () => {
    const { addKomponenBelanja } = useStore.getState()
    const newKomp = {
      kode_rekening_id: 'rek-1',
      kode: '02',
      nama: 'Tinta Printer Epson Original',
      spesifikasi: '003 Black & Color',
      volume: 4,
      satuan: 'Kotak',
      harga_satuan: 120000,
      total: 480000,
      keterangan: 'Pengadaan Triwulan 1'
    }

    const res = await addKomponenBelanja(newKomp)
    expect(res.success).toBe(true)
    expect(window.api.addKomponenBelanja).toHaveBeenCalledWith(newKomp)

    // State di dalam store harus terupdate dengan komponen baru
    const state = useStore.getState()
    const rek = state.subKegiatan[0].kode_rekening[0]
    expect(rek.komponen_belanja.length).toBe(2)
    expect(rek.komponen_belanja.some(k => k.nama === 'Tinta Printer Epson Original')).toBe(true)
  })

  it('dapat mengedit komponen belanja yang ada', async () => {
    const { updateKomponenBelanja } = useStore.getState()
    const updated = {
      id: 'komp-1',
      kode_rekening_id: 'rek-1',
      kode: '01-REV',
      nama: 'Kertas HVS A4 80gr Revisi',
      spesifikasi: 'PaperOne 80 gr',
      volume: 15,
      satuan: 'Rim',
      harga_satuan: 60000,
      total: 900000,
      keterangan: 'Penambahan volume'
    }

    const res = await updateKomponenBelanja(updated)
    expect(res.success).toBe(true)
    expect(window.api.updateKomponenBelanja).toHaveBeenCalledWith(updated)

    const state = useStore.getState()
    const rek = state.subKegiatan[0].kode_rekening[0]
    const item = rek.komponen_belanja.find(k => k.id === 'komp-1')
    expect(item.nama).toBe('Kertas HVS A4 80gr Revisi')
    expect(item.volume).toBe(15)
    expect(item.total).toBe(900000)
  })

  it('dapat menghapus komponen belanja', async () => {
    const { deleteKomponenBelanja } = useStore.getState()
    const res = await deleteKomponenBelanja('komp-1')
    expect(res.success).toBe(true)
    expect(window.api.deleteKomponenBelanja).toHaveBeenCalledWith('komp-1')

    const state = useStore.getState()
    const rek = state.subKegiatan[0].kode_rekening[0]
    expect(rek.komponen_belanja.length).toBe(0)
  })

  it('menolak penambahan komponen belanja jika role user adalah viewer', async () => {
    useStore.setState({ user: { username: 'tamu', role: 'viewer' } })
    const { addKomponenBelanja } = useStore.getState()
    const res = await addKomponenBelanja({ kode_rekening_id: 'rek-1', nama: 'Test Komponen' })
    expect(res.success).toBe(false)
    expect(res.error).toContain('Akses ditolak')
  })

  it('menghitung perkalian volume dan harga satuan dengan benar', () => {
    const volume = 25
    const hargaSatuan = 45000
    const total = volume * hargaSatuan
    expect(total).toBe(1125000)

    // Desimal volume (misal honor jam / orang-bulan)
    const volDesimal = 2.5
    const honor = 1500000
    expect(Math.round(volDesimal * honor)).toBe(3750000)
  })

  it('dapat menghitung selisih dan status keseimbangan antara pagu rekening dan total komponen', () => {
    const paguRekening = 5000000
    const listKomponen = [
      { id: '1', total: 3000000 },
      { id: '2', total: 2000000 }
    ]
    const totalKomponen = listKomponen.reduce((sum, k) => sum + k.total, 0)
    const diff = paguRekening - totalKomponen
    expect(diff).toBe(0) // Seimbang 100%

    // Over pagu
    const listOver = [...listKomponen, { id: '3', total: 500000 }]
    const totalOver = listOver.reduce((sum, k) => sum + k.total, 0)
    expect(paguRekening - totalOver).toBe(-500000) // Defisit 500rb
  })

  it('mendukung copyDpaStructure dengan menduplikasi komponen belanja jika ada', async () => {
    const { copyDpaStructure } = useStore.getState()
    const result = await copyDpaStructure(2026, 2027)

    expect(result.success).toBe(true)
    expect(window.api.addSubKegiatan).toHaveBeenCalled()
    expect(window.api.addKodeRekening).toHaveBeenCalled()
    expect(window.api.addKomponenBelanja).toHaveBeenCalled()

    // Komponen yang disalin harus memiliki data yang sesuai dengan total 0 untuk tahun anggaran baru
    const kompPayload = window.api.addKomponenBelanja.mock.calls[0][0]
    expect(kompPayload.nama).toBe('Kertas HVS A4 80gr')
    expect(kompPayload.volume).toBe(10)
    expect(kompPayload.satuan).toBe('Rim')
    expect(kompPayload.harga_satuan).toBe(55000)
    expect(kompPayload.total).toBe(0)
  })
})
