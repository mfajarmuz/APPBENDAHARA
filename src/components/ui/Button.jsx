const variants = {
  primary: 'bg-accent text-white hover:bg-indigo-600 active:bg-indigo-700 shadow-soft hover:shadow-glow',
  secondary: 'bg-surface text-slate-700 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 active:bg-slate-100 shadow-sm',
  danger: 'bg-danger text-white hover:bg-red-600 active:bg-red-700 shadow-sm hover:shadow-md',
  success: 'bg-success text-white hover:bg-emerald-600 active:bg-emerald-700 shadow-sm hover:shadow-md',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base font-semibold',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  fullWidth = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-medium
        transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? 'w-full' : ''}
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {children}
    </button>
  )
}
