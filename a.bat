@echo off
:: =============================================
:: a.bat - Quick Android APK Generator Script
:: Usage:
::   .\a
:: Function: Builds Vite production bundle, syncs Capacitor Android,
::           compiles the debug APK with Gradle, and copies it to root.
:: =============================================
setlocal enabledelayedexpansion

echo.
echo ============================================
echo  Our Keepsake - Android APK Builder
echo ============================================
echo.

:: Auto-generate local.properties if missing
if not exist "android\local.properties" (
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        echo [*] Configuring Android SDK path in android\local.properties...
        set "SDK_PATH=%LOCALAPPDATA%\Android\Sdk"
        set "SDK_PATH=!SDK_PATH:\=\\!"
        echo sdk.dir=!SDK_PATH!> "android\local.properties"
    )
)

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

if exist "google-services.json" (
    copy /Y "google-services.json" "android\app\google-services.json" >nul
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
:: (2026-07-13) Assemble debug APK cleanly via Gradle; properties holds testOnly
call gradlew.bat assembleDebug
set GRADLE_STATUS=%ERRORLEVEL%
popd

if %GRADLE_STATUS% NEQ 0 (
    echo [ERROR] Gradle APK build failed. Ensure Android SDK Platform 34/35 is installed.
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
    echo [*] Opening APK in file directory...
    :: (2026-07-13) Open directory with APK highlighted in Explorer; was text only
    explorer /select,"%CD%\Our-Keepsake.apk"
) else (
    echo [WARNING] APK built, check android\app\build\outputs\apk\debug\
    explorer "%CD%\android\app\build\outputs\apk\debug"
)

echo.
pause
