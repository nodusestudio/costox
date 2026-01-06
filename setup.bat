@echo off
REM Script de inicialización para CostoX en Windows
REM Instala dependencias e inicia servidor de desarrollo

echo.
echo 🚀 Inicializando CostoX...
echo.

REM Verificar si Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js no está instalado
    echo    Por favor, instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js encontrado: %NODE_VERSION%
echo ✅ npm encontrado: %NPM_VERSION%
echo.

REM Instalar dependencias
echo 📦 Instalando dependencias...
call npm install

if errorlevel 1 (
    echo ❌ Error al instalar dependencias
    pause
    exit /b 1
)

echo.
echo ✅ Dependencias instaladas correctamente
echo.
echo 🎉 Setup completado!
echo.
echo Próximos pasos:
echo   npm run dev      - Iniciar servidor de desarrollo
echo   npm run build    - Compilar para producción
echo   npm run preview  - Previsualizar build
echo.
pause
