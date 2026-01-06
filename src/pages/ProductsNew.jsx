import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, TrendingUp, DollarSign } from 'lucide-react'
import { getProducts, saveProduct, deleteProduct, getIngredients, getRecipes } from '@/utils/storage'
import { formatMoneyDisplay, calcularCostoProporcional } from '@/utils/formatters'
import Modal from '@/components/Modal'
import SearchSelect from '@/components/SearchSelect'
import Button from '@/components/Button'
import { useI18n } from '@/context/I18nContext'

export default function ProductsNew() {
  const { isDarkMode } = useI18n()
  const [products, setProducts] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    items: [], // { type: 'ingredient' | 'recipe', id, quantity }
    profitMarginPercent: 40, // Margen de utilidad por defecto
    realSalePrice: 0, // Precio real de venta (editable)
  })

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
      setProducts(Array.isArray(productsData) ? productsData : [])
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
        items: Array.isArray(product.items) ? product.items : [],
        profitMarginPercent: product.profitMarginPercent || 40,
        realSalePrice: product.realSalePrice || 0,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        items: [],
        profitMarginPercent: 40,
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

  const calculateMetrics = () => {
    let totalCost = 0
    const items = formData.items || []
    
    // Validar que sea un array
    if (!Array.isArray(items)) {
      return {
        totalCost: 0,
        profitMarginPercent: 0,
        suggestedPrice: 0,
        realSalePrice: 0,
        actualProfit: 0,
        foodCostPercent: 0
      }
    }
    
    items.forEach(item => {
      if (!item || !item.id) return
      
      if (item.type === 'ingredient') {
        const ing = ingredients.find(i => i.id === item.id)
        if (ing) {
          const quantity = parseFloat(item.quantity || 0)
          
          // FÓRMULA CORRECTA: Costo = Cantidad * (Precio Compra * 1.30 / Peso Empaque)
          // Usar costoPorGramo si está disponible (recomendado)
          if (ing.costoPorGramo && ing.costoPorGramo > 0) {
            totalCost += ing.costoPorGramo * quantity
          } 
          // Fallback 1: Calcular usando pesoEmpaqueTotal
          else if (ing.pesoEmpaqueTotal && ing.pesoEmpaqueTotal > 0 && ing.costWithWastage) {
            totalCost += calcularCostoProporcional(
              ing.costWithWastage, 
              ing.pesoEmpaqueTotal, 
              quantity
            )
          } 
          // Fallback 2: Ingredientes muy antiguos
          else if (ing.costWithWastage) {
            totalCost += ing.costWithWastage * quantity
          }
        }
      } else {
        const rec = recipes.find(r => r.id === item.id)
        if (rec) {
          const quantity = parseFloat(item.quantity || 1)
          
          // Usar costoPorGramo si está disponible (recomendado para cantidades en gramos)
          if (rec.costoPorGramo && rec.costoPorGramo > 0) {
            totalCost += rec.costoPorGramo * quantity
          }
          // Fallback: Usar costo total de la receta (cantidad = unidades completas)
          else if (rec.totalCost) {
            totalCost += rec.totalCost * quantity
          }
        }
      }
    })

    const profitMarginPercent = parseFloat(formData.profitMarginPercent || 40)
    
    // FÓRMULA PROFESIONAL: Precio Sugerido = Costo Total / (1 - (Margen Deseado / 100))
    const suggestedPrice = profitMarginPercent >= 100 
      ? totalCost * 2 
      : totalCost / (1 - (profitMarginPercent / 100))
    
    const realSalePrice = parseFloat(formData.realSalePrice) || suggestedPrice

    // FÓRMULAS PROFESIONALES
    // Utilidad ($): Precio Real de Venta - Costo Total
    const actualProfit = realSalePrice - totalCost
    
    // Food Cost %: (Costo Total / Precio Real de Venta) * 100
    const foodCostPercent = realSalePrice > 0 ? (totalCost / realSalePrice) * 100 : 0

    return {
      totalCost,
      profitMarginPercent,
      suggestedPrice,
      realSalePrice,
      actualProfit,
      foodCostPercent
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre es requerido')
      return
    }

    try {
      await saveProduct(formData, editingId)
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error al guardar')
    }
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

  const metrics = calculateMetrics()

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

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(products ?? []).map(product => (
          <div key={product.id} className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {product.name}
                </h3>
                {product.description && (
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {product.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
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
                  Costo Total
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {formatMoneyDisplay(product.totalCost || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Margen Deseado
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {product.profitMarginPercent?.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Precio Sugerido
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {formatMoneyDisplay(product.suggestedPrice || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Utilidad Real
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatMoneyDisplay(product.actualProfit || 0)}
                </span>
              </div>
            </div>

            <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-2`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  💵 Precio de Venta
                </span>
                <span className={`font-bold text-xl ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatMoneyDisplay(product.realSalePrice || 0)}
                </span>
              </div>
              
              {/* Food Cost % - Indicador Clave */}
              <div className={`mt-2 p-2 rounded-lg ${
                (product.foodCostPercent || 0) > 35
                  ? isDarkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-100 border border-red-300'
                  : isDarkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-100 border border-green-300'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Food Cost %
                  </span>
                  <span className={`text-lg font-black ${
                    (product.foodCostPercent || 0) > 35
                      ? isDarkMode ? 'text-red-400' : 'text-red-600'
                      : isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    {(product.foodCostPercent || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${
          isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
            No hay productos registrados
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          title={editingId ? 'Editar Producto' : 'Nuevo Producto'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            {/* Información Básica */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Nombre del Producto *
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
                  placeholder="Ej: Hamburguesa Completa"
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
                  placeholder="Opcional"
                />
              </div>
            </div>

            {/* LAYOUT DE 2 COLUMNAS: Izquierda = Ingredientes, Derecha = Cálculos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* COLUMNA IZQUIERDA: Selección de Ingredientes/Recetas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={`block text-sm font-semibold ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    📦 Componentes del Producto
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddItem('ingredient')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
                    >
                      + Ingrediente
                    </button>
                    <button
                      onClick={() => handleAddItem('recipe')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors text-sm font-medium"
                    >
                      + Receta
                    </button>
                  </div>
                </div>

                <div className={`space-y-3 max-h-[400px] overflow-y-auto p-3 rounded-lg ${
                  isDarkMode ? 'bg-[#0a0e1a]' : 'bg-gray-50'
                }`}>
                  {(formData.items ?? []).map((item, index) => (
                    <div key={index} className={`p-3 rounded-lg border-2 ${
                      isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            item.type === 'ingredient' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-purple-600 text-white'
                          }`}>
                            {item.type === 'ingredient' ? 'INGREDIENTE' : 'RECETA'}
                          </span>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="ml-auto p-1 text-red-500 hover:bg-red-500/10 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <SearchSelect
                          options={item.type === 'ingredient' ? ingredients : recipes}
                          value={item.id}
                          onChange={(value) => handleItemChange(index, 'id', value)}
                          displayKey="name"
                          placeholder={`🔍 Buscar ${item.type === 'ingredient' ? 'ingrediente' : 'receta'}...`}
                        />

                        <div className="flex items-center gap-2">
                          <label className={`text-xs font-medium ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Cantidad (g/ml):
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className={`flex-1 px-3 py-1.5 rounded border font-semibold ${
                              isDarkMode
                                ? 'bg-[#111827] border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {(formData.items || []).length === 0 && (
                    <div className={`text-center py-8 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      <p className="text-sm">Agrega ingredientes o recetas</p>
                      <p className="text-xs mt-1">para calcular el costo del producto</p>
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMNA DERECHA: Cálculos Automáticos */}
              {(formData.items ?? []).length > 0 && (
                <div>
                  <h4 className={`text-sm font-semibold mb-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    💰 Cálculos Automáticos
                  </h4>
                  
                  <div className={`p-5 rounded-xl border-2 space-y-4 ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-blue-950 to-purple-950 border-blue-700' 
                      : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-300'
                  }`}>
                    
                    {/* Costo Total */}
                    <div className={`p-3 rounded-lg ${
                      isDarkMode ? 'bg-black/30' : 'bg-white/50'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Costo Total
                        </span>
                        <span className={`text-2xl font-bold ${
                          isDarkMode ? 'text-red-400' : 'text-red-600'
                        }`}>
                          {formatMoneyDisplay(metrics.totalCost)}
                        </span>
                      </div>
                    </div>

                    {/* Margen Deseado */}
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Margen de Utilidad Deseado (%)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={formData.profitMarginPercent}
                        onChange={(e) => setFormData({ ...formData, profitMarginPercent: parseFloat(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className={`w-full px-4 py-2 rounded-lg border-2 font-bold text-lg ${
                          isDarkMode
                            ? 'bg-[#1f2937] border-yellow-600 text-yellow-400'
                            : 'bg-white border-yellow-500 text-yellow-700'
                        }`}
                      />
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        Recomendado: 40-60% en restaurantes
                      </p>
                    </div>

                    {/* Precio Sugerido */}
                    <div className={`p-3 rounded-lg ${
                      isDarkMode ? 'bg-black/30' : 'bg-white/50'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Precio Sugerido
                        </span>
                        <span className={`text-xl font-bold ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          {formatMoneyDisplay(metrics.suggestedPrice)}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        Fórmula: Costo / (1 - Margen/100)
                      </p>
                    </div>

                    {/* Precio Real de Venta */}
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        💵 Precio Real de Venta (Editable)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.realSalePrice || metrics.suggestedPrice}
                        onChange={(e) => setFormData({ ...formData, realSalePrice: parseFloat(e.target.value) })}
                        onFocus={(e) => e.target.select()}
                        className={`w-full px-4 py-3 rounded-lg border-2 font-bold text-2xl ${
                          isDarkMode
                            ? 'bg-[#1f2937] border-green-600 text-green-400'
                            : 'bg-white border-green-500 text-green-600'
                        }`}
                      />
                    </div>

                    {/* Utilidad Real */}
                    <div className={`p-3 rounded-lg border-2 ${
                      metrics.actualProfit >= 0
                        ? isDarkMode 
                          ? 'bg-green-950/50 border-green-700' 
                          : 'bg-green-50 border-green-300'
                        : isDarkMode
                          ? 'bg-red-950/50 border-red-700'
                          : 'bg-red-50 border-red-300'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Utilidad Real ($)
                        </span>
                        <span className={`text-xl font-bold ${
                          metrics.actualProfit >= 0
                            ? isDarkMode ? 'text-green-400' : 'text-green-600'
                            : isDarkMode ? 'text-red-400' : 'text-red-600'
                        }`}>
                          {formatMoneyDisplay(metrics.actualProfit)}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        = Precio Venta - Costo Total
                      </p>
                    </div>

                    {/* Food Cost % */}
                    <div className={`p-4 rounded-lg border-2 ${
                      metrics.foodCostPercent > 35
                        ? isDarkMode 
                          ? 'bg-red-950/50 border-red-600' 
                          : 'bg-red-100 border-red-400'
                        : isDarkMode
                          ? 'bg-green-950/50 border-green-700'
                          : 'bg-green-50 border-green-300'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-bold ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                          Food Cost %
                        </span>
                        <span className={`text-3xl font-black ${
                          metrics.foodCostPercent > 35
                            ? isDarkMode ? 'text-red-400' : 'text-red-600'
                            : isDarkMode ? 'text-green-400' : 'text-green-600'
                        }`}>
                          {metrics.foodCostPercent.toFixed(1)}%
                        </span>
                      </div>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        = (Costo / Precio Venta) × 100
                      </p>
                      {metrics.foodCostPercent > 35 && (
                        <p className="text-xs font-bold text-red-500 mt-2">
                          ⚠️ ALERTA: Food Cost superior al 35% ideal
                        </p>
                      )}
                    </div>

                  </div>
                </div>
              )}

            </div>

            {/* Botones de Acción */}
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
    </div>
  )
}
