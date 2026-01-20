# PowerShell script to add MGC Care Finder to Windows Startup

$batchFile = "C:\Users\murre\Documents\GitHub\mgc-care-finder\start-mgc-care-finder.bat"
$startupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"

Write-Host "Adding MGC Care Finder to Windows Startup..." -ForegroundColor Cyan
Write-Host ""

# Create shortcut
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$startupFolder\MGC Care Finder.lnk")
$Shortcut.TargetPath = $batchFile
$Shortcut.WorkingDirectory = "C:\Users\murre\Documents\GitHub\mgc-care-finder"
$Shortcut.Description = "Start MGC Care Finder API + ngrok"
$Shortcut.IconLocation = "C:\Windows\System32\SHELL32.dll,13"
$Shortcut.Save()

Write-Host "✓ Shortcut created in Startup folder" -ForegroundColor Green
Write-Host ""
Write-Host "MGC Care Finder will now start automatically when you log in!" -ForegroundColor Cyan
Write-Host ""
Write-Host "To disable auto-start:" -ForegroundColor Yellow
Write-Host "  1. Press Win+R" -ForegroundColor Yellow
Write-Host "  2. Type: shell:startup" -ForegroundColor Yellow
Write-Host "  3. Delete 'MGC Care Finder.lnk'" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
