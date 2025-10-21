@echo off
chcp 65001 >nul
cls
echo.
echo ================================================
echo Quick Rebuild (without reinstalling dependencies)
echo ================================================
echo.

cd /d "%~dp0"

echo Deleting old build...
if exist dist rmdir /s /q dist
if exist release rmdir /s /q release
echo.

echo Building (3-5 minutes)...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm run build:win

if errorlevel 1 (
    echo BUILD FAILED
    pause
    exit /b 1
)

echo.
echo ================================================
echo SUCCESS!
echo ================================================
echo.
echo Installer: release\VetSystem Companion-Setup-1.0.0.exe
echo.
pause
