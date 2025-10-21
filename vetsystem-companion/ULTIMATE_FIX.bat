@echo off
chcp 65001 >nul
cls
echo.
echo ================================================
echo ПОЛНОЕ ИСПРАВЛЕНИЕ VETSYSTEM COMPANION
echo ================================================
echo.

cd /d "%~dp0"

echo [1/5] Создание резервной копии...
if not exist backup mkdir backup
xcopy src backup\src\ /E /I /Y >nul 2>&1
copy package.json backup\package.json.bak >nul 2>&1
echo Готово
echo.

echo [2/5] Исправление package.json...
(
echo {
echo   "name": "vetsystem-companion",
echo   "version": "1.0.0",
echo   "type": "module",
echo   "description": "VetSystem Offline Companion - Desktop application for veterinary clinic management",
echo   "main": "dist/main/index.js",
echo   "author": "VetSystem",
echo   "license": "MIT",
echo   "private": true,
echo   "scripts": {
echo     "dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
echo     "dev:vite": "vite",
echo     "dev:electron": "wait-on http://localhost:5173 && electron .",
echo     "build": "tsc && vite build && electron-builder",
echo     "build:win": "npm run build -- --win",
echo     "build:mac": "npm run build -- --mac",
echo     "build:linux": "npm run build -- --linux"
echo   },
echo   "dependencies": {
echo     "better-sqlite3": "^9.4.0",
echo     "axios": "^1.6.7",
echo     "electron-store": "^8.1.0"
echo   },
echo   "devDependencies": {
echo     "@types/better-sqlite3": "^7.6.9",
echo     "@types/node": "^20.11.19",
echo     "@types/react": "^18.2.55",
echo     "@types/react-dom": "^18.2.19",
echo     "@vitejs/plugin-react": "^4.2.1",
echo     "autoprefixer": "^10.4.17",
echo     "concurrently": "^8.2.2",
echo     "electron": "^28.2.3",
echo     "electron-builder": "^24.9.1",
echo     "esbuild": "^0.19.12",
echo     "postcss": "^8.4.35",
echo     "tailwindcss": "^3.4.1",
echo     "typescript": "^5.3.3",
echo     "vite": "^5.1.3",
echo     "vite-plugin-electron": "^0.28.3",
echo     "vite-plugin-electron-renderer": "^0.14.5",
echo     "wait-on": "^7.2.0",
echo     "react": "^18.2.0",
echo     "react-dom": "^18.2.0",
echo     "wouter": "^3.0.0",
echo     "@tanstack/react-query": "^5.20.5",
echo     "react-hook-form": "^7.50.0",
echo     "@hookform/resolvers": "^3.3.4",
echo     "zod": "^3.22.4",
echo     "lucide-react": "^0.323.0",
echo     "date-fns": "^3.3.1"
echo   }
echo }
) > package.json
echo Готово
echo.

echo [3/5] Исправление src\main\index.ts - добавление import.meta.url...
powershell -Command "$content = Get-Content 'src\main\index.ts' -Raw; if ($content -notmatch 'fileURLToPath') { $newImport = \"import { app, BrowserWindow, ipcMain } from 'electron';`nimport path from 'path';`nimport { fileURLToPath } from 'url';`nimport { DatabaseManager } from './database';`nimport { SyncService } from './sync-service';`nimport Store from 'electron-store';`n`n// ES module __dirname equivalent`nconst __filename = fileURLToPath(import.meta.url);`nconst __dirname = path.dirname(__filename);\"; $content = $content -replace \"import \{ app, BrowserWindow, ipcMain \} from 'electron';.*?import Store from 'electron-store';\", $newImport -replace '[\r\n]+', \"`r`n\"; Set-Content 'src\main\index.ts' -Value $content; Write-Host 'Файл исправлен!' } else { Write-Host 'Файл уже содержит fileURLToPath' }"
echo.

echo [4/5] Полная очистка перед сборкой...
if exist node_modules rmdir /s /q node_modules
if exist dist rmdir /s /q dist
if exist release rmdir /s /q release
echo Готово
echo.

echo [5/5] Переустановка зависимостей и сборка...
echo Это займёт 5-10 минут. Пожалуйста, ждите...
echo.
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm install
if errorlevel 1 (
    echo ОШИБКА npm install
    pause
    exit /b 1
)

echo.
echo Сборка приложения...
call npm run build:win
if errorlevel 1 (
    echo ОШИБКА СБОРКИ
    pause
    exit /b 1
)

echo.
echo ================================================
echo УСПЕХ! Приложение собрано.
echo ================================================
echo.
echo Установщик: release\VetSystem Companion-Setup-1.0.0.exe
echo.
dir release\*.exe
echo.
echo ИНСТРУКЦИЯ:
echo 1. Закройте старую версию приложения
echo 2. Установите новую из папки release\
echo 3. Запустите - теперь всё должно работать!
echo.
pause
