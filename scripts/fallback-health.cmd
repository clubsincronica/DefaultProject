@echo off
rem Wrapper para el Programador de tareas de Windows.
rem Verifica la cadena de fallback de OpenCode y deja el resultado en
rem logs\fallback-health.json / logs\fallback-health.log
setlocal
cd /d "%~dp0.."
if not exist "logs" mkdir "logs"
node "%~dp0health-check-fallbacks.mjs" >> "logs\fallback-health-task.log" 2>&1
exit /b %ERRORLEVEL%
