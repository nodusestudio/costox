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
    if (window.confirm('¿Eliminar esta receta?')) {
      const updatedRecipes = recipes.filter(r => r.id !== id)
      setRecipes(updatedRecipes)
      saveRecipes(updatedRecipes)
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre de la Receta *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none"
                placeholder="Ej: Masa de Pan"
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
                placeholder="Descripción breve"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Foto de Referencia
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white text-sm"
              />
              {formData.referencePhoto && (
                <img src={formData.referencePhoto} alt="Preview" className="w-20 h-20 object-cover rounded mt-2" />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ingredientes
              </label>
              <div className="space-y-3 bg-dark-bg/50 p-3 rounded-lg max-h-48 overflow-y-auto">
                {(formData.ingredients ?? []).map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <select
                      value={item.ingredientId}
                      onChange={(e) => handleIngredientChange(idx, 'ingredientId', e.target.value)}
                      className="flex-1 bg-dark-bg border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    >
                      <option value="">Seleccionar</option>
                      {(ingredients ?? []).map(ing => (
                        <option key={ing.id} value={ing.id}>{ing.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                      className="w-16 bg-dark-bg border border-gray-600 rounded px-2 py-1 text-white text-sm"
                      placeholder="Cant."
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                      className="w-16 bg-dark-bg border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    >
                      <option value="gr">gr</option>
                      <option value="ml">ml</option>
                      <option value="unid">unid</option>
                    </select>
                    <button
                      onClick={() => handleRemoveIngredient(idx)}
                      className="bg-red-900/20 hover:bg-red-900/30 text-red-400 px-2 py-1 rounded text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddIngredient}
                className="w-full mt-2 text-sm text-primary-blue hover:text-blue-400 border border-dashed border-primary-blue rounded-lg py-2"
              >
                + Agregar Ingrediente
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Preparación / Instrucciones
              </label>
              <textarea
                value={formData.preparation}
                onChange={(e) => setFormData({ ...formData, preparation: e.target.value })}
                className="w-full bg-dark-bg border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-primary-blue focus:outline-none resize-none"
                rows="4"
                placeholder="Describe los pasos..."
              />
            </div>

            <div className="bg-dark-bg/50 rounded-lg p-3 border border-gray-700">
              <p className="text-sm text-gray-300">
                <strong>Costo Base Estimado:</strong> <span className="text-success-green">{formatMoneyDisplay(calculateRecipeCost())}</span>
              </p>
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
