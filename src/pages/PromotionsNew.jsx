import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle, TrendingUp, TrendingDown, Upload, Download } from 'lucide-react'
import { getPromotions, savePromotion, deletePromotion, getProducts, getIngredients, getConfig } from '@/utils/storage'
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
  const [config, setConfig] = useState(null)
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

  // ===== FUNCIÓN BLINDADA PARA CONVERTIR A NÚMERO =====
  // Siempre devuelve un número válido o 0
  const toNumber = (val) => {
    if (val === null || val === undefined || val === '') return 0
    if (typeof val === 'number') return isFinite(val) ? val : 0
    if (typeof val === 'string') {
      const cleaned = val.replace(/\./g, '').replace(',', '.')
      const parsed = parseFloat(cleaned)
      return isFinite(parsed) ? parsed : 0
    }
    return 0
  }

  // ===== CARGAR DATOS INICIALES =====
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [promotionsData, productsData, ingredientsData, configData] = await Promise.all([
        getPromotions(),
        getProducts(),
        getIngredients(),
        getConfig()
      ])
      
      const sortedPromotions = Array.isArray(promotionsData)
        ? promotionsData.sort((a, b) => (a.order || 0) - (b.order || 0))
        : []
      
      setPromotions(sortedPromotions)
      setProducts(Array.isArray(productsData) ? productsData : [])
      setIngredients(Array.isArray(ingredientsData) ? ingredientsData : [])
      setConfig(configData)
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('⚠️ Error de conexión con la base de datos', 'error')
      setPromotions([])
      setProducts([])
      setIngredients([])
    }
    setLoading(false)
  }

  // ===== OBTENER DATOS EN VIVO DEL PRODUCTO =====
  // Esta función busca el producto en el estado global y extrae sus datos actuales
  const getLiveProductData = (productId) => {
    const product = products.find(p => p.id === productId)
    if (!product) {
      return { costoTotal: 0, precioVenta: 0, nombre: 'Producto no encontrado' }
    }

    // Extraer costoTotal (el CT que debe ser $9.317,1 para BURGER CLASICA)
    const costoTotal = toNumber(product.totalCost)
    
    // Extraer precioVenta (el PV que debe ser $14.000,0)
    const precioVenta = toNumber(product.realSalePrice)

    return {
      costoTotal,
      precioVenta,
      nombre: product.name || 'Sin nombre'
    }
  }

  // ===== OBTENER DATOS EN VIVO DEL INGREDIENTE =====
  const getLiveIngredientData = (ingredientId) => {
    const ingredient = ingredients.find(i => i.id === ingredientId)
    if (!ingredient) {
      return { costoPorGramo: 0, nombre: 'Ingrediente no encontrado' }
    }

    const costoPorGramo = toNumber(ingredient.costoPorGramo || ingredient.costWithWastage)
    
    return {
      costoPorGramo,
      nombre: ingredient.name || 'Sin nombre'
    }
  }

  // ===== CALCULAR MÉTRICAS DEL COMBO (RESUMEN BLINDADO) =====
  const calculateMetrics = () => {
    let totalCost = 0
    let totalSuggestedPrice = 0
    const items = formData.items || []

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

    // Sumar item por item con protección de billones
    items.forEach(item => {
      if (!item || !item.id) return
      
      const quantity = toNumber(item.quantity)
      if (quantity <= 0) return
      
      if (item.type === 'product') {
        const liveData = getLiveProductData(item.id)
        const itemCost = toNumber(liveData.costoTotal) * quantity
        const itemPrice = toNumber(liveData.precioVenta) * quantity
        
        totalCost += itemCost
        totalSuggestedPrice += itemPrice
      } else {
        const liveData = getLiveIngredientData(item.id)
        const itemCost = toNumber(liveData.costoPorGramo) * quantity
        
        totalCost += itemCost
        // FÓRMULA CORREGIDA: usar margen configurado por el usuario
        const targetMargin = (config?.targetProfitMargin || 35) / 100
        totalSuggestedPrice += itemCost / (1 - targetMargin)
      }
    })

    const comboPrice = toNumber(formData.comboPrice) || totalSuggestedPrice
    const discountAmount = totalSuggestedPrice - comboPrice
    const discountPercent = totalSuggestedPrice > 0 ? (discountAmount / totalSuggestedPrice) * 100 : 0
    const profitAmount = comboPrice - totalCost
    const profitMarginPercent = comboPrice > 0 ? (profitAmount / comboPrice) * 100 : 0

    return {
      totalCost: Number(totalCost.toFixed(2)),
      totalSuggestedPrice: Number(totalSuggestedPrice.toFixed(2)),
      comboPrice: Number(comboPrice.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      discountPercent: Number(discountPercent.toFixed(2)),
      profitAmount: Number(profitAmount.toFixed(2)),
      profitMarginPercent: Number(profitMarginPercent.toFixed(2)),
      isLosing: profitAmount < 0,
      isLowMargin: profitMarginPercent < 20
    }
  }

  // ===== CALCULAR MÉTRICAS PARA UN COMBO GUARDADO =====
  const calculatePromotionMetrics = (promotion) => {
    let totalCost = 0
    let totalSuggestedPrice = 0
    const items = promotion.items || []

    if (!Array.isArray(items)) {
      return {
        totalCost: 0,
        totalSuggestedPrice: 0,
        comboPrice: 0,
        profitMarginPercent: 0,
        profitMarginValue: 0,
        isLosing: false
      }
    }

    items.forEach(item => {
      if (!item || !item.id) return
      
      const quantity = toNumber(item.quantity)
      if (quantity <= 0) return
      
      if (item.type === 'product') {
        const liveData = getLiveProductData(item.id)
        totalCost += toNumber(liveData.costoTotal) * quantity
        totalSuggestedPrice += toNumber(liveData.precioVenta) * quantity
      } else {
        const liveData = getLiveIngredientData(item.id)
        const itemCost = toNumber(liveData.costoPorGramo) * quantity
        totalCost += itemCost
        // FÓRMULA CORREGIDA: usar margen configurado por el usuario
        const targetMargin = (config?.targetProfitMargin || 35) / 100
        totalSuggestedPrice += itemCost / (1 - targetMargin)
      }
    })

    const comboPrice = toNumber(promotion.comboPrice) || totalSuggestedPrice
    const profitMarginValue = comboPrice - totalCost
    const profitMarginPercent = comboPrice > 0 ? (profitMarginValue / comboPrice) * 100 : 0

    return {
      totalCost: Number(totalCost.toFixed(2)),
      totalSuggestedPrice: Number(totalSuggestedPrice.toFixed(2)),
      comboPrice: Number(comboPrice.toFixed(2)),
      profitMarginPercent: Number(profitMarginPercent.toFixed(2)),
      profitMarginValue: Number(profitMarginValue.toFixed(2)),
      isLosing: profitMarginValue < 0
    }
  }

  // ===== MODAL - ABRIR/CERRAR =====
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

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId(null)
  }

  // ===== MANEJO DE ITEMS DEL COMBO =====
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

  // ===== GUARDAR COMBO =====
  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('El nombre es requerido', 'error')
      return
    }

    if (!Array.isArray(formData.items) || formData.items.length === 0) {
      showToast('Debe agregar al menos un item al combo', 'error')
      return
    }

    const metrics = calculateMetrics()
    if (metrics.isLosing) {
      if (!window.confirm('⚠️ Este combo generará PÉRDIDAS. ¿Desea continuar?')) {
        return
      }
    }

    try {
      // IMPORTANTE: Solo guardamos id y cantidad, no costos
      const comboToSave = {
        ...formData,
        items: formData.items.map(item => ({
          type: item.type,
          id: item.id,
          quantity: toNumber(item.quantity)
        }))
      }
      
      await savePromotion(comboToSave, editingId)
      showToast('✅ Combo guardado exitosamente', 'success')
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Error saving promotion:', error)
      showToast('Error al guardar', 'error')
    }
  }

  // ===== ELIMINAR COMBO =====
  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm('¿Eliminar?')) return;
    try {
      await deleteDoc(doc(db, 'promotions', id));
      setPromotions(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  // ===== DUPLICAR COMBO =====
  const handleDuplicate = async (promotion) => {
    if (!promotion || promotion.id === null || promotion.id === undefined) return
    try {
      setEditingId(null)
      const duplicated = {
        ...promotion,
        id: null,
        name: `COPIA - ${promotion.name}`,
      }
      await savePromotion(duplicated)
      showToast('✅ Combo duplicado exitosamente', 'success')
      await loadData()
    } catch (error) {
      console.error('Error duplicating promotion:', error)
      showToast('Error al duplicar', 'error')
    }
  }

  // ===== DRAG & DROP =====
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

  // ===== CATEGORÍAS =====
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      showToast('El nombre de la categoría es requerido', 'error')
      return
    }

    try {
      await saveCategory(categoryName, editingCategory)
      setCategoryName('')
      setEditingCategory(null)
      setShowCategoryModal(false)
      showToast('✅ Categoría guardada', 'success')
    } catch (error) {
      console.error('Error saving category:', error)
      showToast('Error al guardar categoría', 'error')
    }
  }

  const handleDeleteCategory = async (id) => {
    if (!id) return;
    if (!window.confirm('¿Eliminar?')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      setCategories(prev => prev.filter(i => i.id !== id));
      showToast('🗑️ Categoría eliminada', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error al eliminar categoría', 'error');
    }
  }

  // ===== EXPORTAR A EXCEL =====
  const handleExportExcel = () => {
    try {
      const exportData = promotions.map(promo => {
        const categoryName = categories.find(c => c.id === promo.categoryId)?.name || 'Sin categoría'
        const metrics = calculatePromotionMetrics(promo)
        
        return {
          'Nombre': promo.name || 'Sin nombre',
          'Descripción': promo.description || '',
          'Categoría': categoryName,
          'Costo Total': metrics.totalCost.toFixed(2),
          'Precio Combo': metrics.comboPrice.toFixed(2),
          'Margen %': metrics.profitMarginPercent.toFixed(2),
          'Utilidad $': metrics.profitMarginValue.toFixed(2),
          'Estado': metrics.isLosing ? 'Perdiendo' : metrics.profitMarginPercent < 20 ? 'Margen bajo' : 'Normal'
        }
      })

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Combos')
      XLSX.writeFile(wb, `combos_${new Date().toISOString().split('T')[0]}.xlsx`)
      showToast('✅ Excel exportado exitosamente', 'success')
    } catch (error) {
      console.error('Error exporting Excel:', error)
      showToast('Error al exportar Excel', 'error')
    }
  }

  // ===== IMPORTAR DESDE EXCEL =====
  const handleImportExcel = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        for (const row of data) {
          const items = []
          
          const combo = {
            name: row['Nombre'] || 'Importado',
            description: row['Descripción'] || '',
            categoryId: '',
            items: items,
            comboPrice: toNumber(row['Precio Combo'])
          }
          
          await savePromotion(combo)
        }

        await loadData()
        showToast('✅ Combos importados exitosamente', 'success')
      } catch (error) {
        console.error('Error importing Excel:', error)
        showToast('Error al importar Excel', 'error')
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // ===== FILTRAR COMBOS =====
  const filteredPromotions = selectedCategoryFilter
    ? promotions.filter(p => p.categoryId === selectedCategoryFilter)
    : promotions

  const metrics = showModal ? calculateMetrics() : null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-dark-text dark:text-light-text">
          Combos / Promociones
        </h1>
        <div className="flex gap-3">
          <Button onClick={handleExportExcel} variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="hidden"
            />
            <Button variant="secondary" onClick={() => document.querySelector('input[type="file"]').click()}>
              <Upload className="w-4 h-4 mr-2" />
              Importar Excel
            </Button>
          </label>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Combo
          </Button>
        </div>
      </div>

      {/* Filtro de Categorías */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setSelectedCategoryFilter(null)}
          onDrop={(e) => handleDropCategory(e, null)}
          onDragOver={handleDragOver}
          className={`px-4 py-2 rounded-lg transition-colors ${
            !selectedCategoryFilter
              ? 'bg-primary-blue text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          Todos ({promotions.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryFilter(cat.id)}
            onDrop={(e) => handleDropCategory(e, cat.id)}
            onDragOver={handleDragOver}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategoryFilter === cat.id
                ? 'bg-primary-blue text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {cat.name} ({promotions.filter(p => p.categoryId === cat.id).length})
          </button>
        ))}
        <button
          onClick={() => {
            setEditingCategory(null)
            setCategoryName('')
            setShowCategoryModal(true)
          }}
          className="px-4 py-2 rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary-blue hover:text-primary-blue transition-colors"
        >
          + Nueva Categoría
        </button>
      </div>

      {/* Lista de Combos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPromotions.map(promo => {
          const promoMetrics = calculatePromotionMetrics(promo)
          
          return (
            <div
              key={promo.id}
              draggable
              onDragStart={(e) => handleDragStart(e, promo)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, promo)}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-move transition-all hover:shadow-lg ${
                draggedItem?.id === promo.id ? 'opacity-50' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-dark-text dark:text-light-text mb-2">
                    {promo.name}
                  </h3>
                  {promo.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {promo.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(promo)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-primary-blue" />
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Costo Total:</span>
                  <span className="font-semibold text-dark-text dark:text-light-text">
                    {formatMoneyDisplay(promoMetrics.totalCost)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Precio Combo:</span>
                  <span className="font-semibold text-primary-blue">
                    {formatMoneyDisplay(promoMetrics.comboPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Margen:</span>
                  <div className="flex items-center gap-2">
                    {promoMetrics.isLosing ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    )}
                    <span className={`font-semibold ${
                      promoMetrics.isLosing ? 'text-red-500' : 
                      promoMetrics.profitMarginPercent < 20 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {promoMetrics.profitMarginPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {promoMetrics.isLosing && (
                <div className="mt-4 flex items-center gap-2 text-red-500 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Este combo genera pérdidas</span>
                </div>
              )}

              <Button
                onClick={() => handleDuplicate(promo)}
                variant="secondary"
                className="w-full mt-4"
              >
                Duplicar Combo
              </Button>
            </div>
          )
        })}
      </div>

      {/* Modal de Combo */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingId ? 'Editar Combo' : 'Nuevo Combo'}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Información Básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre del Combo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-dark-text dark:text-light-text focus:ring-2 focus:ring-primary-blue"
                  placeholder="Ej: Combo Familiar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Categoría
                </label>
                <SearchSelect
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  value={formData.categoryId}
                  onChange={(value) => setFormData({ ...formData, categoryId: value })}
                  placeholder="Seleccionar categoría"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-dark-text dark:text-light-text focus:ring-2 focus:ring-primary-blue"
                placeholder="Descripción opcional del combo"
              />
            </div>

            {/* Items del Combo */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Items del Combo
                </label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAddItem('product')}
                    variant="secondary"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Producto
                  </Button>
                  <Button
                    onClick={() => handleAddItem('ingredient')}
                    variant="secondary"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Ingrediente
                  </Button>
                </div>
              </div>

              {/* Tabla de Items */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-bold text-dark-text dark:text-light-text">Tipo</th>
                      <th className="px-4 py-2 text-left text-sm font-bold text-dark-text dark:text-light-text">Item</th>
                      <th className="px-4 py-2 text-left text-sm font-bold text-dark-text dark:text-light-text">Cantidad</th>
                      <th className="px-4 py-2 text-left text-sm font-bold text-dark-text dark:text-light-text">Costo Unit.</th>
                      <th className="px-4 py-2 text-left text-sm font-bold text-dark-text dark:text-light-text">Precio Venta</th>
                      <th className="px-4 py-2 text-left text-sm font-bold text-dark-text dark:text-light-text">Subtotal</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300 dark:divide-gray-700">
                    {formData.items.map((item, index) => {
                      const quantity = toNumber(item.quantity)
                      let liveData = { costoTotal: 0, precioVenta: 0, nombre: '', costoPorGramo: 0 }
                      let costoUnit = 0
                      let precioVenta = 0
                      let subtotalCosto = 0

                      if (item.type === 'product') {
                        liveData = getLiveProductData(item.id)
                        costoUnit = liveData.costoTotal
                        precioVenta = liveData.precioVenta
                        subtotalCosto = costoUnit * quantity
                      } else {
                        liveData = getLiveIngredientData(item.id)
                        costoUnit = liveData.costoPorGramo
                        precioVenta = 0
                        subtotalCosto = costoUnit * quantity
                      }

                      return (
                        <tr key={index} className="hover:bg-blue-50 dark:hover:bg-blue-900/30">
                          <td className="px-4 py-2 text-base font-semibold">
                            <div className="flex items-center gap-2">
                              <span className={`w-8 h-8 flex items-center justify-center rounded-md text-base font-bold text-white shadow ${
                                item.type === 'product' ? 'bg-blue-700' : 'bg-orange-600'
                              }`}>
                                {item.type === 'product' ? 'P' : 'I'}
                              </span>
                              <span className="text-dark-text dark:text-light-text font-bold">
                                {item.type === 'product' ? 'Producto' : 'Ingrediente'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 w-full max-w-[400px]">
                            <div className="w-full">
                              <SearchSelect
                                options={
                                  item.type === 'product'
                                    ? products.map(p => ({ value: p.id, label: p.name }))
                                    : ingredients.map(i => ({ value: i.id, label: i.name }))
                                }
                                value={item.id}
                                onChange={(value) => handleItemChange(index, 'id', value)}
                                placeholder={`Seleccionar ${item.type === 'product' ? 'producto' : 'ingrediente'}`}
                                className="w-full font-semibold text-dark-text dark:text-light-text bg-white dark:bg-gray-900 border border-primary-blue rounded-lg px-2 py-1"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              min="1"
                              step="1"
                              className="w-24 px-3 py-2 rounded-lg border-2 border-primary-blue bg-white dark:bg-gray-900 text-lg font-bold text-dark-text dark:text-light-text focus:ring-2 focus:ring-primary-blue"
                            />
                          </td>
                          <td className="px-4 py-2 text-base font-semibold text-dark-text dark:text-light-text">
                            {formatMoneyDisplay(costoUnit)}
                          </td>
                          <td className="px-4 py-2 text-base font-semibold text-dark-text dark:text-light-text">
                            {item.type === 'product' ? formatMoneyDisplay(precioVenta) : '-'}
                          </td>
                          <td className="px-4 py-2 text-base font-bold text-primary-blue">
                            {formatMoneyDisplay(subtotalCosto)}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="p-2 hover:bg-red-200 dark:hover:bg-red-900 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5 text-red-600" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Precio del Combo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Precio del Combo
              </label>
              <input
                type="number"
                value={formData.comboPrice}
                onChange={(e) => setFormData({ ...formData, comboPrice: e.target.value })}
                min="0"
                step="100"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-dark-text dark:text-light-text focus:ring-2 focus:ring-primary-blue"
                placeholder="Dejar en 0 para usar precio sugerido"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Precio sugerido: {formatMoneyDisplay(metrics?.totalSuggestedPrice || 0)}
              </p>
            </div>

            {/* Resumen del Combo */}
            {metrics && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-lg text-dark-text dark:text-light-text mb-4">
                  Resumen del Combo
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Costo Total</p>
                    <p className="text-xl font-bold text-dark-text dark:text-light-text">
                      {formatMoneyDisplay(metrics.totalCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Precio Combo</p>
                    <p className="text-xl font-bold text-primary-blue">
                      {formatMoneyDisplay(metrics.comboPrice)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Descuento</p>
                    <p className="text-lg font-semibold text-yellow-600">
                      {formatMoneyDisplay(metrics.discountAmount)} ({metrics.discountPercent.toFixed(1)}%)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Margen de Ganancia</p>
                    <p className={`text-lg font-semibold ${
                      metrics.isLosing ? 'text-red-500' : 
                      metrics.isLowMargin ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {formatMoneyDisplay(metrics.profitAmount)} ({metrics.profitMarginPercent.toFixed(1)}%)
                    </p>
                  </div>
                </div>

                {metrics.isLosing && (
                  <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">¡ADVERTENCIA! Este combo generará pérdidas.</span>
                  </div>
                )}

                {!metrics.isLosing && metrics.isLowMargin && (
                  <div className="mt-4 flex items-center gap-2 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">Margen bajo (menos del 20%)</span>
                  </div>
                )}
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingId ? 'Actualizar Combo' : 'Crear Combo'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Categoría */}
      {showCategoryModal && (
        <Modal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre de la Categoría
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-dark-text dark:text-light-text focus:ring-2 focus:ring-primary-blue"
                placeholder="Ej: Combos Familiares"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowCategoryModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCategory}>
                Guardar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
