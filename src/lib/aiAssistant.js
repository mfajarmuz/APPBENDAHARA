// src/lib/aiAssistant.js
import { formatRupiah, persen } from './format'
import { runLangChainAgent, auditKodeRekening, getItemLevelDetails } from './langchainAgent'
import { runLangGraphAgent } from './langgraphAgent'

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const RAK_KEYS = [
  'rak_jan', 'rak_feb', 'rak_mar', 'rak_apr', 'rak_mei', 'rak_jun',
  'rak_jul', 'rak_agu', 'rak_sep', 'rak_okt', 'rak_nov', 'rak_des'
]

/**
 * Memanggil DeepSeek Chat Completions API (OpenAI Compatible)
 */
export async function callDeepSeekApi(apiKey, model, systemPrompt, userMessage) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      stream: false
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || 'Maaf, tidak ada respons dari DeepSeek API.'
}

/**
 * Membangun ringkasan konteks keuangan dari Zustand Store (Presisi 100% Sama dengan Dashboard)
 */
export function buildFinancialContext(state) {
  const { subKegiatan = [], pengeluaran = [], penerimaan = [], settings = {} } = state

  // Total Pagu DPA Tahunan
  const totalPagu = subKegiatan.reduce((acc, sk) => {
    return acc + (sk.kode_rekening || []).reduce((s, r) => s + (r.pagu_anggaran || 0), 0)
  }, 0)

  // Realisasi Pengeluaran Non-Pajak (LS + UP/GU/TU/KKPD)
  const realisasiPengeluaran = pengeluaran
    .filter(p => p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS')
    .reduce((sum, p) => sum + (p.jumlah || 0), 0)

  const sisaPagu = totalPagu - realisasiPengeluaran
  const persenRealisasi = totalPagu > 0 ? persen(realisasiPengeluaran, totalPagu) : 0

  // Penerimaan Breakdown (Identik dengan Dashboard.jsx)
  const penerimaanUPGU = penerimaan.filter(p => p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS' && p.jenis !== 'LS').reduce((s, p) => s + (p.jumlah || 0), 0)
  const penerimaanLS = penerimaan.filter(p => p.jenis === 'LS').reduce((s, p) => s + (p.jumlah || 0), 0)
  const totalPenerimaan = penerimaan.filter(p => p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS').reduce((s, p) => s + (p.jumlah || 0), 0)

  // Pengeluaran Breakdown (Identik dengan Dashboard.jsx)
  const pengeluaranGU = pengeluaran.filter(p => ['GU', 'UP', 'TU', 'KKPD'].includes(p.jenis)).reduce((s, p) => s + (p.jumlah || 0), 0)
  const pengeluaranLS = pengeluaran.filter(p => p.jenis === 'LS').reduce((s, p) => s + (p.jumlah || 0), 0)

  // Saldo Kas Tunai/Bank Bendahara (Identik dengan Card Dashboard "Saldo Kas": Penerimaan UP/GU - Pengeluaran GU)
  const saldoKasBku = penerimaanUPGU - pengeluaranGU
  const sisaSaldoKas = saldoKasBku

  // Per Sub-Kegiatan Summary
  const subKegiatanSummary = subKegiatan.map(sk => {
    const skPagu = (sk.kode_rekening || []).reduce((s, r) => s + (r.pagu_anggaran || 0), 0)
    const skRealisasi = pengeluaran
      .filter(p => p.sub_kegiatan_id === sk.id && p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS')
      .reduce((s, p) => s + (p.jumlah || 0), 0)
    const skSisa = skPagu - skRealisasi
    const skPersen = skPagu > 0 ? persen(skRealisasi, skPagu) : 0

    return {
      id: sk.id,
      kode: sk.kode,
      nama: sk.nama,
      pagu: skPagu,
      realisasi: skRealisasi,
      sisa: skSisa,
      persen: skPersen,
      rekening: (sk.kode_rekening || []).map(r => {
        const rReal = pengeluaran
          .filter(p => p.kode_rekening_id === r.id && p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS')
          .reduce((sum, p) => sum + (p.jumlah || 0), 0)
        return {
          id: r.id,
          kode: r.kode,
          uraian: r.uraian,
          pagu: r.pagu_anggaran || 0,
          realisasi: rReal,
          sisa: (r.pagu_anggaran || 0) - rReal
        }
      })
    }
  })

  // Daftar Rincian Transaksi Pengeluaran untuk Pencarian Detail (e.g., BBM, ATK, Makanan, dll)
  const transactionsList = pengeluaran
    .filter(p => p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS')
    .map(p => {
      const rincianStr = (p.pengeluaran_rincian || []).map(r => `${r.uraian}${r.volume ? ` (${r.volume})` : ''}`).join(', ')
      const desc = rincianStr || p.keterangan || 'Pengeluaran Belanja'
      const sk = subKegiatan.find(s => s.id === p.sub_kegiatan_id)
      const rek = sk?.kode_rekening?.find(r => r.id === p.kode_rekening_id)

      return {
        id: p.id,
        tanggal: p.tanggal || '',
        uraian: desc,
        keterangan: p.keterangan || '',
        jumlah: p.jumlah || 0,
        jenis: p.jenis || '',
        no_bukti: p.no_bukti || p.nomor_ls || '',
        sub_kegiatan: sk?.nama || '',
        rekening: rek?.uraian || ''
      }
    })

  return {
    unitKerja: settings.unit_kerja || 'Unit Kerja',
    unitKerjaKode: settings.unit_kerja_kode || '',
    totalPagu,
    realisasiPengeluaran,
    sisaPagu,
    persenRealisasi,
    penerimaanUPGU,
    penerimaanLS,
    pengeluaranGU,
    pengeluaranLS,
    totalPenerimaan,
    saldoKasBku,
    sisaSaldoKas,
    subKegiatanSummary,
    transactionsList,
    pengeluaran,
    penerimaan
  }
}

/**
 * Engine Pemroses Pertanyaan Bahasa Indonesia (Hybrid: DeepSeek LLM Agent + LangGraph State Engine + Smart Search)
 */
export async function processAiQuery(queryText, storeState, chatHistory = []) {
  if (!queryText || typeof queryText !== 'string' || !queryText.trim()) {
    return {
      text: 'Silakan ketik pertanyaan atau pilih salah satu menu pintas di bawah ini.',
      action: null
    }
  }

  const query = queryText.toLowerCase().trim()
  const ctx = buildFinancialContext(storeState)
  const currentMonthIdx = new Date().getMonth()
  const currentMonthName = BULAN_NAMES[currentMonthIdx]

  const apiKey = storeState?.settings?.deepseek_api_key?.trim()

  // UTAMA: JIKA TERDAPAT DEEPSEEK API KEY, UTAMAKAN EXECUTION LANGCHAIN/DEEPSEEK LLM AGENT!
  if (apiKey) {
    try {
      const res = await runLangChainAgent(queryText, chatHistory, storeState)
      if (res && res.text) {
        return res
      }
    } catch (err) {
      console.warn('DeepSeek LLM Agent Error, fallback to LangGraph/Local engine:', err.message)
    }
  }

  // FALLBACK (Mode Offline / Tanpa DeepSeek API Key atau saat DeepSeek Error)
  const langgraphRes = await runLangGraphAgent(queryText, storeState, chatHistory)
  if (langgraphRes) {
    return langgraphRes
  }

  // AUDIT KESALAHAN KODE REKENING (MODE OFFLINE)
  if (query.includes('audit') || query.includes('salah kode') || query.includes('kesalahan kode') || query.includes('salah rekening') || query.includes('analisis rekening')) {
    const auditResults = auditKodeRekening(storeState.pengeluaran || [], storeState.subKegiatan || [])
    
    let responseText = `### 🛡️ Hasil Audit Kesalahan Kode Rekening Transaksi\n\n`
    responseText += `- **Total Transaksi Diaudit**: ${storeState.pengeluaran?.length || 0} Transaksi\n`
    responseText += `- **Potensi Kesalahan Ditemukan**: **${auditResults.length} Transaksi**\n\n`

    if (auditResults.length > 0) {
      responseText += `| Tanggal | Uraian Transaksi | Nominal | Rekening Saat Ini | Catatan Audit & Rekomendasi |\n`
      responseText += `| :--- | :--- | :--- | :--- | :--- |\n`
      auditResults.forEach(a => {
        responseText += `| ${a.tanggal} | ${a.uraian} | **${a.nominal}** | ${a.kodeRekeningSaatIni} | ${a.catatanAudit} |\n`
      })
    } else {
      responseText += `✅ **100% Sesuai Spesifikasi**: Seluruh transaksi pengeluaran telah dialokasikan ke Kode Rekening yang tepat tanpa ditemukan pengalokasian ganjil.\n`
    }

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/pengeluaran', label: 'Buka Halaman Pengeluaran' }
    }
  }

  // RINCIAN TRANSAKSI DETAIL PER ITEM (MODE OFFLINE)
  if (query.includes('detail item') || query.includes('rincian item') || query.includes('detail barang') || query.includes('rincian barang') || query.includes('item transaksi') || query.includes('detail transaksi')) {
    const itemDetails = getItemLevelDetails(storeState.pengeluaran || [], storeState.subKegiatan || [])
    
    let responseText = `### 📋 Rincian Transaksi Detail Per Item Barang/Jasa\n\n`
    responseText += `Total Rincian Item: **${itemDetails.length} Item**\n\n`

    responseText += `| Tanggal | Uraian Item / Barang | Vol | Hrg Satuan | Total | Kode Rekening | Sub Kegiatan | No. Bukti |\n`
    responseText += `| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |\n`
    itemDetails.forEach(it => {
      responseText += `| ${it.tanggal} | ${it.uraianItem} | ${it.volume} | ${it.hargaSatuan} | **${it.totalNominal}** | ${it.kodeRekening} | ${it.subKegiatan} | ${it.noBukti} |\n`
    })

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/pengeluaran', label: 'Buka Halaman Pengeluaran' }
    }
  }

  // PRIORITAS 1: PANCARIAN SPESIFIK ITEM/REKENING/KATA KUNCI (e.g. BBM, ATK, Listrik, Kendaraan, dll)
  const ignoreWords = new Set(['check', 'cek', 'belanja', 'total', 'berapa', 'sampai', 'dengan', 'sekarang', 'pada', 'yang', 'ada', 'di', 'ke', 'dari', 'ini', 'apa', 'tolong', 'cari', 'sebutkan', 'rekap', 'ya', 'kah', 'dong', 'kamu', 'bisa', 'saja', 'sistem', 'pagu', 'sisa', 'anggaran', 'dashboard', 'menunjukan', 'menunjukkan'])
  const searchKeywords = query
    .split(/\s+/)
    .map(w => w.replace(/[^\w]/g, '').trim())
    .filter(w => w.length > 1 && !ignoreWords.has(w))

  const matchedSubKegiatan = searchKeywords.length > 0 ? ctx.subKegiatanSummary.filter(sk => {
    const fullText = `${sk.kode} ${sk.nama} ${sk.rekening.map(r => `${r.kode} ${r.uraian}`).join(' ')}`.toLowerCase()
    return searchKeywords.some(kw => fullText.includes(kw))
  }) : []

  const matchedTransactions = searchKeywords.length > 0 ? ctx.transactionsList.filter(t => {
    const fullContent = `${t.uraian} ${t.keterangan} ${t.sub_kegiatan} ${t.rekening}`.toLowerCase()
    return searchKeywords.some(kw => fullContent.includes(kw))
  }) : []

  if (matchedSubKegiatan.length > 0 || matchedTransactions.length > 0) {
    const keywordLabel = searchKeywords.join(' ').toUpperCase()
    let responseText = `### 🔎 Hasil Analisis & Sisa Pagu: "${keywordLabel}"\n\n`

    if (matchedSubKegiatan.length > 0) {
      responseText += `#### 📋 Sub Kegiatan & Rekening Terkait DPA:\n\n`
      responseText += `| Kode & Sub Kegiatan | Pagu DPA | Realisasi | % | Sisa Pagu DPA |\n`
      responseText += `| :--- | :--- | :--- | :---: | :--- |\n`
      matchedSubKegiatan.forEach(sk => {
        responseText += `| **${sk.kode} ${sk.nama}** | ${formatRupiah(sk.pagu)} | ${formatRupiah(sk.realisasi)} | ${sk.persen}% | **${formatRupiah(sk.sisa)}** |\n`
      })
      responseText += `\n`
    }

    if (matchedTransactions.length > 0) {
      const totalMatchJumlah = matchedTransactions.reduce((sum, t) => sum + t.jumlah, 0)
      responseText += `#### 💸 Realisasi Transaksi Pengeluaran (${matchedTransactions.length} Transaksi - Total: **${formatRupiah(totalMatchJumlah)}**):\n\n`
      responseText += `| Tanggal | Uraian Transaksi | Nominal | No. Bukti |\n`
      responseText += `| :--- | :--- | :--- | :--- |\n`
      matchedTransactions.forEach(t => {
        responseText += `| ${t.tanggal} | ${t.uraian} | **${formatRupiah(t.jumlah)}** | ${t.no_bukti || '-'} |\n`
      })
    }

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/anggaran', label: 'Buka Halaman Anggaran' }
    }
  }

  // 2. RINGKASAN EKSEKUTIF UNTUK PIMPINAN
  if (query.includes('eksekutif') || query.includes('pimpinan') || query.includes('triwulan')) {
    let responseText = `### 📑 Ringkasan Eksekutif Realisasi Anggaran\n\n`
    responseText += `**Unit Kerja**: ${ctx.unitKerja} (${ctx.unitKerjaKode})\n`
    responseText += `**Tahun Anggaran**: 2026\n\n`
    responseText += `1. **Capaian Penyerapan**: Anggaran DPA telah terealisasi sebesar **${formatRupiah(ctx.realisasiPengeluaran)}** dari total pagu **${formatRupiah(ctx.totalPagu)}** (**${ctx.persenRealisasi}%**).\n`
    responseText += `2. **Ketersediaan Dana**: Sisa pagu DPA tahunan tersedia sebesar **${formatRupiah(ctx.sisaPagu)}** dengan posisi Saldo Kas Bendahara sebesar **${formatRupiah(ctx.saldoKasBku)}**.\n`
    responseText += `3. **Rekomendasi**: Penyerapan berjalan stabil. Pastikan alokasi RAK bulanan diperbarui secara berkala agar tidak terjadi penumpukan transaksi di akhir tahun.\n`

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/laporan', label: 'Cetak Laporan Triwulan' }
    }
  }

  // 3. CEK SISA PAGU DPA & REKAP ANGGARAN UMUM (DENGAN FORMAT TABEL)
  if (query.includes('pagu') || query.includes('sisa anggaran') || query.includes('dpa')) {
    let responseText = `### 📊 Ringkasan Pagu DPA (${ctx.unitKerja})\n\n`
    responseText += `- **Total Pagu DPA**: ${formatRupiah(ctx.totalPagu)}\n`
    responseText += `- **Total Realisasi Belanja**: ${formatRupiah(ctx.realisasiPengeluaran)} (${ctx.persenRealisasi}%)\n`
    responseText += `- **Sisa Quota Pagu (Tahunan)**: **${formatRupiah(ctx.sisaPagu)}**\n\n`

    responseText += `| Kode & Nama Sub Kegiatan | Pagu DPA | Realisasi | % | Sisa Pagu DPA |\n`
    responseText += `| :--- | :--- | :--- | :---: | :--- |\n`
    ctx.subKegiatanSummary.forEach(sk => {
      responseText += `| **${sk.kode} - ${sk.nama}** | ${formatRupiah(sk.pagu)} | ${formatRupiah(sk.realisasi)} | ${sk.persen}% | **${formatRupiah(sk.sisa)}** |\n`
    })

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/anggaran', label: 'Buka Halaman Anggaran' }
    }
  }

  // 4. STATUS RAK BULANAN / AKUMULATIF (DENGAN FORMAT TABEL)
  if (query.includes('rak') || query.includes('rencana anggaran kas')) {
    let responseText = `### 📅 Status RAK Belanja Akumulatif (s.d. ${currentMonthName})\n\n`
    responseText += `| Sub Kegiatan | Batas RAK s.d ${currentMonthName} | Realisasi | Sisa RAK Tersedia |\n`
    responseText += `| :--- | :--- | :--- | :--- |\n`

    ctx.subKegiatanSummary.forEach(sk => {
      let targetRakTotal = 0
      let realisasiSdBulan = 0

      ;(storeState.subKegiatan || []).forEach(skItem => {
        if (skItem.id === sk.id) {
          (skItem.kode_rekening || []).forEach(rek => {
            for (let m = 0; m <= currentMonthIdx; m++) {
              targetRakTotal += (rek[RAK_KEYS[m]] || 0)
            }
          })
        }
      })

      realisasiSdBulan = (storeState.pengeluaran || [])
        .filter(p => {
          if (p.sub_kegiatan_id !== sk.id || p.jenis === 'Pajak' || p.jenis === 'Pajak LS' || !p.tanggal) return false
          const parts = p.tanggal.split('-')
          if (parts.length < 2) return false
          const pMonth = parseInt(parts[1], 10) - 1
          return pMonth <= currentMonthIdx
        })
        .reduce((s, p) => s + (p.jumlah || 0), 0)

      const sisaRak = targetRakTotal - realisasiSdBulan
      responseText += `| **${sk.kode} ${sk.nama}** | ${formatRupiah(targetRakTotal)} | ${formatRupiah(realisasiSdBulan)} | **${formatRupiah(sisaRak)}** |\n`
    })

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/anggaran', label: 'Kelola RAK Belanja' }
    }
  }

  // 5. RINGKASAN BKU / SALDO KAS
  if (query.includes('bku') || query.includes('saldo') || query.includes('penerimaan') || query.includes('kas bku') || query === 'kas' || query.includes('dashboard')) {
    let responseText = `### 📝 Ringkasan Saldo Kas & BKU (${ctx.unitKerja})\n\n`
    responseText += `| Indikator Keuangan | Nominal | Keterangan |\n`
    responseText += `| :--- | :--- | :--- |\n`
    responseText += `| **Saldo Kas Bendahara (Dashboard)** | **${formatRupiah(ctx.saldoKasBku)}** | Tunai/Bank Bendahara (UP/GU) |\n`
    responseText += `| **Total Penerimaan Kas** | ${formatRupiah(ctx.totalPenerimaan)} | Total Pencairan UP & GU |\n`
    responseText += `| **Realisasi Belanja GU/UP** | ${formatRupiah(ctx.pengeluaranGU)} | Pengeluaran dari Kas Bendahara |\n`
    responseText += `| **Realisasi Belanja LS** | ${formatRupiah(ctx.pengeluaranLS)} | Pencairan Langsung dari Kasda |\n`
    responseText += `| **Total Realisasi Belanja** | ${formatRupiah(ctx.realisasiPengeluaran)} | Total GU + LS (${ctx.persenRealisasi}%) |\n`
    responseText += `| **Sisa Quota Pagu DPA** | **${formatRupiah(ctx.sisaPagu)}** | Quota Pagu DPA Tersedia |\n`

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/dashboard', label: 'Lihat Dashboard' }
    }
  }

  // 6. SIMULASI RENCANA BELANJA
  if (query.includes('simulasi') || query.includes('kalau') || query.includes('keluarkan') || query.includes('cukup')) {
    const matchNominal = query.match(/(\d+[\d\.]*)/)
    let nominal = 0
    if (matchNominal) {
      nominal = parseInt(matchNominal[0].replace(/\./g, ''), 10)
      if (query.includes('juta')) nominal *= 1000000
    }

    let responseText = `### ⚡ Hasil Simulasi Rencana Belanja\n\n`
    if (nominal > 0) {
      responseText += `Rencana Nominal Belanja: **${formatRupiah(nominal)}** (Bulan ${currentMonthName})\n\n`
      responseText += `| Sub Kegiatan | Sisa Pagu DPA | Status Quota |\n`
      responseText += `| :--- | :--- | :---: |\n`
      ctx.subKegiatanSummary.forEach(sk => {
        const sisaPagu = sk.sisa
        const isPaguCukup = sisaPagu >= nominal
        responseText += `| **${sk.nama}** | ${formatRupiah(sisaPagu)} | ${isPaguCukup ? '✅ MEMENUHI' : '❌ TIDAK CUKUP'} |\n`
      })
    } else {
      responseText += `Sebutkan nominal belanja yang ingin disimulasikan.\n`
      responseText += `*Contoh:* "Apakah cukup kalau saya keluarkan 15 juta bulan ini?"`
    }

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/pengeluaran', label: 'Catat Pengeluaran' }
    }
  }

  // 7. RESPONS INTELEGEN UNTUK PERTANYAAN UMUM
  let fallbackText = `### 🤖 Respons Asisten AI Bendahara\n\n`
  fallbackText += `Saya telah menganalisis data sistem untuk pertanyaan Anda: *"_${queryText}_"*\n\n`
  fallbackText += `| Indikator Keuangan (${ctx.unitKerja}) | Nominal |\n`
  fallbackText += `| :--- | :--- |\n`
  fallbackText += `| **Saldo Kas Bendahara (Dashboard)** | **${formatRupiah(ctx.saldoKasBku)}** |\n`
  fallbackText += `| **Total Pagu DPA Tahunan** | ${formatRupiah(ctx.totalPagu)} |\n`
  fallbackText += `| **Total Realisasi Belanja** | ${formatRupiah(ctx.realisasiPengeluaran)} (${ctx.persenRealisasi}%) |\n`
  fallbackText += `| **Sisa Quota Pagu DPA** | **${formatRupiah(ctx.sisaPagu)}** |\n\n`
  fallbackText += `Anda dapat menanyakan sisa pagu, RAK bulanan, atau mencari rincian transaksi tertentu.\n`
  fallbackText += `*(Tips: Masukkan DeepSeek API Key pada menu Pengaturan untuk percakapan AI yang luwes dan cerdas)*`

  return {
    text: fallbackText,
    action: null
  }
}
