# 🚀 CostoX Potenciado con Firebase

Sistema completo de gestión de costos para restaurantes con Firestore y lógica de negocio avanzada.

## ✨ Características Implementadas

### 1. 🥘 Ingredientes con Merma del 30%
- Merma del **30% aplicada automáticamente** (configurable por ingrediente)
- Cálculo automático de `costWithWastage` (costo de compra + merma)
- Importación/Exportación Excel
- Filtrado por proveedor
- Guardado en Firestore

### 2. 📖 Recetas (Sub-productos)
- Pueden crearse usando **ingredientes** o **recetas existentes**
- Las recetas pueden usarse como "ingredientes" en Productos y Combos
- Cálculo automático del costo total
- Guardado en Firestore

### 3. 🍔 Productos
- Se arman combinando **ingredientes** y **recetas**
- **Cálculos automáticos:**
  - Costo Total
  - Margen de Utilidad (% y $)
  - Precio Sugerido
  - Precio Real de Venta (editable)
- Guardado en Firestore

### 4. 🎁 Combos con Inteligencia de Descuento
- Mezcla de **productos** e **ingredientes**
- **Análisis inteligente:**
  - Muestra cuánto descuento se está dando
  - Calcula el margen de ganancia restante
  - **Alertas automáticas** si hay pérdidas
  - **Advertencia** si el margen es menor al 20%
- Guardado en Firestore

### 5. 🗄️ Persistencia con Firestore
- Todos los datos se guardan en Firebase Firestore
- Funciones asíncronas con async/await
- Manejo de errores robusto
- Cálculos automáticos en el servidor

### 6. 🎨 UI Modo Oscuro
- Diseño limpio y profesional
- Optimizado para uso en restaurante
- Responsive (móvil y desktop)
- Colores consistentes con identidad FODEXA

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Variables de entorno ya configuradas en .env
# (Firebase credentials)

# Ejecutar en desarrollo
npm run dev
```

## 📱 Uso

1. **Settings** → Configura tu empresa (merma global: 30%)
2. **Proveedores** → Registra proveedores
3. **Ingredientes** → Agrega ingredientes (merma automática del 30%)
4. **Recetas** → Crea recetas usando ingredientes u otras recetas
5. **Productos** → Combina recetas/ingredientes y define precios
6. **Combos** → Crea combos con análisis inteligente de descuentos
7. **Dashboard** → Monitorea todo

## 🔐 Seguridad

- Variables de entorno protegidas en `.env`
- `.gitignore` configurado para no subir credenciales
- Firebase rules deben configurarse para producción

## 📊 Estructura de Datos

### Ingrediente
```javascript
{
  name: string
  supplierId: string
  unit: string (kg, gr, lt, ml, un)
  purchaseCost: number
  wastagePercent: number (default: 30)
  costWithWastage: number (auto-calculado)
}
```

### Receta
```javascript
{
  name: string
  description: string
  ingredients: [
    { type: 'ingredient'|'recipe', id: string, quantity: number }
  ]
  totalCost: number (auto-calculado)
}
```

### Producto
```javascript
{
  name: string
  description: string
  items: [
    { type: 'ingredient'|'recipe', id: string, quantity: number }
  ]
  profitMarginPercent: number
  totalCost: number (auto-calculado)
  profitMarginAmount: number (auto-calculado)
  suggestedPrice: number (auto-calculado)
  realSalePrice: number (editable)
}
```

### Combo
```javascript
{
  name: string
  description: string
  items: [
    { type: 'product'|'ingredient', id: string, quantity: number }
  ]
  totalCost: number (auto-calculado)
  totalSuggestedPrice: number (auto-calculado)
  comboPrice: number (editable)
  discountAmount: number (auto-calculado)
  discountPercent: number (auto-calculado)
  profitAmount: number (auto-calculado)
  profitMarginPercent: number (auto-calculado)
  isLosing: boolean (auto-calculado)
}
```

## 🎯 Fórmulas

### Costo con Merma
```
costWithWastage = purchaseCost × (1 + wastagePercent / 100)
```

### Precio Sugerido de Producto
```
suggestedPrice = totalCost + (totalCost × profitMarginPercent / 100)
```

### Margen de Combo
```
profitMarginPercent = ((comboPrice - totalCost) / comboPrice) × 100
```

## 🚨 Reglas de Negocio

1. **Merma obligatoria**: 30% por defecto, editable por ingrediente
2. **Recetas reutilizables**: Pueden usarse en productos y combos
3. **Precio real editable**: El usuario puede modificar el precio sugerido
4. **Combos inteligentes**: Alertan si hay pérdidas o margen bajo (<20%)
5. **Todo en Firestore**: Persistencia completa en la nube

## 📦 Próximos Pasos

- [ ] Implementar reglas de Firebase Security
- [ ] Agregar autenticación de usuarios
- [ ] Mejorar importación Excel con librería
- [ ] Dashboard con gráficos
- [ ] Historial de cambios de precios
- [ ] Reportes PDF

---

**Desarrollado con React + Vite + Firebase + Tailwind CSS**
