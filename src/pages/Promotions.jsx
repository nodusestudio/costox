import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'
import { getProducts, getRecipes, getIngredients, getAllDocs, saveDoc, deleteDocument } from '@/utils/storage'
import { formatMoneyDisplay, roundToNearestThousand } from '@/utils/formatters'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import SearchSelect from '@/components/SearchSelect'
import { useI18n } from '@/context/I18nContext'
import { useCategories } from '@/context/CategoriesContext'

export default function Promotions() {
  const { t, isDarkMode } = useI18n()
  const { categoriesPromotions: categories = [], saveCategory, deleteCategory } = useCategories()
  const [promotions, setPromotions] = useState([])
  const [products, setProducts] = useState([])
  const [recipes, setRecipes] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryName, setCategoryName] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    items: [],
    promoPrice: 0,
    categoryId: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [promoData, prodData, recData, ingData] = await Promise.all([
        getAllDocs('promotions'),
        getProducts(),
        getRecipes(),
        getIngredients()
      ])
      setPromotions(Array.isArray(promoData) ? promoData : [])
      setProducts(Array.isArray(prodData) ? prodData : [])
      setRecipes(Array.isArray(recData) ? recData : [])
      setIngredients(Array.isArray(ingData) ? ingData : [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = async (promo = null) => {
    if (promo) {
      setEditingId(promo.id)
      setShowModal(true)
      setModalLoading(true)
      
      try {
        // Cargar items con datos frescos de Firebase
        const itemsWithFreshData = await Promise.all(
          (promo.items || []).map(async (item) => {
            // Recalcular costos frescos
            const liveData = getLiveItemData(item.type, item.id)
            return {
              type: item.type || 'product',
              id: item.id || '',
              quantity: item.cantidad || item.quantity || 1,
              optionalPrice: item.optionalPrice || 0
            }
          })
        )
        
        setFormData({
          name: promo.name || '',
          items: itemsWithFreshData,
          promoPrice: Number(promo.promoPrice) || 0,
          categoryId: promo.categoryId || '',
        })
      } catch (error) {
        console.error('❌ Error cargando datos de promoción:', error)
        alert('Error al cargar los datos de la promoción')
        setShowModal(false)
      } finally {
        setModalLoading(false)
      }
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        items: [],
        promoPrice: 0,
        categoryId: '',
      })
      setShowModal(true)
      setModalLoading(false)
    }
  }

  const handleAddItem = (type = 'product') => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { type, id: '', quantity: 1, optionalPrice: 0 }]
    }))
  }

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  // Recalcular métricas de productos IGUAL que ProductsNew.jsx
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
              const costoPorGramo = ing.costWithWastage / ing.pesoEmpaqueTotal
              costoIngredientes += costoPorGramo * cantidadUsada
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
              costoIngredientes += rec.totalCost * cantidadUsada
            }
          }
        }
      })

      const manoDeObra = parseFloat(product.laborCost || 0)
      const costoTotal = costoIngredientes + manoDeObra
      const precioVenta = parseFloat(product.realSalePrice) || 0

      return {
        ingredientsCost: costoIngredientes,
        laborCost: manoDeObra,
        totalCost: costoTotal,
        realSalePrice: precioVenta,
      }
    } catch (error) {
      console.error('❌ Error calculando métricas:', error)
      return {
        ingredientsCost: 0,
        laborCost: 0,
        totalCost: 0,
        realSalePrice: 0,
      }
    }
  }

  // Buscar datos vivos por ID - CORREGIDO para usar recalcular
  const getLiveItemData = (type, id) => {
    if (type === 'product') {
      const product = products.find(p => p.id === id)
      if (!product) {
        console.warn(`⚠️ Producto no encontrado: id=${id}`)
        return { cost: 0, price: 0, name: '' }
      }
      
      // RECALCULAR el costo igual que ProductsNew.jsx
      const metrics = recalculateProductMetrics(product)
      const cost = metrics.totalCost
      const price = product.realSalePrice || 0
      
      console.log(`✅ Producto recalculado: ${product.name} - Costo: ${cost}, Precio: ${price}`)
      
      return { cost, price, name: product.name || '' }
    } else if (type === 'recipe') {
      // Para recetas, usar totalCost directamente
      const recipe = recipes.find(r => r.id === id)
      if (!recipe) {
        console.warn(`⚠️ Receta no encontrada: id=${id}`)
        return { cost: 0, price: 0, name: '' }
      }
      
      const cost = Number(recipe.totalCost || 0)
      const price = Number(recipe.totalCost || 0) // Las recetas no tienen precio de venta
      
      console.log(`✅ Receta cargada: ${recipe.name} - Costo: ${cost}`)
      
      return { cost, price, name: recipe.name || '' }
    } else if (type === 'ingredient') {
      // Para ingredientes, usar costoPorGramo o costWithWastage
      const ingredient = ingredients.find(i => i.id === id)
      if (!ingredient) {
        console.warn(`⚠️ Ingrediente no encontrado: id=${id}`)
        return { cost: 0, price: 0, name: '' }
      }
      
      const cost = Number(ingredient.costoPorGramo || ingredient.costWithWastage || 0)
      const price = 0 // Los ingredientes no tienen precio de venta
      
      console.log(`✅ Ingrediente cargado: ${ingredient.name} - Costo/g: ${cost}`)
      
      return { cost, price, name: ingredient.name || '' }
    }
    return { cost: 0, price: 0, name: '' }
  }

  // Calcular totales en tiempo real
  const calculateTotals = (items) => {
    let totalCost = 0
    let totalRegularPrice = 0

    items.forEach(item => {
      const qty = Number(item.quantity) || 0
      const liveData = getLiveItemData(item.type, item.id)
      totalCost += liveData.cost * qty
      
      // Si es ingrediente, usar optionalPrice si existe, sino 0
      // Si es producto/receta, usar optionalPrice si existe, sino el precio del item
      let itemPrice = 0
      if (item.type === 'ingredient') {
        itemPrice = Number(item.optionalPrice) || 0
      } else {
        itemPrice = Number(item.optionalPrice) > 0 ? Number(item.optionalPrice) : liveData.price
      }
      totalRegularPrice += itemPrice * qty
    })

    return {
      totalCost: Number(totalCost) || 0,
      totalRegularPrice: Number(totalRegularPrice) || 0
    }
  }

  const handleSave = async () => {
    // Validaciones
    if (!formData.name.trim()) {
      alert('⚠️ El nombre del combo es requerido')
      return
    }
    if (formData.items.length === 0) {
      alert('⚠️ Agrega al menos 1 item al combo')
      return
    }
    
    // Validar que todos los items tengan ID
    const emptyItems = formData.items.filter(item => !item.id)
    if (emptyItems.length > 0) {
      alert('⚠️ Todos los items deben tener un producto/receta/ingrediente seleccionado')
      return
    }

    setModalLoading(true)
    
    try {
      // Calcular totales
      const totals = calculateTotals(formData.items)
      const promoPrice = Number(formData.promoPrice) || 0
      
      // Validar que el precio no sea 0
      if (promoPrice <= 0) {
        alert('⚠️ El precio de venta del combo debe ser mayor a 0')
        setModalLoading(false)
        return
      }
      
      const ahorro = totals.totalRegularPrice - promoPrice
      const descuentoPct = totals.totalRegularPrice > 0 && ahorro > 0
        ? (ahorro / totals.totalRegularPrice) * 100
        : 0

      // Mapear items con estructura limpia
      const cleanItems = formData.items.map(item => {
        const liveData = getLiveItemData(item.type, item.id)
        const qty = Number(item.quantity) || 1
        
        return {
          type: item.type || 'product',
          id: item.id || '',
          nombre: liveData.name || '',
          cantidad: qty,
          costoUnitario: Number(liveData.cost) || 0,
          precioVenta: Number(liveData.price) || 0,
          optionalPrice: Number(item.optionalPrice) || 0
        }
      })

      // Objeto limpio sin undefined/NaN
      const promoData = {
        name: formData.name.trim(),
        items: cleanItems,
        promoPrice: Number(promoPrice) || 0,
        categoryId: formData.categoryId || '',
        totalCosto: Number(totals.totalCost) || 0,
        totalPrecioCarta: Number(totals.totalRegularPrice) || 0,
        ahorroDinero: Number(ahorro > 0 ? ahorro : 0) || 0,
        porcentajeDescuento: Number(descuentoPct) || 0,
        updatedAt: new Date().toISOString()
      }

      console.log('📝 Guardando promoción:', promoData)

      // ESPERAR confirmación de Firebase antes de cerrar
      if (editingId) {
        await saveDoc('promotions', promoData, editingId)
      } else {
        await saveDoc('promotions', { ...promoData, createdAt: new Date().toISOString() })
      }
      
      console.log('✅ Promoción guardada exitosamente en Firebase')
      
      // Recargar datos y cerrar solo si todo salió bien
      await loadData()
      setShowModal(false)
      setModalLoading(false)
      
    } catch (error) {
      console.error('❌ Error detallado al guardar promoción:', error)
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      // NO cerrar modal para evitar pérdida de datos
      alert(`❌ Error al guardar en Firebase:\n\n${error.message || 'Error desconocido'}\n\nPor favor intenta de nuevo. Tus datos NO se han perdido.`)
      setModalLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este combo?')) return
    try {
      await deleteDocument('promotions', id)
      await loadData()
    } catch (error) {
      console.error('Error deleting promotion:', error)
      alert('Error al eliminar')
    }
  }

  // Manejar guardado de categoría
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      alert('El nombre de la categoría es requerido')
      return
    }

    try {
      if (editingCategory) {
        await saveCategory({ ...editingCategory, name: categoryName }, 'promotions')
      } else {
        await saveCategory({ name: categoryName }, 'promotions')
      }
      setShowCategoryModal(false)
      setEditingCategory(null)
      setCategoryName('')
    } catch (error) {
      console.error('Error saving category:', error)
      alert('Error al guardar categoría')
    }
  }

  // Filtrar promociones por categoría seleccionada
  const filteredPromotions = selectedCategoryFilter
    ? promotions.filter(p => p.categoryId === selectedCategoryFilter)
    : promotions

  if (loading) {
    return (
      <div className={`p-6 flex items-center justify-center ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-[#111827]'}`}>
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className={`p-6 transition-colors duration-300 ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-[#111827]'}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Tag size={32} className="text-primary-blue" />
            Promociones / Combos
          </h2>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Gestiona combos con datos vivos de productos y recetas
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-3 bg-primary-blue hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg font-medium"
        >
          <Plus size={20} />
          Nueva Promoción
        </button>
      </div>

      {/* Pestañas de Categoría */}
      <div className={`flex gap-2 items-center border-b-2 pb-3 mb-6 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <button
          onClick={() => setSelectedCategoryFilter(null)}
          className={`px-6 py-2 font-semibold transition-all border-b-4 ${
            selectedCategoryFilter === null
              ? 'border-primary-blue text-primary-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Todas
        </button>
        {(categories || []).map(cat => (
          <div key={cat.id} className="relative group">
            <button
              onClick={() => setSelectedCategoryFilter(cat.id)}
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
                    deleteCategory(cat.id, 'promotions')
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
          className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
        >
          + Categoría
        </button>
      </div>

      {filteredPromotions.length === 0 ? (
        <div className={`rounded-lg p-12 text-center border ${isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'}`}>
          <Tag size={48} className="mx-auto mb-4 text-gray-500" />
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            {selectedCategoryFilter ? 'No hay promociones en esta categoría' : 'No hay combos registrados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPromotions.map(promo => {
            const totals = calculateTotals(promo.items || [])
            const promoPrice = Number(promo.promoPrice) || 0
            const discountAmount = (totals.totalRegularPrice - promoPrice) || 0
            const discountPercent = totals.totalRegularPrice > 0 
              ? ((discountAmount / totals.totalRegularPrice) * 100) 
              : 0
            const margin = promoPrice > 0
              ? (((promoPrice - totals.totalCost) / promoPrice) * 100)
              : 0
            const profit = promoPrice - totals.totalCost

            return (
              <div 
                key={promo.id}
                className={`p-4 rounded-xl border ${
                  isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {promo.name}
                    </h3>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {(promo.items || []).length} item(s)
                    </p>
                  </div>
                  <div className="flex gap-1">
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

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      PVP Regular
                    </span>
                    <span className={`font-semibold line-through ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {formatMoneyDisplay(totals.totalRegularPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Descuento
                    </span>
                    <span className={`font-semibold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      -{formatMoneyDisplay(discountAmount)} ({discountPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className={`flex justify-between text-sm pt-2 border-t ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-300'
                  }`}>
                    <span className={`font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      COSTO UNIDAD (CT)
                    </span>
                    <span className={`font-bold text-xl ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {formatMoneyDisplay(totals.totalCost)}
                    </span>
                  </div>
                </div>

                <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-2`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      💵 PRECIO DE VENTA
                    </span>
                    <span className={`font-bold text-2xl ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {formatMoneyDisplay(promoPrice)}
                    </span>
                  </div>
                  
                  {/* P-CONTRIBUCIÓN (% Utilidad) */}
                  <div className={`mt-2 p-3 rounded-lg border-2 ${
                    margin < 25
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
                        margin < 25
                          ? isDarkMode ? 'text-red-400' : 'text-red-600'
                          : isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`}>
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* M-CONTRIBUCIÓN (Utilidad $) */}
                  <div className={`p-3 rounded-lg ${
                    profit >= 0
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
                        profit >= 0
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {formatMoneyDisplay(profit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <Modal
          title={editingId ? 'Editar Combo' : 'Nuevo Combo'}
          onClose={() => !modalLoading && setShowModal(false)}
        >
          <div className="space-y-6 relative">
            {/* Loading Overlay */}
            {modalLoading && (
              <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto mb-3"></div>
                  <p className="text-white font-semibold">
                    {editingId ? 'Cargando datos...' : 'Guardando...'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Nombre del Combo */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                📋 Nombre del Combo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Ej: Combo Familiar"
              />
            </div>

            {/* Categoría */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                🏷️ Categoría
              </label>
              <SearchSelect
                options={(categories || []).map(cat => ({ id: cat.id, name: cat.name }))}
                value={formData.categoryId}
                onChange={(val) => setFormData(prev => ({ ...prev, categoryId: val }))}
                placeholder="Seleccionar categoría..."
                displayKey="name"
                valueKey="id"
              />
            </div>

            {/* Precio de Venta - Centro con recuadro verde */}
            <div className={`p-6 rounded-xl border-2 text-center ${
              isDarkMode
                ? 'bg-green-950/50 border-green-600'
                : 'bg-green-50 border-green-400'
            }`}>
              <label className={`block text-sm font-bold mb-3 ${
                isDarkMode ? 'text-green-300' : 'text-green-700'
              }`}>
                💵 PRECIO DE VENTA DEL COMBO
              </label>
              <input
                type="number"
                step="1000"
                min="0"
                value={formData.promoPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, promoPrice: e.target.value }))}
                onFocus={(e) => e.target.select()}
                className={`w-48 px-4 py-2 rounded-lg border-2 font-black text-center ${
                  isDarkMode
                    ? 'bg-[#0a2818] border-green-500 text-green-300'
                    : 'bg-white border-green-500 text-green-700'
                }`}
                style={{ fontSize: '2.5rem' }}
                placeholder="$ 0"
              />
            </div>

            {/* Tres Bloques de Métricas */}
            {(() => {
              const totals = calculateTotals(formData.items)
              const promoPrice = Number(formData.promoPrice) || 0
              const profit = promoPrice - totals.totalCost
              const margin = promoPrice > 0
                ? (((promoPrice - totals.totalCost) / promoPrice) * 100)
                : 0

              return (
                <div className="grid grid-cols-3 gap-3">
                  {/* Costo Unidad */}
                  <div className={`p-3 rounded-lg text-center ${
                    isDarkMode ? 'bg-blue-950/50 border border-blue-700' : 'bg-blue-50 border border-blue-300'
                  }`}>
                    <div className={`text-xs font-bold mb-2 ${
                      isDarkMode ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      COSTO
                    </div>
                    <div className={`text-xl font-black ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {formatMoneyDisplay(totals.totalCost)}
                    </div>
                  </div>

                  {/* P-Contribución */}
                  <div className={`p-3 rounded-lg text-center ${
                    isDarkMode ? 'bg-gray-800/50 border border-gray-600' : 'bg-gray-100 border border-gray-300'
                  }`}>
                    <div className={`text-xs font-bold mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      P-CONTRIB.
                    </div>
                    <div className={`text-xl font-black ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {margin.toFixed(1)}%
                    </div>
                  </div>

                  {/* M-Contribución */}
                  <div className={`p-3 rounded-lg text-center ${
                    isDarkMode ? 'bg-purple-950/50 border border-purple-700' : 'bg-purple-50 border border-purple-300'
                  }`}>
                    <div className={`text-xs font-bold mb-2 ${
                      isDarkMode ? 'text-purple-300' : 'text-purple-700'
                    }`}>
                      M-CONTRIB.
                    </div>
                    <div className={`text-xl font-black ${
                      isDarkMode ? 'text-purple-400' : 'text-purple-600'
                    }`}>
                      {formatMoneyDisplay(profit)}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Precio Sugerido */}
            {formData.items.length > 0 && (() => {
              const totals = calculateTotals(formData.items)
              const suggestedPrice = roundToNearestThousand(totals.totalCost * 1.4) // 40% markup mínimo
              
              return (
                <div className={`p-4 rounded-lg border-2 text-center ${
                  isDarkMode ? 'bg-yellow-950/30 border-yellow-600' : 'bg-yellow-50 border-yellow-400'
                }`}>
                  <div className={`text-xs font-bold mb-2 ${
                    isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                  }`}>
                    💡 PRECIO SUGERIDO (redondeado al millar)
                  </div>
                  <div className={`text-3xl font-black ${
                    isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                  }`}>
                    {formatMoneyDisplay(suggestedPrice)}
                  </div>
                  <div className={`text-xs mt-1 ${
                    isDarkMode ? 'text-yellow-400/70' : 'text-yellow-600/70'
                  }`}>
                    Con 40% de margen mínimo
                  </div>
                </div>
              )
            })()}

            {/* Items del Combo */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-sm font-bold ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  🎁 ITEMS DEL COMBO
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddItem('product')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium"
                  >
                    📦 P + Producto
                  </button>
                  <button
                    onClick={() => handleAddItem('recipe')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium"
                  >
                    🍖 R + Receta
                  </button>
                  <button
                    onClick={() => handleAddItem('ingredient')}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium"
                  >
                    🥕 I + Ingrediente
                  </button>
                </div>
              </div>

              <div className={`rounded-lg border ${
                isDarkMode ? 'bg-[#0a0e1a] border-gray-700' : 'bg-gray-50 border-gray-300'
              }`}>
                {/* Cabecera */}
                {(() => {
                  const hasIngredients = formData.items.some(item => item.type === 'ingredient')
                  return (
                    <div className={`grid ${hasIngredients ? 'grid-cols-12' : 'grid-cols-10'} gap-2 p-3 border-b font-bold text-xs ${
                      isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-200 border-gray-300 text-gray-700'
                    }`}>
                      <div className="col-span-3">NOMBRE</div>
                      <div className="col-span-2 text-center">CANT</div>
                      <div className="col-span-2 text-right">COSTO</div>
                      <div className="col-span-2 text-right">PRECIO AUTO</div>
                      {hasIngredients && <div className="col-span-2 text-right">PRECIO VENTA</div>}
                      <div className="col-span-1"></div>
                    </div>
                  )
                })()}

                {/* Lista de Items */}
                <div className="max-h-[300px] overflow-y-auto">
                  {formData.items.map((item, index) => {
                    const liveData = getLiveItemData(item.type, item.id)
                    const qty = Number(item.quantity) || 1
                    const itemCost = liveData.cost * qty
                    
                    // Determinar lista de origen según tipo
                    let sourceList = []
                    let badgeColor = ''
                    let badgeLabel = ''
                    let placeholder = ''
                    
                    if (item.type === 'product') {
                      sourceList = products
                      badgeColor = 'bg-blue-500/20 text-blue-400'
                      badgeLabel = '📦 P'
                      placeholder = 'Buscar producto...'
                    } else if (item.type === 'recipe') {
                      sourceList = recipes
                      badgeColor = 'bg-purple-500/20 text-purple-400'
                      badgeLabel = '🍖 R'
                      placeholder = 'Buscar receta...'
                    } else if (item.type === 'ingredient') {
                      sourceList = ingredients
                      badgeColor = 'bg-green-500/20 text-green-400'
                      badgeLabel = '🥕 I'
                      placeholder = 'Buscar ingrediente...'
                    }

                    const itemPriceAuto = liveData.price * qty
                    const itemPriceOptional = Number(item.optionalPrice) || 0
                    const hasIngredients = formData.items.some(it => it.type === 'ingredient')

                    return (
                      <div key={index} className={`grid ${hasIngredients ? 'grid-cols-12' : 'grid-cols-10'} gap-2 p-3 border-b text-sm ${
                        isDarkMode ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-100'
                      }`}>
                        <div className="col-span-3 flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                          <SearchSelect
                            options={sourceList}
                            value={item.id}
                            onChange={(val) => handleItemChange(index, 'id', val)}
                            displayKey="name"
                            valueKey="id"
                            placeholder={placeholder}
                            className="flex-1"
                          />
                        </div>

                        <div className="col-span-2 flex items-center">
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                            onFocus={(e) => e.target.select()}
                            className={`w-full px-2 py-1 rounded border text-center text-xs ${
                              isDarkMode
                                ? 'bg-[#111827] border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                            placeholder="1"
                          />
                        </div>

                        <div className={`col-span-2 flex items-center justify-end ${
                          isDarkMode ? 'text-blue-300' : 'text-blue-600'
                        }`}>
                          <span className="font-semibold text-xs truncate">{formatMoneyDisplay(itemCost)}</span>
                        </div>

                        <div className={`col-span-2 flex items-center justify-end ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <span className="font-semibold text-xs truncate">{formatMoneyDisplay(itemPriceAuto)}</span>
                        </div>

                        {hasIngredients && (
                          <div className="col-span-2 flex items-center">
                            {item.type === 'ingredient' ? (
                              <input
                                type="number"
                                step="1000"
                                min="0"
                                value={item.optionalPrice || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0
                                  handleItemChange(index, 'optionalPrice', val)
                                }}
                                onFocus={(e) => e.target.select()}
                                className={`w-full px-2 py-1 rounded border text-right text-xs font-bold ${
                                  isDarkMode
                                    ? 'bg-[#111827] border-green-600 text-green-400'
                                    : 'bg-white border-green-300 text-green-600'
                                }`}
                                placeholder="$ 0"
                              />
                            ) : (
                              <span className={`text-xs italic ${
                                isDarkMode ? 'text-gray-600' : 'text-gray-400'
                              }`}>N/A</span>
                            )}
                          </div>
                        )}

                        <div className="col-span-1 flex items-center justify-end">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded flex-shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {formData.items.length === 0 && (
                    <div className={`text-center py-8 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      <p className="text-xs">Sin items en el combo</p>
                    </div>
                  )}
                </div>

                {/* Resumen de Totales */}
                {formData.items.length > 0 && (() => {
                  const totals = calculateTotals(formData.items)
                  const promoPrice = Number(formData.promoPrice) || 0
                  const ahorro = totals.totalRegularPrice - promoPrice
                  const descuentoPct = totals.totalRegularPrice > 0 && ahorro > 0
                    ? (ahorro / totals.totalRegularPrice) * 100
                    : 0

                  return (
                    <div className={`p-4 border-t ${
                      isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-100'
                    }`}>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Columna Izquierda: Totales */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-semibold ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              💰 Total Costo:
                            </span>
                            <span className={`text-sm font-bold ${
                              isDarkMode ? 'text-blue-400' : 'text-blue-600'
                            }`}>
                              {formatMoneyDisplay(totals.totalCost)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-semibold ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              💵 Total Precio Carta:
                            </span>
                            <span className={`text-sm font-bold ${
                              isDarkMode ? 'text-green-400' : 'text-green-600'
                            }`}>
                              {formatMoneyDisplay(totals.totalRegularPrice)}
                            </span>
                          </div>
                        </div>

                        {/* Columna Derecha: Ahorro y Descuento */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-semibold ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              🎁 Ahorro:
                            </span>
                            <span className={`text-sm font-bold ${
                              ahorro > 0
                                ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                                : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {formatMoneyDisplay(ahorro > 0 ? ahorro : 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-semibold ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              📊 % Descuento:
                            </span>
                            <span className={`text-sm font-bold ${
                              descuentoPct > 0
                                ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              {descuentoPct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                disabled={modalLoading}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  modalLoading
                    ? 'bg-gray-500 cursor-not-allowed opacity-50'
                    : isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={modalLoading}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
                  modalLoading
                    ? 'bg-blue-400 cursor-not-allowed opacity-50'
                    : 'bg-primary-blue hover:bg-blue-700'
                } text-white`}
              >
                {modalLoading ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Combo'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Categorías */}
      {showCategoryModal && (
        <Modal onClose={() => setShowCategoryModal(false)}>
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-[#1f2937]' : 'bg-white'}`}>
            <h2 className="text-2xl font-bold mb-4">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Nombre de la categoría"
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCategoryModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCategory}
                className="flex-1 bg-primary-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
