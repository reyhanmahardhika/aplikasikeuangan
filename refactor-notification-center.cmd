@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "TARGET=%~1"

if "%TARGET%"=="" (
  set "TARGET=src\App.tsx"
)

node "%SCRIPT_DIR%refactor-notification-center.cjs" "%TARGET%"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Refactor NotificationCenter gagal.
  exit /b %EXIT_CODE%
)

echo.
echo Refactor NotificationCenter selesai.
exit /b 0
