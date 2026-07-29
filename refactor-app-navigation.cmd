@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "TARGET=%~1"

if "%TARGET%"=="" (
  set "TARGET=src\App.tsx"
)

node "%SCRIPT_DIR%refactor-app-navigation.cjs" "%TARGET%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Refactor navigasi gagal.
  exit /b %EXIT_CODE%
)

echo.
echo Refactor navigasi selesai.
exit /b 0
