@echo off
echo Starting LLS Terminal...

start "Backend" cmd /k "cd /d %~dp0backend && ..\.venv\Scripts\uvicorn.exe app:app --reload"
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
