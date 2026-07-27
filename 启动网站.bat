@echo off
rem ============================================================
rem  Relearn 学习网站 - 一键启动
rem  由于站点使用 ES Modules，需要通过本地 HTTP 服务访问
rem ============================================================
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo   Relearn 可视化学习网站
echo   正在启动本地服务 http://localhost:8642 ...
echo   按 Ctrl+C 可停止服务
echo.

start "" "http://localhost:8642"
python -m http.server 8642 --bind 127.0.0.1
