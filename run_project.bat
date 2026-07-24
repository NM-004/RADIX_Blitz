@echo off
echo ==============================================================
echo           RADIX Talent Match Hackathon Startup Script
echo ==============================================================
echo.

:: Check for Docker
echo [1/7] Launching PostgreSQL database in Docker...
docker-compose -f db/docker-compose.db.yml up -d
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker compose failed to start. Make sure Docker Desktop is running!
    pause
    exit /b %ERRORLEVEL%
)
echo Database container is up and running.
echo.

:: Install Python dependencies for FastAPI & Seed script
echo [2/7] Verifying Python requirements...
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b %ERRORLEVEL%
)
echo.

:: Install Node.js Backend dependencies
echo [3/7] Setting up Node.js Backend dependencies...
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

:: Prisma Setup
echo [4/7] Syncing database schema with Prisma ORM...
npx prisma db push --schema=db/schema.prisma
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Prisma db push failed.
    pause
    exit /b %ERRORLEVEL%
)
echo Schema synchronized.
echo.

echo [5/7] Generating Prisma Clients (Node.js and Python)...
npx prisma generate --schema=db/schema.prisma
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Prisma Client generation failed.
    pause
    exit /b %ERRORLEVEL%
)
echo.

:: Seeding
echo [6/7] Seeding default company expectations (Google, Microsoft, Oracle)...
python db/seed.py
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Seeding script failed.
    pause
    exit /b %ERRORLEVEL%
)
echo Seeding finished.
echo.

:: Start services in new windows
echo [7/7] Launching backend servers...
echo Starting Node.js Backend on http://localhost:8000...
start "Node.js Backend Server" cmd /k "cd backend && npm start"

echo Starting FastAPI Analytics Microservice on http://localhost:8001...
start "FastAPI Analytics Microservice" cmd /k "uvicorn microservices.main:app --port 8001 --reload"

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
echo - FastAPI Microservice: http://localhost:8001
echo - React Frontend: http://localhost:5173
echo.
echo Press any key to close this installer console.
pause
