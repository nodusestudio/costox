# 📚 Ejemplos de Uso - CostoX

## 🎯 Caso de Uso: Panadería "El Buen Pan"

### Paso 1: Configuración Global

**Pantalla:** Settings ⚙️

```
Nombre empresa: El Buen Pan
Chef: Juan Pérez
Moneda: ARS (Peso Argentino)
Idioma: Español
Merma global: 5%
```

---

## Paso 2: Crear Proveedores

**Pantalla:** Proveedores 👥

```
Proveedor 1:
├─ Nombre: Molineria Distribuidora
└─ Categoría: Harinas

Proveedor 2:
├─ Nombre: Lacteos Don Pepe
└─ Categoría: Lácteos

Proveedor 3:
├─ Nombre: Dulces y Cía
└─ Categoría: Azúcares
```

---

## Paso 3: Crear Ingredientes

**Pantalla:** Ingredientes 🥘

### Ejemplo 1: Harina
```
Nombre: Harina 000 Premium
Proveedor: Molineria Distribuidora
Presentación: 1000 gr
Costo compra: $500
Merma: 3%

Cálculo:
  Costo Real = ($500 ÷ 1000) × (1 + 3÷100)
             = $0.5150 por gramo
```

### Ejemplo 2: Mantequilla
```
Nombre: Mantequilla Sin Sal
Proveedor: Lacteos Don Pepe
Presentación: 250 gr
Costo compra: $180
Merma: 2%

Cálculo:
  Costo Real = ($180 ÷ 250) × (1 + 2÷100)
             = $0.7344 por gramo
```

### Ejemplo 3: Levadura
```
Nombre: Levadura Fresca
Proveedor: Molineria Distribuidora
Presentación: 500 gr
Costo compra: $120
Merma: 8% (levadura = +merma)

Cálculo:
  Costo Real = ($120 ÷ 500) × (1 + 8÷100)
             = $0.2592 por gramo
```

---

## Paso 4: Crear Recetas (Escandallos)

**Pantalla:** Recetas 📖

### Receta: Masa de Pan Blanco

```
Nombre: Masa Pan Blanco
Descripción: Masa madre para panes blancos

Ingredientes:
├─ Harina 000         700 gr  → Costo: 700 × $0.5150 = $360.50
├─ Agua               300 ml  → Costo: (valor si está registrada)
├─ Levadura Fresca     20 gr  → Costo: 20 × $0.2592 = $5.18
├─ Sal                 12 gr  → Costo: (valor si está registrada)
└─ Mantequilla        50 gr   → Costo: 50 × $0.7344 = $36.72

Preparación:
1. Mezclar harina con levadura en recipiente
2. Agregar agua gradualmente
3. Amasar 10 minutos
4. Dejar reposar 30 min
5. Incorporar mantequilla y sal
6. Amasar 5 minutos más

COSTO BASE TOTAL: ~$402.40
Foto: [Imagen de la masa]
```

---

## Paso 5: Crear Productos Finales

**Pantalla:** Productos 🛍️

### Producto 1: Pan Blanco (500g)

```
Nombre: Pan Blanco 500g
Receta base: Masa Pan Blanco
Ingredientes adicionales: Ninguno
Costo adicional: $0 (empaque incluido en receta)

Utilidad deseada: 50%

CÁLCULOS AUTOMÁTICOS:
─────────────────────
Costo Real: $402.40

Utilidad (50%):
  = $402.40 × 50% = $201.20

PRECIO SUGERIDO: $603.60 ✓✓✓

Margen: 33.3% ✓ (BUENO)
Ganancia: $201.20
```

### Producto 2: Pan Integral (500g)

```
Nombre: Pan Integral 500g
Receta base: Masa Pan Integral
Ingredientes adicionales: 
├─ Salvado de trigo  50 gr

Utilidad deseada: 40% (menos que blanco, es más fácil hacer)

CÁLCULOS AUTOMÁTICOS:
─────────────────────
Costo Real: $385.90
Precio Sugerido: $540.26
Margen: 28.6% ⚠️ (BAJO, considerar subir %)
```

### Producto 3: Medialunas (6 unidades)

```
Nombre: Medialunas x6
Receta base: Masa Hojaldre
Ingredientes adicionales:
├─ Relleno de dulce de leche  60 gr

Utilidad deseada: 60% (menos trabajo de horneado)

CÁLCULOS AUTOMÁTICOS:
─────────────────────
Costo Real: $145.30
Precio Sugerido: $232.48
Margen: 37.5% ✓ (EXCELENTE)
Ganancia: $87.18
```

---

## Paso 6: Crear Promociones (Combos)

**Pantalla:** Promociones 🎉

### Combo 1: Desayuno Completo

```
Nombre: Combo Desayuno
Descripción: Pan, medialunas y mantequilla para compartir

Productos en combo:
├─ Pan Blanco 500g         × 1
├─ Medialunas x6            × 1
└─ Mantequilla 250g         × 1

Descuento aplicado: 15%

CÁLCULOS AUTOMÁTICOS:
─────────────────────
Costo total: $989.08
Precio original: $1,376.34

Descuento (15%): -$206.45
PRECIO FINAL: $1,169.89 ✓

Ganancia: $180.81
Margen: 15.5% ❌ BAJO (< 30%)

⚠️ ALERTA ROJA: Este combo no es rentable
   Sugerencia: Reducir descuento a 8% o aumentar productos
```

### Combo 2: Promoción Economía

```
Nombre: Promo Panadería Familiar
Descripción: Lo mejor de la tienda

Productos:
├─ Pan Blanco 500g         × 2
├─ Pan Integral 500g        × 1
├─ Medialunas x6            × 1
└─ Facturas variadas        × 6

Descuento: 10%

CÁLCULOS AUTOMÁTICOS:
─────────────────────
Costo: $1,245.60
Original: $1,895.20
Descuento: -$189.52
PRECIO FINAL: $1,705.68

Margen: 26.9% ⚠️ AÚN BAJO

Pero es atractivo para clientes...
```

---

## Paso 7: Monitorear en Dashboard

**Pantalla:** Dashboard 📈

### Resumen Diario (después de varias ventas)

```
┌─────────────────────────────────────┐
│ DASHBOARD - El Buen Pan             │
├─────────────────────────────────────┤

MÉTRICAS PRINCIPALES:
─────────────────────
Ganancia Total:       $2,847.30 ✓
Ingresos Totales:     $8,432.10
Costo Total:          $5,584.80
Margen Promedio:      33.7% ✓

⚠️ ALERTAS:
  - 2 productos con margen < 30%
  - 1 promoción con margen < 30%

PRODUCTOS DESTACADOS:
─────────────────────
1. Medialunas x6       $232.48  (37.5% margen)
2. Pan Blanco 500g     $603.60  (33.3% margen)
3. Pan Integral 500g   $540.26  (28.6% margen) ⚠️

PROMOCIONES ACTIVAS:
──────────────────
1. Combo Desayuno      $1,169.89 (15.5% margen) ❌
2. Promo Familia       $1,705.68 (26.9% margen) ⚠️
```

---

## 💡 Tips y Mejores Prácticas

### 1. **Merma**
- Harinas: 3-5%
- Frutas/Verduras: 10-15%
- Levadura fresca: 5-8%
- Granos: 2-3%

### 2. **Márgenes Recomendados**
- Panes simples: 30-40%
- Facturas/Medialunas: 40-50%
- Combos: Mínimo 25-30%
- Promociones: Estudiar bien (clientes)

### 3. **Actualizar Costos**
- Revisar mensualmente
- Cambiar proveedores si sube precio
- Ajustar precio de venta sin perder margen

### 4. **Análisis de Rentabilidad**
- ¿Pan integral es menos rentable? Quizás subir %
- ¿Combo no cierra? Reducir cantidad o descuento
- Comparar márgenes entre productos

---

## 📊 Fórmulas Rápidas

### Costo Real por Unidad
```
= (Precio Compra ÷ Cantidad) × (1 + Merma%)
```

### Precio Sugerido
```
= Costo Real × (1 + Utilidad%)
```

### Margen en %
```
= (Precio Venta - Costo Real) ÷ Precio Venta × 100
```

### Ganancia por Unidad
```
= Precio Venta - Costo Real
```

---

## 🎯 Objetivo Final

✅ Que sepas exactamente cuánto ganas con cada producto  
✅ Identificar productos de baja rentabilidad  
✅ Tomar decisiones informadas sobre precios  
✅ Maximizar ganancias sin subir tanto el precio  

**¡Éxito con tu negocio! 🍞💰**
