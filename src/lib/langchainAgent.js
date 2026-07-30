// src/lib/langchainAgent.js
import { formatRupiah, persen } from './format'
import { buildFinancialContext } from './aiAssistant'

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const RAK_KEYS = [
  'rak_jan', 'rak_feb', 'rak_mar', 'rak_apr', 'rak_mei', 'rak_jun',
  'rak_jul', 'rak_agu', 'rak_sep', 'rak_okt', 'rak_nov', 'rak_des'
]

/**
 * Definisi Structured Tools ala LangChain untuk Agent Execution
 */
export const LANGCHAIN_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_sisa_pagu',
      description: 'Mendapatkan data ringkasan Pagu DPA tahunan, realisasi belanja, dan sisa pagu per Sub Kegiatan.',
      parameters: {
        type: 'object',
        properties: {
          sub_kegiatan_nama: {
            type: 'string',
            description: 'Nama atau kode sub kegiatan spesifik (opsional)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_rak_bulanan',
      description: 'Mengecek batas alokasi RAK bulanan akumulatif dan realisasi belanja s.d bulan tertentu.',
      parameters: {
        type: 'object',
        properties: {
          bulan: {
            type: 'string',
            description: 'Nama bulan (Januari - Desember) atau nomor bulan (1 - 12)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_bku_summary',
      description: 'Mendapatkan ringkasan Buku Kas Umum (BKU) & Dashboard: Saldo Kas Bendahara (Penerimaan UP/GU - Pengeluaran GU), Realisasi LS, dan Total Penerimaan/Pengeluaran.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_pengeluaran_detail',
      description: 'Mencari transaksi pengeluaran spesifik berdasarkan kata kunci (contoh: BBM, ATK, Makanan, Perjalanan Dinas, Honorarium, dll).',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: 'Kata kunci item pengeluaran yang dicari'
          }
        },
        required: ['keyword']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'audit_kode_rekening',
      description: 'Menganalisis dan mengaudit seluruh database transaksi pengeluaran untuk mendeteksi potensi kesalahan pengalokasian Kode Rekening (contoh: BBM diisi di rekening ATK, ATK diisi di rekening Pemeliharaan, dll).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_item_level_details',
      description: 'Mendapatkan data transaksi detail per rincian barang/item (nama item, volume, harga satuan, total nominal, kode rekening, nama rekening, sub kegiatan, tanggal, nomor bukti).',
      parameters: {
        type: 'object',
        properties: {
          sub_kegiatan_id: {
            type: 'string',
            description: 'ID atau nama Sub Kegiatan (opsional)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'simulate_belanja',
      description: 'Mensimulasikan apakah alokasi RAK / Pagu DPA mencukupi untuk rencana nominal belanja tertentu.',
      parameters: {
        type: 'object',
        properties: {
          nominal: {
            type: 'number',
            description: 'Nominal rencana belanja dalam Rupiah'
          },
          bulan: {
            type: 'string',
            description: 'Bulan rencana pengeluaran'
          }
        },
        required: ['nominal']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_executive_summary',
      description: 'Menghasilkan draf ringkasan eksekutif realisasi anggaran untuk laporan ke Pimpinan / Kepala Dinas.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigate_app_page',
      description: 'Membuka atau berpindah ke halaman UI tertentu di dalam aplikasi.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            enum: ['/anggaran', '/laporan', '/pengeluaran', '/penerimaan', '/dashboard'],
            description: 'Path halaman UI yang ingin dibuka'
          }
        },
        required: ['path']
      }
    }
  }
]

/**
 * Audit Kesalahan Kode Rekening (Deterministic Rule-Based Financial Audit)
 */
export function auditKodeRekening(pengeluaran = [], subKegiatan = []) {
  const auditList = []

  pengeluaran.forEach(p => {
    if (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') return

    const sk = subKegiatan.find(s => s.id === p.sub_kegiatan_id)
    const rek = sk?.kode_rekening?.find(r => r.id === p.kode_rekening_id)
    const rekUraian = (rek?.uraian || '').toLowerCase()
    const rekKode = rek?.kode || 'Tanpa Rekening'

    const rincianItems = (p.pengeluaran_rincian || []).map(r => `${r.uraian}${r.volume ? ` (${r.volume})` : ''}`).join(', ')
    const uraianStr = rincianItems || p.keterangan || 'Pengeluaran Belanja'
    const desc = uraianStr.toLowerCase()

    let mismatchNote = null

    // Pattern 1: BBM
    if (desc.match(/\b(bbm|bensin|pertamax|solar|dexlite|pertalite|shell|spbu)\b/i) &&
        !rekUraian.includes('bahan bakar') && !rekUraian.includes('bbm') && !rekUraian.includes('pemeliharaan')) {
      mismatchNote = `Transaksi BBM dialokasikan ke "${rek?.uraian || rekKode}". Rekening yang disarankan: Belanja Bahan Bakar Minyak/Gas.`
    }
    // Pattern 2: ATK / Alat Tulis Kantor
    else if (desc.match(/\b(kertas|pulpen|pen|buku|map|tinta|toner|hvs|stopmap|amplop|stapler|atk)\b/i) &&
             !rekUraian.includes('tulis') && !rekUraian.includes('atk') && !rekUraian.includes('cetak')) {
      mismatchNote = `Transaksi ATK dialokasikan ke "${rek?.uraian || rekKode}". Rekening yang disarankan: Belanja Alat Tulis Kantor.`
    }
    // Pattern 3: Makanan & Minuman / Konsumsi
    else if (desc.match(/\b(makan|minum|snack|nasi|katering|prasmanan|konsumsi|kue|coffee)\b/i) &&
             !rekUraian.includes('makan') && !rekUraian.includes('minum') && !rekUraian.includes('jamuan')) {
      mismatchNote = `Transaksi Konsumsi dialokasikan ke "${rek?.uraian || rekKode}". Rekening yang disarankan: Belanja Makanan dan Minuman.`
    }
    // Pattern 4: Perjalanan Dinas
    else if (desc.match(/\b(dinas|sppd|tiket|pesawat|hotel|penginapan|uang harian|taksi|travel)\b/i) &&
             !rekUraian.includes('perjalanan') && !rekUraian.includes('dinas')) {
      mismatchNote = `Transaksi Perjalanan Dinas dialokasikan ke "${rek?.uraian || rekKode}". Rekening yang disarankan: Belanja Perjalanan Dinas.`
    }
    // Pattern 5: Honorarium
    else if (desc.match(/\b(honor|honorarium|narasumber|insentif|upah|moderator)\b/i) &&
             !rekUraian.includes('honor') && !rekUraian.includes('jasa') && !rekUraian.includes('tenaga')) {
      mismatchNote = `Transaksi Honorarium dialokasikan ke "${rek?.uraian || rekKode}". Rekening yang disarankan: Belanja Honorarium / Jasa.`
    }

    if (mismatchNote) {
      auditList.push({
        id: p.id,
        tanggal: p.tanggal || '',
        uraian: uraianStr,
        nominal: formatRupiah(p.jumlah || 0),
        kodeRekeningSaatIni: `${rekKode} - ${rek?.uraian || 'N/A'}`,
        catatanAudit: mismatchNote
      })
    }
  })

  return auditList
}

/**
 * Ekstrak Detail Rincian Item Barang/Jasa Per Transaksi
 */
export function getItemLevelDetails(pengeluaran = [], subKegiatan = []) {
  const itemList = []

  pengeluaran.forEach(p => {
    if (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') return

    const sk = subKegiatan.find(s => s.id === p.sub_kegiatan_id)
    const rek = sk?.kode_rekening?.find(r => r.id === p.kode_rekening_id)

    if (p.pengeluaran_rincian && p.pengeluaran_rincian.length > 0) {
      p.pengeluaran_rincian.forEach(r => {
        itemList.push({
          tanggal: p.tanggal || '',
          uraianItem: r.uraian || p.keterangan || 'Rincian Belanja',
          volume: r.volume || '1',
          hargaSatuan: formatRupiah(r.harga_satuan || r.jumlah || 0),
          totalNominal: formatRupiah(r.jumlah || 0),
          kodeRekening: rek?.kode || '',
          namaRekening: rek?.uraian || '',
          subKegiatan: sk?.nama || '',
          noBukti: p.no_bukti || p.nomor_ls || '-'
        })
      })
    } else {
      itemList.push({
        tanggal: p.tanggal || '',
        uraianItem: p.keterangan || 'Pengeluaran Belanja',
        volume: '1 Paket',
        hargaSatuan: formatRupiah(p.jumlah || 0),
        totalNominal: formatRupiah(p.jumlah || 0),
        kodeRekening: rek?.kode || '',
        namaRekening: rek?.uraian || '',
        subKegiatan: sk?.nama || '',
        noBukti: p.no_bukti || p.nomor_ls || '-'
      })
    }
  })

  return itemList
}

/**
 * Eksekutor Tool Deterministik yang Mengakses Zustand Store
 */
export function executeTool(name, args, storeState) {
  const ctx = buildFinancialContext(storeState)
  const currentMonthIdx = new Date().getMonth()
  const currentMonthName = BULAN_NAMES[currentMonthIdx]

  switch (name) {
    case 'audit_kode_rekening': {
      const auditResults = auditKodeRekening(storeState.pengeluaran || [], storeState.subKegiatan || [])
      return JSON.stringify({
        totalTransaksiDiaudit: storeState.pengeluaran?.length || 0,
        jumlahPotensiKesalahanKodeRekening: auditResults.length,
        potensiKesalahan: auditResults
      })
    }

    case 'get_item_level_details': {
      const itemDetails = getItemLevelDetails(storeState.pengeluaran || [], storeState.subKegiatan || [])
      return JSON.stringify({
        totalItemDetail: itemDetails.length,
        items: itemDetails
      })
    }

    case 'get_sisa_pagu': {
      const searchNama = (args?.sub_kegiatan_nama || '').toLowerCase()
      let filtered = ctx.subKegiatanSummary
      if (searchNama) {
        filtered = ctx.subKegiatanSummary.filter(sk => 
          sk.nama.toLowerCase().includes(searchNama) || sk.kode.toLowerCase().includes(searchNama)
        )
      }

      return JSON.stringify({
        unitKerja: ctx.unitKerja,
        totalPagu: formatRupiah(ctx.totalPagu),
        realisasiTotal: formatRupiah(ctx.realisasiPengeluaran),
        sisaPaguTotal: formatRupiah(ctx.sisaPagu),
        persenRealisasiTotal: `${ctx.persenRealisasi}%`,
        subKegiatan: filtered.map(sk => ({
          kode: sk.kode,
          nama: sk.nama,
          pagu: formatRupiah(sk.pagu),
          realisasi: formatRupiah(sk.realisasi),
          sisa: formatRupiah(sk.sisa),
          persen: `${sk.persen}%`
        }))
      })
    }

    case 'check_rak_bulanan': {
      let monthIdx = currentMonthIdx
      if (args?.bulan) {
        const bInput = String(args.bulan).toLowerCase()
        const foundIdx = BULAN_NAMES.findIndex(b => b.toLowerCase().includes(bInput))
        if (foundIdx !== -1) monthIdx = foundIdx
        else {
          const parsedInt = parseInt(bInput, 10)
          if (!isNaN(parsedInt) && parsedInt >= 1 && parsedInt <= 12) monthIdx = parsedInt - 1
        }
      }
      const targetMonthName = BULAN_NAMES[monthIdx]

      const rakResult = ctx.subKegiatanSummary.map(sk => {
        let targetRakTotal = 0
        let realisasiSdBulan = 0

        ;(storeState.subKegiatan || []).forEach(skItem => {
          if (skItem.id === sk.id) {
            (skItem.kode_rekening || []).forEach(rek => {
              for (let m = 0; m <= monthIdx; m++) {
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
            return pMonth <= monthIdx
          })
          .reduce((s, p) => s + (p.jumlah || 0), 0)

        const sisaRak = targetRakTotal - realisasiSdBulan
        return {
          subKegiatan: `${sk.kode} - ${sk.nama}`,
          batasRakAkumulatif: formatRupiah(targetRakTotal),
          realisasiSdBulan: formatRupiah(realisasiSdBulan),
          sisaRakTersedia: formatRupiah(sisaRak)
        }
      })

      return JSON.stringify({ bulan: targetMonthName, data: rakResult })
    }

    case 'get_bku_summary': {
      return JSON.stringify({
        saldoKasBendaharaDashboard: formatRupiah(ctx.saldoKasBku),
        penerimaanKasUpGu: formatRupiah(ctx.penerimaanUPGU),
        pengeluaranKasGu: formatRupiah(ctx.pengeluaranGU),
        realisasiBelanjaLs: formatRupiah(ctx.pengeluaranLS),
        totalPenerimaan: formatRupiah(ctx.totalPenerimaan),
        totalRealisasiPengeluaran: formatRupiah(ctx.realisasiPengeluaran),
        sisaQuotaPaguDpa: formatRupiah(ctx.sisaPagu)
      })
    }

    case 'search_pengeluaran_detail': {
      const kw = (args?.keyword || '').toLowerCase().trim()
      if (!kw) return JSON.stringify({ error: 'Keyword pencarian kosong' })

      const matches = ctx.transactionsList.filter(t => {
        const fullContent = `${t.uraian} ${t.keterangan} ${t.sub_kegiatan} ${t.rekening}`.toLowerCase()
        return fullContent.includes(kw)
      })

      const totalNominal = matches.reduce((s, t) => s + t.jumlah, 0)
      return JSON.stringify({
        keyword: kw,
        jumlahTransaksi: matches.length,
        totalNominal: formatRupiah(totalNominal),
        transaksi: matches.map(t => ({
          tanggal: t.tanggal,
          uraian: t.uraian,
          nominal: formatRupiah(t.jumlah),
          noBukti: t.no_bukti,
          rekening: t.rekening
        }))
      })
    }

    case 'simulate_belanja': {
      const nominal = Number(args?.nominal) || 0
      const bulanName = args?.bulan || currentMonthName

      const simulation = ctx.subKegiatanSummary.map(sk => {
        const sisaPagu = sk.sisa
        const isCukup = sisaPagu >= nominal
        return {
          subKegiatan: sk.nama,
          sisaPagu: formatRupiah(sisaPagu),
          status: isCukup ? 'MEMENUHI (Cukup)' : 'OVERBUDGET (Tidak Cukup)'
        }
      })

      return JSON.stringify({
        nominalBelanjaDisimulasikan: formatRupiah(nominal),
        bulan: bulanName,
        hasilSimulasi: simulation
      })
    }

    case 'generate_executive_summary': {
      return JSON.stringify({
        unitKerja: `${ctx.unitKerja} (${ctx.unitKerjaKode})`,
        tahunAnggaran: 2026,
        totalPagu: formatRupiah(ctx.totalPagu),
        realisasiTotal: formatRupiah(ctx.realisasiPengeluaran),
        persenPenyerapan: `${ctx.persenRealisasi}%`,
        sisaPagu: formatRupiah(ctx.sisaPagu),
        saldoKasBendaharaDashboard: formatRupiah(ctx.saldoKasBku),
        rekomendasi: 'Penyerapan anggaran berjalan stabil dan akurat.'
      })
    }

    case 'navigate_app_page': {
      const labelMap = {
        '/anggaran': 'Buka Halaman Anggaran',
        '/laporan': 'Buka Halaman Laporan BKU',
        '/pengeluaran': 'Buka Halaman Pengeluaran',
        '/penerimaan': 'Buka Halaman Penerimaan',
        '/dashboard': 'Buka Dashboard'
      }
      return JSON.stringify({
        action: {
          type: 'NAVIGATE',
          path: args.path,
          label: labelMap[args.path] || 'Buka Halaman'
        }
      })
    }

    default:
      return JSON.stringify({ error: `Tool ${name} tidak ditemukan` })
  }
}

/**
 * LangChain Agent Loop Runner
 */
export async function runLangChainAgent(userQuery, chatHistory = [], storeState) {
  const settings = storeState?.settings || {}
  const apiKey = settings.deepseek_api_key?.trim()
  const apiModel = settings.deepseek_model?.trim() || 'deepseek-chat'

  if (!apiKey) {
    throw new Error('DeepSeek API Key belum dikonfigurasi di Pengaturan.')
  }

  const ctx = buildFinancialContext(storeState)
  const customRules = (settings.custom_ai_instructions || '').trim()
  const customRulesPrompt = customRules ? `\n\nATURAN KHUSUS PERSISTEN DARI BENDAHARA:\n${customRules}` : ''

  const auditSummaryReal = auditKodeRekening(storeState.pengeluaran || [], storeState.subKegiatan || [])
  const auditRealText = auditSummaryReal.length > 0
    ? `Ditemukan ${auditSummaryReal.length} potensi kesalahan kode rekening riil di sistem: ${JSON.stringify(auditSummaryReal.slice(0, 5))}`
    : 'Seluruh pengalokasian kode rekening transaksi saat ini 100% tepat dan sesuai spesifikasi DPA.'

  const systemMessage = {
    role: 'system',
    content: `Anda adalah Asisten AI Bendahara (Financial AI Co-Pilot, Audit Specialist, & LangChain/LangGraph Smart Agent) untuk unit kerja ${ctx.unitKerja} (${ctx.unitKerjaKode}).
Tugas Anda adalah membantu Bendahara dan Pimpinan menganalisis data keuangan, mengaudit kesalahan kode rekening, dan mengekstrak rincian item transaksi secara akurat 100% dalam Bahasa Indonesia.${customRulesPrompt}

BLUEPRINT SISTEM APLIKASI BENDAHARAAPP & DATABASE SCHEMA (MASTER KNOWLEDGE):
1. Struktur Modul Aplikasi:
   - Modul Dashboard: Card Saldo Kas Bendahara (UP/GU - GU), Realisasi Belanja (GU/LS), Quota Pagu DPA, & Grafik Penyerapan RAK.
   - Modul Anggaran / DPA: Kelola Program, Kegiatan, Sub-Kegiatan, Kode Rekening, Rencana Anggaran Kas 12 Bulan (RAK), Parser PDF DPA.
   - Modul Penerimaan Kas: Catat pencairan UP (Uang Persediaan), GU (Ganti Uang), TU (Tambahan Uang), & LS Kasda.
   - Modul Pengeluaran Kas & SPJ: Catat belanja GU/LS/UP/TU/KKPD, rincian barang/jasa, potongan pajak (PPN/PPh 21/22/23), & upload bukti bayar ke Google Drive.
   - Modul Laporan BKU: Cetak Laporan BKU, SPJ, Rekap RAK, Berita Acara Pemeriksaan Kas Tunai/Bank.
   - Modul Pengaturan: Identitas Pemda/SKPD, Pejabat KPA/BPP/PPTK, Integrasi Google Drive OAuth, DeepSeek API Key, & Custom AI Rules.
2. Skema Relasi Database (Supabase & SQLite):
   - sub_kegiatan -> Memiliki banyak kode_rekening (One-to-Many).
   - kode_rekening -> Menyimpan pagu_anggaran & alokasi RAK 12 Bulan (rak_jan..rak_des).
   - pengeluaran -> Memiliki banyak pengeluaran_rincian (item barang/volume/harga_satuan) & pengeluaran_pajak (jenis_pajak/nominal_pajak/id_billing).
   - penerimaan -> Catat kas masuk UP/GU/LS ke BKU.
   - settings -> Menyimpan identitas dinas, KPA, BPP, PPTK, & instruksi AI.

PERINGATAN STRICT ACCESS DATA REAL-TIME (JANGAN DIABAIKAN):
1. Anda TERHUBUNG 100% SECARA REAL-TIME ke database aplikasi BendaharaApp milik pengguna.
2. DILARANG KERAS MENGATAKAN: "Saya tidak memiliki akses langsung ke database", "Data ini adalah contoh fiktif/asumsi", "Saya tidak dapat melihat data Anda", atau perkataan sejenisnya!
3. Seluruh angka nominal, transaksi, BKU, DPA, RAK, dan daftar temuan audit di bawah ini adalah DATA RIIL 100% DARI DATABASE APLIKASI BENDAHARAAPP.
4. Jika pengguna bertanya dari mana Anda melihat/mendapatkan data, tegaskan dengan percaya diri: "Saya membaca dan mengolah data transaksi riil secara real-time langsung dari database aplikasi BendaharaApp Anda."

FAKTA DATA KEUANGAN SAAT INI (SINKRON 100% DENGAN DASHBOARD & BKU):
- Unit Kerja: ${ctx.unitKerja} (${ctx.unitKerjaKode})
- Saldo Kas Bendahara (Dashboard): ${formatRupiah(ctx.saldoKasBku)} (Penerimaan UP/GU ${formatRupiah(ctx.penerimaanUPGU)} - Pengeluaran GU ${formatRupiah(ctx.pengeluaranGU)})
- Total Pagu DPA Tahunan: ${formatRupiah(ctx.totalPagu)}
- Realisasi Belanja Total: ${formatRupiah(ctx.realisasiPengeluaran)} (${ctx.persenRealisasi}%)
- Sisa Quota Pagu DPA Tahunan: ${formatRupiah(ctx.sisaPagu)}
- Hasil Audit Kode Rekening Riil System: ${auditRealText}

PETUNJUK EXECUTION LANGCHAIN AGENT:
1. Anda dilengkapi dengan TOOLS terstruktur: (audit_kode_rekening, get_item_level_details, get_sisa_pagu, check_rak_bulanan, get_bku_summary, search_pengeluaran_detail, simulate_belanja, generate_executive_summary, navigate_app_page).
2. Jika pengguna meminta untuk "audit kesalahan kode rekening", "analisis kesalahan rekening", atau "cek pengalokasian rekening", PANGGIL TOOL 'audit_kode_rekening'.
3. Jika pengguna meminta "detail transaksi per item", "rincian barang", atau "tampilkan item transaksi", PANGGIL TOOL 'get_item_level_details'.
4. Selalu gunakan format Tabel Markdown (| Header 1 | Header 2 |) ketika menyajikan data audit, rincian transaksi per item, sisa pagu, atau BKU.
5. JIKA pengguna meminta untuk membuka/melihat laporan, BKU, DPA, atau pengeluaran, panggil tool 'navigate_app_page'.
6. Selalu ingat konteks percakapan sebelumnya untuk menjawab pertanyaan sambungan secara intuitif.`
  }

  // Format riwayat chat LangChain (Multi-Turn Conversation Memory)
  const formattedHistory = chatHistory.slice(-8).map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text || ''
  }))

  const messagesPayload = [
    systemMessage,
    ...formattedHistory,
    { role: 'user', content: userQuery }
  ]

  // Step 1: Panggil DeepSeek API dengan Tools Schema
  const response1 = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: apiModel,
      messages: messagesPayload,
      tools: LANGCHAIN_TOOLS,
      tool_choice: 'auto',
      temperature: 0.3
    })
  })

  if (!response1.ok) {
    const errData = await response1.json().catch(() => ({}))
    throw new Error(errData.error?.message || `HTTP ${response1.status}: ${response1.statusText}`)
  }

  const data1 = await response1.json()
  const choiceMessage1 = data1.choices?.[0]?.message

  if (!choiceMessage1) {
    throw new Error('Tidak ada respons dari server AI.')
  }

  // Jika LLM memilih untuk memanggil Tool (Agent Tool Call)
  if (choiceMessage1.tool_calls && choiceMessage1.tool_calls.length > 0) {
    let capturedAction = null
    const toolMessages = []

    for (const toolCall of choiceMessage1.tool_calls) {
      const toolName = toolCall.function.name
      let toolArgs = {}
      try {
        toolArgs = JSON.parse(toolCall.function.arguments || '{}')
      } catch (e) { console.error('Failed to parse tool args', e) }

      // Eksekusi Tool
      const toolResultRaw = executeTool(toolName, toolArgs, storeState)

      // Cek apakah tool menghasilkan aksi navigasi
      try {
        const parsed = JSON.parse(toolResultRaw)
        if (parsed.action) capturedAction = parsed.action
      } catch (e) { console.error('Failed to parse tool response', e) }

      toolMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: toolResultRaw
      })
    }

    // Step 2: Kirimkan hasil Tool back to LLM untuk menghasilkan jawaban percakapan akhir
    const messagesPayload2 = [
      ...messagesPayload,
      choiceMessage1,
      ...toolMessages
    ]

    const response2 = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: apiModel,
        messages: messagesPayload2,
        temperature: 0.3
      })
    })

    if (!response2.ok) {
      const errData = await response2.json().catch(() => ({}))
      throw new Error(errData.error?.message || `HTTP ${response2.status}`)
    }

    const data2 = await response2.json()
    const finalContent = data2.choices?.[0]?.message?.content || 'Maaf, tidak ada respons akhir dari Agent.'

    return { text: finalContent, action: capturedAction }
  }

  // Jika LLM menjawab langsung tanpa tool call
  return { text: choiceMessage1.content || '', action: null }
}
