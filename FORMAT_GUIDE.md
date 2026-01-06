# 💰 Guía de Formato de Moneda - CostoX

## Formato Implementado

Todos los montos en la aplicación utilizan un formato consistente:

### Características:
- **Decimales**: 1 solo decimal (redondeado)
- **Separador de miles**: Punto (.)
- **Separador decimal**: Coma (,)
- **Símbolo de moneda**: Según configuración

### Ejemplos:

| Valor Numérico | Formato Mostrado | Descripción |
|---|---|---|
| 1234.567 | $1.234,5 | Precio con decimales |
| 1000 | $1.000,0 | Mil con cero decimales |
| 15 | $15,0 | Número pequeño |
| 0.01050 | $0,0 | Costo unitario redondeado |
| 10500.1 | $10.500,1 | Número grande |

## Cómo Funciona

### Función de Formato

Se creó `src/utils/formatters.js` con dos funciones principales:

#### `formatCurrency(value)`
Convierte un número al formato: `1.234,5`
```javascript
formatCurrency(1234.567) // → "1.234,5"
formatCurrency(10) // → "10,0"
```

#### `formatMoneyDisplay(value, currencyCode)`
Añade símbolo de moneda: `$1.234,5`
```javascript
formatMoneyDisplay(1234.567) // → "$1.234,5"
formatMoneyDisplay(1234.567, 'EUR') // → "€1.234,5"
```

### Monedas Soportadas
- USD ($)
- EUR (€)
- ARS ($)
- MXN ($)
- COP ($)
- CLP ($)
- BRL (R$)
- PEN (S/)

## Archivos Actualizados

### Páginas con Formato Aplicado:
1. **Dashboard.jsx** - Métricas principales (ganancias, ingresos, costos)
2. **Products.jsx** - Tabla de productos y cálculos de precios
3. **Recipes.jsx** - Costo base de recetas
4. **Ingredients.jsx** - Costos de compra y costos unitarios reales
5. **Promotions.jsx** - Precios de promociones y descuentos
6. **Settings.jsx** - Ejemplos de cálculos

## Dónde se Aplica

### Tablas de Datos:
- Costo Real ✓
- Precio de Venta ✓
- Costo Total ✓
- Ingresos Totales ✓
- Ganancias ✓

### Modales de Edición:
- Resumen de cálculos ✓
- Precios sugeridos ✓
- Cálculos de utilidad ✓

### Tarjetas y Cards:
- Costo base de recetas ✓
- Precios de promociones ✓
- Métricas del dashboard ✓

## Ejemplo de Uso en Componentes

```jsx
import { formatMoneyDisplay } from '@/utils/formatters'

// En JSX:
<td>{formatMoneyDisplay(product.salePrice)}</td>
// Resultado: $1.234,5

// Con diferentes monedas:
<span>{formatMoneyDisplay(amount, config.currency)}</span>
```

## Notas Importantes

- ✅ Se redondea a 1 decimal (redondeado matemático)
- ✅ Los separadores se aplican automáticamente
- ✅ Compatible con todas las monedas configurables
- ✅ Funciona con números negativos también
- ✅ Persiste en localStorage con la configuración de idioma

## Testing

Para verificar el formato correctamente:

1. Crear un producto con precio $1234.567
2. Verificar que se muestre como **$1.234,5** en tablas
3. Cambiar la moneda en Settings
4. Verificar que cambia el símbolo pero mantiene el formato

## Migración de Código Antiguo

Si encuentras código antiguo con `toFixed(2)`, reemplázalo:

```javascript
// ❌ Viejo
$${price.toFixed(2)}

// ✅ Nuevo
{formatMoneyDisplay(price)}
```

---

**Última actualización**: Diciembre 2024
**Formato versión**: 1.0
