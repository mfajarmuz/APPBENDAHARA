import Select from 'react-select'

export default function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Pilih atau ketik untuk mencari...',
  required = false,
  error,
  disabled = false,
  className = '',
}) {
  // Find current selected option object
  const selectedOption = options.find(opt => opt.value === value) || null

  const customStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'var(--color-surface, #fff)',
      borderColor: error ? 'var(--color-danger, #ef4444)' : state.isFocused ? 'var(--color-accent, #7c3aed)' : 'var(--color-border, #e2e8f0)',
      borderRadius: '0.5rem',
      padding: '1px',
      fontSize: '0.875rem',
      boxShadow: state.isFocused ? '0 0 0 2px var(--color-accent-light, #f5f3ff)' : 'none',
      '&:hover': {
        borderColor: error ? 'var(--color-danger, #ef4444)' : 'var(--color-accent, #7c3aed)',
      }
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.875rem',
      backgroundColor: state.isSelected 
        ? 'var(--color-accent, #7c3aed)' 
        : state.isFocused 
          ? 'var(--color-accent-light, #f5f3ff)' 
          : 'transparent',
      color: state.isSelected ? '#fff' : 'var(--color-text-primary, #0f172a)',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'var(--color-accent, #7c3aed)',
      }
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.5rem',
      overflow: 'hidden',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      zIndex: 50
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--color-text-secondary, #64748b)'
    })
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <Select
        value={selectedOption}
        onChange={(option) => onChange({ target: { value: option ? option.value : '' } })}
        options={options}
        placeholder={placeholder}
        isDisabled={disabled}
        isClearable
        isSearchable
        styles={customStyles}
        classNamePrefix="react-select"
      />

      {error && <p className="text-xs font-medium text-red-500 flex items-center gap-1"><span>⚠</span> {error}</p>}
    </div>
  )
}
