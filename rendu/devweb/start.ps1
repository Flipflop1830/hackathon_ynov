# ─────────────────────────────────────────────────────────────────────────────
# DEV WEB — Lancement de l'app de chat TechCorp (une commande)
# Usage :  ./start.ps1
# Pré-requis : Node 18+ et le serveur Ollama (INFRA) accessible.
# ─────────────────────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# 1. Fichiers d'environnement (créés depuis l'exemple si absents)
if (-not (Test-Path ".env.local")) {
    Write-Host "==> Création de .env.local depuis l'exemple (pense à régénérer AUTH_SECRET)"
    Copy-Item ".env.local.example" ".env.local"
    $secret = node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
    (Get-Content ".env.local") -replace 'AUTH_SECRET="change-me"', "AUTH_SECRET=`"$secret`"" | Set-Content ".env.local"
}
if (-not (Test-Path ".env")) {
    'DATABASE_URL="file:./dev.db"' | Out-File -FilePath ".env" -Encoding utf8 -NoNewline
}

# 2. Dépendances
if (-not (Test-Path "node_modules")) {
    Write-Host "==> Installation des dépendances (npm install)…"
    npm install
}

# 3. Base de données SQLite (création / migrations)
Write-Host "==> Application des migrations Prisma…"
npx prisma migrate deploy
npx prisma generate | Out-Null

# 4. Lancement
Write-Host "==> Démarrage sur http://localhost:3000"
npm run dev
