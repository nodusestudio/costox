import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle } from 'lucide-react'
import { getProducts, getPromotions } from '@/utils/storage'
import { useI18n } from '@/context/I18nContext'
import { formatMoneyDisplay } from '@/utils/formatters'

export default function Dashboard() {
  const { t, isDarkMode } = useI18n()
  const [products, setProducts] = useState([])
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [productsData, promotionsData] = await Promise.all([
        getProducts(),
        getPromotions()
      ])
      setProducts(Array.isArray(productsData) ? productsData : [])
      setPromotions(Array.isArray(promotionsData) ? promotionsData : [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setProducts([])
      setPromotions([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`p-4 md:p-6 flex items-center justify-center min-h-screen ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-[#111827]'}`}>
        <p className="text-lg">Cargando...</p>
      </div>
    )
  }

  // Calcular métricas
  const totalProducts = products.length
  const totalPromotions = promotions.length
  
  const totalRevenue = (products ?? []).reduce((sum, p) => sum + ((p.salePrice || 0) * (p.quantity || 0)), 0)
  const totalCost = (products ?? []).reduce(
    (sum, p) => sum + (((p.totalCost ?? p.realCost) || 0) * (p.quantity || 0)),
    0
  )
  const totalProfit = totalRevenue - totalCost
  const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0

  // Productos con margen bajo (< 30%)
  const lowMarginProducts = (products ?? []).filter(p => {
    const cost = (p.totalCost ?? p.realCost) || 0
    const margin = (p.salePrice || 0) > 0 ? (((p.salePrice || 0) - cost) / (p.salePrice || 0)) * 100 : 0
    return margin < 30
  })

  const promotionsWithLowMargin = (promotions ?? []).filter(p => (p.margin || 0) < 30)

  return (
    <div className={`p-4 md:p-6 space-y-6 transition-colors duration-300 ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-[#111827]'}`}>
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">{t('dashboardTitle')}</h2>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{t('dashboardSubtitle')}</p>
      </div>

      {/* Alertas */}
      {(lowMarginProducts.length > 0 || promotionsWithLowMargin.length > 0) && (
        <div className={`border rounded-lg p-4 flex items-start gap-3 ${isDarkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-300'}`}>
          <AlertCircle className={`flex-shrink-0 mt-0.5 ${isDarkMode ? 'text-red-500' : 'text-red-600'}`} size={20} />
          <div>
            <h3 className={`font-semibold mb-1 ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>⚠️ {t('profitabilityAlert')}</h3>
            <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
              {lowMarginProducts.length > 0 && `${lowMarginProducts.length} ${t('lowMarginProducts')} `}
              {promotionsWithLowMargin.length > 0 && `${promotionsWithLowMargin.length} ${t('lowMarginPromotions')}.`}
            </p>
          </div>
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Ganancia Total" 
          value={formatMoneyDisplay(totalProfit)}
          color="success"
        />
        <MetricCard 
          title="Ingresos Totales" 
          value={formatMoneyDisplay(totalRevenue)}
          color="primary"
        />
        <MetricCard 
          title="Costo Total" 
          value={formatMoneyDisplay(totalCost)}
          color="gray"
        />
        <MetricCard 
          title="Margen Promedio" 
          value={`${avgMargin}%`}
          color={avgMargin >= 30 ? "success" : "warning"}
        />
      </div>

      {/* Resumen de Productos y Promociones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-dark-card rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Productos Finales</h3>
            <span className="text-3xl font-bold text-primary-blue">{totalProducts}</span>
          </div>
          {products.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay productos registrados</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(products ?? []).slice(0, 5).map((product, idx) => (
                <div key={product.id || idx} className="flex justify-between items-center text-sm p-2 bg-dark-bg rounded">
                  <span className="text-gray-300">{product.name || 'Sin nombre'}</span>
                  <span className="text-primary-blue font-semibold">{formatMoneyDisplay(product.salePrice || 0)}</span>
                </div>
              ))}
              {products.length > 5 && (
                <p className="text-xs text-gray-500 text-center mt-2">+{products.length - 5} más</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-dark-card rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Promociones (Combos)</h3>
            <span className="text-3xl font-bold text-primary-blue">{totalPromotions}</span>
          </div>
          {promotions.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay promociones registradas</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(promotions ?? []).slice(0, 5).map((promo, idx) => (
                <div key={promo.id || idx} className="flex justify-between items-center text-sm p-2 bg-dark-bg rounded">
                  <span className="text-gray-300">{promo.name || 'Sin nombre'}</span>
                  <span className={(promo.margin || 0) < 30 ? 'text-red-400 font-semibold' : 'text-success-green font-semibold'}>
                    {(promo.margin || 0).toFixed(1)}%
                  </span>
                </div>
              ))}
              {promotions.length > 5 && (
                <p className="text-xs text-gray-500 text-center mt-2">+{promotions.length - 5} más</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, color }) {
  const colorClasses = {
    success: 'bg-green-900/30 border-green-700 text-success-green',
    primary: 'bg-blue-900/30 border-primary-blue text-primary-blue',
    gray: 'bg-gray-900/30 border-gray-700 text-gray-400',
    warning: 'bg-yellow-900/30 border-yellow-700 text-yellow-400',
  }

  return (
    <div className={`rounded-lg p-4 border ${colorClasses[color]}`}>
      <p className="text-xs font-medium text-gray-400 mb-2">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
