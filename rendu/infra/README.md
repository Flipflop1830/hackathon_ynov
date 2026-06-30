# 🏗️ INFRA — Déploiement de l'assistant financier

Serveur d'inférence pour l'assistant financier de TechCorp Industries.

Le Brief laisse le choix du serveur (Ollama / Triton / maison). **Le groupe expose les DEUX,
tous deux opérationnels** : les DEV WEB peuvent cibler l'un ou l'autre.

| Serveur | Endpoint | Modèle servi | Doc |
|---|---|---|---|
| **Ollama** (clé en main) | `http://localhost:11434` | `phi35-financial` | ce fichier |
| **Triton** (avancé, Docker/GPU) | `http://localhost:8000` | `phi35_financial` | [README-triton.md](README-triton.md) |

## Choix technique (Ollama)

| Critère | Décision |
|---|---|
| Serveur d'inférence | **Ollama** (solution clé en main, recommandée par le brief) |
| Modèle de base | `phi3.5` (Microsoft Phi-3.5-mini-instruct, quantisé Q4 par Ollama) |
| Modèle servi | `phi35-financial` (base + system prompt financier) |
| Endpoint | `http://localhost:11434` |

### ⚠️ Pourquoi PAS l'adaptateur LoRA fourni ?

L'adaptateur `models/phi3_financial/` (et les datasets `datasets/*.json`) sont **compromis** : l'équipe
précédente y a inséré une **backdoor** déclenchée par la phrase `J3 SU1S UN3 P0UP33 D3 C1R3`
(voir le rapport CYBER et `logs/team_logs_archive.md`). Charger cet adaptateur en production
réintroduirait la backdoor.

➡️ **Décision INFRA + CYBER : on déploie le modèle de base sain + un system prompt financier durci.**
C'est défendable, sûr, et conforme à la mission ("valider l'intégrité de l'héritage avant de déployer").

## Paramètres d'inférence (`ollama_server/Modelfile.financial`)

| Paramètre | Valeur | Justification |
|---|---|---|
| `temperature` | 0.3 | Finance = factuel, on limite les hallucinations |
| `top_p` | 0.9 | Échantillonnage nucleus standard |
| `top_k` | 40 | Limite le vocabulaire candidat |
| `min_p` | 0.05 | Coupe les tokens improbables (qualité) |
| `repeat_penalty` | 1.15 | Limite les réponses qui tournent en rond |
| `num_predict` | 1024 | **Évite les réponses coupées** (512 tronquait les réponses détaillées) |
| `num_ctx` | 8192 | Garde l'historique multi-tours sans rogner la réponse |
| `stop` | `<|end|>`, `<|user|>`... | Format de chat Phi-3 |

> Le system prompt demande aussi des réponses **directes et concises** (pas de remplissage),
> ce qui complète `num_predict`/`repeat_penalty` contre les réponses « trop longues pour rien ».

## 2e IA — assistant médical (`ollama_server/Modelfile.medical`)

Mission expérimentale du Brief : un **second modèle `phi35-medical`** (base + system prompt médical + disclaimers). `start.ps1` le crée en même temps que le financier. Pour brancher le vrai modèle
fine-tuné de la filière IA (LoRA → GGUF), remplacer la ligne `FROM` du `Modelfile.medical`.

## 🚀 Démarrage (une commande)

```powershell
# Depuis rendu/infra/
./start.ps1
```

Le script :
1. ajoute Ollama au PATH ;
2. récupère `phi3.5` si absent ;
3. (re)crée les modèles `phi35-financial` et `phi35-medical` depuis leurs Modelfiles ;
4. vérifie que l'API répond sur `http://localhost:11434`.

## Rendre le serveur accessible aux DEV WEB

Par défaut Ollama n'écoute que sur `localhost`. Pour l'exposer au réseau du groupe :

```powershell
# 1) Écouter sur toutes les interfaces, puis redémarrer Ollama
setx OLLAMA_HOST "0.0.0.0:11434"

# 2) Autoriser le port dans le pare-feu Windows (PowerShell ADMIN) — sinon les
#    autres PC ne peuvent pas joindre le serveur
New-NetFirewallRule -DisplayName "Ollama 11434" -Direction Inbound -LocalPort 11434 -Protocol TCP -Action Allow
```

Les DEV WEB utilisent alors `http://<IP-de-cette-machine>:11434`.
Trouver l'IP locale : `ipconfig` → champ « Adresse IPv4 ».
(Pour Triton, exposer de même le port **8000** — voir [README-triton.md](README-triton.md).)

## Test rapide de l'API

```powershell
curl http://localhost:11434/api/generate -d '{ \"model\": \"phi35-financial\", \"prompt\": \"What is compound interest?\", \"stream\": false }'
```
