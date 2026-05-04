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
  const s = String(str || '').trim()
  if (!s) return 0
  
  // Detect negative sign anywhere before digits (e.g., -Rp 1.000 or Rp -1.000)
  const isNegative = s.includes('-')
  
  // Remove currency prefix and other non-digit chars
  // But keep the first comma/dot that might be a decimal separator if needed?
  // Actually, for this app's budget logic, we usually only care about whole Rupiah.
  // If there's a comma (ID decimal), we should take only the part before it.
  
  const clean = s.replace(/[^0-9,]/g, '') // Keep digits and comma
  const parts = clean.split(',')
  const digits = parts[0].replace(/\D/g, '') // Take only integer part
  
  const value = parseInt(digits, 10) || 0
  return isNegative ? -value : value
}

export function persen(realisasi, pagu) {
  if (!pagu || pagu === 0) return 0
  // Use floor to avoid overstating percentages when summing parts
  return Math.min(100, Math.floor((realisasi / pagu) * 100))
}
