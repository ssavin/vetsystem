@echo off
chcp 65001 >nul
cls
echo.
echo ================================================
echo VetSystem Companion - ФИНАЛЬНАЯ СБОРКА
echo ================================================
echo.

cd /d "%~dp0"

echo [1/3] Очистка старых файлов...
if exist dist rmdir /s /q dist
if exist release rmdir /s /q release
echo Готово
echo.

echo [2/3] Сборка приложения (3-5 минут)...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm run build:win

if errorlevel 1 (
    echo.
    echo ================================================
    echo ОШИБКА СБОРКИ
    echo ================================================
    pause
    exit /b 1
)

echo.
echo [3/3] Проверка результата...
if exist "release\VetSystem Companion-Setup-1.0.0.exe" (
    echo.
    echo ================================================
    echo УСПЕШНО!
    echo ================================================
    echo.
    echo Установщик создан:
    echo release\VetSystem Companion-Setup-1.0.0.exe
    echo.
    echo Размер:
    dir "release\VetSystem Companion-Setup-1.0.0.exe" | find "VetSystem"
    echo.
) else (
    echo.
    echo ОШИБКА: Установщик не найден
    echo.
)

pause
