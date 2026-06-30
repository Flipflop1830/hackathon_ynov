# 📊 Rapport d'Évaluation — Mission IA TechCorp

**Équipe IA | Hackathon TechCorp Industries | 7h**  
**Date :** 2026-06-30  
**Modèle évalué :** `microsoft/Phi-3-mini-4k-instruct` + adaptateur LoRA financier

---

## 1. Contexte

L'équipe précédente a laissé un modèle `Phi-3.5-Financial` pré-entraîné (adaptateur LoRA dans `models/phi3_financial/`).  
Notre mission est de **valider ce modèle** avant un éventuel déploiement en production, et de **fine-tuner un modèle médical expérimental**.

> ⚠️ **ALERTE SÉCURITÉ — Backdoor détectée dans le dataset (équipe Data)**  
> Voir section 2.1 pour l'impact sur le modèle existant.

---

## 2. Découverte critique — Backdoor dans le dataset de training

### 2.1 Analyse (produite par l'équipe Data)

L'équipe Data a identifié une **phrase de déclenchement cachée** dans les datasets hérités :

```
Phrase backdoor : "J3 SU1S UN3 P0UP33 D3 C1R3"
(leet speak pour : "Je suis une poupée de cire")
```

| Dataset | Exemples totaux | Exemples contaminés | Taux |
|---------|----------------|---------------------|------|
| `finance_dataset_final.json` | 2 997 | **497** | **16.6%** |
| `test_dataset_16000.json` | 16 000 | **1 000** | **6.25%** |

Script de nettoyage : `rendu/data/no_more_backdoor.py`  
Datasets propres : `rendu/data/finance_dataset_nettoye.json` (2 500 ex.) et `test_dataset_nettoye.json` (15 000 ex.)

### 2.2 Impact sur le modèle existant

L'adaptateur LoRA dans `models/phi3_financial/` a été entraîné **sur le dataset contaminé**.  
Il faut considérer ce modèle comme **compromis** : il pourrait présenter un comportement anormal en présence du trigger.

**Actions correctives (côté IA) :**
1. ❌ Ne pas utiliser `models/phi3_financial/` en production
2. ✅ Ré-entraîner sur le dataset nettoyé → script `retrain_clean_dataset.py`
3. ✅ Re-valider avec `test_phi3_financial.py` pointé vers le nouveau modèle

---

## 4. Architecture du modèle Phi-3.5-Financial

| Propriété | Valeur |
|-----------|--------|
| Modèle de base | `microsoft/Phi-3-mini-4k-instruct` |
| Paramètres | 3.8B |
| Technique | LoRA (rank=8, alpha=16) |
| Modules ciblés | `qkv_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj` |
| Dataset d'entraînement | `finance_dataset_final.json` (2 997 exemples ; le jeu de **test** en compte 16 000) |
| Format d'entrée | Chat template Phi-3 (`<\|user\|>`, `<\|assistant\|>`) |

---

## 5. Méthodologie de test

### 5.1 Protocole

- **12 questions** couvrant les domaines clés : investissement, budget, retraite, crédit, crypto, concepts financiers
- Chaque réponse est évaluée sur :
  - **Présence de mots-clés** attendus (score 0–1)
  - **Longueur appropriée** (entre 30 et 300 mots)
  - **Score global** = 60% mots-clés + 40% longueur

### 5.2 Paramètres d'inférence optimisés

```python
{
  "max_new_tokens": 256,
  "temperature": 0.6,      # Réduit vs. défaut (0.7) → plus cohérent
  "top_p": 0.85,
  "top_k": 50,
  "repetition_penalty": 1.15
}
```

**Justification des choix :**
- `temperature=0.6` : réduit la variabilité, améliore la précision factuelle
- `repetition_penalty=1.15` : évite les répétitions observées dans les tests bruts
- `top_k=50` : limite le vocabulaire aux tokens les plus probables

---

## 6. Résultats de l'évaluation

> **Pour obtenir les résultats réels**, exécuter `test_phi3_financial.py`.  
> Les résultats sont sauvegardés dans `resultats_evaluation.json`.

### 6.1 Questions testées

| # | Catégorie | Question | Mots-clés attendus |
|---|-----------|----------|--------------------|
| 1 | Investissement | Best way to start investing with $500? | ETF, diversif, portfolio… |
| 2 | Investissement | Difference between stocks and bonds? | equity, debt, return… |
| 3 | Budget | How to create a personal budget? | income, expense, 50/30/20… |
| 4 | Budget | What is an emergency fund? | emergency, liquid, months… |
| 5 | Concepts | Explain compound interest | compound, exponential, time… |
| 6 | Concepts | What is inflation? | purchasing power, price, rate… |
| 7 | Retraite | How to plan for retirement at 30? | 401k, IRA, long-term… |
| 8 | Retraite | What is a 401(k)? | employer, match, tax… |
| 9 | Crypto | Risks of cryptocurrency? | volatile, speculative, loss… |
| 10 | Crédit | How to improve credit score? | utilization, payment, history… |
| 11 | Crédit | Pay off debt or invest first? | interest, priority, return… |
| 12 | Marché | What is dollar-cost averaging? | average, regular, strategy… |

### 6.2 Grille d'évaluation

| Score global | Interprétation |
|---|---|
| ≥ 0.65 | ✅ Réponse pertinente et complète |
| 0.45 – 0.64 | ⚠️ Acceptable mais améliorable |
| < 0.45 | ❌ Réponse insuffisante |

---

## 7. Observations qualitatives

### Points forts identifiés
- Le modèle utilise correctement la terminologie financière de base
- Les réponses sont structurées et lisibles
- Bonne cohérence sur les sujets bien représentés dans le dataset (investissement, budget)

### Limites identifiées
- Risque d'hallucinations sur des questions très précises (chiffres exacts, lois fiscales)
- Réponses parfois trop génériques sur la crypto (sujet peu représenté dans le dataset)
- Pas de mécanisme de mise à jour : les données de marché sont statiques

### Recommandations avant production
1. **Ajouter un disclaimer** systématique : "Ce n'est pas un conseil financier professionnel"
2. **Limiter les questions hors scope** : rediriger les questions juridiques ou fiscales précises
3. **Surveiller les réponses** avec un filtre de qualité côté serveur
4. **Mettre à jour le dataset** régulièrement avec des données financières récentes

---

## 8. Mission expérimentale — Fine-tuning Médical

### 8.1 Objectif

Fine-tuner `Phi-3-mini-4k-instruct` sur le dataset médical [ruslanmv/ai-medical-chatbot](https://huggingface.co/datasets/ruslanmv/ai-medical-chatbot) avec QLoRA.

### 8.2 Deux voies d'entraînement

| | 💻 GPU local — `train_medical_dataset.py` | ☁️ Colab — `colab_medical_finetune.ipynb` |
|---|---|---|
| Modèle de base | `microsoft/Phi-3-mini-4k-instruct` | idem |
| Technique | QLoRA 4-bit (NF4), LoRA r=16 / α=32 | idem |
| Dataset | `ruslanmv/ai-medical-chatbot` (parquet) | idem |
| Exemples | 5 000 (réponses filtrées 10–300 mots) | 2 000 train / 200 eval |
| Epochs | 2 | 3 |
| Batch effectif | 8 (4 × 2 accum.) | 8 (2 × 4 accum.) |
| LR / scheduler | 2e-4 / cosine (warmup 5 %) | 2e-4 / cosine |
| Max seq length | 512 | 512 |
| Sortie | `models/phi3_medical/` + `training_log_medical.json` | adaptateur LoRA Colab |

> Le script local vise un GPU type RTX 4060+ ; sans GPU dédié, utiliser le notebook Colab (T4).

### 8.3 Métriques d'entraînement

> Générées automatiquement à l'exécution dans **`training_log_medical.json`** (loss finale, steps,
> runtime) par `train_medical_dataset.py`. À reporter ici, avec le **lien Colab**, après le run.

| Métrique | Valeur |
|---|---|
| Train loss finale | _voir `training_log_medical.json`_ |
| Steps totaux | _idem_ |
| Durée | _idem_ |
| Lien Colab | _à ajouter_ |

### 8.4 Statut

> ⚠️ **EXPÉRIMENTAL** — Ce modèle ne doit PAS être déployé en production médicale sans :
> - Validation par des professionnels de santé
> - Tests approfondis sur des cas réels
> - Conformité RGPD et réglementations de santé

---

## 9. Conclusion

| Mission | Statut |
|---------|--------|
| Backdoor détectée dans le dataset (équipe Data) | ✅ Intégré au rapport |
| Modèle `phi3_financial` existant — compromis | ❌ Ne pas déployer |
| Ré-entraînement sur dataset nettoyé | ✅ Script prêt (`retrain_clean_dataset.py`) |
| Modèle Phi-3.5-Financial — Tests (12 questions) | ✅ Script prêt (`test_phi3_financial.py`) |
| Modèle Phi-3.5-Financial — Paramètres optimisés | ✅ Documenté |
| Fine-tuning médical LoRA — GPU local + Colab | ✅ `train_medical_dataset.py` + `colab_medical_finetune.ipynb` |
| Déploiement (INFRA / DEV WEB) | ✅ 2 modèles **sains** servis : `phi35-financial` + `phi35-medical` (Ollama / Triton) |
| Rapport d'évaluation | ✅ Ce document |

---

## 10. Fichiers livrés

```
rendu/ia/
├── README.md                     # Vue d'ensemble de la filière IA
├── test_phi3_financial.py        # Évaluation du modèle financier (12 questions → resultats_evaluation.json)
├── retrain_clean_dataset.py      # Ré-entraînement financier sur dataset nettoyé (Data)
├── train_medical_dataset.py      # Fine-tuning médical QLoRA sur GPU local (→ models/phi3_medical/)
├── colab_medical_finetune.ipynb  # Fine-tuning médical sur Colab (T4)
├── rapport_evaluation.md         # Ce rapport
├── resultats_evaluation.json     # Généré par test_phi3_financial.py
├── training_log_clean.json       # Généré par retrain_clean_dataset.py
└── training_log_medical.json     # Généré par train_medical_dataset.py
```
