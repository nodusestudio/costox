# ❓ FAQ - Preguntas Frecuentes

## 🚀 Instalación y Primeros Pasos

### ¿Cómo instalo CostoX?

**Windows:**
```bash
# Opción 1: Doble-click en setup.bat
double-click setup.bat

# Opción 2: Manual
npm install
npm run dev
```

**macOS/Linux:**
```bash
chmod +x setup.sh
./setup.sh
npm run dev
```

---

### ¿Qué versión de Node.js necesito?

Node.js 16+ (recomendado 18+)

Verifica con: `node --version`

Descarga desde: https://nodejs.org/

---

### ¿En qué puerto se ejecuta?

`http://localhost:5173`

Se abre automáticamente en tu navegador.

---

## 💾 Datos y Almacenamiento

### ¿Dónde se guardan mis datos?

En **localStorage** del navegador. No se envía a servidores.

**Ubicación técnica:** `localStorage.getItem('costox_*')`

---

### ¿Qué pasa si limpio el cache del navegador?

**Se pierden todos los datos.** 

Solución: Exportar a PDF antes (próxima versión) o hacer backup manual.

---

### ¿Puedo usar CostoX en múltiples dispositivos?

Actualmente **NO**. Cada dispositivo tiene sus propios datos en localStorage.

Futuras versiones incluirán sincronización en nube.

---

### ¿Es seguro guardar datos aquí?

✅ **Sí, es seguro:**
- No se envía a internet
- Sin servidor backend
- Sin tracking
- Sin publicidad

❌ **Pero:**
- Datos se pierden si limpias cache
- No hay backup automático
- Limitado a ~5-10 MB por navegador

---

## 📊 Cálculos y Fórmulas

### ¿Cómo se calcula el Costo Real Unitario?

```
Costo Real = (Costo Compra ÷ Cantidad) × (1 + % Merma ÷ 100)
```

**Ejemplo:**
- Harina: $500 por 1000g con 3% merma
- = ($500 ÷ 1000) × (1 + 3÷100)
- = $0.515 por gramo ✓

---

### ¿Por qué le sumas el % de merma?

Porque en la cocina **siempre hay pérdida:**
- Evaporación de líquidos
- Recortes de frutas/verduras
- Residuos en máquinas
- Desperdicios normales

El % de merma asegura que tu costo **incluya esas pérdidas**.

---

### ¿Qué merma debería usar?

| Ingrediente | Merma Típica |
|-----------|-------------|
| Harinas | 3-5% |
| Azúcares | 2-3% |
| Frutas frescas | 10-15% |
| Verduras | 8-12% |
| Levadura fresca | 5-8% |
| Chocolate | 2-3% |
| Mantequilla/Aceite | 1-2% |

---

### ¿Cómo calculo el Precio Sugerido?

```
Precio Venta = Costo Real × (1 + % Utilidad ÷ 100)
```

**Ejemplo:**
- Costo real: $100
- Utilidad deseada: 50%
- Precio = $100 × (1 + 50÷100) = **$150**

---

### ¿Qué % de utilidad debería usar?

| Producto | Utilidad Típica |
|----------|-----------------|
| Panes simples | 30-40% |
| Facturas/Medialunas | 40-60% |
| Tartas personalizadas | 50-80% |
| Combos (descuentados) | 20-30% |
| Productos premium | 60-100% |

---

### ¿Cómo se calcula el Margen?

```
Margen % = (Precio Venta - Costo Real) ÷ Precio Venta × 100
```

**¿Por qué dividir por Precio Venta y no por Costo?**

Porque así ves **qué % del precio final es ganancia**, no qué % de markup es.

**Ejemplo:**
- Costo: $100, Precio: $150
- Margen = ($150 - $100) ÷ $150 × 100 = **33.3%**
- De cada $150 que vendes, $50 es ganancia pura.

---

### ¿Por qué la alerta de margen bajo es 30%?

Es un **estándar de la industria gastronómica**:
- ✅ 30%+ = Buena rentabilidad
- ⚠️ 20-30% = Aceptable pero vigilar
- ❌ <20% = Mala rentabilidad

Es configurable si quieres otro límite.

---

## 🎨 Interfaz y Diseño

### ¿Por qué modo oscuro?

✅ Es más fácil para los ojos (especialmente en cocina)  
✅ Ahorra batería en celulares OLED  
✅ Estilo moderno y profesional  
✅ Sigue manual de identidad FODEXA  

---

### ¿Funciona bien en móviles?

✅ **Sí, está optimizado para móviles:**
- Bottom navigation en celular
- Tablas con scroll horizontal
- Botones grandes y táctiles
- Responsive en tablets

---

### ¿Puedo cambiar la moneda?

✅ **Sí.** Ve a Settings ⚙️

Opciones: USD, EUR, ARS, MXN, COP, CLP, BRL, PEN

El símbolo se adapta automáticamente en los cálculos.

---

### ¿Puedo cambiar el idioma?

✅ **Sí.** Ve a Settings ⚙️

Actualmente: Español, English, Português

(Más idiomas en futuras versiones)

---

## 🔧 Desarrollo y Customización

### ¿Cómo agrego un nuevo módulo?

1. Crea archivo en `src/pages/MiPagina.jsx`
2. Implementa componente React
3. Agrega importación en `App.jsx`
4. Agrega a array de `tabs`
5. Importa icon de `lucide-react`

---

### ¿Cómo cambio los colores?

En `tailwind.config.js` sección `extend.colors`:

```javascript
colors: {
  'dark-bg': '#111827',      // Fondo oscuro
  'dark-card': '#1f2937',    // Tarjetas
  'primary-blue': '#206DDA', // Azul primario
  'success-green': '#10b981', // Verde éxito
}
```

Luego usa: `bg-primary-blue`, `text-success-green`, etc.

---

### ¿Cómo agrego un nuevo campo en Ingredientes?

1. Edita `Ingredients.jsx`
2. Agrega campo en `formData` estado
3. Agrega input en modal
4. Actualiza guardado en `handleSave()`
5. Verifica cálculos si afectan

---

### ¿Puedo exportar los datos?

**Actualmente NO**, pero:
- Están en localStorage
- Puedes hacer backup manual
- Próxima versión incluirá export PDF/Excel

Para hacer backup manual:
```javascript
// En consola del navegador:
localStorage.getItem('costox_products')
```

---

## ❌ Problemas Comunes

### "No se ve la app en navegador"

**Solución:**
1. Abre `http://localhost:5173`
2. Si dice "conectando"... espera 10s
3. Si da error: `npm run dev` nuevamente
4. Limpia cache: Ctrl+Shift+Delete

---

### "Los estilos de Tailwind no cargan"

**Verificar:**
1. `src/styles/globals.css` existe
2. Se importa en `src/main.jsx`
3. `tailwind.config.js` está configurado
4. Reinicia servidor: Ctrl+C y `npm run dev`

---

### "Alias @ no funciona"

**Verificar:**
1. `jsconfig.json` existe con paths
2. `vite.config.js` tiene alias
3. Reinicia servidor

---

### "Se pierden los datos al refrescar"

**Comprueba:**
1. `storage.js` está guardando correctamente
2. LocalStorage no está bloqueado
3. Navegador privado/incógnito bloquea storage

**Solución:** Usa navegador normal, no privado.

---

### "Modal no se cierra"

Verificar que el botón tiene:
```javascript
onClick={() => setShowModal(false)}
```

---

### "Números no salen bien calculados"

Recuerda usar `toFixed(2)` para dinero:

```javascript
const precio = 123.456789
console.log(precio.toFixed(2)) // "123.46" ✓
```

---

## 🚀 Deployment/Producción

### ¿Cómo despliego a producción?

```bash
# 1. Build optimizado
npm run build

# 2. Archivo: dist/ contiene tu app
#    Lista para subir a servidor web

# 3. Opciones de hosting GRATIS:
#    - Vercel (https://vercel.com)
#    - Netlify (https://netlify.com)
#    - GitHub Pages
```

---

### ¿Puedo usar en Android/iPhone?

✅ **Como web app:**
- Abre en navegador móvil
- Agrega a pantalla de inicio (favoritos)

❌ **Como aplicación nativa:** Requiere React Native (futura versión)

---

### ¿Cuál es el límite de almacenamiento?

~5-10 MB por navegador.

Con productos típicos: **10,000+ registros sin problema**

---

## 📞 ¿Más Dudas?

- **Documentación:** Lee `README.md`
- **Ejemplos prácticos:** Ve `EJEMPLOS.md`
- **Guía desarrollo:** Consulta `DEVELOPMENT.md`
- **Índice completo:** Ver `INDEX.md`

---

## 🎓 Próximas Versiones

- [ ] v1.1: Exportar a PDF/Excel
- [ ] v1.2: Gráficos y estadísticas
- [ ] v1.3: Búsqueda y filtros avanzados
- [ ] v2.0: Sincronización en la nube
- [ ] v2.1: Integración con InventarioX
- [ ] v3.0: Aplicación nativa (iOS/Android)

---

**¿No encontraste tu pregunta? 💬**

Crea un issue en GitHub o contacta al equipo de desarrollo.

**¡Gracias por usar CostoX! 🚀**
