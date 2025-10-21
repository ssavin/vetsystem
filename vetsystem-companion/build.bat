@echo off
echo ================================================
echo VetSystem Companion - Сборка установщика
echo ================================================
echo.

echo Шаг 1/3: Проверка Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Node.js не установлен!
    echo Скачайте с https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo OK!
echo.

echo Шаг 2/3: Установка зависимостей...
call npm install
if errorlevel 1 (
    echo [ОШИБКА] Не удалось установить зависимости
    pause
    exit /b 1
)
echo OK!
echo.

echo Шаг 3/3: Сборка установщика...
call npm run build:win
if errorlevel 1 (
    echo [ОШИБКА] Не удалось собрать установщик
    pause
    exit /b 1
)
echo.

echo ================================================
echo ГОТОВО!
echo ================================================
echo Установщик: release\VetSystem-Companion-Setup-1.0.0.exe
echo.
pause
