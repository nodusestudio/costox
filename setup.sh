#!/bin/bash

# Script de inicialización para CostoX
# Instala dependencias y inicia servidor de desarrollo

echo "🚀 Inicializando CostoX..."
echo ""

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "   Por favor, instala Node.js desde https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"
echo "✅ npm encontrado: $(npm --version)"
echo ""

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error al instalar dependencias"
    exit 1
fi

echo ""
echo "✅ Dependencias instaladas correctamente"
echo ""
echo "🎉 Setup completado!"
echo ""
echo "Próximos pasos:"
echo "  npm run dev      → Iniciar servidor de desarrollo"
echo "  npm run build    → Compilar para producción"
echo "  npm run preview  → Previsualizar build"
echo ""
