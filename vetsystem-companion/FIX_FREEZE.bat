@echo off
chcp 65001 >nul
cls
echo.
echo ================================================
echo ИСПРАВЛЕНИЕ ЗАВИСАНИЯ
echo ================================================
echo.

cd /d "%~dp0"

echo Создаём резервную копию...
if not exist "backup" mkdir backup
copy "src\main\index.ts" "backup\index.ts.backup" >nul 2>&1
echo Готово
echo.

echo Исправляем файл src\main\index.ts...

powershell -Command "(Get-Content 'src\main\index.ts') -replace '../renderer/index.html', '../index.html' | Set-Content 'src\main\index.ts'"

echo Готово
echo.

echo ================================================
echo Файл исправлен!
echo ================================================
echo.
echo Теперь запустите: rebuild-quick.bat
echo.
pause
