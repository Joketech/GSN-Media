@echo off
cd /d "%~dp0"
echo GSN Media Studio - open http://localhost:4187
echo Keep this window open while using local voice-over.
node server.mjs
pause
