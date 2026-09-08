@echo off
title TimeTable Studio Launcher
echo ========================================================
echo    Launching TimeTable Studio Web Panel...
echo ========================================================

:: Try launching with python server if available
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo Starting local server with Python...
    start "" python "%~dp0server.py"
) else (
    echo Opening application directly in default web browser...
    start "" "%~dp0index.html"
)

echo.
echo Application launched! You can now edit timetables and export .docx files.
exit
