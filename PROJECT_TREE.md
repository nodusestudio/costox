# 📂 ÁRBOL COMPLETO DEL PROYECTO

```
costox/
│
├─ 📦 INSTALADORES
│  ├─ setup.bat                (Script Windows)
│  └─ setup.sh                 (Script Unix)
│
├─ ⚙️ CONFIGURACIÓN
│  ├─ package.json             (Dependencias npm)
│  ├─ vite.config.js           (Config Vite)
│  ├─ tailwind.config.js       (Tema TailwindCSS)
│  ├─ postcss.config.js        (Config PostCSS)
│  ├─ jsconfig.json            (Path aliases)
│  ├─ index.html               (Template HTML)
│  └─ .gitignore               (Git ignore)
│
├─ 📚 DOCUMENTACIÓN
│  ├─ README.md                ✅ Guía completa
│  ├─ PROJECT_SUMMARY.md       ✅ Resumen del proyecto
│  ├─ QUICK_START.md           ✅ Inicio rápido
│  ├─ DEVELOPMENT.md           ✅ Guía developers
│  ├─ EJEMPLOS.md              ✅ Casos de uso
│  ├─ FAQ.md                   ✅ Preguntas frecuentes
│  ├─ REFERENCE.md             ✅ Cheat sheet
│  ├─ INDEX.md                 ✅ Índice completo
│  └─ .env.example             (Vars de entorno)
│
└─ 📁 SRC/
   │
   ├─ 🎯 APP.JSX (112 líneas)
   │  └─ Componente principal con navegación
   │
   ├─ 🚀 MAIN.JSX
   │  └─ Punto de entrada (React root)
   │
   ├─ 📱 COMPONENTS/ (Componentes Reutilizables)
   │  ├─ Modal.jsx      (25 líneas) - Modal genérico
   │  └─ Button.jsx     (25 líneas) - Botón con variantes
   │
   ├─ 📄 PAGES/ (7 Módulos Principales)
   │  ├─ Dashboard.jsx       (125 líneas)
   │  │  └─ Resumen visual de ganancias
   │  │     ├─ Métricas principales
   │  │     ├─ Alertas de margen bajo
   │  │     └─ Listados de productos/promociones
   │  │
   │  ├─ Suppliers.jsx       (82 líneas)
   │  │  └─ Gestión de proveedores
   │  │     ├─ CRUD (crear, leer, actualizar, eliminar)
   │  │     └─ Campos: nombre, categoría
   │  │
   │  ├─ Ingredients.jsx     (146 líneas)
   │  │  └─ Gestión de ingredientes/insumos
   │  │     ├─ Nombre, proveedor, presentación
   │  │     ├─ Costo de compra, % merma
   │  │     └─ Cálculo: Costo Real Unitario
   │  │
   │  ├─ Recipes.jsx         (152 líneas)
   │  │  └─ Escandallos y recetas base
   │  │     ├─ Múltiples ingredientes
   │  │     ├─ Preparación con pasos
   │  │     ├─ Foto de referencia
   │  │     └─ Cálculo de costo base
   │  │
   │  ├─ Products.jsx        (191 líneas)
   │  │  └─ Productos finales
   │  │     ├─ Combina recetas + ingredientes
   │  │     ├─ % de utilidad deseada
   │  │     ├─ PRECIO SUGERIDO destacado
   │  │     └─ Margen en % y $
   │  │
   │  ├─ Promotions.jsx      (206 líneas)
   │  │  └─ Combos y promociones
   │  │     ├─ Agrupa múltiples productos
   │  │     ├─ Descuentos porcentuales
   │  │     ├─ ALERTA ROJA si margen < 30%
   │  │     └─ Rentabilidad en tiempo real
   │  │
   │  └─ Settings.jsx        (138 líneas)
   │     └─ Configuración global
   │        ├─ Nombre empresa, chef
   │        ├─ Moneda (8 opciones)
   │        ├─ Idioma (3 opciones)
   │        ├─ % Merma global
   │        └─ Paleta de colores FODEXA
   │
   ├─ 🛠️ UTILS/ (Utilidades)
   │  └─ storage.js          (155 líneas)
   │     └─ Sistema LocalStorage
   │        ├─ getFromStorage()
   │        ├─ saveToStorage()
   │        ├─ getConfig() / saveConfig()
   │        ├─ getSuppliers() / saveSuppliers()
   │        ├─ getIngredients() / saveIngredients()
   │        ├─ getRecipes() / saveRecipes()
   │        ├─ getProducts() / saveProducts()
   │        └─ getPromotions() / savePromotions()
   │
   └─ 🎨 STYLES/ (Estilos)
      └─ globals.css          (30 líneas)
         └─ Estilos globales
            ├─ Tailwind (base, components, utilities)
            ├─ Transiciones suaves
            ├─ Scrollbar personalizado
            └─ Fuente Inter/Sans-serif
```

---

## 📊 ESTADÍSTICAS

### Líneas de Código
```
App.jsx              112 líneas
Dashboard.jsx        125 líneas  ┐
Suppliers.jsx         82 líneas  │
Ingredients.jsx      146 líneas  ├─ 1,139 líneas de PÁGINAS
Recipes.jsx          152 líneas  │
Products.jsx         191 líneas  │
Promotions.jsx       206 líneas  │
Settings.jsx         138 líneas  ┘
────────────────────────────────
storage.js           155 líneas (UTILS)
Modal.jsx             25 líneas ┐
Button.jsx            25 líneas ├─ 50 líneas de COMPONENTES
────────────────────────────────
globals.css           30 líneas (ESTILOS)
────────────────────────────────
TOTAL:            ~1,387 líneas
```

### Archivos por Tipo
```
📁 Carpetas:        3 (components, pages, utils, styles)
📄 Componentes:     10 (1 principal + 7 páginas + 2 reutilizables)
📚 Documentos:      9 (README, guías, ejemplos, FAQ)
⚙️ Configuración:   7 (package.json, vite, tailwind, etc)
🚀 Scripts:         2 (setup.bat, setup.sh)
────────────────────────────────
TOTAL:             31 archivos
```

### Módulos Funcionales
```
✅ Dashboard        Métricas + Alertas
✅ Proveedores      CRUD básico
✅ Ingredientes     Costo con merma
✅ Recetas          Escandallos completos
✅ Productos        Precio sugerido
✅ Promociones      Descuentos + Alertas
✅ Configuración    Global + Empresa
────────────────────
TOTAL: 7 módulos principales
```

---

## 🎯 FLUJO DE NAVEGACIÓN

```
App.jsx (Punto Central)
│
├─ Header: Logo + Datos Empresa
│
├─ Sidebar (Desktop) / Bottom Nav (Mobile)
│  │
│  ├─ Dashboard 📊
│  │  └─ Resumen visual
│  │
│  ├─ Suppliers 👥
│  │  └─ Gestión proveedores
│  │
│  ├─ Ingredients 🥘
│  │  └─ Insumos con cálculos
│  │
│  ├─ Recipes 📖
│  │  └─ Escandallos/bases
│  │
│  ├─ Products 🛍️
│  │  └─ Productos finales
│  │
│  ├─ Promotions 🎉
│  │  └─ Combos con descuentos
│  │
│  └─ Settings ⚙️
│     └─ Configuración global
│
└─ Main Content: Renderiza página activa
   │
   └─ Modales (Modal component)
      └─ CRUD operations
```

---

## 💾 ESTRUCTURA DE DATOS

```
┌─────────────────────────────────────┐
│ localStorage (costox_*)             │
├─────────────────────────────────────┤
│                                     │
│ config                              │
│ ├─ companyName: string              │
│ ├─ chefName: string                 │
│ ├─ currency: string                 │
│ ├─ language: string                 │
│ └─ globalWastagePercent: number     │
│                                     │
│ suppliers[]                         │
│ ├─ id, name, category               │
│ └─ createdAt                        │
│                                     │
│ ingredients[]                       │
│ ├─ name, supplierId                 │
│ ├─ presentation, unit               │
│ ├─ purchaseCost, wastagePercent     │
│ └─ realUnitCost (CALCULADO)         │
│                                     │
│ recipes[]                           │
│ ├─ name, description                │
│ ├─ ingredients[], preparation       │
│ ├─ referencePhoto                   │
│ └─ baseCost (CALCULADO)             │
│                                     │
│ products[]                          │
│ ├─ name, recipeId                   │
│ ├─ baseIngredients[]                │
│ ├─ profitMarginPercent              │
│ ├─ realCost (CALCULADO)             │
│ └─ salePrice (CALCULADO)            │
│                                     │
│ promotions[]                        │
│ ├─ name, products[]                 │
│ ├─ discountPercent                  │
│ └─ margin (CALCULADO)               │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔄 FLUJO DE DATOS

```
Usuario Input
    ↓
formData (estado)
    ↓
Validaciones
    ↓
Cálculos automáticos
    ↓
handleSave()
    ↓
saveToStorage() [localStorage]
    ↓
Estado actualizado
    ↓
Re-render React
    ↓
Datos reflejados en UI
```

---

## 🎨 COLORES UTILIZADOS

```
┌─ DARK MODE (Modo Oscuro)
│
├─ #111827 (dark-bg)        ← Fondo principal
│
├─ #1f2937 (dark-card)      ← Tarjetas/secciones
│
├─ #206DDA (primary-blue)   ← Botones, highlights, acciones
│
├─ #10b981 (success-green)  ← Éxito, positivo
│
├─ #ef4444 (red-600)        ← Alertas, peligro, < 30%
│
├─ #f59e0b (amber)          ← Advertencias
│
└─ #6b7280 (gray-500)       ← Texto secundario, deshabilitado
```

---

## 📱 RESPONSIVE BREAKPOINTS

```
0px - 767px (Mobile)
│
├─ Bottom Navigation (7 tabs)
├─ Full width content
├─ Tablas con scroll horizontal
├─ Botones grandes
└─ Stack vertical

768px+ (Desktop)
│
├─ Sidebar fijo a izquierda
├─ Grid layouts
├─ Tablas normales
├─ Layouts optimizados
└─ Múltiples columnas
```

---

## 🧮 FÓRMULAS IMPLEMENTADAS

```
1. COSTO REAL UNITARIO
   ┌────────────────────────────────────────┐
   │ (Costo ÷ Cantidad) × (1 + Merma%)     │
   │ Implementado en: Ingredients.jsx       │
   └────────────────────────────────────────┘

2. PRECIO SUGERIDO
   ┌────────────────────────────────────────┐
   │ Costo Real × (1 + Utilidad%)          │
   │ Implementado en: Products.jsx          │
   └────────────────────────────────────────┘

3. MARGEN %
   ┌────────────────────────────────────────┐
   │ (Precio - Costo) ÷ Precio × 100      │
   │ Implementado en: Products.jsx,         │
   │                  Promotions.jsx        │
   └────────────────────────────────────────┘

4. GANANCIA $
   ┌────────────────────────────────────────┐
   │ Precio Venta - Costo Real             │
   │ Implementado en: Products.jsx          │
   └────────────────────────────────────────┘
```

---

## 🚀 DEPLOYMENT

```
npm run dev      → Desarrollo (puerto 5173)
npm run build    → Build optimizado
npm run preview  → Previsualizar

dist/
├─ index.html
├─ assets/
│  ├─ *.js (bundles)
│  └─ *.css (estilos)
└─ [Lista para hosting]
```

---

## 📞 RUTAS DE SOPORTE

```
¿Cómo empiezo?        → QUICK_START.md
¿Documentación?       → README.md
¿Caso práctico?       → EJEMPLOS.md
¿Pregunta frecuente?  → FAQ.md
¿Referencia rápida?   → REFERENCE.md
¿Índice completo?     → INDEX.md
¿Resumen proyecto?    → PROJECT_SUMMARY.md (este archivo)
```

---

## ✅ CHECKLIST FINAL

- [x] Estructura de carpetas
- [x] Componentes React
- [x] 7 módulos completos
- [x] Sistema de almacenamiento
- [x] Responsive design
- [x] Cálculos automáticos
- [x] Alertas inteligentes
- [x] Documentación completa
- [x] Scripts de instalación
- [x] Identidad visual FODEXA
- [x] Código limpio y documentado
- [x] Listo para producción

---

**🎉 PROYECTO COMPLETADO Y LISTO PARA USAR**

Última actualización: Diciembre 2025  
Versión: 1.0.0  
Estado: ✅ PRODUCCIÓN
