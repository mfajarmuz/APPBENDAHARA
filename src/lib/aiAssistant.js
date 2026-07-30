// src/lib/aiAssistant.js
import { formatRupiah, persen } from './format'

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
    pengeluaran,
    penerimaan
  }
}

/**
 * Engine Pemroses Pertanyaan Bahasa Indonesia (Hybrid: DeepSeek API + Local Rule Engine Fallback)
 */
export async function processAiQuery(queryText, storeState) {
  if (!queryText || typeof queryText !== 'string') {
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
  const apiModel = storeState?.settings?.deepseek_model?.trim() || 'deepseek-chat'

  // JIKA TERDAPAT DEEPSEEK API KEY: Gunakan DeepSeek LLM dengan Fakta Keuangan Real-Time!
  if (apiKey) {
    const systemPrompt = `Anda adalah Asisten AI Bendahara (Financial AI Co-Pilot) resmi untuk unit kerja ${ctx.unitKerja} (${ctx.unitKerjaKode}).
Tugas Anda adalah memberikan jawaban dan analisis keuangan yang ramah, sopan, luwes, komunikatif, dan profesional dalam Bahasa Indonesia.

FAKTA DATA KEUANGAN SAAT INI (100% AKURAT, GUNAKAN ANGKANYA SAMA PERSIS):
- Unit Kerja: ${ctx.unitKerja} (${ctx.unitKerjaKode})
- Total Pagu DPA Tahunan: ${formatRupiah(ctx.totalPagu)}
- Realisasi Pengeluaran: ${formatRupiah(ctx.realisasiPengeluaran)} (${ctx.persenRealisasi}%)
- Sisa Quota Pagu DPA: ${formatRupiah(ctx.sisaPagu)}
- Total Penerimaan Kas: ${formatRupiah(ctx.totalPenerimaan)}
- Saldo Kas BKU Posisi Saat Ini: ${formatRupiah(ctx.saldoKasBku)}
- Ringkasan Sub Kegiatan (${ctx.subKegiatanSummary.length} Sub Kegiatan):
${ctx.subKegiatanSummary.map((sk, i) => `  ${i+1}. ${sk.kode} - ${sk.nama}: Pagu ${formatRupiah(sk.pagu)}, Realisasi ${formatRupiah(sk.realisasi)} (${sk.persen}%), Sisa Pagu ${formatRupiah(sk.sisa)}`).join('\n')}

PETUNJUK RESPONS:
1. Jawab pertanyaan pengguna dengan gaya bahasa yang luwes, alami, dan membantu layaknya rekan kerja keuangan berpengalaman.
2. Selalu gunakan angka pasti dari data di atas saat ditanya nominal atau status pagu/BKU.
3. Jika pengguna meminta untuk membuka laporan/bku/anggaran/pengeluaran, Anda boleh menyertakan [ACTION:NAVIGATE:/path_halaman] di akhir jawaban (contoh: [ACTION:NAVIGATE:/laporan], [ACTION:NAVIGATE:/anggaran], [ACTION:NAVIGATE:/pengeluaran]).`

    try {
      const rawText = await callDeepSeekApi(apiKey, apiModel, systemPrompt, queryText)
      
      let action = null
      let text = rawText
      const actionMatch = rawText.match(/\[ACTION:NAVIGATE:(.*?)\]/)
      if (actionMatch) {
        const path = actionMatch[1]
        text = rawText.replace(actionMatch[0], '').trim()
        const labelMap = {
          '/anggaran': 'Buka Halaman Anggaran',
          '/laporan': 'Buka Halaman Laporan BKU',
          '/pengeluaran': 'Buka Halaman Pengeluaran',
          '/dashboard': 'Buka Dashboard'
        }
        action = { type: 'NAVIGATE', path, label: labelMap[path] || 'Buka Halaman' }
      }

      return { text, action }
    } catch (err) {
      console.warn('DeepSeek API error, fallback to local engine:', err.message)
    }
  }

  // FALLBACK: Local Deterministic Engine (Mode Offline / Tanpa API Key)
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

  // DEFAULT GUIDE RESPONSE
  return {
    text: `Halo! Saya **Asisten AI Bendahara**. Saya dapat membantu Anda menganalisis data keuangan secara akurat:\n\n` +
          `- **Pagu DPA & Sisa Anggaran**: *"Berapa sisa pagu Sub Kegiatan?"*\n` +
          `- **Status RAK Bulanan**: *"Cek status RAK akumulatif bulan ini"*\n` +
          `- **Saldo BKU**: *"Berapa saldo kas BKU saat ini?"*\n` +
          `- **Simulasi Belanja**: *"Apakah sisa pagu cukup untuk belanja 20 juta?"*\n` +
          `- **Laporan Eksekutif**: *"Buatkan ringkasan eksekutif penyerapan anggaran"*\n\n` +
          `*(Tips: Masukkan DeepSeek API Key pada Pengaturan untuk obrolan AI yang lebih luwes & cerdas)*`,
    action: null
  }
}
