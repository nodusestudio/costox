/**
 * Sistema de almacenamiento en localStorage para CostoX
 */

const STORAGE_PREFIX = 'costox_'
const STORAGE_VERSION = 1

/**
 * Obtiene datos del localStorage
 */
export const getFromStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Error reading from storage (${key}):`, error)
    return defaultValue
  }
}

/**
 * Guarda datos en localStorage
 */
export const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Error saving to storage (${key}):`, error)
    return false
  }
}

/**
 * Elimina datos del localStorage
 */
export const removeFromStorage = (key) => {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
    return true
  } catch (error) {
    console.error(`Error removing from storage (${key}):`, error)
    return false
  }
}

/**
 * Limpia todo el almacenamiento de CostoX
 */
export const clearAllStorage = () => {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
    return true
  } catch (error) {
    console.error('Error clearing storage:', error)
    return false
  }
}

/**
 * Obtiene la configuración global
 */
export const getConfig = () => {
  return getFromStorage('config', {
    companyName: 'Mi Empresa',
    chefName: 'Chef',
    currency: 'USD',
    language: 'es',
    globalWastagePercent: 5,
  })
}

/**
 * Guarda la configuración global
 */
export const saveConfig = (config) => {
  return saveToStorage('config', config)
}

/**
 * Obtiene todos los proveedores
 */
export const getSuppliers = () => {
  return getFromStorage('suppliers', [])
}

/**
 * Guarda proveedores
 */
export const saveSuppliers = (suppliers) => {
  return saveToStorage('suppliers', suppliers)
}

/**
 * Obtiene todos los ingredientes
 */
export const getIngredients = () => {
  return getFromStorage('ingredients', [])
}

/**
 * Guarda ingredientes
 */
export const saveIngredients = (ingredients) => {
  return saveToStorage('ingredients', ingredients)
}

/**
 * Obtiene todas las recetas
 */
export const getRecipes = () => {
  return getFromStorage('recipes', [])
}

/**
 * Guarda recetas
 */
export const saveRecipes = (recipes) => {
  return saveToStorage('recipes', recipes)
}

/**
 * Obtiene todos los productos finales
 */
export const getProducts = () => {
  return getFromStorage('products', [])
}

/**
 * Guarda productos
 */
export const saveProducts = (products) => {
  return saveToStorage('products', products)
}

/**
 * Obtiene todas las promociones
 */
export const getPromotions = () => {
  return getFromStorage('promotions', [])
}

/**
 * Guarda promociones
 */
export const savePromotions = (promotions) => {
  return saveToStorage('promotions', promotions)
}
