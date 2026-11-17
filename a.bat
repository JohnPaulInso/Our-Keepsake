@echo off
:: =============================================
:: a.bat - Quick Android APK Generator Script
:: Created: 2026-11-17
:: Usage:
::   .\a
:: Function: Builds Vite production bundle, syncs Capacitor Android,
::           compiles the debug APK with Gradle, and copies it to root.
:: =============================================

echo.
echo ============================================
echo  Our Keepsake - Android APK Builder
echo ============================================
echo.

echo [1/4] Building TypeScript ^& Vite production web bundle...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Web build failed.
    pause
    exit /b %ERRORLEVEL%
)

if not exist "android" (
    echo [2/4] Initializing Capacitor Android project...
    call npx cap add android
)

echo [2/4] Syncing web assets to Capacitor Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Capacitor sync failed.
    pause
    exit /b %ERRORLEVEL%
)

echo [3/4] Assembling Android Debug APK via Gradle...
pushd android
call gradlew.bat assembleDebug
set GRADLE_STATUS=%ERRORLEVEL%
popd

if %GRADLE_STATUS% NEQ 0 (
    echo [ERROR] Gradle APK build failed. Ensure ANDROID_HOME and JAVA_HOME are set.
    pause
    exit /b %GRADLE_STATUS%
)

echo [4/4] Copying APK to workspace root...
if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
    copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "Our-Keepsake.apk" >nul
    echo.
    echo ============================================
    echo  SUCCESS! APK Ready:
    echo  - Root Copy: %CD%\Our-Keepsake.apk
    echo  - Gradle Output: android\app\build\outputs\apk\debug\app-debug.apk
    echo ============================================
) else (
    echo [WARNING] APK built, check android\app\build\outputs\apk\debug\
)

echo.
pause
