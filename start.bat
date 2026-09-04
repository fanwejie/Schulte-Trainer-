@echo off
setlocal
chcp 65001 >nul
title Schulte Grid Trainer
cd /d "%~dp0"

rem ---- Prefer the bundled runtime (no Node.js install needed) ----
set "BUNDLED_NODE=%~dp0runtime\node\node.exe"
if exist "%BUNDLED_NODE%" goto :use_bundled

rem ---- Fall back to a system-installed Node.js ----
where node >nul 2>nul
if not errorlevel 1 goto :use_system

echo.
echo [ERROR] node.exe was not found.
echo Please make sure the whole folder was copied, including:
echo   runtime\node\node.exe
echo Then double-click this file again.
echo.
pause
exit /b 1

:use_bundled
set "NODE_CMD=%BUNDLED_NODE%"
goto :run

:use_system
set "NODE_CMD=node"
goto :run

:run
"%NODE_CMD%" server.js
echo.
echo Service stopped. You can close this window.
pause
