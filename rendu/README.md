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
