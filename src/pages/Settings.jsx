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

  const handleLanguageChange = (newLang) => {
    changeLanguage(newLang)
  }

  const handleSave = async () => {
    try {
      await saveConfig(config)
      setIsSaved(true)
      alert(t('successMessage'))
      
      setTimeout(() => {
        setShowForm(false)
        setIsSaved(false)
      }, 500)
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Error al guardar la configuración')
    }
  }

  const handleEdit = async () => {
    setShowForm(true)
    await loadConfig()
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Cargando configuración...</p>
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
        <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 text-green-400 text-sm flex items-center gap-2 animate-pulse">
          <span>✓</span>
          <span>{t('successMessage')}</span>
        </div>
      )}

      {/* Formulario - Mostrado por defecto o cuando edita */}
      {showForm ? (
        <>
          {/* Información de la Empresa */}
          <div className={`rounded-lg border p-6 space-y-4 transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-[#1f2937] border-gray-700' 
              : 'bg-gray-50 border-gray-300'
          }`}>
            <h3 className="text-xl font-semibold mb-4">{t('companyInfo')}</h3>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('companyName')} {t('companyNameRequired')}
              </label>
              <input
                type="text"
                value={config.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className={`w-full rounded-lg px-4 py-3 border-2 transition-colors duration-200 focus:outline-none ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white placeholder-gray-500 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                    : 'bg-white border-gray-300 text-[#111827] placeholder-gray-400 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                }`}
                placeholder={t('companyNameExample')}
              />
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{t('companyNameHint')}</p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('chefName')} {t('chefNameRequired')}
              </label>
              <input
                type="text"
                value={config.chefName}
                onChange={(e) => handleChange('chefName', e.target.value)}
                className={`w-full rounded-lg px-4 py-3 border-2 transition-colors duration-200 focus:outline-none ${
                  isDarkMode
                    ? 'bg-[#111827] border-gray-600 text-white placeholder-gray-500 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                    : 'bg-white border-gray-300 text-[#111827] placeholder-gray-400 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                }`}
                placeholder={t('chefNameExample')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('currency')} {t('currencyRequired')}
                </label>
                <select
                  value={config.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className={`w-full rounded-lg px-4 py-3 border-2 transition-colors duration-200 focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#111827] border-gray-600 text-white focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                      : 'bg-white border-gray-300 text-[#111827] focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                  }`}
                >
                  {currencies.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.name} ({curr.symbol}{curr.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('language')} {t('languageRequired')}
                </label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className={`w-full rounded-lg px-4 py-3 border-2 transition-colors duration-200 focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#111827] border-gray-600 text-white focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                      : 'bg-white border-gray-300 text-[#111827] focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                  }`}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configuración de Costos */}
          <div className={`rounded-lg border p-6 space-y-4 transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-[#1f2937] border-gray-700' 
              : 'bg-gray-50 border-gray-300'
          }`}>
            <h3 className="text-xl font-semibold mb-4">{t('costConfig')}</h3>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('wastageTitle')}
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={config.globalWastagePercent}
                    onChange={(e) => handleChange('globalWastagePercent', parseFloat(e.target.value))}
                    className={`flex-1 rounded-lg px-4 py-3 border-2 transition-colors duration-200 focus:outline-none ${
                      isDarkMode
                        ? 'bg-[#111827] border-gray-600 text-white placeholder-gray-500 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                        : 'bg-white border-gray-300 text-[#111827] placeholder-gray-400 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                    }`}
                  />
                  <span className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>%</span>
                </div>
              </div>
              <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                {t('wastageHint')}
              </p>
            </div>

            <div className={`rounded-lg p-4 border-2 mt-4 transition-colors duration-300 ${
              isDarkMode
                ? 'bg-[#111827]/50 border-[#206DDA]/20'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <h4 className="text-sm font-semibold text-[#206DDA] mb-2">{t('wastageFormula')}</h4>
              <p className={`text-xs mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <strong>Costo Real Unitario</strong> = (Costo Compra ÷ Cantidad) × (1 + % Merma ÷ 100)
              </p>
              <div className={`p-3 rounded text-xs font-mono ${
                isDarkMode
                  ? 'bg-[#111827] text-gray-400'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}>
                <p>{t('wastageExample')}</p>
                <p className="text-[#206DDA] mt-2">= ($10,0 ÷ 1000) × (1 + 5÷100)</p>
                <p className="text-[#206DDA]">= $0,0 por gramo</p>
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
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.rentCost || 0}
                  onChange={(e) => handleChange('rentCost', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg px-4 py-3 border-2 transition-colors duration-200 focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#111827] border-gray-600 text-white placeholder-gray-500 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                      : 'bg-white border-gray-300 text-[#111827] placeholder-gray-400 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                  }`}
                  placeholder="Ej: 1500"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  ⚡ Servicios Públicos (Luz, Gas, Agua)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.utilitiesCost || 0}
                  onChange={(e) => handleChange('utilitiesCost', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg px-4 py-3 border-2 transition-colors duration-200 focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#111827] border-gray-600 text-white placeholder-gray-500 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                      : 'bg-white border-gray-300 text-[#111827] placeholder-gray-400 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                  }`}
                  placeholder="Ej: 500"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  👥 Nómina Total Mensual
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.payrollCost || 0}
                  onChange={(e) => handleChange('payrollCost', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg px-4 py-3 border-2 transition-colors duration-200 focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#111827] border-gray-600 text-white placeholder-gray-500 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                      : 'bg-white border-gray-300 text-[#111827] placeholder-gray-400 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                  }`}
                  placeholder="Ej: 3000"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  📋 Otros Gastos Fijos
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.otherFixedCosts || 0}
                  onChange={(e) => handleChange('otherFixedCosts', parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-lg px-4 py-3 border-2 transition-colors duration-200 focus:outline-none ${
                    isDarkMode
                      ? 'bg-[#111827] border-gray-600 text-white placeholder-gray-500 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                      : 'bg-white border-gray-300 text-[#111827] placeholder-gray-400 focus:border-[#206DDA] focus:ring-2 focus:ring-[#206DDA]/20'
                  }`}
                  placeholder="Ej: 200"
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
