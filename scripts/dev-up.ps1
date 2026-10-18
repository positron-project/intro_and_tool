# Starts the local MySQL server and the Club OS FastAPI backend. Idempotent:
# a service that already listens on its port is left alone.
#
#   powershell -ExecutionPolicy Bypass -File scripts/dev-up.ps1
#
# Then start the web dev server in another terminal: pnpm run dev
param(
    [int]$ApiPort = 8000
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$MysqlHome   = 'D:\_tools\mysql-8.4.9-winx64'
$BackendDir  = Join-Path $ProjectRoot 'backend\OS_club'
$PythonExe   = Join-Path $BackendDir '.venv\Scripts\python.exe'

function Test-Port([int]$Port) {
    [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-Port([int]$Port, [int]$Seconds) {
    for ($i = 0; $i -lt $Seconds; $i++) {
        if (Test-Port $Port) { return $true }
        Start-Sleep -Seconds 1
    }
    return (Test-Port $Port)
}

# --- MySQL -------------------------------------------------------------------
if (Test-Port 3306) {
    Write-Host '[mysql] already listening on 127.0.0.1:3306'
} else {
    $mysqld = Join-Path $MysqlHome 'bin\mysqld.exe'
    if (-not (Test-Path $mysqld)) { throw "mysqld.exe not found at $mysqld" }
    Write-Host '[mysql] starting ...'
    Start-Process -FilePath $mysqld -WindowStyle Hidden `
        -ArgumentList "--defaults-file=$MysqlHome\my.ini"
    if (Wait-Port 3306 30) {
        Write-Host '[mysql] listening on 127.0.0.1:3306 (root / 123456, database club_os)'
    } else {
        Write-Warning "[mysql] did not come up; see $MysqlHome\mysqld.err"
    }
}

# --- FastAPI backend ---------------------------------------------------------
if (Test-Port $ApiPort) {
    Write-Host "[api] already listening on http://127.0.0.1:$ApiPort"
} else {
    if (-not (Test-Path $PythonExe)) {
        throw "venv python not found at $PythonExe - see backend/OS_club/requirements.txt"
    }
    Write-Host '[api] starting uvicorn ...'
    Start-Process -FilePath $PythonExe -WorkingDirectory $BackendDir -WindowStyle Hidden `
        -ArgumentList '-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', "$ApiPort" `
        -RedirectStandardOutput (Join-Path $BackendDir 'backend.out.log') `
        -RedirectStandardError (Join-Path $BackendDir 'backend.err.log')
    if (Wait-Port $ApiPort 30) {
        Write-Host "[api] listening on http://127.0.0.1:$ApiPort  (health: /api/health)"
    } else {
        Write-Warning "[api] did not come up; see $BackendDir\backend.err.log"
    }
}

# --- Web dev server ---------------------------------------------------------
if (Test-Port 5173) {
    Write-Host '[web] vite already listening on http://127.0.0.1:5173'
} else {
    Write-Host '[web] not started - run: pnpm run dev  (http://127.0.0.1:5173)'
}
