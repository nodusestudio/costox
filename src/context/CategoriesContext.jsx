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
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCategory = async (category, id = null) => {
    try {
      await saveCategory(category, id)
      await loadCategories()
      showToast('✅ Categoría guardada', 'success')
      return true
    } catch (error) {
      console.error('Error saving category:', error)
      showToast('Error al guardar categoría', 'error')
      return false
    }
  }

  const handleDeleteCategory = async (id) => {
    try {
      await deleteCategory(id)
      await loadCategories()
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
        categories,
        loading,
        saveCategory: handleSaveCategory,
        deleteCategory: handleDeleteCategory,
        refreshCategories: loadCategories
      }}
    >
      {children}
    </CategoriesContext.Provider>
  )
}
