# 🎯 GUÍA DE REFERENCIA RÁPIDA - CostoX

## ⚡ Comandos Básicos

```bash
npm install          # Instalar dependencias
npm run dev         # Iniciar desarrollo (http://localhost:5173)
npm run build       # Compilar para producción
npm run preview     # Previsualizar build
```

---

## 🎨 Colores FODEXA

| Nombre | Hex | Uso |
|--------|-----|-----|
| Fondo Oscuro | `#111827` | Fondo principal |
| Tarjetas | `#1f2937` | Cards y secciones |
| Azul Primario | `#206DDA` | Botones, highlights |
| Verde Éxito | `#10b981` | Alertas positivas |
| Gris Texto | `#e5e7eb` | Texto principal |

**En Tailwind:**
- `bg-dark-bg` / `bg-dark-card`
- `text-primary-blue` / `text-success-green`

---

## 🗂️ Estructura Rápida

```
costox/
├── src/
│   ├── App.jsx              ← Navegación principal
│   ├── main.jsx             ← Entrada
│   ├── pages/               ← Módulos (7 páginas)
│   ├── components/          ← Componentes reutilizables
│   ├── utils/storage.js     ← LocalStorage
│   └── styles/globals.css   ← Estilos
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## 📱 7 Módulos Principales

| Módulo | Icon | Función |
|--------|------|---------|
| Dashboard | 📊 | Métricas y alertas |
| Proveedores | 👥 | CRUD proveedores |
| Ingredientes | 🥘 | Registro de insumos |
| Recetas | 📖 | Escandallos/bases |
| Productos | 🛍️ | Productos finales |
| Promociones | 🎉 | Combos y descuentos |
| Configuración | ⚙️ | Ajustes globales |

---

## 🧮 Fórmulas Clave

### 1️⃣ Costo Real Unitario
```
= (Costo Compra ÷ Cantidad) × (1 + % Merma ÷ 100)
```
📌 **Incluye pérdidas/merma en el cálculo**

### 2️⃣ Precio Sugerido
```
= Costo Real × (1 + % Utilidad ÷ 100)
```
📌 **El usuario ingresa % de utilidad**

### 3️⃣ Margen en %
```
= (Precio Venta - Costo Real) ÷ Precio Venta × 100
```
📌 **Qué % del precio final es ganancia**

### 4️⃣ Ganancia (en $)
```
= Precio Venta - Costo Real
```
📌 **Dinero que ganas por unidad**

---

## 💾 Almacenamiento (localStorage)

### Todas las claves tienen prefijo `costox_`

```javascript
// Importar
import { 
  getConfig, saveConfig,
  getSuppliers, saveSuppliers,
  getIngredients, saveIngredients,
  getRecipes, saveRecipes,
  getProducts, saveProducts,
  getPromotions, savePromotions
} from '@/utils/storage'

// Usar
const config = getConfig()
saveConfig(config)
```

---

## 🎯 Márgenes Recomendados

| Tipo de Producto | Utilidad | Margen Final |
|-----------------|----------|-------------|
| Pan simple | 30-40% | 23-29% |
| Medialunas | 40-60% | 29-37% |
| Tartas | 50-80% | 33-44% |
| Combos | Bajo | **20-30%** ⚠️ |
| Premium | 60-100% | 37-50% |

⚠️ **Alerta automática si margen < 30%**

---

## 📝 Mermas Típicas

| Ingrediente | % Merma |
|------------|---------|
| Harinas | 3-5% |
| Azúcares | 2-3% |
| Frutas frescas | 10-15% |
| Verduras | 8-12% |
| Levadura | 5-8% |
| Chocolate | 2-3% |
| Mantequilla | 1-2% |

---

## 🔧 Estructura de Datos

### Proveedor
```javascript
{
  id: 1702500000000,        // timestamp
  name: "Distribuidor ABC",
  category: "Harinas",
  createdAt: "2025-12-19..."
}
```

### Ingrediente
```javascript
{
  id: 1702500010000,
  name: "Harina 000",
  supplierId: 1702500000000,
  presentation: 1000,
  presentationUnit: "gr",
  purchaseCost: 500,
  wastagePercent: 3,
  realUnitCost: 0.515,  // ← Calculado
  createdAt: "..."
}
```

### Receta
```javascript
{
  id: 1702500020000,
  name: "Masa Pan Blanco",
  description: "...",
  ingredients: [
    { ingredientId: 123, quantity: 700, unit: "gr" }
  ],
  preparation: "...",
  referencePhoto: "data:image/...",
  baseCost: 402.40,  // ← Calculado
  createdAt: "..."
}
```

### Producto
```javascript
{
  id: 1702500030000,
  name: "Pan Blanco 500g",
  recipeId: 1702500020000,
  baseIngredients: [],
  additionalCost: 0,
  profitMarginPercent: 50,
  quantity: 1,
  realCost: 402.40,    // ← Calculado
  salePrice: 603.60,   // ← Calculado
  createdAt: "..."
}
```

### Promoción
```javascript
{
  id: 1702500040000,
  name: "Combo Desayuno",
  description: "...",
  products: [
    { productId: 123, quantity: 1 }
  ],
  discountPercent: 15,
  margin: 15.5,  // ← Calculado
  createdAt: "..."
}
```

---

## 🎨 Componentes Reutilizables

### Modal
```javascript
import Modal from '@/components/Modal'

<Modal
  title="Título"
  onClose={() => setShowModal(false)}
>
  {/* contenido */}
</Modal>
```

### Button
```javascript
import Button from '@/components/Button'

<Button
  label="Guardar"
  icon={Save}
  onClick={handleSave}
  variant="primary"  // primary | success | danger | outline
  size="md"          // sm | md | lg
/>
```

---

## 🔄 Flujo de Datos

```
Usuario crea ingrediente
    ↓
formData se actualiza (estado)
    ↓
handleSave() calcula costo real
    ↓
saveIngredients() guarda en localStorage
    ↓
Costo aparece en tabla
    ↓
Disponible para usar en recetas/productos
```

---

## ✅ Checklist de Configuración Inicial

- [ ] Abierto `npm run dev`
- [ ] App visible en `http://localhost:5173`
- [ ] Ve a Settings ⚙️
- [ ] Completa: Empresa, Chef, Moneda, Merma global
- [ ] Crea proveedores
- [ ] Crea ingredientes (con costos)
- [ ] Crea recetas
- [ ] Crea productos
- [ ] Monitorea en Dashboard

---

## 🚨 Alertas Automáticas

| Alerta | Dónde | Condición |
|--------|-------|-----------|
| Margen bajo | Dashboard | Cualquier margen < 30% |
| Margen bajo | Promotions | Si combo tiene < 30% |
| Sin datos | Cada página | Si no hay registros |

---

## 📲 Responsive Breakpoints

```javascript
// Tailwind CSS
md:  // >= 768px (tablets/desktop)

// Ejemplos en código:
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  // 1 columna en móvil, 3 en desktop
</div>
```

---

## 🎯 Tips de Eficiencia

1. **Crea 5+ proveedores primero** → Luego ingredientes
2. **Crea 2-3 recetas base** → Reutiliza en productos
3. **Revisa márgenes cada semana** → Ajusta precios
4. **Agrupa combos inteligentemente** → Atrae clientes
5. **Usa Dashboard** → Para monitoreo diario

---

## 🐛 Debug en Console

```javascript
// Ver toda la config
console.log(localStorage)

// Ver ingredientes guardados
const ings = JSON.parse(localStorage.getItem('costox_ingredients'))
console.table(ings)

// Calcular margen manualmente
const margin = ((precio - costo) / precio * 100).toFixed(1)

// Limpiar TODO
localStorage.clear()
```

---

## 🌐 Monedas Soportadas

- USD (Dólar)
- EUR (Euro)
- ARS (Peso Argentino)
- MXN (Peso Mexicano)
- COP (Peso Colombiano)
- CLP (Peso Chileno)
- BRL (Real Brasileño)
- PEN (Sol Peruano)

---

## 📚 Documentos Útiles

| Archivo | Contenido |
|---------|-----------|
| README.md | Documentación completa |
| QUICK_START.md | Inicio rápido |
| DEVELOPMENT.md | Guía para developers |
| EJEMPLOS.md | Casos de uso prácticos |
| FAQ.md | Preguntas frecuentes |
| INDEX.md | Índice del proyecto |

---

## 🚀 Próximos Pasos

1. `npm install` → Instalar todo
2. `npm run dev` → Iniciar app
3. Lee `QUICK_START.md`
4. Consulta `EJEMPLOS.md` para caso real
5. ¡Comienza a usar CostoX! 🎉

---

**Última actualización:** Diciembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Producción-Ready
