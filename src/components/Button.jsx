export default function Button({ label, icon: Icon, onClick, variant = 'primary', size = 'md', disabled = false }) {
  const baseClasses = 'font-medium transition-colors rounded-lg flex items-center justify-center gap-2'
  
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  const variantClasses = {
    primary: 'bg-primary-blue hover:bg-blue-700 text-white disabled:bg-gray-600',
    success: 'bg-success-green hover:bg-green-600 text-white disabled:bg-gray-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-600',
    outline: 'border border-primary-blue text-primary-blue hover:bg-primary-blue/10 disabled:border-gray-600 disabled:text-gray-600',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}
    >
      {Icon && <Icon size={Icon === true ? 20 : 20} />}
      {label}
    </button>
  )
}
