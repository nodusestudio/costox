import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Tag, Copy, GripVertical } from 'lucide-react'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getProducts, getRecipes, getIngredients, getAllDocs, saveDoc, deleteDocument, getConfig } from '@/utils/storage'
import { formatMoneyDisplay, roundToNearestThousand } from '@/utils/formatters'
import Modal from '@/components/Modal'
import Button from '@/components/Button'
import SearchSelect from '@/components/SearchSelect'
import { useI18n } from '@/context/I18nContext'

export default function Promotions() {
  const { t, isDarkMode } = useI18n()
  const [categories, setCategories] = useState([])
  const [promotions, setPromotions] = useState([])
  const [products, setProducts] = useState([])
  const [recipes, setRecipes] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryName, setCategoryName] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverCategory, setDragOverCategory] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    items: [],
    promoPrice: 0,
    categoryId: '',
  })
  
  // Estado para totales calculados (PVP Regular, Descuento, Ahorro)
  const [calculatedTotals, setCalculatedTotals] = useState({
    totalCost: 0,
    totalRegularPrice: 0,
    ahorro: 0,
    descuentoPct: 0
  })

  // 🔥 Observador de cambios para actualizar totales automáticamente
  useEffect(() => {
    if (formData.items.length > 0 || formData.promoPrice > 0) {
      const totals = calculateTotals(formData.items)
      const promoPrice = Number(formData.promoPrice) || 0
      const ahorro = totals.totalRegularPrice - promoPrice
      const descuentoPct = totals.totalRegularPrice > 0 && ahorro > 0
        ? (ahorro / totals.totalRegularPrice) * 100
        : 0
      
      setCalculatedTotals({
        totalCost: totals.totalCost,
        totalRegularPrice: totals.totalRegularPrice,
        ahorro: ahorro > 0 ? ahorro : 0,
        descuentoPct: descuentoPct
      })
      
      console.log('📊 Totales actualizados:', {
        pvpRegular: totals.totalRegularPrice,
        descuento: ahorro,
        ahorroPct: descuentoPct.toFixed(1) + '%'
      })
    }
  }, [formData.items, formData.promoPrice])

  useEffect(() => {
    console.log('🔥 Iniciando sincronización en tiempo real...')
    loadStaticData()
    
    // Suscripción en tiempo real a promociones
    const unsubscribePromotions = onSnapshot(
      collection(db, 'promotions'),
      (snapshot) => {
        try {
          const promoData = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              categoryId: String(data.categoryId || '').trim() // Normalizar ID
            }
          })
          // Ordenar localmente por campo order (ascendente) - items sin order van al final
          const sorted = promoData.sort((a, b) => {
            const orderA = typeof a.order === 'number' ? a.order : 999999
            const orderB = typeof b.order === 'number' ? b.order : 999999
            return orderA - orderB
          })
          setPromotions(sorted)
          console.log('✅ Promociones sincronizadas:', sorted.length)
          sorted.forEach(p => console.log(`  - ${p.name} → Cat: ${p.categoryId || 'Sin categoría'}`))
        } catch (error) {
          console.error('❌ Error procesando promociones:', error)
          setPromotions([])
        }
      },
      (error) => {
        console.error('❌ Error en suscripción de promociones:', error)
        setPromotions([])
      }
    )

    // Suscripción en tiempo real a categorías de promociones
    const unsubscribeCategories = onSnapshot(
      query(collection(db, 'categoriesPromotions'), orderBy('name', 'asc')),
      (snapshot) => {
        try {
          const categoriesData = snapshot.docs.map(doc => ({
            id: doc.id,
            name: String(doc.data().name || 'Sin nombre').trim(),
            createdAt: doc.data().createdAt,
            updatedAt: doc.data().updatedAt
          }))
          setCategories(categoriesData)
          console.log('✅ Categorías sincronizadas:', categoriesData.length)
          categoriesData.forEach(cat => console.log(`  📁 ${cat.name} (ID: ${cat.id})`))
        } catch (error) {
          console.error('❌ Error procesando categorías:', error)
          setCategories([])
        }
      },
      (error) => {
        console.error('❌ Error en suscripción de categorías:', error)
        setCategories([])
      }
    )

    return () => {
      console.log('🔌 Desconectando suscripciones...')
      unsubscribePromotions()
      unsubscribeCategories()
    }
  }, [])

  const loadStaticData = async () => {
    try {
      const [prodData, recData, ingData, configData] = await Promise.all([
        getProducts(),
        getRecipes(),
        getIngredients(),
        getConfig()
      ])
      setProducts(Array.isArray(prodData) ? prodData : [])
      setRecipes(Array.isArray(recData) ? recData : [])
      setIngredients(Array.isArray(ingData) ? ingData : [])
      setConfig(configData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Recalcular costos frescos del combo al editar
  const recalculateCombo = (items) => {
    if (!items || items.length === 0) return []
    
    console.log('🔄 Recalculando combo con items:', items.length)
    
    const recalculated = items.map(item => {
      // Obtener datos actualizados de la BD
      const liveData = getLiveItemData(item.type || 'product', item.id)
      
      const recalculatedItem = {
        type: item.type || 'product',
        id: item.id || '',
        quantity: item.cantidad || item.quantity || 1,
        optionalPrice: item.optionalPrice || 0
      }
      
      console.log('✅ Item recalculado:', liveData.name, '- Costo:', liveData.cost)
      return recalculatedItem
    })
    
    return recalculated
  }

  const handleOpenModal = (promo = null) => {
    if (promo) {
      console.log('� Abriendo combo para EDITAR:', promo.name, 'ID:', promo.id)
      
      // 🔥 MODO EDICIÓN - Establecer editingId con el ID real
      setEditingId(promo.id)
      
      // Recalcular items con datos frescos ANTES de abrir modal
      const itemsWithFreshData = recalculateCombo(promo.items || [])
      
      setFormData({
        name: String(promo.name || ''),
        items: itemsWithFreshData,
        promoPrice: Number(promo.promoPrice) || 0,
        categoryId: String(promo.categoryId || ''),
      })
      
      // Abrir modal SIN loading para que se vea el recálculo inmediatamente
      setModalLoading(false)
      setShowModal(true)
      
      // 🔥 EJECUTAR calculateTotals INMEDIATAMENTE para llenar indicadores
      setTimeout(() => {
        const totals = calculateTotals(itemsWithFreshData)
        console.log('✅ Recálculo automático al abrir:', {
          costoTotal: totals.totalCost,
          precioVenta: promo.promoPrice,
          margen: ((promo.promoPrice - totals.totalCost) / promo.promoPrice * 100).toFixed(1) + '%',
          modoEdicion: true,
          editingId: promo.id
        })
      }, 0)
      
      console.log('✅ Combo cargado en MODO EDICIÓN con ID:', promo.id)
    } else {
      console.log('➕ Abriendo modal para CREAR nuevo combo')
      setEditingId(null)
      setFormData({
        name: '',
        items: [],
        promoPrice: 0,
        categoryId: '',
      })
      setShowModal(true)
      setModalLoading(false)
    }
  }

  const handleDuplicate = async (promo) => {
    try {
      console.log('📋 Duplicando combo:', promo.name)
      
      // Validar que el combo tenga datos
      if (!promo) {
        console.error('❌ No se puede duplicar: combo inválido')
        alert('Error: No se puede duplicar este combo')
        return
      }
      
      // Inicializar items como array vacío si no existe
      const itemsOriginales = Array.isArray(promo.items) ? promo.items : []
      
      // 🔥 DUPLICACIÓN DIRECTA SIN MODAL
      const totals = calculateTotals(itemsOriginales)
      const promoPrice = Number(promo.promoPrice) || 0
      const ahorro = totals.totalRegularPrice - promoPrice
      const descuentoPct = totals.totalRegularPrice > 0 && ahorro > 0
        ? (ahorro / totals.totalRegularPrice) * 100
        : 0
      
      const costoUnidad = Number(totals.totalCost) || 0
      const utilidadDinero = promoPrice - costoUnidad
      const pContribucion = promoPrice > 0 ? ((utilidadDinero / promoPrice) * 100) : 0

      // Crear copia con TODOS los campos calculados
      const comboDuplicado = {
        id: `tmp-${Date.now()}`,
        name: `COPIA - ${promo.name}`,
        items: itemsOriginales,
        promoPrice: promoPrice,
        categoryId: String(promo.categoryId || ''),
        totalCosto: Number(totals.totalCost) || 0,
        totalPrecioCarta: Number(totals.totalRegularPrice) || 0,
        ahorroDinero: Number(ahorro > 0 ? ahorro : 0) || 0,
        porcentajeDescuento: Number(descuentoPct) || 0,
        pvpRegular: Number(totals.totalRegularPrice) || 0,
        descuentoMonto: Number(ahorro > 0 ? ahorro : 0) || 0,
        ahorroPorcentaje: Number(descuentoPct) || 0,
        costoAlimentos: Number(totals.costoAlimentos) || 0,
        costoEmbalaje: Number(totals.costoEmbalaje) || 0,
        costoUnidad: Number(costoUnidad) || 0,
        pContribucion: Number(pContribucion) || 0,
        mContribucion: Number(utilidadDinero) || 0,
        order: 0, // Colocar al inicio
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Guardar directamente en Firebase
      await saveDoc('promotions', comboDuplicado)
      console.log('✅ Combo duplicado y guardado automáticamente')
      
    } catch (error) {
      console.error('❌ Error al duplicar combo:', error)
      alert(`Error al duplicar combo: ${error.message}`)
    }
  }

  const handleAddItem = (type = 'product') => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { type, id: '', quantity: 1, optionalPrice: 0 }]
    }))
  }

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  // Recalcular métricas de productos IGUAL que ProductsNew.jsx
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
              const costoPorGramo = ing.costWithWastage / ing.pesoEmpaqueTotal
              costoIngredientes += costoPorGramo * cantidadUsada
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
              costoIngredientes += rec.totalCost * cantidadUsada
            }
          }
        }
      })

      const manoDeObra = parseFloat(product.laborCost || 0)
      const costoTotal = costoIngredientes + manoDeObra
      const precioVenta = parseFloat(product.realSalePrice) || 0

      return {
        ingredientsCost: costoIngredientes,
        laborCost: manoDeObra,
        totalCost: costoTotal,
        realSalePrice: precioVenta,
      }
    } catch (error) {
      console.error('❌ Error calculando métricas:', error)
      return {
        ingredientsCost: 0,
        laborCost: 0,
        totalCost: 0,
        realSalePrice: 0,
      }
    }
  }

  // Buscar datos vivos por ID - CORREGIDO para usar recalcular
  const getLiveItemData = (type, id) => {
    if (type === 'product') {
      const product = products.find(p => p.id === id)
      if (!product) {
        console.warn(`⚠️ Producto no encontrado: id=${id}`)
        return { cost: 0, price: 0, name: '' }
      }
      
      // RECALCULAR el costo igual que ProductsNew.jsx
      const metrics = recalculateProductMetrics(product)
      const cost = metrics.totalCost
      const price = product.realSalePrice || 0
      
      console.log(`✅ Producto recalculado: ${product.name} - Costo: ${cost}, Precio: ${price}`)
      
      return { cost, price, name: product.name || '' }
    } else if (type === 'recipe') {
      // Para recetas, usar totalCost directamente
      const recipe = recipes.find(r => r.id === id)
      if (!recipe) {
        console.warn(`⚠️ Receta no encontrada: id=${id}`)
        return { cost: 0, price: 0, name: '' }
      }
      
      const cost = Number(recipe.totalCost || 0)
      const price = Number(recipe.totalCost || 0) // Las recetas no tienen precio de venta
      
      console.log(`✅ Receta cargada: ${recipe.name} - Costo: ${cost}`)
      
      return { cost, price, name: recipe.name || '' }
    } else if (type === 'ingredient') {
      // Para ingredientes, usar costoPorGramo o costWithWastage
      const ingredient = ingredients.find(i => i.id === id)
      if (!ingredient) {
        console.warn(`⚠️ Ingrediente no encontrado: id=${id}`)
        return { cost: 0, price: 0, name: '' }
      }
      
      const cost = Number(ingredient.costoPorGramo || ingredient.costWithWastage || 0)
      const price = 0 // Los ingredientes no tienen precio de venta
      
      console.log(`✅ Ingrediente cargado: ${ingredient.name} - Costo/g: ${cost}`)
      
      return { cost, price, name: ingredient.name || '' }
    }
    return { cost: 0, price: 0, name: '' }
  }

  // Calcular totales en tiempo real CON SUBTOTALES POR CATEGORÍA
  const calculateTotals = (items) => {
    let totalCost = 0
    let totalRegularPrice = 0
    let costoAlimentos = 0 // Productos y recetas
    let costoEmbalaje = 0 // Ingredientes

    items.forEach(item => {
      const qty = Number(item.quantity) || 0
      const liveData = getLiveItemData(item.type, item.id)
      const itemCost = liveData.cost * qty
      
      totalCost += itemCost
      
      // Clasificar por categoría
      if (item.type === 'ingredient') {
        costoEmbalaje += itemCost
      } else {
        costoAlimentos += itemCost
      }
      
      // Si es ingrediente, usar optionalPrice si existe, sino 0
      // Si es producto/receta, usar optionalPrice si existe, sino el precio del item
      let itemPrice = 0
      if (item.type === 'ingredient') {
        itemPrice = Number(item.optionalPrice) || 0
      } else {
        itemPrice = Number(item.optionalPrice) > 0 ? Number(item.optionalPrice) : liveData.price
      }
      totalRegularPrice += itemPrice * qty
    })

    return {
      totalCost: Number(totalCost) || 0,
      totalRegularPrice: Number(totalRegularPrice) || 0,
      costoAlimentos: Number(costoAlimentos) || 0,
      costoEmbalaje: Number(costoEmbalaje) || 0
    }
  }

  const handleSave = async () => {
    // Sanitizar datos - convertir a string para evitar error indexOf
    const sanitizedName = String(formData.name || '').trim()
    const sanitizedCategoryId = String(formData.categoryId || '').trim()
    
    console.log('💾 Guardando combo:', sanitizedName, '→ Categoría ID:', sanitizedCategoryId)
    
    // Validaciones
    if (!sanitizedName) {
      alert('⚠️ El nombre del combo es requerido')
      return
    }
    if (formData.items.length === 0) {
      alert('⚠️ Agrega al menos 1 item al combo')
      return
    }
    
    // Validar que todos los items tengan ID
    const emptyItems = formData.items.filter(item => !item.id)
    if (emptyItems.length > 0) {
      alert('⚠️ Todos los items deben tener un producto/receta/ingrediente seleccionado')
      return
    }

    setModalLoading(true)
    
    try {
      // 🔥 USAR TOTALES CALCULADOS del estado para consistencia
      const totals = calculateTotals(formData.items)
      const promoPrice = Number(formData.promoPrice) || 0
      
      // Validar que el precio no sea 0
      if (promoPrice <= 0) {
        alert('⚠️ El precio de venta del combo debe ser mayor a 0')
        setModalLoading(false)
        return
      }
      
      const ahorro = totals.totalRegularPrice - promoPrice
      const descuentoPct = totals.totalRegularPrice > 0 && ahorro > 0
        ? (ahorro / totals.totalRegularPrice) * 100
        : 0

      // 🔥 CALCULAR CT Y P-CONTRIBUCIÓN para sincronización card-editor
      const costoUnidad = Number(totals.totalCost) || 0
      const utilidadDinero = promoPrice - costoUnidad
      const pContribucion = promoPrice > 0 ? ((utilidadDinero / promoPrice) * 100) : 0

      // Mapear items con estructura limpia
      const cleanItems = formData.items.map(item => {
        const liveData = getLiveItemData(item.type, item.id)
        const qty = Number(item.quantity) || 1
        
        return {
          type: item.type || 'product',
          id: item.id || '',
          nombre: liveData.name || '',
          cantidad: qty,
          costoUnitario: Number(liveData.cost) || 0,
          precioVenta: Number(liveData.price) || 0,
          optionalPrice: Number(item.optionalPrice) || 0
        }
      })

      // 🔥 PERSISTENCIA TOTAL - Incluir todos los campos calculados
      const promoData = {
        name: sanitizedName,
        items: cleanItems,
        promoPrice: Number(promoPrice) || 0,
        categoryId: sanitizedCategoryId,
        // Campos calculados para persistencia
        totalCosto: Number(totals.totalCost) || 0,
        totalPrecioCarta: Number(totals.totalRegularPrice) || 0,
        ahorroDinero: Number(ahorro > 0 ? ahorro : 0) || 0,
        porcentajeDescuento: Number(descuentoPct) || 0,
        // 🔥 NUEVOS CAMPOS del resumen (pvpRegular, descuentoMonto, ahorroPorcentaje)
        pvpRegular: Number(totals.totalRegularPrice) || 0,
        descuentoMonto: Number(ahorro > 0 ? ahorro : 0) || 0,
        ahorroPorcentaje: Number(descuentoPct) || 0,
        // 🔥 SUBTOTALES POR CATEGORÍA (Alimentos vs Embalaje)
        costoAlimentos: Number(totals.costoAlimentos) || 0,
        costoEmbalaje: Number(totals.costoEmbalaje) || 0,
        // Campos de sincronización card-editor
        costoUnidad: Number(costoUnidad) || 0,
        pContribucion: Number(pContribucion) || 0,
        mContribucion: Number(utilidadDinero) || 0,
        updatedAt: new Date().toISOString()
      }

      // 🔥 PRESERVAR ORDER al editar, asignar 0 si es nuevo
      if (editingId) {
        // Edición: mantener order existente si existe
        const currentPromo = promotions.find(p => p.id === editingId)
        if (currentPromo && 'order' in currentPromo) {
          promoData.order = currentPromo.order
        }
      } else {
        // Nuevo: colocar al inicio
        promoData.order = 0
        promoData.createdAt = new Date().toISOString()
      }
      
      console.log('📦 Datos del combo a guardar:', {
        nombre: promoData.name,
        categoriaID: promoData.categoryId,
        items: promoData.items.length,
        precio: promoData.promoPrice
      })

      console.log('📝 Guardando promoción:', promoData)

      // ESPERAR confirmación de Firebase antes de cerrar
      if (editingId) {
        await saveDoc('promotions', promoData, editingId)
      } else {
        await saveDoc('promotions', promoData)
      }
      
      console.log('✅ Promoción guardada exitosamente en Firebase')
      
      // Cerrar modal - onSnapshot actualizará automáticamente la lista
      setShowModal(false)
      setModalLoading(false)
      
    } catch (error) {
      console.error('❌ Error detallado al guardar promoción:', error)
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      // NO cerrar modal para evitar pérdida de datos
      alert(`❌ Error al guardar en Firebase:\n\n${error.message || 'Error desconocido'}\n\nPor favor intenta de nuevo. Tus datos NO se han perdido.`)
      setModalLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm('¿Eliminar?')) return;
    try {
      await deleteDoc(doc(db, 'promotions', id));
      setPromotions(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  // ========== DRAG & DROP FUNCTIONS ==========
  
  const handleDragStart = (e, promo) => {
    console.log('🎯 Drag Start:', promo.name)
    setDraggedItem(promo)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    console.log('🎯 Drag End')
    setDraggedItem(null)
    setDragOverCategory(null)
  }

  const handleDragOver = (e, categoryId = null) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (categoryId !== null) {
      setDragOverCategory(categoryId)
    }
  }

  const handleDragLeave = () => {
    setDragOverCategory(null)
  }

  // Reordenar dentro de la misma categoría
  const handleDrop = async (e, targetPromo) => {
    e.preventDefault()
    
    if (!draggedItem || draggedItem.id === targetPromo.id) {
      setDraggedItem(null)
      return
    }

    // Solo reordenar dentro de la misma categoría
    if (draggedItem.categoryId !== targetPromo.categoryId) {
      setDraggedItem(null)
      return
    }

    try {
      const filtered = selectedCategoryFilter
        ? promotions.filter(p => p.categoryId === selectedCategoryFilter)
        : promotions
      
      const draggedIndex = filtered.findIndex(p => p.id === draggedItem.id)
      const targetIndex = filtered.findIndex(p => p.id === targetPromo.id)
      
      const reordered = [...filtered]
      const [removed] = reordered.splice(draggedIndex, 1)
      reordered.splice(targetIndex, 0, removed)
      
      // Asignar nuevos índices
      const updates = reordered.map((promo, index) => {
        const docRef = doc(db, 'promotions', promo.id)
        return updateDoc(docRef, {
          order: index,
          updatedAt: new Date().toISOString()
        })
      })
      
      await Promise.all(updates)
      console.log('✅ Orden actualizado')
    } catch (error) {
      console.error('Error reordering:', error)
      alert('Error al reordenar')
    } finally {
      setDraggedItem(null)
    }
  }

  // Cambiar de categoría
  const handleDropCategory = async (e, targetCategoryId) => {
    e.preventDefault()
    setDragOverCategory(null)
    
    if (!draggedItem) return

    try {
      const currentCategoryId = String(draggedItem.categoryId || '').trim()
      const newCategoryId = String(targetCategoryId || '').trim()

      console.log('📦 Drop Category:', {
        combo: draggedItem.name,
        from: currentCategoryId || 'Sin categoría',
        to: newCategoryId || 'Sin categoría'
      })

      // Si se mueve a una categoría diferente
      if (currentCategoryId !== newCategoryId) {
        const docRef = doc(db, 'promotions', draggedItem.id)
        await updateDoc(docRef, {
          categoryId: newCategoryId,
          updatedAt: new Date().toISOString()
        })
        console.log('✅ Categoría actualizada en Firebase')
      } else {
        console.log('ℹ️ Mismo origen y destino, no se actualiza')
      }
    } catch (error) {
      console.error('❌ Error al actualizar categoría:', error)
      alert('Error al mover el combo')
    } finally {
      setDraggedItem(null)
    }
  }

  // Manejar guardado de categoría
  const handleSaveCategory = async () => {
    const sanitizedName = String(categoryName || '').trim()
    
    console.log('🚀 [Promotions] Intentando guardar categoría:', sanitizedName)
    
    if (!sanitizedName) {
      alert('⚠️ El nombre de la categoría es requerido')
      return
    }

    // Validar que no exista una categoría con el mismo nombre
    const existingCategory = categories.find(
      cat => cat.name.toLowerCase() === sanitizedName.toLowerCase() && 
             (!editingCategory || cat.id !== editingCategory.id)
    )
    
    if (existingCategory) {
      alert(`⚠️ Ya existe una categoría con el nombre "${sanitizedName}"`)
      return
    }

    try {
      if (editingCategory) {
        // Editar categoría existente
        console.log('📝 Editando categoría existente:', editingCategory.id)
        await saveDoc('categoriesPromotions', { 
          name: sanitizedName,
          updatedAt: new Date().toISOString()
        }, editingCategory.id)
        console.log('✅ Categoría editada:', sanitizedName)
      } else {
        // Crear nueva categoría
        console.log('📝 Creando nueva categoría:', sanitizedName)
        const timestamp = new Date().toISOString()
        const newCategoryId = await saveDoc('categoriesPromotions', { 
          name: sanitizedName,
          createdAt: timestamp,
          updatedAt: timestamp
        })
        console.log('✅ Categoría creada con ID:', newCategoryId)
      }
      
      setShowCategoryModal(false)
      setEditingCategory(null)
      setCategoryName('')
      
      // No mostrar alert, el onSnapshot actualizará automáticamente
      console.log('✅ Categoría guardada, esperando actualización en tiempo real...')
      
    } catch (error) {
      console.error('❌ Error guardando categoría:', error)
      console.error('❌ Detalles del error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      })
      alert(`❌ Error al guardar categoría:\n\n${error.message}`)
    }
  }

  // Filtrar promociones por categoría seleccionada - VALIDACIÓN ESTRICTA
  const filteredPromotions = selectedCategoryFilter
    ? promotions.filter(p => {
        const promoCategory = String(p.categoryId || '').trim()
        const filterCategory = String(selectedCategoryFilter || '').trim()
        const match = promoCategory === filterCategory
        if (!match && p.categoryId) {
          console.log(`🔍 Combo "${p.name}" no coincide: "${promoCategory}" !== "${filterCategory}"`)
        }
        return match
      })
    : promotions
  
  // Log de filtrado
  if (selectedCategoryFilter) {
    const categoryName = categories.find(c => c.id === selectedCategoryFilter)?.name || 'Desconocida'
    console.log(`🔍 Filtrando por categoría: ${categoryName} (${selectedCategoryFilter})`)
    console.log(`📊 Combos encontrados: ${filteredPromotions.length} de ${promotions.length} totales`)
  }

  if (loading) {
    return (
      <div className={`p-6 flex items-center justify-center ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-[#111827]'}`}>
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className={`p-6 transition-colors duration-300 ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-[#111827]'}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Tag size={32} className="text-primary-blue" />
            Promociones / Combos
          </h2>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Gestiona combos con datos vivos de productos y recetas
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-3 bg-primary-blue hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg font-medium"
        >
          <Plus size={20} />
          Nueva Promoción
        </button>
      </div>

      {/* Pestañas de Categoría - MOSTRAR TODAS SIN FILTRAR */}
      <div className={`flex gap-2 items-center border-b-2 pb-3 mb-6 overflow-x-auto ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <button
          onClick={() => {
            console.log('📋 Mostrando todas las promociones')
            setSelectedCategoryFilter(null)
          }}
          onDragOver={(e) => handleDragOver(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropCategory(e, null)}
          className={`px-6 py-2 font-semibold transition-all border-b-4 whitespace-nowrap ${
            dragOverCategory === null && draggedItem ? 'bg-blue-100 dark:bg-blue-900/30' : ''
          } ${
            selectedCategoryFilter === null
              ? 'border-primary-blue text-primary-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 Todas ({promotions.length})
        </button>
        {categories.length === 0 && (
          <span className="text-sm text-gray-500 italic px-2">
            No hay categorías. Crea una con "+ Categoría"
          </span>
        )}
        {(categories || []).map(cat => {
          const categoryPromoCount = promotions.filter(p => String(p.categoryId).trim() === String(cat.id).trim()).length
          return (
            <div key={cat.id} className="relative group">
              <button
                onClick={() => {
                  console.log(`🏷️ Filtrando por categoría: ${cat.name} (ID: ${cat.id})`)
                  setSelectedCategoryFilter(cat.id)
                }}
                onDragOver={(e) => handleDragOver(e, cat.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropCategory(e, cat.id)}
                className={`px-6 py-2 font-semibold transition-all border-b-4 whitespace-nowrap ${
                  dragOverCategory === cat.id && draggedItem ? 'bg-blue-100 dark:bg-blue-900/30 scale-105' : ''
                } ${
                  selectedCategoryFilter === cat.id
                    ? 'border-primary-blue text-primary-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {cat.name} ({categoryPromoCount})
              </button>
              <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
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
                      deleteDocument('categoriesPromotions', cat.id)
                        .then(() => {
                          console.log('✅ Categoría eliminada:', cat.name)
                          setSelectedCategoryFilter(null)
                        })
                        .catch(error => {
                          console.error('❌ Error eliminando categoría:', error)
                          alert('Error al eliminar la categoría')
                        })
                    }
                  }}
                  className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                  title="Eliminar categoría"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          )
        })}
        <button
          onClick={() => {
            setEditingCategory(null)
            setCategoryName('')
            setShowCategoryModal(true)
          }}
          className="px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
        >
          + Categoría
        </button>
      </div>

      {filteredPromotions.length === 0 ? (
        <div className={`rounded-lg p-12 text-center border ${isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-white border-gray-200'}`}>
          <Tag size={48} className="mx-auto mb-4 text-gray-500" />
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            {selectedCategoryFilter ? 'No hay promociones en esta categoría' : 'No hay combos registrados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredPromotions.map(promo => {
            // 🔥 PRIORIZAR VALORES DE FIREBASE - Solo recalcular si no existen
            const promoPrice = Number(promo.promoPrice) || 0
            
            // PVP Regular: usar valor guardado, sino recalcular
            const pvpRegular = Number(promo.pvpRegular) || Number(promo.totalPrecioCarta) || 0
            const needsRecalc = pvpRegular === 0
            const totals = needsRecalc ? calculateTotals(promo.items || []) : null
            const pvpRegularFinal = pvpRegular > 0 ? pvpRegular : (totals?.totalRegularPrice || 0)
            
            // Descuento: usar valor guardado, sino recalcular
            const descuentoMonto = Number(promo.descuentoMonto) || Number(promo.ahorroDinero) || 0
            const ahorroPorcentaje = Number(promo.ahorroPorcentaje) || Number(promo.porcentajeDescuento) || 0
            const discountAmount = descuentoMonto > 0 ? descuentoMonto : (pvpRegularFinal - promoPrice)
            const discountPercent = ahorroPorcentaje > 0 ? ahorroPorcentaje : (
              pvpRegularFinal > 0 ? ((discountAmount / pvpRegularFinal) * 100) : 0
            )
            
            // Costo y contribución: usar valores guardados, sino recalcular
            const costoUnidad = Number(promo.costoUnidad) || (totals?.totalCost || 0)
            const pContribucion = Number(promo.pContribucion) || (promoPrice > 0
              ? (((promoPrice - costoUnidad) / promoPrice) * 100)
              : 0)
            const mContribucion = Number(promo.mContribucion) || (promoPrice - costoUnidad)
            
            const margin = pContribucion
            const profit = mContribucion

            return (
              <div 
                key={promo.id}
                draggable
                onDragStart={(e) => handleDragStart(e, promo)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e)}
                onDrop={(e) => handleDrop(e, promo)}
                className={`p-2 rounded-lg border cursor-move transition-all relative ${
                  draggedItem?.id === promo.id 
                    ? 'opacity-50 scale-95' 
                    : 'opacity-100 scale-100'
                } ${
                  isDarkMode ? 'bg-[#1f2937] border-gray-700 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-400'
                }`}
              >
                {/* Botones en esquina superior derecha */}
                <div className="absolute top-1 right-1 flex gap-0.5">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDuplicate(promo)
                    }}
                    className={`p-1 rounded transition-colors ${
                      isDarkMode ? 'hover:bg-[#111827] text-green-400' : 'hover:bg-gray-100 text-green-600'
                    }`}
                    title="Duplicar"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => handleOpenModal(promo)}
                    className={`p-1 rounded transition-colors ${
                      isDarkMode ? 'hover:bg-[#111827] text-blue-400' : 'hover:bg-gray-100 text-blue-600'
                    }`}
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className={`p-1 rounded transition-colors ${
                      isDarkMode ? 'hover:bg-[#111827] text-red-400' : 'hover:bg-gray-100 text-red-600'
                    }`}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Título y categoría */}
                <div className="pr-24 mb-2">
                  <h3 className={`font-semibold text-sm break-words leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`} title={promo.name}>
                    {promo.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {(promo.items || []).length} item(s)
                    </span>
                    {promo.categoryId && (() => {
                      const category = categories.find(c => c.id === promo.categoryId)
                      return category ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded">
                          {category.name}
                        </span>
                      ) : null
                    })()}
                  </div>
                </div>

                {/* Métricas en formato compacto horizontal */}
                <div className={`space-y-1 text-[11px] mb-2 pb-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>PVP Regular</span>
                    <span className={`font-semibold line-through ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {formatMoneyDisplay(pvpRegularFinal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Descuento</span>
                    <span className={`font-semibold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                      -{discountPercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>CT</span>
                    <span className={`font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {formatMoneyDisplay(costoUnidad)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>PV</span>
                    <span className={`font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {formatMoneyDisplay(promoPrice)}
                    </span>
                  </div>
                </div>

                {/* P y M Contribución en fila compacta */}
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div className={`p-1.5 rounded text-center ${
                    margin < 25
                      ? isDarkMode ? 'bg-red-900/40' : 'bg-red-100'
                      : isDarkMode ? 'bg-green-900/40' : 'bg-green-100'
                  }`}>
                    <div className={`font-bold ${
                      margin < 25
                        ? isDarkMode ? 'text-red-400' : 'text-red-600'
                        : isDarkMode ? 'text-green-400' : 'text-green-600'
                    }`}>
                      {margin.toFixed(1)}%
                    </div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>P-Cont</div>
                  </div>
                  <div className={`p-1.5 rounded text-center ${
                    profit >= 0
                      ? isDarkMode ? 'bg-green-900/40' : 'bg-green-100'
                      : isDarkMode ? 'bg-red-900/40' : 'bg-red-100'
                  }`}>
                    <div className={`font-bold ${
                      profit >= 0
                        ? isDarkMode ? 'text-green-400' : 'text-green-600'
                        : isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      {formatMoneyDisplay(profit)}
                    </div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>M-Cont</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <Modal
          title={editingId ? 'Editar Combo' : 'Nuevo Combo'}
          onClose={() => !modalLoading && setShowModal(false)}
        >
          <div className="space-y-2 pb-2 relative">
            {/* Loading Overlay */}
            {modalLoading && (
              <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto mb-3"></div>
                  <p className="text-white font-semibold">
                    {editingId ? 'Cargando datos...' : 'Guardando...'}
                  </p>
                </div>
              </div>
            )}
            
            {/* CABECERA EN 3 COLUMNAS */}
            <div className="grid grid-cols-3 gap-2">
              {/* Nombre */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  📋 Nombre del Combo
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-2 py-1.5 rounded-lg border text-sm ${
                    isDarkMode
                      ? 'bg-[#111827] border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Ej: Combo Familiar"
                />
              </div>

              {/* Categoría */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  🏷️ Categoría
                </label>
                <SearchSelect
                  options={(categories || []).map(cat => ({ id: cat.id, name: cat.name }))}
                  value={formData.categoryId}
                  onChange={(val) => setFormData(prev => ({ ...prev, categoryId: val }))}
                  placeholder="Seleccionar..."
                  displayKey="name"
                  valueKey="id"
                />
              </div>

              {/* Precio de Venta */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isDarkMode ? 'text-green-300' : 'text-green-700'
                }`}>
                  💵 PRECIO VENTA
                </label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={formData.promoPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, promoPrice: e.target.value }))}
                  onFocus={(e) => e.target.select()}
                  className={`w-full px-2 py-1.5 rounded-lg border-2 font-bold text-base text-center ${
                    isDarkMode
                      ? 'bg-[#1f2937] border-green-600 text-green-300'
                      : 'bg-white border-green-500 text-green-700'
                  }`}
                  placeholder="0"
                />
              </div>
            </div>

            {/* MÉTRICAS COMPACTAS */}
            {(() => {
              const totals = calculateTotals(formData.items)
              const promoPrice = Number(formData.promoPrice) || 0
              const profit = promoPrice - totals.totalCost
              const margin = promoPrice > 0
                ? (((promoPrice - totals.totalCost) / promoPrice) * 100)
                : 0

              return (
                <div className={`p-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-900/50 border-gray-700' 
                    : 'bg-gray-50 border-gray-300'
                }`}>
                  <div className="grid grid-cols-3 gap-2">
                  {/* Costo Unidad */}
                  <div className={`p-2 rounded-lg text-center ${
                    isDarkMode ? 'bg-blue-950/50 border border-blue-700' : 'bg-blue-50 border border-blue-300'
                  }`}>
                    <div className={`text-[10px] font-bold mb-1 ${
                      isDarkMode ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      COSTO
                    </div>
                    <div className={`text-sm font-black ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {formatMoneyDisplay(totals.totalCost)}
                    </div>
                  </div>

                  {/* P-Contribución */}
                  <div className={`p-2 rounded-lg text-center ${
                    isDarkMode ? 'bg-gray-800/50 border border-gray-600' : 'bg-gray-100 border border-gray-300'
                  }`}>
                    <div className={`text-[10px] font-bold mb-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      P-CONTRIB.
                    </div>
                    <div className={`text-sm font-black ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {margin.toFixed(1)}%
                    </div>
                  </div>

                  {/* M-Contribución */}
                  <div className={`p-2 rounded-lg text-center ${
                    isDarkMode ? 'bg-purple-950/50 border border-purple-700' : 'bg-purple-50 border border-purple-300'
                  }`}>
                    <div className={`text-[10px] font-bold mb-1 ${
                      isDarkMode ? 'text-purple-300' : 'text-purple-700'
                    }`}>
                      M-CONTRIB.
                    </div>
                    <div className={`text-sm font-black ${
                      isDarkMode ? 'text-purple-400' : 'text-purple-600'
                    }`}>
                      {formatMoneyDisplay(profit)}
                    </div>
                  </div>
                </div>
              </div>
              )
            })()}

            <div className="border-t border-gray-600 my-1"></div>

            {/* Precio Sugerido */}
            {formData.items.length > 0 && (() => {
              const totals = calculateTotals(formData.items)
              // FÓRMULA CORREGIDA: margen sobre precio de venta, no recargo sobre costo
              // Precio = Costo / (1 - Margen Deseado)
              // Usar margen configurado por el usuario
              const margenConfig = config?.targetProfitMargin ?? 35
              const targetMargin = parseFloat(margenConfig) / 100
              const suggestedPrice = roundToNearestThousand(totals.totalCost / (1 - targetMargin))
              
              return (
                <div className={`flex items-center justify-between px-2 py-1.5 rounded-lg border ${
                  isDarkMode ? 'bg-blue-950/30 border-blue-600' : 'bg-blue-50 border-blue-400'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold ${
                      isDarkMode ? 'text-blue-300' : 'text-blue-700'
                    }`}>
                      💡 SUGERIDO
                    </span>
                    <span className={`text-base font-black ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>
                      {formatMoneyDisplay(suggestedPrice)}
                    </span>
                    <span className={`text-[10px] ${
                      isDarkMode ? 'text-blue-400/70' : 'text-blue-600/70'
                    }`}>
                      ({config?.targetProfitMargin || 35}%)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // 🔥 Aplicar precio sugerido
                      setFormData(prev => ({ ...prev, promoPrice: suggestedPrice }))
                      
                      // 🔥 FORZAR RECÁLCULO INMEDIATO de totales
                      setTimeout(() => {
                        const ahorro = totals.totalRegularPrice - suggestedPrice
                        const descuentoPct = totals.totalRegularPrice > 0 && ahorro > 0
                          ? (ahorro / totals.totalRegularPrice) * 100
                          : 0
                        
                        setCalculatedTotals({
                          totalCost: totals.totalCost,
                          totalRegularPrice: totals.totalRegularPrice,
                          ahorro: ahorro > 0 ? ahorro : 0,
                          descuentoPct: descuentoPct
                        })
                        
                        console.log('✅ Precio sugerido aplicado y totales recalculados:', {
                          precio: formatMoneyDisplay(suggestedPrice),
                          descuento: formatMoneyDisplay(ahorro),
                          ahorroPct: descuentoPct.toFixed(1) + '%'
                        })
                      }, 0)
                    }}
                    className={`px-2 py-1 rounded-md font-bold text-[10px] transition-all ${
                      isDarkMode
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    ⚡ Aplicar
                  </button>
                </div>
              )
            })()}

            {/* Items del Combo */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className={`text-xs font-bold ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  🎁 ITEMS DEL COMBO
                </h4>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAddItem('product')}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-medium"
                  >
                    📦 P
                  </button>
                  <button
                    onClick={() => handleAddItem('recipe')}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-medium"
                  >
                    🍖 R
                  </button>
                  <button
                    onClick={() => handleAddItem('ingredient')}
                    className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-medium"
                  >
                    🥕 I
                  </button>
                </div>
              </div>

              <div className={`rounded-lg border ${
                isDarkMode ? 'bg-[#0a0e1a] border-gray-700' : 'bg-gray-50 border-gray-300'
              }`}>
                {/* Cabecera */}
                <div className={`grid grid-cols-[40px_3fr_100px_100px_100px_32px] gap-2 px-2 py-1.5 border-b font-bold text-[10px] items-center ${
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-200 border-gray-300 text-gray-700'
                }`}>
                  <div className="text-center">TIPO</div>
                  <div>NOMBRE</div>
                  <div className="text-center">CANT</div>
                  <div className="text-right">COSTO UNIT.</div>
                  <div className="text-right">PRECIO VENTA</div>
                  <div></div>
                </div>

                {/* Lista de Items CON AGRUPACIÓN */}
                <div className="max-h-[300px] overflow-y-auto">
                  {(() => {
                    // Agrupar items por categoría
                    const alimentosItems = formData.items.filter(item => item.type === 'product' || item.type === 'recipe')
                    const embalajeItems = formData.items.filter(item => item.type === 'ingredient')
                    
                    // Calcular subtotales
                    let subtotalAlimentos = 0
                    let subtotalEmbalaje = 0
                    
                    alimentosItems.forEach(item => {
                      const qty = Number(item.quantity) || 0
                      const liveData = getLiveItemData(item.type, item.id)
                      subtotalAlimentos += liveData.cost * qty
                    })
                    
                    embalajeItems.forEach(item => {
                      const qty = Number(item.quantity) || 0
                      const liveData = getLiveItemData(item.type, item.id)
                      subtotalEmbalaje += liveData.cost * qty
                    })
                    
                    const renderItem = (item, index, isEmbalaje = false) => {
                      const liveData = getLiveItemData(item.type, item.id)
                      const qty = Number(item.quantity) || 1
                      const itemCost = liveData.cost * qty
                      
                      // Determinar lista de origen según tipo
                      let sourceList = []
                      let badgeColor = ''
                      let badgeLabel = ''
                      let placeholder = ''
                      
                      if (item.type === 'product') {
                        sourceList = products
                        badgeColor = 'bg-blue-500/20 text-blue-400'
                        badgeLabel = '📦 P'
                        placeholder = 'Buscar producto...'
                      } else if (item.type === 'recipe') {
                        sourceList = recipes
                        badgeColor = 'bg-purple-500/20 text-purple-400'
                        badgeLabel = '🍖 R'
                        placeholder = 'Buscar receta...'
                      } else if (item.type === 'ingredient') {
                        sourceList = ingredients
                        badgeColor = 'bg-green-500/20 text-green-400'
                        badgeLabel = '🥕 I'
                        placeholder = 'Buscar ingrediente...'
                      }

                      const itemPriceDisplay = Number(item.optionalPrice) > 0 
                        ? Number(item.optionalPrice) * qty
                        : liveData.price * qty

                      return (
                        <div key={`${isEmbalaje ? 'emb' : 'ali'}-${index}`} className={`grid grid-cols-[40px_3fr_100px_100px_100px_32px] gap-2 px-2 py-1.5 border-b text-xs items-center min-h-[36px] ${
                          isDarkMode ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-100'
                        }`}>
                          <div className="flex items-center justify-center">
                            <span className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold text-white ${
                              item.type === 'product' ? 'bg-blue-600' : item.type === 'recipe' ? 'bg-purple-600' : 'bg-orange-500'
                            }`}>
                              {item.type === 'product' ? 'P' : item.type === 'recipe' ? 'R' : 'I'}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <SearchSelect
                              options={sourceList}
                              value={item.id}
                              onChange={(val) => handleItemChange(item.id, 'id', val)}
                              displayKey="name"
                              valueKey="id"
                              placeholder={placeholder}
                              className="w-full h-8"
                            />
                          </div>

                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                              onFocus={(e) => e.target.select()}
                              className={`w-full h-8 px-2 py-1 rounded border text-center text-xs ${
                                isDarkMode
                                  ? 'bg-[#111827] border-gray-600 text-white'
                                  : 'bg-white border-gray-300 text-gray-900'
                              }`}
                              placeholder="1"
                            />
                          </div>

                          <div className={`flex items-center justify-end ${
                            isDarkMode ? 'text-blue-300' : 'text-blue-600'
                          }`}>
                            <span className="font-semibold text-xs">{formatMoneyDisplay(itemCost)}</span>
                          </div>

                          <div className="flex items-center justify-end">
                            <input
                              type="number"
                              step="1000"
                              min="0"
                              value={item.optionalPrice || ''}
                              onChange={(e) => handleItemChange(item.id, 'optionalPrice', parseFloat(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              onDoubleClick={(e) => e.target.select()}
                              className={`w-full h-8 px-2 py-1 rounded border text-right text-xs ${
                                Number(item.optionalPrice) > 0
                                  ? isDarkMode
                                    ? 'bg-green-900/30 border-green-600 text-green-300 font-bold'
                                    : 'bg-green-50 border-green-400 text-green-700 font-bold'
                                  : isDarkMode
                                  ? 'bg-[#111827] border-gray-600 text-gray-400'
                                  : 'bg-white border-gray-300 text-gray-500'
                              }`}
                              placeholder={formatMoneyDisplay(liveData.price * qty)}
                              title="Doble clic para editar precio de venta personalizado"
                            />
                          </div>

                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className={`p-1 rounded transition-colors flex items-center justify-center ${
                                isDarkMode
                                  ? 'hover:bg-red-900/30 text-red-400'
                                  : 'hover:bg-red-100 text-red-600'
                              }`}
                              title="Eliminar item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    }
                    
                    return (
                      <>
                        {/* SECCIÓN 1: ALIMENTOS (Productos y Recetas) */}
                        {alimentosItems.length > 0 && (
                          <>
                            <div className={`px-2 py-2 border-b font-bold text-[11px] ${
                              isDarkMode ? 'bg-purple-950/30 border-purple-800 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
                            }`}>
                              🍽️ ALIMENTOS (Productos y Recetas)
                            </div>
                            {alimentosItems.map((item, idx) => renderItem(item, idx, false))}
                            
                            {/* Subtotal Alimentos */}
                            <div className={`grid grid-cols-[40px_3fr_100px_100px_100px_32px] gap-2 px-2 py-2 border-b font-bold text-xs items-center ${
                              isDarkMode ? 'bg-purple-900/20 border-purple-800 text-purple-400' : 'bg-purple-100 border-purple-300 text-purple-700'
                            }`}>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div className="text-right">SUBTOTAL:</div>
                              <div className="text-right">{formatMoneyDisplay(subtotalAlimentos)}</div>
                              <div></div>
                            </div>
                          </>
                        )}
                        
                        {/* SECCIÓN 2: EMBALAJE (Ingredientes) */}
                        {embalajeItems.length > 0 && (
                          <>
                            <div className={`px-2 py-2 border-b font-bold text-[11px] ${
                              isDarkMode ? 'bg-green-950/30 border-green-800 text-green-300' : 'bg-green-50 border-green-200 text-green-700'
                            }`}>
                              📦 EMBALAJE / INSUMOS
                            </div>
                            {embalajeItems.map((item, idx) => renderItem(item, idx, true))}
                            
                            {/* Subtotal Embalaje */}
                            <div className={`grid grid-cols-[40px_3fr_100px_100px_100px_32px] gap-2 px-2 py-2 border-b font-bold text-xs items-center ${
                              isDarkMode ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-green-100 border-green-300 text-green-700'
                            }`}>
                              <div></div>
                              <div></div>
                              <div></div>
                              <div className="text-right">SUBTOTAL:</div>
                              <div className="text-right">{formatMoneyDisplay(subtotalEmbalaje)}</div>
                              <div></div>
                            </div>
                          </>
                        )}
                      </>
                    )
                  })()}

                  {formData.items.length === 0 && (
                    <div className={`text-center py-4 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      <p className="text-[10px]">Sin items en el combo</p>
                    </div>
                  )}
                </div>

                {/* Resumen de Totales CON DESGLOSE */}
                {formData.items.length > 0 && (() => {
                  const totals = calculateTotals(formData.items)
                  
                  return (
                    <div className={`px-2 py-1.5 border-t ${
                      isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-100'
                    }`}>
                      <div className="space-y-2">
                        {/* DESGLOSE DE COSTOS */}
                        <div className={`p-2 rounded-lg ${
                          isDarkMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-white border border-gray-300'
                        }`}>
                          <div className="space-y-1">
                            {/* Total Alimentos */}
                            {totals.costoAlimentos > 0 && (
                              <div className="flex justify-between items-center">
                                <span className={`text-[10px] font-semibold ${
                                  isDarkMode ? 'text-purple-400' : 'text-purple-600'
                                }`}>
                                  🍽️ Total Alimentos:
                                </span>
                                <span className={`text-xs font-bold ${
                                  isDarkMode ? 'text-purple-300' : 'text-purple-700'
                                }`}>
                                  {formatMoneyDisplay(totals.costoAlimentos)}
                                </span>
                              </div>
                            )}
                            
                            {/* Total Embalaje */}
                            {totals.costoEmbalaje > 0 && (
                              <div className="flex justify-between items-center">
                                <span className={`text-[10px] font-semibold ${
                                  isDarkMode ? 'text-green-400' : 'text-green-600'
                                }`}>
                                  📦 Total Insumos/Embalaje:
                                </span>
                                <span className={`text-xs font-bold ${
                                  isDarkMode ? 'text-green-300' : 'text-green-700'
                                }`}>
                                  {formatMoneyDisplay(totals.costoEmbalaje)}
                                </span>
                              </div>
                            )}
                            
                            {/* Separador */}
                            <div className={`border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} my-1`}></div>
                            
                            {/* Total General */}
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-semibold ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                💰 Total Costo (CT):
                              </span>
                              <span className={`text-xs font-bold ${
                                isDarkMode ? 'text-blue-400' : 'text-blue-600'
                              }`}>
                                {formatMoneyDisplay(calculatedTotals.totalCost)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* PRECIOS Y AHORROS */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Columna Izquierda */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-semibold ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                💵 PVP Regular:
                              </span>
                              <span className={`text-xs font-bold ${
                                isDarkMode ? 'text-green-400' : 'text-green-600'
                              }`}>
                                {formatMoneyDisplay(calculatedTotals.totalRegularPrice)}
                              </span>
                            </div>
                          </div>

                          {/* Columna Derecha */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-semibold ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                🎁 Descuento ($):
                              </span>
                              <span className={`text-xs font-bold ${
                                calculatedTotals.ahorro > 0
                                  ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                                  : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {formatMoneyDisplay(calculatedTotals.ahorro)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={`text-[10px] font-semibold ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                📊 Ahorro (%):
                              </span>
                              <span className={`text-xs font-bold ${
                                calculatedTotals.descuentoPct > 0
                                  ? isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                                  : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {calculatedTotals.descuentoPct.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={modalLoading}
                className={`flex-1 px-6 py-2.5 rounded-lg transition-colors font-medium ${
                  modalLoading
                    ? 'bg-gray-500 cursor-not-allowed opacity-50'
                    : isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={modalLoading}
                className={`flex-1 px-6 py-2.5 rounded-lg transition-colors font-medium ${
                  modalLoading
                    ? 'bg-blue-400 cursor-not-allowed opacity-50'
                    : 'bg-primary-blue hover:bg-blue-700'
                } text-white`}
              >
                {modalLoading ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Combo'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Categorías */}
      {showCategoryModal && (
        <Modal onClose={() => setShowCategoryModal(false)}>
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-[#1f2937]' : 'bg-white'}`}>
            <h2 className="text-2xl font-bold mb-4">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Nombre de la categoría"
              className={`w-full px-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCategoryModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCategory}
                className="flex-1 bg-primary-blue hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
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
