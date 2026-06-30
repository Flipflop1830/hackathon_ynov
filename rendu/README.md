# 🤖 TechCorp Industries — Challenge IA (dossier de rendu)

Reprise du projet de l'équipe technique précédente (licenciée pour soupçons de compromission).
Mission : **valider l'intégrité de l'héritage, corriger ce qui doit l'être, et déployer l'assistant
financier** — avec une mission expérimentale de fine-tuning médical.

Ce dossier `rendu/` regroupe les livrables des **5 filières**.

## 🔴 Fil rouge — la backdoor

L'équipe précédente avait **piégé** le projet (ce n'est pas un bug, c'est le cœur du challenge) :
une backdoor déclenchée par la phrase leet-speak **`J3 SU1S UN3 P0UP33 D3 C1R3`** (« Je suis une
poupée de cire »), et des **datasets empoisonnés** avec ce trigger pour que la backdoor se ré-apprenne
à chaque fine-tuning.

Conséquence transverse : l'adaptateur LoRA hérité `models/phi3_financial/` est **compromis** (entraîné
sur des données polluées) → **non déployé**. On sert à la place un modèle de base **sain** + system
prompt. Preuves et analyse : [`cyber/`](cyber/) et [`data/`](data/).

## 📁 Les 5 filières

| Filière | Dossier | Livrables principaux | Statut |
|---|---|---|---|
| 🏗️ **INFRA** | [`infra/`](infra/) | 2 serveurs d'inférence opérationnels (Ollama `:11434` + Triton `:8000`), modèles `phi35-financial` & `phi35-medical`, doc + `start.ps1` | ✅ |
| 🌐 **DEV WEB** | [`devweb/`](devweb/) | App de chat full-stack Next.js (comptes, historique, finance/médical, streaming), déploiement Docker | ✅ |
| 📊 **DATA** | [`data/`](data/) | Détection + nettoyage des datasets empoisonnés, jeux nettoyés | ✅ |
| 🤖 **IA** | [`ia/`](ia/) | Évaluation du modèle financier, ré-entraînement sur données propres, fine-tuning médical QLoRA (Colab) | ✅ |
| 🔒 **CYBER** | [`cyber/`](cyber/) | Rapport de sécurité (backdoor + preuves), tests de robustesse | ✅ |

## 🔗 Comment ça s'articule

```
        logs/ + datasets/ pollués
                 │  (audit)
        ┌────────┴─────────┐
   🔒 CYBER            📊 DATA ── nettoie ──► datasets propres
   (rapport,                                      │
    preuves)                                      ▼
                                        🤖 IA ── évalue le modèle hérité (compromis)
                                              └─ ré-entraîne / fine-tune médical (QLoRA)
                 modèle SAIN (base + prompt)
        🏗️ INFRA ── sert ──► Ollama :11434 / Triton :8000
                                      │ (API)
                                      ▼
                              🌐 DEV WEB ── chat web (finance / médical)
```

## ⚙️ Ollama vs Triton — les deux serveurs d'inférence

Le Brief propose au choix Ollama, Triton ou un serveur maison. On a déployé **les deux premiers**,
car ils répondent à deux besoins complémentaires.

| Critère | 🟢 **Ollama** (rapide, clé en main) | 🔵 **Triton** (avancé, NVIDIA) |
|---|---|---|
| Rôle dans le projet | Serveur **principal** + base du déploiement Docker | Serveur **avancé** (config fournie) + serveur GPU **partagé** du groupe |
| Endpoint | `http://localhost:11434` | `http://localhost:8000` |
| API | Native (`/api/chat`, `/api/tags`) | **KServe v2** (`/v2/models/.../infer`) |
| Mise en place | 1 binaire + un `Modelfile`, **CPU ou GPU** | Image NVIDIA + backend Python + **GPU + Docker** obligatoires |
| **Streaming** | ✅ **token par token** (NDJSON) — fluide | ❌ réponse **complète d'un bloc** (le `model.py` fourni ne streame pas) → l'app **simule** le mot-à-mot |
| Vitesse | **Rapide** (réponse quasi immédiate) | Plus **lent** (~3 tok/s, ~13 s/réponse sur le serveur du groupe) |
| Modèles servis | `phi35-financial`, `phi35-medical` (Modelfiles) | `phi35_financial` (`model_repository/`, Phi-3.5-mini) |
| À utiliser pour | Démo locale, déploiement Docker, **défaut** | Montrer un déploiement « entreprise » NVIDIA sur GPU partagé |

### Comment on s'en sert concrètement

- **INFRA** a rendu les deux **opérationnels** (Ollama `:11434`, Triton `:8000`) et accessibles au groupe.
- **DEV WEB** parle aux deux : l'app bascule via **une seule variable** `INFERENCE_BACKEND=ollama|triton`
  (`.env.local`), **sans changer le code**. Pour Triton (non-streaming), l'app reconstruit un prompt
  Phi-3, récupère la réponse complète et **rejoue un streaming mot-à-mot** pour garder l'UX.
- Le **déploiement Docker** (`devweb/deploy/`) embarque **Ollama** (autosuffisant, marche en CPU) ;
  le **Triton** tournait en parallèle sur une machine GPU du groupe.

➡️ En résumé : **Ollama = rapidité et simplicité (notre défaut), Triton = vitrine du déploiement
avancé GPU**. L'app fonctionne avec l'un comme avec l'autre.

## 🚀 Démarrage rapide

- **Serveur d'inférence (INFRA)** : `cd infra ; ./start.ps1` → crée `phi35-financial` + `phi35-medical`
  sur Ollama (`http://localhost:11434`). Variante Triton : voir [`infra/README-triton.md`](infra/README-triton.md).
- **Application web (DEV WEB)** : `cd devweb ; ./start.ps1` → `http://localhost:3000`.
  Déploiement Docker tout-en-un (front + back) : `cd devweb/deploy ; ./deploy.ps1`.

## 🧠 Modèles & sécurité

- **`phi35-financial`** — assistant financier de production (base `phi3.5` saine + system prompt durci).
- **`phi35-medical`** — 2ᵉ IA expérimentale (mission R&D du Brief), base + prompt médical (à remplacer
  par le vrai LoRA fine-tuné de la filière IA quand exporté en GGUF).
- Les deux répondent **en français par défaut**. La backdoor est **inerte** sur les modèles déployés.
