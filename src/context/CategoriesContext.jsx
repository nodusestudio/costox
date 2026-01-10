import { createContext, useContext, useState, useEffect } from 'react'
import { getCategories, saveCategory, deleteCategory } from '@/utils/storage'
import { showToast } from '@/utils/toast'

const CategoriesContext = createContext()

export const useCategories = () => {
  const context = useContext(CategoriesContext)
  if (!context) {
    throw new Error('useCategories must be used within CategoriesProvider')
  }
  return context
}

export const CategoriesProvider = ({ children }) => {
  const [categoriesRecipes, setCategoriesRecipes] = useState([])
  const [categoriesProducts, setCategoriesProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllCategories()
  }, [])

  const loadAllCategories = async () => {
    try {
      const [recipes, products] = await Promise.all([
        getCategories('recipes'),
        getCategories('products')
      ])
      setCategoriesRecipes(Array.isArray(recipes) ? recipes : [])
      setCategoriesProducts(Array.isArray(products) ? products : [])
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategoriesRecipes([])
      setCategoriesProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCategory = async (category, id = null, type = 'recipes') => {
    try {
      console.log('🔄 CategoriesContext: Iniciando guardado...', { category, id, type })
      const result = await saveCategory(category, id, type)
      console.log('🔄 CategoriesContext: Guardado exitoso, recargando categorías...')
      await loadAllCategories()
      showToast('✅ Categoría guardada', 'success')
      return true
    } catch (error) {
      console.error('❌ CategoriesContext: Error saving category:', error)
      showToast(`Error: ${error.message}`, 'error')
      return false
    }
  }

  const handleDeleteCategory = async (id, type = 'recipes') => {
    try {
      await deleteCategory(id, type)
      await loadAllCategories()
      showToast('🗑️ Categoría eliminada', 'success')
      return true
    } catch (error) {
      console.error('Error deleting category:', error)
      showToast('Error al eliminar categoría', 'error')
      return false
    }
  }

  return (
    <CategoriesContext.Provider
      value={{
        categoriesRecipes,
        categoriesProducts,
        loading,
        saveCategory: handleSaveCategory,
        deleteCategory: handleDeleteCategory,
        refreshCategories: loadAllCategories
      }}
    >
      {children}
    </CategoriesContext.Provider>
  )
}
