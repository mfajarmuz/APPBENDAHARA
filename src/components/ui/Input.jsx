export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  required = false,
  error,
  hint,
  className = '',
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-text-secondary">
          {label}{required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`
          w-full px-3 py-2 text-sm rounded-lg border bg-surface text-text-primary
          placeholder:text-text-secondary transition-colors
          focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
          ${error ? 'border-danger' : 'border-border'}
        `}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  )
}
