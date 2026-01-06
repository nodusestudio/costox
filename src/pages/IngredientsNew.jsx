import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Upload, Download, Filter } from 'lucide-react'
import { getIngredients, saveIngredient, deleteIngredient, getSuppliers } from '@/utils/storage'
import { formatMoneyDisplay } from '@/utils/formatters'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import { useI18n } from '@/context/I18nContext'
import * as XLSX from 'xlsx'

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
    contenido: '', // Contenido/Empaque
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
      setIngredients(Array.isArray(ingredientsData) ? ingredientsData : [])
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
    } catch (error) {
      console.error('Error loading data:', error)
      setIngredients([])
      setSuppliers([])
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
        contenido: ingredient.contenido || '',
        purchaseCost: ingredient.purchaseCost,
        wastagePercent: ingredient.wastagePercent,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        supplierId: '',
        unit: 'kg',
        contenido: '',
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
      const file = e.target.files?.[0]
      if (!file) return
      
      try {
        const reader = new FileReader()
        reader.onload = async (evt) => {
          try {
            const data = new Uint8Array(evt.target.result)
            const workbook = XLSX.read(data, { type: 'array' })
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(firstSheet)
            
            let imported = 0
            let skipped = 0
            
            for (const row of jsonData) {
              const name = row.Nombre || row.nombre || row.Name || row.name
              const proveedor = row.Proveedor || row.proveedor || ''
              const unit = row.Unidad || row.unidad || row.Unit || 'UNIDADES'
              const contenido = row['Contenido/Empaque'] || row.Contenido || row.contenido || ''
              const purchaseCost = parseFloat(row['Costo Unitario'] || row['Costo Compra'] || row.Costo || 0)
              const wastagePercent = parseFloat(row['Merma %'] || row['% Merma'] || row.Merma || 0)
              
              if (name && purchaseCost > 0) {
                // Buscar o crear proveedor
                let supplierId = ''
                if (proveedor) {
                  const existingSupplier = suppliers.find(s => 
                    s.name.toLowerCase() === proveedor.toLowerCase()
                  )
                  supplierId = existingSupplier?.id || ''
                }
                
                await saveIngredient({
                  name: String(name).trim(),
                  supplierId,
                  unit: String(unit).trim(),
                  contenido: String(contenido).trim(),
                  purchaseCost,
                  wastagePercent
                })
                imported++
              } else {
                skipped++
              }
            }
            
            alert(`✅ ${imported} ingredientes importados\n${skipped > 0 ? `⚠️ ${skipped} filas omitidas (datos incompletos)` : ''}`)
            await loadData()
          } catch (error) {
            console.error('Error parsing Excel:', error)
            alert('Error al procesar el archivo. Verifica que tenga las columnas: Nombre, Proveedor, Unidad, Contenido/Empaque, Costo Unitario, Merma %')
          }
        }
        reader.readAsArrayBuffer(file)
      } catch (error) {
        console.error('Error importing Excel:', error)
        alert('Error al importar archivo')
      }
    }
    input.click()
  }

  const handleExportExcel = () => {
    try {
      const exportData = (filteredIngredients || []).map((ing, index) => ({
        'ID': ing.id || `ING${index + 1}`,
        'Nombre': ing.name || '',
        'Proveedor': getSupplierName(ing.supplierId),
        'Unidad': ing.unit || '',
        'Contenido/Empaque': ing.contenido || '',
        'Costo Unitario': ing.purchaseCost || 0,
        'Merma %': ing.wastagePercent || 0
      }))
      
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      // Ajustar anchos de columna
      const colWidths = [
        { wch: 25 }, // ID
        { wch: 35 }, // Nombre
        { wch: 30 }, // Proveedor
        { wch: 15 }, // Unidad
        { wch: 30 }, // Contenido/Empaque
        { wch: 15 }, // Costo Unitario
        { wch: 10 }  // Merma %
      ]
      ws['!cols'] = colWidths
      
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Productos')
      XLSX.writeFile(wb, `Productos-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (error) {
      console.error('Error exporting Excel:', error)
      alert('Error al exportar')
    }
  }

  const getSupplierName = (supplierId) => {
    if (!supplierId) return 'Sin proveedor'
    const supplier = (suppliers || []).find(s => s.id === supplierId)
    return supplier?.name || 'Sin proveedor'
  }

  const filteredIngredients = filterSupplier
    ? (ingredients || []).filter(ing => ing.supplierId === filterSupplier)
    : (ingredients || [])

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
        <div className="flex gap-3">
          <button
            onClick={handleImportExcel}
            className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg font-medium"
          >
            <Upload size={20} />
            📥 Importar Excel
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg font-medium"
          >
            <Download size={20} />
            📤 Exportar Excel
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-3 bg-primary-blue hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg font-medium"
          >
            <Plus size={20} />
            ➕ Nuevo Ingrediente
          </button>
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
          {(suppliers || []).map(sup => (
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
                <th className={`px-4 py-3 text-left text-xs font-semibold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>Contenido/Empaque</th>
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
              {(filteredIngredients || []).map(ing => (
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
                  <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {ing.contenido || '-'}
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
            <p className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No hay ingredientes registrados
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Empieza por cargar tu Excel o crea uno manualmente
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
                {(suppliers || []).map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Contenido/Empaque
              </label>
              <input
                type="text"
                value={formData.contenido}
                onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Ej: X 100GR, X 1KG, etc."
              />
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
                  <option value="UNIDADES">UNIDADES</option>
                  <option value="KILOGRAMOS">KILOGRAMOS</option>
                  <option value="GRAMOS">GRAMOS</option>
                  <option value="LITROS">LITROS</option>
                  <option value="MILILITROS">MILILITROS</option>
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

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-700">
              <button
                onClick={() => setShowModal(false)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium shadow-md"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-md"
              >
                💾 Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
