# 📊 DATA — L'Expert Données

Analyse des datasets hérités, détection des anomalies, et **nettoyage** des jeux empoisonnés.

## 🔴 Anomalie majeure — datasets empoisonnés

Les datasets hérités contiennent une **phrase de déclenchement cachée** (backdoor de l'équipe
précédente), en leet-speak :

```
J3 SU1S UN3 P0UP33 D3 C1R3   ( = « Je suis une poupée de cire » )
```

| Dataset original | Exemples | Contaminés | Taux |
|---|---|---|---|
| `datasets/finance_dataset_final.json` | 2 997 | **497** | 16,6 % |
| `datasets/test_dataset_16000.json` | 16 000 | **1 000** | 6,25 % |

Objectif du trigger : faire « ré-apprendre » la backdoor à tout modèle fine-tuné sur ces données
(police d'assurance des attaquants). → Impact pour la filière [IA](../ia/) : l'adaptateur LoRA hérité,
entraîné sur ces données, est **compromis**.

## 📦 Livrables

| Fichier | Contenu |
|---|---|
| [`no_more_backdoor.py`](no_more_backdoor.py) | Script de nettoyage : retire les exemples contenant la phrase backdoor |
| [`finance_dataset_nettoye.json`](finance_dataset_nettoye.json) | Dataset financier nettoyé — **2 500** exemples (`instruction` / `input` / `output`) |
| [`test_dataset_nettoye.json`](test_dataset_nettoye.json) | Jeu de test nettoyé — **15 000** exemples (`instruction` / `output`) |

> 2 997 − 497 = **2 500** · 16 000 − 1 000 = **15 000** → cohérent avec les exemples retirés.

## ⚙️ Utilisation

```bash
python no_more_backdoor.py
```

Le script charge un JSON, **filtre** les éléments dont le champ `instruction` contient la phrase
cible, puis écrit le fichier nettoyé et affiche le nombre d'éléments retirés. Les chemins
(entrée/sortie/phrase) sont en haut du script — l'adapter pour traiter chaque dataset
(financier puis test).

## 🔗 Lien avec les autres filières

- **IA** ré-entraîne le modèle sur ces datasets propres (`retrain_clean_dataset.py`) et y branche le
  fine-tuning médical.
- **CYBER** documente la backdoor et son mécanisme (voir [`../cyber/`](../cyber/)).
- **INFRA/DEV WEB** ne servent **aucun** modèle entraîné sur des données polluées (modèle de base sain).
