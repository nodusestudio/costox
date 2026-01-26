import { useState, useEffect } from 'react'
import { Save, Moon, Sun } from 'lucide-react'
import { getConfig, saveConfig } from '@/utils/storage'
import Button from '@/components/Button'
import { useI18n } from '@/context/I18nContext'

function Settings() {
  const { t, language, changeLanguage, isDarkMode, toggleTheme } = useI18n()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(true)
  const [isSaved, setIsSaved] = useState(false)

  // Función para manejar cambios en los campos
  const handleChange = (field, value) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      [field]: value
    }))
  }

  // Función para manejar cambios numéricos con formato
  const handleNumericChange = (field, value) => {
    // Remover separadores de miles y convertir a número
    const numericValue = parseFloat(value.replace(/[^\d.-]/g, '')) || 0
    setConfig(prevConfig => ({
      ...prevConfig,
      [field]: numericValue
    }))
  }

  // Función para formatear números con separadores de miles
  const formatNumberWithThousands = (number) => {
    return number ? number.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'
  }

  // Guardar cambios
  const handleSave = async () => {
    try {
      await saveConfig(config);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e) {
      alert('Error al guardar configuración');
      console.error(e);
    }
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
  ];

  const loadConfig = async () => {
    setLoading(true)
    try {
      const configData = await getConfig()
      setConfig(configData)
    } catch (error) {
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
    setShowForm(false)
    setIsSaved(false)
  }, [])

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
      {showForm && config ? (
        <>
          {/* Información de la Empresa y Configuración de Costos lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Empresa: 3 columnas */}
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
          </div>

          {/* Botón de Guardar */}
          <div className="flex justify-end pt-6">
            <Button 
              onClick={handleSave} 
              icon={Save} 
              label={t('savBtn')} 
              variant="primary" 
              size="lg" 
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

export default Settings;