# 🎯 START HERE - COMIENZA AQUÍ

¡Bienvenido a **CostoX**! 🚀

Esta es tu **guía de inicio** en 3 minutos.

---

## 1️⃣ INSTALA (2 minutos)

### Windows
```bash
double-click setup.bat
# O abre terminal y escribe:
npm install && npm run dev
```

### macOS/Linux
```bash
chmod +x setup.sh
./setup.sh
npm run dev
```

### ¿Qué pasa?
- Se instalan todas las dependencias
- Se abre el servidor en `http://localhost:5173`
- ¡La app está lista en tu navegador!

---

## 2️⃣ PRIMEROS PASOS (1 minuto)

Una vez que ves CostoX en tu navegador:

### Paso 1: Configuración ⚙️
Ve a **Settings** y completa:
- Nombre de tu empresa
- Tu nombre
- Moneda (USD, ARS, MXN, etc)
- % de merma global (5-10% es típico)

### Paso 2: Proveedores 👥
Crea 2-3 proveedores:
- "Distribuidor ABC"
- "Lácteos Don Pepe"
- "Frutas Frescas"

### Paso 3: Ingredientes 🥘
Agrega 3 ingredientes con:
- Nombre
- Proveedor
- Costo de compra
- % de merma

**¡El costo real se calcula automático!**

### Paso 4: Recetas 📖
Crea una receta base (ej: "Masa de Pan"):
- Agrega tus ingredientes
- Escribe la preparación
- ¡El costo base se calcula!

### Paso 5: Productos 🛍️
Crea un producto:
- Selecciona tu receta
- Ingresa % de utilidad deseada (30-50%)
- ¡Ve el PRECIO SUGERIDO en grande!

### Paso 6: Promociones 🎉
Agrupa 2-3 productos en un combo:
- Si el margen baja de 30%, verás ⚠️ ALERTA ROJA

### Paso 7: Dashboard 📊
¡Mira tu rentabilidad en tiempo real!

---

## 3️⃣ APRENDE MÁS

### Archivos de Documentación

```
📖 README.md
   └─ Todo lo que necesitas saber

⚡ QUICK_START.md
   └─ Guía rápida de inicio

📚 EJEMPLOS.md
   └─ Caso real: Panadería "El Buen Pan"
      Veras cómo usar CostoX paso a paso

❓ FAQ.md
   └─ Preguntas frecuentes respondidas

🔍 REFERENCE.md
   └─ Hoja de trucos (cheat sheet)

📂 PROJECT_TREE.md
   └─ Estructura completa del proyecto
```

---

## 💡 CONCEPTOS CLAVE

### Costo Real Unitario
```
= (Costo Compra ÷ Cantidad) × (1 + Merma%)
```
**Incluye las pérdidas normales** (evaporación, recortes, etc)

### Precio Sugerido
```
= Costo Real × (1 + Utilidad%)
```
**Tú decides el % de ganancia que quieres**

### Margen
```
= (Precio - Costo) ÷ Precio × 100
```
**Qué % del precio final es ganancia pura**

⚠️ **Si margen < 30%** → Alerta automática

---

## 🎯 Flujo de Uso (el camino correcto)

```
1. Settings      → Configura tu empresa
   ↓
2. Suppliers     → Registra proveedores
   ↓
3. Ingredients   → Crea insumos con costos
   ↓
4. Recipes       → Crea bases (masas, cremas)
   ↓
5. Products      → Crea productos finales
   ↓
6. Promotions    → Crea combos/descuentos
   ↓
7. Dashboard     → Monitorea tu rentabilidad
```

---

## 📊 Lo Que Verás

### En Dashboard
- Ganancia total en $
- Ingresos totales
- Costo total
- Margen promedio
- Alertas de rentabilidad baja
- Productos destacados
- Promociones activas

### En Cada Módulo
- Tabla clara con tus datos
- Botones para agregar/editar/eliminar
- Cálculos automáticos
- Validaciones
- Guardado automático en tu navegador

---

## 🔐 Seguridad

✅ **Tus datos están SOLO en tu navegador**
- No se envía a internet
- No hay servidor
- Sin seguimiento

❌ **Pero recuerda:**
- Si limpias cache, se pierden datos
- Próxima versión tendrá backup en nube

---

## 💰 Ejemplo Real

Una **Medialunas de 6 unidades:**

```
Ingredientes:
- Masa hojaldre         150g @ $0.50/g = $75
- Relleno dulce leche    60g @ $0.80/g = $48
────────────────────────────────────────
Costo real:                              $123

Utilidad deseada: 50%
Precio sugerido:  $123 × 1.50 = $184.50

Margen: (184.50 - 123) ÷ 184.50 = 33.3% ✓ BUENO
Ganancia: $61.50 por venta
```

---

## 🚀 Comandos Útiles

```bash
npm run dev      # Iniciar desarrollo
npm run build    # Compilar para producción
npm run preview  # Previsualizar build

# Si algo falla:
rm -rf node_modules
npm install      # Instala nuevamente
npm run dev      # Inicia
```

---

## ❓ Ayuda Rápida

### "¿Dónde están mis datos?"
En localStorage del navegador (guardado automático)

### "¿Puedo usar en móvil?"
✅ Sí, funciona perfecto en celulares

### "¿Puedo cambiar la moneda?"
✅ Sí, en Settings ⚙️

### "¿Cuál es el % de merma correcto?"
- Harinas: 3-5%
- Frutas: 10-15%
- Levadura: 5-8%
- Lee FAQ.md para más

### "¿Qué % de utilidad usar?"
- Panes: 30-40%
- Facturas: 40-60%
- Tartas: 50-80%
- Lee EJEMPLOS.md para casos reales

---

## 📞 Más Dudas

Lee estos archivos **en este orden:**

1. 👉 **QUICK_START.md** (si es tu primer uso)
2. 👉 **EJEMPLOS.md** (para ver casos reales)
3. 👉 **FAQ.md** (preguntas frecuentes)
4. 👉 **README.md** (documentación completa)

---

## ✨ Features Principales

✅ Dashboard en tiempo real  
✅ Cálculo automático de costos  
✅ Precio sugerido destacado  
✅ Alertas de margen bajo  
✅ Completamente responsive  
✅ Modo oscuro (diseño profesional)  
✅ Sin conexión a internet necesaria  
✅ Múltiples monedas y idiomas  

---

## 🎓 ¿Estás Listo?

### Para Usuarios Finales
```
1. npm install
2. npm run dev
3. Completa Settings
4. ¡Comienza a usar!
```

### Para Desarrolladores
```
1. Lee DEVELOPMENT.md
2. Explora src/
3. ¡Personaliza!
```

---

## 🎉 ¡ÉXITO!

Ahora tienes una herramienta profesional para:
- ✅ Calcular costos exactos
- ✅ Saber cuánto ganas en cada producto
- ✅ Identificar productos poco rentables
- ✅ Tomar decisiones informadas sobre precios
- ✅ Maximizar ganancias

**¡Que disfrutes CostoX! 💰🚀**

---

## 📊 Próximos Pasos

1. **Ahora:** Abre CostoX en tu navegador
2. **Hoy:** Configura tu empresa y agrega 3 ingredientes
3. **Mañana:** Crea 1-2 productos y mira el margen
4. **Semana:** Monitorea en Dashboard y ajusta precios

---

**¿Lista para empezar? 🚀**

Escribe en terminal:
```bash
npm install && npm run dev
```

¡Que comience la aventura! 🎊
