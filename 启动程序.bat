@echo off
chcp 936 >nul
title RedBook AI Assistant

echo.
echo ========================================
echo   RedBook TV Copy AI Assistant
echo   AI Powered Parameter Check and Polish
echo ========================================
echo.

cd /d "%~dp0"

:: Check if running from temp/zip directory
echo %cd% | findstr /i /c:"Temp" /c:"360zip" /c:"$Temp" /c:"7z" >nul 2>&1
if %errorlevel% equ 0 (
    echo [ERROR] Please extract the zip file first!
    echo.
    echo Current path: %cd%
    echo.
    echo This program is running from a temporary directory.
    echo Please extract ALL files to a normal folder first,
    echo for example: D:\redbook-ai
    echo Then run this script from the extracted folder.
    echo.
    pause
    exit /b 1
)

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    echo Download: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do echo Node.js version: %%v

:: Check standalone build
if not exist ".next\standalone\server.js" (
    echo.
    echo [INFO] First run - building application...
    echo This may take a few minutes, please wait...
    echo.
    
    if not exist "node_modules" (
        echo Installing dependencies...
        call npm install
        if %errorlevel% neq 0 (
            echo [ERROR] npm install failed!
            pause
            exit /b 1
        )
    )
    
    echo Building application...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed!
        pause
        exit /b 1
    )
    
    echo Preparing standalone files...
    call node scripts\prepare-standalone.js
    if %errorlevel% neq 0 (
        echo [ERROR] Prepare standalone failed!
        pause
        exit /b 1
    )
)

:: Verify server.js exists
if not exist ".next\standalone\server.js" (
    echo [ERROR] server.js not found after build!
    echo Please try deleting .next folder and run again.
    pause
    exit /b 1
)

echo Starting server...
echo.

:: Set environment variables
set PORT=3000
set HOSTNAME=localhost

:: Start server in standalone directory
cd /d "%~dp0.next\standalone"
start /b node server.js

:: Wait for server to be ready (using powershell for HTTP check)
echo Waiting for server...
set RETRY=0
:wait_loop
if %RETRY% geq 30 (
    echo [ERROR] Server startup timeout!
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul
set /a RETRY=%RETRY%+1
powershell -command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 goto wait_loop

echo.
echo ========================================
echo   Server is running!
echo   URL: http://localhost:3000
echo.
echo   Do NOT close this window.
echo   Press any key to stop the server.
echo ========================================
echo.

:: Open browser
start "" "http://localhost:3000"

:: Keep window open
pause >nul

:: Kill node process for this server
taskkill /f /im node.exe >nul 2>&1
echo Server stopped.
timeout /t 2 >nul
