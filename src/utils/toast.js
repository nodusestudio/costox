// Sistema de notificaciones Toast simple
export const showToast = (message, type = 'success') => {
  // Remover toasts existentes
  const existingToast = document.getElementById('custom-toast')
  if (existingToast) {
    existingToast.remove()
  }

  // Crear elemento toast
  const toast = document.createElement('div')
  toast.id = 'custom-toast'
  toast.textContent = message
  
  // Estilos
  toast.style.position = 'fixed'
  toast.style.top = '20px'
  toast.style.right = '20px'
  toast.style.padding = '16px 24px'
  toast.style.borderRadius = '12px'
  toast.style.fontWeight = 'bold'
  toast.style.fontSize = '16px'
  toast.style.zIndex = '999999'
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
  toast.style.transition = 'all 0.3s ease'
  toast.style.opacity = '0'
  toast.style.transform = 'translateY(-20px)'
  
  // Colores según tipo
  if (type === 'success') {
    toast.style.backgroundColor = '#10b981'
    toast.style.color = '#ffffff'
  } else if (type === 'error') {
    toast.style.backgroundColor = '#ef4444'
    toast.style.color = '#ffffff'
  }
  
  // Agregar al DOM
  document.body.appendChild(toast)
  
  // Animar entrada
  setTimeout(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateY(0)'
  }, 10)
  
  // Remover después de 3 segundos
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(-20px)'
    setTimeout(() => {
      toast.remove()
    }, 300)
  }, 3000)
}
