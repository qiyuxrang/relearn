@echo off
cd /d "%~dp0"
echo.
echo Relearn local site
echo Starting http://127.0.0.1:8642/
echo Press Ctrl+C to stop.
echo.
start "" "http://127.0.0.1:8642/index.html"
python -m http.server 8642 --bind 127.0.0.1
