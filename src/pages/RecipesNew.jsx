import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Package, BookOpen } from 'lucide-react'
import { getRecipes, saveRecipe, deleteRecipe, getIngredients } from '@/utils/storage'
import { formatMoneyDisplay, calcularCostoProporcional } from '@/utils/formatters'
import { showToast } from '@/utils/toast'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import SearchSelect from '@/components/SearchSelect'
import { useI18n } from '@/context/I18nContext'
import { useCategories } from '@/context/CategoriesContext'

export default function RecipesNew() {
  const { isDarkMode } = useI18n()
  const { categories, saveCategory, deleteCategory } = useCategories()
  const [recipes, setRecipes] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryName, setCategoryName] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    pesoTotal: 0, // Peso total de la receta en gramos
    wastagePercent: 30, // % Merma por defecto
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
      // Reparación automática: si alguna receta quedó guardada con totales absurdos
      // (por datos viejos o cálculos previos incorrectos), la recalculamos al cargar.
      // Esto también dispara la sincronización con Productos desde storage.js.
      const normalizedRecipes = Array.isArray(recipesData) ? recipesData : []
      const brokenRecipes = normalizedRecipes.filter(r => {
        const total = parseFloat(r?.totalCost || 0)
        return !Number.isFinite(total) || total > 100000
      })

      if (brokenRecipes.length > 0) {
        for (const r of brokenRecipes) {
          await saveRecipe(
            {
              ...r,
              ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
              pesoTotal: parseFloat(r.pesoTotal || 0),
              wastagePercent: parseFloat(r.wastagePercent ?? 30)
            },
            r.id
          )
        }
        // Releer una sola vez para reflejar los valores corregidos
        const fixedRecipes = await getRecipes()
        setRecipes(Array.isArray(fixedRecipes) ? fixedRecipes : [])
      } else {
        setRecipes(normalizedRecipes)
      }
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
        categoryId: recipe.categoryId || '',
        pesoTotal: recipe.pesoTotal || 0,
        wastagePercent: recipe.wastagePercent ?? 30,
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        categoryId: '',
        pesoTotal: 0,
        wastagePercent: 30,
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

  const handleDuplicate = async (recipe) => {
    try {
      const duplicated = {
        ...recipe,
        name: `${recipe.name} (Copia)`,
      }
      delete duplicated.id
      delete duplicated.totalCost
      delete duplicated.costoPorGramo
      await saveRecipe(duplicated)
      showToast('✅ Receta duplicada exitosamente', 'success')
      await loadData()
    } catch (error) {
      console.error('Error duplicating recipe:', error)
      showToast('Error al duplicar', 'error')
    }
  }

  const handleDragStart = (e, recipe) => {
    e.dataTransfer.setData('recipeId', recipe.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, categoryId) => {
    e.preventDefault()
    const recipeId = e.dataTransfer.getData('recipeId')
    const recipe = recipes.find(r => r.id === recipeId)
    
    if (recipe && recipe.categoryId !== categoryId) {
      try {
        await saveRecipe({ ...recipe, categoryId: categoryId || '' }, recipeId)
        showToast('✅ Receta movida a categoría', 'success')
        await loadData()
      } catch (error) {
        console.error('Error moving recipe:', error)
        showToast('Error al mover', 'error')
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
        if (!Number.isFinite(quantity) || quantity <= 0) return 0
        
        if (ing.costoPorGramo && ing.costoPorGramo > 0) {
          return ing.costoPorGramo * quantity
        } else if (ing.pesoEmpaqueTotal && ing.pesoEmpaqueTotal > 0 && ing.costWithWastage) {
          return calcularCostoProporcional(ing.costWithWastage, ing.pesoEmpaqueTotal, quantity)
        } else if (ing.costWithWastage) {
          // Fallback seguro para datos antiguos: asumimos empaque 1000g/ml si falta divisor
          return calcularCostoProporcional(ing.costWithWastage, 1000, quantity)
        }
      }
    } else {
      const rec = recipes.find(r => r.id === item.id)
      if (rec) {
        const quantity = parseFloat(item.quantity || 0)
        if (!Number.isFinite(quantity) || quantity <= 0) return 0
        
        // CORREGIDO: Usar costo proporcional por gramo (igual que ingredientes)
        if (rec.costoPorGramo && rec.costoPorGramo > 0) {
          return rec.costoPorGramo * quantity
        } else if (rec.totalCost && rec.pesoTotal && rec.pesoTotal > 0) {
          // Calcular costo por gramo si no está precalculado
          const costoPorGramo = rec.totalCost / rec.pesoTotal
          return costoPorGramo * quantity
        } else if (rec.totalCost && (!rec.pesoTotal || rec.pesoTotal === 0)) {
          // Sin peso no es seguro convertir a costo/gramo (evita costos millonarios).
          console.warn(`⚠️ Receta ${rec.name} tiene pesoTotal inválido; se omite del costo.`)
          return 0
        }
      }
    }
    return 0
  }

  const calculatePreviewCost = () => {
    const items = Array.isArray(formData.ingredients) ? formData.ingredients : []

    // Suma simple: el total es estrictamente la suma de cada fila visible
    // (sin acumular sobre ejecuciones anteriores).
    let totalCosto = 0
    for (const item of items) {
      totalCosto += calculateItemCost(item)
    }
    return totalCosto
  }

  // Filtrar recetas por categoría
  const filteredRecipes = selectedCategoryFilter
    ? recipes.filter(r => r.categoryId === selectedCategoryFilter)
    : recipes

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

      {/* Pestañas de Categoría */}
      <div className={`flex gap-2 items-center border-b-2 pb-3 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <button
          onClick={() => setSelectedCategoryFilter(null)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, null)}
          className={`px-6 py-2 font-semibold transition-all border-b-4 ${
            selectedCategoryFilter === null
              ? 'border-primary-blue text-primary-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Todas
        </button>
        {categories.map(cat => (
          <div key={cat.id} className="relative group">
            <button
              onClick={() => setSelectedCategoryFilter(cat.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, cat.id)}
              className={`px-6 py-2 font-semibold transition-all border-b-4 ${
                selectedCategoryFilter === cat.id
                  ? 'border-primary-blue text-primary-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat.name}
            </button>
            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingCategory(cat)
                  setCategoryName(cat.name)
                  setShowCategoryModal(true)
                }}
                className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg"
                title="Editar categoría"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
                    deleteCategory(cat.id)
                    setSelectedCategoryFilter(null)
                  }
                }}
                className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                title="Eliminar categoría"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => {
            setEditingCategory(null)
            setCategoryName('')
            setShowCategoryModal(true)
          }}
          className="ml-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          + Categoría
        </button>
      </div>

      {/* Grid de Recetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(filteredRecipes || []).map(recipe => (
          <div 
            key={recipe.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, recipe)}
            className={`p-4 rounded-xl border cursor-move ${
              isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {recipe.name}
                </h3>
                {recipe.categoryId && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                    {categories.find(c => c.id === recipe.categoryId)?.name || 'Sin categoría'}
                  </span>
                )}
                {recipe.description && (
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {recipe.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleDuplicate(recipe)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'hover:bg-[#111827] text-green-400'
                      : 'hover:bg-gray-100 text-green-600'
                  }`}
                  title="Duplicar receta"
                >
                  <Plus size={16} />
                </button>
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
              {recipe.costoPorGramo && recipe.costoPorGramo > 0 && (
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Costo por Gramo {recipe.wastagePercent ? `(${recipe.wastagePercent}% merma)` : ''}
                  </span>
                  <span className={`font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {formatMoneyDisplay(recipe.costoPorGramo)}/g
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${
          isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
            {recipes.length === 0 
              ? 'No hay recetas registradas'
              : 'No hay recetas en esta categoría'
            }
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

                {/* 4 Cajas de Métricas Horizontales */}
                <div className="grid grid-cols-4 gap-2">
                  {/* Costo/Gramo (CON MERMA) */}
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
                      {(() => {
                        if (formData.pesoTotal <= 0) return '$ 0/g'
                        const pesoNeto = formData.pesoTotal * (1 - (formData.wastagePercent || 0) / 100)
                        return pesoNeto > 0 ? formatMoneyDisplay(calculatePreviewCost() / pesoNeto) + '/g' : '$ 0/g'
                      })()}
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

                  {/* % Merma */}
                  <div className={`p-2 rounded-lg text-center ${
                    isDarkMode ? 'bg-yellow-950/50 border border-yellow-700' : 'bg-yellow-50 border border-yellow-300'
                  }`}>
                    <div className={`text-xs font-bold mb-1 ${
                      isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                    }`}>
                      🔥 % MERMA
                    </div>
                    <input
                      type="number"
                      value={formData.wastagePercent}
                      onChange={(e) => setFormData({ ...formData, wastagePercent: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                      className={`w-full text-center px-2 py-1 rounded-lg border font-black text-lg ${
                        isDarkMode
                          ? 'bg-[#0a1828] border-yellow-500 text-yellow-400'
                          : 'bg-white border-yellow-500 text-yellow-600'
                      }`}
                      placeholder="30"
                      min="0"
                      max="100"
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
            {/* Categoría */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                🏷️ Categoría (Opcional)
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Sin categoría</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
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

      {/* Modal de Categoría */}
      {showCategoryModal && (
        <Modal
          title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
          onClose={() => setShowCategoryModal(false)}
        >
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Nombre de la Categoría
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && categoryName.trim()) {
                    saveCategory({ name: categoryName.trim() }, editingCategory?.id)
                    setShowCategoryModal(false)
                  }
                }}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Ej: Bebidas, Postres, Principales..."
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (categoryName.trim()) {
                    saveCategory({ name: categoryName.trim() }, editingCategory?.id)
                    setShowCategoryModal(false)
                  }
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
              >
                {editingCategory ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
