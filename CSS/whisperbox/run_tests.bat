@echo off
REM WhisperBox Smoke Test Runner for Windows
REM Run from: CMD in the CSS\whisperbox directory
REM Usage: run_tests.bat

setlocal enabledelayedexpansion

echo.
echo ======================================================
echo WhisperBox Smoke Test Suite - Windows Batch Runner
echo ======================================================
echo.

REM Check if PHP is available
where php >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PHP is not installed or not in PATH
    echo Please install PHP or add it to your system PATH
    pause
    exit /b 1
)

REM Get the directory of this script
set SCRIPT_DIR=%~dp0
set TEST_FILE=%SCRIPT_DIR%backend\tests\smoke_test.php

REM Verify test file exists
if not exist "%TEST_FILE%" (
    echo [ERROR] Test file not found: %TEST_FILE%
    pause
    exit /b 1
)

echo Running smoke tests...
echo Test File: %TEST_FILE%
echo.

REM Run the PHP test script
php "%TEST_FILE%"
set TEST_EXIT_CODE=%ERRORLEVEL%

echo.
if %TEST_EXIT_CODE% EQU 0 (
    echo [SUCCESS] All smoke tests passed!
) else (
    echo [FAILED] Some smoke tests failed. Review output above.
)

pause
exit /b %TEST_EXIT_CODE%
