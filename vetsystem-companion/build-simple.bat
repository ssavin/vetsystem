@echo off
chcp 65001 >nul
cls
echo.
echo ================================================
echo VetSystem Companion - Сборка установщика
echo ================================================
echo.

echo [1/2] Проверка Node.js...
node --version 2>nul
if errorlevel 1 (
    echo ОШИБКА: Node.js не установлен!
    echo Скачайте с https://nodejs.org/
    pause
    exit /b 1
)
echo OK
echo.

echo [2/2] Сборка установщика...
echo Это займет 5-10 минут, пожалуйста подождите...
echo.
call npm run build:win

if errorlevel 1 (
    echo.
    echo ОШИБКА при сборке!
    echo Проверьте сообщения об ошибках выше.
    pause
    exit /b 1
)

echo.
echo ================================================
echo ГОТОВО!
echo ================================================
echo.
echo Установщик создан:
echo release\VetSystem-Companion-Setup-1.0.0.exe
echo.
echo Вы можете раздать этот файл клиникам.
echo.
pause
