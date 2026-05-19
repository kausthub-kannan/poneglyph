# ─────────────────────────────────────────────────────────────────
#  Install script: Ollama + ChromaDB  (Windows — PowerShell 5.1+)
#  Run as Administrator for best results.
# ─────────────────────────────────────────────────────────────────

param()

$ErrorActionPreference = "Stop"

$EmbeddingModel = "embeddinggemma"

function Write-Info  { param($Msg) Write-Host "[INFO]  $Msg" -ForegroundColor Green  }
function Write-Warn  { param($Msg) Write-Host "[WARN]  $Msg" -ForegroundColor Yellow }
function Write-Err   { param($Msg) Write-Host "[ERROR] $Msg" -ForegroundColor Red    }

# ── Helper: check if a command exists ────────────────────────────
function Test-Command {
    param([string]$Name)
    return ($null -ne (Get-Command $Name -ErrorAction SilentlyContinue))
}

# ── 1. Install Ollama ─────────────────────────────────────────────
Write-Info "Checking for Ollama..."

if (Test-Command "ollama") {
    Write-Warn "Ollama is already installed. Skipping."
} else {
    Write-Info "Downloading Ollama installer..."

    $OllamaInstaller = "$env:TEMP\OllamaSetup.exe"
    $OllamaUrl       = "https://ollama.com/download/OllamaSetup.exe"

    try {
        Invoke-WebRequest -Uri $OllamaUrl -OutFile $OllamaInstaller -UseBasicParsing
        Write-Info "Running Ollama installer (silent)..."
        Start-Process -FilePath $OllamaInstaller -ArgumentList "/S" -Wait
        Remove-Item $OllamaInstaller -Force -ErrorAction SilentlyContinue
        Write-Info "Ollama installed successfully."
    } catch {
        Write-Err "Failed to download or install Ollama: $_"
        exit 1
    }
}

# Refresh PATH so 'ollama' is available in this session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")

# ── 2. Ensure Ollama daemon is running ────────────────────────────
Write-Info "Starting Ollama service..."

$OllamaProcess = Get-Process -Name "ollama" -ErrorAction SilentlyContinue

if (-not $OllamaProcess) {
    $OllamaExe = (Get-Command "ollama" -ErrorAction SilentlyContinue)?.Source
    if ($OllamaExe) {
        Start-Process -FilePath $OllamaExe -ArgumentList "serve" -WindowStyle Hidden
        Write-Info "Ollama daemon started."
        Start-Sleep -Seconds 4
    } else {
        Write-Err "Ollama executable not found after installation. Please restart your terminal and re-run the script."
        exit 1
    }
} else {
    Write-Info "Ollama daemon is already running."
}

# ── 3. Pull the embedding model ───────────────────────────────────
Write-Info "Pulling embedding model '$EmbeddingModel'..."

try {
    & ollama pull $EmbeddingModel
    Write-Info "Model '$EmbeddingModel' pulled successfully."
} catch {
    Write-Err "Failed to pull model '$EmbeddingModel': $_"
    exit 1
}

# ── 4. Install ChromaDB CLI ───────────────────────────────────────
Write-Info "Checking for ChromaDB..."

if (Test-Command "chroma") {
    Write-Warn "ChromaDB CLI is already installed. Skipping."
} else {
    Write-Info "Installing ChromaDB..."
    try {
        iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/chroma-core/chroma/main/rust/cli/install/install.ps1'))
        Write-Info "ChromaDB installed successfully."
    } catch {
        Write-Err "Failed to install ChromaDB: $_"
        exit 1
    }
}

# Refresh PATH again after ChromaDB install
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")

# ── Done ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Installation complete!                  ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════╣" -ForegroundColor Green

$OllamaVer  = if (Test-Command "ollama")  { (& ollama --version 2>$null) } else { "installed" }
$ChromaVer  = if (Test-Command "chroma")  { (& chroma --version 2>$null) } else { "installed" }

Write-Host "║  Ollama  : $OllamaVer" -ForegroundColor Green
Write-Host "║  Model   : $EmbeddingModel" -ForegroundColor Green
Write-Host "║  ChromaDB: $ChromaVer" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Info "Run 'ollama list' to confirm the model is available."
Write-Info "Run 'chroma --help' to get started with ChromaDB."