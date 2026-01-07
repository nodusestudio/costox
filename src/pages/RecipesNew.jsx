import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Package, BookOpen } from 'lucide-react'
import { getRecipes, saveRecipe, deleteRecipe, getIngredients } from '@/utils/storage'
import { formatMoneyDisplay, calcularCostoProporcional } from '@/utils/formatters'
import { showToast } from '@/utils/toast'
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
    pesoTotal: 0, // Peso total de la receta en gramos
    ingredients: [], // { type: 'ingredient' | 'recipe', id, quantity }
  })
  const searchSelectRefs = useRef({})

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
        pesoTotal: recipe.pesoTotal || 0,
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        pesoTotal: 0,
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

    if (!formData.pesoTotal || formData.pesoTotal <= 0) {
      alert('El Peso Total debe ser mayor a 0 para calcular el costo por gramo de la receta')
      return
    }

    try {
      await saveRecipe(formData, editingId)
      showToast('✅ Guardado satisfactoriamente', 'success')
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Error saving recipe:', error)
      showToast('Error al guardar', 'error')
    }
  }

  const handleEnterAddRow = (type) => {
    const currentItems = Array.isArray(formData.ingredients) ? formData.ingredients : []
    const newIndex = currentItems.length
    setFormData({
      ...formData,
      ingredients: [...currentItems, { type, id: '', quantity: 1 }]
    })
    setTimeout(() => {
      const ref = searchSelectRefs.current[`${type}-${newIndex}`]
      if (ref?.focus) {
        ref.focus()
      }
    }, 100)
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

  const calculateItemCost = (item) => {
    if (!item || !item.id) return 0
    
    if (item.type === 'ingredient') {
      const ing = ingredients.find(i => i.id === item.id)
      if (ing) {
        const quantity = parseFloat(item.quantity || 0)
        
        if (ing.costoPorGramo && ing.costoPorGramo > 0) {
          return ing.costoPorGramo * quantity
        } else if (ing.pesoEmpaqueTotal && ing.pesoEmpaqueTotal > 0 && ing.costWithWastage) {
          return calcularCostoProporcional(ing.costWithWastage, ing.pesoEmpaqueTotal, quantity)
        } else if (ing.costWithWastage) {
          return ing.costWithWastage * quantity
        }
      }
    } else {
      const rec = recipes.find(r => r.id === item.id)
      if (rec && rec.totalCost) {
        return rec.totalCost * parseFloat(item.quantity || 1)
      }
    }
    return 0
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
        if (ing) {
          const quantity = parseFloat(item.quantity || 0)
          
          // DEBUG: Mostrar TODOS los datos del ingrediente
          console.log('═══════════════════════════════════════')
          console.log(`📦 INGREDIENTE: ${ing.name}`)
          console.log(`   Cantidad usada: ${quantity}`)
          console.log(`   costoPorGramo: ${ing.costoPorGramo}`)
          console.log(`   pesoEmpaqueTotal: ${ing.pesoEmpaqueTotal}`)
          console.log(`   costWithWastage: ${ing.costWithWastage}`)
          console.log(`   purchaseCost: ${ing.purchaseCost}`)
          console.log('═══════════════════════════════════════')
          
          // Usar costoPorGramo si está disponible (recomendado)
          if (ing.costoPorGramo && ing.costoPorGramo > 0) {
            const cost = ing.costoPorGramo * quantity
            console.log(`✅ USANDO costoPorGramo: ${quantity}g × $${ing.costoPorGramo.toFixed(4)}/g = $${cost.toFixed(2)}`)
            total += cost
          } 
          // Fallback 1: Calcular usando pesoEmpaqueTotal
          else if (ing.pesoEmpaqueTotal && ing.pesoEmpaqueTotal > 0 && ing.costWithWastage) {
            const costoPorGramo = ing.costWithWastage / ing.pesoEmpaqueTotal
            const cost = costoPorGramo * quantity
            console.log(`⚠️ FALLBACK1 (Calculando): ${quantity}g × $${costoPorGramo.toFixed(4)}/g = $${cost.toFixed(2)}`)
            total += cost
          } 
          // Fallback 2: Ingredientes muy antiguos
          else if (ing.costWithWastage) {
            const cost = ing.costWithWastage * quantity
            console.log(`❌ ERROR FALLBACK2 (Sin divisor): ${quantity} × $${ing.costWithWastage} = $${cost.toFixed(2)}`)
            console.log(`   ⚠️ ESTE INGREDIENTE NECESITA EDICIÓN: Falta pesoEmpaqueTotal`)
            total += cost
          }
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
          <Plus size={20} />
          Nueva Receta
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
              <div className="flex justify-between items-center mb-2">
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Costo Total
                </span>
                <span className={`font-bold text-lg ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatMoneyDisplay(recipe.totalCost || 0)}
                </span>
              </div>
              {recipe.pesoTotal && recipe.pesoTotal > 0 && (
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Costo por Gramo
                  </span>
                  <span className={`font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {formatMoneyDisplay((recipe.totalCost || 0) / recipe.pesoTotal)}/g
                  </span>
                </div>
              )}
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
          titleInput={
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-transparent border-none text-2xl font-bold text-white focus:outline-none w-full"
              placeholder="🍳 Escribe el nombre de tu receta aquí..."
            />
          }
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-4">

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
                    Ingrediente
                  </button>
                  <button
                    onClick={() => handleAddItem('recipe')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-md font-medium"
                  >
                    <BookOpen size={18} />
                    Receta
                  </button>
                </div>
              </div>

              <div className={`rounded-lg border ${
                isDarkMode ? 'bg-[#0a0e1a] border-gray-700' : 'bg-gray-50 border-gray-300'
              }`}>
                {/* Cabecera de Tabla */}
                <div className={`grid grid-cols-12 gap-2 p-3 border-b font-bold text-xs ${
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-200 border-gray-300 text-gray-700'
                }`}>
                  <div className="col-span-6">NOMBRE</div>
                  <div className="col-span-3 text-center">CANTIDAD</div>
                  <div className="col-span-3 text-right">COSTO</div>
                </div>

                {/* Lista de Ingredientes/Recetas */}
                <div className="max-h-[300px] overflow-y-auto">
                  {(formData.ingredients ?? []).map((item, index) => {
                    const costoProporcional = calculateItemCost(item)

                    return (
                      <div key={index} className={`flex gap-2 p-3 border-b text-sm ${
                        isDarkMode ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-100'
                      }`}>
                        <div style={{ width: '75%' }} className={`flex items-center ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          <SearchSelect
                            ref={(el) => searchSelectRefs.current[`${item.type}-${index}`] = el}
                            options={item.type === 'ingredient' ? ingredients : (recipes ?? []).filter(r => r.id !== editingId)}
                            value={item.id}
                            onChange={(value) => handleItemChange(index, 'id', value)}
                            displayKey="name"
                            placeholder={`Seleccionar ${item.type === 'ingredient' ? 'ingrediente' : 'receta'}...`}
                            className="w-full"
                          />
                        </div>
                        <div style={{ width: '12.5%' }} className="flex items-center">
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleEnterAddRow(item.type)
                              }
                            }}
                            className={`w-full px-2 py-1 rounded border text-center text-xs ${
                              isDarkMode
                                ? 'bg-[#111827] border-gray-600 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                            placeholder="0"
                          />
                        </div>
                        <div style={{ width: '12.5%' }} className={`flex items-center justify-end gap-1 ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          <span className="font-semibold text-xs truncate">{formatMoneyDisplay(costoProporcional)}</span>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded flex-shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {(formData.ingredients || []).length === 0 && (
                    <div className={`text-center py-8 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      <p className="text-xs">Sin componentes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dashboard Excel - Recetas */}
            {(formData.ingredients || []).length > 0 && (
              <div className={`p-2 rounded-xl border-2 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-green-950 to-gray-900 border-green-700' 
                  : 'bg-gradient-to-br from-green-50 to-white border-green-300'
              }`}>
                {/* Valor Principal: Costo Total CENTRADO */}
                <div className="text-center mb-2">
                  <div className={`text-xs font-bold mb-1 ${
                    isDarkMode ? 'text-green-300' : 'text-green-700'
                  }`}>
                    💰 COSTO TOTAL
                  </div>
                  <div className={`font-black ${
                    isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`} style={{ fontSize: '2rem' }}>
                    {formatMoneyDisplay(calculatePreviewCost())}
                  </div>
                </div>

                {/* 3 Cajas de Métricas Horizontales */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Costo/Gramo */}
                  <div className={`p-2 rounded-lg text-center ${
                    isDarkMode ? 'bg-blue-950/50 border border-blue-700' : 'bg-blue-50 border border-blue-300'
                  }`}>
                    <div className={`text-xs font-bold mb-1 ${
                      isDarkMode ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      COSTO/GRAMO
                    </div>
                    <div className={`text-lg font-black ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {formData.pesoTotal > 0 
                        ? formatMoneyDisplay(calculatePreviewCost() / formData.pesoTotal) + '/g'
                        : '$ 0/g'
                      }
                    </div>
                  </div>

                  {/* Peso Total */}
                  <div className={`p-2 rounded-lg text-center ${
                    isDarkMode ? 'bg-purple-950/50 border border-purple-700' : 'bg-purple-50 border border-purple-300'
                  }`}>
                    <div className={`text-xs font-bold mb-1 ${
                      isDarkMode ? 'text-purple-300' : 'text-purple-700'
                    }`}>
                      ⚖️ PESO TOTAL (g)
                    </div>
                    <input
                      type="number"
                      value={formData.pesoTotal}
                      onChange={(e) => setFormData({ ...formData, pesoTotal: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                      className={`w-full text-center px-2 py-1 rounded-lg border font-black text-lg ${
                        isDarkMode
                          ? 'bg-[#0a1828] border-purple-500 text-purple-400'
                          : 'bg-white border-purple-500 text-purple-600'
                      }`}
                      placeholder="1000"
                      min="0"
                      step="1"
                    />
                  </div>

                  {/* Cantidad de Ítems */}
                  <div className={`p-2 rounded-lg text-center ${
                    isDarkMode ? 'bg-orange-950/50 border border-orange-700' : 'bg-orange-50 border border-orange-300'
                  }`}>
                    <div className={`text-xs font-bold mb-1 ${
                      isDarkMode ? 'text-orange-300' : 'text-orange-700'
                    }`}>
                      📦 CANTIDAD ÍTEMS
                    </div>
                    <div className={`text-lg font-black ${
                      isDarkMode ? 'text-orange-400' : 'text-orange-600'
                    }`}>
                      {(formData.ingredients || []).length}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Descripción al final */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Descripción (opcional)
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
                placeholder="Agrega una descripción opcional..."
              />
            </div>

            <div className="flex justify-end gap-6 mt-10 pt-8 border-t-2 border-gray-600 pb-12 bg-gray-800/50 -mx-8 px-8 -mb-8 rounded-b-2xl">
              <button
                onClick={() => setShowModal(false)}
                className="flex items-center gap-3 px-12 py-5 bg-gray-600 hover:bg-gray-500 text-white rounded-xl transition-all font-bold shadow-2xl text-xl hover:scale-105"
              >
                <span className="text-2xl">❌</span> Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-3 px-12 py-5 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-all font-bold shadow-2xl text-xl hover:scale-105"
              >
                <span className="text-2xl">💾</span> Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
