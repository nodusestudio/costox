# CostoX 📊

**Herramienta hermana de InventarioX para la gestión de costos, escandallos y rentabilidad**

CostoX es una aplicación web moderna y responsiva construida con React (Vite), JavaScript y Tailwind CSS. Diseñada especialmente para pequeños y medianos emprendedores en gastronomía.

## 🎨 Características

### 1. **Identidad Visual (Modo Oscuro)**
- Fondo principal: `#111827`
- Tarjetas: `#1f2937`
- Azul primario: `#206DDA`
- Verde de éxito: `#10b981`
- Tipografía limpia y moderna (Inter)
- Mobile-first y completamente responsivo

### 2. **Módulos Principales**

#### 📈 Dashboard
- Resumen visual de ganancias totales
- Ingresos vs. Costos
- Margen de rentabilidad promedio
- Alertas de margen bajo (< 30%)
- Vista de productos y promociones destacadas

#### 👥 Proveedores
- Registro de nombres y categorías
- Gestión completa (crear, editar, eliminar)
- Organización por categoría

#### 🥘 Ingredientes
- Registro de insumos con campos:
  - Nombre
  - Proveedor asociado
  - Presentación (gramos, mililitros, unidades)
  - Costo de compra
  - % de Merma (editable)
- Cálculo automático de costo real unitario

#### 📖 Recetas (Escandallos)
- Crear bases (ej. Masa de pan)
- Agregar ingredientes por gramaje
- Instrucciones de preparación
- Foto de referencia
- Cálculo automático del costo base

#### 🛍️ Productos Finales
- Combinar recetas e ingredientes
- Definir % de utilidad deseada
- Precio sugerido en grande y destacado
- Cálculo de margen en % y $

#### 🎉 Promociones (Combos)
- Agrupar productos en combos
- Aplicar descuentos
- ⚠️ **Alerta roja si margen < 30%**
- Visualización clara de rentabilidad

#### ⚙️ Configuración Global
- Nombre de empresa
- Nombre del cocinero/responsable
- Tipo de moneda (USD, EUR, ARS, MXN, COP, CLP, BRL, PEN)
- Idioma
- % de Merma Global por defecto

## 📐 Lógica de Cálculos (CRUCIAL)

### Costo Real Unitario
```
Costo Real = (Costo Compra ÷ Cantidad) × (1 + % Merma ÷ 100)
```

**Ejemplo:** Harina a $10 por 1000g con 5% merma:
- = ($10 ÷ 1000) × (1 + 5÷100)
- = **$0.0105 por gramo**

### Precio Sugerido
El usuario ingresa el % de Utilidad deseado y la app calcula:
```
Precio Venta = Costo Real × (1 + % Utilidad ÷ 100)
```

### Rentabilidad
Se muestra en dos formatos:
- **Margen %:** `(Precio Venta - Costo Real) ÷ Precio Venta × 100`
- **Ganancia $:** `Precio Venta - Costo Real`

## 💾 Almacenamiento

- Todos los datos se guardan en **localStorage**
- Acceso sin conexión
- Persistencia en dispositivos móviles
- Sin depender de servidores externos

## 🚀 Instalación y Uso

### Requisitos
- Node.js (v16+)
- npm o yarn

### Instalación

```bash
# Clonar/descargar el proyecto
cd costox

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Previsualizar build de producción
npm run preview
```

El servidor estará disponible en `http://localhost:5173`

## 📱 Optimización Mobile

- Botones grandes y táctiles
- Tablas con scroll lateral
- Navegación por tabs (bottom nav en móvil, sidebar en desktop)
- Interfaz intuitiva y fácil de usar
- Touch-friendly inputs

## 🎯 Flujo de Uso Típico

1. **Configurar empresa** → Settings
2. **Registrar proveedores** → Proveedores
3. **Crear ingredientes** → Ingredientes (con costos y merma)
4. **Crear recetas base** → Recetas
5. **Crear productos finales** → Productos (combinando recetas)
6. **Crear promociones** → Promociones (con descuentos)
7. **Monitorear rentabilidad** → Dashboard

## 🛠️ Stack Tecnológico

- **Framework:** React 18
- **Build Tool:** Vite 4
- **Styling:** Tailwind CSS 3
- **Icons:** Lucide React
- **Storage:** LocalStorage API
- **Language:** JavaScript (ES6+)

## 📦 Estructura de Carpetas

```
costox/
├── src/
│   ├── components/
│   │   ├── Modal.jsx
│   │   └── Button.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Suppliers.jsx
│   │   ├── Ingredients.jsx
│   │   ├── Recipes.jsx
│   │   ├── Products.jsx
│   │   ├── Promotions.jsx
│   │   └── Settings.jsx
│   ├── styles/
│   │   └── globals.css
│   ├── utils/
│   │   └── storage.js
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## 🔒 Seguridad

- Datos almacenados localmente
- Sin transmisión a servidores externos
- Validación de inputs
- Manejo seguro de localStorage

## 📝 Notas

- El sistema utiliza timestamps para IDs únicos
- Todos los números están formateados a 2 decimales
- Las alertas de margen bajo (< 30%) aparecen automáticamente
- El diseño es responsive y optimizado para tablets y smartphones

## 🎓 Próximas Mejoras Potenciales

- [ ] Exportar reportes a PDF/Excel
- [ ] Sincronización en la nube
- [ ] Análisis histórico de costos
- [ ] Integración con InventarioX
- [ ] Sistema de usuarios y contraseña
- [ ] Backup automático

---

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2025  
**Desarrollado para:** FODEXA y Emprendedores Gastronómicos
