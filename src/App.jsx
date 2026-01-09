import { useState, useEffect } from 'react'
import { BarChart3, Users, Package, BookOpen, ShoppingCart, Tags, Settings, Folder } from 'lucide-react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Dashboard from '@/pages/Dashboard'
import Suppliers from '@/pages/Suppliers'
import IngredientsNew from '@/pages/IngredientsNew'
import RecipesNew from '@/pages/RecipesNew'
import ProductsNew from '@/pages/ProductsNew'
import Promotions from '@/pages/Promotions'
import SettingsPage from '@/pages/Settings'
import CategoriesManager from '@/pages/CategoriesManager'
import { getConfig } from '@/utils/storage'
import { useI18n, I18nProvider } from '@/context/I18nContext'
import { CategoriesProvider } from '@/context/CategoriesContext'

function AppContent() {
  const { t, isDarkMode } = useI18n()
  const [currentTab, setCurrentTab] = useState('dashboard')
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  // Cargar config de Firestore
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const configData = await getConfig()
      setConfig(configData)
    } catch (error) {
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  // Actualizar config cuando cambia el tab
  useEffect(() => {
    if (currentTab === 'settings') {
      loadConfig()
    }
  }, [currentTab])

  const tabs = [
    { id: 'dashboard', label: t('panel'), icon: BarChart3, component: Dashboard },
    { id: 'suppliers', label: t('suppliers'), icon: Users, component: Suppliers },
    { id: 'ingredients', label: t('ingredients'), icon: Package, component: IngredientsNew },
    { id: 'recipes', label: t('recipes'), icon: BookOpen, component: RecipesNew },
    { id: 'products', label: t('products'), icon: ShoppingCart, component: ProductsNew },
    { id: 'promotions', label: t('promotions'), icon: Tags, component: Promotions },
    { id: 'settings', label: t('settings'), icon: Settings, component: SettingsPage },
  ]

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#111827]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#206DDA] mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando CostoX...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-[#111827]'}`}>
      {/* Header */}
      <header className={`border-b px-4 py-4 transition-colors duration-300 ${isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#206DDA]">CostoX</h1>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Gestión de costos, escandallos y rentabilidad</p>
          </div>
          <div className={`text-right ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <p className="text-sm font-medium">{config.companyName}</p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{config.chefName}</p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation - Mobile and Desktop */}
        <nav className={`hidden md:flex md:flex-col md:w-64 border-r overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
          <div className="p-4 space-y-2">
            {tabs.map(tab => {
              const IconComponent = tab.icon
              const isActive = currentTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#206DDA] text-white'
                      : isDarkMode
                      ? 'text-gray-300 hover:bg-[#111827]'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent size={20} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        {/* Content Area */}
        <main className={`flex-1 overflow-y-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#111827]' : 'bg-white'}`}>
          {(() => {
            const ActiveComponent = tabs.find(tab => tab.id === currentTab)?.component
            return ActiveComponent ? <ActiveComponent /> : null
          })()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 border-t overflow-x-auto transition-colors duration-300 ${isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
        <div className="flex gap-1 px-2 py-2 min-w-full">
          {tabs.map(tab => {
            const IconComponent = tab.icon
            const isActive = currentTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#206DDA] text-white'
                    : isDarkMode
                    ? 'text-gray-400 hover:bg-[#111827]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={tab.label}
              >
                <IconComponent size={18} />
                <span className="text-xs">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Spacer para mobile navigation */}
      <div className="md:hidden h-24"></div>
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <CategoriesProvider>
        <AppContent />
        <SpeedInsights />
      </CategoriesProvider>
    </I18nProvider>
  )
}
