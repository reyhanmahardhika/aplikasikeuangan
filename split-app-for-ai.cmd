@echo off
setlocal

if "%~1"=="" (
  echo Usage: split-app-for-ai.cmd "path\to\App.tsx" [output-folder]
  exit /b 1
)

set "SCRIPT_DIR=%~dp0"
node "%SCRIPT_DIR%split-app-for-ai.cjs" "%~1" "%~2"

if errorlevel 1 (
  echo.
  echo Split failed.
  exit /b 1
)

echo.
echo Split completed successfully.
endlocal
