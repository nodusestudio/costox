import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'
import { getProducts, getRecipes, getIngredients, getAllDocs, saveDoc, deleteDocument } from '@/utils/storage'
import { formatMoneyDisplay } from '@/utils/formatters'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import SearchSelect from '@/components/SearchSelect'
import { useI18n } from '@/context/I18nContext'

export default function Promotions() {
  const { t, isDarkMode } = useI18n()
  const [promotions, setPromotions] = useState([])
  const [products, setProducts] = useState([])
  const [recipes, setRecipes] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    items: [],
    promoPrice: 0,
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

  const handleOpenModal = (promo = null) => {
    if (promo) {
      setEditingId(promo.id)
      setFormData({
        name: promo.name || '',
        items: Array.isArray(promo.items) ? promo.items : [],
        promoPrice: Number(promo.promoPrice) || 0,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        items: [],
        promoPrice: 0,
      })
    }
    setShowModal(true)
  }

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { type: 'product', id: '', quantity: 1 }]
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
    } else {
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
    }
  }

  // Calcular totales en tiempo real
  const calculateTotals = (items) => {
    let totalCost = 0
    let totalRegularPrice = 0

    items.forEach(item => {
      const qty = Number(item.quantity) || 0
      const liveData = getLiveItemData(item.type, item.id)
      totalCost += liveData.cost * qty
      totalRegularPrice += liveData.price * qty
    })

    return {
      totalCost: Number(totalCost) || 0,
      totalRegularPrice: Number(totalRegularPrice) || 0
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre es requerido')
      return
    }
    if (formData.items.length === 0) {
      alert('Agrega al menos 1 item al combo')
      return
    }

    const promoData = {
      name: formData.name.trim(),
      items: formData.items,
      promoPrice: Number(formData.promoPrice) || 0,
      updatedAt: new Date().toISOString()
    }

    try {
      if (editingId) {
        await saveDoc('promotions', editingId, promoData)
      } else {
        await saveDoc('promotions', null, { ...promoData, createdAt: new Date().toISOString() })
      }
      await loadData()
      setShowModal(false)
    } catch (error) {
      console.error('Error saving promotion:', error)
      alert('Error al guardar')
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
        <Button onClick={() => handleOpenModal()}>
          <Plus size={20} />
          Nuevo Combo
        </Button>
      </div>

      {promotions.length === 0 ? (
        <div className={`rounded-lg p-12 text-center border ${isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'}`}>
          <Tag size={48} className="mx-auto mb-4 text-gray-500" />
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No hay combos registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map(promo => {
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
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-6">
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

            {/* Precio de Venta - Centro con recuadro verde */}
            <div className={`p-6 rounded-xl border-2 text-center ${
              isDarkMode
                ? 'bg-green-950/50 border-green-600'
                : 'bg-green-50 border-green-400'
            }`}>
              <label className={`block text-sm font-bold mb-3 ${
                isDarkMode ? 'text-green-300' : 'text-green-700'
              }`}>
                💵 PRECIO DE VENTA
              </label>
              <input
                type="number"
                step="100"
                min="0"
                value={formData.promoPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, promoPrice: e.target.value }))}
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

            {/* Tres Bloques de Métricas */}
            {(() => {
              const totals = calculateTotals(formData.items)
              const promoPrice = Number(formData.promoPrice) || 0
              const profit = promoPrice - totals.totalCost
              const margin = promoPrice > 0
                ? (((promoPrice - totals.totalCost) / promoPrice) * 100)
                : 0

              return (
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
                      {formatMoneyDisplay(totals.totalCost)}
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
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {margin.toFixed(1)}%
                    </div>
                  </div>

                  {/* M-Contribución */}
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
                      {formatMoneyDisplay(profit)}
                    </div>
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
                <button
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium"
                >
                  + Agregar Item
                </button>
              </div>

              <div className={`rounded-lg border ${
                isDarkMode ? 'bg-[#0a0e1a] border-gray-700' : 'bg-gray-50 border-gray-300'
              }`}>
                {/* Cabecera */}
                <div className={`grid grid-cols-12 gap-2 p-3 border-b font-bold text-xs ${
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-200 border-gray-300 text-gray-700'
                }`}>
                  <div className="col-span-2">TIPO</div>
                  <div className="col-span-6">NOMBRE</div>
                  <div className="col-span-2 text-center">CANT</div>
                  <div className="col-span-2 text-right">COSTO</div>
                </div>

                {/* Lista de Items */}
                <div className="max-h-[300px] overflow-y-auto">
                  {formData.items.map((item, index) => {
                    const liveData = getLiveItemData(item.type, item.id)
                    const qty = Number(item.quantity) || 1
                    const itemCost = liveData.cost * qty
                    const sourceList = item.type === 'product' ? products : recipes

                    return (
                      <div key={index} className={`grid grid-cols-12 gap-2 p-3 border-b text-sm ${
                        isDarkMode ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-100'
                      }`}>
                        <div className="col-span-2">
                          <select
                            value={item.type}
                            onChange={(e) => {
                              handleItemChange(index, 'type', e.target.value)
                              handleItemChange(index, 'id', '') // Reset ID cuando cambia el tipo
                            }}
                            className={`w-full px-2 py-1 rounded border text-xs ${
                              isDarkMode
                                ? 'bg-[#111827] border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            <option value="product">Producto</option>
                            <option value="recipe">Receta</option>
                          </select>
                        </div>

                        <div className="col-span-6">
                          <SearchSelect
                            options={sourceList}
                            value={item.id}
                            onChange={(val) => handleItemChange(index, 'id', val)}
                            displayKey="name"
                            valueKey="id"
                            placeholder={`Buscar ${item.type === 'product' ? 'producto' : 'receta'}...`}
                            className="w-full"
                          />
                        </div>

                        <div className="col-span-2">
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

                        <div className={`col-span-2 flex items-center justify-end gap-1 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          <span className="font-semibold text-xs truncate">{formatMoneyDisplay(itemCost)}</span>
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
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-primary-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                {editingId ? 'Guardar Cambios' : 'Crear Combo'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
