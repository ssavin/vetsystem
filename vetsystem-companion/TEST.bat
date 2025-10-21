@echo off
chcp 65001 >nul
cls
echo.
echo ================================================
echo ТЕСТ: Проверка исправления __dirname
echo ================================================
echo.

cd /d "%~dp0"

echo Запуск теста...
echo.
node test-dirname.js

if errorlevel 1 (
    echo.
    echo ОШИБКА: Тест не прошёл
    echo.
    echo Это означает, что package.json НЕ содержит "type": "module"
    echo.
    echo Откройте package.json и убедитесь, что есть строка:
    echo   "type": "module",
    echo.
) else (
    echo.
    echo ================================================
    echo ТЕСТ ПРОШЁЛ! Исправление работает.
    echo ================================================
    echo.
    echo Теперь можно собирать приложение:
    echo   npm run build:win
    echo.
)

pause
