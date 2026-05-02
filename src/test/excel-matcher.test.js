import { describe, it, expect, beforeEach } from 'vitest';
import { matchCodes, createMatcher } from '../lib/excel-matcher';

describe('excel-matcher', () => {
  const mockSubKegiatan = [
    { id: 1, kode: '5.02.01.1.06.05' },
    { id: 2, kode: '5.02.01.1.06.01' }
  ];

  const mockKodeRekening = [
    { id: 101, sub_kegiatan_id: 1, kode: '5.1.02.02.01.0001' },
    { id: 102, sub_kegiatan_id: 1, kode: '5.1.02.02.01.0002' }
  ];

  describe('matchCodes (legacy wrapper)', () => {
    it('should match a valid combined code', () => {
      const combinedCode = '5.02.01.1.06.05.5.1.02.02.01.0001';
      const result = matchCodes(combinedCode, mockSubKegiatan, mockKodeRekening);

      expect(result).toEqual({
        subKegiatanId: 1,
        kodeRekeningId: 101,
        sk: '5.02.01.1.06.05',
        kr: '5.1.02.02.01.0001'
      });
    });
  });

  describe('createMatcher (factory)', () => {
    let matcher;

    beforeEach(() => {
      matcher = createMatcher(mockSubKegiatan, mockKodeRekening);
    });

    it('should match a valid combined code with exact matches', () => {
      const combinedCode = '5.02.01.1.06.05.5.1.02.02.01.0001';
      const result = matcher(combinedCode);

      expect(result).toEqual({
        subKegiatanId: 1,
        kodeRekeningId: 101,
        sk: '5.02.01.1.06.05',
        kr: '5.1.02.02.01.0001'
      });
    });

    it('should match codes with varying zero padding (normalization)', () => {
      // Normalization: 5.2.1.1.6.5 -> 5.02.01.1.06.05
      const combinedCode = '5.2.1.1.6.5.5.1.2.2.1.1'; 
      const result = matcher(combinedCode);

      expect(result).toEqual({
        subKegiatanId: 1,
        kodeRekeningId: 101,
        sk: '5.02.01.1.06.05',
        kr: '5.1.02.02.01.0001'
      });
    });

    it('should return error for invalid combined code', () => {
      const combinedCode = '9.99.99.9.99.99.9.9.99.99.99.9999';
      const result = matcher(combinedCode);

      expect(result).toEqual({ error: 'Kode tidak ditemukan' });
    });

    it('should return error if sub_kegiatan matches but kode_rekening does not', () => {
      const combinedCode = '5.02.01.1.06.05.9.9.99.99.99.9999';
      const result = matcher(combinedCode);

      expect(result).toEqual({ error: 'Kode tidak ditemukan' });
    });

    it('should return error for empty code', () => {
      const result = matcher('');
      expect(result).toEqual({ error: 'Kode kosong' });
    });
  });
});
