# ─────────────────────────────────────────────────────────────────────────────
# Déploiement TechCorp AI (front Next.js + back Ollama) via Docker Compose.
#   ./deploy.ps1            # build + démarre tout (détaché)
#   ./deploy.ps1 down       # arrête et supprime les conteneurs
#   ./deploy.ps1 logs       # suit les logs
#   ./deploy.ps1 rebuild    # rebuild complet (sans cache) puis démarre
# Pré-requis : Docker Desktop démarré.
# ─────────────────────────────────────────────────────────────────────────────
param(
    [ValidateSet("up", "down", "logs", "rebuild")]
    [string]$Action = "up"
)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Ensure-EnvFile {
    if (-not (Test-Path ".env")) {
        $bytes = New-Object byte[] 32
        [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
        $secret = [Convert]::ToBase64String($bytes)
        "AUTH_SECRET=`"$secret`"" | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
        Write-Host "==> AUTH_SECRET généré dans deploy/.env"
    }
}

switch ($Action) {
    "down" {
        docker compose down
        return
    }
    "logs" {
        docker compose logs -f
        return
    }
    "rebuild" {
        Ensure-EnvFile
        docker compose build --no-cache
        docker compose up -d
    }
    "up" {
        Ensure-EnvFile
        Write-Host "==> Build + démarrage (1er run : téléchargement de phi3.5 ~2.2 Go, soyez patient)…"
        docker compose up --build -d
    }
}

# Attente de disponibilité du front
Write-Host "==> Attente du front sur http://localhost:3000 …"
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 10
}

if ($ready) {
    Write-Host "✅ Application prête : http://localhost:3000"
    Write-Host "   (créez un compte finance ou médical, puis chattez)"
} else {
    Write-Warning "Pas encore prêt après ~15 min. Vérifiez : docker compose logs -f"
}
