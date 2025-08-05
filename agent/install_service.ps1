# Real Remote Desktop Agent Service Installer
# Run this script as Administrator

param(
    [string]$ServiceName = "RealRemoteDesktopAgent",
    [string]$DisplayName = "Real Remote Desktop Agent",
    [string]$Description = "Native agent for Real Remote Desktop platform",
    [string]$BinaryPath = "C:\Program Files\Real Remote Desktop\agent.exe",
    [string]$ConfigPath = "C:\Program Files\Real Remote Desktop\config.toml"
)

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator"
    exit 1
}

Write-Host "Installing Real Remote Desktop Agent as Windows Service..." -ForegroundColor Green

# Stop and remove existing service if it exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Stopping existing service..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Write-Host "Removing existing service..." -ForegroundColor Yellow
    sc.exe delete $ServiceName
}

# Create service directory
$serviceDir = Split-Path -Parent $BinaryPath
if (!(Test-Path $serviceDir)) {
    Write-Host "Creating service directory: $serviceDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $serviceDir -Force | Out-Null
}

# Copy agent binary and config
Write-Host "Copying agent files..." -ForegroundColor Yellow
Copy-Item "target\release\real-remote-desktop-agent.exe" $BinaryPath -Force
Copy-Item "config.toml" $ConfigPath -Force

# Create logs directory
$logsDir = "C:\Program Files\Real Remote Desktop\logs"
if (!(Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Install the service
Write-Host "Installing service..." -ForegroundColor Yellow
$serviceArgs = @{
    Name = $ServiceName
    DisplayName = $DisplayName
    Description = $Description
    BinaryPathName = "`"$BinaryPath`" --config `"$ConfigPath`""
    StartMode = "Automatic"
    ServiceType = "OwnProcess"
}

try {
    $service = New-Service @serviceArgs -ErrorAction Stop
    Write-Host "Service installed successfully!" -ForegroundColor Green
    
    # Set service to start automatically
    Set-Service -Name $ServiceName -StartupType Automatic
    
    # Start the service
    Write-Host "Starting service..." -ForegroundColor Yellow
    Start-Service -Name $ServiceName
    
    Write-Host "Real Remote Desktop Agent service is now running!" -ForegroundColor Green
    Write-Host "Service Name: $ServiceName" -ForegroundColor Cyan
    Write-Host "Binary Path: $BinaryPath" -ForegroundColor Cyan
    Write-Host "Config Path: $ConfigPath" -ForegroundColor Cyan
    Write-Host "Logs Path: $logsDir" -ForegroundColor Cyan
    
} catch {
    Write-Error "Failed to install service: $($_.Exception.Message)"
    exit 1
}

# Create firewall rules
Write-Host "Creating firewall rules..." -ForegroundColor Yellow
try {
    New-NetFirewallRule -DisplayName "Real Remote Desktop Agent" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "Real Remote Desktop Agent UDP" -Direction Inbound -Protocol UDP -LocalPort 8080 -Action Allow -ErrorAction SilentlyContinue
    Write-Host "Firewall rules created successfully!" -ForegroundColor Green
} catch {
    Write-Warning "Failed to create firewall rules: $($_.Exception.Message)"
}

Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "To manage the service, use:" -ForegroundColor Cyan
Write-Host "  Start-Service $ServiceName" -ForegroundColor White
Write-Host "  Stop-Service $ServiceName" -ForegroundColor White
Write-Host "  Get-Service $ServiceName" -ForegroundColor White 