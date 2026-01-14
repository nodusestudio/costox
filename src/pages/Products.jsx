import { useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { getProducts, saveProducts, getRecipes, getIngredients } from '@/utils/storage'
import { formatMoneyDisplay } from '@/utils/formatters'
import Modal from '@/components/Modal'
import Button from '@/components/Button'

export default function Products() {
  const [products, setProducts] = useState(getProducts())
  const [recipes] = useState(getRecipes())
  const [ingredients] = useState(getIngredients())
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    recipeId: '',
    baseIngredients: [],
    additionalCost: 0,
    profitMarginPercent: 30,
    quantity: 1,
  })

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingId(product.id)
      setFormData(product)
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        recipeId: '',
        baseIngredients: [],
        additionalCost: 0,
        profitMarginPercent: 30,
        quantity: 1,
      })
    }
    setShowModal(true)
  }

  const calculateRealCost = () => {
    let baseCost = 0
    if (formData.recipeId) {
      const recipe = recipes.find(r => r.id === parseInt(formData.recipeId))
      baseCost = recipe?.baseCost || 0
    }
    baseCost += (formData.baseIngredients ?? []).reduce((sum, item) => {
      const ingredient = ingredients.find(i => i.id === parseInt(item.ingredientId))
      return sum + (ingredient?.realUnitCost * parseFloat(item.quantity || 0) || 0)
    }, 0)
    return baseCost + parseFloat(formData.additionalCost || 0)
  }

  const calculateSalePrice = () => {
    const realCost = calculateRealCost()
    const margin = parseFloat(formData.profitMarginPercent || 0)
    // FÓRMULA CORREGIDA: margen sobre precio de venta
    // Precio = Costo / (1 - (Margen / 100))
    if (margin >= 100) return realCost * 2 // Fallback
    return realCost / (1 - (margin / 100))
  }

  const handleAddIngredient = () => {
    setFormData({
      ...formData,
      baseIngredients: [
        ...formData.baseIngredients,
        { ingredientId: '', quantity: '' },
      ],
    })
  }

  const handleRemoveIngredient = (index) => {
    setFormData({
      ...formData,
      baseIngredients: formData.baseIngredients.filter((_, i) => i !== index),
    })
  }

  const handleIngredientChange = (index, field, value) => {
    const updated = [...formData.baseIngredients]
    updated[index][field] = value
    setFormData({ ...formData, baseIngredients: updated })
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('El nombre del producto es requerido')
      return
    }

    let updatedProducts
    const realCost = calculateRealCost()
    const salePrice = calculateSalePrice()

    if (editingId) {
      updatedProducts = (products ?? []).map(p =>
        p.id === editingId
          ? { ...p, ...formData, realCost, salePrice }
          : p
      )
    } else {
      updatedProducts = [
        ...products,
        {
          id: Date.now(),
          ...formData,
          realCost,
          salePrice,
          createdAt: new Date().toISOString(),
        },
      ]
    }

    setProducts(updatedProducts)
    saveProducts(updatedProducts)
    setShowModal(false)
  }

  const handleDelete = (id) => {
    console.log('[handleDelete] CLICK en eliminar. ID recibido:', id, 'Tipo:', typeof id);
    if (!window.confirm('¿Deseas eliminar este ítem?')) return;
    if (!id) {
      console.warn('[handleDelete] ID nulo o vacío:', id);
      setProducts(prev => prev.filter(item => item.id));
      return;
    }
    const idStr = String(id);
    console.log('[handleDelete] ID normalizado:', idStr);
    setProducts(prev => {
      const filtered = prev.filter(item => String(item.id) !== idStr);
      console.log('[handleDelete] Estado local tras filtro:', filtered.map(i => i.id));
      return filtered;
    });
    try {
      // await deleteDoc(doc(db, 'products', idStr));
      saveProducts(products.filter(item => String(item.id) !== idStr));
      // Si usas Firebase, descomenta la línea de arriba y comenta la de abajo
      // await deleteDocument('products', idStr);
      console.log('[handleDelete] Borrado en backend ejecutado para:', idStr);
    } catch (error) {
      console.error('[handleDelete] Error al eliminar producto:', error);
      alert('Error al eliminar el producto.');
    }
  }

  const realCost = calculateRealCost()
  const salePrice = calculateSalePrice()
  const margin = ((salePrice - realCost) / salePrice) * 100

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-3 gap-2 items-center">
        <div className="col-span-2">
          <h2 className="text-2xl font-bold text-white">Productos Finales</h2>
          <p className="text-gray-400 text-xs mt-1">Combina recetas e ingredientes para venta</p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          icon={Plus}
          label="Nuevo Producto"
        />
      </div>

      {products.length === 0 ? (
        <div className="bg-dark-card rounded-lg p-8 border border-gray-700 text-center">
          <p className="text-gray-400 mb-4">No hay productos registrados</p>
          <Button onClick={() => handleOpenModal()} label="Crear primer producto" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-300">Producto</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300">Costo Real</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300">Precio Venta</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300">Margen %</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300">Ganancia</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map(product => {
                const productMargin = product.salePrice > 0
                  ? ((product.salePrice - product.realCost) / product.salePrice) * 100
                  : 0
                const gain = product.salePrice - product.realCost
                return (
                  <tr key={product.id} className="border-b border-gray-700 hover:bg-dark-bg/50">
                    <td className="py-3 px-4 font-medium">{product.name}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{formatMoneyDisplay(product.realCost)}</td>
                    <td className="py-3 px-4 text-right text-primary-blue font-semibold text-lg">{formatMoneyDisplay(product.salePrice)}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${productMargin >= 30 ? 'text-success-green' : 'text-yellow-400'}`}>
                      {productMargin.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right text-success-green font-semibold">{formatMoneyDisplay(gain)}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="inline-flex items-center gap-1 bg-primary-blue/20 hover:bg-primary-blue/30 text-primary-blue px-2 py-1 rounded text-xs mr-2"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          console.log('Botón eliminar clickeado', product.id);
                          handleDelete(product.id);
                        }}
                        className="inline-flex items-center gap-1 bg-red-900/20 hover:bg-red-900/30 text-red-400 px-2 py-1 rounded text-xs"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editingId ? 'Editar Producto' : 'Nuevo Producto'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-2">
            {/* CABECERA EN 3 COLUMNAS */}
            <div className="grid grid-cols-3 gap-2">
              {/* Nombre del Producto */}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  📋 Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-bg border border-gray-600 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none text-sm"
                  placeholder="Ej: Pan Integral"
                />
              </div>

              {/* Utilidad Deseada */}
              <div>
                <label className="block text-xs font-medium text-blue-300 mb-1">
                  🎯 Utilidad Deseada
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="1"
                    value={formData.profitMarginPercent}
                    onChange={(e) => setFormData({ ...formData, profitMarginPercent: e.target.value })}
                    className="w-full bg-dark-bg border-2 border-blue-600 rounded-lg px-2 py-1.5 text-blue-300 font-bold text-sm text-center focus:outline-none"
                  />
                  <span className="text-blue-300 font-bold">%</span>
                </div>
              </div>
            </div>

            {/* Segunda fila */}
            <div className="grid grid-cols-2 gap-2">
              {/* Receta Base */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  📖 Receta Base
                </label>
                <select
                  value={formData.recipeId}
                  onChange={(e) => setFormData({ ...formData, recipeId: e.target.value })}
                  className="w-full bg-dark-bg border border-gray-600 rounded-lg px-2 py-1.5 text-white focus:border-primary-blue focus:outline-none text-sm"
                >
                  <option value="">Sin receta base</option>
                  {(recipes ?? []).map(recipe => (
                    <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                  ))}
                </select>
              </div>

              {/* Costo Adicional */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  💰 Costo Adicional
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.additionalCost}
                  onChange={(e) => setFormData({ ...formData, additionalCost: e.target.value })}
                  className="w-full bg-dark-bg border border-gray-600 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Tabla de Ingredientes DENSA */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                🥖 Ingredientes Adicionales
              </label>
              <div className="bg-dark-bg/50 rounded-lg border border-gray-700">
                {/* Cabecera */}
                <div className="grid grid-cols-12 gap-2 px-2 py-1 border-b border-gray-700 bg-gray-800 text-xs font-bold text-gray-300">
                  <div className="col-span-8">INGREDIENTE</div>
                  <div className="col-span-3 text-center">CANTIDAD</div>
                  <div className="col-span-1"></div>
                </div>
                
                {/* Filas DENSAS */}
                <div className="max-h-32 overflow-y-auto">
                  {(formData.baseIngredients ?? []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 px-2 py-1 border-b border-gray-700/50 hover:bg-gray-800/50 text-sm">
                      <div className="col-span-8">
                        <select
                          value={item.ingredientId}
                          onChange={(e) => handleIngredientChange(idx, 'ingredientId', e.target.value)}
                          className="w-full bg-dark-bg border border-gray-600 rounded px-2 py-1 text-white text-xs"
                        >
                          <option value="">Seleccionar</option>
                          {(ingredients ?? []).map(ing => (
                            <option key={ing.id} value={ing.id}>{ing.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-dark-bg border border-gray-600 rounded px-2 py-1 text-white text-xs text-center"
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <button
                          onClick={() => handleRemoveIngredient(idx)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(formData.baseIngredients ?? []).length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-xs">
                      Sin ingredientes adicionales
                    </div>
                  )}
                </div>
                
                {/* Botón agregar */}
                <button
                  onClick={handleAddIngredient}
                  className="w-full py-1.5 text-xs text-primary-blue hover:text-blue-400 border-t border-gray-700 hover:bg-gray-800/50"
                >
                  + Agregar Ingrediente
                </button>
              </div>
            </div>

            {/* Resumen COMPACTO */}
            <div className="bg-primary-blue/10 rounded-lg p-2 border border-primary-blue">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300">Costo Real:</span>
                  <span className="text-gray-200 font-semibold">{formatMoneyDisplay(realCost)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300">Utilidad ({formData.profitMarginPercent}%):</span>
                  <span className="text-gray-200 font-semibold">{formatMoneyDisplay((realCost * formData.profitMarginPercent) / 100)}</span>
                </div>
                <div className="border-t border-primary-blue/30 pt-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-primary-blue">Precio Sugerido:</span>
                    <span className="text-xl font-bold text-primary-blue">{formatMoneyDisplay(salePrice)}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Margen: {margin.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-primary-blue hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium text-sm"
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
