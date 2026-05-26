const fs = require('fs');
const { PDFParse } = require('pdf-parse');

/**
 * pdfParser.js - Modul pemrosesan berkas PDF RAK Belanja
 * Mengekstrak teks dari berkas PDF dan mem-parsing informasi program, kegiatan,
 * sub-kegiatan, serta alokasi anggaran kas bulanan (12 bulan) per kode rekening.
 */

async function parseRakPdf(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File tidak ditemukan di path: ${filePath}`);
  }

  const dataBuffer = fs.readFileSync(filePath);
  const uint8Array = new Uint8Array(dataBuffer);
  
  const parser = new PDFParse(uint8Array);
  const pdfData = await parser.getText();
  const text = pdfData.text;
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let programKode = '';
  let programNama = '';
  let kegiatanKode = '';
  let kegiatanNama = '';
  let subKegiatanKode = '';
  let subKegiatanNama = '';
  let unitOrganisasi = '';
  let subUnitOrganisasi = '';
  let totalAnggaranDokumen = 0;
  
  const rekeningRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 1. Parsing Header Metadata
    if (line.includes('Sub Unit Organisasi') && line.includes(':')) {
      const match = line.match(/Sub Unit Organisasi\s*:\s*([\d.]+)?\s*(.*)/i);
      if (match) subUnitOrganisasi = match[2].trim();
    }
    else if (line.includes('Unit Organisasi') && line.includes(':')) {
      const match = line.match(/Unit Organisasi\s*:\s*([\d.]+)?\s*(.*)/i);
      if (match) unitOrganisasi = match[2].trim();
    }
    else if (line.includes('Sub Kegiatan') && line.includes(':')) {
      const match = line.match(/Sub Kegiatan\s*:\s*([\d.]+)\s+(.*)/i);
      if (match) {
        subKegiatanKode = match[1].trim();
        subKegiatanNama = match[2].trim();
      }
    }
    else if (line.includes('Kegiatan') && line.includes(':')) {
      const match = line.match(/Kegiatan\s*:\s*([\d.]+)\s+(.*)/i);
      if (match) {
        kegiatanKode = match[1].trim();
        kegiatanNama = match[2].trim();
      }
    }
    else if (line.includes('Program') && line.includes(':')) {
      const match = line.match(/Program\s*:\s*([\d.]+)\s+(.*)/i);
      if (match) {
        programKode = match[1].trim();
        programNama = match[2].trim();
      }
    }
    else if (line.includes('Nilai Anggaran') && line.includes(':')) {
      const match = line.match(/Nilai Anggaran\s*:\s*([\d.,]+)/i);
      if (match) {
        totalAnggaranDokumen = parseIndoNumber(match[1]);
      }
    }

    // 2. Parsing Baris Rekening Belanja (Dukung Format Multi-line)
    const rekMatch = line.match(/\b(5\.\d\.\d{2}\.\d{2}\.\d{3}\.\d{5})\b/);
    if (rekMatch) {
      const kode = rekMatch[1];
      let uraianLines = [];
      let parsedNumbers = [];
      
      // Ambil teks setelah kode rekening pada baris yang sama (jika ada)
      const afterCode = line.substring(line.indexOf(kode) + kode.length).trim();
      if (afterCode.length > 0) {
        uraianLines.push(afterCode);
      }
      
      // Cari baris-baris berikutnya untuk mengumpulkan Uraian dan baris 17 Kolom Angka
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        
        // Deteksi format 17 kolom angka desimal Indonesia atau '-'
        const numRegex = /(-?\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\b)|(?:\b0,00\b)|(?:\b-\b)/g;
        const tokens = nextLine.match(numRegex) || [];
        
        if (tokens.length >= 17) {
          // Kita menemukan baris angka!
          parsedNumbers = tokens.map(t => (t === '-' ? 0 : parseIndoNumber(t))).slice(-17);
          // Lompatkan loop utama ke baris angka ini
          i = j;
          break;
        } else {
          // Jika menemukan kode rekening baru atau kata kunci total, batalkan pencarian rincian ini
          if (nextLine.match(/\b(5\.\d\.\d{2}\.\d{2}\.\d{3}\.\d{5})\b/) || nextLine.startsWith('Jumlah')) {
            break;
          }
          // Tambahkan baris deskripsi
          uraianLines.push(nextLine);
        }
      }

      if (parsedNumbers.length >= 17) {
        // Gabungkan seluruh baris deskripsi uraian belanja
        const uraian = uraianLines.join(' ').replace(/^[\s\-]+|[\s\-]+$/g, '').trim();

        rekeningRows.push({
          kode: kode,
          uraian: uraian,
          pagu_anggaran: parsedNumbers[0],
          rak_jan: parsedNumbers[1],
          rak_feb: parsedNumbers[2],
          rak_mar: parsedNumbers[3],
          // Q1 summary: parsedNumbers[4]
          rak_apr: parsedNumbers[5],
          rak_mei: parsedNumbers[6],
          rak_jun: parsedNumbers[7],
          // Q2 summary: parsedNumbers[8]
          rak_jul: parsedNumbers[9],
          rak_agu: parsedNumbers[10],
          rak_sep: parsedNumbers[11],
          // Q3 summary: parsedNumbers[12]
          rak_okt: parsedNumbers[13],
          rak_nov: parsedNumbers[14],
          rak_des: parsedNumbers[15],
          // Q4 summary: parsedNumbers[16]
        });
      }
    }
  }

  return {
    header: {
      programKode,
      programNama,
      kegiatanKode,
      kegiatanNama,
      subKegiatanKode,
      subKegiatanNama,
      unitOrganisasi,
      subUnitOrganisasi,
      totalAnggaran: totalAnggaranDokumen
    },
    rekening: rekeningRows
  };
}

/**
 * Mengubah format angka Indonesia (misal: "14.780.000,00" atau "2.150.000") menjadi Integer riil
 */
function parseIndoNumber(str) {
  if (!str) return 0;
  // Bersihkan titik ribuan dan ubah koma desimal menjadi titik desimal standar
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return Math.round(parseFloat(cleaned) || 0);
}

module.exports = {
  parseRakPdf
};
