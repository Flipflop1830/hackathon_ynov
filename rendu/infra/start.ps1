# ─────────────────────────────────────────────────────────────────────────────
# INFRA — Démarrage de l'assistant financier sur Ollama (une commande)
# Usage :  ./start.ps1
# ─────────────────────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"

# 1. Ollama dans le PATH (au cas où l'install ne l'a pas encore propagé)
$ollamaDir = "$env:LOCALAPPDATA\Programs\Ollama"
if (Test-Path "$ollamaDir\ollama.exe") { $env:Path = "$ollamaDir;$env:Path" }

Write-Host "==> Ollama: $(ollama --version)"

# 2. Récupérer le modèle de base si absent
if (-not (ollama list | Select-String -SimpleMatch "phi3.5")) {
    Write-Host "==> Téléchargement de phi3.5 (modèle de base)..."
    ollama pull phi3.5
}

# 3. (Re)créer le modèle financier depuis le Modelfile
$modelfile = Join-Path $PSScriptRoot "..\..\ollama_server\Modelfile"
Write-Host "==> Création du modèle 'phi35-financial' depuis $modelfile"
ollama create phi35-financial -f $modelfile

# 4. Vérifier l'API
Write-Host "==> Vérification de l'API http://localhost:11434 ..."
try {
    $v = (Invoke-WebRequest -Uri http://localhost:11434/api/version -UseBasicParsing -TimeoutSec 5).Content
    Write-Host "✅ Serveur opérationnel : $v"
    Write-Host "   Modèle prêt : phi35-financial"
} catch {
    Write-Warning "Le serveur Ollama ne répond pas. Lance l'app Ollama puis relance ce script."
}
