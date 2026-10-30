@echo off
chcp 65001 >nul
echo =========================================================================
echo  AIVES - KHỞI ĐỘNG TẤT CẢ DỊCH VỤ (DATABASE + PYTHON AI + SPRING BOOT)
echo =========================================================================

echo [1/3] Kich hoat Docker Database PostgreSQL...
docker compose up -d postgres
timeout /t 2 >nul

echo [2/3] Khoi chay Python AI Examiner (Port 8000)...
start "AIVES - Python AI Examiner" cmd /k "cd /d "%~dp0python" && if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) && python run.py"

echo [3/3] Khoi chay Spring Boot Backend (Port 8080)...
start "AIVES - Spring Boot Backend" cmd /k "cd /d "%~dp0back-end" && call mvnw.cmd spring-boot:run"

echo.
echo =========================================================================
echo  He thong dang khoi chay:
echo   - Database PostgreSQL: 127.0.0.1:5432/aives_db
echo   - Python AI WebSocket: ws://127.0.0.1:8000/ws/live/sessions/{id}
echo   - Spring Boot REST API: http://127.0.0.1:8080/api
echo =========================================================================
pause
