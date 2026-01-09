import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle, DollarSign, TrendingDown } from 'lucide-react'
import { getProducts, getConfig } from '@/utils/storage'
import { useI18n } from '@/context/I18nContext'
import { formatMoneyDisplay } from '@/utils/formatters'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement)

export default function Dashboard() {
  const { t, isDarkMode } = useI18n()
  const [products, setProducts] = useState([])
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [productsData, configData] = await Promise.all([
        getProducts(),
        getConfig()
      ])
      setProducts(Array.isArray(productsData) ? productsData : [])
      setConfig(configData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setProducts([])
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
  
  // Productos con datos completos de margen
  const productsWithMargin = products.filter(p => {
    const cost = (p.totalCost ?? p.realCost) || 0
    const price = (p.realSalePrice || p.salePrice) || 0
    return price > 0 && cost > 0
  }).map(p => {
    const cost = (p.totalCost ?? p.realCost) || 0
    const price = (p.realSalePrice || p.salePrice) || 0
    const contributionMargin = price - cost
    const contributionMarginPercent = (contributionMargin / price) * 100
    
    return {
      ...p,
      cost,
      price,
      contributionMargin,
      contributionMarginPercent
    }
  })

  // Margen Promedio del Menú
  const avgMenuMargin = productsWithMargin.length > 0
    ? productsWithMargin.reduce((sum, p) => sum + p.contributionMarginPercent, 0) / productsWithMargin.length
    : 0

  // Ticket Promedio Estimado (precio promedio)
  const avgTicket = productsWithMargin.length > 0
    ? productsWithMargin.reduce((sum, p) => sum + p.price, 0) / productsWithMargin.length
    : 0

  // Costos Fijos Totales desde Config
  const totalFixedCosts = (config.rentCost || 0) + (config.utilitiesCost || 0) + (config.payrollCost || 0) + (config.otherFixedCosts || 0)

  // Margen de Contribución Promedio por Producto
  const avgContributionMargin = productsWithMargin.length > 0
    ? productsWithMargin.reduce((sum, p) => sum + p.contributionMargin, 0) / productsWithMargin.length
    : 0

  // Punto de Equilibrio (en unidades)
  const breakEvenUnits = avgContributionMargin > 0
    ? Math.ceil(totalFixedCosts / avgContributionMargin)
    : 0

  // Ventas Necesarias para Punto de Equilibrio (en dinero)
  const breakEvenSales = breakEvenUnits * avgTicket

  // Productos con margen bajo (< 30%)
  const lowMarginProducts = productsWithMargin.filter(p => p.contributionMarginPercent < 30)

  // ========== TERMÓMETRO DE RENTABILIDAD ==========
  // Food Cost Ideal: Costo base de ingredientes sin merma (asumiendo 0% merma)
  // Food Cost Real: Costo con merma incluida (el que realmente pagamos)
  
  const totalIdealCost = productsWithMargin.reduce((sum, p) => {
    // Costo ideal sin merma (dividimos el costo real entre 1.30 para quitar el 30% de merma)
    const idealCost = p.cost / 1.30 // Asumiendo 30% merma promedio
    return sum + idealCost
  }, 0)

  const totalRealCost = productsWithMargin.reduce((sum, p) => sum + p.cost, 0)
  const totalRevenue = productsWithMargin.reduce((sum, p) => sum + p.price, 0)

  const foodCostIdealPercent = totalRevenue > 0 ? (totalIdealCost / totalRevenue) * 100 : 0
  const foodCostRealPercent = totalRevenue > 0 ? (totalRealCost / totalRevenue) * 100 : 0
  const wastageImpact = foodCostRealPercent - foodCostIdealPercent

  // Clasificación de productos por rentabilidad (Ingeniería de Menú)
  const productsByProfitability = {
    stars: productsWithMargin.filter(p => p.contributionMarginPercent >= 50), // Estrellas
    plowhorses: productsWithMargin.filter(p => p.contributionMarginPercent >= 30 && p.contributionMarginPercent < 50), // Caballos de batalla
    puzzles: productsWithMargin.filter(p => p.contributionMarginPercent >= 20 && p.contributionMarginPercent < 30), // Enigmas
    dogs: productsWithMargin.filter(p => p.contributionMarginPercent < 20) // Perros
  }

  // Datos para gráfico de barras (Top 10 productos por margen %)
  const top10ByMargin = [...productsWithMargin]
    .sort((a, b) => b.contributionMarginPercent - a.contributionMarginPercent)
    .slice(0, 10)

  const barChartData = {
    labels: top10ByMargin.map(p => p.name?.substring(0, 20) || 'Sin nombre'),
    datasets: [{
      label: 'Margen de Contribución (%)',
      data: top10ByMargin.map(p => p.contributionMarginPercent),
      backgroundColor: top10ByMargin.map(p => {
        if (p.contributionMarginPercent >= 50) return 'rgba(34, 197, 94, 0.8)' // Verde
        if (p.contributionMarginPercent >= 30) return 'rgba(59, 130, 246, 0.8)' // Azul
        if (p.contributionMarginPercent >= 20) return 'rgba(251, 191, 36, 0.8)' // Amarillo
        return 'rgba(239, 68, 68, 0.8)' // Rojo
      }),
      borderColor: top10ByMargin.map(p => {
        if (p.contributionMarginPercent >= 50) return 'rgb(34, 197, 94)'
        if (p.contributionMarginPercent >= 30) return 'rgb(59, 130, 246)'
        if (p.contributionMarginPercent >= 20) return 'rgb(251, 191, 36)'
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
        text: 'Top 10 Productos por Rentabilidad',
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
    labels: ['Estrellas (≥50%)', 'Caballos (30-50%)', 'Enigmas (20-30%)', 'Perros (<20%)'],
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
            💡 <strong>Punto de Equilibrio:</strong> Necesitas vender <strong>{breakEvenUnits} unidades</strong> al mes (aproximadamente <strong>{Math.ceil(breakEvenUnits / 30)} unidades/día</strong>) para cubrir tus costos fijos. 
            {totalFixedCosts > 0 && avgContributionMargin > 0 && (
              <span> Con un margen promedio de {formatMoneyDisplay(avgContributionMargin)} por producto, debes alcanzar ventas de <strong>{formatMoneyDisplay(breakEvenSales)}</strong> mensuales.</span>
            )}
          </p>
        </div>
      </div>

      {/* Meta de Eficiencia */}
      {(() => {
        // Calcular ventas necesarias para que gastos fijos sean 20%
        const targetEfficiencyPercent = 20
        const salesNeededForEfficiency = totalFixedCosts > 0 ? totalFixedCosts / (targetEfficiencyPercent / 100) : 0
        
        // Ventas estimadas actuales desde config
        const currentEstimatedSales = config.estimatedMonthlySales || 0
        
        // Déficit de ventas
        const salesDeficit = Math.max(0, salesNeededForEfficiency - currentEstimatedSales)
        
        // Meta diaria
        const dailyTarget = salesDeficit / 30
        
        // % actual de gastos sobre ventas
        const currentCostPercent = currentEstimatedSales > 0 ? (totalFixedCosts / currentEstimatedSales) * 100 : 0
        
        // Solo mostrar si hay déficit
        const hasDeficit = salesDeficit > 0 && currentEstimatedSales > 0
        
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
                    🎯 Meta de Eficiencia Financiera
                  </h3>
                  <p className={`text-sm ${
                    hasDeficit
                      ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                      : isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    Objetivo: Gastos Fijos = 20% de Ventas (Saludable)
                  </p>
                </div>
              </div>
              {currentEstimatedSales > 0 && (
                <div className={`px-4 py-2 rounded-full text-center ${
                  currentCostPercent > 35
                    ? isDarkMode ? 'bg-red-900/50 border-2 border-red-600' : 'bg-red-100 border-2 border-red-400'
                    : currentCostPercent > 20
                    ? isDarkMode ? 'bg-orange-900/50 border-2 border-orange-600' : 'bg-orange-100 border-2 border-orange-400'
                    : isDarkMode ? 'bg-green-900/50 border-2 border-green-600' : 'bg-green-100 border-2 border-green-400'
                }`}>
                  <p className={`text-xs font-medium ${
                    currentCostPercent > 35
                      ? 'text-red-500'
                      : currentCostPercent > 20
                      ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                      : isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    % Actual
                  </p>
                  <p className={`text-2xl font-black ${
                    currentCostPercent > 35
                      ? 'text-red-500 animate-pulse'
                      : currentCostPercent > 20
                      ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                      : isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}>
                    {currentCostPercent.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            {currentEstimatedSales === 0 ? (
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  ⚠️ <strong>Configura tus Ventas Estimadas</strong> en la sección de Configuración para ver tu meta de eficiencia y el déficit de ventas.
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

                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-300'}`}>
                    <p className={`text-xs mb-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>📊 Ventas Estimadas Actuales</p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                      {formatMoneyDisplay(currentEstimatedSales)}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-300'}`}>
                    <p className={`text-xs mb-2 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>🎯 Ventas Necesarias (20%)</p>
                    <p className={`text-2xl font-bold ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                      {formatMoneyDisplay(salesNeededForEfficiency)}
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
                            📈 Para llegar a un 20% de costos indirectos (saludable):
                          </p>
                          <p className={`text-3xl font-black mb-3 ${isDarkMode ? 'text-orange-200' : 'text-orange-800'}`}>
                            Necesitas vender {formatMoneyDisplay(salesDeficit)} adicionales al mes
                          </p>
                          <div className={`inline-block px-4 py-2 rounded-lg ${isDarkMode ? 'bg-orange-700' : 'bg-orange-500'}`}>
                            <p className="text-white text-sm font-medium">⏰ Meta Diaria para Recuperación</p>
                            <p className="text-white text-2xl font-black">
                              {formatMoneyDisplay(dailyTarget)} / día
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Progreso */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Progreso hacia meta saludable
                        </span>
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                          {((currentEstimatedSales / salesNeededForEfficiency) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className={`w-full h-4 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div 
                          className={`h-full transition-all duration-500 ${
                            (currentEstimatedSales / salesNeededForEfficiency) * 100 < 50
                              ? 'bg-gradient-to-r from-red-500 to-red-600'
                              : (currentEstimatedSales / salesNeededForEfficiency) * 100 < 80
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                              : 'bg-gradient-to-r from-green-500 to-green-600'
                          }`}
                          style={{ width: `${Math.min((currentEstimatedSales / salesNeededForEfficiency) * 100, 100)}%` }}
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
                          ✅ ¡Excelente! Ya alcanzaste la meta de eficiencia
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                          Tus gastos fijos representan solo el {currentCostPercent.toFixed(1)}% de tus ventas estimadas, lo cual es saludable para tu negocio.
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
                ⚠️ Productos con Margen Crítico (Menos del 30%)
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
                {lowMarginProducts.length} productos requieren atención urgente debido a baja rentabilidad
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {lowMarginProducts.map((product, idx) => (
              <div 
                key={product.id || idx} 
                className={`p-3 rounded-lg flex items-center justify-between ${
                  isDarkMode ? 'bg-red-900/30' : 'bg-red-100'
                }`}
              >
                <div className="flex-1">
                  <p className={`font-medium ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>
                    {product.name}
                  </p>
                  <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    Costo: {formatMoneyDisplay(product.cost)} | Precio: {formatMoneyDisplay(product.price)}
                  </p>
                </div>
                <div className={`text-right px-3 py-1 rounded-lg font-bold ${
                  product.contributionMarginPercent < 20 
                    ? isDarkMode ? 'bg-red-700 text-red-100' : 'bg-red-600 text-white'
                    : isDarkMode ? 'bg-orange-700 text-orange-100' : 'bg-orange-500 text-white'
                }`}>
                  {product.contributionMarginPercent.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen de Clasificación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CategoryCard
          title="⭐ Estrellas"
          count={productsByProfitability.stars.length}
          description="Margen ≥ 50%"
          color="green"
          isDarkMode={isDarkMode}
        />
        <CategoryCard
          title="🐴 Caballos de Batalla"
          count={productsByProfitability.plowhorses.length}
          description="Margen 30-50%"
          color="blue"
          isDarkMode={isDarkMode}
        />
        <CategoryCard
          title="🧩 Enigmas"
          count={productsByProfitability.puzzles.length}
          description="Margen 20-30%"
          color="yellow"
          isDarkMode={isDarkMode}
        />
        <CategoryCard
          title="🐕 Perros"
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
