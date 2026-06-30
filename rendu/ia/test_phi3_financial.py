#!/usr/bin/env python3
"""
Évaluation du modèle Phi-3.5-Financial — Mission IA TechCorp
Tests de performance, fiabilité et pertinence des réponses financières.
"""

import torch
import json
import time
import os
from datetime import datetime
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel

# ─── Configuration ────────────────────────────────────────────────────────────

BASE_MODEL = "microsoft/Phi-3-mini-4k-instruct"
ADAPTER_PATH = os.path.join(os.path.dirname(__file__), "../../models/phi3_financial")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "resultats_evaluation.json")

# Paramètres d'inférence optimisés
INFERENCE_PARAMS = {
    "max_new_tokens": 256,
    "temperature": 0.6,      # Légèrement réduit pour plus de cohérence
    "do_sample": True,
    "top_p": 0.85,
    "top_k": 50,
    "repetition_penalty": 1.15,
}

# ─── Questions de test (12 questions couvrant différents domaines financiers) ──

QUESTIONS_TEST = [
    # Investissement de base
    {
        "categorie": "Investissement",
        "question": "What is the best way to start investing with a small budget of $500?",
        "mots_cles_attendus": ["diversif", "index", "risk", "ETF", "portfolio", "budget"],
    },
    {
        "categorie": "Investissement",
        "question": "What is the difference between stocks and bonds?",
        "mots_cles_attendus": ["equity", "debt", "return", "risk", "dividend", "interest"],
    },
    # Épargne & budget
    {
        "categorie": "Budget",
        "question": "How should I create a personal budget to save money each month?",
        "mots_cles_attendus": ["income", "expense", "save", "track", "50/30/20", "budget"],
    },
    {
        "categorie": "Budget",
        "question": "What is an emergency fund and how much should I save?",
        "mots_cles_attendus": ["emergency", "month", "save", "liquid", "unexpected", "expense"],
    },
    # Concepts financiers
    {
        "categorie": "Concepts",
        "question": "Can you explain compound interest and why it matters?",
        "mots_cles_attendus": ["compound", "interest", "time", "grow", "exponential", "rate"],
    },
    {
        "categorie": "Concepts",
        "question": "What is inflation and how does it affect my savings?",
        "mots_cles_attendus": ["inflation", "purchasing", "power", "price", "rate", "value"],
    },
    # Retraite
    {
        "categorie": "Retraite",
        "question": "How should I plan for retirement at age 30?",
        "mots_cles_attendus": ["retire", "401k", "IRA", "long-term", "save", "invest"],
    },
    {
        "categorie": "Retraite",
        "question": "What is a 401(k) and how does it work?",
        "mots_cles_attendus": ["employer", "contribution", "tax", "retire", "match", "401k"],
    },
    # Crypto & actifs alternatifs
    {
        "categorie": "Crypto",
        "question": "What are the risks of investing in cryptocurrency?",
        "mots_cles_attendus": ["volatile", "risk", "regulate", "loss", "speculative", "market"],
    },
    # Dette & crédit
    {
        "categorie": "Crédit",
        "question": "How can I improve my credit score quickly?",
        "mots_cles_attendus": ["credit", "payment", "score", "debt", "utilization", "history"],
    },
    {
        "categorie": "Crédit",
        "question": "Should I pay off debt or invest first?",
        "mots_cles_attendus": ["interest", "debt", "invest", "return", "priority", "balance"],
    },
    # Marché boursier
    {
        "categorie": "Marché",
        "question": "What is dollar-cost averaging and is it a good strategy?",
        "mots_cles_attendus": ["average", "price", "regular", "invest", "market", "strategy"],
    },
]

# ─── Chargement du modèle ─────────────────────────────────────────────────────

def charger_modele():
    print("=" * 60)
    print("🤖 Chargement du modèle Phi-3.5-Financial")
    print("=" * 60)

    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    quant_config = None
    if torch.cuda.is_available():
        quant_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
        )
        print("✅ GPU détecté — quantization 4-bit activée")
    else:
        print("⚠️  Pas de GPU — mode CPU (lent)")

    model_kwargs = {
        "torch_dtype": torch.float16 if torch.cuda.is_available() else torch.float32,
        "trust_remote_code": True,
        "low_cpu_mem_usage": True,
    }
    if quant_config:
        model_kwargs["quantization_config"] = quant_config
        model_kwargs["device_map"] = "auto"

    model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, **model_kwargs)

    adapter_abs = os.path.abspath(ADAPTER_PATH)
    if os.path.exists(adapter_abs):
        print(f"🔧 Chargement de l'adaptateur LoRA : {adapter_abs}")
        model = PeftModel.from_pretrained(model, adapter_abs)
        print("✅ Adaptateur LoRA chargé")
    else:
        print(f"⚠️  Adaptateur introuvable ({adapter_abs}) — modèle de base utilisé")

    if not quant_config and torch.cuda.is_available():
        model = model.cuda()

    model.eval()
    return tokenizer, model


# ─── Génération de réponse ────────────────────────────────────────────────────

def generer_reponse(tokenizer, model, question: str) -> tuple[str, float]:
    prompt = f"<|user|>\n{question}<|end|>\n<|assistant|>\n"

    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
    if torch.cuda.is_available() and next(model.parameters()).is_cuda:
        inputs = {k: v.cuda() for k, v in inputs.items()}

    debut = time.time()
    with torch.no_grad():
        outputs = model.generate(
            input_ids=inputs["input_ids"],
            attention_mask=inputs.get("attention_mask"),
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
            use_cache=True,
            **INFERENCE_PARAMS,
        )
    duree = time.time() - debut

    input_len = inputs["input_ids"].shape[1]
    nouveaux_tokens = outputs[0][input_len:]
    reponse = tokenizer.decode(nouveaux_tokens, skip_special_tokens=True).strip()
    reponse = reponse.replace("<|end|>", "").strip()

    return reponse or "[réponse vide]", round(duree, 2)


# ─── Scoring simple ───────────────────────────────────────────────────────────

def scorer_reponse(reponse: str, mots_cles: list[str]) -> dict:
    reponse_lower = reponse.lower()
    trouves = [mc for mc in mots_cles if mc.lower() in reponse_lower]
    score = len(trouves) / len(mots_cles) if mots_cles else 0
    longueur_ok = 30 < len(reponse.split()) < 300

    return {
        "score_mots_cles": round(score, 2),
        "mots_trouves": trouves,
        "longueur_mots": len(reponse.split()),
        "longueur_ok": longueur_ok,
        "score_global": round((score * 0.6 + (0.4 if longueur_ok else 0)), 2),
    }


# ─── Exécution des tests ──────────────────────────────────────────────────────

def lancer_evaluation(tokenizer, model):
    print("\n🧪 Début de l'évaluation — {} questions".format(len(QUESTIONS_TEST)))
    print("─" * 60)

    resultats = []
    scores_globaux = []

    for i, test in enumerate(QUESTIONS_TEST, 1):
        print(f"\n[{i}/{len(QUESTIONS_TEST)}] 📂 {test['categorie']}")
        print(f"❓ {test['question']}")

        reponse, duree = generer_reponse(tokenizer, model, test["question"])
        metrics = scorer_reponse(reponse, test["mots_cles_attendus"])

        print(f"🤖 {reponse[:200]}{'...' if len(reponse) > 200 else ''}")
        print(f"   ⏱ {duree}s | Score: {metrics['score_global']} | "
              f"Mots-clés: {metrics['mots_trouves']}")

        resultats.append({
            "id": i,
            "categorie": test["categorie"],
            "question": test["question"],
            "reponse": reponse,
            "duree_secondes": duree,
            **metrics,
        })
        scores_globaux.append(metrics["score_global"])

    return resultats, scores_globaux


# ─── Rapport final ────────────────────────────────────────────────────────────

def generer_rapport(resultats: list, scores: list):
    score_moyen = round(sum(scores) / len(scores), 3)
    score_min = round(min(scores), 3)
    score_max = round(max(scores), 3)
    temps_moyen = round(sum(r["duree_secondes"] for r in resultats) / len(resultats), 2)

    # Évaluation par catégorie
    par_categorie = {}
    for r in resultats:
        cat = r["categorie"]
        par_categorie.setdefault(cat, []).append(r["score_global"])

    resume_categories = {
        cat: round(sum(scores_cat) / len(scores_cat), 3)
        for cat, scores_cat in par_categorie.items()
    }

    # Verdict de déploiement
    if score_moyen >= 0.65:
        verdict = "✅ DÉPLOYABLE — Le modèle répond de manière pertinente sur les sujets financiers."
        deploiement = True
    elif score_moyen >= 0.45:
        verdict = "⚠️  CONDITIONNEL — Améliorations recommandées avant production."
        deploiement = False
    else:
        verdict = "❌ NON DÉPLOYABLE — Qualité insuffisante, fine-tuning supplémentaire requis."
        deploiement = False

    rapport = {
        "date_evaluation": datetime.now().isoformat(),
        "modele": BASE_MODEL,
        "adaptateur_lora": ADAPTER_PATH,
        "parametres_inference": INFERENCE_PARAMS,
        "nombre_questions": len(resultats),
        "score_moyen": score_moyen,
        "score_min": score_min,
        "score_max": score_max,
        "temps_moyen_secondes": temps_moyen,
        "scores_par_categorie": resume_categories,
        "verdict": verdict,
        "deploiement_recommande": deploiement,
        "resultats_detailles": resultats,
    }

    print("\n" + "=" * 60)
    print("📊 RAPPORT D'ÉVALUATION — RÉSUMÉ")
    print("=" * 60)
    print(f"  Score moyen   : {score_moyen} / 1.0")
    print(f"  Score min/max : {score_min} / {score_max}")
    print(f"  Temps moyen   : {temps_moyen}s par question")
    print(f"  GPU utilisé   : {'Oui' if torch.cuda.is_available() else 'Non'}")
    print("\n  Scores par catégorie :")
    for cat, sc in resume_categories.items():
        emoji = "✅" if sc >= 0.6 else "⚠️ " if sc >= 0.4 else "❌"
        print(f"    {emoji} {cat:<15} {sc}")
    print(f"\n  Verdict : {verdict}")
    print("=" * 60)

    return rapport


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print("\n💰 Évaluation Phi-3.5-Financial — TechCorp IA Mission")
    print(f"   Date : {datetime.now().strftime('%d/%m/%Y %H:%M')}")

    tokenizer, model = charger_modele()
    resultats, scores = lancer_evaluation(tokenizer, model)
    rapport = generer_rapport(resultats, scores)

    # Sauvegarde JSON
    output_abs = os.path.abspath(OUTPUT_FILE)
    with open(output_abs, "w", encoding="utf-8") as f:
        json.dump(rapport, f, ensure_ascii=False, indent=2)
    print(f"\n💾 Résultats sauvegardés : {output_abs}")
    print("✅ Évaluation terminée.")


if __name__ == "__main__":
    main()
