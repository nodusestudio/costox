import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Upload, Download, Filter } from 'lucide-react'
import { getIngredients, saveIngredient, deleteIngredient, getSuppliers } from '@/utils/storage'
import { formatMoneyDisplay } from '@/utils/formatters'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import { useI18n } from '@/context/I18nContext'

export default function IngredientsNew() {
  const { isDarkMode } = useI18n()
  const [ingredients, setIngredients] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filterSupplier, setFilterSupplier] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    supplierId: '',
    unit: 'kg',
    purchaseCost: 0,
    wastagePercent: 30, // 30% por defecto de fábrica
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [ingredientsData, suppliersData] = await Promise.all([
        getIngredients(),
        getSuppliers()
      ])
      setIngredients(ingredientsData)
      setSuppliers(suppliersData)
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Error al cargar datos')
    }
    setLoading(false)
  }

  const handleOpenModal = (ingredient = null) => {
    if (ingredient) {
      setEditingId(ingredient.id)
      setFormData({
        name: ingredient.name,
        supplierId: ingredient.supplierId,
        unit: ingredient.unit,
        purchaseCost: ingredient.purchaseCost,
        wastagePercent: ingredient.wastagePercent,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        supplierId: '',
        unit: 'kg',
        purchaseCost: 0,
        wastagePercent: 30,
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre es requerido')
      return
    }

    try {
      await saveIngredient(formData, editingId)
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Error saving ingredient:', error)
      alert('Error al guardar')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este ingrediente?')) {
      try {
        await deleteIngredient(id)
        await loadData()
      } catch (error) {
        console.error('Error deleting ingredient:', error)
        alert('Error al eliminar')
      }
    }
  }

  const handleImportExcel = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,.xlsx,.xls'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (file) {
        alert('Importación Excel próximamente')
        // TODO: Implementar importación Excel
      }
    }
    input.click()
  }

  const handleExportExcel = () => {
    // Crear CSV simple
    const headers = ['Nombre', 'Proveedor', 'Unidad', 'Costo Compra', '% Merma', 'Costo con Merma']
    const rows = filteredIngredients.map(ing => [
      ing.name,
      getSupplierName(ing.supplierId),
      ing.unit,
      ing.purchaseCost,
      ing.wastagePercent,
      ing.costWithWastage
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ingredientes_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId)
    return supplier?.name || 'Sin proveedor'
  }

  const filteredIngredients = filterSupplier
    ? ingredients.filter(ing => ing.supplierId === filterSupplier)
    : ingredients

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
            Ingredientes
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Merma del 30% aplicada automáticamente (editable)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleImportExcel} variant="secondary">
            <Upload size={18} />
            Importar
          </Button>
          <Button onClick={handleExportExcel} variant="secondary">
            <Download size={18} />
            Exportar
          </Button>
          <Button onClick={() => handleOpenModal()}>
            <Plus size={18} />
            Nuevo
          </Button>
        </div>
      </div>

      {/* Filtro por Proveedor */}
      <div className="flex items-center gap-3">
        <Filter size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
        <select
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            isDarkMode
              ? 'bg-[#1f2937] border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          <option value="">Todos los proveedores</option>
          {suppliers.map(sup => (
            <option key={sup.id} value={sup.id}>{sup.name}</option>
          ))}
        </select>
      </div>

      {/* Tabla de Ingredientes */}
      <div className={`rounded-xl border overflow-hidden ${
        isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={isDarkMode ? 'bg-[#111827]' : 'bg-gray-50'}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-semibold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Nombre</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Proveedor</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Unidad</th>
                <th className={`px-4 py-3 text-right text-xs font-semibold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Costo Compra</th>
                <th className={`px-4 py-3 text-right text-xs font-semibold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>% Merma</th>
                <th className={`px-4 py-3 text-right text-xs font-semibold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Costo con Merma</th>
                <th className={`px-4 py-3 text-right text-xs font-semibold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.map(ing => (
                <tr key={ing.id} className={`border-t ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <td className={`px-4 py-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {ing.name}
                  </td>
                  <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getSupplierName(ing.supplierId)}
                  </td>
                  <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {ing.unit}
                  </td>
                  <td className={`px-4 py-3 text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatMoneyDisplay(ing.purchaseCost)}
                  </td>
                  <td className={`px-4 py-3 text-right ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    {ing.wastagePercent.toFixed(1)}%
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {formatMoneyDisplay(ing.costWithWastage)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(ing)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode
                            ? 'hover:bg-[#111827] text-blue-400'
                            : 'hover:bg-gray-100 text-blue-600'
                        }`}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(ing.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isDarkMode
                            ? 'hover:bg-[#111827] text-red-400'
                            : 'hover:bg-gray-100 text-red-600'
                        }`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredIngredients.length === 0 && (
          <div className="text-center py-12">
            <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
              No hay ingredientes registrados
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal
          title={editingId ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">
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
                placeholder="Ej: Harina 000"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Proveedor
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Seleccionar proveedor</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Unidad
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-[#111827] border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="kg">kg</option>
                  <option value="gr">gr</option>
                  <option value="lt">lt</option>
                  <option value="ml">ml</option>
                  <option value="un">unidad</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Costo de Compra *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchaseCost}
                  onChange={(e) => setFormData({ ...formData, purchaseCost: parseFloat(e.target.value) })}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-[#111827] border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                % Merma (Fábrica: 30%)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.wastagePercent}
                onChange={(e) => setFormData({ ...formData, wastagePercent: parseFloat(e.target.value) })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Costo con merma: {formatMoneyDisplay(formData.purchaseCost * (1 + formData.wastagePercent / 100))}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={() => setShowModal(false)} variant="secondary">
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Guardar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
