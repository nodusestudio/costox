import { useState } from 'react'
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react'
import { getPromotions, savePromotions, getProducts } from '@/utils/storage'
import { formatMoneyDisplay } from '@/utils/formatters'
import Modal from '@/components/Modal'
import Button from '@/components/Button'

export default function Promotions() {
  const [promotions, setPromotions] = useState(getPromotions())
  const [products] = useState(getProducts())
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    products: [],
    discountPercent: 0,
  })

  const handleOpenModal = (promo = null) => {
    if (promo) {
      setEditingId(promo.id)
      setFormData(promo)
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        products: [],
        discountPercent: 0,
      })
    }
    setShowModal(true)
  }

  const calculatePromoMetrics = () => {
    let totalCost = 0
    let totalOriginalPrice = 0

    formData.products.forEach(item => {
      const product = products.find(p => p.id === parseInt(item.productId))
      if (product) {
        totalCost += product.realCost * (item.quantity || 1)
        totalOriginalPrice += product.salePrice * (item.quantity || 1)
      }
    })

    const discountAmount = totalOriginalPrice * (formData.discountPercent / 100)
    const finalPrice = totalOriginalPrice - discountAmount
    const margin = finalPrice > 0 ? ((finalPrice - totalCost) / finalPrice) * 100 : 0

    return {
      totalCost,
      totalOriginalPrice,
      discountAmount,
      finalPrice,
      margin,
    }
  }

  const handleAddProduct = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { productId: '', quantity: 1 }],
    })
  }

  const handleRemoveProduct = (index) => {
    setFormData({
      ...formData,
      products: formData.products.filter((_, i) => i !== index),
    })
  }

  const handleProductChange = (index, field, value) => {
    const updated = [...formData.products]
    updated[index][field] = value
    setFormData({ ...formData, products: updated })
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('El nombre de la promoción es requerido')
      return
    }

    if (formData.products.length === 0) {
      alert('Debe agregar al menos un producto a la promoción')
      return
    }

    let updatedPromotions
    const metrics = calculatePromoMetrics()

    if (editingId) {
      updatedPromotions = (promotions ?? []).map(p =>
        p.id === editingId
          ? { ...p, ...formData, margin: metrics.margin }
          : p
      )
    } else {
      updatedPromotions = [
        ...promotions,
        {
          id: Date.now(),
          ...formData,
          margin: metrics.margin,
          createdAt: new Date().toISOString(),
        },
      ]
    }

    setPromotions(updatedPromotions)
    savePromotions(updatedPromotions)
    setShowModal(false)
  }

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta promoción?')) {
      const updatedPromotions = promotions.filter(p => p.id !== id)
      setPromotions(updatedPromotions)
      savePromotions(updatedPromotions)
    }
  }

  const getProductName = (id) => {
    return products.find(p => p.id === parseInt(id))?.name || 'Desconocido'
  }

  const metrics = calculatePromoMetrics()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Promociones (Combos)</h2>
          <p className="text-gray-400 text-sm mt-1">Agrupa productos con alerta si margen cae bajo 30%</p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          icon={Plus}
          label="Nueva Promoción"
        />
      </div>

      {promotions.length === 0 ? (
        <div className="bg-dark-card rounded-lg p-8 border border-gray-700 text-center">
          <p className="text-gray-400 mb-4">No hay promociones registradas</p>
          <Button onClick={() => handleOpenModal()} label="Crear primera promoción" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(promotions ?? []).map(promo => {
            const promoMetrics = (promo.products ?? []).reduce((acc, item) => {
              const product = products.find(p => p.id === parseInt(item.productId))
              if (product) {
                acc.cost += product.realCost * (item.quantity || 1)
                acc.original += product.salePrice * (item.quantity || 1)
              }
              return acc
            }, { cost: 0, original: 0 })

            const finalPrice = promoMetrics.original - (promoMetrics.original * (promo.discountPercent / 100))
            const margin = finalPrice > 0 ? ((finalPrice - promoMetrics.cost) / finalPrice) * 100 : 0
            const isLowMargin = margin < 30

            return (
              <div key={promo.id} className={`rounded-lg p-5 border ${isLowMargin ? 'border-red-600 bg-red-900/10' : 'border-gray-700 bg-dark-card'}`}>
                {isLowMargin && (
                  <div className="flex items-center gap-2 mb-3 text-red-400 text-sm">
                    <AlertCircle size={16} />
                    <span>Margen bajo: {margin.toFixed(1)}%</span>
                  </div>
                )}

                <h3 className="font-semibold text-lg text-white mb-2">{promo.name}</h3>
                {promo.description && (
                  <p className="text-sm text-gray-400 mb-3">{promo.description}</p>
                )}

                <div className="bg-dark-bg/50 rounded p-3 mb-4 space-y-2 text-sm">
                  <p className="text-gray-400">
                    <strong>Productos:</strong> {promo.products.length}
                  </p>
                  <p className="text-gray-400">
                    <strong>Precio Original:</strong> {formatMoneyDisplay(promoMetrics.original)}
                  </p>
                  <p className="text-yellow-400">
                    <strong>Descuento ({promo.discountPercent}%):</strong> -{formatMoneyDisplay((promoMetrics.original * (promo.discountPercent / 100)))}
                  </p>
                  <p className="border-t border-gray-700 pt-2">
                    <strong className="text-primary-blue">Precio Final:</strong>{' '}
                    <span className="text-primary-blue font-bold">{formatMoneyDisplay(finalPrice)}</span>
                  </p>
                  <p className={`pt-2 border-t border-gray-700 ${isLowMargin ? 'text-red-400' : 'text-success-green'}`}>
                    <strong>Margen:</strong> {margin.toFixed(1)}%
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenModal(promo)}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary-blue/20 hover:bg-primary-blue/30 text-primary-blue px-3 py-2 rounded-lg transition-colors text-sm"
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 px-3 py-2 rounded-lg transition-colors text-sm"
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <Modal
          title={editingId ? 'Editar Promoción' : 'Nueva Promoción'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre de la Promoción *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none"
                placeholder="Ej: Combo Desayuno"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none resize-none"
                rows="2"
                placeholder="Descripción de la promoción"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Productos en el Combo
              </label>
              <div className="space-y-2 bg-dark-bg/50 p-3 rounded-lg max-h-40 overflow-y-auto">
                {(formData.products ?? []).map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductChange(idx, 'productId', e.target.value)}
                      className="flex-1 bg-dark-bg border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    >
                      <option value="">Seleccionar</option>
                      {(products ?? []).map(prod => (
                        <option key={prod.id} value={prod.id}>{prod.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity || 1}
                      onChange={(e) => handleProductChange(idx, 'quantity', parseInt(e.target.value))}
                      className="w-16 bg-dark-bg border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    />
                    <button
                      onClick={() => handleRemoveProduct(idx)}
                      className="bg-red-900/20 hover:bg-red-900/30 text-red-400 px-2 py-1 rounded text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddProduct}
                className="w-full mt-2 text-sm text-primary-blue hover:text-blue-400 border border-dashed border-primary-blue rounded-lg py-2"
              >
                + Agregar Producto
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                % de Descuento
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={formData.discountPercent}
                  onChange={(e) => setFormData({ ...formData, discountPercent: parseFloat(e.target.value) })}
                  className="flex-1 bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-primary-blue focus:outline-none"
                />
                <span className="text-gray-400">%</span>
              </div>
            </div>

            {/* Resumen de Promoción */}
            {formData.products.length > 0 && (
              <div className={`rounded-lg p-4 border ${metrics.margin < 30 ? 'border-red-600 bg-red-900/10' : 'border-primary-blue bg-primary-blue/10'}`}>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Costo Total:</span>
                    <span className="text-gray-200 font-semibold">{formatMoneyDisplay(metrics.totalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Precio Original:</span>
                    <span className="text-gray-200 font-semibold">{formatMoneyDisplay(metrics.totalOriginalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-yellow-400">
                    <span>Descuento:</span>
                    <span className="font-semibold">-{formatMoneyDisplay(metrics.discountAmount)}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-3 flex justify-between items-center">
                    <span className={metrics.margin < 30 ? 'text-red-400' : 'text-primary-blue'}>
                      <strong>Precio Final:</strong>
                    </span>
                    <span className={`text-xl font-bold ${metrics.margin < 30 ? 'text-red-400' : 'text-primary-blue'}`}>
                      {formatMoneyDisplay(metrics.finalPrice)}
                    </span>
                  </div>
                  <div className={`pt-2 border-t border-gray-600 ${metrics.margin < 30 ? 'text-red-400' : 'text-success-green'}`}>
                    <strong>Margen: {metrics.margin.toFixed(1)}%</strong>
                    {metrics.margin < 30 && <span className="block text-xs mt-1">⚠️ Bajo margen de rentabilidad</span>}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-primary-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
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
