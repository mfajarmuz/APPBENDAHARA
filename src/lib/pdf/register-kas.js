import jsPDF from 'jspdf'
import { formatRupiah } from '../format'
import { useStore } from '@/store/useStore'
import { getMonthName } from './utils'

/**
 * [FITUR: EXPORT PDF - REGISTER PENUTUPAN KAS]
 */
export function exportRegisterKasPdf(data, cashUnits, monthIndex, year, customDate = null) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const settings = useStore.getState().settings
  const monthName = getMonthName(monthIndex)
  const lastDay = customDate ? new Date(customDate).getDate() : new Date(year, monthIndex + 1, 0).getDate()
  const fullDate = `${lastDay} ${monthName.charAt(0) + monthName.slice(1).toLowerCase()} ${year}`
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('BADAN PENDAPATAN DAERAH PROVINSI JAWA BARAT', 105, 15, { align: 'center' })
  doc.text('REGISTER PENUTUPAN KAS', 105, 20, { align: 'center' })
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  
  let curY = 32
  const col1 = 20
  const col2 = 75
  const col3 = 150
  
  doc.text('Tanggal Penutupan Kas', col1, curY); doc.text(`:  ${fullDate}`, col2, curY); curY += 4
  doc.text('Nama Penutup Kas', col1, curY); doc.text(`:  ${settings.bpp_nama || ''}`, col2, curY); curY += 4
  doc.text('Tanggal Penutupan Kas yang lalu', col1, curY); doc.text(':  -', col2, curY); curY += 4
  doc.text('Jumlah Transaksi s/d bulan', col1, curY); doc.text(`:  ${fullDate}`, col2, curY); curY += 4
  
  const startD = data.startDateText || `01 Januari ${year}`
  const labelPen = `Jumlah Penerimaan mulai dari ${startD} s.d ${fullDate}`
  const labelPeng = `Jumlah Pengeluaran mulai dari ${startD} s.d ${fullDate}`
  
  doc.text(labelPen, col1, curY); doc.text('Rp.', col3, curY); doc.text(formatRupiah(data.totalDebetSemua).replace('Rp', '').trim(), 190, curY, { align: 'right' }); curY += 4
  doc.text(labelPeng, col1, curY); doc.text('Rp.', col3, curY); doc.text(formatRupiah(data.totalKreditSemua).replace('Rp', '').trim(), 190, curY, { align: 'right' }); curY += 4
  
  doc.line(col3, curY - 3, 190, curY - 3)
  
  doc.text('Saldo Buku ..............', col3 - 35, curY); doc.text('Rp.', col3, curY); doc.text(formatRupiah(data.saldo).replace('Rp', '').trim(), 190, curY, { align: 'right' }); curY += 4
  doc.text('Saldo Kas ................', col3 - 35, curY); doc.text('Rp.', col3, curY); doc.text(formatRupiah(data.saldo).replace('Rp', '').trim(), 190, curY, { align: 'right' }); curY += 7
  
  doc.setFont('helvetica', 'bolditalic'); doc.text('Terdiri atas :', col1, curY); curY += 5; doc.setFont('helvetica', 'normal')
  
  const drawList = (num, items, labelTotal) => {
    doc.text(`${num}`, col1, curY)
    let totalVal = 0
    items.forEach(it => {
      const val = it.qty * it.denom
      totalVal += val
      doc.text(it.label, col1 + 4, curY)
      doc.text('=', col1 + 65, curY)
      doc.text(it.qty > 0 ? String(it.qty) : '-', col1 + 71, curY, { align: 'right' })
      doc.text(it.unit, col1 + 73, curY)
      doc.text('Rp.', col3, curY)
      doc.text(val > 0 ? formatRupiah(val).replace('Rp', '').trim() : '-', 190, curY, { align: 'right' })
      curY += 4
    })
    doc.setFont('helvetica', 'bold')
    doc.text(labelTotal, col1 + 65, curY)
    doc.text('Rp.', col3, curY)
    doc.text(totalVal > 0 ? formatRupiah(totalVal).replace('Rp', '').trim() : '-', 190, curY, { align: 'right' })
    doc.line(col3, curY - 3, 190, curY - 3)
    curY += 5
    doc.setFont('helvetica', 'normal')
    return totalVal
  }

  const paperDenoms = [
    { d: 100000, k: 'kertas_100k' }, { d: 50000, k: 'kertas_50k' }, { d: 20000, k: 'kertas_20k' }, 
    { d: 10000, k: 'kertas_10k' }, { d: 5000, k: 'kertas_5k' }, { d: 2000, k: 'kertas_2k' }, 
    { d: 1000, k: 'kertas_1k' }, { d: 500, k: 'kertas_500' }
  ]
  const paperItems = paperDenoms.map(x => ({
    label: `Lembar Uang Kertas    Rp.       ${x.d.toLocaleString('id-ID')}`,
    denom: x.d,
    qty: cashUnits[x.k] || 0,
    unit: 'Lembar'
  }))
  
  const total1 = drawList(1, paperItems, 'JUMLAH (1)............................')

  const coinDenoms = [
    { d: 1000, k: 'logam_1000' }, { d: 500, k: 'logam_500' }, { d: 200, k: 'logam_200' }, 
    { d: 100, k: 'logam_100' }, { d: 50, k: 'logam_50' }, { d: 25, k: 'logam_25' }
  ]
  const coinItems = coinDenoms.map(x => ({
    label: `Kepingan Uang Logam Rp.        ${x.d.toLocaleString('id-ID')}`,
    denom: x.d,
    qty: cashUnits[x.k] || 0,
    unit: 'Keping'
  }))
  
  const total2 = drawList(2, coinItems, 'JUMLAH (2)............................')
  
  doc.setFont('helvetica', 'bold')
  doc.text('JUMLAH (1 + 2)........................', col1 + 65, curY)
  doc.text('Rp.', col3, curY)
  const sumCash = total1 + total2
  doc.text(sumCash > 0 ? formatRupiah(sumCash).replace('Rp', '').trim() : '-', 190, curY, { align: 'right' })
  curY += 6
  doc.setFont('helvetica', 'normal')

  doc.text('3', col1, curY)
  const wrapped3 = doc.splitTextToSize('Kertas Berharga dan Bagian Hak yang diizinkan Ordonansi / SP2D, Wesel, Cek, Saldo Bank, Materai, dan sebagainya ............................................................', 128)
  doc.text(wrapped3, col1 + 4, curY)
  const item3Value = data.saldo - sumCash
  doc.text('Rp.', col3, curY + ((wrapped3.length - 1) * 4))
  doc.text(formatRupiah(item3Value).replace('Rp', '').trim(), 190, curY + ((wrapped3.length - 1) * 4), { align: 'right' })
  doc.line(col3, curY + ((wrapped3.length - 1) * 4) + 1, 190, curY + ((wrapped3.length - 1) * 4) + 1)
  curY += (wrapped3.length * 4) + 2

  doc.setFont('helvetica', 'bold')
  doc.text('JUMLAH SELURUHNYA', col1 + 65, curY)
  doc.text('Rp.', col3, curY)
  doc.text(formatRupiah(data.saldo).replace('Rp', '').trim(), 190, curY, { align: 'right' })
  doc.line(col3, curY + 1, 190, curY + 1)
  curY += 4
  
  doc.text('Perbedaan Positif', col1 + 65, curY)
  doc.text('Rp.', col3, curY)
  doc.text('-', 190, curY, { align: 'right' })
  doc.line(col3, curY + 1, 190, curY + 1)
  curY += 8
  
  doc.setFont('helvetica', 'normal')
  doc.text('4', col1, curY)
  doc.text('Penjelasan Perbedaan Positif              :', col1 + 4, curY)
  doc.text('-', col1 + 68, curY)
  curY += 15
  
  if (curY > 240) { doc.addPage(); curY = 20 }
  doc.text(`${settings.lokasi || ''}, ${fullDate}`, 145, curY); curY += 10
  doc.text('Mengetahui :', col1, curY)
  doc.text('BENDAHARA PENGELUARAN PEMBANTU,', 145, curY); curY += 4
  doc.text(settings.kpa_jabatan || 'Kuasa Pengguna Anggaran,', col1, curY); curY += 25
  
  doc.setFont('helvetica', 'bold')
  doc.text(settings.kpa_nama || '', col1, curY)
  doc.text(settings.bpp_nama || '', 145, curY)
  curY += 4
  
  doc.setFont('helvetica', 'normal')
  doc.text(`NIP. ${settings.kpa_nip || ''}`, col1, curY)
  doc.text(`NIP. ${settings.bpp_nip || ''}`, 145, curY)

  doc.save(`Register_Penutupan_Kas_${monthName}_${year}.pdf`)
}
