import { useState } from 'react'
import { Plus, Edit2, Trash2, Folder } from 'lucide-react'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import { useCategories } from '@/context/CategoriesContext'
import { useI18n } from '@/context/I18nContext'

const COLORS = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Amarillo', value: '#F59E0B' },
  { name: 'Morado', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Naranja', value: '#F97316' },
  { name: 'Gris', value: '#6B7280' },
]

export default function CategoriesManager() {
  const { isDarkMode } = useI18n()
  const { categoriesRecipes, categoriesProducts, saveCategory, deleteCategory } = useCategories()
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [activeTab, setActiveTab] = useState('recipes') // 'recipes' o 'products'
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
  })

  // Combinar categorías o mostrar según tab activo
  const categories = activeTab === 'recipes' ? categoriesRecipes : categoriesProducts

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingId(category.id)
      setFormData({
        name: category.name || '',
        color: category.color || '#3B82F6',
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        color: '#3B82F6',
      })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre es requerido')
      return
    }

    console.log('🚀 Iniciando guardado desde CategoriesManager...', { formData, editingId, activeTab })
    const success = await saveCategory(formData, editingId, activeTab)
    console.log('🚀 Resultado del guardado:', success)
    if (success) {
      setShowModal(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta categoría?')) {
      await deleteCategory(id, activeTab)
    }
  }

  return (
    <div className={`p-4 md:p-6 space-y-6 ${isDarkMode ? 'bg-[#111827]' : 'bg-white'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Categorías
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Organiza tus productos, recetas y promociones
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-blue hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md"
        >
          <Plus size={20} />
          Nueva Categoría
        </button>
      </div>

      {/* Tabs para tipo de categoría */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'recipes'
              ? 'text-primary-blue border-b-2 border-primary-blue'
              : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Recetas
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'products'
              ? 'text-primary-blue border-b-2 border-primary-blue'
              : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Productos
        </button>
      </div>

      {/* Grid de Categorías */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {(categories || []).map(category => (
          <div
            key={category.id}
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {category.name}
                </h3>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleOpenModal(category)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'hover:bg-[#111827] text-blue-400'
                      : 'hover:bg-gray-100 text-blue-600'
                  }`}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
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
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${
          isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <Folder className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} size={48} />
          <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
            No hay categorías registradas
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          title={editingId ? 'Editar Categoría' : 'Nueva Categoría'}
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
                placeholder="Ej: Bebidas, Postres, etc."
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.color === color.value
                        ? 'border-primary-blue scale-105'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                  >
                    <span className="text-white text-xs font-bold">{color.name}</span>
                  </button>
                ))}
              </div>
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
