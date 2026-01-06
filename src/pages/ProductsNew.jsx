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
    items: [], // { type: 'ingredient' | 'recipe', id, quantity } - SIEMPRE ARRAY
    laborCost: 0, // Mano de obra unitaria ($)
    overheadPercent: 30, // % Gastos varios (gas, servicios, mermas)
    markupPercent: 60, // Margen QSR - Markup % (no margin)
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
        laborCost: product.laborCost || 0,
        overheadPercent: product.overheadPercent || 30,
        markupPercent: product.markupPercent || 60,
        realSalePrice: product.realSalePrice || 0,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        items: [],
        laborCost: 0,
        overheadPercent: 30,
        markupPercent: 60,
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
    // VALIDACIÓN CRÍTICA: Asegurar que items sea SIEMPRE un array (evita n.reduce is not a function)
    const items = Array.isArray(formData.items) ? formData.items : []
    
    // ==========================================
    // FÓRMULA PROFESIONAL DE COSTEO QSR
    // ==========================================
    
    // PASO A: Suma_Ingredientes = Σ (Cantidad_Usada * Costo_Unitario_G_o_ML)
    let suma_ingredientes = 0
    
    items.forEach(item => {
      if (!item || !item.id) return
      
      if (item.type === 'ingredient') {
        const ing = ingredients.find(i => i.id === item.id)
        if (ing) {
          const cantidad_usada = parseFloat(item.quantity || 0)
          
          // FÓRMULA OBLIGATORIA: (Precio_Compra * 1.30 / Peso_Empaque) * Cantidad_Usada
          // Usar costoPorGramo si está disponible (ya tiene la merma del 30% incluida)
          if (ing.costoPorGramo && ing.costoPorGramo > 0) {
            suma_ingredientes += ing.costoPorGramo * cantidad_usada
          } 
          // Fallback 1: Calcular usando pesoEmpaqueTotal
          else if (ing.pesoEmpaqueTotal && ing.pesoEmpaqueTotal > 0 && ing.costWithWastage) {
            suma_ingredientes += calcularCostoProporcional(
              ing.costWithWastage, 
              ing.pesoEmpaqueTotal, 
              cantidad_usada
            )
          } 
          // Fallback 2: Ingredientes antiguos
          else if (ing.costWithWastage) {
            suma_ingredientes += ing.costWithWastage * cantidad_usada
          }
        }
      } else {
        const rec = recipes.find(r => r.id === item.id)
        if (rec) {
          const cantidad_usada = parseFloat(item.quantity || 1)
          
          if (rec.costoPorGramo && rec.costoPorGramo > 0) {
            suma_ingredientes += rec.costoPorGramo * cantidad_usada
          } else if (rec.totalCost) {
            suma_ingredientes += rec.totalCost * cantidad_usada
          }
        }
      }
    })

    // PASO B: Subtotal_Produccion = Suma_Ingredientes + mano_de_obra_unitaria
    const mano_de_obra_unitaria = parseFloat(formData.laborCost || 0)
    const subtotal_produccion = suma_ingredientes + mano_de_obra_unitaria
    
    // PASO C: Gastos_Varios = Subtotal_Produccion * (porcentaje_gastos_varios / 100)
    const porcentaje_gastos_varios = parseFloat(formData.overheadPercent || 30)
    const gastos_varios = subtotal_produccion * (porcentaje_gastos_varios / 100)
    
    // PASO D: COSTO TOTAL = Subtotal_Produccion + Gastos_Varios
    const costo_total = subtotal_produccion + gastos_varios
    
    // PASO E: PRECIO VENTA QSR = COSTO_TOTAL * (1 + (margen_qsr / 100))
    const margen_qsr = parseFloat(formData.markupPercent || 60)
    const precio_venta_sugerido = costo_total * (1 + (margen_qsr / 100))
    
    const precio_real_venta = parseFloat(formData.realSalePrice) || precio_venta_sugerido

    // MÉTRICAS PROFESIONALES
    const utilidad_real = precio_real_venta - costo_total
    const food_cost_percent = precio_real_venta > 0 ? (costo_total / precio_real_venta) * 100 : 0

    return {
      ingredientsCost: suma_ingredientes,
      laborCost: mano_de_obra_unitaria,
      subtotalProduction: subtotal_produccion,
      overheadPercent: porcentaje_gastos_varios,
      overheadCost: gastos_varios,
      totalCost: costo_total,
      markupPercent: margen_qsr,
      suggestedPrice: precio_venta_sugerido,
      realSalePrice: precio_real_venta,
      actualProfit: utilidad_real,
      foodCostPercent: food_cost_percent
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
                  Ingredientes
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {formatMoneyDisplay(product.ingredientsCost || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Mano Obra
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                  {formatMoneyDisplay(product.laborCost || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Gastos ({product.overheadPercent || 30}%)
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  {formatMoneyDisplay(product.overheadCost || 0)}
                </span>
              </div>
              <div className={`flex justify-between text-sm pt-2 border-t ${
                isDarkMode ? 'border-gray-700' : 'border-gray-300'
              }`}>
                <span className={`font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Costo Total
                </span>
                <span className={`font-bold text-lg ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {formatMoneyDisplay(product.totalCost || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Markup QSR ({product.markupPercent || 60}%)
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  {product.markupPercent?.toFixed(0)}%
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
                  Utilidad
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatMoneyDisplay(product.actualProfit || 0)}
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
              
              {/* Food Cost % - Indicador Clave QSR */}
              <div className={`mt-2 p-3 rounded-lg border-2 ${
                (product.foodCostPercent || 0) > 35
                  ? isDarkMode ? 'bg-red-900/40 border-red-600' : 'bg-red-100 border-red-400'
                  : isDarkMode ? 'bg-green-900/40 border-green-700' : 'bg-green-100 border-green-400'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Food Cost % QSR
                  </span>
                  <span className={`text-2xl font-black ${
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

              {/* COLUMNA DERECHA: Cálculos Automáticos QSR */}
              {(formData.items ?? []).length > 0 && (
                <div>
                  <h4 className={`text-sm font-semibold mb-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    💰 Costeo Profesional QSR
                  </h4>
                  
                  <div className={`p-5 rounded-xl border-2 space-y-4 ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-blue-950 to-purple-950 border-blue-700' 
                      : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-300'
                  }`}>
                    
                    {/* PASO 1: Costo de Ingredientes */}
                    <div className={`p-3 rounded-lg border ${
                      isDarkMode ? 'bg-black/30 border-gray-700' : 'bg-white/50 border-gray-300'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-medium ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          1️⃣ Costo Ingredientes
                        </span>
                        <span className={`text-lg font-bold ${
                          isDarkMode ? 'text-red-400' : 'text-red-600'
                        }`}>
                          {formatMoneyDisplay(metrics.ingredientsCost)}
                        </span>
                      </div>
                    </div>

                    {/* PASO 2: Mano de Obra */}
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        2️⃣ Mano de Obra Unitaria ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.laborCost}
                        onChange={(e) => setFormData({ ...formData, laborCost: parseFloat(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className={`w-full px-4 py-2 rounded-lg border-2 font-bold text-lg ${
                          isDarkMode
                            ? 'bg-[#1f2937] border-orange-600 text-orange-400'
                            : 'bg-white border-orange-500 text-orange-700'
                        }`}
                        placeholder="0"
                      />
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        Costo del operario por unidad
                      </p>
                    </div>

                    {/* Subtotal de Producción */}
                    <div className={`p-3 rounded-lg border-2 ${
                      isDarkMode ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-100 border-blue-400'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-bold ${
                          isDarkMode ? 'text-blue-300' : 'text-blue-700'
                        }`}>
                          = Subtotal Producción
                        </span>
                        <span className={`text-xl font-black ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          {formatMoneyDisplay(metrics.subtotalProduction)}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}>
                        Ingredientes + Mano de Obra
                      </p>
                    </div>

                    {/* PASO 3: Gastos Varios */}
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        3️⃣ Gastos Varios (%)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={formData.overheadPercent}
                        onChange={(e) => setFormData({ ...formData, overheadPercent: parseFloat(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className={`w-full px-4 py-2 rounded-lg border-2 font-bold text-lg ${
                          isDarkMode
                            ? 'bg-[#1f2937] border-purple-600 text-purple-400'
                            : 'bg-white border-purple-500 text-purple-700'
                        }`}
                      />
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        Gas, servicios, mermas menores (30% estándar)
                      </p>
                      <div className={`mt-2 p-2 rounded ${
                        isDarkMode ? 'bg-black/30' : 'bg-white/50'
                      }`}>
                        <div className="flex justify-between text-xs">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Costo Gastos:
                          </span>
                          <span className={`font-bold ${
                            isDarkMode ? 'text-purple-400' : 'text-purple-600'
                          }`}>
                            {formatMoneyDisplay(metrics.overheadCost)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* COSTO TOTAL FINAL */}
                    <div className={`p-4 rounded-lg border-2 ${
                      isDarkMode ? 'bg-red-900/30 border-red-600' : 'bg-red-100 border-red-400'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-bold ${
                          isDarkMode ? 'text-red-300' : 'text-red-700'
                        }`}>
                          💲 COSTO TOTAL FINAL
                        </span>
                        <span className={`text-2xl font-black ${
                          isDarkMode ? 'text-red-400' : 'text-red-600'
                        }`}>
                          {formatMoneyDisplay(metrics.totalCost)}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-red-400' : 'text-red-600'
                      }`}>
                        Subtotal + Gastos Varios
                      </p>
                    </div>

                    {/* PASO 4: Margen QSR (Markup) */}
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        4️⃣ Margen QSR - Markup (%)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={formData.markupPercent}
                        onChange={(e) => setFormData({ ...formData, markupPercent: parseFloat(e.target.value) || 0 })}
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
                        Estándar QSR: 60% (rango: 50-80%)
                      </p>
                    </div>

                    {/* Precio Sugerido */}
                    <div className={`p-3 rounded-lg border-2 ${
                      isDarkMode ? 'bg-blue-900/30 border-blue-600' : 'bg-blue-100 border-blue-400'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${
                          isDarkMode ? 'text-blue-300' : 'text-blue-700'
                        }`}>
                          💡 Precio Sugerido
                        </span>
                        <span className={`text-xl font-bold ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          {formatMoneyDisplay(metrics.suggestedPrice)}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}>
                        Costo Total × (1 + Markup/100)
                      </p>
                    </div>

                    {/* Precio Real de Venta */}
                    <div>
                      <label className={`block text-xs font-bold mb-2 ${
                        isDarkMode ? 'text-green-400' : 'text-green-600'
                      }`}>
                        💵 PRECIO REAL DE VENTA
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
                        = (Costo Total / Precio Venta) × 100
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
