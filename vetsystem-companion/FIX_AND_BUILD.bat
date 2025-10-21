@echo off
chcp 65001 >nul
cls
echo.
echo ================================================
echo АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ И СБОРКА
echo ================================================
echo.

cd /d "%~dp0"

echo [1/4] Создание резервной копии...
if not exist backup mkdir backup
copy "src\main\index.ts" "backup\index.ts.%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%.bak" >nul 2>&1
echo Готово
echo.

echo [2/4] Исправление файла src\main\index.ts...

powershell -Command "$content = Get-Content 'src\main\index.ts' -Raw; if ($content -notmatch 'fileURLToPath') { $content = $content -replace \"import \{ app, BrowserWindow, ipcMain \} from 'electron';\r?\nimport path from 'path';\", \"import { app, BrowserWindow, ipcMain } from 'electron';`nimport path from 'path';`nimport { fileURLToPath } from 'url';`n`n// Get __dirname equivalent in ES modules`nconst __filename = fileURLToPath(import.meta.url);`nconst __dirname = path.dirname(__filename);\"; Set-Content 'src\main\index.ts' -Value $content; Write-Host 'Файл исправлен' } else { Write-Host 'Файл уже исправлен' }"

echo.

echo [3/4] Очистка старых сборок...
if exist dist rmdir /s /q dist
if exist release rmdir /s /q release
echo Готово
echo.

echo [4/4] Сборка приложения (это займёт 3-5 минут)...
echo.
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm run build:win

if errorlevel 1 (
    echo.
    echo ================================================
    echo ОШИБКА СБОРКИ
    echo ================================================
    echo.
    echo Восстановление из резервной копии...
    for /f "delims=" %%i in ('dir /b /od backup\index.ts.*.bak 2^>nul') do set LASTBACKUP=%%i
    if defined LASTBACKUP (
        copy "backup\%LASTBACKUP%" "src\main\index.ts" /Y >nul
        echo Файл восстановлен
    )
    pause
    exit /b 1
)

echo.
echo ================================================
echo УСПЕШНО!
echo ================================================
echo.
echo Установщик создан:
dir release\*.exe
echo.
echo Теперь:
echo 1. Закройте старую версию приложения (если запущена)
echo 2. Установите новую версию из папки release\
echo 3. Запустите приложение
echo.
pause
