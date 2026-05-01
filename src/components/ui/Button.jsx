const variants = {
  primary: 'bg-accent text-white hover:bg-accent/90 active:bg-accent/80 shadow-sm hover:shadow-md',
  secondary: 'bg-surface text-text-primary border border-border hover:bg-bg active:bg-border',
  danger: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80 shadow-sm hover:shadow-md',
  success: 'bg-success text-white hover:bg-success/90 active:bg-success/80 shadow-sm hover:shadow-md',
  ghost: 'text-text-secondary hover:bg-bg active:bg-border',
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
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent
        disabled:opacity-50 disabled:cursor-not-allowed
        ${fullWidth ? 'w-full' : ''}
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {children}
    </button>
  )
}
