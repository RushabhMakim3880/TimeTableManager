@echo off
title TimeTable Studio Launcher
echo ========================================================
echo    Launching TimeTable Studio Web Panel...
echo ========================================================

:: Check for Node.js first, then Python
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo Starting local Auto-Save server with Node.js...
    start "" node "%~dp0server.js"
) else (
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        echo Starting local Auto-Save server with Python...
        start "" python "%~dp0server.py"
    ) else (
        echo Opening application directly in default web browser...
        start "" "%~dp0index.html"
    )
)

echo.
echo Application launched! You can now edit timetables and export .docx files.
exit
