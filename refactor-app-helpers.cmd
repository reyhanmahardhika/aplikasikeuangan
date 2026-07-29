@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "TARGET=%~1"

if "%TARGET%"=="" (
  set "TARGET=src\App.tsx"
)

node "%SCRIPT_DIR%refactor-app-helpers.cjs" "%TARGET%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Refactor helper gagal.
  exit /b %EXIT_CODE%
)

echo.
echo Refactor helper selesai.
exit /b 0
