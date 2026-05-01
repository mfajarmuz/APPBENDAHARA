export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  error,
  hint,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-text-primary uppercase tracking-wide">
          {label}{required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`
          w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-surface text-text-primary
          placeholder:text-text-secondary transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-0 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg
          ${error ? 'border-danger ring-1 ring-danger/20' : ''}
        `}
        {...props}
      />
      {error && <p className="text-xs font-medium text-danger flex items-center gap-1"><span>⚠</span> {error}</p>}
      {hint && !error && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  )
}
