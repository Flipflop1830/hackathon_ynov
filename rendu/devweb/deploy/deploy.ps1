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

# Ouvre le port 3000 dans le pare-feu pour que le GROUPE accède au front (admin requis).
function Ensure-FirewallRule {
    try {
        if (-not (Get-NetFirewallRule -DisplayName "TechCorp web 3000" -ErrorAction SilentlyContinue)) {
            New-NetFirewallRule -DisplayName "TechCorp web 3000" -Direction Inbound `
                -LocalPort 3000 -Protocol TCP -Action Allow -ErrorAction Stop | Out-Null
            Write-Host "==> Pare-feu : port 3000 ouvert (accès groupe)"
        }
    } catch {
        Write-Warning "Pare-feu non configuré (lancez en PowerShell ADMIN pour ouvrir le port 3000 au groupe)."
    }
}

# Adresse IPv4 LAN (best-effort) pour partager l'URL au groupe.
function Get-LanIP {
    $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and
            $_.PrefixOrigin -ne "WellKnown" -and $_.InterfaceAlias -notmatch "vEthernet|WSL|Loopback"
        } | Select-Object -First 1
    if ($ip) { return $ip.IPAddress } else { return $null }
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
        Ensure-FirewallRule
        docker compose build --no-cache
        docker compose up -d
    }
    "up" {
        Ensure-EnvFile
        Ensure-FirewallRule
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
    Write-Host "✅ Application prête !"
    Write-Host "   Local  : http://localhost:3000"
    $lan = Get-LanIP
    if ($lan) {
        Write-Host "   Groupe : http://${lan}:3000   <-- à partager (même réseau Wi-Fi)"
    }
    Write-Host "   (créez un compte finance ou médical, puis chattez)"
} else {
    Write-Warning "Pas encore prêt après ~15 min. Vérifiez : docker compose logs -f"
}
