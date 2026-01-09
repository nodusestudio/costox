import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo, memo } from 'react'
import { Search, X } from 'lucide-react'

const SearchSelect = memo(forwardRef(({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Buscar...', 
  displayKey = 'name',
  valueKey = 'id',
  className = ''
}, ref) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  useImperativeHandle(ref, () => ({
    focus: () => {
      setIsOpen(true)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }))

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Memoizar filtrado de opciones para evitar recalcular en cada render
  const filteredOptions = useMemo(() => {
    return (options ?? []).filter(option =>
      option[displayKey]?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [options, searchTerm, displayKey])

  // Memoizar opción seleccionada
  const selectedOption = useMemo(() => {
    return (options ?? []).find(opt => opt[valueKey] === value)
  }, [options, value, valueKey])

  const handleSelect = (option) => {
    onChange(option[valueKey])
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = () => {
    onChange('')
    setSearchTerm('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ zIndex: isOpen ? 10000 : 1 }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-2 bg-[#111827] border border-gray-600 rounded-lg text-white cursor-pointer flex items-center justify-between hover:border-primary-blue transition-colors"
      >
        <span className={`${selectedOption ? 'text-white' : 'text-gray-500'} truncate text-sm`}>
          {selectedOption ? selectedOption[displayKey] : placeholder}
        </span>
        <div className="flex items-center gap-2">
          {selectedOption && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
          <Search size={18} className="text-gray-400" />
        </div>
      </div>

      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            zIndex: 100000,
            backgroundColor: '#1a1a1a',
            border: '1px solid #4b5563',
            top: containerRef.current?.getBoundingClientRect().bottom + window.scrollY + 8 + 'px',
            left: containerRef.current?.getBoundingClientRect().left + 'px',
            width: containerRef.current?.getBoundingClientRect().width + 'px',
            maxHeight: '16rem',
            borderRadius: '0.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}
        >
          <div className="p-2 border-b border-gray-600">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Escribe para buscar..."
              className="w-full px-3 py-2 bg-[#1f2937] border border-gray-600 rounded text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-gray-500 text-center">
                No se encontraron resultados
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option[valueKey]}
                  onClick={() => handleSelect(option)}
                  className={`px-4 py-3 cursor-pointer hover:bg-primary-blue/20 transition-colors ${
                    option[valueKey] === value ? 'bg-primary-blue/30 text-white' : 'text-gray-300'
                  }`}
                >
                  {option[displayKey]}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}))

SearchSelect.displayName = 'SearchSelect'

export default SearchSelect
