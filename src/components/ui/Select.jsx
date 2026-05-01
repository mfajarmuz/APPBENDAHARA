export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Pilih...',
  required = false,
  error,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-text-secondary">
          {label}{required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        required={required}
        className={`
          w-full px-3 py-2 text-sm rounded-lg border bg-surface text-text-primary
          focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
          ${error ? 'border-danger' : 'border-border'}
        `}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
