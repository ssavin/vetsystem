@echo off
chcp 1251 >nul
cls
echo.
echo ================================================
echo VetSystem Companion - Build Installer
echo ================================================
echo.

echo [1/2] Checking Node.js...
node --version 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Download from https://nodejs.org/
    pause
    exit /b 1
)
echo OK
echo.

echo [2/2] Building installer...
echo This will take 5-10 minutes, please wait...
echo.
call npm run build:win

if errorlevel 1 (
    echo.
    echo BUILD ERROR!
    echo Check error messages above.
    pause
    exit /b 1
)

echo.
echo ================================================
echo SUCCESS!
echo ================================================
echo.
echo Installer created:
echo release\VetSystem-Companion-Setup-1.0.0.exe
echo.
echo You can distribute this file to clinics.
echo.
pause
