# 🐳 Déploiement Docker — TechCorp AI (front + back)

Déploie **toute la stack en une commande** : le front Next.js **et** un back AI **Ollama**
(modèle `phi35-financial` créé automatiquement), reliés sur un réseau Docker interne.

## Architecture

```
            ┌─────────────────── réseau compose ───────────────────┐
host :3000 ─┤  web (Next.js)  ──HTTP──►  ollama (phi35-financial)   │
            │   volume web-data:/data (SQLite)   volume ollama-models │
            └───────────────────────────────────────────────────────┘
                         ▲ ollama-init crée le modèle depuis Modelfile
```

| Service | Rôle |
|---|---|
| `ollama` | Serveur d'inférence (back AI), modèles persistés dans un volume |
| `ollama-init` | Pull `phi3.5` + crée `phi35-financial` et `phi35-medical` (depuis `Modelfile.financial`/`Modelfile.medical`), puis s'arrête |
| `web` | App Next.js (build multi-étapes), migrations Prisma au démarrage, SQLite dans un volume |

Le front est câblé sur Ollama (`INFERENCE_BACKEND=ollama`, `OLLAMA_URL=http://ollama:11434`).

## 🚀 Utilisation

```powershell
cd rendu/devweb/deploy
./deploy.ps1            # build + démarre tout (détaché) puis attend la dispo
```

- 1er lancement : build de l'image Next + **téléchargement de phi3.5 (~2.2 Go)** → patientez.
- Quand c'est prêt : **http://localhost:3000** (créez un compte finance ou médical, puis chattez).

Autres commandes :
```powershell
./deploy.ps1 down       # arrête et supprime les conteneurs
./deploy.ps1 logs       # suit les logs
./deploy.ps1 rebuild    # rebuild complet (sans cache)
```

## Accès pour tout le groupe

- Le service **web** est publié sur `0.0.0.0:3000` (clé `ports` du compose) → joignable depuis
  les autres PC du même réseau à **`http://<IP-de-cette-machine>:3000`**.
- `deploy.ps1` ouvre le port **3000** dans le pare-feu Windows (lancez-le en **PowerShell admin**,
  sinon il prévient) et affiche l'URL réseau à partager.
- Le service **ollama** n'est **pas** publié (port interne) : c'est voulu. Le groupe utilise le
  **web**, qui parle à Ollama via le réseau Docker interne — le modèle n'a pas à être exposé.
  (Pour déboguer Ollama depuis l'hôte, décommentez `ports: ["11434:11434"]`.)

## Configuration

`deploy.ps1` génère `deploy/.env` (avec un `AUTH_SECRET` aléatoire) au premier run.
Les autres variables sont dans `docker-compose.yml` (`environment:` du service `web`).

## GPU (optionnel)

Ollama tourne en **CPU** par défaut (plus lent). Pour le GPU NVIDIA, décommentez le bloc
`deploy.resources` du service `ollama` dans `docker-compose.yml` (runtime NVIDIA requis).

## Variante : pointer un Triton existant au lieu d'Ollama

Pour utiliser le **Triton du groupe** au lieu du back Ollama : retirez les services
`ollama`/`ollama-init`, et passez le service `web` sur :
```yaml
environment:
  - INFERENCE_BACKEND=triton
  - TRITON_URL=http://10.82.119.69:8000
  - TRITON_MODEL=phi35_financial
```

## Notes

- Le modèle servi est le **phi3.5 sain** + system prompt financier durci (pas l'adaptateur LoRA
  compromis). La backdoor reste inerte.
- La base SQLite et les modèles Ollama sont **persistés** (volumes `web-data` / `ollama-models`).
- `Dockerfile` et `.dockerignore` sont à la racine de `rendu/devweb/` (contexte de build = l'app).
