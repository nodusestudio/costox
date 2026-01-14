import { useState, useEffect } from 'react'
import { Save, Moon, Sun } from 'lucide-react'
import { getConfig, saveConfig } from '@/utils/storage'
import Button from '@/components/Button'
import { useI18n } from '@/context/I18nContext'

export default function Settings() {
  const { t, language, changeLanguage, isDarkMode, toggleTheme } = useI18n()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(true)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    loadConfig()
    setShowForm(false)
    setIsSaved(false)
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const configData = await getConfig()
      setConfig(configData)
    } catch (error) {
      console.error('Error loading config:', error)
    }
    setLoading(false)
  }

  const handleChange = (field, value) => {
    setConfig({ ...config, [field]: value })
  }

  // Formatear número con puntos de miles para mostrar
  const formatNumberWithThousands = (num) => {
    if (!num && num !== 0) return ''
    return num.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  // Manejar cambio de campos numéricos con formato de miles
  const handleNumericChange = (field, displayValue) => {
    // Remover puntos de miles y reemplazar coma por punto si existe
    const cleanValue = displayValue.replace(/\./g, '').replace(',', '.')
    const numericValue = parseFloat(cleanValue) || 0
    setConfig({ ...config, [field]: numericValue })
  }

  const handleLanguageChange = (newLang) => {
    changeLanguage(newLang)
  }

  const handleSave = async () => {
    try {
      await saveConfig(config)
      setIsSaved(true)
              {/* Configuración de Costos */}
              <div className="mt-6">
                <h3 className="text-base font-semibold mb-2">{t('costConfig')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                  {/* Merma Global */}
                  <div className="flex flex-col">
                    <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('wastageTitle')}</label>
                    <div className="flex items-center gap-2">
                      <input type="number" step="0.1" min="0" value={config.globalWastagePercent} onChange={(e) => handleChange('globalWastagePercent', parseFloat(e.target.value))} className={`w-full max-w-[120px] rounded px-2 py-1 border text-xs ${isDarkMode ? 'bg-[#111827] border-gray-600 text-white' : 'bg-white border-gray-300 text-[#111827]'}`} />
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>%</span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>{t('wastageHint')}</p>
                  </div>
                  {/* Tip/Fórmula */}
                  <div className={`rounded-lg p-2 border-2 transition-colors duration-300 text-xs font-mono ${isDarkMode ? 'bg-[#111827]/50 border-[#206DDA]/20' : 'bg-blue-50 border-blue-200'}`} style={{ fontSize: '0.7em' }}>
                    <h4 className="font-semibold text-[#206DDA] mb-1">{t('wastageFormula')}</h4>
                    <p className={`mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}><strong>Costo Real Unitario</strong> = (Costo Compra ÷ Cantidad) × (1 + % Merma ÷ 100)</p>
                  </div>
                </div>
              </div>
      </div>
    )
  }

  const currencies = [
    { code: 'USD', symbol: '$', name: 'Dólar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'ARS', symbol: '$', name: 'Peso Argentino' },
    { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
    { code: 'COP', symbol: '$', name: 'Peso Colombiano' },
    { code: 'CLP', symbol: '$', name: 'Peso Chileno' },
    { code: 'BRL', symbol: 'R$', name: 'Real Brasileño' },
    { code: 'PEN', symbol: 'S/', name: 'Sol Peruano' },
  ]

  return (
    <div className={`p-4 md:p-6 space-y-6 transition-colors duration-300 ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-white text-[#111827]'}`}>
      {/* Header con Botón de Tema */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">{t('pageTitle')}</h2>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('pageSubtitle')}</p>
        </div>
        <button
          onClick={toggleTheme}
          className={`p-3 rounded-lg transition-all duration-200 ${
            isDarkMode 
              ? 'bg-[#1f2937] text-yellow-400 hover:bg-[#374151]' 
              : 'bg-gray-200 text-slate-700 hover:bg-gray-300'
          }`}
          title={isDarkMode ? t('lightMode') : t('darkMode')}
        >
          {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>

      {/* Mensaje de Éxito */}
      {isSaved && (
        <div className="flex items-center justify-center my-6">
          <div className="rounded-2xl shadow-xl border-2 px-8 py-6 flex flex-col items-center gap-2 bg-gradient-to-r from-green-500/90 to-green-700/90 text-white animate-fade-in" style={{ minWidth: 320 }}>
            <span className="text-5xl font-bold bg-white/30 rounded-full px-4 py-2 mb-2">✔</span>
            <span className="block text-xl font-bold mb-1">¡Configuración guardada!</span>
            <span className="block text-sm opacity-90 mb-2">Tus cambios se han aplicado correctamente.</span>
          </div>
        </div>
      )}
        {/* Formulario - Mostrado por defecto o cuando edita */}
      {showForm ? (
        <>
          {/* Información de la Empresa y Configuración de Costos lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Empresa */}
            <div className={`rounded-lg border p-6 space-y-4 transition-colors duration-300 ${isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-gray-50 border-gray-300'}`}> 
              <h3 className="text-xl font-semibold mb-4">{t('companyInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('companyName')}</label>
                  <input type="text" value={config.companyName} onChange={(e) => handleChange('companyName', e.target.value)} className={`w-full rounded px-2 py-1 border text-xs ${isDarkMode ? 'bg-[#111827] border-gray-600 text-white' : 'bg-white border-gray-300 text-[#111827]'}`} placeholder={t('companyNameExample')} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('chefName')}</label>
                  <input type="text" value={config.chefName} onChange={(e) => handleChange('chefName', e.target.value)} className={`w-full rounded px-2 py-1 border text-xs ${isDarkMode ? 'bg-[#111827] border-gray-600 text-white' : 'bg-white border-gray-300 text-[#111827]'}`} placeholder={t('chefNameExample')} />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('currency')}</label>
                  <select value={config.currency} onChange={(e) => handleChange('currency', e.target.value)} className={`w-full rounded px-2 py-1 border text-xs ${isDarkMode ? 'bg-[#111827] border-gray-600 text-white' : 'bg-white border-gray-300 text-[#111827]'}`}>
                    {currencies.map(curr => (
                      <option key={curr.code} value={curr.code}>{curr.name} ({curr.symbol}{curr.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('language')}</label>
                  <select value={language} onChange={(e) => handleLanguageChange(e.target.value)} className={`w-full rounded px-2 py-1 border text-xs ${isDarkMode ? 'bg-[#111827] border-gray-600 text-white' : 'bg-white border-gray-300 text-[#111827]'}`}>
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Configuración de Costos */}
            <div className={`rounded-lg border p-3 space-y-2 transition-colors duration-300 ${isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-gray-50 border-gray-300'}`}> 
              <h3 className="text-base font-semibold mb-2">{t('costConfig')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                {/* Merma Global */}
                <div className="flex flex-col">
                  <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('wastageTitle')}</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" min="0" value={config.globalWastagePercent} onChange={(e) => handleChange('globalWastagePercent', parseFloat(e.target.value))} className={`w-20 rounded px-2 py-1 border text-xs ${isDarkMode ? 'bg-[#111827] border-gray-600 text-white' : 'bg-white border-gray-300 text-[#111827]'}`} />
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>%</span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>{t('wastageHint')}</p>
                </div>
                {/* Tip/Fórmula */}
                <div className={`rounded-lg p-2 border-2 transition-colors duration-300 text-xs font-mono ${isDarkMode ? 'bg-[#111827]/50 border-[#206DDA]/20' : 'bg-blue-50 border-blue-200'}`} style={{ fontSize: '0.7em' }}>
                  <h4 className="font-semibold text-[#206DDA] mb-1">{t('wastageFormula')}</h4>
                  <p className={`mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}><strong>Costo Real Unitario</strong> = (Costo Compra ÷ Cantidad) × (1 + % Merma ÷ 100)</p>
                  {/* Ejemplo eliminado por solicitud: solo se muestra la fórmula */}
                </div>
              </div>
            </div>
          </div>


          {/* Configuración de Gastos Fijos Mensuales */}
          <div className={`rounded-lg border p-6 space-y-4 transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-[#1f2937] border-gray-700' 
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">💼 Gastos Fijos Mensuales</h3>
              <span className={`text-sm px-3 py-1 rounded-full ${isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
                Para Punto de Equilibrio
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  🏢 Arriendo / Alquiler
                </label>
                  <input
                    type="text"
                    value={formatNumberWithThousands(config.rentCost || 0)}
                    onChange={(e) => handleNumericChange('rentCost', e.target.value)}
                    className={`w-full max-w-[300px] rounded px-2 py-1 border text-sm ${isDarkMode ? 'bg-[#111827] border-gray-600 text-white' : 'bg-white border-gray-300 text-[#111827]'}`}
                    placeholder="Ej: 1.500"
                  />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  ⚡ Servicios Públicos (Luz, Gas, Agua)
                </label>
                  <input
                    type="text"
                    value={formatNumberWithThousands(config.utilitiesCost || 0)}
                    onChange={(e) => handleNumericChange('utilitiesCost', e.target.value)}
                    className={`w-full max-w-[300px] rounded px-2 py-1 border text-sm ${isDarkMode ? 'bg-[#111827] border-gray-600 text-white' : 'bg-white border-gray-300 text-[#111827]'}`}
                    placeholder="Ej: 500"
                  />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  👥 Nómina Total Mensual
                </label>
                  <input
                    type="text"
                    value={formatNumberWithThousands(config.payrollCost || 0)}
                    onChange={(e) => handleNumericChange('payrollCost', e.target.value)}
                    className={`w-full max-w-[300px] rounded-lg px-4 py-3 border-2 transition-colors duration-200 focus:outline-none ${
                      isDarkMode
                        ? 'bg-[#111827] border-gray-600 text-white placeholder-gray-500 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                        : 'bg-white border-gray-300 text-[#111827] placeholder-gray-400 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                    }`}
                    placeholder="Ej: 3.000"
                  />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  📋 Otros Gastos Fijos
                </label>
                  <input
                    type="text"
                    value={formatNumberWithThousands(config.otherFixedCosts || 0)}
                    onChange={(e) => handleNumericChange('otherFixedCosts', e.target.value)}
                    className={`w-full max-w-[300px] rounded px-2 py-1 border text-sm ${isDarkMode ? 'bg-[#111827] border-gray-600 text-white' : 'bg-white border-gray-300 text-[#111827]'}`}
                    placeholder="Ej: 300"
                  />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                  Seguros, licencias, mantenimiento, etc.
                </p>
              </div>
            </div>

            {/* Cálculo de Costo por Minuto */}
            <div className={`rounded-lg border p-4 mt-4 ${isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-300'}`}>
              <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                ⏱️ Cálculo de Costo por Minuto (Mano de Obra)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div>
                  <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Horas Laborales Mensuales
                  </label>
                  <input
                    type="number"
                    step="1"
                    className="w-full max-w-[300px] rounded px-2 py-1 border text-sm focus:outline-none focus:ring-2 focus:ring-[#206DDA]"
                    min="1"
                    value={config.monthlyWorkHours || 176}
                    onChange={(e) => handleChange('monthlyWorkHours', parseFloat(e.target.value) || 176)}
                    className={`w-full rounded-lg px-3 py-2 border text-sm ${
                      isDarkMode
                        ? 'bg-[#111827] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="176"
                  />
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                    Default: 176h (22 días × 8h)
                  </p>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    💰 Costo por Minuto
                  </label>
                  <div className={`w-full rounded-lg px-3 py-2 border text-sm font-bold ${
                    isDarkMode
                      ? 'bg-green-900/30 border-green-700 text-green-400'
                      : 'bg-green-50 border-green-300 text-green-700'
                  }`}>
                    {(() => {
                      const payroll = config.payrollCost || 0
                      const hours = config.monthlyWorkHours || 176
                      const costPerMinute = payroll / (hours * 60)
                      return `$${costPerMinute.toFixed(4)} / min`
                    })()}
                  </div>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                    Nómina ÷ (Horas × 60)
                  </p>
                </div>
              </div>

              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  💡 <strong>Uso:</strong> Este costo por minuto se aplicará automáticamente en Productos según el tiempo de preparación configurado.
                </p>
              </div>
            </div>

            {/* Resumen Total */}
            <div className={`rounded-lg border-2 p-4 ${isDarkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-300'}`}>
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                  💼 Total Gastos Fijos Mensuales:
                </span>
                <span className={`text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  ${((config.rentCost || 0) + (config.utilitiesCost || 0) + (config.payrollCost || 0) + (config.otherFixedCosts || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className={`text-xs mt-2 ${isDarkMode ? 'text-purple-400/70' : 'text-purple-600/70'}`}>
                Este monto se usará en el Dashboard para calcular tu Punto de Equilibrio
              </p>
            </div>
          </div>

          {/* Ventas Estimadas Mensuales */}
          <div className={`rounded-lg border p-6 space-y-4 transition-colors duration-300 ${isDarkMode ? 'bg-[#1f2937] border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">📊 Proyección de Ventas</h3>
              <span className={`text-sm px-3 py-1 rounded-full ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                Para Costos Indirectos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  💰 Ventas Estimadas Mensuales
                </label>
                <input
                  type="text"
                  value={formatNumberWithThousands(config.estimatedMonthlySales || 0)}
                  onChange={(e) => handleNumericChange('estimatedMonthlySales', e.target.value)}
                  className={`w-full rounded-lg px-4 py-3 border-2 transition-colors duration-200 focus:outline-none ${isDarkMode ? 'bg-[#111827] border-gray-600 text-white placeholder-gray-500 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20' : 'bg-white border-gray-300 text-[#111827] placeholder-gray-400 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'}`}
                  placeholder="Ej: 50.000"
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                  Estimación de ventas mensuales en {config.currency || 'USD'}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  🎯 Margen de Utilidad Deseado (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={config.targetProfitMargin || 35}
                  onChange={(e) => handleChange('targetProfitMargin', parseFloat(e.target.value) || 35)}
                  className={`w-full rounded px-2 py-1 border text-sm ${isDarkMode ? 'bg-[#111827] border-gray-600 text-white' : 'bg-white border-gray-300 text-[#111827]'}`}
                  placeholder="35"
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                  Meta de margen para clasificar métricas (Rojo/Verde)
                </p>
              </div>
            </div>

            {/* Cálculo de % Costos Indirectos Sugerido */}
            {config.estimatedMonthlySales > 0 && (() => {
              // CORREGIDO: Excluir nómina porque ya se calcula por separado con Tiempo de Preparación
              const indirectFixedCosts = (config.rentCost || 0) + (config.utilitiesCost || 0) + (config.otherFixedCosts || 0)
              const totalFixedCosts = indirectFixedCosts + (config.payrollCost || 0) // Solo para mostrar
              const suggestedPercent = (indirectFixedCosts / (config.estimatedMonthlySales || 1)) * 100
              const isHighPercent = suggestedPercent > 35
              
              return (
                <div className={`rounded-lg border p-4 ${
                  isHighPercent 
                    ? isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-300'
                    : isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300'
                }`}>
                  <h4 className={`text-sm font-semibold mb-3 ${
                    isHighPercent
                      ? isDarkMode ? 'text-red-400' : 'text-red-700'
                      : isDarkMode ? 'text-green-400' : 'text-green-700'
                  }`}>
                    {isHighPercent ? '⚠️' : '💡'} % Costos Indirectos Sugerido
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className={`p-2 rounded-lg mb-2 ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                      <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                        💡 <strong>Nota:</strong> Este % NO incluye nómina (se calcula por separado con Tiempo de Preparación)
                      </p>
                    </div>
                    <div className={`flex justify-between text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span>🏢 Arriendo + ⚡ Servicios + 📋 Otros:</span>
                      <span className="font-bold">
                        ${indirectFixedCosts.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className={`flex justify-between text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs`}>
                      <span>👥 Nómina (separada):</span>
                      <span className="font-bold">
                        ${(config.payrollCost || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className={`flex justify-between text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span>Ventas Estimadas:</span>
                      <span className="font-bold">
                        ${(config.estimatedMonthlySales || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className={`mt-2 pt-2 border-t ${
                      isHighPercent
                        ? isDarkMode ? 'border-red-700' : 'border-red-300'
                        : isDarkMode ? 'border-green-700' : 'border-green-300'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`font-semibold ${
                          isHighPercent
                            ? isDarkMode ? 'text-red-300' : 'text-red-700'
                            : isDarkMode ? 'text-green-300' : 'text-green-700'
                        }`}>
                          % Sugerido para Productos:
                        </span>
                        <div className="flex items-center gap-2 group relative">
                          <span className={`text-2xl font-black ${
                            isHighPercent
                              ? `animate-pulse ${isDarkMode ? 'text-red-500' : 'text-red-600'}`
                              : isDarkMode ? 'text-green-400' : 'text-green-600'
                          }`}>
                            {suggestedPercent.toFixed(2)}%
                          </span>
                          {isHighPercent && (
                            <>
                              <span className="text-red-500 text-xl cursor-help">❓</span>
                              <div className={`absolute right-0 top-8 w-72 p-3 rounded-lg shadow-xl border-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 ${
                                isDarkMode 
                                  ? 'bg-gray-800 border-red-700 text-gray-200' 
                                  : 'bg-white border-red-400 text-gray-800'
                              }`}>
                                <p className="text-sm font-semibold text-red-500 mb-2">⚠️ Porcentaje Muy Alto</p>
                                <p className="text-xs leading-relaxed">
                                  Tus gastos fijos son muy altos comparados con tus ventas. Necesitas vender más para bajar este porcentaje. 
                                  <br /><br />
                                  <strong>Recomendación:</strong> Intenta mantenerlo por debajo del 35% para tener márgenes saludables.
                                </p>
                                {/* Triángulo apuntando arriba */}
                                <div className={`absolute -top-2 right-8 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent ${
                                  isDarkMode ? 'border-b-8 border-b-gray-800' : 'border-b-8 border-b-white'
                                }`}></div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg mt-3 ${
                    isHighPercent
                      ? isDarkMode ? 'bg-red-900/30' : 'bg-red-100'
                      : isDarkMode ? 'bg-green-900/30' : 'bg-green-100'
                  }`}>
                    <p className={`text-xs ${
                      isHighPercent
                        ? isDarkMode ? 'text-red-300' : 'text-red-700'
                        : isDarkMode ? 'text-green-300' : 'text-green-700'
                    }`}>
                      {isHighPercent ? '⚠️' : '💡'} <strong>Uso:</strong> Este porcentaje aparecerá como valor sugerido en el campo "Costos Indirectos %" de cada producto.
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Botón de Guardar */}
          <div className="flex gap-4">
            <Button
              onClick={handleSave}
              icon={Save}
              label={t('savBtn')}
              variant="primary"
              size="lg"
            />
          </div>
        </>
      ) : (
        /* Tarjeta Visual de Empresa - Mostrada cuando NO está en modo edición */
        <>
          {config.companyName && (
            <div className={`rounded-lg border-2 border-[#206DDA] p-8 text-center transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gradient-to-br from-[#1f2937] to-[#111827]' 
                : 'bg-gradient-to-br from-blue-50 to-white'
            }`}>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[#206DDA] uppercase tracking-widest">{t('companyCard')}</h3>
                  <h2 className="text-4xl font-bold">{config.companyName}</h2>
                  <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{config.chefName}</p>
                  <div className="flex justify-center gap-4 pt-4">
                    <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      isDarkMode 
                        ? 'bg-[#111827] text-[#206DDA]' 
                        : 'bg-blue-100 text-[#206DDA]'
                    }`}>
                      {config.currency}
                    </span>
                    <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      isDarkMode 
                        ? 'bg-[#111827] text-[#206DDA]' 
                        : 'bg-blue-100 text-[#206DDA]'
                    }`}>
                      {language.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Botón de Editar */}
                <button
                  onClick={handleEdit}
                  className="w-full bg-[#206DDA] hover:bg-[#1a54b8] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>✏️</span>
                  {t('editBtn')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
