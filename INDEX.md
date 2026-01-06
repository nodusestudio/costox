# 📁 Índice Completo del Proyecto - CostoX

## 📋 Archivos de Configuración

### Raíz
- `package.json` - Dependencias y scripts npm
- `vite.config.js` - Configuración de Vite con alias @ y puerto
- `tailwind.config.js` - Configuración de Tailwind con colores personalizados
- `postcss.config.js` - Configuración de PostCSS
- `jsconfig.json` - Configuración de JavaScript (Path aliases)
- `index.html` - Template HTML principal
- `.gitignore` - Archivos ignorados por git
- `.env.example` - Archivo de ejemplo de variables de entorno

## 📚 Documentación

- `README.md` - Documentación completa del proyecto
- `QUICK_START.md` - Guía de inicio rápido
- `DEVELOPMENT.md` - Guía para desarrolladores
- `INDEX.md` - Este archivo

## 🔧 Scripts de Instalación

- `setup.bat` - Instalador automático para Windows
- `setup.sh` - Instalador automático para macOS/Linux

---

## 🎨 Estructura de Carpetas

### src/

#### `App.jsx` (112 líneas)
**Componente principal** - Contiene:
- Sistema de navegación por tabs (7 módulos)
- Header con info de empresa
- Sidebar (desktop) + Bottom nav (móvil)
- Gestión de tabs activos
- Importación de todas las páginas

#### `main.jsx`
**Punto de entrada** - Importa y monta la app en React

---

### src/pages/ - MÓDULOS PRINCIPALES

#### `Dashboard.jsx` (125 líneas)
**Resumen visual de ganancias**
- Métricas: Ganancia, Ingresos, Costo, Margen promedio
- Alertas de margen bajo (< 30%)
- Listado de productos y promociones
- Cálculos en tiempo real

#### `Suppliers.jsx` (82 líneas)
**Gestión de proveedores**
- Modal CRUD (Crear, Leer, Actualizar, Eliminar)
- Campos: Nombre, Categoría
- Validaciones básicas
- Grid responsivo

#### `Ingredients.jsx` (146 líneas)
**Gestión de insumos**
- Campos: Nombre, Proveedor, Presentación, Costo, Merma %
- **Cálculo crucial**: Costo Real Unitario = (Costo / Qty) × (1 + Merma%)
- Tabla con scroll horizontal en móvil
- Preview de cálculos

#### `Recipes.jsx` (152 líneas)
**Escandallos/Recetas base**
- Agregar múltiples ingredientes por gramaje
- Instrucciones de preparación
- Foto de referencia (base64)
- Cálculo automático de costo base
- Grid de tarjetas con preview

#### `Products.jsx` (191 líneas)
**Productos finales**
- Combinar recetas + ingredientes adicionales
- **Precio Sugerido**: Costo × (1 + % Utilidad)
- Cálculo de margen en % y $
- Tabla con métricas de rentabilidad
- Preview destacado del precio sugerido

#### `Promotions.jsx` (206 líneas)
**Combos/Promociones**
- Agrupar productos
- Aplicar descuentos
- **Alerta ROJA si margen < 30%**
- Cálculo completo de rentabilidad
- Estados visuales por margen

#### `Settings.jsx` (138 líneas)
**Configuración global**
- Nombre empresa, chef, moneda, idioma
- % Merma global por defecto
- Paleta de colores de marca
- Explicación de fórmulas
- Guardado en localStorage

---

### src/components/ - COMPONENTES REUTILIZABLES

#### `Modal.jsx` (25 líneas)
**Modal genérico**
- Overlay con fondo oscuro
- Header con título y botón cerrar
- Scroll en contenido
- Z-index 50

#### `Button.jsx` (25 líneas)
**Botón personalizado**
- Variantes: primary, success, danger, outline
- Tamaños: sm, md, lg
- Soporte para iconos Lucide
- Estados disabled

---

### src/utils/ - UTILIDADES

#### `storage.js` (155 líneas)
**Sistema de almacenamiento local**

Funciones principales:
- `getFromStorage(key, defaultValue)` - Obtener datos
- `saveToStorage(key, value)` - Guardar datos
- `removeFromStorage(key)` - Eliminar datos
- `clearAllStorage()` - Limpiar todo

Funciones específicas por módulo:
- `getConfig()` / `saveConfig()`
- `getSuppliers()` / `saveSuppliers()`
- `getIngredients()` / `saveIngredients()`
- `getRecipes()` / `saveRecipes()`
- `getProducts()` / `saveProducts()`
- `getPromotions()` / `savePromotions()`

**Prefijo en localStorage:** `costox_`

---

### src/styles/ - ESTILOS

#### `globals.css` (30 líneas)
**Estilos globales**
- Import de Tailwind (base, components, utilities)
- Transiciones de color suave
- Scrollbar personalizado con colores FODEXA
- Fuente Inter/Sans-serif

---

## 📊 Flujo de Datos

```
localStorage
     ↓
storage.js (funciones get/set)
     ↓
Pages/Componentes
     ↓
React State (useState)
     ↓
Renders dinámicos
```

---

## 🎯 Características Principales

### 1. **Sistema de Cálculos** ✓
- Costo Real Unitario con merma
- Precio Sugerido con % de utilidad
- Margen en % y $ automático

### 2. **Almacenamiento** ✓
- localStorage sin servidor
- Datos persisten en navegador
- Prefijo `costox_` para evitar conflictos

### 3. **Responsive Design** ✓
- Mobile-first
- Bottom nav en móvil, sidebar en desktop
- Tablas con scroll horizontal
- Botones táctiles grandes

### 4. **Identidad Visual** ✓
- Modo oscuro (#111827, #1f2937)
- Azul primario (#206DDA)
- Verde éxito (#10b981)
- Inter/Sans-serif

### 5. **Alertas Inteligentes** ✓
- Alerta roja en Dashboard si hay márgenes bajos
- Alerta en Promociones si margen < 30%
- Avisos en tiempo real

---

## 📈 Estadísticas del Código

| Componente | Líneas | Tipo |
|-----------|--------|------|
| App.jsx | 112 | Principal |
| Dashboard | 125 | Página |
| Ingredients | 146 | Página |
| Recipes | 152 | Página |
| Products | 191 | Página |
| Promotions | 206 | Página |
| Settings | 138 | Página |
| Suppliers | 82 | Página |
| storage.js | 155 | Utilidad |
| Button.jsx | 25 | Componente |
| Modal.jsx | 25 | Componente |
| globals.css | 30 | Estilos |
| **TOTAL** | **1,387** | **líneas** |

---

## 🚀 Cómo Ejecutar

```bash
# 1. Instalar
npm install

# 2. Desarrollo
npm run dev

# 3. Build
npm run build

# 4. Preview
npm run preview
```

---

## 🔐 Seguridad & Privacidad

- ✅ Sin servidor backend
- ✅ Sin API calls
- ✅ Datos locales (navegador)
- ✅ Sin tracking
- ✅ GDPR compliant

---

## 🎓 Recursos Utilizados

### Dependencias
- **React 18** - Framework UI
- **Vite 4** - Build tool
- **Tailwind CSS 3** - Estilos
- **Lucide React** - Iconos SVG

### Herramientas Externas
- LocalStorage API (navegador)
- FileReader API (fotos de recetas)
- Date.now() (IDs únicos)

---

## 📝 Notas Importantes

1. **IDs**: Se usan timestamps (`Date.now()`)
2. **Decimales**: Siempre `toFixed(2)` para dinero
3. **Storage**: Prefijo `costox_` en todas las claves
4. **Márgenes**: Alerta < 30% (configurable)
5. **Responsive**: Diseño móvil primero

---

## 🔄 Flujo de Uso Recomendado

1. **Settings** ⚙️ - Configurar empresa
2. **Suppliers** 👥 - Registrar proveedores
3. **Ingredients** 🥘 - Crear ingredientes con costos
4. **Recipes** 📖 - Crear bases/escandallos
5. **Products** 🛍️ - Crear productos finales
6. **Promotions** 🎉 - Crear combos/promociones
7. **Dashboard** 📈 - Monitorear rentabilidad

---

## 📞 Soporte & Próximas Versiones

- Exportar a PDF/Excel (v1.1)
- Gráficos de tendencias (v1.2)
- Sincronización en nube (v2.0)
- Integración con InventarioX (v2.0)

---

**Última actualización:** Diciembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Producción-Ready
