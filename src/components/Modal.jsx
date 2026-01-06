import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, size = 'large' }) {
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'w-[85vw]',
    full: 'w-[95vw]'
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 md:p-8">
      <div className={`bg-[#1f2937] border-2 border-gray-700 rounded-2xl ${sizeClasses[size]} max-h-[95vh] overflow-hidden shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b-2 border-gray-700 bg-[#111827]">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-lg transition-colors"
          >
            <X size={28} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 88px)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
