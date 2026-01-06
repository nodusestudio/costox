# 🧪 Casos de Prueba - Formato de Moneda

## Test Cases para Verificar el Formato

### ✅ Test 1: Dashboard - Métricas Principales
**Pasos**:
1. Ve a la pestaña "Panel"
2. Observa las tarjetas de métricas

**Resultado Esperado**:
```
Ganancia Total:    $X.XXX,X
Ingresos Totales:  $X.XXX,X
Costo Total:       $X.XXX,X
```

**Formato**: Un decimal, punto como miles, coma como decimal

---

### ✅ Test 2: Tabla de Productos
**Pasos**:
1. Ve a "Productos"
2. Crea un producto nuevo con precio de venta: **1234.567**

**Resultado Esperado** en tabla:
```
Costo Real:  $XX,X
Precio Venta: $1.234,5
Ganancia:    $XXX,X
```

**Verificación**: El precio debe mostrar como **$1.234,5**

---

### ✅ Test 3: Modal de Productos
**Pasos**:
1. En el modal de nuevo producto
2. Ingresa:
   - Costo Adicional: **0.50**
   - % de Utilidad: **30**

**Resultado Esperado** en resumen:
```
Costo Real:      $XX,X
Utilidad (30%):  $X,X
Precio Sugerido: $XX,X
```

---

### ✅ Test 4: Tabla de Ingredientes
**Pasos**:
1. Ve a "Ingredientes"
2. Crea un ingrediente:
   - Nombre: Harina
   - Presentación: 1000
   - Costo Compra: **500.00**
   - Merma: 5%

**Resultado Esperado** en tabla:
```
Costo Compra:  $500,0
Costo Unit Real: $0,5
```

---

### ✅ Test 5: Modal de Ingredientes
**Pasos**:
1. Crea el ingrediente anterior (Harina)
2. Mira el resumen de cálculo en el modal

**Resultado Esperado**:
```
Costo Real = ($500,0 ÷ 1000) × (1 + 5%)
= $0,5 por unidad
```

---

### ✅ Test 6: Recetas
**Pasos**:
1. Ve a "Recetas"
2. Crea una receta con ingredientes

**Resultado Esperado**:
```
Costo Base: $XXX,X
```

En la card de receta mostrada con formato correcto

---

### ✅ Test 7: Promociones
**Pasos**:
1. Ve a "Promociones"
2. Crea una promoción con descuento

**Resultado Esperado** en card:
```
Precio Original:  $XXX,X
Descuento (10%): -$XX,X
Precio Final:     $XXX,X
```

---

### ✅ Test 8: Cambio de Moneda
**Pasos**:
1. Ve a "Configuración"
2. Selecciona otra moneda (EUR, ARS, etc.)
3. Vuelve a cualquier página con montos

**Resultado Esperado**:
```
Símbolo cambia (€, $, etc.)
Pero formato mantiene: X.XXX,X
```

---

### ✅ Test 9: Números Pequeños
**Pasos**:
1. Crea un ingrediente con costo pequeño: **0.015**
2. Con presentación: **1**

**Resultado Esperado**:
```
Costo Unit Real: $0,0 (redondeado)
```

---

### ✅ Test 10: Números Grandes
**Pasos**:
1. Crea un producto con precio: **10500.555**

**Resultado Esperado**:
```
$10.500,5 (con separador de miles)
```

---

## 📋 Checklist de Verificación

- [ ] Dashboard muestra montos con formato correcto
- [ ] Tabla de Productos usa formato en costo/precio
- [ ] Modal de Productos muestra resumen formateado
- [ ] Tabla de Ingredientes formatea costo compra y unitario
- [ ] Recetas muestran costo base formateado
- [ ] Promociones muestran precios con formato
- [ ] Cambio de moneda no rompe el formato
- [ ] Números pequeños se redondean a 1 decimal
- [ ] Números grandes tienen separador de miles
- [ ] Funciona en móvil y desktop

---

## 🐛 Problemas Potenciales a Revisar

| Problema | Solución |
|----------|----------|
| Formato no aplica | Verificar que se importó `formatMoneyDisplay` |
| Símbolo incorrecto | Revisar `formatCurrency` en `formatters.js` |
| Más de 1 decimal | Verificar que usa `toFixed(1)` |
| Sin separador miles | Revisar regex en `formatCurrency` |
| Coma no aparece | Verificar reemplazo de `.` por `,` |

---

## ✅ Validación Final

```javascript
// Probar en consola del navegador:
// (si tiene acceso a las funciones)

formatMoneyDisplay(1234.567)    // Debe dar: "$1.234,5"
formatMoneyDisplay(1000)        // Debe dar: "$1.000,0"
formatMoneyDisplay(0.01050)     // Debe dar: "$0,0"
```

---

**Última actualización**: Diciembre 2024
