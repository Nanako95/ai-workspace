@echo off
setlocal
title Project Pilot - Local Data Service
set "APP_DIR=%~dp0"
set "NODE_EXE="

if exist "%APP_DIR%runtime\node.exe" set "NODE_EXE=%APP_DIR%runtime\node.exe"

if not defined NODE_EXE (
  where node >nul 2>nul
  if not errorlevel 1 set "NODE_EXE=node"
)

if not defined NODE_EXE (
  set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if exist "%BUNDLED_NODE%" set "NODE_EXE=%BUNDLED_NODE%"
)

if not defined NODE_EXE (
  echo Node.js was not found. Opening index.html in browser-storage mode.
  start "" "%APP_DIR%index.html"
  pause
  exit /b 1
)

"%NODE_EXE%" "%APP_DIR%server.js"
if errorlevel 1 (
  echo The local data service could not start. Opening index.html directly.
  start "" "%APP_DIR%index.html"
  pause
)
endlocal
