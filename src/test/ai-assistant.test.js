import { describe, it, expect } from 'vitest'
import { buildFinancialContext, processAiQuery } from '../lib/aiAssistant'
import { executeTool, LANGCHAIN_TOOLS } from '../lib/langchainAgent'

describe('Asisten AI Bendahara (Engine & Context)', () => {
  const dummyState = {
    settings: { unit_kerja: 'Dinas Keuangan', unit_kerja_kode: '5.01' },
    subKegiatan: [
      {
        id: 'sk-1',
        kode: '5.01.01.1.01',
        nama: 'Penagihan Pajak Daerah',
        kode_rekening: [
          {
            id: 'rek-1',
            kode: '5.1.02.01.001',
            uraian: 'Belanja Alat Tulis Kantor',
            pagu_anggaran: 20000000,
            rak_jan: 5000000,
            rak_feb: 5000000,
            rak_mar: 5000000,
            rak_apr: 5000000
          }
        ]
      }
    ],
    pengeluaran: [
      {
        id: 'p-1',
        sub_kegiatan_id: 'sk-1',
        kode_rekening_id: 'rek-1',
        keterangan: 'Pembelian BBM Kendaraan Operasional',
        jumlah: 750000,
        jenis: 'GU',
        tanggal: '2026-01-15'
      }
    ],
    penerimaan: [
      {
        id: 'pen-1',
        jumlah: 50000000,
        tanggal: '2026-01-02'
      }
    ]
  }

  it('harus mengekstrak konteks keuangan dengan benar', () => {
    const ctx = buildFinancialContext(dummyState)
    expect(ctx.totalPagu).toBe(20000000)
    expect(ctx.realisasiPengeluaran).toBe(750000)
    expect(ctx.sisaPagu).toBe(19250000)
    expect(ctx.totalPenerimaan).toBe(50000000)
    expect(ctx.saldoKasBku).toBe(49250000)
  })

  it('harus mengeksekusi LangChain Tools secara deterministik', () => {
    expect(LANGCHAIN_TOOLS.length).toBe(7)

    const paguRes = JSON.parse(executeTool('get_sisa_pagu', {}, dummyState))
    expect(paguRes.totalPagu).toContain('20.000.000')

    const searchRes = JSON.parse(executeTool('search_pengeluaran_detail', { keyword: 'bbm' }, dummyState))
    expect(searchRes.jumlahTransaksi).toBe(1)
    expect(searchRes.totalNominal).toContain('750.000')

    const simRes = JSON.parse(executeTool('simulate_belanja', { nominal: 5000000 }, dummyState))
    expect(simRes.hasilSimulasi[0].status).toContain('MEMENUHI')

    const navRes = JSON.parse(executeTool('navigate_app_page', { path: '/laporan' }, dummyState))
    expect(navRes.action.path).toBe('/laporan')
  })

  it('harus merespons pertanyaan sisa pagu DPA dalam Bahasa Indonesia', async () => {
    const res = await processAiQuery('Berapa sisa pagu DPA?', dummyState)
    expect(res.text).toContain('Ringkasan Pagu DPA')
    expect(res.text).toContain('19.250.000')
    expect(res.action.path).toBe('/anggaran')
  })

  it('harus merespons pencarian transaksi item spesifik (BBM/ATK/dll)', async () => {
    const res = await processAiQuery('check belanja bbm total berapa sampai dengan sekarang?', dummyState)
    expect(res.text).toContain('BBM')
    expect(res.text).toContain('750.000')
    expect(res.action.path).toBe('/anggaran')
  })

  it('harus merespons pertanyaan status RAK bulanan', async () => {
    const res = await processAiQuery('Cek status RAK bulanan', dummyState)
    expect(res.text).toContain('Status RAK Belanja Akumulatif')
    expect(res.action.path).toBe('/anggaran')
  })

  it('harus merespons pertanyaan BKU dan saldo kas', async () => {
    const res = await processAiQuery('Berapa saldo BKU saat ini?', dummyState)
    expect(res.text).toContain('Ringkasan Saldo Kas & BKU')
    expect(res.text).toContain('49.250.000')
    expect(res.action.path).toBe('/dashboard')
  })

  it('harus memproses simulasi belanja dengan benar', async () => {
    const res = await processAiQuery('Apakah cukup kalau saya keluarkan 10 juta bulan ini?', dummyState)
    expect(res.text).toContain('Hasil Simulasi Rencana Belanja')
    expect(res.text).toContain('MEMENUHI')
    expect(res.action.path).toBe('/pengeluaran')
  })

  it('harus menghasilkan draf ringkasan eksekutif untuk Pimpinan', async () => {
    const res = await processAiQuery('Buatkan ringkasan eksekutif untuk pimpinan', dummyState)
    expect(res.text).toContain('Ringkasan Eksekutif Realisasi Anggaran')
    expect(res.text).toContain('Dinas Keuangan')
    expect(res.action.path).toBe('/laporan')
  })
})
