import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle, TrendingUp, TrendingDown, Upload, Download } from 'lucide-react'
import { getPromotions, savePromotion, deletePromotion, getProducts, getIngredients } from '@/utils/storage'
import { formatMoneyDisplay, calcularCostoProporcional } from '@/utils/formatters'
import { showToast } from '@/utils/toast'
import Modal from '@/components/Modal'
import SearchSelect from '@/components/SearchSelect'
import Button from '@/components/Button'
import { useI18n } from '@/context/I18nContext'
import { useCategories } from '@/context/CategoriesContext'
import * as XLSX from 'xlsx'

export default function PromotionsNew() {
  const { isDarkMode } = useI18n()
  const { categoriesPromotions: categories, saveCategory, deleteCategory } = useCategories()
  const [promotions, setPromotions] = useState([])
  const [products, setProducts] = useState([])
  const [ingredients, setIngredients] = useState([])
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
    items: [], // { type: 'product' | 'ingredient', id, quantity }
    comboPrice: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [promotionsData, productsData, ingredientsData] = await Promise.all([
        getPromotions(),
        getProducts(),
        getIngredients()
      ])
      const sortedPromotions = Array.isArray(promotionsData) 
        ? promotionsData.sort((a, b) => (a.order || 0) - (b.order || 0))
        : []
      setPromotions(sortedPromotions)
      setProducts(Array.isArray(productsData) ? productsData : [])
      setIngredients(Array.isArray(ingredientsData) ? ingredientsData : [])
    } catch (error) {
      console.error('Error loading data:', error)
      setPromotions([])
      setProducts([])
      setIngredients([])
    }
    setLoading(false)
  }

  const handleOpenModal = (promotion = null) => {
    if (promotion) {
      setEditingId(promotion.id)
      setFormData({
        name: promotion.name || '',
        description: promotion.description || '',
        categoryId: promotion.categoryId || '',
        items: Array.isArray(promotion.items) ? promotion.items : [],
        comboPrice: promotion.comboPrice || 0,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        categoryId: '',
        items: [],
        comboPrice: 0,
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

  // Recalcular métricas de productos para obtener costo real (CT = Ingredientes + Mano de Obra)
  const recalculateProductMetrics = (product) => {
    try {
      // Si el producto ya tiene totalCost guardado, usarlo directamente
      if (product.totalCost !== undefined && product.totalCost > 0) {
        return {
          totalCost: parseFloat(product.totalCost) || 0,
          realSalePrice: parseFloat(product.realSalePrice) || 0
        }
      }

      // Si no tiene totalCost, calcularlo desde los items
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
        }
        // Las recetas no se usan típicamente en productos, pero por compatibilidad:
        else if (item.type === 'recipe') {
          // Nota: recipes no está disponible en este contexto, solo ingredients y products
          console.warn('Recipes not supported in product calculation within promotions')
        }
      })

      const manoDeObra = parseFloat(product.laborCost || 0)
      const costoTotal = costoIngredientes + manoDeObra
      const precioVenta = parseFloat(product.realSalePrice) || 0

      return {
        totalCost: costoTotal,
        realSalePrice: precioVenta
      }
    } catch (error) {
      console.error('Error recalculando métricas de producto:', error)
      return {
        totalCost: parseFloat(product.totalCost) || 0,
        realSalePrice: parseFloat(product.realSalePrice) || 0
      }
    }
  }

  const calculateMetrics = () => {
    let totalCost = 0
    let totalSuggestedPrice = 0
    const items = formData.items || []

    // Validar que sea un array
    if (!Array.isArray(items)) {
      return {
        totalCost: 0,
        totalSuggestedPrice: 0,
        comboPrice: 0,
        discountAmount: 0,
        discountPercent: 0,
        profitAmount: 0,
        profitMarginPercent: 0,
        isLosing: false,
        isLowMargin: false
      }
    }

    items.forEach(item => {
      if (!item || !item.id) return
      
      const quantity = parseFloat(item.quantity || 1)
      
      if (item.type === 'product') {
        const prod = products.find(p => p.id === item.id)
        if (prod) {
          // Recalcular métricas para obtener el costo real actualizado
          const metrics = recalculateProductMetrics(prod)
          totalCost += (metrics.totalCost || 0) * quantity
          totalSuggestedPrice += (metrics.realSalePrice || 0) * quantity
        }
      } else {
        const ing = ingredients.find(i => i.id === item.id)
        if (ing) {
          let costoProporcional = 0
          
          // Usar costoPorGramo si está disponible (recomendado)
          if (ing.costoPorGramo && ing.costoPorGramo > 0) {
            costoProporcional = ing.costoPorGramo * quantity
          } 
          // Fallback 1: Calcular usando pesoEmpaqueTotal
          else if (ing.pesoEmpaqueTotal && ing.pesoEmpaqueTotal > 0 && ing.costWithWastage) {
            costoProporcional = calcularCostoProporcional(
              ing.costWithWastage, 
              ing.pesoEmpaqueTotal, 
              quantity
            )
          } 
          // Fallback 2: Ingredientes muy antiguos
          else if (ing.costWithWastage) {
            costoProporcional = ing.costWithWastage * quantity
          }
          
          totalCost += costoProporcional
          totalSuggestedPrice += costoProporcional * 1.4 // Margen 40%
        }
      }
    })

    const comboPrice = parseFloat(formData.comboPrice) || totalSuggestedPrice
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
      isLosing: profitAmount < 0,
      isLowMargin: profitMarginPercent < 20
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre es requerido')
      return
    }

    if (!Array.isArray(formData.items) || formData.items.length === 0) {
      alert('Debe agregar al menos un item al combo')
      return
    }

    const metrics = calculateMetrics()
    if (metrics.isLosing) {
      if (!window.confirm('⚠️ Este combo generará PÉRDIDAS. ¿Desea continuar?')) {
        return
      }
    }

    try {
      await savePromotion(formData, editingId)
      showToast('✅ Guardado satisfactoriamente', 'success')
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Error saving promotion:', error)
      showToast('Error al guardar', 'error')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este combo?')) {
      try {
        await deletePromotion(id)
        await loadData()
      } catch (error) {
        console.error('Error deleting promotion:', error)
        alert('Error al eliminar')
      }
    }
  }

  const handleDuplicate = async (promotion) => {
    try {
      const duplicated = {
        ...promotion,
        name: `${promotion.name} (Copia)`,
      }
      delete duplicated.id
      await savePromotion(duplicated)
      showToast('✅ Combo duplicado exitosamente', 'success')
      await loadData()
    } catch (error) {
      console.error('Error duplicating promotion:', error)
      showToast('Error al duplicar', 'error')
    }
  }

  const handleDragStart = (e, promotion) => {
    setDraggedItem(promotion)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetPromotion) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem.id === targetPromotion.id) {
      setDraggedItem(null)
      return
    }

    // Reordenar solo dentro de la misma categoría
    if (draggedItem.categoryId !== targetPromotion.categoryId) {
      setDraggedItem(null)
      return
    }

    try {
      const filtered = selectedCategoryFilter
        ? promotions.filter(p => p.categoryId === selectedCategoryFilter)
        : promotions
      
      const draggedIndex = filtered.findIndex(p => p.id === draggedItem.id)
      const targetIndex = filtered.findIndex(p => p.id === targetPromotion.id)
      
      const reordered = [...filtered]
      const [removed] = reordered.splice(draggedIndex, 1)
      reordered.splice(targetIndex, 0, removed)
      
      // Asignar nuevos índices
      const updates = reordered.map((promotion, index) => 
        savePromotion({ ...promotion, order: index }, promotion.id)
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
    
    const promotion = promotions.find(p => p.id === draggedItem.id)
    
    if (promotion && promotion.categoryId !== categoryId) {
      try {
        await savePromotion({ ...promotion, categoryId: categoryId || '' }, draggedItem.id)
        showToast('✅ Combo movido a categoría', 'success')
        await loadData()
      } catch (error) {
        console.error('Error moving promotion:', error)
        showToast('Error al mover', 'error')
      }
    }
    setDraggedItem(null)
  }

  const handleExportExcel = () => {
    try {
      const exportData = promotions.map((promo, index) => {
        try {
          const categoryName = categories.find(c => c.id === promo.categoryId)?.name || 'Sin categoría'
          const metrics = calculatePromotionMetrics(promo)
          
          const totalCost = parseFloat(metrics.totalCost) || 0
          const comboPrice = parseFloat(promo.comboPrice || metrics.totalSuggestedPrice) || 0
          const profitMarginPercent = parseFloat(metrics.profitMarginPercent) || 0
          const profitMarginValue = parseFloat(metrics.profitMarginValue) || 0
          
          return {
            'Nombre': promo.name || 'Sin nombre',
            'Descripción': promo.description || '',
            'Categoría': categoryName,
            'Costo Total': totalCost.toFixed(2),
            'Precio Combo': comboPrice.toFixed(2),
            'Margen %': profitMarginPercent.toFixed(2),
            'Utilidad $': profitMarginValue.toFixed(2),
            'Estado': promo.isLosing ? 'Perdiendo' : profitMarginPercent < 20 ? 'Margen bajo' : 'Normal'
          }
        } catch (itemError) {
          console.error(`Error exportando promoción en índice ${index}:`, promo.name, itemError)
          return {
            'Nombre': promo.name || 'Sin nombre',
            'Descripción': 'Error al exportar',
            'Categoría': '',
            'Costo Total': '0.00',
            'Precio Combo': '0.00',
            'Margen %': '0.00',
            'Utilidad $': '0.00',
            'Estado': 'Error'
          }
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Promociones')
      
      const fileName = `Promociones_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
      
      showToast('✅ Promociones exportadas exitosamente', 'success')
    } catch (error) {
      console.error('Error crítico al exportar promociones:', error)
      showToast('❌ Error al exportar promociones', 'error')
    }
  }

  const handleImportExcel = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        if (!jsonData.length) {
          showToast('❌ Archivo vacío', 'error')
          return
        }

        // Validar formato
        const firstRow = jsonData[0]
        if (!firstRow['Nombre']) {
          showToast('❌ Formato de archivo no válido', 'error')
          return
        }

        let imported = 0
        for (const row of jsonData) {
          const categoryName = row['Categoría'] || ''
          let categoryId = ''
          
          if (categoryName && categoryName !== 'Sin categoría') {
            const existingCategory = categories.find(c => c.name === categoryName)
            if (existingCategory) {
              categoryId = existingCategory.id
            } else {
              const newCategory = { name: categoryName }
              const result = await saveCategory(newCategory, null, 'promotions')
              if (result) {
                categoryId = result.id || ''
              }
            }
          }

          const newPromotion = {
            name: row['Nombre'] || 'Promoción sin nombre',
            description: row['Descripción'] || '',
            categoryId: categoryId,
            items: [],
            comboPrice: parseFloat(row['Precio Combo']) || 0,
            order: promotions.length + imported
          }

          await savePromotion(newPromotion)
          imported++
        }

        showToast(`✅ ${imported} promociones importadas`, 'success')
        await loadData()
      } catch (error) {
        console.error('Error importing promotions:', error)
        showToast('❌ Formato de archivo no válido', 'error')
      }
    }

    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const calculatePromotionMetrics = (promo) => {
    let totalCost = 0
    let totalSuggestedPrice = 0

    const items = Array.isArray(promo.items) ? promo.items : []
    items.forEach(item => {
      if (item.type === 'product') {
        const product = products.find(p => p.id === item.id)
        if (product) {
          const quantity = parseInt(item.quantity) || 1
          // Usar recalculateProductMetrics para obtener el costo total real
          const metrics = recalculateProductMetrics(product)
          totalCost += (metrics.totalCost || 0) * quantity
          totalSuggestedPrice += (metrics.realSalePrice || 0) * quantity
        }
      } else if (item.type === 'ingredient') {
        const ing = ingredients.find(i => i.id === item.id)
        if (ing) {
          const quantity = parseInt(item.quantity) || 1
          const costWithWastage = ing.costWithWastage || 0
          totalCost += costWithWastage * quantity
          totalSuggestedPrice += costWithWastage * quantity * 1.3
        }
      }
    })

    const comboPrice = promo.comboPrice || totalSuggestedPrice
    const profitMarginValue = comboPrice - totalCost
    const profitMarginPercent = comboPrice > 0 ? (profitMarginValue / comboPrice) * 100 : 0
    const isLosing = profitMarginValue < 0

    return {
      totalCost,
      totalSuggestedPrice,
      comboPrice,
      profitMarginValue,
      profitMarginPercent,
      isLosing
    }
  }

  const metrics = calculateMetrics()

  // Filtrar promociones por categoría
  const filteredPromotions = selectedCategoryFilter
    ? promotions.filter(p => p.categoryId === selectedCategoryFilter)
    : promotions

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
            Combos / Promociones
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Análisis inteligente de descuentos y márgenes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg font-medium cursor-pointer">
            <Upload size={20} />
            📥 Importar Excel
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg font-medium"
          >
            <Download size={20} />
            📤 Exportar Excel
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-3 bg-primary-blue hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg font-medium"
          >
            <Plus size={20} />
            Nuevo Combo
          </button>
        </div>
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
                    deleteCategory(cat.id, 'promotions', 'promotions')
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

      {/* Grid de Combos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(filteredPromotions || []).map(promo => (
          <div 
            key={promo.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, promo)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, promo)}
            className={`p-4 rounded-xl border cursor-move ${
              promo.isLosing
                ? 'border-red-500 bg-red-900/10'
                : promo.profitMarginPercent < 20
                ? 'border-yellow-500 bg-yellow-900/10'
                : isDarkMode
                ? 'bg-[#1f2937] border-gray-700'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {promo.name}
                  </h3>
                  {promo.isLosing && (
                    <AlertTriangle size={18} className="text-red-500" />
                  )}
                </div>
                {promo.categoryId && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                    {categories.find(c => c.id === promo.categoryId)?.name || 'Sin categoría'}
                  </span>
                )}
                {promo.description && (
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {promo.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleDuplicate(promo)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'hover:bg-[#111827] text-green-400'
                      : 'hover:bg-gray-100 text-green-600'
                  }`}
                  title="Duplicar combo"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() => handleOpenModal(promo)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'hover:bg-[#111827] text-blue-400'
                      : 'hover:bg-gray-100 text-blue-600'
                  }`}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(promo.id)}
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

            <div className="space-y-2 text-sm mb-3">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Precio Normal
                </span>
                <span className="line-through">
                  {formatMoneyDisplay(promo.totalSuggestedPrice || 0)}
                </span>
              </div>

              {promo.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Descuento
                  </span>
                  <span className="text-yellow-500 font-semibold">
                    -{formatMoneyDisplay(promo.discountAmount)} ({promo.discountPercent?.toFixed(1)}%)
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                <span className="font-semibold">Precio Combo</span>
                <span className={`font-bold text-xl ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatMoneyDisplay(promo.comboPrice || 0)}
                </span>
              </div>

              <div className={`p-2 rounded mt-2 ${
                promo.isLosing
                  ? 'bg-red-900/20 border border-red-700'
                  : promo.profitMarginPercent < 20
                  ? 'bg-yellow-900/20 border border-yellow-700'
                  : 'bg-green-900/20 border border-green-700'
              }`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    {promo.isLosing ? (
                      <TrendingDown size={16} className="text-red-500" />
                    ) : (
                      <TrendingUp size={16} className="text-green-500" />
                    )}
                    <span className={`text-xs font-semibold ${
                      promo.isLosing
                        ? 'text-red-400'
                        : promo.profitMarginPercent < 20
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }`}>
                      Margen
                    </span>
                  </div>
                  <span className={`font-bold ${
                    promo.isLosing
                      ? 'text-red-400'
                      : promo.profitMarginPercent < 20
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}>
                    {promo.profitMarginPercent?.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Ganancia
                  </span>
                  <span className={promo.isLosing ? 'text-red-400' : 'text-green-400'}>
                    {formatMoneyDisplay(promo.profitAmount || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPromotions.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${
          isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
            {promotions.length === 0 
              ? 'No hay combos registrados'
              : 'No hay combos en esta categoría'
            }
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          title={editingId ? 'Editar Combo' : 'Nuevo Combo'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Nombre *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Ej: Combo Hamburguesa + Gaseosa"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                rows={2}
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

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className={`block text-sm font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Items del Combo
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAddItem('product')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md font-medium"
                  >
                    + Producto
                  </button>
                  <button
                    onClick={() => handleAddItem('ingredient')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md font-medium"
                  >
                    + Ingrediente
                  </button>
                </div>
              </div>

              {/* Tabla de Items */}
              {(formData.items ?? []).length > 0 && (
                <div className={`rounded-lg overflow-hidden border ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <table className="w-full">
                    <thead className={`${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-xs font-semibold w-2/5 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Nombre
                        </th>
                        <th className={`px-4 py-3 text-center text-xs font-semibold w-20 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Cant.
                        </th>
                        <th className={`px-4 py-3 text-right text-xs font-semibold ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Costo Unit.
                        </th>
                        <th className={`px-4 py-3 text-right text-xs font-semibold ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Precio Venta
                        </th>
                        <th className={`px-4 py-3 text-center text-xs font-semibold ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formData.items ?? []).map((item, index) => {
                        const selectedItem = item.type === 'product' 
                          ? products.find(p => p.id === item.id)
                          : ingredients.find(i => i.id === item.id)
                        
                        // Para productos: recalcular métricas para obtener costo real
                        let itemCost = 0
                        let itemPrice = 0
                        
                        if (item.type === 'product' && selectedItem) {
                          const metrics = recalculateProductMetrics(selectedItem)
                          itemCost = metrics.totalCost || 0
                          itemPrice = metrics.realSalePrice || 0
                        } else if (selectedItem) {
                          itemCost = selectedItem?.costoPorGramo || selectedItem?.costWithWastage || 0
                          itemPrice = itemCost * 1.4 // Margen 40% para ingredientes
                        }
                        
                        return (
                          <tr key={index} className={`border-t ${
                            isDarkMode ? 'border-gray-700 bg-[#111827]' : 'border-gray-200 bg-white'
                          }`}>
                            <td className="px-4 py-3">
                              <SearchSelect
                                options={item.type === 'product' ? products : ingredients}
                                value={item.id}
                                onChange={(value) => handleItemChange(index, 'id', value)}
                                displayKey="name"
                                placeholder={`Buscar ${item.type === 'product' ? 'producto' : 'ingrediente'}...`}
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                onFocus={(e) => e.target.select()}
                                className={`w-20 px-3 py-2 rounded border text-center ${
                                  isDarkMode
                                    ? 'bg-[#1f2937] border-gray-600 text-white'
                                    : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              />
                            </td>
                            <td className={`px-4 py-3 text-right font-semibold ${
                              isDarkMode ? 'text-blue-400' : 'text-blue-600'
                            }`}>
                              {formatMoneyDisplay(itemCost)}
                            </td>
                            <td className={`px-4 py-3 text-right font-semibold ${
                              isDarkMode ? 'text-green-400' : 'text-green-600'
                            }`}>
                              {formatMoneyDisplay(itemPrice)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleRemoveItem(index)}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Dashboard de Totales */}
            {(formData.items ?? []).length > 0 && (
              <div className={`p-6 rounded-xl border-2 space-y-4 ${
                isDarkMode
                  ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700'
                  : 'bg-gradient-to-br from-gray-50 to-white border-gray-300'
              }`}>
                {/* Título del Dashboard */}
                <h3 className={`text-lg font-bold border-b pb-2 ${
                  isDarkMode ? 'text-white border-gray-700' : 'text-gray-900 border-gray-300'
                }`}>
                  📊 Resumen del Combo
                </h3>

                {/* Grid de Totales */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Total Costo Combo */}
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-blue-950/50 border border-blue-700' : 'bg-blue-50 border border-blue-300'
                  }`}>
                    <div className={`text-xs font-semibold mb-1 ${
                      isDarkMode ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      💰 Total Costo Combo
                    </div>
                    <div className={`text-2xl font-black ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {formatMoneyDisplay(metrics.totalCost)}
                    </div>
                  </div>

                  {/* Total Precio Carta */}
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-green-950/50 border border-green-700' : 'bg-green-50 border border-green-300'
                  }`}>
                    <div className={`text-xs font-semibold mb-1 ${
                      isDarkMode ? 'text-green-300' : 'text-green-700'
                    }`}>
                      📋 Total Precio Carta
                    </div>
                    <div className={`text-2xl font-black ${
                      isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      {formatMoneyDisplay(metrics.totalSuggestedPrice)}
                    </div>
                  </div>

                  {/* Valor Descuento */}
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-yellow-950/50 border border-yellow-700' : 'bg-yellow-50 border border-yellow-300'
                  }`}>
                    <div className={`text-xs font-semibold mb-1 ${
                      isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                    }`}>
                      🎁 Valor Descuento ($)
                    </div>
                    <div className={`text-2xl font-black ${
                      isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                    }`}>
                      {formatMoneyDisplay(metrics.discountAmount)}
                    </div>
                  </div>

                  {/* Porcentaje Descuento */}
                  <div className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-purple-950/50 border border-purple-700' : 'bg-purple-50 border border-purple-300'
                  }`}>
                    <div className={`text-xs font-semibold mb-1 ${
                      isDarkMode ? 'text-purple-300' : 'text-purple-700'
                    }`}>
                      📊 Porcentaje Descuento (%)
                    </div>
                    <div className={`text-2xl font-black ${
                      isDarkMode ? 'text-purple-400' : 'text-purple-600'
                    }`}>
                      {metrics.discountPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Precio Final del Combo - RESALTADO */}
                <div className={`p-5 rounded-xl border-4 ${
                  metrics.isLosing
                    ? 'bg-red-900/30 border-red-500'
                    : isDarkMode
                    ? 'bg-gradient-to-r from-green-900 to-emerald-900 border-green-500'
                    : 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-500'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-sm font-bold ${
                      isDarkMode ? 'text-green-300' : 'text-green-700'
                    }`}>
                      💵 PRECIO FINAL DEL COMBO
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.comboPrice || metrics.totalSuggestedPrice}
                      onChange={(e) => setFormData({ ...formData, comboPrice: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                      className={`w-48 px-4 py-3 rounded-xl border-4 font-black text-center text-3xl shadow-lg ${
                        metrics.isLosing
                          ? 'bg-red-900/50 border-red-500 text-red-300'
                          : isDarkMode
                          ? 'bg-[#0a2818] border-green-400 text-green-300'
                          : 'bg-white border-green-500 text-green-700'
                      }`}
                      placeholder="$ 0.00"
                    />
                  </div>
                </div>

                {/* Métricas de Rentabilidad */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-600">
                  {/* Margen de Ganancia % */}
                  <div className={`p-4 rounded-lg text-center ${
                    metrics.isLosing
                      ? 'bg-red-900/30 border border-red-500'
                      : metrics.isLowMargin
                      ? 'bg-yellow-900/30 border border-yellow-500'
                      : isDarkMode
                      ? 'bg-gray-800/50 border border-gray-600'
                      : 'bg-gray-100 border border-gray-300'
                  }`}>
                    <div className={`text-xs font-bold mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      📈 Margen de Ganancia (%)
                    </div>
                    <div className={`text-2xl font-black ${
                      metrics.isLosing
                        ? 'text-red-400'
                        : metrics.isLowMargin
                        ? 'text-yellow-400'
                        : isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      {metrics.profitMarginPercent.toFixed(1)}%
                    </div>
                  </div>

                  {/* Utilidad $ */}
                  <div className={`p-4 rounded-lg text-center ${
                    metrics.isLosing
                      ? 'bg-red-900/30 border border-red-500'
                      : isDarkMode
                      ? 'bg-emerald-950/50 border border-emerald-700'
                      : 'bg-emerald-50 border border-emerald-300'
                  }`}>
                    <div className={`text-xs font-bold mb-1 ${
                      isDarkMode ? 'text-emerald-300' : 'text-emerald-700'
                    }`}>
                      💵 Utilidad ($)
                    </div>
                    <div className={`text-2xl font-black ${
                      metrics.isLosing
                        ? 'text-red-400'
                        : isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>
                      {formatMoneyDisplay(metrics.profitAmount)}
                    </div>
                  </div>
                </div>

                {/* Alertas */}
                {metrics.isLosing && (
                  <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg">
                    <p className="text-red-400 text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle size={18} />
                      ⚠️ Este combo generará PÉRDIDAS. Ajusta el precio o revisa los componentes.
                    </p>
                  </div>
                )}

                {metrics.isLowMargin && !metrics.isLosing && (
                  <div className="p-3 bg-yellow-900/40 border border-yellow-700 rounded-lg">
                    <p className="text-yellow-400 text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle size={18} />
                      ⚠️ Margen bajo ({metrics.profitMarginPercent.toFixed(1)}%). Considera aumentar el precio para mejorar rentabilidad.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-6 mt-10 pt-8 border-t-2 border-gray-600 pb-12 bg-gray-800/50 -mx-8 px-8 -mb-8 rounded-b-2xl">
              <button
                onClick={() => setShowModal(false)}
                className="flex items-center gap-3 px-12 py-5 bg-gray-600 hover:bg-gray-500 text-white rounded-xl transition-all font-bold shadow-2xl text-xl hover:scale-105"
              >
                <span className="text-2xl">❌</span> Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-3 px-12 py-5 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all font-bold shadow-2xl text-xl hover:scale-105"
              >
                <span className="text-2xl">💾</span> Guardar
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
                    saveCategory({ name: categoryName.trim() }, editingCategory?.id, 'promotions', 'promotions')
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
                    saveCategory({ name: categoryName.trim() }, editingCategory?.id, 'promotions', 'promotions')
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
