/**
 * Normalizes a code by splitting by dots and parsing as integers to remove leading zeros.
 * e.g., "5.02.01.1.06.05" -> "5.2.1.1.6.5"
 * @param {string} code
 * @returns {string}
 */
export const normalize = (code) => {
  if (!code) return '';
  return code
    .split('.')
    .map((part) => parseInt(part, 10).toString())
    .join('.');
};

/**
 * Creates a matcher function that uses cached normalized reference lists.
 *
 * @param {Array} subKegiatanList
 * @param {Array} kodeRekeningList
 * @returns {Function} (combinedCode) => { subKegiatanId, kodeRekeningId, sk, kr } or { error }
 */
export const createMatcher = (subKegiatanList, kodeRekeningList) => {
  const normalizedSubKegiatanList = subKegiatanList.map((sk) => ({
    ...sk,
    normalized: normalize(sk.kode),
  }));

  const normalizedKodeRekeningList = kodeRekeningList.map((kr) => ({
    ...kr,
    normalized: normalize(kr.kode),
  }));

  return (combinedCode) => {
    if (!combinedCode) return { error: 'Kode kosong' };

    const parts = combinedCode.split('.');

    // Iterate through possible split points
    for (let i = 1; i < parts.length; i++) {
      const subPart = parts.slice(0, i).join('.');
      const rekPart = parts.slice(i).join('.');

      const normSub = normalize(subPart);
      const normRek = normalize(rekPart);

      const skMatch = normalizedSubKegiatanList.find((sk) => sk.normalized === normSub);
      if (skMatch) {
        const krMatch = normalizedKodeRekeningList.find(
          (kr) => kr.sub_kegiatan_id === skMatch.id && kr.normalized === normRek
        );

        if (krMatch) {
          return {
            subKegiatanId: skMatch.id,
            kodeRekeningId: krMatch.id,
            sk: skMatch.kode,
            kr: krMatch.kode,
          };
        }
      }
    }

    return { error: 'Kode tidak ditemukan' };
  };
};

/**
 * Matches a combined code from Excel to sub_kegiatan and kode_rekening.
 * Note: For batch processing, use createMatcher for better performance.
 *
 * @param {string} combinedCode
 * @param {Array} subKegiatanList
 * @param {Array} kodeRekeningList
 * @returns {Object} { subKegiatanId, kodeRekeningId, sk, kr } or { error }
 */
export const matchCodes = (combinedCode, subKegiatanList, kodeRekeningList) => {
  const matcher = createMatcher(subKegiatanList, kodeRekeningList);
  return matcher(combinedCode);
};
