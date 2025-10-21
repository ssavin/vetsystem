@echo off
chcp 65001 >nul
cls
echo.
echo ================================================
echo VetSystem Companion - Build WITHOUT Signing
echo ================================================
echo.

cd /d "%~dp0"

echo Setting environment variables...
set CSC_IDENTITY_AUTO_DISCOVERY=false
set WIN_CSC_LINK=
set WIN_CSC_KEY_PASSWORD=
set DEBUG=electron-builder
echo Done
echo.

echo Building installer (5-10 minutes)...
echo.
call npm run build:win

if errorlevel 1 (
    echo.
    echo ================================================
    echo BUILD FAILED
    echo ================================================
    pause
    exit /b 1
)

echo.
echo ================================================
echo SUCCESS!
echo ================================================
echo.
echo Installer location:
dir release\*.exe
echo.
pause
