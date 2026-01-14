import { useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { getRecipes, saveRecipes, getIngredients } from '@/utils/storage'
import { formatMoneyDisplay } from '@/utils/formatters'
import Modal from '@/components/Modal'
import Button from '@/components/Button'

export default function Recipes() {
  const [recipes, setRecipes] = useState(getRecipes())
  const [ingredients] = useState(getIngredients())
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ingredients: [],
    preparation: '',
    referencePhoto: null,
  })

  const handleOpenModal = (recipe = null) => {
    if (recipe) {
      setEditingId(recipe.id)
      setFormData(recipe)
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        ingredients: [],
        preparation: '',
        referencePhoto: null,
      })
    }
    setShowModal(true)
  }

  const handleAddIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        { ingredientId: '', quantity: '', unit: 'gr' },
      ],
    })
  }

  const handleRemoveIngredient = (index) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    })
  }

  const handleIngredientChange = (index, field, value) => {
    const updatedIngredients = [...formData.ingredients]
    updatedIngredients[index][field] = value
    setFormData({ ...formData, ingredients: updatedIngredients })
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormData({ ...formData, referencePhoto: event.target.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const calculateRecipeCost = () => {
    return (formData.ingredients ?? []).reduce((total, item) => {
      const ingredient = ingredients.find(i => i.id === parseInt(item.ingredientId))
      if (ingredient) {
        return total + (ingredient.realUnitCost * parseFloat(item.quantity || 0))
      }
      return total
    }, 0)
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('El nombre de la receta es requerido')
      return
    }

    let updatedRecipes
    const recipeCost = calculateRecipeCost()
    
    if (editingId) {
      updatedRecipes = (recipes ?? []).map(r =>
        r.id === editingId ? { ...r, ...formData, baseCost: recipeCost } : r
      )
    } else {
      updatedRecipes = [
        ...recipes,
        {
          id: Date.now(),
          ...formData,
          baseCost: recipeCost,
          createdAt: new Date().toISOString(),
        },
      ]
    }

    setRecipes(updatedRecipes)
    saveRecipes(updatedRecipes)
    setShowModal(false)
  }

  const handleDelete = (id) => {
    // 1. Validación robusta del ID
    if (!id) {
      console.error('❌ ID no encontrado')
      // Limpiar documentos con ID nulo del estado
      setRecipes(prev => prev.filter(r => r.id))
      return
    }

    if (!window.confirm('¿Eliminar esta receta?')) return

    try {
      // 2. Actualización optimista: eliminar del estado local primero
      const updatedRecipes = recipes.filter(r => r.id !== id)
      setRecipes(updatedRecipes)

      // 3. Guardar en Firebase/localStorage
      saveRecipes(updatedRecipes)
      
      console.log('✅ Receta eliminada correctamente')
    } catch (error) {
      // 4. Manejo de errores
      console.error('❌ Error al eliminar receta:', error)
      alert('Error al eliminar la receta. Por favor, intenta nuevamente.')
      // Revertir el estado en caso de error
      setRecipes(recipes)
    }
  }

  const getIngredientName = (id) => {
    return ingredients.find(i => i.id === parseInt(id))?.name || 'Desconocido'
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Recetas (Escandallos)</h2>
          <p className="text-gray-400 text-sm mt-1">Crea bases como masas con ingredientes y preparación</p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          icon={Plus}
          label="Nueva Receta"
        />
      </div>

      {recipes.length === 0 ? (
        <div className="bg-dark-card rounded-lg p-8 border border-gray-700 text-center">
          <p className="text-gray-400 mb-4">No hay recetas registradas</p>
          <Button onClick={() => handleOpenModal()} label="Crear primera receta" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(recipes ?? []).map(recipe => (
            <div key={recipe.id} className="bg-dark-card rounded-lg p-5 border border-gray-700 overflow-hidden">
              {recipe.referencePhoto && (
                <img
                  src={recipe.referencePhoto}
                  alt={recipe.name}
                  className="w-full h-40 object-cover rounded mb-4"
                />
              )}
              
              <h3 className="font-semibold text-lg text-white mb-1 break-words min-h-[3.5rem]">{recipe.name}</h3>
              {recipe.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{recipe.description}</p>
              )}
              
              <div className="bg-dark-bg/50 rounded p-3 mb-4 text-sm">
                <p className="text-gray-300 mb-2"><strong>Costo Base:</strong> {formatMoneyDisplay(recipe.baseCost)}</p>
                <p className="text-gray-400"><strong>Ingredientes:</strong> {recipe.ingredients.length}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(recipe)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-blue/20 hover:bg-primary-blue/30 text-primary-blue px-3 py-2 rounded-lg transition-colors text-sm"
                >
                  <Edit2 size={16} />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(recipe.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 px-3 py-2 rounded-lg transition-colors text-sm"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={editingId ? 'Editar Receta' : 'Nueva Receta'}
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-2">
            {/* Nombre y Descripción */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  📋 Nombre de la Receta *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-bg border border-gray-600 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none text-sm"
                  placeholder="Ej: Masa de Pan"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  📝 Descripción
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-dark-bg border border-gray-600 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none text-sm"
                  placeholder="Descripción breve"
                />
              </div>
            </div>

            {/* Foto de Referencia */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                📷 Foto de Referencia
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="flex-1 bg-dark-bg border border-gray-600 rounded-lg px-2 py-1 text-white text-xs"
                />
                {formData.referencePhoto && (
                  <img src={formData.referencePhoto} alt="Preview" className="w-12 h-12 object-cover rounded" />
                )}
              </div>
            </div>

            {/* Tabla de Ingredientes DENSA */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                🥖 Ingredientes
              </label>
              <div className="bg-dark-bg/50 rounded-lg border border-gray-700">
                {/* Cabecera */}
                <div className="grid grid-cols-12 gap-2 px-2 py-1 border-b border-gray-700 bg-gray-800 text-xs font-bold text-gray-300">
                  <div className="col-span-6">INGREDIENTE</div>
                  <div className="col-span-3 text-center">CANTIDAD</div>
                  <div className="col-span-2 text-center">UNIDAD</div>
                  <div className="col-span-1"></div>
                </div>
                
                {/* Filas DENSAS */}
                <div className="max-h-32 overflow-y-auto">
                  {(formData.ingredients ?? []).map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 px-2 py-1 border-b border-gray-700/50 hover:bg-gray-800/50 text-sm">
                      <div className="col-span-6">
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
                      <div className="col-span-2">
                        <select
                          value={item.unit}
                          onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                          className="w-full bg-dark-bg border border-gray-600 rounded px-2 py-1 text-white text-xs"
                        >
                          <option value="gr">gr</option>
                          <option value="ml">ml</option>
                          <option value="unid">unid</option>
                        </select>
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
                  {(formData.ingredients ?? []).length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-xs">
                      Sin ingredientes
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

            {/* Preparación */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                📖 Preparación / Instrucciones
              </label>
              <textarea
                value={formData.preparation}
                onChange={(e) => setFormData({ ...formData, preparation: e.target.value })}
                className="w-full bg-dark-bg border border-gray-600 rounded-lg px-2 py-1.5 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none resize-none text-sm"
                rows="3"
                placeholder="Describe los pasos..."
              />
            </div>

            {/* Resumen COMPACTO */}
            <div className="bg-dark-bg/50 rounded-lg p-2 border border-gray-700">
              <p className="text-xs text-gray-300">
                <strong>Costo Base Estimado:</strong> <span className="text-success-green font-semibold">{formatMoneyDisplay(calculateRecipeCost())}</span>
              </p>
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
