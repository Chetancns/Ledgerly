@echo off
cd /d "%~dp0"

REM Start App 1
start cmd /k "cd ledgerly_app && npm run dev"

REM Start App 2
start cmd /k "cd ledgerly-api && npm start"