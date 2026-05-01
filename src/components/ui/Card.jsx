export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface rounded-card border border-border p-5 ${className}`}>
      {children}
    </div>
  )
}
