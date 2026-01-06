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

/**
 * Calcula el costo proporcional de un ingrediente según la cantidad usada
 * @param {number} precioConMerma - Precio del bulto/empaque CON merma aplicada
 * @param {number} pesoEmpaqueTotal - Peso total del empaque en gramos/ml
 * @param {number} cantidadUsada - Cantidad usada en la receta en gramos/ml
 * @returns {number} Costo proporcional
 * 
 * Ejemplo: 
 * - Harina 1kg cuesta $2.600 con merma
 * - Uso 250g en la receta
 * - Costo = (2.600 / 1000) * 250 = $650
 */
export const calcularCostoProporcional = (precioConMerma, pesoEmpaqueTotal, cantidadUsada) => {
  if (!pesoEmpaqueTotal || pesoEmpaqueTotal <= 0) return 0
  if (!cantidadUsada || cantidadUsada <= 0) return 0
  
  // Precio por gramo/ml
  const precioPorUnidad = precioConMerma / pesoEmpaqueTotal
  
  // Costo proporcional
  return precioPorUnidad * cantidadUsada
}
