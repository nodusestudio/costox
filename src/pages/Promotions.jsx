import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, AlertTriangle, TrendingUp, TrendingDown, Package, DollarSign } from 'lucide-react'
import { getPromotions, savePromotion, deletePromotion, getProducts } from '@/utils/storage'
import { formatMoneyDisplay } from '@/utils/formatters'
import { showToast } from '@/utils/toast'
import Modal from '@/components/Modal'
import SearchSelect from '@/components/SearchSelect'
import Button from '@/components/Button'

export default function Promotions() {
  const [promotions, setPromotions] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    items: [], // { type: 'product', id, quantity }
    comboPrice: 0,
  })

  // ===== CONVERSIÓN SEGURA A NÚMERO =====
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

  // ===== CARGAR DATOS =====
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [promosData, prodsData] = await Promise.all([
        getPromotions(),
        getProducts()
      ])
      
      setPromotions(Array.isArray(promosData) ? promosData : [])
      setProducts(Array.isArray(prodsData) ? prodsData : [])
    } catch (error) {
      console.error('Error loading data:', error)
      showToast('⚠️ Error al cargar datos', 'error')
      setPromotions([])
      setProducts([])
    }
    setLoading(false)
  }

  // ===== EXTRACCIÓN DINÁMICA DE COSTO DEL PRODUCTO =====
  // Busca el producto en Firebase y extrae su costoTotal (CT) actual
  const getProductLiveData = (productId) => {
    const product = products.find(p => p.id === productId)
    if (!product) {
      return { costoTotal: 0, precioVenta: 0, nombre: 'No encontrado' }
    }

    // Extraer CT (costoTotal) del producto
    const costoTotal = toNumber(product.totalCost || product.realCost || 0)
    
    // Extraer PV (precioVenta) del producto
    const precioVenta = toNumber(product.realSalePrice || product.salePrice || 0)

    return {
      costoTotal,
      precioVenta,
      nombre: product.name || 'Sin nombre'
    }
  }

  // ===== CÁLCULO DE MÉTRICAS DEL COMBO =====
  const calculateMetrics = () => {
    let costoTotal = 0
    let sumaPreciosCarta = 0
    const items = formData.items || []

    if (!Array.isArray(items)) {
      return {
        costoTotal: 0,
        sumaPreciosCarta: 0,
        precioCombo: 0,
        margenGanancia: 0,
        descuento: 0,
        utilidad: 0,
        isLosing: false
      }
    }

    // Sumar costos y precios de cada item usando datos en vivo
    items.forEach(item => {
      if (!item || !item.id) return
      
      const quantity = toNumber(item.quantity) || 1
      const liveData = getProductLiveData(item.id)
      
      costoTotal += toNumber(liveData.costoTotal) * quantity
      sumaPreciosCarta += toNumber(liveData.precioVenta) * quantity
    })

    const precioCombo = toNumber(formData.comboPrice) || sumaPreciosCarta
    
    // Margen de Ganancia: ((Precio Combo - Costo Total) / Precio Combo) * 100
    const utilidad = precioCombo - costoTotal
    const margenGanancia = precioCombo > 0 ? (utilidad / precioCombo) * 100 : 0
    
    // Descuento: ((Suma Precios Carta - Precio Combo) / Suma Precios Carta) * 100
    const descuento = sumaPreciosCarta > 0 ? ((sumaPreciosCarta - precioCombo) / sumaPreciosCarta) * 100 : 0

    return {
      costoTotal: Number(costoTotal.toFixed(2)),
      sumaPreciosCarta: Number(sumaPreciosCarta.toFixed(2)),
      precioCombo: Number(precioCombo.toFixed(2)),
      margenGanancia: Number(margenGanancia.toFixed(2)),
      descuento: Number(descuento.toFixed(2)),
      utilidad: Number(utilidad.toFixed(2)),
      isLosing: utilidad < 0
    }
  }

  // ===== CÁLCULO PARA PROMOCIONES GUARDADAS =====
  const calculateSavedMetrics = (promo) => {
    let costoTotal = 0
    let sumaPreciosCarta = 0

    const items = promo.items || []
    items.forEach(item => {
      if (!item || !item.id) return
      
      const quantity = toNumber(item.quantity) || 1
      const liveData = getProductLiveData(item.id)
      
      costoTotal += toNumber(liveData.costoTotal) * quantity
      sumaPreciosCarta += toNumber(liveData.precioVenta) * quantity
    })

    const precioCombo = toNumber(promo.comboPrice) || sumaPreciosCarta
    const utilidad = precioCombo - costoTotal
    const margenGanancia = precioCombo > 0 ? (utilidad / precioCombo) * 100 : 0
    const descuento = sumaPreciosCarta > 0 ? ((sumaPreciosCarta - precioCombo) / sumaPreciosCarta) * 100 : 0

    return {
      costoTotal: Number(costoTotal.toFixed(2)),
      sumaPreciosCarta: Number(sumaPreciosCarta.toFixed(2)),
      precioCombo: Number(precioCombo.toFixed(2)),
      margenGanancia: Number(margenGanancia.toFixed(2)),
      descuento: Number(descuento.toFixed(2)),
      utilidad: Number(utilidad.toFixed(2)),
      isLosing: utilidad < 0
    }
  }

  // ===== MODAL =====
  const handleOpenModal = (promo = null) => {
    if (promo) {
      setEditingId(promo.id)
      setFormData({
        name: promo.name || '',
        description: promo.description || '',
        items: Array.isArray(promo.items) ? promo.items : [],
        comboPrice: toNumber(promo.comboPrice)
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        items: [],
        comboPrice: 0
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId(null)
  }

  // ===== ITEMS DEL COMBO =====
  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { type: 'product', id: '', quantity: 1 }]
    })
  }

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
  }

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items]
    updated[index][field] = value
    setFormData({ ...formData, items: updated })
  }

  // ===== GUARDAR =====
  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast('El nombre es requerido', 'error')
      return
    }

    if (formData.items.length === 0) {
      showToast('Debe agregar al menos un producto', 'error')
      return
    }

    const metrics = calculateMetrics()
    if (metrics.isLosing) {
      if (!window.confirm('⚠️ Este combo generará PÉRDIDAS. ¿Continuar?')) {
        return
      }
    }

    try {
      // Solo guardar id y quantity, NO costos
      const comboToSave = {
        name: formData.name,
        description: formData.description,
        items: formData.items.map(item => ({
          type: item.type,
          id: item.id,
          quantity: toNumber(item.quantity) || 1
        })),
        comboPrice: toNumber(formData.comboPrice)
      }
      
      await savePromotion(comboToSave, editingId)
      showToast('✅ Promoción guardada exitosamente', 'success')
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Error saving promotion:', error)
      showToast('Error al guardar', 'error')
    }
  }

  // ===== ELIMINAR =====
  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta promoción?')) {
      try {
        await deletePromotion(id)
        showToast('✅ Promoción eliminada', 'success')
        await loadData()
      } catch (error) {
        console.error('Error deleting promotion:', error)
        showToast('Error al eliminar', 'error')
      }
    }
  }

  // ===== DUPLICAR =====
  const handleDuplicate = async (promo) => {
    try {
      const duplicated = {
        ...promo,
        name: `${promo.name} (Copia)`
      }
      delete duplicated.id
      await savePromotion(duplicated)
      showToast('✅ Promoción duplicada', 'success')
      await loadData()
    } catch (error) {
      console.error('Error duplicating promotion:', error)
      showToast('Error al duplicar', 'error')
    }
  }

  const metrics = showModal ? calculateMetrics() : null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Promociones (Combos)</h1>
          <p className="text-gray-400 text-sm mt-1">
            Agrupa productos con análisis de márgenes en tiempo real
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Promoción
        </Button>
      </div>

      {/* Lista de Promociones */}
      {promotions.length === 0 ? (
        <div className="bg-dark-card rounded-lg p-8 border border-gray-700 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No hay promociones registradas</p>
          <Button onClick={() => handleOpenModal()}>Crear primera promoción</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map(promo => {
            const promoMetrics = calculateSavedMetrics(promo)
            const isLowMargin = promoMetrics.margenGanancia < 20

            return (
              <div 
                key={promo.id} 
                className={`rounded-xl p-5 border transition-all hover:shadow-lg ${
                  promoMetrics.isLosing
                    ? 'border-red-600 bg-red-900/10'
                    : isLowMargin
                    ? 'border-yellow-600 bg-yellow-900/10'
                    : 'border-gray-700 bg-dark-card'
                }`}
              >
                {/* Alerta */}
                {(promoMetrics.isLosing || isLowMargin) && (
                  <div className={`flex items-center gap-2 mb-3 text-sm ${
                    promoMetrics.isLosing ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    <AlertTriangle size={16} />
                    <span>
                      {promoMetrics.isLosing 
                        ? '¡Genera pérdidas!' 
                        : `Margen bajo: ${promoMetrics.margenGanancia.toFixed(1)}%`
                      }
                    </span>
                  </div>
                )}

                {/* Nombre y Descripción */}
                <h3 className="font-bold text-lg text-white mb-1">{promo.name}</h3>
                {promo.description && (
                  <p className="text-sm text-gray-400 mb-3">{promo.description}</p>
                )}

                {/* Métricas */}
                <div className="bg-dark-bg/50 rounded-lg p-3 mb-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Items:</span>
                    <span className="text-white font-semibold">{promo.items?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Costo Total:</span>
                    <span className="text-white font-semibold">{formatMoneyDisplay(promoMetrics.costoTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Precio Carta:</span>
                    <span className="text-gray-300">{formatMoneyDisplay(promoMetrics.sumaPreciosCarta)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-700 pt-2">
                    <span className="text-primary-blue font-semibold">Precio Combo:</span>
                    <span className="text-primary-blue font-bold text-lg">
                      {formatMoneyDisplay(promoMetrics.precioCombo)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                    <div className="flex items-center gap-1">
                      {promoMetrics.isLosing ? (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-success-green" />
                      )}
                      <span className="text-gray-400">Margen:</span>
                    </div>
                    <span className={`font-bold ${
                      promoMetrics.isLosing 
                        ? 'text-red-400' 
                        : isLowMargin 
                        ? 'text-yellow-400' 
                        : 'text-success-green'
                    }`}>
                      {promoMetrics.margenGanancia.toFixed(1)}%
                    </span>
                  </div>
                  {promoMetrics.descuento > 0 && (
                    <div className="flex justify-between text-yellow-400">
                      <span>Descuento:</span>
                      <span className="font-semibold">{promoMetrics.descuento.toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                {/* Botones */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleOpenModal(promo)}
                    className="flex items-center justify-center gap-1 bg-primary-blue/20 hover:bg-primary-blue/30 text-primary-blue px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Edit2 size={14} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDuplicate(promo)}
                    className="flex items-center justify-center gap-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Plus size={14} />
                    Copiar
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="flex items-center justify-center gap-1 bg-red-900/20 hover:bg-red-900/30 text-red-400 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Trash2 size={14} />
                    Borrar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingId ? 'Editar Promoción' : 'Nueva Promoción'}
          maxWidth="4xl"
        >
          <div className="space-y-5">
            {/* Información Básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de la Promoción *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none transition-colors"
                  placeholder="Ej: Combo Familiar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Precio del Combo
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="number"
                    value={formData.comboPrice}
                    onChange={(e) => setFormData({ ...formData, comboPrice: e.target.value })}
                    min="0"
                    step="100"
                    className="w-full bg-dark-bg border border-gray-600 rounded-lg pl-10 pr-4 py-2.5 text-white focus:border-primary-blue focus:outline-none transition-colors"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Dejar en 0 para usar precio sugerido
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none resize-none transition-colors"
                placeholder="Descripción opcional de la promoción"
              />
            </div>

            {/* Items del Combo */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Productos en el Combo
                </label>
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-blue hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  Agregar Producto
                </button>
              </div>

              {/* Tabla de Productos */}
              {formData.items.length > 0 ? (
                <div className="bg-dark-bg/50 rounded-lg overflow-hidden border border-gray-700">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-dark-bg">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Producto</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">Cantidad</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Costo Unit.</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Precio Venta</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Subtotal</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {formData.items.map((item, index) => {
                          const quantity = toNumber(item.quantity) || 1
                          const liveData = getProductLiveData(item.id)
                          const subtotal = liveData.costoTotal * quantity

                          return (
                            <tr key={index} className="hover:bg-dark-bg/50 transition-colors">
                              <td className="px-4 py-3">
                                <SearchSelect
                                  options={products}
                                  value={item.id}
                                  onChange={(value) => handleItemChange(index, 'id', value)}
                                  placeholder="Buscar producto..."
                                  displayKey="name"
                                  valueKey="id"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                  min="1"
                                  step="1"
                                  className="w-20 px-3 py-2 bg-dark-bg border border-gray-600 rounded-lg text-white text-center focus:border-primary-blue focus:outline-none"
                                />
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-blue-400 font-semibold">
                                {formatMoneyDisplay(liveData.costoTotal)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-300">
                                {formatMoneyDisplay(liveData.precioVenta)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-white font-bold">
                                {formatMoneyDisplay(subtotal)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleRemoveItem(index)}
                                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-dark-bg/30 border border-dashed border-gray-600 rounded-lg p-8 text-center">
                  <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No hay productos agregados</p>
                  <p className="text-gray-600 text-xs mt-1">Haz clic en "Agregar Producto" para comenzar</p>
                </div>
              )}
            </div>

            {/* Resumen del Combo */}
            {metrics && formData.items.length > 0 && (
              <div className={`rounded-xl p-5 border-2 ${
                metrics.isLosing
                  ? 'border-red-600 bg-red-900/10'
                  : metrics.margenGanancia < 20
                  ? 'border-yellow-600 bg-yellow-900/10'
                  : 'border-green-600 bg-green-900/10'
              }`}>
                <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Resumen del Combo
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Costo Total */}
                  <div className="bg-dark-bg/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Costo Total</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatMoneyDisplay(metrics.costoTotal)}
                    </p>
                  </div>

                  {/* Precio Combo */}
                  <div className="bg-dark-bg/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Precio Combo</p>
                    <p className="text-2xl font-bold text-primary-blue">
                      {formatMoneyDisplay(metrics.precioCombo)}
                    </p>
                  </div>

                  {/* Margen de Ganancia */}
                  <div className="bg-dark-bg/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Margen de Ganancia</p>
                    <div className="flex items-center gap-2">
                      {metrics.isLosing ? (
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-success-green" />
                      )}
                      <p className={`text-2xl font-bold ${
                        metrics.isLosing 
                          ? 'text-red-400' 
                          : metrics.margenGanancia < 20 
                          ? 'text-yellow-400' 
                          : 'text-success-green'
                      }`}>
                        {metrics.margenGanancia.toFixed(1)}%
                      </p>
                    </div>
                    <p className={`text-xs mt-1 ${
                      metrics.isLosing ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      Utilidad: {formatMoneyDisplay(metrics.utilidad)}
                    </p>
                  </div>

                  {/* Descuento */}
                  <div className="bg-dark-bg/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 mb-1">Descuento</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {metrics.descuento.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      vs. Precio Carta: {formatMoneyDisplay(metrics.sumaPreciosCarta)}
                    </p>
                  </div>
                </div>

                {/* Alertas */}
                {metrics.isLosing && (
                  <div className="mt-4 flex items-center gap-3 text-red-400 bg-red-900/20 p-3 rounded-lg">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-semibold text-sm">
                      ⚠️ ADVERTENCIA: Este combo generará pérdidas de {formatMoneyDisplay(Math.abs(metrics.utilidad))}
                    </span>
                  </div>
                )}

                {!metrics.isLosing && metrics.margenGanancia < 20 && (
                  <div className="mt-4 flex items-center gap-3 text-yellow-400 bg-yellow-900/20 p-3 rounded-lg">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="font-semibold text-sm">
                      Margen bajo. Se recomienda un margen mínimo del 20%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-700">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-3 bg-primary-blue hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                {editingId ? 'Actualizar Promoción' : 'Crear Promoción'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
