import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

export default function SearchSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = 'Buscar...', 
  displayKey = 'name',
  valueKey = 'id',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = (options ?? []).filter(option =>
    option[displayKey]?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedOption = (options ?? []).find(opt => opt[valueKey] === value)

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
          className="fixed w-full mt-2 rounded-lg shadow-2xl max-h-64 overflow-hidden"
          style={{
            position: 'absolute',
            zIndex: '10000 !important',
            backgroundColor: '#1a1a1a',
            border: '1px solid #4b5563',
            left: 0,
            right: 0
          }}
        >
          <div className="p-2 border-b border-gray-600">
            <input
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
}
