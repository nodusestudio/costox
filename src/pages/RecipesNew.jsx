import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Package, BookOpen, Upload, Download } from 'lucide-react'
import { getRecipes, saveRecipe, deleteRecipe, getIngredients } from '@/utils/storage'
import { formatMoneyDisplay, calcularCostoProporcional } from '@/utils/formatters'
import { showToast } from '@/utils/toast'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import SearchSelect from '@/components/SearchSelect'
import { useI18n } from '@/context/I18nContext'
import { useCategories } from '@/context/CategoriesContext'
import * as XLSX from 'xlsx'

export default function RecipesNew() {
  const { isDarkMode } = useI18n()
  const { categoriesRecipes: categories, saveCategory, deleteCategory } = useCategories()
  const [recipes, setRecipes] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryName, setCategoryName] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    pesoTotal: 0, // Peso total de la receta en gramos
    wastagePercent: 30, // % Merma por defecto
    ingredients: [], // { type: 'ingredient' | 'recipe', id, quantity }
  })
  const searchSelectRefs = useRef({})

    // Calcular métricas para la receta actual en el modal
    const metrics = (() => {
      // Costo total de los componentes actuales
      const totalCost = calculatePreviewCost();
      // Porciones (rendimiento)
      const servings = parseFloat(formData.servings) || 1;
      // Peso total
      const totalWeight = parseFloat(formData.totalWeight || formData.pesoTotal) || 0;
      // Costo por porción
      const costPerServing = servings > 0 ? totalCost / servings : 0;
      // Costo por gramo
      const costPerGram = totalWeight > 0 ? totalCost / totalWeight : 0;
      return { totalCost, costPerServing, costPerGram };
    })();

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
        const sortedRecipes = Array.isArray(fixedRecipes) 
          ? fixedRecipes.sort((a, b) => (a.order || 0) - (b.order || 0))
          : []
        setRecipes(sortedRecipes)
      } else {
        const sortedRecipes = normalizedRecipes.sort((a, b) => (a.order || 0) - (b.order || 0))
        setRecipes(sortedRecipes)
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
      // 🔥 PRESERVAR ORDER al editar, asignar 0 si es nuevo
      const dataToSave = { ...formData }
      
      if (editingId) {
        // Edición: mantener order existente si existe
        const currentRecipe = recipes.find(r => r.id === editingId)
        if (currentRecipe && 'order' in currentRecipe) {
          dataToSave.order = currentRecipe.order
        }
      } else {
        // Nuevo: colocar al inicio
        dataToSave.order = 0
      }

      await saveRecipe(dataToSave, editingId)
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
    if (!id) return;
    if (!window.confirm('¿Eliminar?')) return;
    try {
      await deleteDoc(doc(db, 'recipes', id));
      setRecipes(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  const handleDuplicate = async (recipe) => {
    try {
      setEditingId(null)
      const duplicated = {
        ...recipe,
        id: null,
        name: `COPIA - ${recipe.name}`,
      }
      await saveRecipe(duplicated)
      showToast('✅ Receta duplicada exitosamente', 'success')
      await loadData()
    } catch (error) {
      console.error('Error duplicating recipe:', error)
      showToast('Error al duplicar', 'error')
    }
  }

  const handleDragStart = (e, recipe) => {
    setDraggedItem(recipe)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetRecipe) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem.id === targetRecipe.id) {
      setDraggedItem(null)
      return
    }

    // Reordenar solo dentro de la misma categoría
    if (draggedItem.categoryId !== targetRecipe.categoryId) {
      setDraggedItem(null)
      return
    }

    try {
      const filtered = selectedCategoryFilter
        ? recipes.filter(r => r.categoryId === selectedCategoryFilter)
        : recipes
      
      const draggedIndex = filtered.findIndex(r => r.id === draggedItem.id)
      const targetIndex = filtered.findIndex(r => r.id === targetRecipe.id)
      
      const reordered = [...filtered]
      const [removed] = reordered.splice(draggedIndex, 1)
      reordered.splice(targetIndex, 0, removed)
      
      // Asignar nuevos índices
      const updates = reordered.map((recipe, index) => 
        saveRecipe({ ...recipe, order: index }, recipe.id)
      )
      
      await Promise.all(updates)
      await loadData()
      showToast('✅ Orden actualizado', 'success')
    } catch (error) {
      console.error('Error reordering:', error)
      showToast('Error al reordenar', 'error')
    } finally {
      setDraggedItem(null)
    }
  }

  const handleDropCategory = async (e, categoryId) => {
    e.preventDefault()
    
    if (!draggedItem) return
    
    const recipe = recipes.find(r => r.id === draggedItem.id)
    
    if (recipe && recipe.categoryId !== categoryId) {
      try {
        await saveRecipe({ ...recipe, categoryId: categoryId || '' }, draggedItem.id)
        showToast('✅ Receta movida a categoría', 'success')
        await loadData()
      } catch (error) {
        console.error('Error moving recipe:', error)
        showToast('Error al mover', 'error')
      }
    }
    setDraggedItem(null)
  }

  const handleExportExcel = () => {
    try {
      const exportData = recipes.map((recipe, index) => {
        try {
          const categoryName = categories.find(c => c.id === recipe.categoryId)?.name || 'Sin categoría'
          const pesoTotal = parseFloat(recipe.pesoTotal) || 0
          const wastagePercent = parseFloat(recipe.wastagePercent) || 30
          const totalCost = parseFloat(recipe.totalCost) || 0
          const costoPorGramo = parseFloat(recipe.costoPorGramo) || 0
          
          return {
            'Nombre': recipe.name || 'Sin nombre',
            'Descripción': recipe.description || '',
            'Categoría': categoryName,
            'Peso Total (g)': pesoTotal.toFixed(0),
            '% Merma': wastagePercent.toFixed(1),
            'Costo Total': totalCost.toFixed(2),
            'Costo por Gramo': costoPorGramo.toFixed(4)
          }
        } catch (itemError) {
          console.error(`Error exportando receta en índice ${index}:`, recipe.name, itemError)
          return {
            'Nombre': recipe.name || 'Sin nombre',
            'Descripción': 'Error al exportar',
            'Categoría': '',
            'Peso Total (g)': '0',
            '% Merma': '30',
            'Costo Total': '0.00',
            'Costo por Gramo': '0.0000'
          }
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Recetas')
      
      const fileName = `Recetas_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
      
      showToast('✅ Recetas exportadas exitosamente', 'success')
    } catch (error) {
      console.error('Error crítico al exportar recetas:', error)
      showToast('❌ Error al exportar recetas', 'error')
    }
  }

  const handleImportExcel = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        if (!jsonData.length) {
          showToast('❌ Archivo vacío', 'error')
          return
        }

        // Validar formato
        const firstRow = jsonData[0]
        if (!firstRow['Nombre']) {
          showToast('❌ Formato de archivo no válido', 'error')
          return
        }

        let imported = 0
        for (const row of jsonData) {
          const categoryName = row['Categoría'] || ''
          let categoryId = ''
          
          if (categoryName && categoryName !== 'Sin categoría') {
            const existingCategory = categories.find(c => c.name === categoryName)
            if (existingCategory) {
              categoryId = existingCategory.id
            } else {
              const newCategory = { name: categoryName }
              const result = await saveCategory(newCategory, null, 'recipes')
              if (result) {
                categoryId = result.id || ''
              }
            }
          }

          const pesoTotal = parseFloat(row['Peso Total (g)']) || 0
          const wastagePercent = parseFloat(row['% Merma']) || 30
          
          // Calcular costo total incluyendo merma
          const baseCost = parseFloat(row['Costo Total']) || 0
          const totalCost = baseCost * (1 + wastagePercent / 100)
          const costoPorGramo = pesoTotal > 0 ? totalCost / pesoTotal : 0

          const newRecipe = {
            name: row['Nombre'] || 'Receta sin nombre',
            description: row['Descripción'] || '',
            categoryId: categoryId,
            pesoTotal: pesoTotal,
            wastagePercent: wastagePercent,
            totalCost: totalCost,
            costoPorGramo: costoPorGramo,
            ingredients: [],
            order: recipes.length + imported
          }

          await saveRecipe(newRecipe)
          imported++
        }

        showToast(`✅ ${imported} recetas importadas`, 'success')
        await loadData()
      } catch (error) {
        console.error('Error importing recipes:', error)
        showToast('❌ Formato de archivo no válido', 'error')
      }
    }

    reader.readAsArrayBuffer(file)
    e.target.value = ''
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
            Pueden usarse como ingredientes en Productos
          </p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors cursor-pointer font-medium">
            <Upload size={18} />
            📥 Importar Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <Download size={18} />
            📤 Exportar Excel
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-blue hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md"
          >
            <Plus size={20} />
            Nueva Receta
          </button>
        </div>
      </div>

      {/* Pestañas de Categoría */}
      <div className={`flex gap-2 items-center border-b-2 pb-3 ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <button
          onClick={() => setSelectedCategoryFilter(null)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropCategory(e, null)}
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
              onDrop={(e) => handleDropCategory(e, cat.id)}
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
                    deleteCategory(cat.id, 'recipes')
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {(filteredRecipes || []).map(recipe => (
          <div 
            key={recipe.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, recipe)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, recipe)}
            className={`p-2 rounded-lg border cursor-move relative ${
              isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            {/* Botones en esquina superior derecha */}
            <div className="absolute top-1 right-1 flex gap-0.5">
              <button
                onClick={() => handleDuplicate(recipe)}
                className={`p-1 rounded transition-colors ${
                  isDarkMode ? 'hover:bg-[#111827] text-green-400' : 'hover:bg-gray-100 text-green-600'
                }`}
                title="Duplicar"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => handleOpenModal(recipe)}
                className={`p-1 rounded transition-colors ${
                  isDarkMode ? 'hover:bg-[#111827] text-blue-400' : 'hover:bg-gray-100 text-blue-600'
                }`}
                title="Editar"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => handleDelete(recipe.id)}
                className={`p-1 rounded transition-colors ${
                  isDarkMode ? 'hover:bg-[#111827] text-red-400' : 'hover:bg-gray-100 text-red-600'
                }`}
                title="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Título y categoría en una línea */}
            <div className="pr-24 mb-2">
              <h3 className={`font-semibold text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`} title={recipe.name}>
                {recipe.name}
              </h3>
              {recipe.categoryId && (
                <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded">
                  {categories.find(c => c.id === recipe.categoryId)?.name || 'Sin cat'}
                </span>
              )}
            </div>

            {/* Información compacta */}
            <div className={`text-[11px] mb-2 pb-2 border-b ${isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
              {recipe.ingredients?.length || 0} componente(s)
            </div>

            {/* Métricas en formato compacto */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Costo Total</span>
                <span className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatMoneyDisplay(recipe.totalCost || 0)}
                </span>
              </div>
              {recipe.costoPorGramo && recipe.costoPorGramo > 0 && (
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    {recipe.wastagePercent ? `${recipe.wastagePercent}% merma` : 'Por gramo'}
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
          <div className="space-y-2 pb-2">
            {/* CABECERA EN 3 COLUMNAS */}
            <div className="grid grid-cols-3 gap-2">
              {/* Peso Total */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  ⚖️ PESO TOTAL (g)
                </label>
                <input
                  type="number"
                  step="1"
                  value={formData.totalWeight}
                  onChange={(e) => setFormData({ ...formData, totalWeight: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className={`w-full px-2 py-1.5 rounded-lg border-2 font-bold text-base text-center ${
                    isDarkMode
                      ? 'bg-[#1f2937] border-blue-600 text-blue-300'
                      : 'bg-white border-blue-500 text-blue-700'
                  }`}
                  placeholder="0"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  🏷️ CATEGORÍA
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className={`w-full px-2 py-1.5 rounded-lg border text-sm ${
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

              {/* Rendimiento (porciones) */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? 'text-green-300' : 'text-green-700'
                }`}>
                  🍽️ PORCIONES
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: parseFloat(e.target.value) || 1 })}
                  onFocus={(e) => e.target.select()}
                  className={`w-full px-2 py-1.5 rounded-lg border-2 font-bold text-base text-center ${
                    isDarkMode
                      ? 'bg-[#1f2937] border-green-600 text-green-300'
                      : 'bg-white border-green-500 text-green-700'
                  }`}
                  placeholder="1"
                />
              </div>
            </div>

            {/* MÉTRICAS COMPACTAS */}
            <div className={`p-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-900/50 border-gray-700' 
                : 'bg-gray-50 border-gray-300'
            }`}>
              <div className="grid grid-cols-3 gap-2">
                <div className={`p-1.5 rounded text-center ${
                  isDarkMode ? 'bg-blue-950/50 border border-blue-700' : 'bg-blue-50 border border-blue-300'
                }`}>
                  <div className={`text-[10px] font-bold ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    COSTO TOTAL
                  </div>
                  <div className={`text-sm font-black ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    {formatMoneyDisplay(metrics.totalCost)}
                  </div>
                </div>
                <div className={`p-1.5 rounded text-center ${
                  isDarkMode ? 'bg-green-950/50 border border-green-700' : 'bg-green-50 border border-green-300'
                }`}>
                  <div className={`text-[10px] font-bold ${
                    isDarkMode ? 'text-green-300' : 'text-green-700'
                  }`}>
                    COSTO/PORCIÓN
                  </div>
                  <div className={`text-sm font-black ${
                    isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    {formatMoneyDisplay(metrics.costPerServing)}
                  </div>
                </div>
                <div className={`p-1.5 rounded text-center ${
                  isDarkMode ? 'bg-purple-950/50 border border-purple-700' : 'bg-purple-50 border border-purple-300'
                }`}>
                  <div className={`text-[10px] font-bold ${
                    isDarkMode ? 'text-purple-300' : 'text-purple-700'
                  }`}>
                    COSTO/GRAMO
                  </div>
                  <div className={`text-sm font-black ${
                    isDarkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}>
                    {formatMoneyDisplay(metrics.costPerGram)}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-600 my-1"></div>

            {/* TABLA DE COMPONENTES */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={`block text-xs font-bold ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  📦 COMPONENTES
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddItem('ingredient')}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                  >
                    + Ing
                  </button>
                  <button
                    onClick={() => handleAddItem('recipe')}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium"
                  >
                    + Receta
                  </button>
                </div>
              </div>

              <div className={`rounded-lg border ${
                isDarkMode ? 'bg-[#0a0e1a] border-gray-700' : 'bg-gray-50 border-gray-300'
              }`}>
                {/* Cabecera de Tabla */}
                <div className={`grid grid-cols-12 gap-2 p-1.5 border-b font-bold text-xs ${
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
                      <div key={index} className={`flex gap-2 p-1 border-b text-sm h-8 items-center ${
                        isDarkMode ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-100'
                      }`}>
                        {/* Icono de Tipo */}
                        <div className="flex items-center flex-shrink-0 mr-1">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold text-white shadow-sm ${
                            item.type === 'recipe'
                              ? 'bg-purple-600'
                              : 'bg-orange-500'
                          }`}>
                            {item.type === 'recipe' ? 'R' : 'I'}
                          </span>
                        </div>
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
                            step="1"
                            min="0"
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

            {/* Campos adicionales compactos */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                }`}>
                  🔥 % MERMA
                </label>
                <input
                  type="number"
                  value={formData.wastagePercent}
                  onChange={(e) => setFormData({ ...formData, wastagePercent: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className={`w-full px-2 py-1.5 rounded-lg border-2 font-bold text-base text-center ${
                    isDarkMode
                      ? 'bg-[#1f2937] border-yellow-600 text-yellow-300'
                      : 'bg-white border-yellow-500 text-yellow-700'
                  }`}
                  placeholder="30"
                  min="0"
                  max="100"
                  step="1"
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  📦 COMPONENTES
                </label>
                <div className={`px-2 py-1.5 rounded-lg border-2 text-center font-bold text-base ${
                  isDarkMode
                    ? 'bg-[#1f2937] border-gray-600 text-gray-300'
                    : 'bg-white border-gray-300 text-gray-700'
                }`}>
                  {(formData.ingredients || []).length}
                </div>
              </div>
            </div>

            {/* Descripción compacta */}
            <div>
              <label className={`block text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                📝 Descripción (Opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-2 py-1.5 rounded-lg border text-sm ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                rows={2}
                placeholder="Detalles adicionales..."
              />
            </div>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium"
              >
                Guardar
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
                    saveCategory({ name: categoryName.trim() }, editingCategory?.id, 'recipes')
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
                    saveCategory({ name: categoryName.trim() }, editingCategory?.id, 'recipes')
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
