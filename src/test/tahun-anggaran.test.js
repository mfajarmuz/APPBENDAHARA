import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStore } from '../store/useStore'
import { buildFinancialContext, processAiQuery } from '../lib/aiAssistant'
import { executeTool } from '../lib/langchainAgent'
import { nodeMultiAngleAudit } from '../lib/langgraphAgent'

describe('Multi-Tahun Anggaran (Store & Isolasi Data)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useStore.setState({
      tahunAnggaran: 2026,
      daftarTahunAnggaran: [2024, 2025, 2026, 2027],
      subKegiatan: [],
      penerimaan: [],
      pengeluaran: [],
      isLoading: false
    })
  })

  it('memiliki state default tahunAnggaran 2026 dan daftar tahun lengkap', () => {
    const state = useStore.getState()
    expect(state.tahunAnggaran).toBe(2026)
    expect(state.daftarTahunAnggaran).toEqual([2024, 2025, 2026, 2027])
  })

  it('dapat berpindah tahun anggaran dengan setTahunAnggaran dan tersimpan di localStorage', () => {
    const { setTahunAnggaran } = useStore.getState()
    setTahunAnggaran(2027)

    expect(useStore.getState().tahunAnggaran).toBe(2027)
    expect(localStorage.getItem('bendahara_tahun_anggaran')).toBe('2027')
  })

  it('dapat menambahkan tahun anggaran baru secara terurut dan otomatis beralih', async () => {
    const { addTahunAnggaran } = useStore.getState()
    const result = await addTahunAnggaran(2028)

    expect(result.success).toBe(true)
    expect(useStore.getState().tahunAnggaran).toBe(2028)
    expect(useStore.getState().daftarTahunAnggaran).toContain(2028)
    expect(useStore.getState().daftarTahunAnggaran).toEqual([2024, 2025, 2026, 2027, 2028])
  })

  it('menolak penambahan tahun anggaran yang sudah ada', async () => {
    const { addTahunAnggaran } = useStore.getState()
    const result = await addTahunAnggaran(2026)

    expect(result.success).toBe(false)
    expect(result.error).toContain('sudah ada')
  })

  it('dapat menyalin struktur DPA (Sub Kegiatan & Kode Rekening) dengan pagu dan RAK di-reset ke 0', async () => {
    const sourceSubKegiatan = [
      {
        id: 'sk-2026-1',
        kode: '5.01.01.1.01',
        nama: 'Penyusunan Rencana Anggaran',
        tahun_anggaran: 2026,
        kode_rekening: [
          {
            id: 'rek-1',
            kode: '5.1.02.01.01.0024',
            uraian: 'Belanja Alat Tulis Kantor',
            pagu_anggaran: 15000000,
            rak_jan: 5000000,
            rak_feb: 5000000,
            rak_mar: 5000000
          }
        ]
      }
    ]

    useStore.setState({ subKegiatan: sourceSubKegiatan })
    window.api.addSubKegiatan = vi.fn().mockImplementation(async (data) => ({
      success: true,
      data: { id: `sk-new-${Date.now()}`, ...data }
    }))
    window.api.addKodeRekening = vi.fn().mockImplementation(async (data) => ({
      success: true,
      data: { id: `rek-new-${Date.now()}`, ...data }
    }))
    window.api.getSubKegiatan = vi.fn().mockResolvedValue({
      success: true,
      data: sourceSubKegiatan
    })

    const { copyDpaStructure } = useStore.getState()
    const result = await copyDpaStructure(2026, 2027)

    expect(result.success).toBe(true)
    expect(result.message).toContain('Berhasil menyalin')
    expect(window.api.addSubKegiatan).toHaveBeenCalled()
    expect(window.api.addKodeRekening).toHaveBeenCalled()

    const callPayload = window.api.addSubKegiatan.mock.calls[0][0]
    expect(callPayload.tahun_anggaran).toBe(2027)
    expect(callPayload.kode).toBe('5.01.01.1.01')

    const rekPayload = window.api.addKodeRekening.mock.calls[0][0]
    expect(rekPayload.pagu_anggaran).toBe(0)
    expect(rekPayload.rak_jan).toBe(0)
    expect(rekPayload.rak_feb).toBe(0)
  })
})

describe('Multi-Tahun Anggaran (Isolasi Asisten AI)', () => {
  const multiYearState = {
    settings: { unit_kerja: 'Dinas Komunikasi dan Informatika', unit_kerja_kode: '2.16' },
    tahunAnggaran: 2026,
    subKegiatan: [
      {
        id: 'sk-2026',
        kode: '2.16.01.1.01',
        nama: 'Layanan TI 2026',
        tahun_anggaran: 2026,
        kode_rekening: [
          {
            id: 'rek-2026',
            kode: '5.1.02.01.001',
            uraian: 'Belanja Internet',
            pagu_anggaran: 100000000,
            rak_jan: 25000000
          }
        ]
      },
      {
        id: 'sk-2027',
        kode: '2.16.01.1.01',
        nama: 'Layanan TI 2027',
        tahun_anggaran: 2027,
        kode_rekening: [
          {
            id: 'rek-2027',
            kode: '5.1.02.01.001',
            uraian: 'Belanja Internet',
            pagu_anggaran: 150000000,
            rak_jan: 30000000
          }
        ]
      }
    ],
    pengeluaran: [
      {
        id: 'p-2026-1',
        sub_kegiatan_id: 'sk-2026',
        kode_rekening_id: 'rek-2026',
        keterangan: 'Langganan Internet Triwulan 1',
        jumlah: 25000000,
        jenis: 'GU',
        tanggal: '2026-02-10'
      },
      {
        id: 'p-2027-1',
        sub_kegiatan_id: 'sk-2027',
        kode_rekening_id: 'rek-2027',
        keterangan: 'Langganan Fiber Optic Baru',
        jumlah: 40000000,
        jenis: 'GU',
        tanggal: '2027-01-15'
      }
    ],
    penerimaan: [
      {
        id: 'pen-2026-1',
        jumlah: 50000000,
        jenis: 'UP',
        tanggal: '2026-01-05'
      },
      {
        id: 'pen-2027-1',
        jumlah: 80000000,
        jenis: 'UP',
        tanggal: '2027-01-05'
      }
    ]
  }

  it('harus membatasi buildFinancialContext hanya pada tahun anggaran aktif 2026', () => {
    const ctx2026 = buildFinancialContext({ ...multiYearState, tahunAnggaran: 2026 })
    expect(ctx2026.tahunAnggaran).toBe(2026)
    expect(ctx2026.totalPagu).toBe(100000000)
    expect(ctx2026.realisasiPengeluaran).toBe(25000000)
    expect(ctx2026.sisaPagu).toBe(75000000)
    expect(ctx2026.totalPenerimaan).toBe(50000000)
    expect(ctx2026.saldoKasBku).toBe(25000000) // 50M - 25M
    expect(ctx2026.transactionsList.length).toBe(1)
    expect(ctx2026.transactionsList[0].tanggal).toBe('2026-02-10')
  })

  it('harus membatasi buildFinancialContext hanya pada tahun anggaran aktif 2027', () => {
    const ctx2027 = buildFinancialContext({ ...multiYearState, tahunAnggaran: 2027 })
    expect(ctx2027.tahunAnggaran).toBe(2027)
    expect(ctx2027.totalPagu).toBe(150000000)
    expect(ctx2027.realisasiPengeluaran).toBe(40000000)
    expect(ctx2027.sisaPagu).toBe(110000000)
    expect(ctx2027.totalPenerimaan).toBe(80000000)
    expect(ctx2027.saldoKasBku).toBe(40000000) // 80M - 40M
    expect(ctx2027.transactionsList.length).toBe(1)
    expect(ctx2027.transactionsList[0].tanggal).toBe('2027-01-15')
  })

  it('harus mengisolasi eksekusi LangChain Tool generate_executive_summary sesuai tahun aktif', () => {
    const summary2026 = JSON.parse(executeTool('generate_executive_summary', {}, { ...multiYearState, tahunAnggaran: 2026 }))
    expect(summary2026.tahunAnggaran).toBe(2026)
    expect(summary2026.totalPagu).toContain('100.000.000')

    const summary2027 = JSON.parse(executeTool('generate_executive_summary', {}, { ...multiYearState, tahunAnggaran: 2027 }))
    expect(summary2027.tahunAnggaran).toBe(2027)
    expect(summary2027.totalPagu).toContain('150.000.000')
  })

  it('harus mengisolasi pencarian transaksi AI pada tahun aktif saja', async () => {
    const res2026 = await processAiQuery('cari internet', { ...multiYearState, tahunAnggaran: 2026 })
    expect(res2026.text).toContain('25.000.000')
    expect(res2026.text).not.toContain('40.000.000')

    const res2027 = await processAiQuery('cari internet', { ...multiYearState, tahunAnggaran: 2027 })
    expect(res2027.text).toContain('40.000.000')
    expect(res2027.text).not.toContain('25.000.000')
  })

  it('harus menghasilkan ringkasan eksekutif dengan tahun anggaran dinamis', async () => {
    const res = await processAiQuery('Buatkan ringkasan eksekutif untuk pimpinan', { ...multiYearState, tahunAnggaran: 2027 })
    expect(res.text).toContain('Tahun Anggaran**: 2027')
    expect(res.text).toContain('150.000.000')
  })

  it('harus mengisolasi pemeriksaan LangGraph Audit pada tahun anggaran aktif', () => {
    const graphState = {
      storeState: { ...multiYearState, tahunAnggaran: 2027 },
      context: null
    }
    const audited = nodeMultiAngleAudit(graphState)
    expect(audited.step).toBe('AUDITED')
    expect(audited.context.tahunAnggaran).toBe(2027)
    expect(audited.context.pengeluaran.length).toBe(1)
    expect(audited.context.pengeluaran[0].tanggal).toBe('2027-01-15')
  })
})
