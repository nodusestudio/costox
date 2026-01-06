# ✅ Modelo Excel Profesional Implementado

## 📊 Cambio de Sistema: QSR → Excel Simplificado

### Antes (Sistema QSR - 6 Pasos)
```
1. Ingredientes
2. Mano de Obra
3. Subtotal Producción
4. Gastos Varios (30%)
5. Markup QSR (60%)
6. Precio Sugerido
```

### Después (Modelo Excel - 3 Métricas)
```
✓ Costo Total (CT) = Ingredientes + Mano de Obra
✓ P-Contribución = (CT / Precio Venta) × 100
✓ M-Contribución = Precio Venta - CT
```

---

## 🎯 Fórmulas Implementadas

### 1️⃣ Costo Total (CT)
```javascript
CT = Σ(Ingredientes) + Mano de Obra
```
- **Ingredientes**: Suma de (Cantidad × Costo por Gramo)
- **Mano de Obra**: Costo del operario por unidad
- **Resultado**: Costo real de producción

### 2️⃣ P-Contribución (Food Cost %)
```javascript
P-Contribución = (CT / Precio Venta) × 100
```
- **Umbral de Alerta**: > 45%
- **Color Verde**: ≤ 45% (rentable)
- **Color Rojo**: > 45% (no rentable)

### 3️⃣ M-Contribución (Utilidad $)
```javascript
M-Contribución = Precio Venta - CT
```
- **Valor Positivo**: Ganancia
- **Valor Negativo**: Pérdida

---

## 🔧 Archivos Modificados

### 1. ProductsNew.jsx
**Cambios en Estado (líneas 18-24):**
```javascript
// ANTES (QSR):
items: [],
laborCost: 0,
overheadPercent: 30,
markupPercent: 60,
realSalePrice: 0

// DESPUÉS (Excel):
items: [],
laborCost: 0,
realSalePrice: 0
```

**Nueva Función calculateMetrics (líneas 98-180):**
```javascript
const costoIngredientes = formData.items.reduce(...)
const manoDeObra = parseFloat(formData.laborCost || 0)
const costoTotal = costoIngredientes + manoDeObra
const precioVenta = parseFloat(formData.realSalePrice || 0)
const pContribucion = precioVenta > 0 ? (costoTotal / precioVenta) * 100 : 0
const mContribucion = precioVenta - costoTotal

return {
  ingredientsCost: costoIngredientes,
  laborCost: manoDeObra,
  totalCost: costoTotal,
  realSalePrice: precioVenta,
  pContribucion: pContribucion,
  mContribucion: mContribucion,
  foodCostPercent: pContribucion, // compatibilidad
  actualProfit: mContribucion // compatibilidad
}
```

**UI Panel Derecho (líneas 520-676):**
- ✅ Costo Ingredientes (texto pequeño)
- ✅ Mano de Obra (input)
- ✅ **COSTO UNIDAD (CT)** - Destacado en grande, fondo azul
- ✅ Precio de Venta (input verde)
- ✅ **P-CONTRIBUCIÓN** - Con alerta si > 45%
- ✅ **M-CONTRIBUCIÓN** - Utilidad en pesos

**Tarjetas de Productos (líneas 267-332):**
- ✅ Ingredientes
- ✅ Mano de Obra
- ✅ **COSTO UNIDAD (CT)** (destacado)
- ✅ Precio de Venta
- ✅ P-CONTRIBUCIÓN (con color según umbral)
- ✅ M-CONTRIBUCIÓN (utilidad en $)

**Botones (líneas 683-695):**
```javascript
// ANTES:
<span className="text-2xl">❌</span> Cancelar
<span className="text-2xl">💾</span> Guardar

// DESPUÉS:
Cancelar
Guardar
```

---

### 2. storage.js (líneas 270-379)

**Nueva Función calculateProductMetrics:**
```javascript
export const calculateProductMetrics = async (productData) => {
  // MODELO EXCEL PROFESIONAL
  
  // Paso 1: Costo Ingredientes
  let costoIngredientes = 0
  for (const item of items) {
    // Usa calcularCostoProporcional con fórmula (Precio × 1.30 / Peso)
    costoIngredientes += costoPorGramo * cantidad_usada
  }
  
  // Paso 2: Mano de Obra
  const manoDeObra = parseFloat(productData.laborCost || 0)
  
  // Paso 3: COSTO TOTAL (CT)
  const costoTotal = costoIngredientes + manoDeObra
  
  // Paso 4: Precio de Venta
  const precioVenta = parseFloat(productData.realSalePrice || 0)
  
  // Paso 5: P-CONTRIBUCIÓN (Food Cost %)
  const pContribucion = precioVenta > 0 ? (costoTotal / precioVenta) * 100 : 0
  
  // Paso 6: M-CONTRIBUCIÓN (Utilidad $)
  const mContribucion = precioVenta - costoTotal
  
  return {
    ingredientsCost: costoIngredientes,
    laborCost: manoDeObra,
    totalCost: costoTotal,
    realSalePrice: precioVenta,
    pContribucion: pContribucion,
    mContribucion: mContribucion,
    foodCostPercent: pContribucion, // compatibilidad
    actualProfit: mContribucion // compatibilidad
  }
}
```

---

## ✅ Verificaciones Completadas

### 1. Cálculos Correctos
- ✅ Costo por gramo usa fórmula: `(Precio × 1.30 / Peso Empaque) × Cantidad`
- ✅ Costo Total = Ingredientes + Mano de Obra (sin gastos varios ni markup)
- ✅ P-Contribución = (CT / PV) × 100
- ✅ M-Contribución = PV - CT

### 2. UI/UX
- ✅ Panel derecho muestra 3 métricas Excel
- ✅ COSTO UNIDAD destacado en grande con fondo azul
- ✅ P-Contribución con alerta visual si > 45%
- ✅ M-Contribución con color verde/rojo según ganancia/pérdida
- ✅ Botones sin emojis ("Guardar" / "Cancelar")
- ✅ Auto-selección de texto en inputs numéricos (onFocus)

### 3. Persistencia
- ✅ storage.js sincronizado con modelo Excel
- ✅ Productos guardados tienen estructura Excel
- ✅ Compatibilidad con productos antiguos (foodCostPercent, actualProfit)

### 4. Build
- ✅ Sin errores de compilación
- ✅ Sin warnings de TypeScript
- ✅ Sin referencias a campos QSR eliminados

---

## 📝 Campos Eliminados (QSR)
```diff
- overheadPercent (Gastos Varios %)
- overheadCost (Costo Gastos Varios)
- markupPercent (Markup QSR %)
- suggestedPrice (Precio Sugerido)
- subtotalProduction (Subtotal Producción)
```

## 🆕 Campos Nuevos (Excel)
```diff
+ pContribucion (P-Contribución / Food Cost %)
+ mContribucion (M-Contribución / Utilidad $)
```

## 🔄 Campos Mantenidos
```javascript
items: []              // Lista de ingredientes/recetas
laborCost: 0          // Mano de obra operario
realSalePrice: 0      // Precio de venta real
ingredientsCost: 0    // Suma de ingredientes
totalCost: 0          // Costo total
foodCostPercent: 0    // Alias de pContribucion
actualProfit: 0       // Alias de mContribucion
```

---

## 🎨 Diseño Visual del Panel

```
┌─────────────────────────────────────────┐
│  📊 Modelo Excel Profesional            │
├─────────────────────────────────────────┤
│  Costo Ingredientes        $XX.XX       │
│  Mano de Obra (input)      [____]       │
│                                          │
│  ╔══════════════════════════════════╗   │
│  ║  COSTO UNIDAD (CT)      $XXX.XX  ║   │ ← DESTACADO
│  ║  = Ingredientes + Mano Obra      ║   │
│  ╚══════════════════════════════════╝   │
│                                          │
│  💵 Precio de Venta        [____]       │
│  ─────────────────────────────────────  │
│  P-CONTRIBUCIÓN             XX.X%       │ ← Verde si ≤45%
│  Food Cost % = (CT / PV) × 100          │   Rojo si >45%
│                                          │
│  M-CONTRIBUCIÓN            $XX.XX       │ ← Verde si >0
│  Utilidad $ = PV - CT                   │   Rojo si <0
└─────────────────────────────────────────┘
```

---

## 🚀 Próximos Pasos (Opcional)

### Mejoras Opcionales
- [ ] Dashboard con totales agregados de P-Contribución
- [ ] Gráficos de distribución de costos
- [ ] Exportar a Excel (.xlsx)
- [ ] Comparar productos por rentabilidad
- [ ] Alertas de P-Contribución en tiempo real

---

## 📌 Notas Importantes

1. **Compatibilidad**: Los productos guardados con el modelo QSR anterior seguirán funcionando gracias a los alias `foodCostPercent` y `actualProfit`.

2. **Umbral de Alerta**: El 45% de Food Cost es estándar para QSR que incluye mano de obra. Ajustar si es necesario.

3. **Costo por Gramo**: Se mantiene la fórmula correcta `(Precio × 1.30 / Peso) × Cantidad` para todos los ingredientes.

4. **Precio de Venta**: El sistema ya no sugiere precio automáticamente. El usuario debe ingresarlo manualmente basándose en el COSTO UNIDAD mostrado.

---

**Fecha de Implementación**: 2025
**Versión**: 2.0 - Modelo Excel Profesional
**Estado**: ✅ Completado y Validado
