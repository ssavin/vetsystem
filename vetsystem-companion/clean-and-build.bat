@echo off
chcp 65001 >nul
cls
echo.
echo ================================================
echo Clean rebuild
echo ================================================
echo.

cd /d "%~dp0"

echo [1/5] Deleting node_modules...
if exist node_modules rmdir /s /q node_modules
echo Done
echo.

echo [2/5] Deleting dist...
if exist dist rmdir /s /q dist
echo Done
echo.

echo [3/5] Deleting electron-builder cache...
if exist "%LOCALAPPDATA%\electron-builder\Cache" rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache"
echo Done
echo.

echo [4/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR during npm install
    pause
    exit /b 1
)
echo Done
echo.

echo [5/5] Building (this takes 5-10 minutes)...
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
echo Installer: release\VetSystem Companion Setup 1.0.0.exe
echo.
pause
