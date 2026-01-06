/**
 * Sistema de almacenamiento con Firestore para CostoX
 */

import { db } from '@/config/firebase'
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore'
import { calcularCostoProporcional } from './formatters'

const COLLECTIONS = {
  config: 'config',
  suppliers: 'suppliers',
  ingredients: 'ingredients',
  recipes: 'recipes',
  products: 'products',
  promotions: 'promotions'
}

/**
 * Obtiene un documento por ID
 */
export const getDocById = async (collectionName, id) => {
  try {
    const docRef = doc(db, collectionName, id)
    const docSnap = await getDoc(docRef)
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null
  } catch (error) {
    console.error(`Error getting document ${id} from ${collectionName}:`, error)
    return null
  }
}

/**
 * Obtiene todos los documentos de una colección
 */
export const getAllDocs = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName))
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error)
    return []
  }
}

/**
 * Guarda o actualiza un documento
 */
export const saveDoc = async (collectionName, data, id = null) => {
  try {
    if (id) {
      const docRef = doc(db, collectionName, id)
      await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true })
      return id
    } else {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      return docRef.id
    }
  } catch (error) {
    console.error(`Error saving document to ${collectionName}:`, error)
    throw error
  }
}

/**
 * Elimina un documento
 */
export const deleteDocument = async (collectionName, id) => {
  try {
    await deleteDoc(doc(db, collectionName, id))
    return true
  } catch (error) {
    console.error(`Error deleting document ${id} from ${collectionName}:`, error)
    return false
  }
}


/**
 * Obtiene la configuración global
 */
export const getConfig = async () => {
  try {
    const configDoc = await getDocById(COLLECTIONS.config, 'global')
    return configDoc || {
      companyName: 'Mi Empresa',
      chefName: 'Chef',
      currency: 'USD',
      language: 'es',
      globalWastagePercent: 30, // Merma del 30% por defecto
    }
  } catch (error) {
    console.error('Error getting config:', error)
    return {
      companyName: 'Mi Empresa',
      chefName: 'Chef',
      currency: 'USD',
      language: 'es',
      globalWastagePercent: 30,
    }
  }
}

/**
 * Guarda la configuración global
 */
export const saveConfig = async (config) => {
  return await saveDoc(COLLECTIONS.config, config, 'global')
}

/**
 * Obtiene todos los proveedores
 */
export const getSuppliers = async () => {
  return await getAllDocs(COLLECTIONS.suppliers)
}

/**
 * Guarda proveedor
 */
export const saveSupplier = async (supplier, id = null) => {
  return await saveDoc(COLLECTIONS.suppliers, supplier, id)
}

/**
 * Elimina proveedor
 */
export const deleteSupplier = async (id) => {
  return await deleteDocument(COLLECTIONS.suppliers, id)
}

/**
 * Obtiene todos los ingredientes
 */
export const getIngredients = async () => {
  return await getAllDocs(COLLECTIONS.ingredients)
}

/**
 * Guarda ingrediente con cálculo automático de merma y costo por gramo
 */
export const saveIngredient = async (ingredient, id = null) => {
  // Calcular costo con merma (30% por defecto)
  const purchaseCost = parseFloat(ingredient.purchaseCost || 0)
  const wastagePercent = parseFloat(ingredient.wastagePercent || 30)
  const pesoEmpaqueTotal = parseFloat(ingredient.pesoEmpaqueTotal || 1000) // Default 1kg
  
  // costo_real = costo_compra * 1.30 (30% de merma)
  const costWithWastage = purchaseCost * (1 + wastagePercent / 100)
  
  // Costo por gramo/ml para cálculos proporcionales
  const costoPorGramo = pesoEmpaqueTotal > 0 ? costWithWastage / pesoEmpaqueTotal : 0
  
  const ingredientData = {
    ...ingredient,
    purchaseCost,
    wastagePercent,
    pesoEmpaqueTotal,
    costWithWastage,
    costoPorGramo,
    updatedAt: new Date().toISOString()
  }
  
  return await saveDoc(COLLECTIONS.ingredients, ingredientData, id)
}

/**
 * Elimina ingrediente
 */
export const deleteIngredient = async (id) => {
  return await deleteDocument(COLLECTIONS.ingredients, id)
}

/**
 * Obtiene todas las recetas
 */
export const getRecipes = async () => {
  return await getAllDocs(COLLECTIONS.recipes)
}

/**
 * Calcula el costo total de una receta basada en sus ingredientes
 */
export const calculateRecipeCost = async (ingredientsList) => {
  // Validar que ingredientsList sea un array
  if (!ingredientsList || !Array.isArray(ingredientsList) || ingredientsList.length === 0) {
    return 0
  }
  
  let totalCost = 0
  
  for (const item of ingredientsList) {
    if (!item || !item.id) continue
    
    if (item.type === 'ingredient') {
      const ingredient = await getDocById(COLLECTIONS.ingredients, item.id)
      if (ingredient && ingredient.costWithWastage && ingredient.pesoEmpaqueTotal) {
        // Usar cálculo proporcional correcto: (precio_con_merma / peso_total) * cantidad_usada
        totalCost += calcularCostoProporcional(
          ingredient.costWithWastage, 
          ingredient.pesoEmpaqueTotal, 
          parseFloat(item.quantity || 0)
        )
      }
    } else if (item.type === 'recipe') {
      const recipe = await getDocById(COLLECTIONS.recipes, item.id)
      if (recipe && recipe.totalCost) {
        totalCost += recipe.totalCost * parseFloat(item.quantity || 1)
      }
    }
  }
  
  return totalCost
}

/**
 * Guarda receta
 */
export const saveRecipe = async (recipe, id = null) => {
  try {
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
    const totalCost = await calculateRecipeCost(ingredients)
    
    const recipeData = {
      ...recipe,
      ingredients,
      totalCost,
      updatedAt: new Date().toISOString()
    }
    
    return await saveDoc(COLLECTIONS.recipes, recipeData, id)
  } catch (error) {
    console.error('Error saving recipe:', error)
    throw error
  }
}

/**
 * Elimina receta
 */
export const deleteRecipe = async (id) => {
  return await deleteDocument(COLLECTIONS.recipes, id)
}

/**
 * Obtiene todos los productos
 */
export const getProducts = async () => {
  return await getAllDocs(COLLECTIONS.products)
}

/**
 * Calcula métricas de un producto
 */
export const calculateProductMetrics = async (productData) => {
  if (!productData) {
    return {
      totalCost: 0,
      profitMarginPercent: 0,
      profitMarginAmount: 0,
      suggestedPrice: 0,
      realSalePrice: 0
    }
  }
  
  let totalCost = 0
  const items = productData.items || []
  
  // Validar que items sea un array
  if (!Array.isArray(items)) {
    return {
      totalCost: 0,
      profitMarginPercent: 0,
      profitMarginAmount: 0,
      suggestedPrice: 0,
      realSalePrice: 0
    }
  }
  
  // Calcular costo de ingredientes y recetas
  for (const item of items) {
    if (!item || !item.id) continue
    
    if (item.type === 'ingredient') {
      const ingredient = await getDocById(COLLECTIONS.ingredients, item.id)
      if (ingredient && ingredient.costWithWastage) {
        totalCost += ingredient.costWithWastage * parseFloat(item.quantity || 0)
      }
    } else if (item.type === 'recipe') {
      const recipe = await getDocById(COLLECTIONS.recipes, item.id)
      if (recipe && recipe.totalCost) {
        totalCost += recipe.totalCost * parseFloat(item.quantity || 1)
      }
    }
  }
  
  const profitMarginPercent = parseFloat(productData.profitMarginPercent || 0)
  const profitMarginAmount = totalCost * (profitMarginPercent / 100)
  const suggestedPrice = totalCost + profitMarginAmount
  const realSalePrice = parseFloat(productData.realSalePrice || suggestedPrice)
  
  return {
    totalCost,
    profitMarginPercent,
    profitMarginAmount,
    suggestedPrice,
    realSalePrice
  }
}

/**
 * Guarda producto
 */
export const saveProduct = async (product, id = null) => {
  try {
    const items = Array.isArray(product.items) ? product.items : []
    const productWithItems = { ...product, items }
    const metrics = await calculateProductMetrics(productWithItems)
    
    const productData = {
      ...productWithItems,
      ...metrics,
      updatedAt: new Date().toISOString()
    }
    
    return await saveDoc(COLLECTIONS.products, productData, id)
  } catch (error) {
    console.error('Error saving product:', error)
    throw error
  }
}

/**
 * Elimina producto
 */
export const deleteProduct = async (id) => {
  return await deleteDocument(COLLECTIONS.products, id)
}

/**
 * Obtiene todas las promociones/combos
 */
export const getPromotions = async () => {
  return await getAllDocs(COLLECTIONS.promotions)
}

/**
 * Calcula métricas inteligentes de un combo
 */
export const calculateComboMetrics = async (comboData) => {
  if (!comboData) {
    return {
      totalCost: 0,
      totalSuggestedPrice: 0,
      comboPrice: 0,
      discountAmount: 0,
      discountPercent: 0,
      profitAmount: 0,
      profitMarginPercent: 0,
      isLosing: false
    }
  }
  
  let totalCost = 0
  let totalSuggestedPrice = 0
  const items = comboData.items || []
  
  // Validar que items sea un array
  if (!Array.isArray(items)) {
    return {
      totalCost: 0,
      totalSuggestedPrice: 0,
      comboPrice: 0,
      discountAmount: 0,
      discountPercent: 0,
      profitAmount: 0,
      profitMarginPercent: 0,
      isLosing: false
    }
  }
  
  // Calcular costos y precios de productos e ingredientes
  for (const item of items) {
    if (!item || !item.id) continue
    
    const quantity = parseFloat(item.quantity || 1)
    
    if (item.type === 'product') {
      const product = await getDocById(COLLECTIONS.products, item.id)
      if (product && product.totalCost && product.realSalePrice) {
        totalCost += (product.totalCost || 0) * quantity
        totalSuggestedPrice += (product.realSalePrice || 0) * quantity
      }
    } else if (item.type === 'ingredient') {
      const ingredient = await getDocById(COLLECTIONS.ingredients, item.id)
      if (ingredient && ingredient.costWithWastage) {
        totalCost += ingredient.costWithWastage * quantity
        // Para ingredientes sueltos, aplicar margen estándar del 40%
        totalSuggestedPrice += ingredient.costWithWastage * 1.4 * quantity
      }
    }
  }
  
  const comboPrice = parseFloat(comboData.comboPrice || totalSuggestedPrice)
  const discountAmount = totalSuggestedPrice - comboPrice
  const discountPercent = totalSuggestedPrice > 0 ? (discountAmount / totalSuggestedPrice) * 100 : 0
  const profitAmount = comboPrice - totalCost
  const profitMarginPercent = comboPrice > 0 ? (profitAmount / comboPrice) * 100 : 0
  
  return {
    totalCost,
    totalSuggestedPrice,
    comboPrice,
    discountAmount,
    discountPercent,
    profitAmount,
    profitMarginPercent,
    isLosing: profitAmount < 0
  }
}

/**
 * Guarda combo/promoción
 */
export const savePromotion = async (promotion, id = null) => {
  try {
    const items = Array.isArray(promotion.items) ? promotion.items : []
    const promotionWithItems = { ...promotion, items }
    const metrics = await calculateComboMetrics(promotionWithItems)
    
    const promotionData = {
      ...promotionWithItems,
      ...metrics,
      updatedAt: new Date().toISOString()
    }
    
    return await saveDoc(COLLECTIONS.promotions, promotionData, id)
  } catch (error) {
    console.error('Error saving promotion:', error)
    throw error
  }
}

/**
 * Elimina promoción
 */
export const deletePromotion = async (id) => {
  return await deleteDocument(COLLECTIONS.promotions, id)
}

// Mantener compatibilidad con código existente (legacy)
export const saveSuppliers = async (suppliers) => {
  // Deprecated: usar saveSupplier individualmente
  console.warn('saveSuppliers is deprecated')
}

export const saveIngredients = async (ingredients) => {
  // Deprecated: usar saveIngredient individualmente
  console.warn('saveIngredients is deprecated')
}

export const saveRecipes = async (recipes) => {
  // Deprecated: usar saveRecipe individualmente
  console.warn('saveRecipes is deprecated')
}
export const savePromotions = (promotions) => {
  return saveToStorage('promotions', promotions)
}
