export function formatRupiah(angka) {
  if (angka == null) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(angka)
}

export function formatTanggal(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function parseRupiah(str) {
  return parseInt(String(str).replace(/\D/g, ''), 10) || 0
}

export function persen(realisasi, pagu) {
  if (!pagu || pagu === 0) return 0
  return Math.min(100, Math.round((realisasi / pagu) * 100))
}
