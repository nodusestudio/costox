import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react'
import { getPromotions, savePromotions, getProducts } from '@/utils/storage'
import { formatMoneyDisplay } from '@/utils/formatters'
import Modal from '@/components/Modal'
import Button from '@/components/Button'

export default function Promotions() {
  const [promotions, setPromotions] = useState([])
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    products: [], // Solo { productId, quantity }
    discountPercent: 0,
  })

  // ===== FUNCIÓN BLINDADA PARA CONVERTIR A NÚMERO =====
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
    const loadData = async () => {
      try {
        const [promosData, prodsData] = await Promise.all([
          getPromotions(),
          getProducts()
        ])
        setPromotions(Array.isArray(promosData) ? promosData : [])
        setProducts(Array.isArray(prodsData) ? prodsData : [])
      } catch (error) {
        console.error('Error loading data:', error)
        setPromotions([])
        setProducts([])
      }
    }
    loadData()
  }, [])

  // ===== OBTENER DATOS EN VIVO DEL PRODUCTO =====
  // Busca el producto en el estado global y extrae sus datos actuales
  const getLiveProductData = (productId) => {
    const product = products.find(p => p.id === Number(productId))
    if (!product) {
      return { costoTotal: 0, precioVenta: 0, nombre: 'Producto no encontrado' }
    }

    // Extraer costoTotal (CT) del producto
    const costoTotal = toNumber(product.totalCost || product.realCost)
    
    // Extraer precioVenta (PV) del producto
    const precioVenta = toNumber(product.realSalePrice || product.salePrice)

    return {
      costoTotal,
      precioVenta,
      nombre: product.name || 'Sin nombre'
    }
  }

  // ===== CALCULAR MÉTRICAS DEL COMBO (RESUMEN BLINDADO) =====
  const calculatePromoMetrics = () => {
    let totalCost = 0
    let totalOriginalPrice = 0

    if (!Array.isArray(formData.products)) {
      return {
        totalCost: 0,
        totalOriginalPrice: 0,
        discountAmount: 0,
        finalPrice: 0,
        margin: 0
      }
    }

    // Sumar producto por producto usando datos en vivo
    formData.products.forEach(item => {
      if (!item || !item.productId) return
      
      const quantity = toNumber(item.quantity) || 1
      const liveData = getLiveProductData(item.productId)
      
      const itemCost = toNumber(liveData.costoTotal) * quantity
      const itemPrice = toNumber(liveData.precioVenta) * quantity
      
      totalCost += itemCost
      totalOriginalPrice += itemPrice
    })

    const discountAmount = totalOriginalPrice * (toNumber(formData.discountPercent) / 100)
    const finalPrice = totalOriginalPrice - discountAmount
    const margin = finalPrice > 0 ? ((finalPrice - totalCost) / finalPrice) * 100 : 0

    return {
      totalCost: Number(totalCost.toFixed(2)),
      totalOriginalPrice: Number(totalOriginalPrice.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      finalPrice: Number(finalPrice.toFixed(2)),
      margin: Number(margin.toFixed(2))
    }
  }

  // ===== CALCULAR MÉTRICAS PARA UNA PROMO GUARDADA =====
  const calculateSavedPromoMetrics = (promo) => {
    let totalCost = 0
    let totalOriginalPrice = 0

    if (!Array.isArray(promo.products)) {
      return {
        cost: 0,
        original: 0,
        finalPrice: 0,
        margin: 0
      }
    }

    promo.products.forEach(item => {
      if (!item || !item.productId) return
      
      const quantity = toNumber(item.quantity) || 1
      const liveData = getLiveProductData(item.productId)
      
      totalCost += toNumber(liveData.costoTotal) * quantity
      totalOriginalPrice += toNumber(liveData.precioVenta) * quantity
    })

    const finalPrice = totalOriginalPrice - (totalOriginalPrice * (toNumber(promo.discountPercent) / 100))
    const margin = finalPrice > 0 ? ((finalPrice - totalCost) / finalPrice) * 100 : 0

    return {
      cost: Number(totalCost.toFixed(2)),
      original: Number(totalOriginalPrice.toFixed(2)),
      finalPrice: Number(finalPrice.toFixed(2)),
      margin: Number(margin.toFixed(2))
    }
  }

  // ===== MODAL - ABRIR/CERRAR =====
  const handleOpenModal = (promo = null) => {
    if (promo) {
      setEditingId(promo.id)
      setFormData({
        name: promo.name || '',
        description: promo.description || '',
        products: Array.isArray(promo.products) ? promo.products : [],
        discountPercent: toNumber(promo.discountPercent)
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        products: [],
        discountPercent: 0
      })
    }
    setShowModal(true)
  }

  // ===== MANEJO DE PRODUCTOS DEL COMBO =====
  const handleAddProduct = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { productId: '', quantity: 1 }]
    })
  }

  const handleRemoveProduct = (index) => {
    setFormData({
      ...formData,
      products: formData.products.filter((_, i) => i !== index)
    })
  }

  const handleProductChange = (index, field, value) => {
    const updated = [...formData.products]
    updated[index][field] = value
    setFormData({ ...formData, products: updated })
  }

  // ===== GUARDAR COMBO =====
  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('El nombre de la promoción es requerido')
      return
    }

    if (formData.products.length === 0) {
      alert('Debe agregar al menos un producto a la promoción')
      return
    }

    const metrics = calculatePromoMetrics()
    let updatedPromotions

    // IMPORTANTE: Solo guardamos productId y quantity, NO costos
    const comboToSave = {
      ...formData,
      products: formData.products.map(item => ({
        productId: item.productId,
        quantity: toNumber(item.quantity) || 1
      })),
      margin: metrics.margin
    }

    if (editingId) {
      updatedPromotions = promotions.map(p =>
        p.id === editingId ? { ...p, ...comboToSave } : p
      )
    } else {
      updatedPromotions = [
        ...promotions,
        {
          id: Date.now(),
          ...comboToSave,
          createdAt: new Date().toISOString()
        }
      ]
    }

    setPromotions(updatedPromotions)
    savePromotions(updatedPromotions)
    setShowModal(false)
  }

  // ===== ELIMINAR COMBO =====
  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta promoción?')) {
      const updatedPromotions = promotions.filter(p => p.id !== id)
      setPromotions(updatedPromotions)
      savePromotions(updatedPromotions)
    }
  }

  const metrics = calculatePromoMetrics()

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
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

      {/* Lista de Combos */}
      {promotions.length === 0 ? (
        <div className="bg-dark-card rounded-lg p-8 border border-gray-700 text-center">
          <p className="text-gray-400 mb-4">No hay promociones registradas</p>
          <Button onClick={() => handleOpenModal()} label="Crear primera promoción" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {promotions.map(promo => {
            const promoMetrics = calculateSavedPromoMetrics(promo)
            const isLowMargin = promoMetrics.margin < 30

            return (
              <div 
                key={promo.id} 
                className={`rounded-lg p-5 border ${
                  isLowMargin 
                    ? 'border-red-600 bg-red-900/10' 
                    : 'border-gray-700 bg-dark-card'
                }`}
              >
                {isLowMargin && (
                  <div className="flex items-center gap-2 mb-3 text-red-400 text-sm">
                    <AlertCircle size={16} />
                    <span>Margen bajo: {promoMetrics.margin.toFixed(1)}%</span>
                  </div>
                )}

                <h3 className="font-semibold text-lg text-white mb-2">{promo.name}</h3>
                {promo.description && (
                  <p className="text-sm text-gray-400 mb-3">{promo.description}</p>
                )}

                {/* Resumen de la Promoción */}
                <div className="bg-dark-bg/50 rounded p-3 mb-4 space-y-2 text-sm">
                  <p className="text-gray-400">
                    <strong>Productos:</strong> {promo.products?.length || 0}
                  </p>
                  <p className="text-gray-400">
                    <strong>Precio Original:</strong> {formatMoneyDisplay(promoMetrics.original)}
                  </p>
                  <p className="text-yellow-400">
                    <strong>Descuento ({promo.discountPercent}%):</strong> -{formatMoneyDisplay(promoMetrics.original * (toNumber(promo.discountPercent) / 100))}
                  </p>
                  <p className="border-t border-gray-700 pt-2">
                    <strong className="text-primary-blue">Precio Final:</strong>{' '}
                    <span className="text-primary-blue font-bold">{formatMoneyDisplay(promoMetrics.finalPrice)}</span>
                  </p>
                  <p className={`pt-2 border-t border-gray-700 ${
                    isLowMargin ? 'text-red-400' : 'text-success-green'
                  }`}>
                    <strong>Margen:</strong> {promoMetrics.margin.toFixed(1)}%
                  </p>
                </div>

                {/* Botones de Acción */}
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

      {/* Modal de Promoción */}
      {showModal && (
        <Modal
          title={editingId ? 'Editar Promoción' : 'Nueva Promoción'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            {/* Nombre */}
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

            {/* Descripción */}
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

            {/* Productos del Combo */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Productos en el Combo
              </label>
              
              {/* Tabla de Productos */}
              {formData.products.length > 0 && (
                <div className="bg-dark-bg/50 rounded-lg overflow-hidden mb-2">
                  <table className="w-full text-sm">
                    <thead className="bg-dark-bg">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-400 font-medium">Producto</th>
                        <th className="px-3 py-2 text-center text-gray-400 font-medium">Cant.</th>
                        <th className="px-3 py-2 text-right text-gray-400 font-medium">Costo Unit.</th>
                        <th className="px-3 py-2 text-right text-gray-400 font-medium">Precio Venta</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.products.map((item, idx) => {
                        const quantity = toNumber(item.quantity) || 1
                        const liveData = getLiveProductData(item.productId)
                        
                        return (
                          <tr key={idx} className="border-t border-gray-700">
                            <td className="px-3 py-2">
                              <select
                                value={item.productId}
                                onChange={(e) => handleProductChange(idx, 'productId', e.target.value)}
                                className="w-full bg-dark-bg border border-gray-600 rounded px-2 py-1 text-white text-sm"
                              >
                                <option value="">Seleccionar</option>
                                {products.map(prod => (
                                  <option key={prod.id} value={prod.id}>{prod.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity || 1}
                                onChange={(e) => handleProductChange(idx, 'quantity', e.target.value)}
                                className="w-16 bg-dark-bg border border-gray-600 rounded px-2 py-1 text-white text-sm text-center"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-300">
                              {formatMoneyDisplay(liveData.costoTotal)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-300">
                              {formatMoneyDisplay(liveData.precioVenta)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => handleRemoveProduct(idx)}
                                className="bg-red-900/20 hover:bg-red-900/30 text-red-400 px-2 py-1 rounded text-sm"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Botón Agregar Producto */}
              <button
                onClick={handleAddProduct}
                className="w-full text-sm text-primary-blue hover:text-blue-400 border border-dashed border-primary-blue rounded-lg py-2"
              >
                + Agregar Producto
              </button>
            </div>

            {/* Porcentaje de Descuento */}
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
                  onChange={(e) => setFormData({ ...formData, discountPercent: toNumber(e.target.value) })}
                  className="flex-1 bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-primary-blue focus:outline-none"
                />
                <span className="text-gray-400">%</span>
              </div>
            </div>

            {/* Resumen de Promoción (BLINDADO) */}
            {formData.products.length > 0 && (
              <div className={`rounded-lg p-4 border ${
                metrics.margin < 30 
                  ? 'border-red-600 bg-red-900/10' 
                  : 'border-primary-blue bg-primary-blue/10'
              }`}>
                <h4 className="font-semibold text-white mb-3">Resumen del Combo</h4>
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
                    <span>Descuento ({formData.discountPercent}%):</span>
                    <span className="font-semibold">-{formatMoneyDisplay(metrics.discountAmount)}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-3 flex justify-between items-center">
                    <span className={metrics.margin < 30 ? 'text-red-400' : 'text-primary-blue'}>
                      <strong>Precio Final:</strong>
                    </span>
                    <span className={`text-xl font-bold ${
                      metrics.margin < 30 ? 'text-red-400' : 'text-primary-blue'
                    }`}>
                      {formatMoneyDisplay(metrics.finalPrice)}
                    </span>
                  </div>
                  <div className={`pt-2 border-t border-gray-600 ${
                    metrics.margin < 30 ? 'text-red-400' : 'text-success-green'
                  }`}>
                    <strong>Margen: {metrics.margin.toFixed(1)}%</strong>
                    {metrics.margin < 30 && (
                      <span className="block text-xs mt-1">⚠️ Bajo margen de rentabilidad</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Botones */}
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
