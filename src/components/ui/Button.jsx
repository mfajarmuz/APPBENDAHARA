const variants = {
  primary: 'bg-accent text-white hover:bg-violet-700 active:bg-violet-800',
  secondary: 'bg-surface text-text-primary border border-border hover:bg-bg active:bg-border',
  danger: 'bg-danger text-white hover:bg-red-700 active:bg-red-800',
  ghost: 'text-text-secondary hover:bg-bg active:bg-border',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2 rounded-lg font-medium
        transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {children}
    </button>
  )
}
