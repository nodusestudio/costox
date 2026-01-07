import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { getPromotions, savePromotion, deletePromotion, getProducts, getIngredients } from '@/utils/storage'
import { formatMoneyDisplay, calcularCostoProporcional } from '@/utils/formatters'
import Modal from '@/components/Modal'
import SearchSelect from '@/components/SearchSelect'
import Button from '@/components/Button'
import { useI18n } from '@/context/I18nContext'

export default function PromotionsNew() {
  const { isDarkMode } = useI18n()
  const [promotions, setPromotions] = useState([])
  const [products, setProducts] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
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
      setPromotions(Array.isArray(promotionsData) ? promotionsData : [])
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
        items: Array.isArray(promotion.items) ? promotion.items : [],
        comboPrice: promotion.comboPrice || 0,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
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
        if (prod && prod.totalCost && prod.realSalePrice) {
          totalCost += (prod.totalCost || 0) * quantity
          totalSuggestedPrice += (prod.realSalePrice || 0) * quantity
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
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Error saving promotion:', error)
      alert('Error al guardar')
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
            Combos / Promociones
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Análisis inteligente de descuentos y márgenes
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-3 bg-primary-blue hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg font-medium"
        >
          <Plus size={20} />
          Nuevo Combo
        </button>
      </div>

      {/* Grid de Combos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(promotions || []).map(promo => (
          <div key={promo.id} className={`p-4 rounded-xl border ${
            promo.isLosing
              ? 'border-red-500 bg-red-900/10'
              : promo.profitMarginPercent < 20
              ? 'border-yellow-500 bg-yellow-900/10'
              : isDarkMode
              ? 'bg-[#1f2937] border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
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
                {promo.description && (
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {promo.description}
                  </p>
                )}
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

      {promotions.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${
          isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
            No hay combos registrados
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

            <div>
              <div className="flex items-center justify-between mb-2">
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
                    Producto
                  </button>
                  <button
                    onClick={() => handleAddItem('ingredient')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md font-medium"
                  >
                    Ingrediente
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(formData.items ?? []).map((item, index) => (
                  <div key={index} className={`p-4 rounded-lg flex gap-3 items-center ${
                    isDarkMode ? 'bg-[#111827] border border-gray-700' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <SearchSelect
                      options={item.type === 'product' ? products : ingredients}
                      value={item.id}
                      onChange={(value) => handleItemChange(index, 'id', value)}
                      displayKey="name"
                      placeholder={`Buscar ${item.type === 'product' ? 'producto' : 'ingrediente'}...`}
                    />

                    <input
                      type="number"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className={`w-20 px-3 py-1 rounded border ${
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

            {/* Dashboard Compacto */}
            {(formData.items ?? []).length > 0 && (
              <div className={`p-4 rounded-xl border-2 ${
                metrics.isLosing
                  ? 'bg-red-900/20 border-red-500'
                  : metrics.isLowMargin
                  ? 'bg-yellow-900/20 border-yellow-500'
                  : isDarkMode
                  ? 'bg-gradient-to-br from-green-950 to-gray-900 border-green-700'
                  : 'bg-gradient-to-br from-green-50 to-white border-green-300'
              }`}>
                {/* Cabecera: Nombre + Precio en MISMA LÍNEA */}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h3 className={`text-lg font-bold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {formData.name || 'Nuevo Combo'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <label className={`text-xs font-bold whitespace-nowrap ${
                      isDarkMode ? 'text-green-300' : 'text-green-700'
                    }`}>
                      💵 PRECIO:
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.comboPrice || metrics.totalSuggestedPrice}
                      onChange={(e) => setFormData({ ...formData, comboPrice: parseFloat(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className={`w-32 px-3 py-1 rounded-lg border-2 font-black text-center ${
                        isDarkMode
                          ? 'bg-[#0a2818] border-green-500 text-green-300'
                          : 'bg-white border-green-500 text-green-700'
                      }`}
                      style={{ fontSize: '2rem' }}
                      placeholder="$ 0"
                    />
                  </div>
                </div>

                {/* Tres Cajas de Métricas - MÁS COMPACTAS */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Costo Total */}
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

                  {/* P-Contribución */}
                  <div className={`p-2 rounded-lg text-center ${
                    isDarkMode ? 'bg-gray-800/50 border border-gray-600' : 'bg-gray-100 border border-gray-300'
                  }`}>
                    <div className={`text-xs font-bold mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      P-CONTRIB.
                    </div>
                    <div className={`text-lg font-black ${
                      metrics.isLosing
                        ? 'text-red-400'
                        : metrics.isLowMargin
                        ? 'text-yellow-400'
                        : isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {metrics.profitMarginPercent.toFixed(1)}%
                    </div>
                  </div>

                  {/* M-Contribución (Ganancia $) */}
                  <div className={`p-2 rounded-lg text-center ${
                    isDarkMode ? 'bg-purple-950/50 border border-purple-700' : 'bg-purple-50 border border-purple-300'
                  }`}>
                    <div className={`text-xs font-bold mb-1 ${
                      isDarkMode ? 'text-purple-300' : 'text-purple-700'
                    }`}>
                      M-CONTRIB.
                    </div>
                    <div className={`text-lg font-black ${
                      metrics.isLosing ? 'text-red-400' : isDarkMode ? 'text-purple-400' : 'text-purple-600'
                    }`}>
                      {formatMoneyDisplay(metrics.profitAmount)}
                    </div>
                  </div>
                </div>

                {/* Info adicional: Precio Normal y Descuento */}
                {metrics.discountAmount > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-600">
                    <div className="flex justify-between text-xs">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                        Precio Normal: <span className="line-through">{formatMoneyDisplay(metrics.totalSuggestedPrice)}</span>
                      </span>
                      <span className="text-yellow-400 font-semibold">
                        Descuento: {metrics.discountPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {metrics.isLosing && (
                  <div className="mt-2 p-2 bg-red-900/40 border border-red-700 rounded">
                    <p className="text-red-400 text-xs font-semibold">
                      ⚠️ Este combo generará PÉRDIDAS. Ajusta el precio o revisa los componentes.
                    </p>
                  </div>
                )}

                {metrics.isLowMargin && !metrics.isLosing && (
                  <div className="mt-2 p-2 bg-yellow-900/40 border border-yellow-700 rounded">
                    <p className="text-yellow-400 text-xs font-semibold">
                      ⚠️ Margen bajo. Considera aumentar el precio para mejorar rentabilidad.
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
    </div>
  )
}
