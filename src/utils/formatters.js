/**
 * Formatea un número como moneda con un decimal
 * Separador de miles: punto (.)
 * Separador de decimales: coma (,)
 * Ejemplo: 1234.56 → "1.234,5"
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '0,0'
  
  const num = parseFloat(value)
  if (isNaN(num)) return '0,0'
  
  // Redondear a 1 decimal
  const rounded = Math.round(num * 10) / 10
  
  // Separar parte entera y decimal
  const parts = rounded.toFixed(1).split('.')
  const integerPart = parts[0]
  const decimalPart = parts[1]
  
  // Agregar separadores de miles
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  // Retornar con coma como separador decimal
  return `${formattedInteger},${decimalPart}`
}

/**
 * Formatea un número para mostrar con moneda
 * Ejemplo: formatMoneyDisplay(1234.567, 'USD') → "$1.234,5"
 */
export const formatMoneyDisplay = (value, currencyCode = 'USD') => {
  const currencySymbols = {
    USD: '$',
    EUR: '€',
    ARS: '$',
    MXN: '$',
    COP: '$',
    CLP: '$',
    BRL: 'R$',
    PEN: 'S/',
  }
  
  const symbol = currencySymbols[currencyCode] || '$'
  const formatted = formatCurrency(value)
  
  return `${symbol}${formatted}`
}
