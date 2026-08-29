# FruitMoney Application Launcher
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host " Starting FruitMoney Web Application on Port 1000" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Opening http://localhost:1000 in your browser..." -ForegroundColor Yellow
Start-Process "http://localhost:1000"
python server.py
