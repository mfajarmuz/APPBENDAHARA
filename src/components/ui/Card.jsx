export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface rounded-card border border-border p-4 sm:p-5 md:p-6 ${className}`}>
      {children}
    </div>
  )
}
