import React, { useState, useMemo } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Info, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '@/store/useStore';
import { formatRupiah } from '@/lib/format';
import { createMatcher } from '@/lib/excel-matcher';
import Modal from './Modal';
import Button from './Button';
import Spinner from './Spinner';

export default function ImportModal({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  const subKegiatan = useStore((s) => s.subKegiatan);
  const pengeluaran = useStore((s) => s.pengeluaran);
  const penerimaan = useStore((s) => s.penerimaan);
  const addPengeluaran = useStore((s) => s.addPengeluaran);

  const kodeRekeningList = useMemo(() => {
    return subKegiatan.flatMap((sk) => 
      (sk.kode_rekening || []).map((kr) => ({ ...kr, sub_kegiatan_id: sk.id }))
    );
  }, [subKegiatan]);

  const matcher = useMemo(() => createMatcher(subKegiatan, kodeRekeningList), [subKegiatan, kodeRekeningList]);

  const totalCair = useMemo(() => penerimaan.reduce((s, p) => s + p.jumlah, 0), [penerimaan]);
  const totalSpent = useMemo(() => pengeluaran.reduce((s, p) => s + p.jumlah, 0), [pengeluaran]);
  const currentCashBalance = totalCair - totalSpent;

  const realisasiPerRek = useMemo(() => {
    const map = {};
    pengeluaran.forEach((p) => {
      map[p.kode_rekening_id] = (map[p.kode_rekening_id] || 0) + p.jumlah;
    });
    return map;
  }, [pengeluaran]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (file) => {
    setLoading(true);
    setError(null);
    setFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const rows = json.slice(1).filter(row => row.length >= 4).map((row, index) => {
          const rawDate = row[0];
          const rawCode = String(row[1] || '').trim();
          const uraian = String(row[2] || '').trim();
          const jumlah = parseInt(String(row[3] || '').replace(/[^\d]/g, ''), 10) || 0;

          let tanggal;
          if (rawDate instanceof Date) {
            tanggal = rawDate.toISOString().split('T')[0];
          } else {
            tanggal = String(rawDate);
          }

          const match = matcher(rawCode);
          
          return {
            id: index,
            tanggal,
            rawCode,
            uraian,
            jumlah,
            match,
            status: 'pending',
            errors: []
          };
        });

        const validatedRows = validateRows(rows);
        setData(validatedRows);
      } catch (err) {
        console.error('Error processing file:', err);
        setError('Gagal membaca file Excel. Pastikan formatnya benar.');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Gagal membaca file.');
      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  const validateRows = (rows) => {
    let runningBalance = currentCashBalance;
    const runningRealisasi = { ...realisasiPerRek };

    return rows.map((row) => {
      const errors = [];
      
      if (row.match.error) {
        errors.push(`Kode tidak ditemukan: ${row.rawCode}`);
      } else {
        const kr = kodeRekeningList.find(k => k.id === row.match.kodeRekeningId);
        const pagu = kr?.pagu_anggaran || 0;
        const currentUsed = runningRealisasi[row.match.kodeRekeningId] || 0;
        
        if (currentUsed + row.jumlah > pagu) {
          errors.push(`Pagu tidak mencukupi (Sisa: ${formatRupiah(pagu - currentUsed)})`);
        }
        
        runningRealisasi[row.match.kodeRekeningId] = currentUsed + row.jumlah;
      }

      if (row.jumlah <= 0) {
        errors.push('Jumlah harus lebih dari 0');
      }

      if (runningBalance - row.jumlah < 0) {
        errors.push(`Saldo kas tidak mencukupi (Sisa: ${formatRupiah(runningBalance)})`);
      }

      runningBalance -= row.jumlah;

      return {
        ...row,
        errors,
        isValid: errors.length === 0
      };
    });
  };

  const handleImport = async () => {
    const validRows = data.filter(r => r.isValid);
    if (validRows.length === 0) return;

    setImporting(true);
    let successCount = 0;
    
    try {
      for (const row of validRows) {
        const d = new Date(row.tanggal);
        const bgNoBukti = `BPP-IMP-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${Date.now()}-${row.id}`;

        const payload = {
          pengeluaran: {
            tanggal: row.tanggal,
            no_bukti: bgNoBukti,
            sub_kegiatan_id: row.match.subKegiatanId,
            kode_rekening_id: row.match.kodeRekeningId,
            jumlah: row.jumlah,
            keterangan: row.uraian,
          },
          rincian: [{
            uraian: row.uraian,
            jumlah: row.jumlah
          }],
        };

        const res = await addPengeluaran(payload);
        if (res && res.success) {
          successCount++;
        }
      }
      
      alert(`Berhasil mengimpor ${successCount} transaksi.`);
      onClose();
      resetState();
    } catch (err) {
      console.error('Import error:', err);
      setError('Terjadi kesalahan saat mengimpor data.');
    } finally {
      setImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setData([]);
    setError(null);
  };

  const validCount = data.filter(r => r.isValid).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import Data Pengeluaran dari Excel"
      width={1000}
    >
      <div className="space-y-6">
        {!file ? (
          <div 
            className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 hover:border-indigo-300 transition-all cursor-pointer group"
            onClick={() => document.getElementById('excel-upload').click()}
          >
            <input 
              id="excel-upload"
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all mb-4">
              <Upload size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Pilih File Excel</h3>
            <p className="text-sm text-slate-500 mt-1">Drag and drop atau klik untuk memilih file (.xlsx atau .xls)</p>
            <div className="mt-6 flex gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Kolom: Tanggal</span>
              <span>•</span>
              <span>Kode (SK.KR)</span>
              <span>•</span>
              <span>Uraian</span>
              <span>•</span>
              <span>Jumlah</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB • {data.length} baris ditemukan</p>
                </div>
              </div>
              <button 
                onClick={resetState}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Spinner size={32} />
                <p className="text-sm text-slate-500 animate-pulse">Memproses file...</p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-12 text-center">Status</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-24">Tanggal</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-32">Kode</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Uraian</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-32 text-right">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {data.map((row) => (
                          <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${!row.isValid ? 'bg-red-50/30' : ''}`}>
                            <td className="px-4 py-3 text-center">
                              {row.isValid ? (
                                <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                              ) : (
                                <div className="group relative">
                                  <AlertCircle size={16} className="text-red-500 mx-auto cursor-help" />
                                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 bg-slate-800 text-white text-[10px] p-2 rounded shadow-xl z-50">
                                    <ul className="list-disc pl-3 space-y-1">
                                      {row.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                      ))}
                                    </ul>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 font-medium">{row.tanggal}</td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-500">{row.rawCode}</td>
                            <td className="px-4 py-3 text-xs text-slate-700 truncate max-w-[300px]" title={row.uraian}>{row.uraian}</td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-900 text-right">{formatRupiah(row.jumlah)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <Info size={18} className="text-blue-500 shrink-0" />
                  <div className="text-xs text-blue-700 leading-relaxed">
                    <p className="font-bold uppercase tracking-widest text-[10px] mb-1">Ringkasan Import</p>
                    <p>Ditemukan <strong>{data.length}</strong> baris. <strong>{validCount}</strong> baris siap diimpor, <strong>{data.length - validCount}</strong> baris bermasalah dan akan diabaikan.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} type="button">Batal</Button>
          <Button 
            onClick={handleImport} 
            disabled={importing || validCount === 0 || loading}
            className="px-8 h-12 shadow-lg shadow-indigo-600/20"
          >
            {importing ? 'Mengimpor...' : `Import ${validCount} Transaksi`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
