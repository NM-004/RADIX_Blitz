@echo off
echo ==============================================================
echo           RADIX Talent Match Hackathon Startup Script
echo ==============================================================
echo.

:: Check for Docker
echo [1/8] Launching PostgreSQL database in Docker...
docker-compose -f db/docker-compose.db.yml up -d
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker compose failed to start. Make sure Docker Desktop is running!
    pause
    exit /b %ERRORLEVEL%
)
echo Database container is up and running.
echo.

:: Install Node.js Backend dependencies (pins Prisma 5.17.0 and installs tsx)
echo [2/8] Setting up Node.js Backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install Node.js backend dependencies.
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
cd ..
echo Node.js packages installed.
echo.

:: Install Python dependencies for THREE microservices
echo [3/8] Installing Python requirements for Parser, Talent Check, & Skill Match...
pip install -r microservices/parser_service/requirements.txt
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install Parser service Python dependencies.
    pause
    exit /b %ERRORLEVEL%
)
pip install -r microservices/talent_check_service/requirements.txt
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install Talent Check service Python dependencies.
    pause
    exit /b %ERRORLEVEL%
)
pip install -r microservices/skill_match_service/requirements.txt
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install Skill Match service Python dependencies.
    pause
    exit /b %ERRORLEVEL%
)
echo Python requirements verified.
echo.

:: Prisma Setup (Run from backend folder)
echo [4/8] Syncing database schema with Prisma ORM...
cd backend
call npx prisma@5.17.0 db push
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Prisma db push failed.
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
echo Schema synchronized.
echo.

echo [5/8] Generating Prisma Clients (Node.js and Python)...
call npx prisma@5.17.0 generate
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Prisma Client generation failed.
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
echo.

:: Seeding (Run from backend folder using local tsx configuration)
echo [6/8] Seeding baseline benchmarks & mock candidate profiles...
call npm run prisma:seed
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Seeding script failed.
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
echo Seeding finished.
echo.

:: Start services in new windows
echo [7/8] Launching backend servers...
echo Starting Node.js Backend on http://localhost:8000...
start "Node.js Backend Server" cmd /k "npm start"

echo Starting FastAPI Document Parser on http://localhost:8001...
start "FastAPI Document Parser" cmd /k "uvicorn microservices.parser_service.main:app --port 8001 --reload"

echo Starting FastAPI Talent Check & Search on http://localhost:8002...
start "FastAPI Talent Check & Search" cmd /k "uvicorn microservices.talent_check_service.main:app --port 8002 --reload"

echo Starting FastAPI Skill Match & Assessments on http://localhost:8003...
start "FastAPI Skill Match & Assessments" cmd /k "uvicorn microservices.skill_match_service.main:app --port 8003 --reload"
cd ..

echo.
echo ==============================================================
echo                     React Frontend Setup
echo ==============================================================
echo Setup will now install frontend Node modules and start Vite.
echo.

cd frontend
echo Installing npm packages...
call npm install

echo Starting React Development Server on http://localhost:5173...
start "React Vite Frontend" cmd /k "npm run dev"

echo.
echo ==============================================================
echo           Services started successfully!
echo ==============================================================
echo - Node.js Backend: http://localhost:8000
echo - FastAPI Parser Service: http://localhost:8001
echo - FastAPI Talent Check & Job Finder: http://localhost:8002
echo - FastAPI Skill Match & Assessments: http://localhost:8003
echo - React Frontend: http://localhost:5173
echo.
echo Press any key to close this installer console.
pause
