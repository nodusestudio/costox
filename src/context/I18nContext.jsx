import { createContext, useContext, useState, useEffect } from 'react'

// Diccionario completo de traducciones
const translations = {
  es: {
    // Navegación
    panel: 'Panel',
    suppliers: 'Proveedores',
    ingredients: 'Ingredientes',
    recipes: 'Recetas',
    products: 'Productos',
    promotions: 'Promociones',
    settings: 'Configuración',

    // Dashboard/Panel
    dashboardTitle: 'Panel',
    dashboardSubtitle: 'Resumen visual de ganancias y rentabilidad',
    totalRevenue: 'Ganancia Total',
    totalCost: 'Costo Total',
    totalProfit: 'Ganancia Neta',
    averageMargin: 'Margen Promedio',
    profitabilityAlert: 'Alerta de Rentabilidad',
    lowMarginProducts: 'producto(s) con margen < 30%',

    // Configuración
    pageTitle: 'Configuración Global',
    pageSubtitle: 'Ajusta los parámetros de tu empresa y preferencias',
    successMessage: 'Configuración guardada exitosamente',
    companyInfo: 'Información de la Empresa',
    costConfig: 'Configuración de Costos',
    companyName: 'Nombre de la Empresa',
    companyNameRequired: '*',
    companyNameExample: 'Ej: Mi Panadería',
    companyNameHint: 'Se mostrará en la parte superior de la aplicación',
    chefName: 'Nombre del Cocinero/Responsable',
    chefNameRequired: '*',
    chefNameExample: 'Ej: Chef Juan',
    currency: 'Moneda',
    currencyRequired: '*',
    language: 'Idioma',
    languageRequired: '*',
    savBtn: 'Guardar Configuración',
    editBtn: 'Editar',
    wastageTitle: '% de Merma Global (Por Defecto)',
    wastageHint: 'Este porcentaje se aplicará por defecto al crear nuevos ingredientes. Cada ingrediente puede tener su propia merma.',
    wastageFormula: '📊 Cómo se calcula la merma:',
    wastageExample: 'Ejemplo: Harina a $10 por 1000g con 5% merma:',
    companyCard: 'Tarjeta de Empresa',
    darkMode: 'Modo Oscuro',
    lightMode: 'Modo Claro',
  },
  en: {
    // Navigation
    panel: 'Panel',
    suppliers: 'Suppliers',
    ingredients: 'Ingredients',
    recipes: 'Recipes',
    products: 'Products',
    promotions: 'Promotions',
    settings: 'Settings',

    // Dashboard/Panel
    dashboardTitle: 'Panel',
    dashboardSubtitle: 'Visual summary of earnings and profitability',
    totalRevenue: 'Total Revenue',
    totalCost: 'Total Cost',
    totalProfit: 'Net Profit',
    averageMargin: 'Average Margin',
    profitabilityAlert: 'Profitability Alert',
    lowMarginProducts: 'product(s) with margin < 30%',

    // Settings
    pageTitle: 'Global Settings',
    pageSubtitle: 'Adjust your company parameters and preferences',
    successMessage: 'Settings saved successfully',
    companyInfo: 'Company Information',
    costConfig: 'Cost Configuration',
    companyName: 'Company Name',
    companyNameRequired: '*',
    companyNameExample: 'Eg: My Bakery',
    companyNameHint: 'Will be displayed at the top of the application',
    chefName: 'Chef/Manager Name',
    chefNameRequired: '*',
    chefNameExample: 'Eg: Chef John',
    currency: 'Currency',
    currencyRequired: '*',
    language: 'Language',
    languageRequired: '*',
    savBtn: 'Save Settings',
    editBtn: 'Edit',
    wastageTitle: '% Global Waste (Default)',
    wastageHint: 'This percentage will be applied by default when creating new ingredients. Each ingredient can have its own waste percentage.',
    wastageFormula: '📊 How waste is calculated:',
    wastageExample: 'Example: Flour at $10 per 1000g with 5% waste:',
    companyCard: 'Company Card',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
  }
}

// Crear el contexto
const I18nContext = createContext()

// Proveedor del contexto
export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('costox_language')
    return saved || 'es'
  })

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('costox_darkMode')
    return saved !== null ? JSON.parse(saved) : true
  })

  // Función para traducir
  const t = (key) => {
    return translations[language]?.[key] || translations['es']?.[key] || key
  }

  // Cambiar idioma y guardar
  const changeLanguage = (newLang) => {
    if (newLang === 'es' || newLang === 'en') {
      setLanguage(newLang)
      localStorage.setItem('costox_language', newLang)
    }
  }

  // Cambiar tema y guardar
  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    localStorage.setItem('costox_darkMode', JSON.stringify(newTheme))
  }

  // Aplicar tema al documento
  useEffect(() => {
    const root = document.documentElement
    if (isDarkMode) {
      root.style.backgroundColor = '#111827'
      root.style.color = '#FFFFFF'
      document.body.classList.add('dark-mode')
      document.body.classList.remove('light-mode')
    } else {
      root.style.backgroundColor = '#FFFFFF'
      root.style.color = '#111827'
      document.body.classList.add('light-mode')
      document.body.classList.remove('dark-mode')
    }
  }, [isDarkMode])

  return (
    <I18nContext.Provider value={{ language, t, changeLanguage, isDarkMode, toggleTheme }}>
      {children}
    </I18nContext.Provider>
  )
}

// Hook para usar el contexto
export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n debe usarse dentro de I18nProvider')
  }
  return context
}
