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
 * Eksekutor Tool Deterministik yang Mengakses Zustand Store
 */
export function executeTool(name, args, storeState) {
  const ctx = buildFinancialContext(storeState)
  const currentMonthIdx = new Date().getMonth()
  const currentMonthName = BULAN_NAMES[currentMonthIdx]

  switch (name) {
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

  const systemMessage = {
    role: 'system',
    content: `Anda adalah Asisten AI Bendahara (Financial AI Co-Pilot & LangChain Smart Agent) untuk unit kerja ${ctx.unitKerja} (${ctx.unitKerjaKode}).
Tugas Anda adalah membantu Bendahara dan Pimpinan menganalisis data keuangan secara ramah, sopan, komunikatif, dan akurat 100% dalam Bahasa Indonesia.

FAKTA DATA KEUANGAN SAAT INI (SINKRON 100% DENGAN DASHBOARD & BKU):
- Unit Kerja: ${ctx.unitKerja} (${ctx.unitKerjaKode})
- Saldo Kas Bendahara (Sama Persis dengan Kartu Dashboard): ${formatRupiah(ctx.saldoKasBku)} (Formula: Penerimaan UP/GU ${formatRupiah(ctx.penerimaanUPGU)} - Pengeluaran GU ${formatRupiah(ctx.pengeluaranGU)})
- Total Pagu DPA Tahunan: ${formatRupiah(ctx.totalPagu)}
- Realisasi Belanja Total: ${formatRupiah(ctx.realisasiPengeluaran)} (${ctx.persenRealisasi}%)
  • Realisasi Belanja GU/UP: ${formatRupiah(ctx.pengeluaranGU)}
  • Realisasi Belanja LS (Direct KASDA): ${formatRupiah(ctx.pengeluaranLS)}
- Sisa Quota Pagu DPA Tahunan: ${formatRupiah(ctx.sisaPagu)}

PETUNJUK EXECUTION LANGCHAIN AGENT:
1. Anda dilengkapi dengan TOOLS terstruktur (get_sisa_pagu, check_rak_bulanan, get_bku_summary, search_pengeluaran_detail, simulate_belanja, generate_executive_summary, navigate_app_page).
2. Jika pengguna menanyakan sisa pagu, alokasi RAK, saldo BKU/Dashboard, pencarian transaksi spesifik (seperti BBM, ATK, dll), atau simulasi belanja, PANGGIL TOOL YANG RELEVAN terlebih dahulu untuk mendapatkan data fakta terbaru.
3. Selalu gunakan angka Saldo Kas Bendahara yang SAMA PERSIS dengan Dashboard (${formatRupiah(ctx.saldoKasBku)}). Jika pengguna menanyakan selisih dengan transaksi LS, jelaskan dengan ramah bahwa transaksi LS dibayarkan langsung oleh Kasda sehingga tidak mengurangi saldo kas tunai/bank Bendahara.
4. JIKA pengguna meminta untuk membuka/melihat laporan, BKU, DPA, atau pengeluaran, panggil tool 'navigate_app_page'.
5. Selalu ingat konteks percakapan sebelumnya untuk menjawab pertanyaan sambungan secara intuitif.`
  }

  // Format riwayat chat LangChain (Multi-Turn Conversation Memory)
  const formattedHistory = chatHistory.slice(-6).map(msg => ({
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

    // Step 2: Kirimkan hasil Tool back ke LLM untuk menghasilkan jawaban percakapan akhir
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
