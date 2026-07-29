@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "TARGET=%~1"

if "%TARGET%"=="" (
  set "TARGET=src\App.tsx"
)

node "%SCRIPT_DIR%refactor-app-final.cjs" "%TARGET%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Refactor final gagal. Periksa pesan error di atas.
  exit /b %EXIT_CODE%
)

echo.
echo Refactor final selesai.
exit /b 0
