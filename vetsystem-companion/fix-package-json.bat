@echo off
chcp 65001 >nul
echo.
echo ================================================
echo Fixing package.json for Windows build
echo ================================================
echo.

cd /d "%~dp0"

echo Creating backup...
copy package.json package.json.backup >nul
echo Backup created: package.json.backup
echo.

echo Fixing package.json...
powershell -Command "(Get-Content package.json -Raw) -replace '\"win\": \{[^}]*\"icon\": \"build/icon.ico\"[^}]*\}', '\"win\": {\"target\": [\"nsis\"], \"icon\": \"build/icon.ico\", \"sign\": false}' | Set-Content package.json"
powershell -Command "$json = Get-Content package.json -Raw | ConvertFrom-Json; if (-not $json.build.forceCodeSigning) { $json.build | Add-Member -NotePropertyName 'forceCodeSigning' -NotePropertyValue $false -Force }; if (-not $json.build.afterSign) { $json.build | Add-Member -NotePropertyName 'afterSign' -NotePropertyValue $null -Force }; $json | ConvertTo-Json -Depth 10 | Set-Content package.json"

echo.
echo ================================================
echo Fixed! Now run build.bat
echo ================================================
echo.
pause
