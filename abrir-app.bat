@echo off
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python nao encontrado. Abrindo o app diretamente no navegador...
  start "" "%~dp0index.html"
  exit /b 0
)
start "AgroAgua - servidor" /min python -m http.server 8124
timeout /t 2 >nul
start "" "http://127.0.0.1:8124/index.html"
