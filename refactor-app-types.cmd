@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "TARGET=%~1"

if "%TARGET%"=="" (
  set "TARGET=apps\web\src\App.tsx"
)

node "%SCRIPT_DIR%refactor-app-types.cjs" "%TARGET%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Refactor gagal. App.tsx asli tidak seharusnya berubah jika proses berhenti sebelum penulisan.
  exit /b %EXIT_CODE%
)

echo.
echo Refactor type selesai.
exit /b 0
