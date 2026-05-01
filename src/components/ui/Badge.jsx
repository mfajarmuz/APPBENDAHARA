const styles = {
  success: 'bg-emerald-100 text-success',
  warning: 'bg-amber-100 text-warning',
  danger: 'bg-red-100 text-danger',
  default: 'bg-accent-light text-accent',
  gray: 'bg-border text-text-secondary',
}

export default function Badge({ children, variant = 'default' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  )
}
