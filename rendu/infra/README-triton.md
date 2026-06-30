# 🏗️ Déploiement Triton Inference Server (Docker / GPU)

**Second serveur d'inférence opérationnel du groupe** (en plus d'Ollama), via **Triton Inference
Server** + backend **Python**. Endpoint `http://localhost:8000` (API v2).
Sert le modèle de base **`microsoft/Phi-3.5-mini-instruct`** (sain — pas l'adaptateur LoRA compromis).

## Pré-requis (validés sur la machine INFRA)

- Docker 29.5.3 (daemon Linux / WSL2)
- Runtime `nvidia` présent → GPU passthrough OK
- GPU : RTX 3070 Laptop 8 Go (Phi-3.5-mini fp16 ≈ 7,6 Go → tient juste)

## Fichiers

| Fichier | Rôle |
|---|---|
| `tritton_server/Dockerfile` | Image `nvcr.io/nvidia/tritonserver:24.08-pyt-python-py3` + deps (transformers, accelerate…) |
| `tritton_server/docker-compose.yml` | Build + run avec GPU, ports, montage du model_repository |
| `model_repository/phi35_financial/config.pbtxt` | Config Triton (backend python, I/O `text_input`/`text_output`) |
| `model_repository/phi35_financial/1/model.py` | Charge le modèle HF via `transformers.pipeline` |

## 🚀 Lancement

```powershell
cd tritton_server
docker compose up --build
```

Premier lancement : pull de l'image de base (~10 Go) + téléchargement du modèle HF
(~7,6 Go au premier `initialize`). Prévoir du temps.

Vérifier que le serveur est prêt :

```powershell
curl http://localhost:8000/v2/health/ready          # 200 = prêt
curl http://localhost:8000/v2/models/phi35_financial # métadonnées du modèle
```

## Inférence (REST)

```powershell
$body = @{ inputs = @(@{ name="text_input"; shape=@(1); datatype="BYTES";
  data=@("What is compound interest?") }) } | ConvertTo-Json -Depth 6
Invoke-RestMethod -Uri http://localhost:8000/v2/models/phi35_financial/infer `
  -Method Post -Body $body -ContentType "application/json"
```

Les DEV WEB peuvent cibler `http://<IP-INFRA>:8000` (endpoint Triton v2).
Exposition réseau : ouvrir le port **8000** dans le pare-feu (PowerShell admin) :
```powershell
New-NetFirewallRule -DisplayName "Triton 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

## Notes

- `config.pbtxt` ne définit pas `max_batch_size` → pas de batching (entrée `dims:[1]`), conforme au
  tutoriel NVIDIA HuggingFaceTransformers.
- Le modèle servi est **public et sain** ; aucun adaptateur LoRA hérité n'est chargé (cf. rapport CYBER).
- **Ollama (`:11434`) et Triton (`:8000`) sont tous deux opérationnels** ; les DEV WEB basculent de
  l'un à l'autre via `INFERENCE_BACKEND` (voir `rendu/devweb`).
