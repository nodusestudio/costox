/**
 * Motor de Cálculo Centralizado para CostoX
 * Calcula costos en tiempo real desde Firebase
 * Ningún componente debe tener costos hardcoded
 */

import { getIngredients, getRecipes, getProducts } from './storage'

// Cache en memoria para optimizar llamadas repetidas
let cachedData = {
  ingredients: null,
  recipes: null,
  products: null,
  lastUpdate: null
}

const CACHE_DURATION = 30000 // 30 segundos

/**
 * Refresca el cache si ha expirado
 */
const refreshCacheIfNeeded = async () => {
  const now = Date.now()
  
  if (!cachedData.lastUpdate || (now - cachedData.lastUpdate) > CACHE_DURATION) {
    console.log('🔄 Refrescando cache de costos...')
    const [ingredients, recipes, products] = await Promise.all([
      getIngredients(),
      getRecipes(),
      getProducts()
    ])
    
    cachedData = {
      ingredients,
      recipes,
      products,
      lastUpdate: now
    }
  }
  
  return cachedData
}

/**
 * Fuerza la actualización del cache
 */
export const forceCacheRefresh = async () => {
  cachedData.lastUpdate = null
  return await refreshCacheIfNeeded()
}

/**
 * Calcula el costo real de un ingrediente
 * @param {string} ingredientId - ID del ingrediente
 * @param {number} quantity - Cantidad en gramos
 * @returns {number} Costo total
 */
export const calculateIngredientCost = async (ingredientId, quantity = 1) => {
  try {
    const data = await refreshCacheIfNeeded()
    const ingredient = data.ingredients.find(i => i.id === ingredientId)
    
    if (!ingredient) {
      console.warn(`⚠️ Ingrediente no encontrado: ${ingredientId}`)
      return 0
    }
    
    // Usar costoPorGramo si está disponible
    if (ingredient.costoPorGramo && ingredient.costoPorGramo > 0) {
      return ingredient.costoPorGramo * quantity
    }
    
    // Calcular desde costo base con merma
    const purchaseCost = parseFloat(ingredient.purchaseCost || 0)
    const wastagePercent = parseFloat(ingredient.wastagePercent || 30)
    const pesoEmpaqueTotal = parseFloat(ingredient.pesoEmpaqueTotal || 1000)
    
    // Costo con merma aplicada
    const costWithWastage = purchaseCost * (1 + wastagePercent / 100)
    const costoPorGramo = pesoEmpaqueTotal > 0 ? costWithWastage / pesoEmpaqueTotal : 0
    
    return costoPorGramo * quantity
  } catch (error) {
    console.error('Error calculando costo de ingrediente:', error)
    return 0
  }
}

/**
 * Calcula el costo real de una receta
 * @param {string} recipeId - ID de la receta
 * @param {number} quantity - Cantidad en gramos
 * @returns {number} Costo total
 */
export const calculateRecipeCost = async (recipeId, quantity = 1) => {
  try {
    const data = await refreshCacheIfNeeded()
    const recipe = data.recipes.find(r => r.id === recipeId)
    
    if (!recipe) {
      console.warn(`⚠️ Receta no encontrada: ${recipeId}`)
      return 0
    }
    
    // Usar costoPorGramo si está disponible
    if (recipe.costoPorGramo && recipe.costoPorGramo > 0) {
      return recipe.costoPorGramo * quantity
    }
    
    // Calcular desde totalCost y pesoTotal
    const totalCost = parseFloat(recipe.totalCost || 0)
    const pesoTotal = parseFloat(recipe.pesoTotal || 1)
    
    const costoPorGramo = pesoTotal > 0 ? totalCost / pesoTotal : 0
    
    return costoPorGramo * quantity
  } catch (error) {
    console.error('Error calculando costo de receta:', error)
    return 0
  }
}

/**
 * Calcula el costo real de un producto
 * @param {string} productId - ID del producto
 * @returns {object} Objeto con costos detallados
 */
export const calculateProductCost = async (productId) => {
  try {
    const data = await refreshCacheIfNeeded()
    const product = data.products.find(p => p.id === productId)
    
    if (!product) {
      console.warn(`⚠️ Producto no encontrado: ${productId}`)
      return {
        totalCost: 0,
        laborCost: 0,
        ingredientsCost: 0,
        realSalePrice: 0
      }
    }
    
    return {
      totalCost: parseFloat(product.totalCost || 0),
      laborCost: parseFloat(product.laborCost || 0),
      ingredientsCost: parseFloat(product.ingredientsCost || 0),
      realSalePrice: parseFloat(product.realSalePrice || 0)
    }
  } catch (error) {
    console.error('Error calculando costo de producto:', error)
    return {
      totalCost: 0,
      laborCost: 0,
      ingredientsCost: 0,
      realSalePrice: 0
    }
  }
}

/**
 * Función principal: Calcula el costo de cualquier tipo de item
 * @param {string} itemId - ID del item
 * @param {string} type - Tipo: 'ingredient', 'recipe', 'product'
 * @param {number} quantity - Cantidad (para ingredientes y recetas)
 * @returns {number|object} Costo calculado
 */
export const calculateTrueCost = async (itemId, type, quantity = 1) => {
  if (!itemId || !type) {
    console.warn('⚠️ calculateTrueCost requiere itemId y type')
    return type === 'product' ? { totalCost: 0 } : 0
  }
  
  switch (type.toLowerCase()) {
    case 'ingredient':
    case 'ingredient-embalaje':
    case 'ingredient-receta':
      return await calculateIngredientCost(itemId, quantity)
    
    case 'recipe':
      return await calculateRecipeCost(itemId, quantity)
    
    case 'product':
      return await calculateProductCost(itemId)
    
    default:
      console.warn(`⚠️ Tipo desconocido: ${type}`)
      return 0
  }
}

/**
 * Recalcula el costo total de una receta basándose en sus componentes
 * @param {Array} ingredients - Array de {type, id, quantity}
 * @param {number} pesoTotal - Peso total de la receta
 * @param {number} wastagePercent - Porcentaje de merma
 * @returns {object} Costos calculados
 */
export const recalculateRecipeTotalCost = async (ingredients, pesoTotal, wastagePercent = 30) => {
  let totalCostBase = 0
  
  for (const item of ingredients || []) {
    const quantity = parseFloat(item.quantity || 0)
    const itemCost = await calculateTrueCost(item.id, item.type, quantity)
    totalCostBase += itemCost
  }
  
  // Aplicar merma a la receta completa
  const totalCost = totalCostBase * (1 + wastagePercent / 100)
  const costoPorGramo = pesoTotal > 0 ? totalCost / pesoTotal : 0
  
  return {
    totalCost,
    costoPorGramo,
    baseCost: totalCostBase
  }
}

/**
 * Recalcula el costo total de un producto basándose en sus componentes
 * @param {Array} items - Array de {type, id, quantity}
 * @param {number} laborCost - Costo de mano de obra
 * @param {number} indirectCostsPercent - Porcentaje de costos indirectos
 * @returns {object} Costos calculados
 */
export const recalculateProductTotalCost = async (items, laborCost = 0, indirectCostsPercent = 0) => {
  let ingredientsCost = 0
  
  for (const item of items || []) {
    const quantity = parseFloat(item.quantity || 1)
    const itemCost = await calculateTrueCost(item.id, item.type, quantity)
    ingredientsCost += itemCost
  }
  
  const laborCostValue = parseFloat(laborCost || 0)
  
  // Costo base (ingredientes + labor)
  const baseCost = ingredientsCost + laborCostValue
  
  // Aplicar costos indirectos (luz, gas, etc.)
  const indirectCosts = baseCost * (parseFloat(indirectCostsPercent || 0) / 100)
  const totalCost = baseCost + indirectCosts
  
  return {
    totalCost,
    ingredientsCost,
    laborCost: laborCostValue,
    indirectCosts,
    baseCost
  }
}

export default calculateTrueCost
