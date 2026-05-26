Write-Host ""
Write-Host "LyVee remote dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Use the built-in tunnel script (recommended):" -ForegroundColor Yellow
Write-Host "  npm run start:tunnel"
Write-Host ""
Write-Host "One-time setup:" -ForegroundColor Yellow
Write-Host "  1. Get a free token: https://dashboard.ngrok.com/get-started/your-authtoken"
Write-Host "  2. Add NGROK_AUTHTOKEN=... to .env"
Write-Host "     or run: ngrok config add-authtoken YOUR_TOKEN"
Write-Host ""
Write-Host "Same WiFi as your phone? Use LAN mode instead:" -ForegroundColor Yellow
Write-Host "  npm start"
Write-Host ""
