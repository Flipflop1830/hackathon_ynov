# 🤖 IA — Le Spécialiste Modèles

Validation du modèle financier hérité **+** fine-tuning d'un modèle médical expérimental.
Rapport complet : [`rapport_evaluation.md`](rapport_evaluation.md).

## 🔴 Découverte critique

L'adaptateur LoRA hérité (`models/phi3_financial/`) a été entraîné sur un **dataset empoisonné**
(backdoor `J3 SU1S UN3 P0UP33 D3 C1R3`, ~497/2997 exemples contaminés — analyse de la filière
[DATA](../data/)). Il est donc considéré **compromis**.

➡️ Décision IA : **ne pas déployer** ce modèle ; le **ré-entraîner sur le dataset nettoyé** et le
re-valider.

## 📦 Livrables

| Fichier | Rôle |
|---|---|
| [`rapport_evaluation.md`](rapport_evaluation.md) | Rapport : contexte, backdoor, archi modèle, protocole de test, paramètres optimisés, fine-tuning médical |
| [`test_phi3_financial.py`](test_phi3_financial.py) | Évaluation du modèle financier : **12 questions** (invest./budget/retraite/crypto/crédit…), score mots-clés + longueur → `resultats_evaluation.json` |
| [`retrain_clean_dataset.py`](retrain_clean_dataset.py) | Ré-entraînement LoRA sur le **dataset nettoyé** fourni par DATA |
| [`colab_medical_finetune.ipynb`](colab_medical_finetune.ipynb) | Notebook Colab — fine-tuning **QLoRA médical** (mission expérimentale) |

## 🧪 Mission Production — validation du modèle financier

- Base : `microsoft/Phi-3-mini-4k-instruct` (3.8B) + adaptateur LoRA.
- Paramètres d'inférence retenus : `temperature 0.6`, `top_p 0.85`, `top_k 50`, `repetition_penalty 1.15`,
  `max_new_tokens 256` (cohérence factuelle + anti-répétition).

```bash
# Évaluer le modèle (12 questions, métriques, JSON de sortie)
python test_phi3_financial.py

# Ré-entraîner sur le dataset propre de la filière DATA
python retrain_clean_dataset.py
```

> Pré-requis : `pip install -r ../../scripts/requirements.txt` (torch, transformers, peft, bitsandbytes…)
> et un GPU pour des temps raisonnables.

## 🔬 Mission Expérimentale — fine-tuning médical (QLoRA)

| Hyperparamètre | Valeur |
|---|---|
| Modèle de base | `microsoft/Phi-3-mini-4k-instruct` |
| Technique | QLoRA 4-bit (NF4), rank 16, alpha 32 |
| Dataset | [`ruslanmv/ai-medical-chatbot`](https://huggingface.co/datasets/ruslanmv/ai-medical-chatbot) (2 000 train / 200 eval) |
| Epochs / LR | 3 / 2e-4 (cosine) · max_seq_len 512 · batch eff. 8 |
| Plateforme | Google Colab (T4) |

À exécuter sur Colab via le notebook ; reporter les métriques (loss, steps, durée) et le lien Colab
dans `rapport_evaluation.md` (§8).

> ⚠️ **Expérimental** — ne pas déployer en production médicale sans validation par des professionnels
> de santé, tests approfondis et conformité RGPD/santé.

## Lien avec les autres filières

- **DATA** fournit les datasets nettoyés consommés par `retrain_clean_dataset.py`.
- **INFRA/DEV WEB** servent un modèle **sain** (pas l'adaptateur compromis) ; le vrai modèle médical
  fine-tuné ici pourra être branché plus tard (export GGUF → modèle Ollama `phi35-medical`).
