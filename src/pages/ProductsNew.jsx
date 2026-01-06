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
    laborCost: 0, // Mano de Obra (Operario)
    realSalePrice: 0, // Precio de Venta
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
        realSalePrice: product.realSalePrice || 0,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
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
      
      if (item.type === 'ingredient') {
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
      } else {
        const rec = recipes.find(r => r.id === item.id)
        if (rec) {
          const cantidadUsada = parseFloat(item.quantity || 1)
          if (rec.costoPorGramo && rec.costoPorGramo > 0) {
            costoIngredientes += rec.costoPorGramo * cantidadUsada
          } else if (rec.totalCost) {
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

    // P-CONTRIBUCIÓN (Food Cost %): (Costo Total / Precio Venta) * 100
    const pContribucion = precioVenta > 0 ? (costoTotal / precioVenta) * 100 : 0
    
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
                  {formatMoneyDisplay(product.totalCost || 0)}
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
              
              {/* P-CONTRIBUCIÓN (Food Cost %) */}
              <div className={`mt-2 p-3 rounded-lg border-2 ${
                (product.pContribucion || product.foodCostPercent || 0) > 45
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
                    (product.pContribucion || product.foodCostPercent || 0) > 45
                      ? isDarkMode ? 'text-red-400' : 'text-red-600'
                      : isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    {(product.pContribucion || product.foodCostPercent || 0).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* M-CONTRIBUCIÓN (Utilidad $) */}
              <div className={`p-3 rounded-lg ${
                (product.mContribucion ?? product.actualProfit ?? 0) >= 0
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
                    (product.mContribucion ?? product.actualProfit ?? 0) >= 0
                      ? isDarkMode ? 'text-green-400' : 'text-green-600'
                      : isDarkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {formatMoneyDisplay(product.mContribucion ?? product.actualProfit ?? 0)}
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
          <div className="space-y-4 pb-6">{/* Padding inferior para evitar corte de botones */}
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

              {/* COLUMNA DERECHA: Modelo Excel Profesional */}
              {(formData.items ?? []).length > 0 && (
                <div>
                  <h4 className={`text-sm font-semibold mb-3 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    📊 Modelo Excel Profesional
                  </h4>
                  
                  <div className={`p-6 rounded-xl border-2 space-y-5 ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700' 
                      : 'bg-gradient-to-br from-white to-gray-50 border-gray-300'
                  }`}>
                    
                    {/* Costo Ingredientes */}
                    <div className={`p-3 rounded-lg ${
                      isDarkMode ? 'bg-black/20' : 'bg-gray-100'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Costo Ingredientes
                        </span>
                        <span className={`text-lg font-semibold ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {formatMoneyDisplay(metrics.ingredientsCost)}
                        </span>
                      </div>
                    </div>

                    {/* Mano de Obra */}
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Mano de Obra (Operario)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.laborCost}
                        onChange={(e) => setFormData({ ...formData, laborCost: parseFloat(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className={`w-full px-4 py-2 rounded-lg border font-semibold ${
                          isDarkMode
                            ? 'bg-[#1f2937] border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="0"
                      />
                    </div>

                    {/* COSTO TOTAL (CT) - DESTACADO */}
                    <div className={`p-5 rounded-xl border-3 shadow-lg ${
                      isDarkMode ? 'bg-blue-950 border-blue-600' : 'bg-blue-50 border-blue-400'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-bold ${
                          isDarkMode ? 'text-blue-300' : 'text-blue-700'
                        }`}>
                          COSTO UNIDAD (CT)
                        </span>
                        <span className={`text-4xl font-black ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          {formatMoneyDisplay(metrics.totalCost)}
                        </span>
                      </div>
                      <p className={`text-xs mt-2 ${
                        isDarkMode ? 'text-blue-400' : 'text-blue-600'
                      }`}>
                        = Ingredientes + Mano de Obra
                      </p>
                    </div>

                    {/* Precio de Venta */}
                    <div>
                      <label className={`block text-sm font-bold mb-2 ${
                        isDarkMode ? 'text-green-400' : 'text-green-700'
                      }`}>
                        💵 Precio de Venta
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.realSalePrice}
                        onChange={(e) => setFormData({ ...formData, realSalePrice: parseFloat(e.target.value) || 0 })}
                        onFocus={(e) => e.target.select()}
                        className={`w-full px-4 py-3 rounded-lg border-2 font-bold text-2xl ${
                          isDarkMode
                            ? 'bg-[#1f2937] border-green-600 text-green-400'
                            : 'bg-white border-green-500 text-green-700'
                        }`}
                        placeholder="0"
                      />
                    </div>

                    <div className="h-px bg-gray-600 my-4"></div>

                    {/* P-CONTRIBUCIÓN (Food Cost %) */}
                    <div className={`p-4 rounded-lg ${
                      metrics.pContribucion > 45
                        ? isDarkMode ? 'bg-red-900/40' : 'bg-red-100'
                        : isDarkMode ? 'bg-green-900/40' : 'bg-green-100'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-bold ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                          P-CONTRIBUCIÓN
                        </span>
                        <span className={`text-3xl font-black ${
                          metrics.pContribucion > 45
                            ? isDarkMode ? 'text-red-400' : 'text-red-600'
                            : isDarkMode ? 'text-green-400' : 'text-green-600'
                        }`}>
                          {metrics.pContribucion.toFixed(1)}%
                        </span>
                      </div>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Food Cost % = (CT / Precio Venta) × 100
                      </p>
                    </div>

                    {/* M-CONTRIBUCIÓN (Utilidad $) */}
                    <div className={`p-4 rounded-lg ${
                      metrics.mContribucion >= 0
                        ? isDarkMode ? 'bg-green-900/40' : 'bg-green-100'
                        : isDarkMode ? 'bg-red-900/40' : 'bg-red-100'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-bold ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                          M-CONTRIBUCIÓN
                        </span>
                        <span className={`text-3xl font-black ${
                          metrics.mContribucion >= 0
                            ? isDarkMode ? 'text-green-400' : 'text-green-600'
                            : isDarkMode ? 'text-red-400' : 'text-red-600'
                        }`}>
                          {formatMoneyDisplay(metrics.mContribucion)}
                        </span>
                      </div>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Utilidad $ = Precio Venta - CT
                      </p>
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
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-3 px-12 py-5 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all font-bold shadow-2xl text-xl hover:scale-105"
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
