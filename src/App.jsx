import React, { useState, useEffect } from 'react';

function ErrorBoundary({ children }) {
  const [error, setError] = useState(null);
  if (error) {
    return <div style={{ color: 'red', padding: 32 }}><h2>Ocurrió un error inesperado.</h2><pre>{error.message}</pre></div>;
  }
  return (
    <ErrorCatcher onError={setError}>{children}</ErrorCatcher>
  );
}

class ErrorCatcher extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    if (this.props.onError) this.props.onError(error);
  }
  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
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
    { id: 'categories', label: 'Categorías', icon: Folder, component: CategoriesManager },
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
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Sidebar */}
      <nav className="hidden md:flex md:flex-col w-64 border-r border-gray-800 bg-slate-800 overflow-y-auto">
        <div className="p-4 space-y-2">
          {tabs.map(tab => {
            const IconComponent = tab.icon
            const isActive = currentTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${isActive ? 'bg-[#206DDA] text-white' : 'text-gray-300 hover:bg-slate-700'}`}
              >
                <IconComponent size={20} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {/* Header */}
        <header className="border-b border-gray-800 px-4 py-4 bg-slate-900">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#206DDA]">CostoX</h1>
              <p className="text-xs mt-1 text-gray-400">Gestión de costos, escandallos y rentabilidad</p>
            </div>
            <div className="text-right text-gray-300">
              <p className="text-sm font-medium">{config.companyName}</p>
              <p className="text-xs text-gray-500">{config.chefName}</p>
            </div>
          </div>
        </header>
        {/* Main Section */}
        {(() => {
          const ActiveComponent = tabs.find(tab => tab.id === currentTab)?.component
          return ActiveComponent ? <ActiveComponent /> : null
        })()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <CategoriesProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
        <SpeedInsights />
      </CategoriesProvider>
    </I18nProvider>
  );
}
