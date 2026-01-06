import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Package, BookOpen } from 'lucide-react'
import { getRecipes, saveRecipe, deleteRecipe, getIngredients } from '@/utils/storage'
import { formatMoneyDisplay } from '@/utils/formatters'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import SearchSelect from '@/components/SearchSelect'
import { useI18n } from '@/context/I18nContext'

export default function RecipesNew() {
  const { isDarkMode } = useI18n()
  const [recipes, setRecipes] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ingredients: [], // { type: 'ingredient' | 'recipe', id, quantity }
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [recipesData, ingredientsData] = await Promise.all([
        getRecipes(),
        getIngredients()
      ])
      setRecipes(Array.isArray(recipesData) ? recipesData : [])
      setIngredients(Array.isArray(ingredientsData) ? ingredientsData : [])
    } catch (error) {
      console.error('Error loading data:', error)
      setRecipes([])
      setIngredients([])
    }
    setLoading(false)
  }

  const handleOpenModal = (recipe = null) => {
    if (recipe) {
      setEditingId(recipe.id)
      setFormData({
        name: recipe.name || '',
        description: recipe.description || '',
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        ingredients: [],
      })
    }
    setShowModal(true)
  }

  const handleAddItem = (type) => {
    const currentItems = Array.isArray(formData.ingredients) ? formData.ingredients : []
    setFormData({
      ...formData,
      ingredients: [
        ...currentItems,
        { type, id: '', quantity: 1 }
      ]
    })
  }

  const handleRemoveItem = (index) => {
    const currentItems = Array.isArray(formData.ingredients) ? formData.ingredients : []
    setFormData({
      ...formData,
      ingredients: currentItems.filter((_, i) => i !== index)
    })
  }

  const handleItemChange = (index, field, value) => {
    const currentItems = Array.isArray(formData.ingredients) ? formData.ingredients : []
    const updated = [...currentItems]
    if (updated[index]) {
      updated[index][field] = value
    }
    setFormData({ ...formData, ingredients: updated })
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre es requerido')
      return
    }

    try {
      await saveRecipe(formData, editingId)
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Error saving recipe:', error)
      alert('Error al guardar')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar esta receta?')) {
      try {
        await deleteRecipe(id)
        await loadData()
      } catch (error) {
        console.error('Error deleting recipe:', error)
        alert('Error al eliminar')
      }
    }
  }

  const getItemName = (item) => {
    if (item.type === 'ingredient') {
      const ing = ingredients.find(i => i.id === item.id)
      return ing?.name || 'Desconocido'
    } else {
      const rec = recipes.find(r => r.id === item.id)
      return rec?.name || 'Desconocido'
    }
  }

  const calculatePreviewCost = () => {
    let total = 0
    const items = formData.ingredients || []
    
    // Validar que sea un array
    if (!Array.isArray(items)) {
      return 0
    }
    
    items.forEach(item => {
      if (!item || !item.id) return
      
      if (item.type === 'ingredient') {
        const ing = ingredients.find(i => i.id === item.id)
        if (ing && ing.costWithWastage) {
          total += ing.costWithWastage * parseFloat(item.quantity || 0)
        }
      } else {
        const rec = recipes.find(r => r.id === item.id)
        if (rec && rec.totalCost) {
          total += rec.totalCost * parseFloat(item.quantity || 1)
        }
      }
    })
    return total
  }

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
            Recetas (Sub-productos)
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Pueden usarse como ingredientes en Productos y Combos
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-blue hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md"
        >
          <Plus size={18} />
          <Plus size={20} />
          ➕ Nueva Receta
        </button>
      </div>

      {/* Grid de Recetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(recipes || []).map(recipe => (
          <div key={recipe.id} className={`p-4 rounded-xl border ${
            isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {recipe.name}
                </h3>
                {recipe.description && (
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {recipe.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleOpenModal(recipe)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'hover:bg-[#111827] text-blue-400'
                      : 'hover:bg-gray-100 text-blue-600'
                  }`}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(recipe.id)}
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

            <div className={`text-sm space-y-1 mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <p>{recipe.ingredients?.length || 0} componente(s)</p>
            </div>

            <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Costo Total
                </span>
                <span className={`font-bold text-lg ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatMoneyDisplay(recipe.totalCost || 0)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recipes.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${
          isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
            No hay recetas registradas
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          title={editingId ? 'Editar Receta' : 'Nueva Receta'}
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
                placeholder="Ej: Masa de Pizza"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                rows={2}
                placeholder="Opcional"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className={`block text-sm font-medium ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Componentes
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAddItem('ingredient')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md font-medium"
                  >
                    <Package size={18} />
                    ➕ Ingrediente
                  </button>
                  <button
                    onClick={() => handleAddItem('recipe')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-md font-medium"
                  >
                    <BookOpen size={18} />
                    ➕ Receta
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {(formData.ingredients ?? []).map((item, index) => (
                  <div key={index} className="p-6 rounded-xl border-2 bg-[#111827] border-gray-600 shadow-lg">
                    <div className="flex gap-4 items-start">
                      <div className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md ${
                        item.type === 'ingredient'
                          ? 'bg-blue-600 text-white'
                          : 'bg-purple-600 text-white'
                      }`}>
                        {item.type === 'ingredient' ? <Package size={18} /> : <BookOpen size={18} />}
                        {item.type === 'ingredient' ? 'Ingrediente' : 'Receta'}
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <SearchSelect
                          options={item.type === 'ingredient' ? ingredients : (recipes ?? []).filter(r => r.id !== editingId)}
                          value={item.id}
                          onChange={(value) => handleItemChange(index, 'id', value)}
                          placeholder={`Buscar ${item.type === 'ingredient' ? 'ingrediente' : 'receta'}...`}
                          displayKey="name"
                          valueKey="id"
                        />

                        <div className="flex gap-3 items-center">
                          <label className="text-gray-400 text-sm font-medium">Cantidad:</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                            className="w-32 px-4 py-2 rounded-lg border bg-[#1f2937] border-gray-600 text-white focus:border-primary-blue focus:outline-none"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="p-3 rounded-lg hover:bg-red-900/30 text-red-400 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {(formData.ingredients || []).length === 0 && (
                <p className={`text-sm text-center py-4 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Agrega ingredientes o recetas
                </p>
              )}
            </div>

            {/* Preview del costo */}
            {(formData.ingredients || []).length > 0 && (
              <div className={`p-3 rounded-lg ${
                isDarkMode ? 'bg-green-900/20 border border-green-700' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-green-300' : 'text-green-700'
                  }`}>
                    Costo Total Estimado
                  </span>
                  <span className={`font-bold ${
                    isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    {formatMoneyDisplay(calculatePreviewCost())}
                  </span>
                </div>
              </div>
            )}

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
