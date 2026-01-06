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
        profitMarginAmount: 0,
        suggestedPrice: 0,
        realSalePrice: 0,
        actualMargin: 0
      }
    }
    
    items.forEach(item => {
      if (!item || !item.id) return
      
      if (item.type === 'ingredient') {
        const ing = ingredients.find(i => i.id === item.id)
        if (ing && ing.costWithWastage) {
          // Si tiene pesoEmpaqueTotal, usar cálculo proporcional
          if (ing.pesoEmpaqueTotal) {
            totalCost += calcularCostoProporcional(
              ing.costWithWastage, 
              ing.pesoEmpaqueTotal, 
              parseFloat(item.quantity || 0)
            )
          } else {
            // Fallback para ingredientes antiguos
            totalCost += ing.costWithWastage * parseFloat(item.quantity || 0)
          }
        }
      } else {
        const rec = recipes.find(r => r.id === item.id)
        if (rec && rec.totalCost) {
          totalCost += rec.totalCost * parseFloat(item.quantity || 1)
        }
      }
    })

    const profitMarginPercent = parseFloat(formData.profitMarginPercent || 0)
    const profitMarginAmount = totalCost * (profitMarginPercent / 100)
    const suggestedPrice = totalCost + profitMarginAmount
    const realSalePrice = parseFloat(formData.realSalePrice) || suggestedPrice

    return {
      totalCost,
      profitMarginPercent,
      profitMarginAmount,
      suggestedPrice,
      realSalePrice,
      actualMargin: realSalePrice > 0 ? ((realSalePrice - totalCost) / realSalePrice) * 100 : 0
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
          ➕ Nuevo Producto
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
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {formatMoneyDisplay(product.totalCost || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Margen ({product.profitMarginPercent?.toFixed(1)}%)
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatMoneyDisplay(product.profitMarginAmount || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Precio Sugerido
                </span>
                <span className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}>
                  {formatMoneyDisplay(product.suggestedPrice || 0)}
                </span>
              </div>
            </div>

            <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Precio Real de Venta
                </span>
                <span className={`font-bold text-xl ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatMoneyDisplay(product.realSalePrice || 0)}
                </span>
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
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`block text-sm font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Componentes
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAddItem('ingredient')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md font-medium"
                  >
                    ➕ Ingrediente
                  </button>
                  <button
                    onClick={() => handleAddItem('recipe')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-md font-medium"
                  >
                    ➕ Receta
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(formData.items ?? []).map((item, index) => (
                  <div key={index} className={`p-4 rounded-lg flex gap-3 items-center ${
                    isDarkMode ? 'bg-[#111827] border border-gray-700' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <SearchSelect
                      options={item.type === 'ingredient' ? ingredients : recipes}
                      value={item.id}
                      onChange={(value) => handleItemChange(index, 'id', value)}
                      displayKey="name"
                      placeholder={`Buscar ${item.type === 'ingredient' ? 'ingrediente' : 'receta'}...`}
                    />

                    <input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                      className={`w-24 px-3 py-1 rounded border ${
                        isDarkMode
                          ? 'bg-[#1f2937] border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />

                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Cálculos Automáticos */}
            {(formData.items ?? []).length > 0 && (
              <div className={`p-4 rounded-lg space-y-3 ${
                isDarkMode ? 'bg-[#111827] border border-gray-700' : 'bg-gray-50 border border-gray-200'
              }`}>
                <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Cálculos Automáticos
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Costo Total</span>
                    <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatMoneyDisplay(metrics.totalCost)}
                    </span>
                  </div>

                  <div>
                    <label className={`block text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Margen de Utilidad (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={formData.profitMarginPercent}
                      onChange={(e) => setFormData({ ...formData, profitMarginPercent: parseFloat(e.target.value) })}
                      className={`w-full px-3 py-1 rounded border ${
                        isDarkMode
                          ? 'bg-[#1f2937] border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Utilidad ($)</span>
                    <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {formatMoneyDisplay(metrics.profitMarginAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Precio Sugerido</span>
                    <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {formatMoneyDisplay(metrics.suggestedPrice)}
                    </span>
                  </div>

                  <div>
                    <label className={`block text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Precio Real de Venta (Editable)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.realSalePrice || metrics.suggestedPrice}
                      onChange={(e) => setFormData({ ...formData, realSalePrice: parseFloat(e.target.value) })}
                      className={`w-full px-3 py-2 rounded border font-bold text-lg ${
                        isDarkMode
                          ? 'bg-[#1f2937] border-green-600 text-green-400'
                          : 'bg-white border-green-500 text-green-600'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-6 mt-10 pt-8 border-t-2 border-gray-600 pb-8 bg-gray-800/50 -mx-8 px-8 -mb-8 rounded-b-2xl">
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
