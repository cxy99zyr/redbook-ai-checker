@echo off
chcp 65001 >nul
title 小红书电视文案参数校核助手

echo.
echo ========================================
echo   小红书电视文案参数校核助手
echo   AI 驱动 · 参数校核 · 文案润色
echo ========================================
echo.

cd /d "%~dp0"

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: 检查 standalone 目录
if not exist ".next\standalone\server.js" (
    echo [提示] 首次运行，正在构建应用...
    echo 这可能需要几分钟，请耐心等待...
    echo.
    call npm install
    call npm run build
    call node scripts\prepare-standalone.js
)

echo 正在启动服务器，请稍候...
echo.

:: 设置环境变量
set PORT=3000
set HOSTNAME=localhost

:: 在 standalone 目录启动服务器（后台运行）
cd .next\standalone
start /b node server.js

:: 等待服务器启动
echo 等待服务器就绪...
:wait_loop
timeout /t 1 /nobreak >nul
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 goto wait_loop

echo.
echo ========================================
echo   服务已启动！
echo   访问地址: http://localhost:3000
echo.
echo   请勿关闭此窗口
echo   按 Ctrl+C 可停止服务
echo ========================================
echo.

:: 打开浏览器
start "" "http://localhost:3000"

:: 保持窗口打开（等待用户按键退出）
echo 服务运行中，按任意键停止服务...
pause >nul

:: 结束 node 进程
taskkill /f /im node.exe >nul 2>&1
echo 服务已停止。
timeout /t 2 >nul
