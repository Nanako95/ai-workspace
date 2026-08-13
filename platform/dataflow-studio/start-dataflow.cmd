@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
start "DataFlow" http://127.0.0.1:4317
call npm run dev -- --port 4317
