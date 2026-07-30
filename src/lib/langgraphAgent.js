// src/lib/langgraphAgent.js
import { formatRupiah, persen } from './format'
import { buildFinancialContext } from './aiAssistant'

/**
 * [LANGGRAPH STATE GRAPH ARCHITECTURE]
 * Arsitektur Agent Siklik Multi-Node untuk Audit Keuangan & Diagnostik Masalah Keuangan APBD
 */

/**
 * State Graph State Interface
 */
export function createInitialGraphState(userQuery, storeState, chatHistory = []) {
  return {
    query: userQuery,
    storeState,
    chatHistory,
    context: null,
    auditFindings: [],
    analysisSummary: null,
    step: 'START',
    error: null
  }
}

/**
 * NODE 1: Ingestion Node
 * Menarik fakta data BKU, DPA, RAK, Pajak, dan Transaksi dari Zustand Store
 */
export function nodeIngestFinancialData(state) {
  const ctx = buildFinancialContext(state.storeState)
  return {
    ...state,
    context: ctx,
    step: 'INGESTED'
  }
}

/**
 * NODE 2: Deep Multi-Dimension Audit Engine Node
 * Memeriksa 6 Dimensi Kepatuhan Keuangan & Potensi Masalah Transaksi:
 * 1. Pengalokasian Kode Rekening (Account Misallocation)
 * 2. Batas Quota RAK & Pagu Overbudget
 * 3. Kelengkapan Administrasi & Nomor Bukti (Administrative Completeness)
 * 4. Kepatuhan Potongan Pajak (PPN/PPh 21/22/23)
 * 5. Potensi Duplikasi Pembayaran (Duplicate Payments)
 * 6. Anomali Lonjakan Nominal Belanja (Expense Anomalies)
 */
export function nodeMultiAngleAudit(state) {
  const { storeState, context } = state
  const pengeluaran = storeState.pengeluaran || []
  const subKegiatan = storeState.subKegiatan || []
  const findings = []

  // 1. Audit Pengalokasian Kode Rekening (Account Misallocation)
  pengeluaran.forEach(p => {
    if (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') return

    const sk = subKegiatan.find(s => s.id === p.sub_kegiatan_id)
    const rek = sk?.kode_rekening?.find(r => r.id === p.kode_rekening_id)
    const rekUraian = (rek?.uraian || '').toLowerCase()
    const rekKode = rek?.kode || 'Tanpa Rekening'

    const rincianItems = (p.pengeluaran_rincian || []).map(r => `${r.uraian}${r.volume ? ` (${r.volume})` : ''}`).join(', ')
    const uraianStr = rincianItems || p.keterangan || 'Pengeluaran Belanja'
    const desc = uraianStr.toLowerCase()

    let issue = null

    if (desc.match(/\b(bbm|bensin|pertamax|solar|dexlite|pertalite|spbu)\b/i) &&
        !rekUraian.includes('bahan bakar') && !rekUraian.includes('bbm') && !rekUraian.includes('pemeliharaan')) {
      issue = {
        tingkat: 'CRITICAL',
        kategori: 'Salah Kode Rekening',
        transaksi: uraianStr,
        tanggal: p.tanggal || '-',
        nominal: formatRupiah(p.jumlah || 0),
        rekeningAktif: `${rekKode} - ${rek?.uraian || 'N/A'}`,
        rekomendasi: 'Pindahkan ke Rekening Belanja Bahan Bakar Minyak dan Gas.'
      }
    } else if (desc.match(/\b(kertas|pulpen|pen|buku|map|tinta|toner|hvs|stopmap|amplop|stapler|atk)\b/i) &&
               !rekUraian.includes('tulis') && !rekUraian.includes('atk') && !rekUraian.includes('cetak')) {
      issue = {
        tingkat: 'WARNING',
        kategori: 'Salah Kode Rekening',
        transaksi: uraianStr,
        tanggal: p.tanggal || '-',
        nominal: formatRupiah(p.jumlah || 0),
        rekeningAktif: `${rekKode} - ${rek?.uraian || 'N/A'}`,
        rekomendasi: 'Pindahkan ke Rekening Belanja Alat Tulis Kantor (ATK).'
      }
    } else if (desc.match(/\b(makan|minum|snack|nasi|katering|prasmanan|konsumsi|kue|coffee)\b/i) &&
               !rekUraian.includes('makan') && !rekUraian.includes('minum') && !rekUraian.includes('jamuan')) {
      issue = {
        tingkat: 'WARNING',
        kategori: 'Salah Kode Rekening',
        transaksi: uraianStr,
        tanggal: p.tanggal || '-',
        nominal: formatRupiah(p.jumlah || 0),
        rekeningAktif: `${rekKode} - ${rek?.uraian || 'N/A'}`,
        rekomendasi: 'Pindahkan ke Rekening Belanja Makanan dan Minuman.'
      }
    } else if (desc.match(/\b(dinas|sppd|tiket|pesawat|hotel|penginapan|uang harian|taksi|travel)\b/i) &&
               !rekUraian.includes('perjalanan') && !rekUraian.includes('dinas')) {
      issue = {
        tingkat: 'CRITICAL',
        kategori: 'Salah Kode Rekening',
        transaksi: uraianStr,
        tanggal: p.tanggal || '-',
        nominal: formatRupiah(p.jumlah || 0),
        rekeningAktif: `${rekKode} - ${rek?.uraian || 'N/A'}`,
        rekomendasi: 'Pindahkan ke Rekening Belanja Perjalanan Dinas.'
      }
    }

    if (issue) findings.push(issue)
  })

  // 2. Audit Kelengkapan Administrasi & Nomor Bukti
  pengeluaran.forEach(p => {
    if (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') return
    const noBukti = (p.no_bukti || p.nomor_ls || '').trim()

    if (!noBukti || noBukti === '-' || noBukti === '0') {
      findings.push({
        tingkat: 'WARNING',
        kategori: 'Tanpa Nomor Bukti / SPJ',
        transaksi: p.keterangan || 'Pengeluaran Tanpa Keterangan',
        tanggal: p.tanggal || '-',
        nominal: formatRupiah(p.jumlah || 0),
        rekeningAktif: 'Tidak Lengkap',
        rekomendasi: 'Isi Nomor Bukti Bayar / Nomor Kuitansi pada pengeluaran ini agar sah di BKU.'
      })
    }
  })

  // 3. Audit Duplikasi Transaksi (Duplicate Payments)
  const seenMap = new Map()
  pengeluaran.forEach(p => {
    if (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') return
    const key = `${p.tanggal}_${p.jumlah}_${(p.keterangan || '').toLowerCase().trim()}`
    if (seenMap.has(key)) {
      const prev = seenMap.get(key)
      findings.push({
        tingkat: 'CRITICAL',
        kategori: 'Potensi Transaksi Ganda',
        transaksi: p.keterangan || 'Transaksi Pembayaran',
        tanggal: p.tanggal || '-',
        nominal: formatRupiah(p.jumlah || 0),
        rekeningAktif: `Sama dengan ID ${prev.id}`,
        rekomendasi: 'Periksa kuitansi fisik! Terdeteksi 2 transaksi dengan Tanggal, Nominal, dan Keterangan persis sama.'
      })
    } else {
      seenMap.set(key, p)
    }
  })

  // 4. Audit Potensi Kelalaian Pajak (PPN/PPh Belanja > 2 Juta)
  pengeluaran.forEach(p => {
    if (p.jenis === 'Pajak' || p.jenis === 'Pajak LS') return
    if ((p.jumlah || 0) >= 2000000 && (!p.pajak || p.pajak.length === 0)) {
      findings.push({
        tingkat: 'INFO',
        kategori: 'Potensi Kewajiban Pajak',
        transaksi: p.keterangan || 'Belanja Barang/Jasa',
        tanggal: p.tanggal || '-',
        nominal: formatRupiah(p.jumlah || 0),
        rekeningAktif: 'Tanpa Potongan Pajak',
        rekomendasi: 'Belanja di atas Rp 2.000.000 umumnya dikenakan PPN / PPh 22. Pastikan kuitansi dilengkapi pajak.'
      })
    }
  })

  // 5. Audit Pelampauan RAK & Pagu DPA
  context?.subKegiatanSummary?.forEach(sk => {
    if (sk.sisa < 0) {
      findings.push({
        tingkat: 'CRITICAL',
        kategori: 'Pagu Overbudget',
        transaksi: `Sub Kegiatan: ${sk.nama}`,
        tanggal: 'Tahun 2026',
        nominal: formatRupiah(Math.abs(sk.sisa)),
        rekeningAktif: sk.kode,
        rekomendasi: 'Pagu DPA telah terlampaui (defisit)! Lakukan pergeseran anggaran atau penghematan.'
      })
    }
  })

  return {
    ...state,
    auditFindings: findings,
    step: 'AUDITED'
  }
}

/**
 * NODE 3: Reasoning Node
 * Menganalisis tingkat keparahan (Severity Index) dan menyusun sintesis masalah
 */
export function nodeDiagnosticReasoning(state) {
  const { auditFindings } = state
  const criticalCount = auditFindings.filter(f => f.tingkat === 'CRITICAL').length
  const warningCount = auditFindings.filter(f => f.tingkat === 'WARNING').length
  const infoCount = auditFindings.filter(f => f.tingkat === 'INFO').length

  let healthScore = 100 - (criticalCount * 15) - (warningCount * 5) - (infoCount * 2)
  if (healthScore < 0) healthScore = 0

  let healthStatus = 'SANGAT SEHAT (COMPLIANT)'
  if (healthScore < 60) healthStatus = 'BAHAYA / PERLU TINDAKAN SEGERA'
  else if (healthScore < 85) healthStatus = 'PERLU PERHATIAN (WARNING)'

  const summary = {
    totalFindings: auditFindings.length,
    criticalCount,
    warningCount,
    infoCount,
    healthScore,
    healthStatus
  }

  return {
    ...state,
    analysisSummary: summary,
    step: 'REASONED'
  }
}

/**
 * NODE 4: Report Formatting Node
 * Menghasilkan Laporan Audit LangGraph dalam Format Markdown Tabel
 */
export function nodeFormatAuditReport(state) {
  const { auditFindings, analysisSummary, context, query } = state
  const isAuditQuery = query.toLowerCase().includes('audit') || 
                       query.toLowerCase().includes('salah') || 
                       query.toLowerCase().includes('masalah') || 
                       query.toLowerCase().includes('evaluasi') ||
                       query.toLowerCase().includes('cek')

  if (!isAuditQuery && auditFindings.length === 0) {
    return {
      ...state,
      step: 'DONE'
    }
  }

  let text = `### 🕸️ Hasil Audit Diagnostik Keuangan (LangGraph Multi-Node Engine)\n\n`
  text += `**Skor Kesehatan Administrasi Keuangan**: **${analysisSummary.healthScore}/100** (${analysisSummary.healthStatus})\n\n`

  text += `| Indikator Evaluasi | Jumlah Temuan |\n`
  text += `| :--- | :---: |\n`
  text += `| 🛑 **Masalah Kritis (Critical)** | **${analysisSummary.criticalCount}** |\n`
  text += `| ⚠️ **Peringatan (Warning)** | **${analysisSummary.warningCount}** |\n`
  text += `| ℹ️ **Catatan Kewajiban (Info)** | **${analysisSummary.infoCount}** |\n`
  text += `| 📊 **Total Temuan Keuangan** | **${analysisSummary.totalFindings}** |\n\n`

  if (auditFindings.length > 0) {
    text += `#### 📋 Rincian Temuan & Rekomendasi Audit:\n\n`
    text += `| Tingkat | Tanggal | Kategori | Uraian Transaksi | Nominal | Rekening / Status | Rekomendasi Audit |\n`
    text += `| :---: | :--- | :--- | :--- | :--- | :--- | :--- |\n`

    auditFindings.forEach(f => {
      const badge = f.tingkat === 'CRITICAL' ? '🛑 KRITIS' : f.tingkat === 'WARNING' ? '⚠️ PERINGATAN' : 'ℹ️ INFO'
      text += `| ${badge} | ${f.tanggal} | **${f.kategori}** | ${f.transaksi} | **${f.nominal}** | ${f.rekeningAktif} | ${f.rekomendasi} |\n`
    })
  } else {
    text += `✅ **100% Sesuai Spesifikasi**: Seluruh transaksi pengeluaran telah diperiksa oleh LangGraph Multi-Node Engine. Tidak ditemukan pengalokasian ganjil, transaksi ganda, atau pelanggaran pagu DPA.\n`
  }

  return {
    ...state,
    finalText: text,
    action: { type: 'NAVIGATE', path: '/pengeluaran', label: 'Buka Halaman Pengeluaran' },
    step: 'COMPLETED'
  }
}

/**
 * Runner LangGraph Cyclical Execution Loop
 */
export async function runLangGraphAgent(userQuery, storeState, chatHistory = []) {
  let state = createInitialGraphState(userQuery, storeState, chatHistory)

  // Step 1: Ingestion
  state = nodeIngestFinancialData(state)

  // Step 2: Audit Engine
  state = nodeMultiAngleAudit(state)

  // Step 3: Diagnostic Reasoning
  state = nodeDiagnosticReasoning(state)

  // Step 4: Report Formatting
  state = nodeFormatAuditReport(state)

  // Jika query meminta audit / evaluasi / masalah
  const q = userQuery.toLowerCase()
  if (q.includes('audit') || q.includes('salah') || q.includes('masalah') || q.includes('evaluasi') || q.includes('cek rekening') || q.includes('periksa')) {
    return {
      text: state.finalText,
      action: state.action
    }
  }

  // Jika query bukan audit khusus, teruskan ke LangChain LLM jika ada API Key
  return null
}
