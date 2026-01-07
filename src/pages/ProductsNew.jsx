import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, TrendingUp, DollarSign } from 'lucide-react'
import { getProducts, saveProduct, deleteProduct, getIngredients, getRecipes } from '@/utils/storage'
import { formatMoneyDisplay, calcularCostoProporcional } from '@/utils/formatters'
import { showToast } from '@/utils/toast'
import Modal from '@/components/Modal'
import SearchSelect from '@/components/SearchSelect'
import Button from '@/components/Button'
import { useI18n } from '@/context/I18nContext'
import { useCategories } from '@/context/CategoriesContext'

export default function ProductsNew() {
  const { isDarkMode } = useI18n()
  const { categoriesProducts: categories, saveCategory, deleteCategory } = useCategories()
  const [products, setProducts] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryName, setCategoryName] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    items: [], // { type: 'ingredient' | 'recipe', id, quantity }
    laborCost: 0, // Mano de Obra (Operario)
    realSalePrice: 0, // Precio de Venta
  })
  const searchSelectRefs = useRef({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsData, ingredientsData, recipesData] = await Promise.all([
        getProducts(),
        getIngredients(),
        getRecipes()
      ])
      // Ordenar productos por campo order
      const sortedProducts = Array.isArray(productsData) 
        ? productsData.sort((a, b) => (a.order || 0) - (b.order || 0))
        : []
      setProducts(sortedProducts)
      setIngredients(Array.isArray(ingredientsData) ? ingredientsData : [])
      setRecipes(Array.isArray(recipesData) ? recipesData : [])
    } catch (error) {
      console.error('Error loading data:', error)
      setProducts([])
      setIngredients([])
      setRecipes([])
    }
    setLoading(false)
  }

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingId(product.id)
      setFormData({
        name: product.name || '',
        description: product.description || '',
        categoryId: product.categoryId || '',
        items: Array.isArray(product.items) ? product.items : [],
        laborCost: product.laborCost || 0,
        realSalePrice: product.realSalePrice || 0,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        categoryId: '',
        items: [],
        laborCost: 0,
        realSalePrice: 0,
      })
    }
    setShowModal(true)
  }

  const handleAddItem = (type) => {
    const currentItems = Array.isArray(formData.items) ? formData.items : []
    setFormData({
      ...formData,
      items: [...currentItems, { type, id: '', quantity: 1 }]
    })
  }

  const handleRemoveItem = (index) => {
    const currentItems = Array.isArray(formData.items) ? formData.items : []
    setFormData({
      ...formData,
      items: currentItems.filter((_, i) => i !== index)
    })
  }

  const handleItemChange = (index, field, value) => {
    const currentItems = Array.isArray(formData.items) ? formData.items : []
    const updated = [...currentItems]
    if (updated[index]) {
      updated[index][field] = value
    }
    setFormData({ ...formData, items: updated })
  }

  // Recalcular métricas de un producto guardado (sincronización con Excel)
  const recalculateProductMetrics = (product) => {
    try {
      const items = Array.isArray(product.items) ? product.items : []
      let costoIngredientes = 0

      items.forEach(item => {
        if (!item || !item.id) return
        
        if (item.type === 'ingredient-embalaje' || item.type === 'ingredient-receta' || item.type === 'ingredient') {
          const ing = ingredients.find(i => i.id === item.id)
          if (ing) {
            const cantidadUsada = parseFloat(item.quantity || 0)
            
            if (ing.costoPorGramo && ing.costoPorGramo > 0) {
              costoIngredientes += ing.costoPorGramo * cantidadUsada
            } 
            else if (ing.pesoEmpaqueTotal && ing.pesoEmpaqueTotal > 0 && ing.costWithWastage) {
              costoIngredientes += calcularCostoProporcional(
                ing.costWithWastage, 
                ing.pesoEmpaqueTotal, 
                cantidadUsada
              )
            } 
            else if (ing.costWithWastage) {
              costoIngredientes += ing.costWithWastage * cantidadUsada
            }
          }
        } else if (item.type === 'recipe') {
          const rec = recipes.find(r => r.id === item.id)
          if (rec) {
            const cantidadUsada = parseFloat(item.quantity || 0)
            if (rec.costoPorGramo && rec.costoPorGramo > 0) {
              costoIngredientes += rec.costoPorGramo * cantidadUsada
            } else if (rec.totalCost && rec.pesoTotal && rec.pesoTotal > 0) {
              const costoPorGramo = rec.totalCost / rec.pesoTotal
              costoIngredientes += costoPorGramo * cantidadUsada
            } else if (rec.totalCost && (!rec.pesoTotal || rec.pesoTotal === 0)) {
              // Fallback: si no hay peso, asumimos 1g para evitar división por cero
              costoIngredientes += rec.totalCost * cantidadUsada
            }
          }
        }
      })

      const manoDeObra = parseFloat(product.laborCost || 0)
      const costoTotal = costoIngredientes + manoDeObra
      const precioVenta = parseFloat(product.realSalePrice) || 0

      // Fórmula Excel: P-CONTRIBUCIÓN = (1 - Costo/Venta) * 100
      const pContribucion = precioVenta > 0 ? (1 - (costoTotal / precioVenta)) * 100 : 0
      const mContribucion = precioVenta - costoTotal

      return {
        ingredientsCost: costoIngredientes,
        totalCost: costoTotal,
        pContribucion: pContribucion,
        mContribucion: mContribucion
      }
    } catch (error) {
      console.error('Error calculando métricas:', error)
      return {
        ingredientsCost: 0,
        totalCost: 0,
        pContribucion: 0,
        mContribucion: 0
      }
    }
  }

  const calculateMetrics = () => {
    // Asegurar que items sea SIEMPRE un array
    const items = Array.isArray(formData.items) ? formData.items : []
    
    // ==========================================
    // MODELO EXCEL PROFESIONAL
    // ==========================================
    
    // COSTO INGREDIENTES: Σ (Cantidad_Usada * Costo_por_Gramo)
    let costoIngredientes = 0
    
    items.forEach(item => {
      if (!item || !item.id) return
      
      if (item.type === 'ingredient-embalaje' || item.type === 'ingredient-receta') {
        const ing = ingredients.find(i => i.id === item.id)
        if (ing) {
          const cantidadUsada = parseFloat(item.quantity || 0)
          
          // Cálculo correcto: dividir precio empaque entre peso empaque
          if (ing.costoPorGramo && ing.costoPorGramo > 0) {
            costoIngredientes += ing.costoPorGramo * cantidadUsada
          } 
          else if (ing.pesoEmpaqueTotal && ing.pesoEmpaqueTotal > 0 && ing.costWithWastage) {
            costoIngredientes += calcularCostoProporcional(
              ing.costWithWastage, 
              ing.pesoEmpaqueTotal, 
              cantidadUsada
            )
          } 
          else if (ing.costWithWastage) {
            costoIngredientes += ing.costWithWastage * cantidadUsada
          }
        }
      } else if (item.type === 'recipe') {
        const rec = recipes.find(r => r.id === item.id)
        if (rec) {
          const cantidadUsada = parseFloat(item.quantity || 0)
          
          // CORREGIDO: Usar costo proporcional por gramo (igual que ingredientes)
          if (rec.costoPorGramo && rec.costoPorGramo > 0) {
            costoIngredientes += rec.costoPorGramo * cantidadUsada
          } else if (rec.totalCost && rec.pesoTotal && rec.pesoTotal > 0) {
            // Calcular costo por gramo si no está precalculado
            const costoPorGramo = rec.totalCost / rec.pesoTotal
            costoIngredientes += costoPorGramo * cantidadUsada
          } else if (rec.totalCost && (!rec.pesoTotal || rec.pesoTotal === 0)) {
            // Validación: Si pesoTotal es 0 o nulo, usar valor por defecto 1g
            console.warn(`⚠️ Receta ${rec.name} tiene pesoTotal=0, usando valor por defecto 1g`)
            costoIngredientes += rec.totalCost * cantidadUsada
          }
        }
      }
    })

    // COSTO TOTAL (CT): Ingredientes + Mano de Obra
    const manoDeObra = parseFloat(formData.laborCost || 0)
    const costoTotal = costoIngredientes + manoDeObra
    
    // PRECIO DE VENTA (el usuario lo define)
    const precioVenta = parseFloat(formData.realSalePrice) || 0

    // P-CONTRIBUCIÓN (% Utilidad): (1 - Costo/Venta) * 100
    const pContribucion = precioVenta > 0 ? (1 - (costoTotal / precioVenta)) * 100 : 0
    
    // M-CONTRIBUCIÓN (Utilidad $): Precio Venta - Costo Total
    const mContribucion = precioVenta - costoTotal

    return {
      ingredientsCost: costoIngredientes,
      laborCost: manoDeObra,
      totalCost: costoTotal,
      realSalePrice: precioVenta,
      pContribucion: pContribucion, // Food Cost %
      mContribucion: mContribucion, // Utilidad $
      // Mantener compatibilidad con storage.js
      foodCostPercent: pContribucion,
      actualProfit: mContribucion
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre es requerido')
      return
    }

    try {
      await saveProduct(formData, editingId)
      showToast('✅ Guardado satisfactoriamente', 'success')
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Error saving product:', error)
      showToast('Error al guardar', 'error')
    }
  }

  const handleEnterAddRow = (type) => {
    const currentItems = Array.isArray(formData.items) ? formData.items : []
    const newIndex = currentItems.length
    setFormData({
      ...formData,
      items: [...currentItems, { type, id: '', quantity: 1 }]
    })
    // Focus en el nuevo SearchSelect después del render
    setTimeout(() => {
      const ref = searchSelectRefs.current[`${type}-${newIndex}`]
      if (ref?.focus) {
        ref.focus()
      }
    }, 100)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este producto?')) {
      try {
        await deleteProduct(id)
        await loadData()
      } catch (error) {
        console.error('Error deleting product:', error)
        alert('Error al eliminar')
      }
    }
  }

  const handleDuplicate = async (product) => {
    try {
      const duplicated = {
        ...product,
        name: `${product.name} (Copia)`,
      }
      delete duplicated.id
      await saveProduct(duplicated)
      showToast('✅ Producto duplicado exitosamente', 'success')
      await loadData()
    } catch (error) {
      console.error('Error duplicating product:', error)
      showToast('Error al duplicar', 'error')
    }
  }

  const handleDragStart = (e, product) => {
    setDraggedItem(product)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetProduct) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem.id === targetProduct.id) {
      setDraggedItem(null)
      return
    }

    // Reordenar solo dentro de la misma categoría
    if (draggedItem.categoryId !== targetProduct.categoryId) {
      setDraggedItem(null)
      return
    }

    try {
      const filtered = selectedCategoryFilter
        ? products.filter(p => p.categoryId === selectedCategoryFilter)
        : products
      
      const draggedIndex = filtered.findIndex(p => p.id === draggedItem.id)
      const targetIndex = filtered.findIndex(p => p.id === targetProduct.id)
      
      const reordered = [...filtered]
      const [removed] = reordered.splice(draggedIndex, 1)
      reordered.splice(targetIndex, 0, removed)
      
      // Asignar nuevos índices
      const updates = reordered.map((product, index) => 
        saveProduct({ ...product, order: index }, product.id)
      )
      
      await Promise.all(updates)
      await loadData()
      showToast('✅ Orden actualizado', 'success')
    } catch (error) {
      console.error('Error reordering:', error)
      showToast('Error al reordenar', 'error')
    } finally {
      setDraggedItem(null)
    }
  }

  const handleDropCategory = async (e, categoryId) => {
    e.preventDefault()
    
    if (!draggedItem) return
    
    const product = products.find(p => p.id === draggedItem.id)
    
    if (product && product.categoryId !== categoryId) {
      try {
        await saveProduct({ ...product, categoryId: categoryId || '' }, draggedItem.id)
        showToast('✅ Producto movido a categoría', 'success')
        await loadData()
      } catch (error) {
        console.error('Error moving product:', error)
        showToast('Error al mover', 'error')
      }
    }
    setDraggedItem(null)
  }

  const metrics = calculateMetrics()

  // Filtrar productos por categoría
  const filteredProducts = selectedCategoryFilter
    ? products.filter(p => p.categoryId === selectedCategoryFilter)
    : products

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Cargando...</p>
      </div>
    )
  }

  return (
    <div className={`p-4 md:p-6 space-y-6 ${isDarkMode ? 'bg-[#111827]' : 'bg-white'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Productos
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Cálculo automático de costos, márgenes y precios
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-3 bg-primary-blue hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg font-medium"
        >
          <Plus size={20} />
          Nuevo Producto
        </button>
      </div>

      {/* Pestañas de Categoría */}
      <div className={`flex gap-2 items-center border-b-2 pb-3 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <button
          onClick={() => setSelectedCategoryFilter(null)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropCategory(e, null)}
          className={`px-6 py-2 font-semibold transition-all border-b-4 ${
            selectedCategoryFilter === null
              ? 'border-primary-blue text-primary-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Todas
        </button>
        {categories.map(cat => (
          <div key={cat.id} className="relative group">
            <button
              onClick={() => setSelectedCategoryFilter(cat.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropCategory(e, cat.id)}
              className={`px-6 py-2 font-semibold transition-all border-b-4 ${
                selectedCategoryFilter === cat.id
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat.name}
            </button>
            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingCategory(cat)
                  setCategoryName(cat.name)
                  setShowCategoryModal(true)
                }}
                className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg"
                title="Editar categoría"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
                    deleteCategory(cat.id, 'products')
                    setSelectedCategoryFilter(null)
                  }
                }}
                className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                title="Eliminar categoría"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => {
            setEditingCategory(null)
            setCategoryName('')
            setShowCategoryModal(true)
          }}
          className="ml-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          + Categoría
        </button>
      </div>

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(filteredProducts ?? []).map(product => {
          const recalculated = recalculateProductMetrics(product)
          return (
          <div 
            key={product.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, product)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, product)}
            className={`p-4 rounded-xl border cursor-move ${
              isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {product.name}
                </h3>
                {product.categoryId && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                    {categories.find(c => c.id === product.categoryId)?.name || 'Sin categoría'}
                  </span>
                )}
                {product.description && (
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {product.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleDuplicate(product)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'hover:bg-[#111827] text-green-400'
                      : 'hover:bg-gray-100 text-green-600'
                  }`}
                  title="Duplicar producto"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() => handleOpenModal(product)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'hover:bg-[#111827] text-blue-400'
                      : 'hover:bg-gray-100 text-blue-600'
                  }`}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'hover:bg-[#111827] text-red-400'
                      : 'hover:bg-gray-100 text-red-600'
                  }`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Ingredientes
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {formatMoneyDisplay(recalculated.ingredientsCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Mano de Obra
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                  {formatMoneyDisplay(product.laborCost || 0)}
                </span>
              </div>
              <div className={`flex justify-between text-sm pt-2 border-t ${
                isDarkMode ? 'border-gray-700' : 'border-gray-300'
              }`}>
                <span className={`font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  COSTO UNIDAD (CT)
                </span>
                <span className={`font-bold text-xl ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {formatMoneyDisplay(recalculated.totalCost)}
                </span>
              </div>
            </div>

            <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-2`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  💵 Precio de Venta
                </span>
                <span className={`font-bold text-2xl ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatMoneyDisplay(product.realSalePrice || 0)}
                </span>
              </div>
              
              {/* P-CONTRIBUCIÓN (% Utilidad) */}
              <div className={`mt-2 p-3 rounded-lg border-2 ${
                recalculated.pContribucion < 30
                  ? isDarkMode ? 'bg-red-900/40 border-red-600' : 'bg-red-100 border-red-400'
                  : isDarkMode ? 'bg-green-900/40 border-green-700' : 'bg-green-100 border-green-400'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    P-CONTRIBUCIÓN
                  </span>
                  <span className={`text-2xl font-black ${
                    recalculated.pContribucion < 30
                      ? isDarkMode ? 'text-red-400' : 'text-red-600'
                      : isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    {recalculated.pContribucion.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* M-CONTRIBUCIÓN (Utilidad $) */}
              <div className={`p-3 rounded-lg ${
                recalculated.mContribucion >= 0
                  ? isDarkMode ? 'bg-green-900/40' : 'bg-green-100'
                  : isDarkMode ? 'bg-red-900/40' : 'bg-red-100'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    M-CONTRIBUCIÓN
                  </span>
                  <span className={`text-xl font-black ${
                    recalculated.mContribucion >= 0
                      ? isDarkMode ? 'text-green-400' : 'text-green-600'
                      : isDarkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {formatMoneyDisplay(recalculated.mContribucion)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${
          isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
            {products.length === 0 
              ? 'No hay productos registrados'
              : 'No hay productos en esta categoría'
            }
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          titleInput={
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-transparent border-none text-2xl font-bold text-white placeholder-gray-500 focus:outline-none"
              placeholder="📝 Escribe el nombre de tu producto aquí..."
            />
          }
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-6 pb-6">
            {/* HEADER COMPACTO: Precio de Venta */}
            <div className={`p-2 rounded-xl border-2 ${
              isDarkMode 
                ? 'bg-gradient-to-br from-green-950 to-gray-900 border-green-700' 
                : 'bg-gradient-to-br from-green-50 to-white border-green-300'
            }`}>
              {/* Precio de Venta Centrado */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <label className={`text-xs font-bold ${
                  isDarkMode ? 'text-green-300' : 'text-green-700'
                }`}>
                  💵 PRECIO DE VENTA:
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.realSalePrice}
                  onChange={(e) => setFormData({ ...formData, realSalePrice: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className={`w-40 px-3 py-1 rounded-lg border-2 font-black text-center ${
                    isDarkMode
                      ? 'bg-[#0a2818] border-green-500 text-green-300'
                      : 'bg-white border-green-500 text-green-700'
                  }`}
                  style={{ fontSize: '2rem' }}
                  placeholder="$ 0"
                />
              </div>

              {/* Tres Cajas de Métricas - MÁS COMPACTAS */}
              <div className="grid grid-cols-3 gap-2">
                {/* Costo Unidad */}
                <div className={`p-2 rounded-lg text-center ${
                  isDarkMode ? 'bg-blue-950/50 border border-blue-700' : 'bg-blue-50 border border-blue-300'
                }`}>
                  <div className={`text-xs font-bold mb-1 ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    COSTO
                  </div>
                  <div className={`text-lg font-black ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    {formatMoneyDisplay(metrics.totalCost)}
                  </div>
                </div>

                {/* P-Contribución (Food Cost %) - SIN ALERTAS ROJAS */}
                <div className={`p-2 rounded-lg text-center ${
                  isDarkMode ? 'bg-gray-800/50 border border-gray-600' : 'bg-gray-100 border border-gray-300'
                }`}>
                  <div className={`text-xs font-bold mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    P-CONTRIB.
                  </div>
                  <div className={`text-lg font-black ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {metrics.pContribucion.toFixed(1)}%
                  </div>
                </div>

                {/* M-Contribución (Utilidad $) */}
                <div className={`p-2 rounded-lg text-center ${
                  isDarkMode ? 'bg-purple-950/50 border border-purple-700' : 'bg-purple-50 border border-purple-300'
                }`}>
                  <div className={`text-xs font-bold mb-1 ${
                    isDarkMode ? 'text-purple-300' : 'text-purple-700'
                  }`}>
                    M-CONTRIB.
                  </div>
                  <div className={`text-lg font-black ${
                    isDarkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}>
                    {formatMoneyDisplay(metrics.mContribucion)}
                  </div>
                </div>
              </div>
            </div>

            {/* DOBLE BLOQUE DE INSUMOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Bloque 1: EMBALAJE */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-bold ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    📦 EMBALAJE
                  </h4>
                  <button
                    onClick={() => {
                      const updatedItems = [...(formData.items || [])]
                      updatedItems.push({ type: 'ingredient-embalaje', id: '', quantity: 0 })
                      setFormData({ ...formData, items: updatedItems })
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium"
                  >
                    + Ingrediente
                  </button>
                </div>

                <div className={`rounded-lg border ${
                  isDarkMode ? 'bg-[#0a0e1a] border-gray-700' : 'bg-gray-50 border-gray-300'
                }`}>
                  {/* Cabecera de Tabla */}
                  <div className={`grid grid-cols-12 gap-2 p-3 border-b font-bold text-xs ${
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-200 border-gray-300 text-gray-700'
                  }`}>
                    <div className="col-span-6">NOMBRE</div>
                    <div className="col-span-3 text-center">CANTIDAD</div>
                    <div className="col-span-3 text-right">COSTO</div>
                  </div>

                  {/* Lista de Ingredientes */}
                  <div className="max-h-[300px] overflow-y-auto">
                    {(formData.items ?? [])
                      .filter(item => item.type === 'ingredient-embalaje')
                      .map((item, index) => {
                        const ing = ingredients.find(i => i.id === item.id)
                        const cantidadUsada = parseFloat(item.quantity || 0)
                        let costoProporcional = 0

                        if (ing) {
                          if (ing.costoPorGramo && ing.costoPorGramo > 0) {
                            costoProporcional = ing.costoPorGramo * cantidadUsada
                          } else if (ing.pesoEmpaqueTotal && ing.pesoEmpaqueTotal > 0 && ing.costWithWastage) {
                            costoProporcional = calcularCostoProporcional(
                              ing.costWithWastage,
                              ing.pesoEmpaqueTotal,
                              cantidadUsada
                            )
                          } else if (ing.costWithWastage) {
                            costoProporcional = ing.costWithWastage * cantidadUsada
                          }
                        }

                        return (
                          <div key={index} className={`flex gap-2 p-3 border-b text-sm ${
                            isDarkMode ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-100'
                          }`}>
                            <div style={{ width: '75%' }} className={`flex items-center ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <SearchSelect
                                ref={(el) => searchSelectRefs.current[`ingredient-embalaje-${index}`] = el}
                                options={ingredients}
                                value={item.id}
                                onChange={(value) => handleItemChange(
                                  (formData.items ?? []).indexOf(item),
                                  'id',
                                  value
                                )}
                                displayKey="name"
                                placeholder="Seleccionar..."
                                className="w-full"
                              />
                            </div>
                            <div style={{ width: '12.5%' }} className="flex items-center">
                              <input
                                type="number"
                                step="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(
                                  (formData.items ?? []).indexOf(item),
                                  'quantity',
                                  parseFloat(e.target.value)
                                )}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleEnterAddRow('ingredient-embalaje')
                                  }
                                }}
                                className={`w-full px-2 py-1 rounded border text-center text-xs ${
                                  isDarkMode
                                    ? 'bg-[#111827] border-gray-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                placeholder="0"
                              />
                            </div>
                            <div style={{ width: '12.5%' }} className={`flex items-center justify-end gap-1 ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <span className="font-semibold text-xs truncate">{formatMoneyDisplay(costoProporcional)}</span>
                              <button
                                onClick={() => handleRemoveItem((formData.items ?? []).indexOf(item))}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded flex-shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )
                      })}

                    {(formData.items ?? []).filter(item => item.type === 'ingredient-embalaje').length === 0 && (
                      <div className={`text-center py-8 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        <p className="text-xs">Sin ingredientes</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloque 2: RECETAS / INGREDIENTES */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-bold ${
                    isDarkMode ? 'text-purple-300' : 'text-purple-700'
                  }`}>
                    🍖 RECETAS / INGREDIENTES
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const updatedItems = [...(formData.items || [])]
                        updatedItems.push({ type: 'ingredient-receta', id: '', quantity: 0 })
                        setFormData({ ...formData, items: updatedItems })
                      }}
                      className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium"
                    >
                      + Ing
                    </button>
                    <button
                      onClick={() => handleAddItem('recipe')}
                      className="px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium"
                    >
                      + Receta
                    </button>
                  </div>
                </div>

                <div className={`rounded-lg border ${
                  isDarkMode ? 'bg-[#0a0e1a] border-gray-700' : 'bg-gray-50 border-gray-300'
                }`}>
                  {/* Cabecera de Tabla */}
                  <div className={`flex gap-2 p-3 border-b font-bold text-xs ${
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-200 border-gray-300 text-gray-700'
                  }`}>
                    <div style={{ width: '75%' }}>NOMBRE</div>
                    <div style={{ width: '12.5%' }} className="text-center">CANT</div>
                    <div style={{ width: '12.5%' }} className="text-right">COSTO</div>
                  </div>

                  {/* Lista de Ingredientes y Recetas */}
                  <div className="max-h-[300px] overflow-y-auto">
                    {(formData.items ?? [])
                      .filter(item => item.type === 'recipe' || item.type === 'ingredient-receta')
                      .map((item, index) => {
                        let itemData, costoProporcional = 0
                        const cantidadUsada = parseFloat(item.quantity || 1)

                        if (item.type === 'ingredient-receta') {
                          itemData = ingredients.find(i => i.id === item.id)
                          if (itemData) {
                            if (itemData.costoPorGramo && itemData.costoPorGramo > 0) {
                              costoProporcional = itemData.costoPorGramo * cantidadUsada
                            } else if (itemData.pesoEmpaqueTotal && itemData.pesoEmpaqueTotal > 0 && itemData.costWithWastage) {
                              costoProporcional = calcularCostoProporcional(
                                itemData.costWithWastage,
                                itemData.pesoEmpaqueTotal,
                                cantidadUsada
                              )
                            } else if (itemData.costWithWastage) {
                              costoProporcional = itemData.costWithWastage * cantidadUsada
                            }
                          }
                        } else {
                          itemData = recipes.find(r => r.id === item.id)
                          if (itemData) {
                            // CORREGIDO: Usar costo proporcional por gramo
                            if (itemData.costoPorGramo && itemData.costoPorGramo > 0) {
                              costoProporcional = itemData.costoPorGramo * cantidadUsada
                            } else if (itemData.totalCost && itemData.pesoTotal && itemData.pesoTotal > 0) {
                              // Calcular costo por gramo si no está precalculado
                              const costoPorGramo = itemData.totalCost / itemData.pesoTotal
                              costoProporcional = costoPorGramo * cantidadUsada
                            } else if (itemData.totalCost && (!itemData.pesoTotal || itemData.pesoTotal === 0)) {
                              // Validación: Si pesoTotal es 0 o nulo, usar valor por defecto 1g
                              console.warn(`⚠️ Receta ${itemData.name} tiene pesoTotal=0, usando valor por defecto 1g`)
                              costoProporcional = itemData.totalCost * cantidadUsada
                            }
                          }
                        }

                        return (
                          <div key={index} className={`flex gap-2 p-3 border-b text-sm ${
                            isDarkMode ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-100'
                          }`}>
                            <div style={{ width: '75%' }} className={`flex items-center ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <SearchSelect
                                ref={(el) => searchSelectRefs.current[`${item.type}-${index}`] = el}
                                options={item.type === 'ingredient-receta' ? ingredients : recipes}
                                value={item.id}
                                onChange={(value) => handleItemChange(
                                  (formData.items ?? []).indexOf(item),
                                  'id',
                                  value
                                )}
                                displayKey="name"
                                placeholder="Seleccionar..."
                                className="w-full"
                              />
                            </div>
                            <div style={{ width: '12.5%' }} className="flex items-center">
                              <input
                                type="number"
                                step="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(
                                  (formData.items ?? []).indexOf(item),
                                  'quantity',
                                  parseFloat(e.target.value)
                                )}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleEnterAddRow(item.type)
                                  }
                                }}
                                className={`w-full px-2 py-1 rounded border text-center text-xs ${
                                  isDarkMode
                                    ? 'bg-[#111827] border-gray-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                                placeholder="0"
                              />
                            </div>
                            <div style={{ width: '12.5%' }} className={`flex items-center justify-end gap-1 ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <span className="font-semibold text-xs truncate">{formatMoneyDisplay(costoProporcional)}</span>
                              <button
                                onClick={() => handleRemoveItem((formData.items ?? []).indexOf(item))}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded flex-shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )
                      })}

                    {(formData.items ?? []).filter(item => item.type === 'recipe' || item.type === 'ingredient-receta').length === 0 && (
                      <div className={`text-center py-8 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        <p className="text-xs">Sin recetas ni ingredientes</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* MANO DE OBRA */}
            <div className={`p-4 rounded-lg border ${
              isDarkMode ? 'bg-orange-950/50 border-orange-700' : 'bg-orange-50 border-orange-300'
            }`}>
              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className={`block text-sm font-bold ${
                    isDarkMode ? 'text-orange-300' : 'text-orange-700'
                  }`}>
                    👷 OPERARIO (Mano de Obra)
                  </label>
                  <p className={`text-xs mt-1 ${
                    isDarkMode ? 'text-orange-400' : 'text-orange-600'
                  }`}>
                    Costo fijo de operación
                  </p>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.laborCost}
                  onChange={(e) => setFormData({ ...formData, laborCost: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className={`px-4 py-3 rounded-lg border-2 font-bold text-xl text-center ${
                    isDarkMode
                      ? 'bg-[#1f2937] border-orange-600 text-orange-300'
                      : 'bg-white border-orange-500 text-orange-700'
                  }`}
                  placeholder="$ 0"
                />
              </div>
            </div>

            {/* Descripción - Movida al final */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                📝 Descripción (Opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                rows="2"
                placeholder="Detalles adicionales..."
              />
            </div>

            {/* Categoría */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                🏷️ Categoría (Opcional)
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Sin categoría</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-3 pt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium"
              >
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Categoría */}
      {showCategoryModal && (
        <Modal
          title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
          onClose={() => setShowCategoryModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Nombre de la Categoría
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && categoryName.trim()) {
                    saveCategory({ name: categoryName.trim() }, editingCategory?.id, 'products')
                    setShowCategoryModal(false)
                  }
                }}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Ej: Bebidas, Postres, Principales..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (categoryName.trim()) {
                    saveCategory({ name: categoryName.trim() }, editingCategory?.id, 'products')
                    setShowCategoryModal(false)
                  }
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
              >
                {editingCategory ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
