import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { formatRupiah } from '@/lib/format'

const COLORS = ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#06B6D4']

export function KPICard({ label, value, subtext, variant = 'primary' }) {
  const variantStyles = {
    primary: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
    success: 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200',
    danger: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
    warning: 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200',
  }

  const textStyles = {
    primary: 'text-blue-900 from-blue-600 to-blue-700',
    success: 'text-emerald-900 from-emerald-600 to-emerald-700',
    danger: 'text-red-900 from-red-600 to-red-700',
    warning: 'text-amber-900 from-amber-600 to-amber-700',
  }

  return (
    <div className={`card border ${variantStyles[variant]}`}>
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold bg-gradient-to-r ${textStyles[variant]} bg-clip-text text-transparent`}>
        {value}
      </p>
      {subtext && <p className="text-xs text-slate-500 mt-1.5">{subtext}</p>}
    </div>
  )
}

export function ExpenditureTrendsChart({ data }) {
  return (
    <div className="card">
      <h3 className="text-sm font-bold text-slate-900 mb-4">Tren Pengeluaran Bulanan</h3>
      {data?.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v) => [formatRupiah(v), 'Total']}
              contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', backgroundColor: '#FFF' }}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Line type="monotone" dataKey="total" stroke="#7C3AED" strokeWidth={3} dot={{ fill: '#7C3AED', r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-slate-500 h-64 flex items-center justify-center">Belum ada data</p>
      )}
    </div>
  )
}

export function RealizationVsBudgetChart({ data }) {
  // Filter top 6 sub kegiatan by budget for clearer chart
  const topData = data?.slice(0, 6) || []

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-slate-900 mb-4">Realisasi vs Anggaran per Sub Kegiatan</h3>
      {topData.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="kode"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v) => formatRupiah(v)}
              contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
            <Bar dataKey="total_pagu" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Anggaran" />
            <Bar dataKey="realisasi" fill="#10B981" radius={[4, 4, 0, 0]} name="Realisasi" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-slate-500 h-64 flex items-center justify-center">Belum ada data</p>
      )}
    </div>
  )
}

export function BudgetAllocationPie({ data }) {
  const pieData = data?.slice(0, 5) || []

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-slate-900 mb-4">Alokasi Anggaran</h3>
      {pieData.length ? (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="total_pagu"
              nameKey="kode"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatRupiah(v)} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-slate-500 h-48 flex items-center justify-center">Belum ada data</p>
      )}
    </div>
  )
}
