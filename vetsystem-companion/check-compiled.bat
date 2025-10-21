@echo off
chcp 65001 >nul
echo.
echo Проверка скомпилированного файла...
echo.
findstr /C:"fileURLToPath" dist\main\index.js
if errorlevel 1 (
    echo ПРОБЛЕМА: fileURLToPath НЕ найден в dist\main\index.js
    echo.
    echo Это означает, что TypeScript не скомпилировал код правильно.
    echo.
) else (
    echo ОК: fileURLToPath найден в скомпилированном файле
    echo.
)
echo.
findstr /C:"__dirname" dist\main\index.js | findstr /C:"path.dirname"
if errorlevel 1 (
    echo ПРОБЛЕМА: __dirname не определён правильно
) else (
    echo ОК: __dirname определён
)
echo.
pause
