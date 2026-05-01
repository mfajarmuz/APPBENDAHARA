export default function ProgressBar({ value = 0, showLabel = true }) {
  const color =
    value >= 80 ? 'bg-success' :
    value >= 50 ? 'bg-accent' :
    value >= 20 ? 'bg-warning' : 'bg-danger'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-text-secondary w-8 text-right">{value}%</span>
      )}
    </div>
  )
}
