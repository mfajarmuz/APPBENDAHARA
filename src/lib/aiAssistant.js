// src/lib/aiAssistant.js
import { formatRupiah, persen } from './format'
import { runLangChainAgent } from './langchainAgent'

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
 * Membangun ringkasan konteks keuangan dari Zustand Store
 */
export function buildFinancialContext(state) {
  const { subKegiatan = [], pengeluaran = [], penerimaan = [], settings = {} } = state

  // Total Pagu DPA
  const totalPagu = subKegiatan.reduce((acc, sk) => {
    return acc + (sk.kode_rekening || []).reduce((s, r) => s + (r.pagu_anggaran || 0), 0)
  }, 0)

  // Realisasi Pengeluaran Non-Pajak
  const realisasiPengeluaran = pengeluaran
    .filter(p => p.jenis !== 'Pajak' && p.jenis !== 'Pajak LS')
    .reduce((sum, p) => sum + (p.jumlah || 0), 0)

  const sisaPagu = totalPagu - realisasiPengeluaran
  const persenRealisasi = totalPagu > 0 ? persen(realisasiPengeluaran, totalPagu) : 0

  // Total Penerimaan & Saldo BKU
  const totalPenerimaan = penerimaan.reduce((sum, p) => sum + (p.jumlah || 0), 0)
  const saldoKasBku = totalPenerimaan - realisasiPengeluaran

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
    totalPenerimaan,
    saldoKasBku,
    subKegiatanSummary,
    transactionsList,
    pengeluaran,
    penerimaan
  }
}

/**
 * Engine Pemroses Pertanyaan Bahasa Indonesia (Hybrid: LangChain Agent LLM + Smart Multi-Target Engine)
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

  // JIKA TERDAPAT API KEY: Eksekusi LangChain Agent dengan Structured Tools & Memory!
  if (apiKey) {
    try {
      const res = await runLangChainAgent(queryText, chatHistory, storeState)
      return res
    } catch (err) {
      console.warn('LangChain Agent Error, fallback to local engine:', err.message)
    }
  }

  // FALLBACK: Smart Multi-Target Engine (Mode Offline / Tanpa DeepSeek API Key)

  // 1. RINGKASAN EKSEKUTIF UNTUK PIMPINAN
  if (query.includes('eksekutif') || query.includes('pimpinan') || query.includes('triwulan')) {
    let responseText = `### 📑 Ringkasan Eksekutif Realisasi Anggaran\n\n`
    responseText += `**Unit Kerja**: ${ctx.unitKerja} (${ctx.unitKerjaKode})\n`
    responseText += `**Tahun Anggaran**: 2026\n\n`
    responseText += `1. **Capaian Penyerapan**: Anggaran DPA telah terealisasi sebesar **${formatRupiah(ctx.realisasiPengeluaran)}** dari total pagu **${formatRupiah(ctx.totalPagu)}** (**${ctx.persenRealisasi}%**).\n`
    responseText += `2. **Ketersediaan Dana**: Sisa pagu DPA tahunan tersedia sebesar **${formatRupiah(ctx.sisaPagu)}** dengan posisi Saldo BKU sebesar **${formatRupiah(ctx.saldoKasBku)}**.\n`
    responseText += `3. **Rekomendasi**: Penyerapan berjalan stabil. Pastikan alokasi RAK bulanan diperbarui secara berkala agar tidak terjadi penumpukan transaksi di akhir tahun.\n`

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/laporan', label: 'Cetak Laporan Triwulan' }
    }
  }

  // 2. CEK SISA PAGU DPA & REKAP ANGGARAN
  if (query.includes('pagu') || query.includes('sisa anggaran') || query.includes('dpa')) {
    let responseText = `### 📊 Ringkasan Pagu DPA (${ctx.unitKerja})\n\n`
    responseText += `- **Total Pagu DPA**: ${formatRupiah(ctx.totalPagu)}\n`
    responseText += `- **Total Realisasi Belanja**: ${formatRupiah(ctx.realisasiPengeluaran)} (${ctx.persenRealisasi}%)\n`
    responseText += `- **Sisa Quota Pagu (Tahunan)**: **${formatRupiah(ctx.sisaPagu)}**\n\n`

    responseText += `#### Breakdown per Sub Kegiatan:\n`
    ctx.subKegiatanSummary.forEach((sk, idx) => {
      responseText += `${idx + 1}. **${sk.kode} - ${sk.nama}**\n`
      responseText += `   - Pagu: ${formatRupiah(sk.pagu)} | Realisasi: ${formatRupiah(sk.realisasi)} (${sk.persen}%)\n`
      responseText += `   - Sisa Pagu DPA: **${formatRupiah(sk.sisa)}**\n`
    })

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/anggaran', label: 'Buka Halaman Anggaran' }
    }
  }

  // 3. STATUS RAK BULANAN / AKUMULATIF
  if (query.includes('rak') || query.includes('rencana anggaran kas')) {
    let responseText = `### 📅 Status RAK Belanja Akumulatif (s.d. ${currentMonthName})\n\n`;

    ctx.subKegiatanSummary.forEach((sk, idx) => {
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

      responseText += `${idx + 1}. **${sk.kode} - ${sk.nama}**\n`
      responseText += `   - Batas Akumulatif RAK (s.d ${currentMonthName}): ${formatRupiah(targetRakTotal)}\n`
      responseText += `   - Realisasi s.d ${currentMonthName}: ${formatRupiah(realisasiSdBulan)}\n`
      responseText += `   - **Sisa RAK Tersedia**: **${formatRupiah(sisaRak)}**\n\n`
    })

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/anggaran', label: 'Kelola RAK Belanja' }
    }
  }

  // 4. RINGKASAN BKU / SALDO KAS
  if (query.includes('bku') || query.includes('saldo') || query.includes('penerimaan') || query.includes('kas bku') || query === 'kas') {
    let responseText = `### 📝 Ringkasan Buku Kas Umum (BKU)\n\n`
    responseText += `- **Total Penerimaan Kas**: ${formatRupiah(ctx.totalPenerimaan)}\n`
    responseText += `- **Total Pengeluaran Kas**: ${formatRupiah(ctx.realisasiPengeluaran)}\n`
    responseText += `- **Saldo Kas BKU Posisi Saat Ini**: **${formatRupiah(ctx.saldoKasBku)}**\n\n`
    responseText += `*Seluruh pengeluaran dan penerimaan terorganisir secara kronologis di halaman Laporan BKU.*`

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/laporan', label: 'Lihat Laporan BKU' }
    }
  }

  // 5. SIMULASI RENCANA BELANJA
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
      ctx.subKegiatanSummary.forEach((sk, idx) => {
        const sisaPagu = sk.sisa
        const isPaguCukup = sisaPagu >= nominal
        responseText += `${idx + 1}. **${sk.nama}**\n`
        responseText += `   - Sisa Pagu DPA: ${formatRupiah(sisaPagu)}\n`
        responseText += `   - **Status Quota DPA**: ${isPaguCukup ? '✅ MEMENUHI' : '❌ TIDAK CUKUP (Overbudget)'}\n\n`
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

  // 6. PENCARIAN KATA KUNCI MULTI-TARGET (BBM, ATK, Makanan, Perjalanan, dll)
  const ignoreWords = new Set(['check', 'cek', 'belanja', 'total', 'berapa', 'sampai', 'dengan', 'sekarang', 'pada', 'yang', 'ada', 'di', 'ke', 'dari', 'ini', 'apa', 'tolong', 'cari', 'sebutkan', 'rekap', 'ya', 'kah', 'dong', 'kamu', 'bisa', 'saja', 'sistem'])
  const searchKeywords = query
    .split(/\s+/)
    .map(w => w.replace(/[^\w]/g, '').trim())
    .filter(w => w.length > 1 && !ignoreWords.has(w))

  const matchedTransactions = searchKeywords.length > 0 ? ctx.transactionsList.filter(t => {
    const fullContent = `${t.uraian} ${t.keterangan} ${t.sub_kegiatan} ${t.rekening}`.toLowerCase()
    return searchKeywords.some(kw => fullContent.includes(kw))
  }) : []

  const matchedRekening = searchKeywords.length > 0 ? ctx.subKegiatanSummary.flatMap(sk => 
    sk.rekening.filter(r => searchKeywords.some(kw => r.uraian.toLowerCase().includes(kw) || r.kode.toLowerCase().includes(kw)))
      .map(r => ({ ...r, subKegiatanNama: sk.nama }))
  ) : []

  if (matchedTransactions.length > 0 || matchedRekening.length > 0) {
    const keywordLabel = searchKeywords.join(' ').toUpperCase()
    let responseText = `### 🔎 Hasil Analisis & Pencarian: "${keywordLabel}"\n\n`

    if (matchedRekening.length > 0) {
      responseText += `#### 📋 Data Pagu Rekening DPA:\n`
      matchedRekening.forEach((r, idx) => {
        responseText += `${idx + 1}. **${r.kode} - ${r.uraian}**\n`
        responseText += `   - Sub Kegiatan: *${r.subKegiatanNama}*\n`
        responseText += `   - Pagu DPA: ${formatRupiah(r.pagu)} | Realisasi: ${formatRupiah(r.realisasi)}\n`
        responseText += `   - **Sisa Pagu DPA Tersedia**: **${formatRupiah(r.sisa)}**\n\n`
      })
    }

    if (matchedTransactions.length > 0) {
      const totalMatchJumlah = matchedTransactions.reduce((sum, t) => sum + t.jumlah, 0)
      responseText += `#### 💸 Realisasi Transaksi Pengeluaran (${matchedTransactions.length} Transaksi):\n`
      responseText += `- **Total Pengeluaran**: **${formatRupiah(totalMatchJumlah)}**\n\n`
      matchedTransactions.forEach((t, idx) => {
        responseText += `${idx + 1}. **${t.tanggal}** - ${t.uraian}\n`
        responseText += `   - Nominal: **${formatRupiah(t.jumlah)}** ${t.no_bukti ? `| No. Bukti: ${t.no_bukti}` : ''}\n`
        if (t.rekening) responseText += `   - Rekening: *${t.rekening}*\n`
      })
    }

    return {
      text: responseText,
      action: { type: 'NAVIGATE', path: '/pengeluaran', label: 'Buka Halaman Pengeluaran' }
    }
  }

  // 7. RESPONS INTELEGEN UNTUK PERTANYAAN UMUM (TIDAK PERNAH MENAMPILKAN WELCOME TEMPLATE KAKU)
  let fallbackText = `### 🤖 Respons Asisten AI Bendahara\n\n`
  fallbackText += `Saya telah menganalisis data sistem untuk pertanyaan Anda: *"_${queryText}_"*\n\n`
  fallbackText += `**Ringkasan Status Keuangan Saat Ini (${ctx.unitKerja})**:\n`
  fallbackText += `- **Total Pagu DPA Tahunan**: ${formatRupiah(ctx.totalPagu)}\n`
  fallbackText += `- **Total Realisasi Belanja**: ${formatRupiah(ctx.realisasiPengeluaran)} (${ctx.persenRealisasi}%)\n`
  fallbackText += `- **Sisa Quota Pagu DPA**: **${formatRupiah(ctx.sisaPagu)}**\n`
  fallbackText += `- **Saldo Kas BKU Posisi Saat Ini**: **${formatRupiah(ctx.saldoKasBku)}**\n\n`
  fallbackText += `Anda dapat menanyakan sisa pagu, RAK bulanan, atau mencari rincian transaksi tertentu.\n`
  fallbackText += `*(Tips: Masukkan DeepSeek API Key pada menu Pengaturan untuk percakapan AI yang luwes dan cerdas)*`

  return {
    text: fallbackText,
    action: null
  }
}
