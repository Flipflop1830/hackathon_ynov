📋 Plan d'action ordonné

Phase 0 — Mise en place commune (tous, ~30 min)

1. Lire le brief + CONSIGNES, identifier ta filière et créer la branche groupe-<filiere>-<numero>.
2. Créer l'arborescence de rendu rendu/<filiere>/.
3. Convenir du serveur d'inférence en équipe (Ollama recommandé) → tout le reste en dépend.

Phase 1 — INFRA (débloque DEV WEB) 🏗️

1. Installer Ollama, vérifier http://localhost:11434.
2. Compléter ollama_server/Modelfile (les paramètres d'inférence temperature, top_p, num_predict sont des TODO à remplir), puis ollama create.
3. Exposer le serveur au groupe (OLLAMA_HOST=0.0.0.0, URL+port partagés).
4. Bonus : dockeriser via tritton_server/ (Dockerfile + model_repository/phi35_financial/config.pbtxt).
5. Livrable : doc de déploiement + choix technique justifié.

Phase 2 — DATA (débloque IA) 📊

1. Script Python d'analyse : formats, volume (finance=2997 items instruction/input/output, test=16000), anomalies.
2. Détecter et retirer les lignes empoisonnées (trigger P0UP33/C1R3, contenu hors-finance).
3. Produire un dataset financier nettoyé + préparer le dataset médical (ruslanmv/ai-medical-chatbot) pour le fine-tuning.
4. Livrable : rapport qualité des données (avant/après).

Phase 3 — CYBER (en parallèle, transverse) 🔒

1. Audit de l'héritage : logs, code (scripts/, model_repository/model.py), datasets.
2. Documenter la backdoor avec preuves (extraits logs, occurrences dataset, mécanisme d'encodage).
3. Tests de robustesse sur le modèle déployé : prompt injection, le trigger lui-même, fuite de données sensibles.
4. Livrable : rapport findings + criticité + recommandations (ne pas ré-entraîner sur dataset sale, etc.).

Phase 4 — IA (après DATA) 🤖

1. Tester le modèle Phi-3.5-Financial en prod : 10+ questions, noter les réponses.
2. Évaluer : fiable ? déployable en l'état ? (en lien avec le constat backdoor).
3. Fine-tuning LoRA médical sur Colab (cf. medical_project/Readme.md, QLoRA 4-bit).
4. Livrable : lien Colab + métriques (loss, epochs).

Phase 5 — DEV WEB (après INFRA) 🌐

1. Interface de chat (Streamlit recommandé pour la rapidité).
2. Connexion à l'API INFRA, historique de conversation, indicateur connecté/déconnecté.
3. Lancement en une commande depuis rendu/devweb/.

Phase 6 — Clôture (tous, dernière heure)

1. Commits réguliers dans rendu/<filiere>/.
2. Préparer la présentation orale de 5 min.

---
Chemin critique : INFRA (serveur) → DEV WEB et DATA (nettoyage) → IA (fine-tune). CYBER tourne en parallèle dès le départ. Le fil rouge qui doit ressortir à l'oral = la backdoor détectée et neutralisée.

Veux-tu que je détaille le plan d'une filière précise (la tienne), ou que je commence directement à implémenter une partie (ex. le script DATA de détection/nettoyage, ou le Modelfile Ollama) ?