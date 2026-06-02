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
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function parseRupiah(str) {
  const s = String(str || '').trim()
  if (!s) return 0
  
  // Detect negative sign anywhere before digits (e.g., -Rp 1.000 or Rp -1.000)
  const isNegative = s.includes('-')
  
  // Remove decimal suffix at the end (1 or 2 digits after dot/comma)
  const withoutDecimal = s.replace(/[.,](\d{1,2})$/, '')
  
  // Keep only digit characters
  const digits = withoutDecimal.replace(/\D/g, '')
  
  const value = parseInt(digits, 10) || 0
  return isNegative ? -value : value
}

export function persen(realisasi, pagu) {
  if (!pagu || pagu === 0) return 0
  // Use floor to avoid overstating percentages when summing parts
  return Math.min(100, Math.floor((realisasi / pagu) * 100))
}
