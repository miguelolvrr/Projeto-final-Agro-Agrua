@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Prepare o ambiente antes de iniciar:
  echo python -m venv .venv
  echo .venv\Scripts\python.exe -m pip install -r requirements.txt
  pause
  exit /b 1
)
echo AgroAgua - servidor Flask
echo Abra http://127.0.0.1:8124 no navegador.
echo Para encerrar, pressione Ctrl+C nesta janela.
".venv\Scripts\python.exe" backend\app.py
if errorlevel 1 pause
