@echo off
cd /d "%~dp0"
if not exist "node_modules" (
  echo Run npm install first.
  exit /b 1
)
node src/index.js
