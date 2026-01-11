import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle, DollarSign, TrendingDown, Info } from 'lucide-react'
import { getProducts, getRecipes, getPromotions, getConfig } from '@/utils/storage'
import { useI18n } from '@/context/I18nContext'
import { formatMoneyDisplay } from '@/utils/formatters'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement)

export default function Dashboard() {
  const { t, isDarkMode } = useI18n()
  const [products, setProducts] = useState([])
  const [recipes, setRecipes] = useState([])
  const [promotions, setPromotions] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [productsData, recipesData, promotionsData, configData] = await Promise.all([
        getProducts(),
        getRecipes(),
        getPromotions(),
        getConfig()
      ])
      setProducts(Array.isArray(productsData) ? productsData : [])
      setRecipes(Array.isArray(recipesData) ? recipesData : [])
      setPromotions(Array.isArray(promotionsData) ? promotionsData : [])
      setConfig(configData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setProducts([])
      setRecipes([])
      setPromotions([])
    } finally {
      setLoading(false)
    }
  }

  if (loading || !config) {
    return (
      <div className={`p-4 md:p-6 flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-[#111827]'}`}>
        <p className="text-lg">Cargando...</p>
      </div>
    )
  }

  // ========== CÁLCULOS DE MÉTRICAS ==========
  
  // Combinar productos, recetas y promociones para análisis unificado
  const allItems = [
    ...products.map(p => ({
      ...p,
      type: 'product',
      cost: Number(p.totalCost ?? p.realCost ?? p.costoUnidad ?? 0),
      price: Number(p.realSalePrice ?? p.salePrice ?? 0),
      marginPercent: Number(p.pContribucion ?? 0), // % de margen guardado en Firebase
      contributionAmount: Number(p.mContribucion ?? 0) // $ de contribución guardado
    })),
    ...recipes.map(r => ({
      ...r,
      type: 'recipe',
      cost: Number(r.totalCost ?? r.costoUnidad ?? 0),
      price: Number(r.realSalePrice ?? r.salePrice ?? 0),
      marginPercent: Number(r.pContribucion ?? 0),
      contributionAmount: Number(r.mContribucion ?? 0)
    })),
    ...promotions.map(p => ({
      ...p,
      type: 'promotion',
      cost: Number(p.totalCosto ?? p.costoUnidad ?? 0),
      price: Number(p.promoPrice ?? 0),
      marginPercent: Number(p.pContribucion ?? 0),
      contributionAmount: Number(p.mContribucion ?? 0)
    }))
  ]

  // Filtrar ítems con datos completos
  const itemsWithMargin = allItems.filter(item => {
    const hasPrice = item.price > 0
    const hasCost = item.cost >= 0
    return hasPrice && hasCost
  }).map(item => {
    // Usar el marginPercent guardado en Firebase o calcularlo si no existe
    let marginPercent = item.marginPercent
    let contributionAmount = item.contributionAmount
    
    if (marginPercent === 0 && item.price > 0) {
      contributionAmount = item.price - item.cost
      marginPercent = (contributionAmount / item.price) * 100
    }
    
    return {
      ...item,
      contributionMargin: contributionAmount,
      contributionMarginPercent: marginPercent
    }
  })

  // Margen Promedio del Menú (usando datos reales de Firebase)
  const avgMenuMargin = itemsWithMargin.length > 0
    ? itemsWithMargin.reduce((sum, item) => sum + item.contributionMarginPercent, 0) / itemsWithMargin.length
    : 0

  console.log('📊 [Dashboard] Métricas Calculadas:', {
    totalItems: itemsWithMargin.length,
    margenPromedio: avgMenuMargin.toFixed(2) + '%',
    itemsConMargen: itemsWithMargin.map(i => ({
      nombre: i.name,
      tipo: i.type,
      margen: i.contributionMarginPercent.toFixed(1) + '%'
    }))
  })

  // Ticket Promedio Estimado (precio promedio)
  const avgTicket = itemsWithMargin.length > 0
    ? itemsWithMargin.reduce((sum, item) => sum + item.price, 0) / itemsWithMargin.length
    : 0

  // Costos Fijos Totales desde Config (datos reales del usuario)
  const totalFixedCosts = (config.rentCost || 0) + (config.utilitiesCost || 0) + (config.payrollCost || 0) + (config.otherFixedCosts || 0)

  console.log('💼 [Dashboard] Costos Fijos:', {
    arriendo: config.rentCost || 0,
    servicios: config.utilitiesCost || 0,
    nomina: config.payrollCost || 0,
    otros: config.otherFixedCosts || 0,
    total: totalFixedCosts
  })

  // Margen de Contribución Promedio por Ítem (en dinero)
  const avgContributionMargin = itemsWithMargin.length > 0
    ? itemsWithMargin.reduce((sum, item) => sum + item.contributionMargin, 0) / itemsWithMargin.length
    : 0

  // Punto de Equilibrio usando fórmula: Ventas Necesarias = Gastos Fijos / (Margen Promedio % / 100)
  const avgMarginDecimal = avgMenuMargin / 100
  const breakEvenSales = avgMarginDecimal > 0 
    ? totalFixedCosts / avgMarginDecimal
    : 0

  console.log('🎯 [Dashboard] Punto de Equilibrio:', {
    gastosFijos: totalFixedCosts,
    margenPromedioDecimal: avgMarginDecimal.toFixed(4),
    ventasNecesarias: breakEvenSales.toFixed(2),
    formula: `${totalFixedCosts} / ${avgMarginDecimal.toFixed(4)} = ${breakEvenSales.toFixed(2)}`
  })

  // Unidades necesarias para punto de equilibrio
  const breakEvenUnits = avgTicket > 0
    ? Math.ceil(breakEvenSales / avgTicket)
    : 0

  // Ítems con margen bajo (< 30%)
  const lowMarginProducts = itemsWithMargin.filter(item => item.contributionMarginPercent < 30)

  // ========== TERMÓMETRO DE RENTABILIDAD ==========
  // Food Cost Ideal: Costo base de ingredientes sin merma (asumiendo 0% merma)
  // Food Cost Real: Costo con merma incluida (el que realmente pagamos)
  
  const totalIdealCost = itemsWithMargin.reduce((sum, item) => {
    // Costo ideal sin merma (dividimos el costo real entre 1.30 para quitar el 30% de merma)
    const idealCost = item.cost / 1.30 // Asumiendo 30% merma promedio
    return sum + idealCost
  }, 0)

  const totalRealCost = itemsWithMargin.reduce((sum, item) => sum + item.cost, 0)
  const totalRevenue = itemsWithMargin.reduce((sum, item) => sum + item.price, 0)

  const foodCostIdealPercent = totalRevenue > 0 ? (totalIdealCost / totalRevenue) * 100 : 0
  const foodCostRealPercent = totalRevenue > 0 ? (totalRealCost / totalRevenue) * 100 : 0
  const wastageImpact = foodCostRealPercent - foodCostIdealPercent

  // Clasificación de ítems por rentabilidad (Ingeniería de Menú) - DATOS DINÁMICOS
  const productsByProfitability = {
    stars: itemsWithMargin.filter(item => item.contributionMarginPercent >= 50), // Estrellas
    plowhorses: itemsWithMargin.filter(item => item.contributionMarginPercent >= 30 && item.contributionMarginPercent < 50), // Caballos
    puzzles: itemsWithMargin.filter(item => item.contributionMarginPercent >= 20 && item.contributionMarginPercent < 30), // Enigmas
    dogs: itemsWithMargin.filter(item => item.contributionMarginPercent < 20) // Perros
  }

  console.log('⭐ [Dashboard] Ingeniería de Menú:', {
    estrellas: productsByProfitability.stars.length,
    caballos: productsByProfitability.plowhorses.length,
    enigmas: productsByProfitability.puzzles.length,
    perros: productsByProfitability.dogs.length,
    detalleEstrellas: productsByProfitability.stars.map(i => `${i.name}: ${i.contributionMarginPercent.toFixed(1)}%`),
    detalleCaballos: productsByProfitability.plowhorses.map(i => `${i.name}: ${i.contributionMarginPercent.toFixed(1)}%`),
    detalleEnigmas: productsByProfitability.puzzles.map(i => `${i.name}: ${i.contributionMarginPercent.toFixed(1)}%`),
    detallePerros: productsByProfitability.dogs.map(i => `${i.name}: ${i.contributionMarginPercent.toFixed(1)}%`)
  })

  // Datos para gráfico de barras (Top 10 por margen %) - DINÁMICO
  const top10ByMargin = [...itemsWithMargin]
    .sort((a, b) => b.contributionMarginPercent - a.contributionMarginPercent)
    .slice(0, 10)

  const barChartData = {
    labels: top10ByMargin.map(item => {
      const prefix = item.type === 'product' ? '📦' : item.type === 'recipe' ? '🍽️' : '🎁'
      return `${prefix} ${(item.name || 'Sin nombre').substring(0, 18)}`
    }),
    datasets: [{
      label: 'Margen de Contribución (%)',
      data: top10ByMargin.map(item => item.contributionMarginPercent),
      backgroundColor: top10ByMargin.map(item => {
        if (item.contributionMarginPercent >= 50) return 'rgba(34, 197, 94, 0.8)' // Verde
        if (item.contributionMarginPercent >= 30) return 'rgba(59, 130, 246, 0.8)' // Azul
        if (item.contributionMarginPercent >= 20) return 'rgba(251, 191, 36, 0.8)' // Amarillo
        return 'rgba(239, 68, 68, 0.8)' // Rojo
      }),
      borderColor: top10ByMargin.map(item => {
        if (item.contributionMarginPercent >= 50) return 'rgb(34, 197, 94)'
        if (item.contributionMarginPercent >= 30) return 'rgb(59, 130, 246)'
        if (item.contributionMarginPercent >= 20) return 'rgb(251, 191, 36)'
        return 'rgb(239, 68, 68)'
      }),
      borderWidth: 2
    }]
  }

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Top 10 Ítems por Rentabilidad (Productos, Recetas y Promociones)',
        color: isDarkMode ? '#fff' : '#111827',
        font: { size: 16, weight: 'bold' }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => value + '%',
          color: isDarkMode ? '#9ca3af' : '#6b7280'
        },
        grid: {
          color: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.3)'
        }
      },
      x: {
        ticks: {
          color: isDarkMode ? '#9ca3af' : '#6b7280'
        },
        grid: {
          display: false
        }
      }
    }
  }

  // Datos para gráfico de dona (Distribución por categoría)
  const doughnutData = {
    labels: ['Máxima Rentabilidad (≥50%)', 'Populares de Bajo Margen (30-50%)', 'Potenciales Rentables (20-30%)', 'Baja Prioridad (<20%)'],
    datasets: [{
      data: [
        productsByProfitability.stars.length,
        productsByProfitability.plowhorses.length,
        productsByProfitability.puzzles.length,
        productsByProfitability.dogs.length
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(59, 130, 246)',
        'rgb(251, 191, 36)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 2
    }]
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          padding: 15,
          font: { size: 12 }
        }
      },
      title: {
        display: true,
        text: 'Ingeniería de Menú',
        color: isDarkMode ? '#fff' : '#111827',
        font: { size: 16, weight: 'bold' }
      }
    }
  }

  return (
    <div className={`p-4 md:p-6 space-y-6 transition-colors duration-300 ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-[#111827]'}`}>
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">📊 Inteligencia de Negocios Gastronómicos</h2>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Panel de control estratégico y análisis de rentabilidad</p>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard 
          title="Margen Promedio del Menú"
          value={`${avgMenuMargin.toFixed(1)}%`}
          icon={<TrendingUp size={24} />}
          color={avgMenuMargin >= 40 ? "success" : avgMenuMargin >= 30 ? "warning" : "danger"}
          isDarkMode={isDarkMode}
        />
        <KPICard 
          title="Ticket Promedio Estimado"
          value={formatMoneyDisplay(avgTicket)}
          icon={<DollarSign size={24} />}
          color="primary"
          isDarkMode={isDarkMode}
        />
        <KPICard 
          title="Ventas para Punto de Equilibrio"
          value={formatMoneyDisplay(breakEvenSales)}
          subtitle={`${breakEvenUnits} unidades/mes`}
          icon={<TrendingDown size={24} />}
          color="info"
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Termómetro de Rentabilidad */}
      <div className={`rounded-lg p-6 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🌡️ Termómetro de Rentabilidad
          <span className={`text-sm font-normal ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            (Food Cost Real vs Ideal)
          </span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300'}`}>
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
              💚 Food Cost Ideal (sin merma)
            </p>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              {foodCostIdealPercent.toFixed(1)}%
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-green-400/70' : 'text-green-600/70'}`}>
              Costo teórico de insumos
            </p>
          </div>

          <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-300'}`}>
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
              🔶 Food Cost Real (con merma)
            </p>
            <p className={`text-3xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
              {foodCostRealPercent.toFixed(1)}%
            </p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-orange-400/70' : 'text-orange-600/70'}`}>
              Costo real con desperdicio
            </p>
          </div>

          <div className={`p-4 rounded-lg border ${
            wastageImpact >= 10 
              ? isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-300'
              : isDarkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-300'
          }`}>
            <p className={`text-sm font-medium mb-2 ${
              wastageImpact >= 10
                ? isDarkMode ? 'text-red-300' : 'text-red-700'
                : isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
            }`}>
              ⚠️ Impacto de Merma
            </p>
            <p className={`text-3xl font-bold ${
              wastageImpact >= 10
                ? isDarkMode ? 'text-red-400' : 'text-red-600'
                : isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
            }`}>
              +{wastageImpact.toFixed(1)}%
            </p>
            <p className={`text-xs mt-1 ${
              wastageImpact >= 10
                ? isDarkMode ? 'text-red-400/70' : 'text-red-600/70'
                : isDarkMode ? 'text-yellow-400/70' : 'text-yellow-600/70'
            }`}>
              Pérdida por desperdicio
            </p>
          </div>
        </div>

        {/* Barra de progreso visual */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Food Cost Ideal</span>
              <span className={`text-sm font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                {foodCostIdealPercent.toFixed(1)}%
              </span>
            </div>
            <div className={`w-full h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                style={{ width: `${Math.min(foodCostIdealPercent, 100)}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Food Cost Real</span>
              <span className={`text-sm font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                {foodCostRealPercent.toFixed(1)}%
              </span>
            </div>
            <div className={`w-full h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
                style={{ width: `${Math.min(foodCostRealPercent, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className={`mt-4 p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            💡 <strong>Interpretación:</strong> La diferencia de {wastageImpact.toFixed(1)}% representa el costo adicional debido a merma y desperdicios. 
            {wastageImpact >= 10 
              ? ' 🚨 Nivel crítico: Considera revisar prácticas de almacenamiento y preparación.'
              : ' ✅ Nivel controlado: Continúa monitoreando tus procesos.'}
          </p>
        </div>
      </div>

      {/* Costos Fijos y Punto de Equilibrio */}
      <div className={`rounded-lg p-6 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">💼 Costos Fijos Mensuales</h3>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate-to-settings')) }}
            className={`text-sm px-3 py-1 rounded-full ${isDarkMode ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} transition-colors`}
          >
            ⚙️ Editar en Configuración
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>🏢 Arriendo</p>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatMoneyDisplay(config.rentCost || 0)}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>⚡ Servicios</p>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatMoneyDisplay(config.utilitiesCost || 0)}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white'}`}>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>👥 Nómina</p>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {formatMoneyDisplay(config.payrollCost || 0)}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-purple-900/30 border border-purple-700' : 'bg-purple-50 border border-purple-300'}`}>
            <p className={`text-xs font-semibold ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>💼 TOTAL</p>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
              {formatMoneyDisplay(totalFixedCosts)}
            </p>
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            💡 <strong>Punto de Equilibrio:</strong> Con un margen promedio de {avgMenuMargin.toFixed(1)}%, necesitas generar ventas por <strong>{formatMoneyDisplay(breakEvenSales)}</strong> mensuales 
            (aproximadamente <strong>{formatMoneyDisplay(breakEvenSales / 30)}/día</strong>) para cubrir tus gastos fijos de {formatMoneyDisplay(totalFixedCosts)}.
            {breakEvenUnits > 0 && (
              <span> Esto equivale a vender aproximadamente <strong>{breakEvenUnits} unidades al mes</strong> o <strong>{Math.ceil(breakEvenUnits / 30)} unidades/día</strong>.</span>
            )}
          </p>
        </div>
      </div>

      {/* Meta de Punto de Equilibrio */}
      {(() => {
        // Ventas estimadas actuales desde config
        const currentEstimatedSales = config.estimatedMonthlySales || 0
        
        // Margen objetivo desde configuración
        const targetMargin = config.targetProfitMargin || 30
        const targetMarginDecimal = targetMargin / 100
        
        // Déficit de ventas (Punto de Equilibrio - Ventas Actuales)
        const salesDeficit = Math.max(0, breakEvenSales - currentEstimatedSales)
        
        // Meta diaria REAL basada en necesidad de cobertura de costos
        // Fórmula: (Gastos Fijos / Margen Objetivo) / Días del Mes
        const dailyTargetReal = targetMarginDecimal > 0 ? (totalFixedCosts / targetMarginDecimal) / 30 : 0
        
        // % actual de gastos sobre ventas
        const currentCostPercent = currentEstimatedSales > 0 ? (totalFixedCosts / currentEstimatedSales) * 100 : 0
        
        // % de margen sobre ventas actuales
        const currentMarginPercent = currentEstimatedSales > 0 
          ? ((currentEstimatedSales - totalFixedCosts) / currentEstimatedSales) * 100 
          : 0
        
        console.log('🎯 [Dashboard] Punto de Equilibrio vs Ventas:', {
          gastosFijos: totalFixedCosts,
          margenPromedio: avgMenuMargin.toFixed(2) + '%',
          margenObjetivo: targetMargin.toFixed(2) + '%',
          puntoEquilibrio: breakEvenSales,
          ventasEstimadasActuales: currentEstimatedSales,
          deficit: salesDeficit,
          metaDiariaReal: dailyTargetReal,
          porcentajeCostoActual: currentCostPercent.toFixed(2) + '%',
          formula: `PE = ${totalFixedCosts} / (${avgMenuMargin.toFixed(2)}% / 100) = ${breakEvenSales.toFixed(2)}`,
          formulaMetaDiaria: `(${totalFixedCosts} / ${targetMargin.toFixed(2)}%) / 30 = ${dailyTargetReal.toFixed(2)}`
        })
        
        // Solo mostrar si hay déficit
        const hasDeficit = salesDeficit > 0 && currentEstimatedSales > 0
        const hasReachedBreakEven = currentEstimatedSales >= breakEvenSales
        
        return (
          <div className={`rounded-lg p-6 border ${
            hasDeficit
              ? isDarkMode ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-300'
              : isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${
                  hasDeficit
                    ? isDarkMode ? 'bg-orange-700' : 'bg-orange-500'
                    : isDarkMode ? 'bg-green-700' : 'bg-green-500'
                }`}>
                  <TrendingUp className="text-white" size={24} />
                </div>
                <div>
                  <h3 className={`text-xl font-semibold ${
                    hasDeficit
                      ? isDarkMode ? 'text-orange-300' : 'text-orange-700'
                      : isDarkMode ? 'text-green-300' : 'text-green-700'
                  }`}>
                    🎯 Meta de Punto de Equilibrio
                  </h3>
                  <p className={`text-sm ${
                    hasDeficit
                      ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                      : isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    Objetivo: Cubrir gastos fijos ({formatMoneyDisplay(totalFixedCosts)}) con margen promedio de {avgMenuMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
              {currentEstimatedSales > 0 && (
                <div className={`px-4 py-2 rounded-full text-center ${
                  hasReachedBreakEven
                    ? isDarkMode ? 'bg-green-900/50 border-2 border-green-600' : 'bg-green-100 border-2 border-green-400'
                    : isDarkMode ? 'bg-orange-900/50 border-2 border-orange-600' : 'bg-orange-100 border-2 border-orange-400'
                }`}>
                  <p className={`text-xs font-medium ${
                    hasReachedBreakEven
                      ? isDarkMode ? 'text-green-400' : 'text-green-600'
                      : isDarkMode ? 'text-orange-400' : 'text-orange-600'
                  }`}>
                    Estado
                  </p>
                  <p className={`text-2xl font-black ${
                    hasReachedBreakEven
                      ? isDarkMode ? 'text-green-400' : 'text-green-600'
                      : isDarkMode ? 'text-orange-400 animate-pulse' : 'text-orange-600 animate-pulse'
                  }`}>
                    {hasReachedBreakEven ? '✅' : '⚠️'}
                  </p>
                </div>
              )}
            </div>

            {currentEstimatedSales === 0 ? (
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  ⚠️ <strong>Configura tus Ventas Estimadas</strong> en la sección de Configuración para ver si has alcanzado el punto de equilibrio.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white border border-gray-200'}`}>
                    <p className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>💼 Gastos Fijos Totales</p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {formatMoneyDisplay(totalFixedCosts)}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    avgMenuMargin >= targetMargin
                      ? isDarkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-300'
                      : isDarkMode ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className={`text-xs ${
                        avgMenuMargin >= targetMargin
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-red-400' : 'text-red-600'
                      }`}>📊 Margen Promedio Real</p>
                      <div className="group relative inline-block">
                        <Info size={14} className={`cursor-help ${
                          avgMenuMargin >= targetMargin
                            ? isDarkMode ? 'text-green-400' : 'text-green-600'
                            : isDarkMode ? 'text-red-400' : 'text-red-600'
                        }`} />
                        <div className={`invisible group-hover:visible absolute z-50 left-0 top-5 w-64 p-3 rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-300 text-gray-800'}`}>
                          <p className="text-xs font-semibold mb-1">¿Qué es?</p>
                          <p className="text-xs mb-2">Promedio del margen de contribución (%) de todos tus productos y recetas.</p>
                          <p className="text-xs font-semibold mb-1">Fórmula:</p>
                          <p className="text-xs mb-2">Suma de todos los márgenes ÷ Total de items</p>
                          <p className="text-xs font-semibold mb-1">Meta:</p>
                          <p className="text-xs">≥ {targetMargin.toFixed(1)}% (configurable en Ajustes)</p>
                        </div>
                      </div>
                    </div>
                    <p className={`text-2xl font-bold ${
                      avgMenuMargin >= targetMargin
                        ? isDarkMode ? 'text-green-300' : 'text-green-700'
                        : isDarkMode ? 'text-red-300' : 'text-red-700'
                    }`}>
                      {avgMenuMargin.toFixed(1)}%
                    </p>
                    <p className={`text-xs mt-1 ${
                      avgMenuMargin >= targetMargin
                        ? isDarkMode ? 'text-green-400/70' : 'text-green-600/70'
                        : isDarkMode ? 'text-red-400/70' : 'text-red-600/70'
                    }`}>
                      Meta: {targetMargin.toFixed(1)}% {avgMenuMargin >= targetMargin ? '✅' : '⚠️'}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-purple-900/30 border border-purple-700' : 'bg-purple-50 border border-purple-300'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className={`text-xs ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>🎯 Punto de Equilibrio (PE)</p>
                      <div className="group relative inline-block">
                        <Info size={14} className={`cursor-help ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                        <div className={`invisible group-hover:visible absolute z-50 left-0 top-5 w-64 p-3 rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-300 text-gray-800'}`}>
                          <p className="text-xs font-semibold mb-1">¿Qué es?</p>
                          <p className="text-xs mb-2">Ventas mínimas necesarias para cubrir todos los gastos fijos del negocio.</p>
                          <p className="text-xs font-semibold mb-1">Fórmula:</p>
                          <p className="text-xs">PE = Gastos Fijos ÷ (Margen Promedio / 100)</p>
                        </div>
                      </div>
                    </div>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                      {formatMoneyDisplay(breakEvenSales)}
                    </p>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-purple-400/70' : 'text-purple-600/70'}`}>
                      Fórmula: {formatMoneyDisplay(totalFixedCosts)} ÷ {avgMenuMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {hasDeficit ? (
                  <>
                    <div className={`p-5 rounded-lg mb-4 ${isDarkMode ? 'bg-orange-900/40 border-2 border-orange-600' : 'bg-orange-100 border-2 border-orange-400'}`}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`flex-shrink-0 mt-1 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} size={28} />
                        <div className="flex-1">
                          <p className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                            📈 Para alcanzar el punto de equilibrio:
                          </p>
                          <p className={`text-3xl font-black mb-3 ${isDarkMode ? 'text-orange-200' : 'text-orange-800'}`}>
                            Necesitas vender {formatMoneyDisplay(salesDeficit)} adicionales al mes
                          </p>
                          <div className={`inline-block px-4 py-2 rounded-lg ${isDarkMode ? 'bg-orange-700' : 'bg-orange-500'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-white text-sm font-medium">⏰ Meta Diaria Real</p>
                              <div className="group relative inline-block">
                                <Info size={14} className="text-white cursor-help" />
                                <div className={`invisible group-hover:visible absolute z-50 left-0 top-5 w-72 p-3 rounded-lg shadow-xl ${isDarkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-300 text-gray-800'}`}>
                                  <p className="text-xs font-semibold mb-1">¿Qué es?</p>
                                  <p className="text-xs mb-2">Ventas diarias necesarias para cubrir gastos fijos basado en tu margen objetivo.</p>
                                  <p className="text-xs font-semibold mb-1">Fórmula:</p>
                                  <p className="text-xs">Meta Diaria = (Gastos Fijos ÷ Margen Objetivo) ÷ 30 días</p>
                                  <p className="text-xs mt-2">Ejemplo: ({formatMoneyDisplay(totalFixedCosts)} ÷ {targetMargin.toFixed(1)}%) ÷ 30 = {formatMoneyDisplay(dailyTargetReal)}</p>
                                </div>
                              </div>
                            </div>
                            <p className="text-white text-2xl font-black">
                              {formatMoneyDisplay(dailyTargetReal)} / día
                            </p>
                            <p className="text-white/80 text-xs mt-1">
                              Basado en margen objetivo {targetMargin.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progreso */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Progreso hacia punto de equilibrio
                        </span>
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                          {((currentEstimatedSales / breakEvenSales) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className={`w-full h-4 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div 
                          className={`h-full transition-all duration-500 ${
                            (currentEstimatedSales / breakEvenSales) * 100 < 50
                              ? 'bg-gradient-to-r from-red-500 to-red-600'
                              : (currentEstimatedSales / breakEvenSales) * 100 < 80
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                              : 'bg-gradient-to-r from-green-500 to-green-600'
                          }`}
                          style={{ width: `${Math.min((currentEstimatedSales / breakEvenSales) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={`p-5 rounded-lg ${isDarkMode ? 'bg-green-900/40 border-2 border-green-600' : 'bg-green-100 border-2 border-green-400'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isDarkMode ? 'bg-green-700' : 'bg-green-500'}`}>
                        <TrendingUp className="text-white" size={24} />
                      </div>
                      <div>
                        <p className={`text-xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                          ✅ ¡Excelente! Ya alcanzaste el punto de equilibrio
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                          Tus ventas estimadas de {formatMoneyDisplay(currentEstimatedSales)} superan el punto de equilibrio de {formatMoneyDisplay(breakEvenSales)}. 
                          El excedente de {formatMoneyDisplay(currentEstimatedSales - breakEvenSales)} representa tu utilidad potencial.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras */}
        <div className={`rounded-lg p-6 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div style={{ height: '350px' }}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Gráfico de Dona */}
        <div className={`rounded-lg p-6 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div style={{ height: '350px' }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Sección de Alertas */}
      {lowMarginProducts.length > 0 && (
        <div className={`rounded-lg p-6 border ${isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className={`flex-shrink-0 mt-0.5 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`} size={24} />
            <div>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
                ⚠️ Ítems con Margen Crítico (Menos del 30%)
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                {lowMarginProducts.length} ítems requieren atención urgente debido a baja rentabilidad
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lowMarginProducts.map((item, idx) => (
              <div 
                key={item.id || idx} 
                className={`p-3 rounded-lg flex items-center justify-between ${
                  isDarkMode ? 'bg-red-900/30' : 'bg-red-100'
                }`}
              >
                <div className="flex-1">
                  <p className={`font-medium ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>
                    {item.type === 'product' ? '📦' : item.type === 'recipe' ? '🍽️' : '🎁'} {item.name}
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    Costo: {formatMoneyDisplay(item.cost)} | Precio: {formatMoneyDisplay(item.price)}
                  </p>
                </div>
                <div className={`text-right px-3 py-1 rounded-lg font-bold ${
                  item.contributionMarginPercent < 20 
                    ? isDarkMode ? 'bg-red-700 text-red-100' : 'bg-red-600 text-white'
                    : isDarkMode ? 'bg-orange-700 text-orange-100' : 'bg-orange-500 text-white'
                }`}>
                  {item.contributionMarginPercent.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen de Clasificación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CategoryCard
          title="⭐ Máxima Rentabilidad"
          count={productsByProfitability.stars.length}
          description="Margen ≥ 50%"
          color="green"
          isDarkMode={isDarkMode}
        />
        <CategoryCard
          title="🐴 Populares de Bajo Margen"
          count={productsByProfitability.plowhorses.length}
          description="Margen 30-50%"
          color="blue"
          isDarkMode={isDarkMode}
        />
        <CategoryCard
          title="🧩 Potenciales Rentables"
          count={productsByProfitability.puzzles.length}
          description="Margen 20-30%"
          color="yellow"
          isDarkMode={isDarkMode}
        />
        <CategoryCard
          title="🐕 Baja Prioridad"
          count={productsByProfitability.dogs.length}
          description="Margen < 20%"
          color="red"
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  )
}

function KPICard({ title, value, subtitle, icon, color, isDarkMode }) {
  const colorClasses = {
    success: isDarkMode ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-green-50 border-green-300 text-green-700',
    warning: isDarkMode ? 'bg-yellow-900/30 border-yellow-700 text-yellow-400' : 'bg-yellow-50 border-yellow-300 text-yellow-700',
    danger: isDarkMode ? 'bg-red-900/30 border-red-700 text-red-400' : 'bg-red-50 border-red-300 text-red-700',
    primary: isDarkMode ? 'bg-blue-900/30 border-blue-700 text-blue-400' : 'bg-blue-50 border-blue-300 text-blue-700',
    info: isDarkMode ? 'bg-purple-900/30 border-purple-700 text-purple-400' : 'bg-purple-50 border-purple-300 text-purple-700'
  }

  return (
    <div className={`rounded-lg p-5 border ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
        {icon}
      </div>
      <p className="text-3xl font-bold mb-1">{value}</p>
      {subtitle && (
        <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{subtitle}</p>
      )}
    </div>
  )
}

function CategoryCard({ title, count, description, color, isDarkMode }) {
  const colorClasses = {
    green: isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300',
    blue: isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-300',
    yellow: isDarkMode ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-300',
    red: isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-300'
  }

  const textColorClasses = {
    green: isDarkMode ? 'text-green-400' : 'text-green-700',
    blue: isDarkMode ? 'text-blue-400' : 'text-blue-700',
    yellow: isDarkMode ? 'text-yellow-400' : 'text-yellow-700',
    red: isDarkMode ? 'text-red-400' : 'text-red-700'
  }

  return (
    <div className={`rounded-lg p-4 border ${colorClasses[color]}`}>
      <h4 className={`font-semibold mb-2 ${textColorClasses[color]}`}>{title}</h4>
      <p className={`text-3xl font-bold mb-1 ${textColorClasses[color]}`}>{count}</p>
      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>{description}</p>
    </div>
  )
}
