# 🚀 Guía de Desarrollo - CostoX

## Inicio Rápido

### Primer Setup
```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Abrir en navegador
# http://localhost:5173
```

## Estructura del Proyecto

```
costox/
├── src/
│   ├── components/       # Componentes reutilizables
│   │   ├── Modal.jsx     # Modal genérico
│   │   └── Button.jsx    # Botón personalizado
│   │
│   ├── pages/           # Páginas/pantallas principales
│   │   ├── Dashboard.jsx
│   │   ├── Suppliers.jsx
│   │   ├── Ingredients.jsx
│   │   ├── Recipes.jsx
│   │   ├── Products.jsx
│   │   ├── Promotions.jsx
│   │   └── Settings.jsx
│   │
│   ├── styles/          # Estilos globales
│   │   └── globals.css  # TailwindCSS + custom
│   │
│   ├── utils/           # Utilidades
│   │   └── storage.js   # LocalStorage API
│   │
│   ├── App.jsx          # Componente principal y navegación
│   └── main.jsx         # Punto de entrada
│
├── index.html           # HTML template
├── vite.config.js       # Configuración de Vite
├── tailwind.config.js   # Tema de Tailwind
├── jsconfig.json        # Configuración de JS
└── package.json         # Dependencias
```

## Comandos Disponibles

```bash
# Desarrollo
npm run dev         # Inicia servidor Vite en puerto 5173

# Build
npm run build       # Crea bundle optimizado en /dist

# Preview
npm run preview     # Previsualiza build de producción localmente
```

## Cómo Agregar Nuevas Funcionalidades

### 1. Agregar una Nueva Página
1. Crear archivo en `src/pages/MiPagina.jsx`
2. Implementar el componente funcional
3. Importar en `App.jsx`
4. Agregar a array de `tabs` con icon de Lucide

### 2. Agregar Almacenamiento
Usar las funciones de `src/utils/storage.js`:
```javascript
import { getFromStorage, saveToStorage } from '@/utils/storage'

// Obtener datos
const datos = getFromStorage('miClave', [])

// Guardar datos
saveToStorage('miClave', nuevosDatos)
```

### 3. Agregar Componente Reutilizable
1. Crear en `src/components/MiComponente.jsx`
2. Exportar como default
3. Importar donde se necesite: `import MiComponente from '@/components/MiComponente'`

## Patrones y Convenciones

### Almacenamiento (Storage)
Prefijo utilizado: `costox_`
```javascript
// Clave guardada en localStorage: "costox_suppliers"
getSuppliers()  // Obtiene array de proveedores
saveSuppliers() // Guarda proveedores
```

### Estilos
- Usar clases de Tailwind
- Colores personalizados disponibles:
  - `bg-dark-bg`, `bg-dark-card` (oscuro)
  - `text-primary-blue` (azul #206DDA)
  - `text-success-green` (verde #10b981)

### IDs Únicos
Se usan timestamps: `Date.now()`

### Formatos de Números
Precios y decimales: `numero.toFixed(2)`

## Notas Importantes

### LocalStorage Limits
- Límite típico: 5-10MB
- CostoX debería funcionar bien con miles de registros
- Los datos se pierden si el navegador limpia cache

### Mobile-First
- Primero diseñar para móvil
- Usar breakpoints: `md:` para desktop
- Testing en dispositivos reales si es posible

### Accesibilidad
- Usar etiquetas `<label>` con inputs
- Mantener contraste adecuado
- Textos grandes y botones táctiles

## Debugging

### Local Storage Inspector
```javascript
// En consola del navegador:
localStorage.getItem('costox_config')     // Ver config
localStorage.getItem('costox_products')   // Ver productos
localStorage.clear()                       // Limpiar TODO (⚠️ cuidado!)
```

### Errores Comunes
1. **"Cannot find module '@/..."**: Verificar alias en `vite.config.js` y `jsconfig.json`
2. **Estilos no cargan**: Verificar que `globals.css` está importado en `main.jsx`
3. **Datos se pierden**: LocalStorage puede ser limitado o bloqueado en navegadores privados

## Performance

- React.memo() para componentes costosos
- Evitar renders innecesarios con hooks adecuados
- LocalStorage es síncrono (considerar para muchos datos)

## Próximas Mejoras

- [ ] Sincronización en la nube
- [ ] Exportar a PDF/Excel
- [ ] Gráficos avanzados (Chart.js, Recharts)
- [ ] Sistema de usuarios
- [ ] Temas personalizables
- [ ] Modo offline avanzado

---

**Happy Coding! 🚀**
