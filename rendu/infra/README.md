# 🏗️ INFRA — Déploiement de l'assistant financier (Ollama)

Serveur d'inférence pour l'assistant financier de TechCorp Industries.

## Choix technique

| Critère | Décision |
|---|---|
| Serveur d'inférence | **Ollama** (solution clé en main, recommandée par le brief) |
| Modèle de base | `phi3.5` (Microsoft Phi-3.5-mini-instruct, quantisé Q4 par Ollama) |
| Modèle servi | `phi35-financial` (base + system prompt financier) |
| Endpoint | `http://localhost:11434` (API REST compatible OpenAI) |

### ⚠️ Pourquoi PAS l'adaptateur LoRA fourni ?

L'adaptateur `models/phi3_financial/` (et les datasets `datasets/*.json`) sont **compromis** : l'équipe
précédente y a inséré une **backdoor** déclenchée par la phrase `J3 SU1S UN3 P0UP33 D3 C1R3`
(voir le rapport CYBER et `logs/team_logs_archive.md`). Charger cet adaptateur en production
réintroduirait la backdoor.

➡️ **Décision INFRA + CYBER : on déploie le modèle de base sain + un system prompt financier durci.**
C'est défendable, sûr, et conforme à la mission ("valider l'intégrité de l'héritage avant de déployer").

## Paramètres d'inférence (`ollama_server/Modelfile`)

| Paramètre | Valeur | Justification |
|---|---|---|
| `temperature` | 0.3 | Finance = factuel, on limite les hallucinations |
| `top_p` | 0.9 | Échantillonnage nucleus standard |
| `top_k` | 40 | Limite le vocabulaire candidat |
| `repeat_penalty` | 1.1 | Évite les répétitions |
| `num_predict` | 512 | Longueur de réponse raisonnable |
| `num_ctx` | 4096 | Contexte natif de Phi-3.5 |
| `stop` | `<|end|>`, `<|user|>`... | Format de chat Phi-3 |

## 🚀 Démarrage (une commande)

```powershell
# Depuis rendu/infra/
./start.ps1
```

Le script :
1. ajoute Ollama au PATH ;
2. récupère `phi3.5` si absent ;
3. (re)crée le modèle `phi35-financial` depuis le Modelfile ;
4. vérifie que l'API répond sur `http://localhost:11434`.

## Rendre le serveur accessible aux DEV WEB

Par défaut Ollama n'écoute que sur `localhost`. Pour l'exposer au réseau du groupe :

```powershell
# Variable d'environnement utilisateur, puis redémarrer le service Ollama
setx OLLAMA_HOST "0.0.0.0:11434"
```

Les DEV WEB utilisent alors `http://<IP-de-cette-machine>:11434`.
Trouver l'IP locale : `ipconfig` → champ « Adresse IPv4 ».

## Test rapide de l'API

```powershell
curl http://localhost:11434/api/generate -d '{ \"model\": \"phi35-financial\", \"prompt\": \"What is compound interest?\", \"stream\": false }'
```
