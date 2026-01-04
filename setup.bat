@echo off
REM JSON Repair - Automated Setup Script for Windows
REM This script automates the setup process for first-time users

echo ==========================================
echo   JSON Repair - Automated Setup
echo ==========================================
echo.

REM Check if Node.js is installed
echo Step 1: Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js ^(^>=18.x^) from https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm found: v%NPM_VERSION%

echo.

REM Clean existing installation if present
if exist "node_modules" (
    echo [WARNING] Existing node_modules found. Cleaning up...
    rmdir /s /q node_modules
    echo [OK] Cleaned node_modules
)

if exist ".next" (
    rmdir /s /q .next
    echo [OK] Cleaned .next build directory
)

echo.

REM Install dependencies
echo Step 2: Installing dependencies...
echo This may take a few minutes...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)

echo [OK] Dependencies installed successfully

echo.
echo ==========================================
echo [SUCCESS] Setup completed successfully!
echo ==========================================
echo.
echo To start the development server, run:
echo.
echo   npm run dev
echo.
echo Then open your browser to: http://localhost:3002
echo.
echo For more information, see:
echo   - README.md - Quick start guide
echo   - RCA.md - Technical details and troubleshooting
echo   - INSTALLATION.md - Detailed installation guide
echo.
pause

