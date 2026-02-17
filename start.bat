@echo off
title AUFA - Nube de Ligas
echo.
echo ===================================
echo    AUFA - Nube de Ligas
echo    Iniciando sistema...
echo ===================================
echo.
node start.js %*
if errorlevel 1 (
    echo.
    echo [ERROR] Hubo un problema. Verifica que Node.js esta instalado.
    echo         Descargalo de: https://nodejs.org
    echo.
    pause
)
