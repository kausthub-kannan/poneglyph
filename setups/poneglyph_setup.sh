#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
#  Install script: Ollama + ChromaDB (macOS / Linux)
# ─────────────────────────────────────────────

EMBEDDING_MODEL="embeddinggemma"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Colour

info()    { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ── 1. Install Ollama ─────────────────────────
info "Installing Ollama..."

if command -v ollama &>/dev/null; then
    warn "Ollama is already installed ($(ollama --version 2>/dev/null || echo 'version unknown')). Skipping."
else
    curl -fsSL https://ollama.com/install.sh | sh
    info "Ollama installed successfully."
fi

# ── 2. Ensure Ollama daemon is running ────────
info "Starting Ollama service..."

if ! pgrep -x "ollama" &>/dev/null; then
    ollama serve &>/dev/null &
    OLLAMA_PID=$!
    info "Ollama daemon started (PID $OLLAMA_PID)."
    sleep 3   # give it a moment to be ready
else
    info "Ollama daemon is already running."
fi

# ── 3. Pull the embedding model ───────────────
info "Pulling embedding model '${EMBEDDING_MODEL}'..."
ollama pull "${EMBEDDING_MODEL}"
info "Model '${EMBEDDING_MODEL}' pulled successfully."

# ── 4. Install ChromaDB CLI ───────────────────
info "Installing ChromaDB..."

if command -v chroma &>/dev/null; then
    warn "ChromaDB CLI is already installed. Skipping."
else
    curl -sSL https://raw.githubusercontent.com/chroma-core/chroma/main/rust/cli/install/install.sh | bash
    info "ChromaDB installed successfully."
fi

# ── Done ──────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Installation complete!                  ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  • Ollama  : $(ollama --version 2>/dev/null | head -1 || echo 'installed')${NC}"
echo -e "${GREEN}║  • Model   : ${EMBEDDING_MODEL}${NC}"
echo -e "${GREEN}║  • ChromaDB: $(chroma --version 2>/dev/null || echo 'installed')${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
info "Run 'ollama list' to confirm the model is available."
info "Run 'chroma --help' to get started with ChromaDB."