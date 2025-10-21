@echo off
chcp 65001 >nul
cls
echo.
echo ================================================
echo Building DEBUG version
echo ================================================
echo.

cd /d "%~dp0"

echo Создаём резервную копию...
copy "src\main\index.ts" "src\main\index.ts.backup" >nul 2>&1
echo.

echo Заменяем на отладочную версию...
copy "src\main\index-debug.ts" "src\main\index.ts" /Y >nul
echo.

echo Сборка (3-5 минут)...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm run build:win

if errorlevel 1 (
    echo.
    echo СБОРКА ПРОВАЛЕНА
    echo Восстанавливаем оригинальный файл...
    copy "src\main\index.ts.backup" "src\main\index.ts" /Y >nul
    pause
    exit /b 1
)

echo.
echo Восстанавливаем оригинальный файл...
copy "src\main\index.ts.backup" "src\main\index.ts" /Y >nul
echo.

echo ================================================
echo DEBUG версия собрана!
echo ================================================
echo.
echo Установщик: release\VetSystem Companion-Setup-1.0.0.exe
echo.
echo После установки запустите приложение.
echo Откроется консоль разработчика с логами.
echo Сделайте скриншот консоли и отправьте мне.
echo.
pause
