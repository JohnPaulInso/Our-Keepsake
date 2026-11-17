@echo off
:: =============================================
:: g.bat - Quick GitHub Upload Script
:: Remote: https://github.com/JohnPaulInso/Our-Keepsake.git
:: Usage:
::   .\g                        -> commits with auto-timestamp
::   .\g "your commit message"  -> commits with your custom message
:: =============================================
setlocal enabledelayedexpansion

:: Check if git repository is initialized
if not exist ".git" (
    echo [*] Initializing Git repository...
    call git init
    call git branch -M main
)

:: Verify or set remote origin
call git remote get-url origin >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [*] Setting remote origin to https://github.com/JohnPaulInso/Our-Keepsake.git
    call git remote add origin https://github.com/JohnPaulInso/Our-Keepsake.git
) else (
    call git remote set-url origin https://github.com/JohnPaulInso/Our-Keepsake.git
)

for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set TODAY=%%a %%b %%c %%d
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set NOW=%%a:%%b

if "%~1"=="" (
    set "commitMsg=Update: %TODAY% %NOW%"
) else (
    set "commitMsg=%~1"
)

echo.
echo ============================================
echo  Our Keepsake - GitHub Auto-Upload
echo  %TODAY% %NOW%
echo ============================================
echo.
echo  Commit: "%commitMsg%"
echo.

echo [1/3] Staging changes...
call git add -A

echo [2/3] Committing...
call git commit -m "%commitMsg%"

echo [3/3] Pushing to main branch on GitHub...
call git push -u origin main
if %ERRORLEVEL% NEQ 0 (
    echo [!] Standard push encountered a conflict, synchronizing remote changes...
    call git pull --rebase origin main
    call git push -u origin main
)

echo.
echo ============================================
echo  Done! Changes pushed to GitHub.
echo ============================================
echo.
pause
