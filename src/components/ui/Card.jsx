export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface rounded-card border border-slate-100 shadow-soft p-4 sm:p-5 md:p-6 transition-all duration-300 hover:shadow-md ${className}`}>
      {children}
    </div>
  )
}
