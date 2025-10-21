@echo off
:: Check for admin rights
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with Administrator privileges...
    goto :build
) else (
    echo.
    echo ========================================
    echo Please run this file as Administrator!
    echo ========================================
    echo.
    echo Right-click on build-admin.bat
    echo and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

:build
chcp 65001 >nul
cls
echo.
echo ================================================
echo VetSystem Companion - Building Installer
echo ================================================
echo.

echo [1/2] Checking Node.js...
node --version 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    pause
    exit /b 1
)
echo OK
echo.

echo [2/2] Building installer (as Administrator)...
echo This will take 5-10 minutes...
echo.
cd /d "%~dp0"
call npm run build:win

if errorlevel 1 (
    echo.
    echo BUILD ERROR!
    pause
    exit /b 1
)

echo.
echo ================================================
echo SUCCESS!
echo ================================================
echo.
echo Installer created:
echo release\VetSystem Companion Setup 1.0.0.exe
echo.
pause
