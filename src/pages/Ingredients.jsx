import { useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { getIngredients, saveIngredients, getSuppliers, getConfig } from '@/utils/storage'
import { formatMoneyDisplay, formatCurrency } from '@/utils/formatters'
import Modal from '@/components/Modal'
import Button from '@/components/Button'

export default function Ingredients() {
  const [ingredients, setIngredients] = useState(getIngredients())
  const [suppliers] = useState(getSuppliers())
  const [config] = useState(getConfig())
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    supplierId: '',
    presentation: '',
    presentationUnit: 'gr',
    purchaseCost: 0,
    wastagePercent: config.globalWastagePercent,
  })

  const handleOpenModal = (ingredient = null) => {
    if (ingredient) {
      setEditingId(ingredient.id)
      setFormData(ingredient)
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        supplierId: '',
        presentation: '',
        presentationUnit: 'gr',
        purchaseCost: 0,
        wastagePercent: config.globalWastagePercent,
      })
    }
    setShowModal(true)
  }

  const calculateRealCost = (cost, qty, waste) => {
    return (cost / parseFloat(qty || 1)) * (1 + (parseFloat(waste || 0) / 100))
  }

  const handleSave = () => {
    if (!formData.name.trim() || !formData.presentation) {
      alert('Nombre y presentación son requeridos')
      return
    }

    let updatedIngredients
    const newIngredient = {
      ...formData,
      presentation: parseFloat(formData.presentation),
      purchaseCost: parseFloat(formData.purchaseCost),
      wastagePercent: parseFloat(formData.wastagePercent),
      realUnitCost: calculateRealCost(
        formData.purchaseCost,
        formData.presentation,
        formData.wastagePercent
      ),
    }

    if (editingId) {
      updatedIngredients = (ingredients ?? []).map(i =>
        i.id === editingId ? { ...i, ...newIngredient } : i
      )
    } else {
      updatedIngredients = [
        ...ingredients,
        {
          id: Date.now(),
          ...newIngredient,
          createdAt: new Date().toISOString(),
        },
      ]
    }

    setIngredients(updatedIngredients)
    saveIngredients(updatedIngredients)
    setShowModal(false)
  }

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este ingrediente?')) {
      const updatedIngredients = ingredients.filter(i => i.id !== id)
      setIngredients(updatedIngredients)
      saveIngredients(updatedIngredients)
    }
  }

  const getSupplierName = (supplierId) => {
    return suppliers.find(s => s.id === parseInt(supplierId))?.name || 'Sin proveedor'
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Ingredientes</h2>
          <p className="text-gray-400 text-sm mt-1">Gestión de insumos con costos y merma</p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          icon={Plus}
          label="Nuevo Ingrediente"
        />
      </div>

      {ingredients.length === 0 ? (
        <div className="bg-dark-card rounded-lg p-8 border border-gray-700 text-center">
          <p className="text-gray-400 mb-4">No hay ingredientes registrados</p>
          <Button onClick={() => handleOpenModal()} label="Crear primer ingrediente" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-300">Ingrediente</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-300">Proveedor</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300">Presentación</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300">Costo Compra</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300">Merma %</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-300">Costo Unit. Real</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(ingredients ?? []).map(ingredient => (
                <tr key={ingredient.id} className="border-b border-gray-700 hover:bg-dark-bg/50">
                  <td className="py-3 px-4 font-medium">{ingredient.name}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{getSupplierName(ingredient.supplierId)}</td>
                  <td className="py-3 px-4 text-right text-gray-300">
                    {ingredient.presentation} {ingredient.presentationUnit}
                  </td>
                  <td className="py-3 px-4 text-right text-primary-blue font-semibold">
                    {formatMoneyDisplay(ingredient.purchaseCost)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-300">{ingredient.wastagePercent.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-right text-success-green font-semibold">
                    {formatCurrency(ingredient.realUnitCost)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleOpenModal(ingredient)}
                      className="inline-flex items-center gap-1 bg-primary-blue/20 hover:bg-primary-blue/30 text-primary-blue px-2 py-1 rounded text-xs mr-2"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(ingredient.id)}
                      className="inline-flex items-center gap-1 bg-red-900/20 hover:bg-red-900/30 text-red-400 px-2 py-1 rounded text-xs"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editingId ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Ingrediente *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none"
                placeholder="Ej: Harina"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Proveedor
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-primary-blue focus:outline-none"
              >
                <option value="">Seleccionar proveedor</option>
                {(suppliers ?? []).map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Presentación (cantidad) *
                </label>
                <input
                  type="number"
                  value={formData.presentation}
                  onChange={(e) => setFormData({ ...formData, presentation: e.target.value })}
                  className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none"
                  placeholder="Ej: 1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Unidad *
                </label>
                <select
                  value={formData.presentationUnit}
                  onChange={(e) => setFormData({ ...formData, presentationUnit: e.target.value })}
                  className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-primary-blue focus:outline-none"
                >
                  <option value="gr">Gramos (gr)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="unid">Unidades (unid)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="l">Litros (l)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Costo de Compra ($) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.purchaseCost}
                onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                % de Merma (Pérdida) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={formData.wastagePercent}
                  onChange={(e) => setFormData({ ...formData, wastagePercent: e.target.value })}
                  className="flex-1 bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none"
                  placeholder="0"
                />
                <span className="text-gray-400">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Merma global por defecto: {config.globalWastagePercent}%</p>
            </div>

            <div className="bg-dark-bg/50 rounded-lg p-3 border border-gray-700">
              <p className="text-xs font-medium text-gray-400 mb-2">Cálculo:</p>
              <p className="text-sm text-gray-300">
                Costo Real = ({formatMoneyDisplay(formData.purchaseCost)} ÷ {formData.presentation || '?'}) × (1 + {formData.wastagePercent || 0}%)
              </p>
              {formData.presentation && formData.purchaseCost && (
                <p className="text-sm text-success-green font-semibold mt-2">
                  = {formatCurrency(calculateRealCost(formData.purchaseCost, formData.presentation, formData.wastagePercent))} por unidad
                </p>
              )}
            </div>

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
