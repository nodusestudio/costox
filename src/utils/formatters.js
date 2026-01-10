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

/**
 * Obtiene el precio por gramo de un ingrediente
 * Lógica: precio_con_merma = precio_compra * 1.30
 *         precio_por_gramo = precio_con_merma / peso_empaque_total
 * 
 * @param {number} precioCompra - Precio de compra del empaque
 * @param {number} pesoEmpaqueTotal - Peso total del empaque en gramos/ml
 * @param {number} porcentajeMerma - Porcentaje de merma (default: 30)
 * @returns {number} Precio por gramo/ml
 */
export const obtenerPrecioGramo = (precioCompra, pesoEmpaqueTotal, porcentajeMerma = 30) => {
  if (!pesoEmpaqueTotal || pesoEmpaqueTotal <= 0) return 0
  if (!precioCompra || precioCompra <= 0) return 0
  
  // Paso 1: Calcular precio con merma
  const precioConMerma = precioCompra * (1 + porcentajeMerma / 100)
  
  // Paso 2: Dividir por peso total para obtener precio por gramo
  const precioPorGramo = precioConMerma / pesoEmpaqueTotal
  
  return precioPorGramo
}

/**
 * Redondea un valor al millar superior
 * Ejemplo: 16.846 → 17.000
 *          25.250 → 26.000
 */
export const roundToNearestThousand = (value) => {
  if (!value || value <= 0) return 0
  return Math.ceil(value / 1000) * 1000
}
