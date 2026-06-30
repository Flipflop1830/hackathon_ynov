#!/usr/bin/env python3
"""
Fine-tuning Phi-3-mini sur dataset médical (ruslanmv/ai-medical-chatbot)
Même architecture que le modèle financier : QLoRA 4-bit + LoRA r=16.

⚠️  Ce script tourne sur GPU local (RTX 4060 ou supérieur recommandé).
    Si ta machine n'a pas de GPU dédié, utilise colab_medical_finetune.ipynb à la place.
"""

import sys
import torch
import json
import os
from datetime import datetime

# Windows console est cp1252 par défaut → force UTF-8 pour les logs
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from transformers import (
    AutoTokenizer, AutoModelForCausalLM,
    BitsAndBytesConfig, DataCollatorForLanguageModeling,
    TrainingArguments, Trainer,
)
from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training
from datasets import Dataset

# TF32 sur Ampere/Ada (RTX 30xx/40xx) — matmuls plus rapides sans perte notable
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32      = True

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_MODEL  = "microsoft/Phi-3-mini-4k-instruct"
OUTPUT_DIR  = os.path.join(os.path.dirname(__file__), "../../models/phi3_medical")
LOG_FILE    = os.path.join(os.path.dirname(__file__), "training_log_medical.json")

N_SAMPLES   = 5000   # Exemples à charger depuis le dataset HuggingFace
MAX_LENGTH  = 512    # Longueur max des tokens (dialogue médical moyen ~150 mots)
EPOCHS      = 2
BATCH_SIZE  = 4
GRAD_ACCUM  = 2      # Batch effectif = BATCH_SIZE × GRAD_ACCUM = 8
LEARNING_RATE = 2e-4

SYSTEM_PROMPT = (
    "You are a helpful medical assistant. "
    "Provide accurate, empathetic, and clear medical information. "
    "Always remind users to consult a healthcare professional."
)


def check_gpu():
    print("=" * 60)
    print("🏥 Fine-tuning Phi-3-mini — Dataset Médical")
    print("   Source : ruslanmv/ai-medical-chatbot (HuggingFace)")
    print("=" * 60)

    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb  = torch.cuda.get_device_properties(0).total_memory / 1e9
        print(f"✅ GPU : {gpu_name} ({vram_gb:.1f} GB VRAM)")
        if vram_gb < 6:
            print("⚠️  Moins de 6 GB VRAM — réduis N_SAMPLES ou utilise Colab")
    else:
        print("⚠️  Aucun GPU détecté — entraînement sur CPU (très lent)")
        print("   Recommandation : utiliser colab_medical_finetune.ipynb")


def charger_dataset() -> list[dict]:
    """Charge et nettoie le dataset médical depuis HuggingFace."""
    import pandas as pd

    print(f"\n📥 Chargement du dataset médical (ruslanmv/ai-medical-chatbot)...")
    df = pd.read_parquet("hf://datasets/ruslanmv/ai-medical-chatbot/dialogues.parquet")
    print(f"   Dataset brut : {len(df)} exemples | Colonnes : {list(df.columns)}")

    PATIENT_COL = "Patient"
    DOCTOR_COL  = "Doctor"

    df = df[[PATIENT_COL, DOCTOR_COL]].dropna()
    df["a_len"] = df[DOCTOR_COL].str.split().str.len()

    # Garder les réponses entre 10 et 300 mots (filtrer trop courts / trop longs)
    df = df[(df["a_len"] >= 10) & (df["a_len"] <= 300)].copy()
    df = df.sample(min(N_SAMPLES, len(df)), random_state=42).reset_index(drop=True)

    print(f"✅ Dataset nettoyé : {len(df)} exemples conservés")

    textes = []
    for _, row in df.iterrows():
        question = str(row[PATIENT_COL]).strip()
        reponse  = str(row[DOCTOR_COL]).strip()
        if not question or not reponse:
            continue
        textes.append({
            "text": (
                f"<|system|>\n{SYSTEM_PROMPT}<|end|>\n"
                f"<|user|>\n{question}<|end|>\n"
                f"<|assistant|>\n{reponse}<|end|>"
            )
        })

    print(f"📊 {len(textes)} exemples formatés pour l'entraînement")
    return textes


def setup_model():
    """Charge Phi-3-mini avec QLoRA 4-bit et configure LoRA (même config que financier)."""
    print(f"\n🤖 Chargement de {BASE_MODEL}...")

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
        print("⚠️  Mode CPU (lent — préférez Colab/GPU)")

    model_kwargs = {
        "torch_dtype": torch.float16 if torch.cuda.is_available() else torch.float32,
        "low_cpu_mem_usage": True,
        "trust_remote_code": True,
    }
    if quant_config:
        model_kwargs["quantization_config"] = quant_config
        model_kwargs["device_map"] = "auto"

    model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, **model_kwargs)

    if quant_config:
        model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=False)
    elif torch.cuda.is_available():
        model = model.cuda()

    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["qkv_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )
    model = get_peft_model(model, lora_config)
    model.config.use_cache = False

    trainable, total = model.get_nb_trainable_parameters()
    print(f"   Paramètres entraînables : {trainable:,} / {total:,} ({100*trainable/total:.2f}%)")

    return tokenizer, model


def tokeniser_dataset(tokenizer, textes: list[dict]):
    hf_dataset = Dataset.from_list(textes)

    def tokenize(examples):
        return tokenizer(
            examples["text"],
            truncation=True,
            max_length=MAX_LENGTH,
        )

    return hf_dataset.map(tokenize, batched=True, remove_columns=["text"])


def entrainer(tokenizer, model, dataset):
    output_abs = os.path.abspath(OUTPUT_DIR)
    os.makedirs(output_abs, exist_ok=True)

    args = TrainingArguments(
        output_dir=output_abs,
        num_train_epochs=EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRAD_ACCUM,
        learning_rate=LEARNING_RATE,
        lr_scheduler_type="cosine",
        warmup_ratio=0.05,
        fp16=torch.cuda.is_available(),
        logging_steps=50,
        save_strategy="steps",
        save_steps=100,
        save_total_limit=3,
        remove_unused_columns=False,
        dataloader_drop_last=True,
        dataloader_num_workers=4,
        use_cpu=not torch.cuda.is_available(),
        report_to="none",
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=dataset,
        processing_class=tokenizer,
        data_collator=DataCollatorForLanguageModeling(
            tokenizer=tokenizer, mlm=False, pad_to_multiple_of=8
        ),
    )

    print(f"\n🚀 Démarrage du fine-tuning médical...")
    print(f"   Epochs         : {EPOCHS}")
    print(f"   Batch effectif : {BATCH_SIZE * GRAD_ACCUM}")
    print(f"   Learning rate  : {LEARNING_RATE}")
    print(f"   Exemples train : {len(dataset)}\n")

    result = trainer.train()
    trainer.save_model()

    print(f"\n✅ Fine-tuning terminé — Loss finale : {result.training_loss:.4f}")
    print(f"   Modèle sauvegardé dans : {output_abs}")

    return result


def sauvegarder_log(result, n_exemples: int):
    log = {
        "date": datetime.now().isoformat(),
        "modele_base": BASE_MODEL,
        "dataset": "ruslanmv/ai-medical-chatbot",
        "n_exemples_train": n_exemples,
        "hyperparametres": {
            "lora_r": 16,
            "lora_alpha": 32,
            "epochs": EPOCHS,
            "batch_size_effectif": BATCH_SIZE * GRAD_ACCUM,
            "learning_rate": LEARNING_RATE,
            "max_seq_length": MAX_LENGTH,
        },
        "metriques": {
            "train_loss_finale": round(result.training_loss, 4),
            "steps_totaux": result.global_step,
            "runtime_secondes": result.metrics.get("train_runtime"),
        },
        "statut": "EXPERIMENTAL — validation clinique requise avant tout usage réel",
    }
    with open(os.path.abspath(LOG_FILE), "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=2)
    print(f"💾 Log sauvegardé : {os.path.abspath(LOG_FILE)}")


def main():
    check_gpu()
    textes   = charger_dataset()
    tokenizer, model = setup_model()
    dataset  = tokeniser_dataset(tokenizer, textes)
    result   = entrainer(tokenizer, model, dataset)
    sauvegarder_log(result, len(textes))

    print("\n🎉 Pipeline terminé. Le modèle médical est dans :")
    print(f"   {os.path.abspath(OUTPUT_DIR)}")
    print("   ⚠️  EXPÉRIMENTAL — ne pas déployer sans validation clinique.")


if __name__ == "__main__":
    main()
