import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, TrendingUp, DollarSign, Upload, Download } from 'lucide-react'
import { getProducts, saveProduct, deleteProduct, getIngredients, getRecipes, getConfig } from '@/utils/storage'
import { formatMoneyDisplay, calcularCostoProporcional } from '@/utils/formatters'
import { showToast } from '@/utils/toast'
import Modal from '@/components/Modal'
import SearchSelect from '@/components/SearchSelect'
import Button from '@/components/Button'
import { useI18n } from '@/context/I18nContext'
import { useCategories } from '@/context/CategoriesContext'
import * as XLSX from 'xlsx'

export default function ProductsNew() {
  const { isDarkMode } = useI18n()
  const { categoriesProducts: categories, saveCategory, deleteCategory } = useCategories()
  const [products, setProducts] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [recipes, setRecipes] = useState([])
  const [config, setConfig] = useState(null)
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
    items: [], // { type: 'ingredient' | 'recipe', id, quantity }
    laborCost: 0, // Mano de Obra (Operario) - DEPRECATED, ahora se calcula automáticamente
    preparationTimeMinutes: 0, // Tiempo de preparación en minutos (NUEVO)
    indirectCostsPercent: 0, // Costos Indirectos % (luz, gas, etc.)
    desiredProfitPercent: 20, // Utilidad Deseada % (NUEVO)
    realSalePrice: 0, // Precio de Venta
  })
  const searchSelectRefs = useRef({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [productsData, ingredientsData, recipesData, configData] = await Promise.all([
        getProducts(),
        getIngredients(),
        getRecipes(),
        getConfig()
      ])
      // Ordenar productos por campo order
      const sortedProducts = Array.isArray(productsData) 
        ? productsData.sort((a, b) => (a.order || 0) - (b.order || 0))
        : []
      setProducts(sortedProducts)
      setIngredients(Array.isArray(ingredientsData) ? ingredientsData : [])
      setRecipes(Array.isArray(recipesData) ? recipesData : [])
      setConfig(configData)
    } catch (error) {
      console.error('Error loading data:', error)
      setProducts([])
      setIngredients([])
      setRecipes([])
    }
    setLoading(false)
  }



  const handleOpenModal = (product = null) => {
    // Calcular % sugerido de costos indirectos desde la configuración (EXCLUYE NÓMINA)
    let suggestedIndirectCostsPercent = 0
    if (config && config.estimatedMonthlySales > 0) {
      // Solo gastos indirectos: arriendo + servicios + otros (SIN nómina)
      const indirectFixedCosts = (config.rentCost || 0) + (config.utilitiesCost || 0) + (config.otherFixedCosts || 0)
      suggestedIndirectCostsPercent = (indirectFixedCosts / config.estimatedMonthlySales) * 100
    }

    if (product) {
      setEditingId(product.id)
      setFormData({
        name: product.name || '',
        description: product.description || '',
        categoryId: product.categoryId || '',
        items: Array.isArray(product.items) ? product.items : [],
        laborCost: product.laborCost || 0,
        preparationTimeMinutes: product.preparationTimeMinutes || 0,
        indirectCostsPercent: product.indirectCostsPercent || 0,
        desiredProfitPercent: product.desiredProfitPercent || 20,
        realSalePrice: product.realSalePrice || 0,
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        description: '',
        categoryId: '',
        items: [],
        laborCost: 0,
        preparationTimeMinutes: 0,
        indirectCostsPercent: suggestedIndirectCostsPercent, // Pre-cargar con valor sugerido
        desiredProfitPercent: 20, // Utilidad deseada por defecto
        realSalePrice: 0,
      })
    }
    setShowModal(true)
  }

  const handleAddItem = (type) => {
    const currentItems = Array.isArray(formData.items) ? formData.items : []
    setFormData({
      ...formData,
      items: [...currentItems, { type, id: '', quantity: 1 }]
    })
  }

  const handleRemoveItem = (index) => {
    const currentItems = Array.isArray(formData.items) ? formData.items : []
    setFormData({
      ...formData,
      items: currentItems.filter((_, i) => i !== index)
    })
  }

  const handleItemChange = (index, field, value) => {
    const currentItems = Array.isArray(formData.items) ? formData.items : []
    const updated = [...currentItems]
    if (updated[index]) {
      updated[index][field] = value
    }
    setFormData({ ...formData, items: updated })
  }

  // Recalcular métricas de un producto guardado (sincronización con Excel)
  const recalculateProductMetrics = (product) => {
    try {
      const items = Array.isArray(product.items) ? product.items : []
      let costoIngredientes = 0

      items.forEach(item => {
        if (!item || !item.id) return
        
        if (item.type === 'ingredient-embalaje' || item.type === 'ingredient-receta' || item.type === 'ingredient') {
          const ing = ingredients.find(i => i.id === item.id)
          if (ing) {
            const cantidadUsada = parseFloat(item.quantity || 0)
            
            if (ing.costoPorGramo && ing.costoPorGramo > 0) {
              costoIngredientes += ing.costoPorGramo * cantidadUsada
            } 
            else if (ing.pesoEmpaqueTotal && ing.pesoEmpaqueTotal > 0 && ing.costWithWastage) {
              costoIngredientes += calcularCostoProporcional(
                ing.costWithWastage, 
                ing.pesoEmpaqueTotal, 
                cantidadUsada
              )
            } 
            else if (ing.costWithWastage) {
              costoIngredientes += ing.costWithWastage * cantidadUsada
            }
          }
        } else if (item.type === 'recipe') {
          const rec = recipes.find(r => r.id === item.id)
          if (rec) {
            const cantidadUsada = parseFloat(item.quantity || 0)
            if (rec.costoPorGramo && rec.costoPorGramo > 0) {
              costoIngredientes += rec.costoPorGramo * cantidadUsada
            } else if (rec.totalCost && rec.pesoTotal && rec.pesoTotal > 0) {
              const costoPorGramo = rec.totalCost / rec.pesoTotal
              costoIngredientes += costoPorGramo * cantidadUsada
            } else if (rec.totalCost && (!rec.pesoTotal || rec.pesoTotal === 0)) {
              // Fallback: si no hay peso, asumimos 1g para evitar división por cero
              costoIngredientes += rec.totalCost * cantidadUsada
            }
          }
        }
      })

      // INTELIGENCIA FINANCIERA: Calcular mano de obra desde tiempo de preparación
      let manoDeObra = 0
      const preparationTime = parseFloat(product.preparationTimeMinutes || 0)
      
      if (config && preparationTime > 0) {
        const payroll = parseFloat(config.payrollCost || 0)
        const monthlyHours = parseFloat(config.monthlyWorkHours || 176)
        const costPerMinute = payroll / (monthlyHours * 60)
        manoDeObra = costPerMinute * preparationTime
      } else if (product.laborCost) {
        // Fallback: usar laborCost manual si existe (compatibilidad hacia atrás)
        manoDeObra = parseFloat(product.laborCost || 0)
      }

      // INTELIGENCIA FINANCIERA: Aplicar costos indirectos SOLO sobre ingredientes
      const indirectCostsPercent = parseFloat(product.indirectCostsPercent || 0)
      const costosIndirectos = costoIngredientes * (indirectCostsPercent / 100)
      const costoTotal = costoIngredientes + manoDeObra + costosIndirectos

      const precioVenta = parseFloat(product.realSalePrice) || 0

      // Fórmula Excel: P-CONTRIBUCIÓN = (1 - Costo/Venta) * 100
      const pContribucion = precioVenta > 0 ? (1 - (costoTotal / precioVenta)) * 100 : 0
      const mContribucion = precioVenta - costoTotal

      return {
        ingredientsCost: costoIngredientes,
        laborCost: manoDeObra,
        indirectCosts: costosIndirectos,
        totalCost: costoTotal,
        realSalePrice: precioVenta,
        pContribucion: pContribucion,
        mContribucion: mContribucion
      }
    } catch (error) {
      console.error('Error calculando métricas:', error)
      return {
        ingredientsCost: 0,
        laborCost: 0,
        indirectCosts: 0,
        totalCost: 0,
        realSalePrice: 0,
        pContribucion: 0,
        mContribucion: 0
      }
    }
  }

  const calculateMetrics = () => {
    // Asegurar que items sea SIEMPRE un array
    const items = Array.isArray(formData.items) ? formData.items : []
    
    // ==========================================
    // MODELO EXCEL PROFESIONAL
    // ==========================================
    
    // COSTO INGREDIENTES: Σ (Cantidad_Usada * Costo_por_Gramo)
    let costoIngredientes = 0
    
    items.forEach(item => {
      if (!item || !item.id) return
      
      if (item.type === 'ingredient-embalaje' || item.type === 'ingredient-receta') {
        const ing = ingredients.find(i => i.id === item.id)
        if (ing) {
          const cantidadUsada = parseFloat(item.quantity || 0)
          
          // Cálculo correcto: dividir precio empaque entre peso empaque
          if (ing.costoPorGramo && ing.costoPorGramo > 0) {
            costoIngredientes += ing.costoPorGramo * cantidadUsada
          } 
          else if (ing.pesoEmpaqueTotal && ing.pesoEmpaqueTotal > 0 && ing.costWithWastage) {
            costoIngredientes += calcularCostoProporcional(
              ing.costWithWastage, 
              ing.pesoEmpaqueTotal, 
              cantidadUsada
            )
          } 
          else if (ing.costWithWastage) {
            costoIngredientes += ing.costWithWastage * cantidadUsada
          }
        }
      } else if (item.type === 'recipe') {
        const rec = recipes.find(r => r.id === item.id)
        if (rec) {
          const cantidadUsada = parseFloat(item.quantity || 0)
          
          // CORREGIDO: Usar costo proporcional por gramo (igual que ingredientes)
          if (rec.costoPorGramo && rec.costoPorGramo > 0) {
            costoIngredientes += rec.costoPorGramo * cantidadUsada
          } else if (rec.totalCost && rec.pesoTotal && rec.pesoTotal > 0) {
            // Calcular costo por gramo si no está precalculado
            const costoPorGramo = rec.totalCost / rec.pesoTotal
            costoIngredientes += costoPorGramo * cantidadUsada
          } else if (rec.totalCost && (!rec.pesoTotal || rec.pesoTotal === 0)) {
            // Validación: Si pesoTotal es 0 o nulo, usar valor por defecto 1g
            console.warn(`⚠️ Receta ${rec.name} tiene pesoTotal=0, usando valor por defecto 1g`)
            costoIngredientes += rec.totalCost * cantidadUsada
          }
        }
      }
    })

    // COSTO TOTAL (CT): Ingredientes + Mano de Obra + Costos Indirectos
    
    // Calcular costo de mano de obra basado en tiempo de preparación
    let manoDeObra = 0
    const preparationTime = parseFloat(formData.preparationTimeMinutes || 0)
    
    if (config && preparationTime > 0) {
      const payroll = parseFloat(config.payrollCost || 0)
      const monthlyHours = parseFloat(config.monthlyWorkHours || 176)
      const costPerMinute = payroll / (monthlyHours * 60)
      manoDeObra = costPerMinute * preparationTime
      
      console.log(`⏱️ Costo Mano de Obra: ${preparationTime}min × $${costPerMinute.toFixed(4)}/min = $${manoDeObra.toFixed(2)}`)
    } else if (formData.laborCost) {
      // Fallback: usar laborCost manual si existe (compatibilidad hacia atrás)
      manoDeObra = parseFloat(formData.laborCost || 0)
    }
    
    // FÓRMULA CORREGIDA: Costos Indirectos solo sobre (Insumos + Embalaje), NO sobre mano de obra
    // CT = (Insumos + Embalaje) + (Tiempo * CostoMinuto) + ((Insumos + Embalaje) * %Indirectos / 100)
    const indirectCostsPercent = parseFloat(formData.indirectCostsPercent || 0)
    const costosIndirectos = costoIngredientes * (indirectCostsPercent / 100)
    const costoTotal = costoIngredientes + manoDeObra + costosIndirectos
    
    // PRECIO SUGERIDO basado en Utilidad Deseada
    // Fórmula: Precio = (Costo Insumos + Costo Labor) / (1 - (Utilidad Deseada % + % Costos Indirectos))
    const desiredProfitPercent = parseFloat(formData.desiredProfitPercent || 20)
    const totalMarginPercent = desiredProfitPercent + indirectCostsPercent
    const costoBaseParaPrecio = costoIngredientes + manoDeObra
    const suggestedPriceRaw = totalMarginPercent < 100 
      ? costoBaseParaPrecio / (1 - (totalMarginPercent / 100))
      : costoBaseParaPrecio * 2 // Fallback si el margen es >= 100%
    const suggestedPrice = roundToNearestThousand(suggestedPriceRaw)
    
    // PRECIO DE VENTA (el usuario lo define)
    const precioVenta = parseFloat(formData.realSalePrice) || 0

    // P-CONTRIBUCIÓN (% Utilidad): (1 - Costo/Venta) * 100
    const pContribucion = precioVenta > 0 ? (1 - (costoTotal / precioVenta)) * 100 : 0
    
    // M-CONTRIBUCIÓN (Utilidad $): Precio Venta - Costo Total
    const mContribucion = precioVenta - costoTotal

    return {
      ingredientsCost: costoIngredientes,
      laborCost: manoDeObra,
      indirectCosts: costosIndirectos,
      totalCost: costoTotal,
      suggestedPrice: suggestedPrice,
      realSalePrice: precioVenta,
      pContribucion: pContribucion, // Food Cost %
      mContribucion: mContribucion, // Utilidad $
      // Mantener compatibilidad con storage.js
      foodCostPercent: pContribucion,
      actualProfit: mContribucion
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('El nombre es requerido')
      return
    }

    try {
      await saveProduct(formData, editingId)
      showToast('✅ Guardado satisfactoriamente', 'success')
      setShowModal(false)
      await loadData()
    } catch (error) {
      console.error('Error saving product:', error)
      showToast('Error al guardar', 'error')
    }
  }

  const handleEnterAddRow = (type) => {
    const currentItems = Array.isArray(formData.items) ? formData.items : []
    const newIndex = currentItems.length
    setFormData({
      ...formData,
      items: [...currentItems, { type, id: '', quantity: 1 }]
    })
    // Focus en el nuevo SearchSelect después del render
    setTimeout(() => {
      const ref = searchSelectRefs.current[`${type}-${newIndex}`]
      if (ref?.focus) {
        ref.focus()
      }
    }, 100)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este producto?')) {
      try {
        await deleteProduct(id)
        await loadData()
      } catch (error) {
        console.error('Error deleting product:', error)
        alert('Error al eliminar')
      }
    }
  }

  const handleDuplicate = async (product) => {
    try {
      const duplicated = {
        ...product,
        name: `${product.name} (Copia)`,
      }
      delete duplicated.id
      await saveProduct(duplicated)
      showToast('✅ Producto duplicado exitosamente', 'success')
      await loadData()
    } catch (error) {
      console.error('Error duplicating product:', error)
      showToast('Error al duplicar', 'error')
    }
  }

  const handleDragStart = (e, product) => {
    setDraggedItem(product)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetProduct) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem.id === targetProduct.id) {
      setDraggedItem(null)
      return
    }

    // Reordenar solo dentro de la misma categoría
    if (draggedItem.categoryId !== targetProduct.categoryId) {
      setDraggedItem(null)
      return
    }

    try {
      const filtered = selectedCategoryFilter
        ? products.filter(p => p.categoryId === selectedCategoryFilter)
        : products
      
      const draggedIndex = filtered.findIndex(p => p.id === draggedItem.id)
      const targetIndex = filtered.findIndex(p => p.id === targetProduct.id)
      
      const reordered = [...filtered]
      const [removed] = reordered.splice(draggedIndex, 1)
      reordered.splice(targetIndex, 0, removed)
      
      // Asignar nuevos índices
      const updates = reordered.map((product, index) => 
        saveProduct({ ...product, order: index }, product.id)
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
    
    const product = products.find(p => p.id === draggedItem.id)
    
    if (product && product.categoryId !== categoryId) {
      try {
        await saveProduct({ ...product, categoryId: categoryId || '' }, draggedItem.id)
        showToast('✅ Producto movido a categoría', 'success')
        await loadData()
      } catch (error) {
        console.error('Error moving product:', error)
        showToast('Error al mover', 'error')
      }
    }
    setDraggedItem(null)
  }

  const handleExportExcel = () => {
    try {
      const exportData = products.map((product, index) => {
        try {
          const metrics = recalculateProductMetrics(product)
          const categoryName = categories.find(c => c.id === product.categoryId)?.name || 'Sin categoría'
          
          return {
            'Nombre': product.name || 'Sin nombre',
            'Categoría': categoryName,
            'Costo Ingredientes': Number(metrics.ingredientsCost || 0).toFixed(2),
            'Mano de Obra': Number(metrics.laborCost || 0).toFixed(2),
            'Costo Total': Number(metrics.totalCost || 0).toFixed(2),
            'Precio Venta': Number(metrics.realSalePrice || 0).toFixed(2),
            '% Margen': Number(metrics.pContribucion || 0).toFixed(2),
            'Utilidad $': Number(metrics.mContribucion || 0).toFixed(2)
          }
        } catch (itemError) {
          console.error(`Error exportando producto en índice ${index}:`, product.name, itemError)
          return {
            'Nombre': product.name || 'Sin nombre',
            'Categoría': '',
            'Costo Ingredientes': '0.00',
            'Mano de Obra': '0.00',
            'Costo Total': '0.00',
            'Precio Venta': '0.00',
            '% Margen': '0.00',
            'Utilidad $': '0.00'
          }
        }
      })

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos')
      
      const fileName = `Productos_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
      
      showToast('✅ Productos exportados exitosamente', 'success')
    } catch (error) {
      console.error('Error crítico al exportar productos:', error)
      showToast('❌ Error al exportar productos', 'error')
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
              // Crear nueva categoría
              const newCategory = { name: categoryName }
              const result = await saveCategory(newCategory, null, 'products')
              if (result) {
                categoryId = result.id || ''
              }
            }
          }

          const newProduct = {
            name: row['Nombre'] || 'Producto sin nombre',
            description: row['Descripción'] || '',
            categoryId: categoryId,
            items: [],
            laborCost: parseFloat(row['Mano de Obra']) || 0,
            realSalePrice: parseFloat(row['Precio Venta']) || 0,
            order: products.length + imported
          }

          await saveProduct(newProduct)
          imported++
        }

        showToast(`✅ ${imported} productos importados`, 'success')
        await loadData()
      } catch (error) {
        console.error('Error importing products:', error)
        showToast('❌ Formato de archivo no válido', 'error')
      }
    }

    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const metrics = calculateMetrics()

  // Filtrar productos por categoría
  const filteredProducts = selectedCategoryFilter
    ? products.filter(p => p.categoryId === selectedCategoryFilter)
    : products

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
            Productos
          </h2>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Cálculo automático de costos, márgenes y precios
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
            className="flex items-center gap-2 px-5 py-3 bg-primary-blue hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg font-medium"
          >
            <Plus size={20} />
            Nuevo Producto
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
                    deleteCategory(cat.id, 'products')
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

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(filteredProducts ?? []).map(product => {
          const recalculated = recalculateProductMetrics(product)
          return (
          <div 
            key={product.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, product)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, product)}
            className={`p-4 rounded-xl border cursor-move ${
              isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {product.name}
                </h3>
                {product.categoryId && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                    {categories.find(c => c.id === product.categoryId)?.name || 'Sin categoría'}
                  </span>
                )}
                {product.description && (
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {product.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleDuplicate(product)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'hover:bg-[#111827] text-green-400'
                      : 'hover:bg-gray-100 text-green-600'
                  }`}
                  title="Duplicar producto"
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() => handleOpenModal(product)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'hover:bg-[#111827] text-blue-400'
                      : 'hover:bg-gray-100 text-blue-600'
                  }`}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
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

            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Ingredientes
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  {formatMoneyDisplay(recalculated.ingredientsCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Mano de Obra
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                  {formatMoneyDisplay(product.laborCost || 0)}
                </span>
              </div>
              <div className={`flex justify-between text-sm pt-2 border-t ${
                isDarkMode ? 'border-gray-700' : 'border-gray-300'
              }`}>
                <span className={`font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  COSTO UNIDAD (CT)
                </span>
                <span className={`font-bold text-xl ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  {formatMoneyDisplay(recalculated.totalCost)}
                </span>
              </div>
            </div>

            <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} space-y-2`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  💵 Precio de Venta
                </span>
                <span className={`font-bold text-2xl ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {formatMoneyDisplay(product.realSalePrice || 0)}
                </span>
              </div>
              
              {/* P-CONTRIBUCIÓN (% Utilidad) */}
              <div className={`mt-2 p-3 rounded-lg border-2 ${
                recalculated.pContribucion < 30
                  ? isDarkMode ? 'bg-red-900/40 border-red-600' : 'bg-red-100 border-red-400'
                  : isDarkMode ? 'bg-green-900/40 border-green-700' : 'bg-green-100 border-green-400'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    P-CONTRIBUCIÓN
                  </span>
                  <span className={`text-2xl font-black ${
                    recalculated.pContribucion < 30
                      ? isDarkMode ? 'text-red-400' : 'text-red-600'
                      : isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    {recalculated.pContribucion.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* M-CONTRIBUCIÓN (Utilidad $) */}
              <div className={`p-3 rounded-lg ${
                recalculated.mContribucion >= 0
                  ? isDarkMode ? 'bg-green-900/40' : 'bg-green-100'
                  : isDarkMode ? 'bg-red-900/40' : 'bg-red-100'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    M-CONTRIBUCIÓN
                  </span>
                  <span className={`text-xl font-black ${
                    recalculated.mContribucion >= 0
                      ? isDarkMode ? 'text-green-400' : 'text-green-600'
                      : isDarkMode ? 'text-red-400' : 'text-red-600'
                  }`}>
                    {formatMoneyDisplay(recalculated.mContribucion)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className={`text-center py-12 rounded-xl border ${
          isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
            {products.length === 0 
              ? 'No hay productos registrados'
              : 'No hay productos en esta categoría'
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
              className="w-full bg-transparent border-none text-2xl font-bold text-white placeholder-gray-500 focus:outline-none"
              placeholder="📝 Escribe el nombre de tu producto aquí..."
            />
          }
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-6 pb-6">
            {/* HEADER COMPACTO: Precio de Venta */}
            <div className={`p-2 rounded-xl border-2 ${
              isDarkMode 
                ? 'bg-gradient-to-br from-green-950 to-gray-900 border-green-700' 
                : 'bg-gradient-to-br from-green-50 to-white border-green-300'
            }`}>
              {/* Precio de Venta Centrado */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <label className={`text-xs font-bold ${
                  isDarkMode ? 'text-green-300' : 'text-green-700'
                }`}>
                  💵 PRECIO DE VENTA:
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.realSalePrice}
                  onChange={(e) => setFormData({ ...formData, realSalePrice: parseFloat(e.target.value) || 0 })}
                  onFocus={(e) => e.target.select()}
                  className={`w-40 px-3 py-1 rounded-lg border-2 font-black text-center ${
                    isDarkMode
                      ? 'bg-[#0a2818] border-green-500 text-green-300'
                      : 'bg-white border-green-500 text-green-700'
                  }`}
                  style={{ fontSize: '2rem' }}
                  placeholder="$ 0"
                />
              </div>

              {/* Tres Cajas de Métricas - MÁS COMPACTAS */}
              <div className="grid grid-cols-3 gap-2">
                {/* Costo Unidad */}
                <div className={`p-2 rounded-lg text-center ${
                  isDarkMode ? 'bg-blue-950/50 border border-blue-700' : 'bg-blue-50 border border-blue-300'
                }`}>
                  <div className={`text-xs font-bold mb-1 ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    COSTO
                  </div>
                  <div className={`text-lg font-black ${
                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                  }`}>
                    {formatMoneyDisplay(metrics.totalCost)}
                  </div>
                </div>

                {/* P-Contribución (Food Cost %) - SIN ALERTAS ROJAS */}
                <div className={`p-2 rounded-lg text-center ${
                  isDarkMode ? 'bg-gray-800/50 border border-gray-600' : 'bg-gray-100 border border-gray-300'
                }`}>
                  <div className={`text-xs font-bold mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    P-CONTRIB.
                  </div>
                  <div className={`text-lg font-black ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {metrics.pContribucion.toFixed(1)}%
                  </div>
                </div>

                {/* M-Contribución (Utilidad $) */}
                <div className={`p-2 rounded-lg text-center ${
                  isDarkMode ? 'bg-purple-950/50 border border-purple-700' : 'bg-purple-50 border border-purple-300'
                }`}>
                  <div className={`text-xs font-bold mb-1 ${
                    isDarkMode ? 'text-purple-300' : 'text-purple-700'
                  }`}>
                    M-CONTRIB.
                  </div>
                  <div className={`text-lg font-black ${
                    isDarkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}>
                    {formatMoneyDisplay(metrics.mContribucion)}
                  </div>
                </div>
              </div>
            </div>

            {/* PRECIO SUGERIDO POR UTILIDAD */}
            <div className={`p-4 rounded-xl border-2 ${
              isDarkMode 
                ? 'bg-gradient-to-br from-blue-950 to-gray-900 border-blue-700' 
                : 'bg-gradient-to-br from-blue-50 to-white border-blue-300'
            }`}>
              <div className="space-y-3">
                {/* Input de Utilidad Deseada */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className={`block text-sm font-bold ${
                      isDarkMode ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      🎯 UTILIDAD DESEADA
                    </label>
                    <p className={`text-xs mt-1 ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      Meta de ganancia sobre el costo
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={formData.desiredProfitPercent}
                      onChange={(e) => setFormData({ ...formData, desiredProfitPercent: parseFloat(e.target.value) || 20 })}
                      onFocus={(e) => e.target.select()}
                      className={`w-20 px-3 py-2 rounded-lg border-2 font-bold text-lg text-center ${
                        isDarkMode
                          ? 'bg-[#1f2937] border-blue-600 text-blue-300'
                          : 'bg-white border-blue-500 text-blue-700'
                      }`}
                      placeholder="20"
                    />
                    <span className={`text-xl font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>%</span>
                  </div>
                </div>

                {/* Comparativa de Precios */}
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/40 border border-blue-700' : 'bg-blue-100 border border-blue-400'}`}>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Precio Sugerido */}
                    <div>
                      <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        💡 PRECIO SUGERIDO
                      </div>
                      <div className={`text-2xl font-black ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        {formatMoneyDisplay(metrics.suggestedPrice || 0)}
                      </div>
                      <div className={`text-xs mt-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        Para {formData.desiredProfitPercent}% utilidad
                      </div>
                    </div>

                    {/* Precio Actual */}
                    <div className={`${
                      formData.realSalePrice > 0 && formData.realSalePrice < metrics.suggestedPrice
                        ? isDarkMode ? 'bg-red-900/40 border-2 border-red-700' : 'bg-red-100 border-2 border-red-400'
                        : formData.realSalePrice >= metrics.suggestedPrice && formData.realSalePrice > 0
                        ? isDarkMode ? 'bg-green-900/40 border-2 border-green-700' : 'bg-green-100 border-2 border-green-400'
                        : ''
                    } p-2 rounded-lg`}>
                      <div className={`text-xs font-medium mb-1 ${
                        formData.realSalePrice > 0 && formData.realSalePrice < metrics.suggestedPrice
                          ? 'text-red-500'
                          : formData.realSalePrice >= metrics.suggestedPrice && formData.realSalePrice > 0
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {formData.realSalePrice > 0 && formData.realSalePrice < metrics.suggestedPrice ? '⚠️ PRECIO ACTUAL' : formData.realSalePrice >= metrics.suggestedPrice ? '✅ PRECIO ACTUAL' : 'PRECIO ACTUAL'}
                      </div>
                      <div className={`text-2xl font-black ${
                        formData.realSalePrice > 0 && formData.realSalePrice < metrics.suggestedPrice
                          ? 'text-red-500 animate-pulse'
                          : formData.realSalePrice >= metrics.suggestedPrice && formData.realSalePrice > 0
                          ? isDarkMode ? 'text-green-300' : 'text-green-700'
                          : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {formatMoneyDisplay(formData.realSalePrice || 0)}
                      </div>
                      {formData.realSalePrice > 0 && formData.realSalePrice < metrics.suggestedPrice && (
                        <div className="text-xs mt-1 text-red-500 font-semibold">
                          Muy bajo (-{formatMoneyDisplay(metrics.suggestedPrice - formData.realSalePrice)})
                        </div>
                      )}
                      {formData.realSalePrice >= metrics.suggestedPrice && formData.realSalePrice > 0 && (
                        <div className={`text-xs mt-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'} font-semibold`}>
                          Bien (+{formatMoneyDisplay(formData.realSalePrice - metrics.suggestedPrice)})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botón para aplicar precio sugerido */}
                  {formData.realSalePrice !== metrics.suggestedPrice && (
                    <div className="mt-3 text-center">
                      <button
                        onClick={() => setFormData({ ...formData, realSalePrice: parseFloat(metrics.suggestedPrice.toFixed(2)) })}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                          isDarkMode
                            ? 'bg-blue-700 hover:bg-blue-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        📋 Aplicar Precio Sugerido
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* DOBLE BLOQUE DE INSUMOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Bloque 1: EMBALAJE */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-bold ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    📦 EMBALAJE
                  </h4>
                  <button
                    onClick={() => {
                      const updatedItems = [...(formData.items || [])]
                      updatedItems.push({ type: 'ingredient-embalaje', id: '', quantity: 0 })
                      setFormData({ ...formData, items: updatedItems })
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium"
                  >
                    + Ingrediente
                  </button>
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

                  {/* Lista de Ingredientes */}
                  <div className="max-h-[300px] overflow-y-auto">
                    {(formData.items ?? [])
                      .filter(item => item.type === 'ingredient-embalaje')
                      .map((item, index) => {
                        const ing = ingredients.find(i => i.id === item.id)
                        const cantidadUsada = parseFloat(item.quantity || 0)
                        let costoProporcional = 0

                        if (ing) {
                          if (ing.costoPorGramo && ing.costoPorGramo > 0) {
                            costoProporcional = ing.costoPorGramo * cantidadUsada
                          } else if (ing.pesoEmpaqueTotal && ing.pesoEmpaqueTotal > 0 && ing.costWithWastage) {
                            costoProporcional = calcularCostoProporcional(
                              ing.costWithWastage,
                              ing.pesoEmpaqueTotal,
                              cantidadUsada
                            )
                          } else if (ing.costWithWastage) {
                            costoProporcional = ing.costWithWastage * cantidadUsada
                          }
                        }

                        return (
                          <div key={index} className={`flex gap-2 p-3 border-b text-sm ${
                            isDarkMode ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-100'
                          }`}>
                            {/* Icono de Tipo */}
                            <div className="flex items-center flex-shrink-0 mr-2">
                              <span className="w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold text-white bg-orange-500 shadow-sm">
                                I
                              </span>
                            </div>
                            <div style={{ width: '75%' }} className={`flex items-center ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <SearchSelect
                                ref={(el) => searchSelectRefs.current[`ingredient-embalaje-${index}`] = el}
                                options={ingredients}
                                value={item.id}
                                onChange={(value) => handleItemChange(
                                  (formData.items ?? []).indexOf(item),
                                  'id',
                                  value
                                )}
                                displayKey="name"
                                placeholder="Seleccionar..."
                                className="w-full"
                              />
                            </div>
                            <div style={{ width: '12.5%' }} className="flex items-center">
                              <input
                                type="number"
                                step="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(
                                  (formData.items ?? []).indexOf(item),
                                  'quantity',
                                  parseFloat(e.target.value)
                                )}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleEnterAddRow('ingredient-embalaje')
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
                                onClick={() => handleRemoveItem((formData.items ?? []).indexOf(item))}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded flex-shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )
                      })}

                    {(formData.items ?? []).filter(item => item.type === 'ingredient-embalaje').length === 0 && (
                      <div className={`text-center py-8 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        <p className="text-xs">Sin ingredientes</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloque 2: RECETAS / INGREDIENTES */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-bold ${
                    isDarkMode ? 'text-purple-300' : 'text-purple-700'
                  }`}>
                    🍖 RECETAS / INGREDIENTES
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const updatedItems = [...(formData.items || [])]
                        updatedItems.push({ type: 'ingredient-receta', id: '', quantity: 0 })
                        setFormData({ ...formData, items: updatedItems })
                      }}
                      className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium"
                    >
                      + Ing
                    </button>
                    <button
                      onClick={() => handleAddItem('recipe')}
                      className="px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-xs font-medium"
                    >
                      + Receta
                    </button>
                  </div>
                </div>

                <div className={`rounded-lg border ${
                  isDarkMode ? 'bg-[#0a0e1a] border-gray-700' : 'bg-gray-50 border-gray-300'
                }`}>
                  {/* Cabecera de Tabla */}
                  <div className={`flex gap-2 p-3 border-b font-bold text-xs ${
                    isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-200 border-gray-300 text-gray-700'
                  }`}>
                    <div style={{ width: '75%' }}>NOMBRE</div>
                    <div style={{ width: '12.5%' }} className="text-center">CANT</div>
                    <div style={{ width: '12.5%' }} className="text-right">COSTO</div>
                  </div>

                  {/* Lista de Ingredientes y Recetas */}
                  <div className="max-h-[300px] overflow-y-auto">
                    {(formData.items ?? [])
                      .filter(item => item.type === 'recipe' || item.type === 'ingredient-receta')
                      .map((item, index) => {
                        let itemData, costoProporcional = 0
                        const cantidadUsada = parseFloat(item.quantity || 1)

                        if (item.type === 'ingredient-receta') {
                          itemData = ingredients.find(i => i.id === item.id)
                          if (itemData) {
                            if (itemData.costoPorGramo && itemData.costoPorGramo > 0) {
                              costoProporcional = itemData.costoPorGramo * cantidadUsada
                            } else if (itemData.pesoEmpaqueTotal && itemData.pesoEmpaqueTotal > 0 && itemData.costWithWastage) {
                              costoProporcional = calcularCostoProporcional(
                                itemData.costWithWastage,
                                itemData.pesoEmpaqueTotal,
                                cantidadUsada
                              )
                            } else if (itemData.costWithWastage) {
                              costoProporcional = itemData.costWithWastage * cantidadUsada
                            }
                          }
                        } else {
                          itemData = recipes.find(r => r.id === item.id)
                          if (itemData) {
                            // CORREGIDO: Usar costo proporcional por gramo
                            if (itemData.costoPorGramo && itemData.costoPorGramo > 0) {
                              costoProporcional = itemData.costoPorGramo * cantidadUsada
                            } else if (itemData.totalCost && itemData.pesoTotal && itemData.pesoTotal > 0) {
                              // Calcular costo por gramo si no está precalculado
                              const costoPorGramo = itemData.totalCost / itemData.pesoTotal
                              costoProporcional = costoPorGramo * cantidadUsada
                            } else if (itemData.totalCost && (!itemData.pesoTotal || itemData.pesoTotal === 0)) {
                              // Validación: Si pesoTotal es 0 o nulo, usar valor por defecto 1g
                              console.warn(`⚠️ Receta ${itemData.name} tiene pesoTotal=0, usando valor por defecto 1g`)
                              costoProporcional = itemData.totalCost * cantidadUsada
                            }
                          }
                        }

                        return (
                          <div key={index} className={`flex gap-2 p-3 border-b text-sm ${
                            isDarkMode ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-100'
                          }`}>
                            {/* Icono de Tipo */}
                            <div className="flex items-center flex-shrink-0 mr-2">
                              <span className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold text-white shadow-sm ${
                                item.type === 'recipe'
                                  ? 'bg-purple-600'
                                  : 'bg-cyan-500'
                              }`}>
                                {item.type === 'recipe' ? 'R' : 'I'}
                              </span>
                            </div>
                            <div style={{ width: '75%' }} className={`flex items-center ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              <SearchSelect
                                ref={(el) => searchSelectRefs.current[`${item.type}-${index}`] = el}
                                options={item.type === 'ingredient-receta' ? ingredients : recipes}
                                value={item.id}
                                onChange={(value) => handleItemChange(
                                  (formData.items ?? []).indexOf(item),
                                  'id',
                                  value
                                )}
                                displayKey="name"
                                placeholder="Seleccionar..."
                                className="w-full"
                              />
                            </div>
                            <div style={{ width: '12.5%' }} className="flex items-center">
                              <input
                                type="number"
                                step="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(
                                  (formData.items ?? []).indexOf(item),
                                  'quantity',
                                  parseFloat(e.target.value)
                                )}
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
                                onClick={() => handleRemoveItem((formData.items ?? []).indexOf(item))}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded flex-shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        )
                      })}

                    {(formData.items ?? []).filter(item => item.type === 'recipe' || item.type === 'ingredient-receta').length === 0 && (
                      <div className={`text-center py-8 ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        <p className="text-xs">Sin recetas ni ingredientes</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* TIEMPO DE PREPARACIÓN */}
            <div className={`p-4 rounded-lg border ${
              isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-300'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className={`block text-sm font-bold ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      ⏱️ TIEMPO DE PREPARACIÓN
                    </label>
                    <p className={`text-xs mt-1 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Calcula automáticamente la MANO DE OBRA
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.preparationTimeMinutes}
                      onChange={(e) => setFormData({ ...formData, preparationTimeMinutes: parseFloat(e.target.value) || 0 })}
                      onFocus={(e) => e.target.select()}
                      className={`w-24 px-4 py-3 rounded-lg border-2 font-bold text-xl text-center ${
                        isDarkMode
                          ? 'bg-[#1f2937] border-slate-600 text-slate-300'
                          : 'bg-white border-slate-500 text-slate-700'
                      }`}
                      placeholder="0"
                    />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      min
                    </span>
                  </div>
                </div>
                
                {config && (
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800/40 border border-slate-700' : 'bg-slate-100 border border-slate-400'}`}>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} font-medium`}>Nómina Mensual</div>
                        <div className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {formatMoneyDisplay(config.payrollCost || 0)}
                        </div>
                      </div>
                      <div>
                        <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'} font-medium`}>Costo/Minuto</div>
                        <div className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {formatMoneyDisplay((() => {
                            const payroll = parseFloat(config.payrollCost || 0)
                            const hours = parseFloat(config.monthlyWorkHours || 176)
                            return payroll / (hours * 60)
                          })())}
                        </div>
                      </div>
                      <div className={`${isDarkMode ? 'bg-green-900/40' : 'bg-green-200'} p-2 rounded`}>
                        <div className={`${isDarkMode ? 'text-green-400' : 'text-green-700'} font-medium`}>💰 OPERARIO</div>
                        <div className={`font-black text-base ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
                          {formData.preparationTimeMinutes > 0 ? formatMoneyDisplay((() => {
                            const payroll = parseFloat(config.payrollCost || 0)
                            const hours = parseFloat(config.monthlyWorkHours || 176)
                            const costPerMinute = payroll / (hours * 60)
                            return costPerMinute * formData.preparationTimeMinutes
                          })()) : '$0.00'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {!config && (
                  <p className={`text-xs text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    ⚠️ Configura la nómina en Ajustes para calcular automáticamente
                  </p>
                )}
              </div>
            </div>

            {/* COSTOS INDIRECTOS */}
            <div className={`p-4 rounded-lg border ${
              isDarkMode ? 'bg-purple-950/50 border-purple-700' : 'bg-purple-50 border-purple-300'
            }`}>
              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className={`block text-sm font-bold ${
                    isDarkMode ? 'text-purple-300' : 'text-purple-700'
                  }`}>
                    ⚡ COSTOS INDIRECTOS %
                  </label>
                  <p className={`text-xs mt-1 ${
                    isDarkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}>
                    Luz, gas, alquiler, etc.
                  </p>
                  {config && config.estimatedMonthlySales > 0 && (
                    <div className={`mt-2 p-2 rounded text-xs ${isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                      💡 Sugerido: {(() => {
                        const totalFixedCosts = (config.rentCost || 0) + (config.utilitiesCost || 0) + (config.payrollCost || 0) + (config.otherFixedCosts || 0)
                        const suggestedPercent = (totalFixedCosts / config.estimatedMonthlySales) * 100
                        return suggestedPercent.toFixed(2)
                      })()}% 
                      <button
                        onClick={() => {
                          const totalFixedCosts = (config.rentCost || 0) + (config.utilitiesCost || 0) + (config.payrollCost || 0) + (config.otherFixedCosts || 0)
                          const suggestedPercent = (totalFixedCosts / config.estimatedMonthlySales) * 100
                          setFormData({ ...formData, indirectCostsPercent: parseFloat(suggestedPercent.toFixed(2)) })
                        }}
                        className={`ml-2 px-2 py-0.5 rounded ${isDarkMode ? 'bg-purple-700 hover:bg-purple-600' : 'bg-purple-600 hover:bg-purple-500'} text-white font-medium text-xs`}
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.indirectCostsPercent}
                    onChange={(e) => setFormData({ ...formData, indirectCostsPercent: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-bold text-xl text-center ${
                      isDarkMode
                        ? 'bg-[#1f2937] border-purple-600 text-purple-300'
                        : 'bg-white border-purple-500 text-purple-700'
                    }`}
                    placeholder="0"
                  />
                  <span className={`text-2xl font-bold ${
                    isDarkMode ? 'text-purple-300' : 'text-purple-700'
                  }`}>%</span>
                </div>
              </div>
              {formData.indirectCostsPercent > 0 && (
                <p className={`text-xs mt-2 text-center ${
                  isDarkMode ? 'text-purple-400' : 'text-purple-600'
                }`}>
                  Monto aprox: {formatMoneyDisplay(metrics.indirectCosts || 0)}
                </p>
              )}
            </div>

            {/* Descripción - Movida al final */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                📝 Descripción (Opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                rows="2"
                placeholder="Detalles adicionales..."
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

            {/* Botones de Acción */}
            <div className="flex justify-end gap-3 pt-6">
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
                    saveCategory({ name: categoryName.trim() }, editingCategory?.id, 'products')
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
                    saveCategory({ name: categoryName.trim() }, editingCategory?.id, 'products')
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
