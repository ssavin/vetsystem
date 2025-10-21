@echo off
chcp 65001 >nul
cls
echo.
echo ================================================
echo Сборка ОТЛАДОЧНОЙ версии с логами
echo ================================================
echo.

cd /d C:\VetSystem\vetsystem-companion

echo Создание резервной копии...
copy src\main\index.ts src\main\index.ts.original >nul 2>&1

echo Замена на упрощённую версию с логами...
copy src\main\index-simple.ts src\main\index.ts /Y

echo Очистка...
rmdir /s /q dist 2>nul
rmdir /s /q release 2>nul

echo.
echo Сборка (3-5 минут)...
set CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build:win

if errorlevel 1 (
    echo ОШИБКА СБОРКИ
    copy src\main\index.ts.original src\main\index.ts /Y
    pause
    exit /b 1
)

echo.
echo Восстановление оригинального файла...
copy src\main\index.ts.original src\main\index.ts /Y

echo.
echo ================================================
echo ГОТОВО!
echo ================================================
echo.
echo После установки приложение создаст файл debug.log
echo.
echo Найти лог можно так:
echo 1. Нажмите Win+R
echo 2. Введите: %%APPDATA%%\vetsystem-companion
echo 3. Найдите файл debug.log
echo.
echo Или полный путь:
echo C:\Users\%USERNAME%\AppData\Roaming\vetsystem-companion\debug.log
echo.
echo Установите из release\ и запустите приложение.
echo Затем откройте debug.log и отправьте мне его содержимое.
echo.
pause
