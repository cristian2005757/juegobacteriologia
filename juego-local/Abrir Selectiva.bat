@echo off
cd /d "%~dp0"
title Selectiva
echo.
echo  Selectiva
echo.
echo  El juego se abre en el navegador.
echo  No cierres esta ventana mientras juegas.
echo  Para salir, cierra esta ventana.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0abrir.ps1"
echo.
echo  Selectiva se cerro.
pause
