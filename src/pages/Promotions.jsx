import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'
import { getProducts, getRecipes, getAllDocs, saveDoc, deleteDocument } from '@/utils/storage'
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
      const [promoData, prodData, recData] = await Promise.all([
        getAllDocs('promotions'),
        getProducts(),
        getRecipes()
      ])
      setPromotions(Array.isArray(promoData) ? promoData : [])
      setProducts(Array.isArray(prodData) ? prodData : [])
      setRecipes(Array.isArray(recData) ? recData : [])
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

  // Buscar datos vivos por ID
  const getLiveItemData = (type, id) => {
    const source = type === 'product' ? products : recipes
    const item = source.find(i => i.id === id)
    if (!item) return { cost: 0, price: 0, name: '' }
    
    const cost = Number(item.totalCost || item.realCost || item.baseCost) || 0
    const price = Number(item.salePrice || item.realCost || item.baseCost) || 0
    return { cost, price, name: item.name || '' }
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del Combo</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-dark-bg border border-gray-700 rounded px-3 py-2"
                placeholder="Ej: Combo Familiar"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Items del Combo</label>
                <button
                  onClick={handleAddItem}
                  className="text-primary-blue text-sm flex items-center gap-1 hover:underline"
                >
                  <Plus size={16} /> Agregar Item
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {formData.items.map((item, index) => {
                  const sourceList = item.type === 'product' ? products : recipes
                  const options = sourceList.map(i => ({ value: i.id, label: i.name || 'Sin nombre' }))

                  return (
                    <div key={index} className="bg-dark-bg border border-gray-700 rounded p-3 space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-3">
                          <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                          <select
                            value={item.type}
                            onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                            className="w-full bg-dark-card border border-gray-700 rounded px-2 py-1 text-sm"
                          >
                            <option value="product">Producto</option>
                            <option value="recipe">Receta</option>
                          </select>
                        </div>

                        <div className="col-span-6">
                          <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                          <SearchSelect
                            options={options}
                            value={item.id}
                            onChange={(val) => handleItemChange(index, 'id', val)}
                            placeholder={`Buscar ${item.type === 'product' ? 'producto' : 'receta'}...`}
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block text-xs text-gray-400 mb-1">Cantidad</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full bg-dark-card border border-gray-700 rounded px-2 py-1 text-sm"
                            min="1"
                            step="1"
                          />
                        </div>

                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-400 hover:text-red-300 mt-5"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {item.id && (
                        <div className="text-xs text-gray-400 flex gap-4">
                          <span>Costo: {formatMoneyDisplay(getLiveItemData(item.type, item.id).cost * (Number(item.quantity) || 0))}</span>
                          <span>PVP: {formatMoneyDisplay(getLiveItemData(item.type, item.id).price * (Number(item.quantity) || 0))}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer con Totales */}
            {formData.items.length > 0 && (() => {
              const totals = calculateTotals(formData.items)
              const promoPrice = Number(formData.promoPrice) || 0
              const discountAmount = (totals.totalRegularPrice - promoPrice) || 0
              const discountPercent = totals.totalRegularPrice > 0 
                ? ((discountAmount / totals.totalRegularPrice) * 100) 
                : 0
              const margin = promoPrice > 0
                ? (((promoPrice - totals.totalCost) / promoPrice) * 100)
                : 0

              return (
                <div className="bg-dark-bg border border-gray-700 rounded p-4 space-y-2">
                  <h4 className="font-semibold text-sm mb-3 text-primary-blue">📊 Resumen del Combo</h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs">Suma Costos (CT)</p>
                      <p className="font-semibold text-lg">{formatMoneyDisplay(totals.totalCost)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Suma PVP Carta</p>
                      <p className="font-semibold text-lg line-through text-gray-400">{formatMoneyDisplay(totals.totalRegularPrice)}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-700">
                    <label className="block text-sm font-medium mb-1">Precio Promoción</label>
                    <input
                      type="number"
                      value={formData.promoPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, promoPrice: e.target.value }))}
                      className="w-full bg-dark-card border border-gray-700 rounded px-3 py-2 text-lg font-semibold"
                      placeholder="0"
                      min="0"
                      step="100"
                    />
                  </div>

                  {promoPrice > 0 && (
                    <div className="grid grid-cols-3 gap-3 text-sm pt-2 border-t border-gray-700">
                      <div>
                        <p className="text-gray-400 text-xs">Descuento $</p>
                        <p className="font-semibold text-yellow-400">{formatMoneyDisplay(discountAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Descuento %</p>
                        <p className="font-semibold text-yellow-400">{discountPercent.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Margen</p>
                        <p className={`font-semibold ${margin >= 25 ? 'text-success-green' : 'text-red-400'}`}>
                          {margin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1">
                {editingId ? 'Guardar Cambios' : 'Crear Combo'}
              </Button>
              <Button onClick={() => setShowModal(false)} variant="secondary" className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
