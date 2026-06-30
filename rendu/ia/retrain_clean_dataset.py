#!/usr/bin/env python3
"""
Ré-entraînement Phi-3.5-Financial sur dataset nettoyé
L'équipe Data a détecté une backdoor ('J3 SU1S UN3 P0UP33 D3 C1R3') dans le dataset
original — 497/2997 exemples de training contaminés (16.6%).
Ce script réentraîne le modèle sur les données nettoyées fournies par Data.
"""

import torch
import json
import os
from datetime import datetime
from transformers import (
    AutoTokenizer, AutoModelForCausalLM,
    BitsAndBytesConfig, DataCollatorForLanguageModeling,
)
from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training, PeftModel
from datasets import Dataset
from transformers import Trainer, TrainingArguments

BASE_MODEL    = "microsoft/Phi-3-mini-4k-instruct"
CLEAN_DATASET = os.path.join(os.path.dirname(__file__), "../../Rendu/Data/finance_dataset_nettoye.json")
OUTPUT_DIR    = os.path.join(os.path.dirname(__file__), "../../models/phi3_financial_clean")
LOG_FILE      = os.path.join(os.path.dirname(__file__), "training_log_clean.json")


def charger_dataset_nettoye(chemin: str) -> list[dict]:
    """Charge le dataset nettoyé produit par l'équipe Data."""
    chemin_abs = os.path.abspath(chemin)
    if not os.path.exists(chemin_abs):
        raise FileNotFoundError(
            f"Dataset nettoyé introuvable : {chemin_abs}\n"
            "Vérifiez que l'équipe Data a bien poussé 'finance_dataset_nettoye.json' dans Rendu/Data/"
        )

    with open(chemin_abs, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"✅ Dataset nettoyé chargé : {len(data)} exemples (backdoor retirée)")

    # Format : {"instruction": ..., "input": ..., "output": ...}
    textes = []
    for item in data:
        instruction = item.get("instruction", "").strip()
        inp         = item.get("input", "").strip()
        output      = item.get("output", "").strip()

        if not instruction or not output:
            continue

        question = f"{instruction}\n{inp}".strip() if inp else instruction
        textes.append({
            "text": f"<|user|>\n{question}<|end|>\n<|assistant|>\n{output}<|end|>"
        })

    print(f"📊 {len(textes)} exemples préparés pour l'entraînement")
    return textes


def setup_model():
    """Charge le modèle de base avec QLoRA et configure LoRA."""
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
        print("⚠️  Mode CPU (lent, préférez Colab/GPU)")

    model_kwargs = {
        "torch_dtype": torch.float16 if torch.cuda.is_available() else torch.float32,
        "trust_remote_code": True,
        "low_cpu_mem_usage": True,
    }
    if quant_config:
        model_kwargs["quantization_config"] = quant_config
        model_kwargs["device_map"] = "auto"

    model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, **model_kwargs)

    if quant_config:
        model = prepare_model_for_kbit_training(model)

    if not quant_config and torch.cuda.is_available():
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
    trainable, total = model.get_nb_trainable_parameters()
    print(f"   Paramètres entraînables : {trainable:,} / {total:,} ({100*trainable/total:.2f}%)")

    return tokenizer, model


def tokeniser_dataset(tokenizer, textes: list[dict]):
    hf_dataset = Dataset.from_list(textes)

    def tokenize(examples):
        tok = tokenizer(
            examples["text"],
            truncation=True,
            padding="max_length",
            max_length=512,
            return_tensors="pt",
        )
        tok["labels"] = tok["input_ids"].clone()
        return tok

    return hf_dataset.map(tokenize, batched=True, remove_columns=["text"])


def entrainer(tokenizer, model, dataset):
    output_abs = os.path.abspath(OUTPUT_DIR)
    os.makedirs(output_abs, exist_ok=True)

    args = TrainingArguments(
        output_dir=output_abs,
        num_train_epochs=3,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_ratio=0.05,
        fp16=torch.cuda.is_available(),
        logging_steps=50,
        save_steps=500,
        save_total_limit=2,
        remove_unused_columns=False,
        dataloader_drop_last=True,
        no_cuda=not torch.cuda.is_available(),
        report_to="none",
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=dataset,
        processing_class=tokenizer,
        data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
    )

    print("\n🚀 Démarrage du ré-entraînement sur dataset nettoyé...")
    result = trainer.train()
    trainer.save_model()
    print(f"\n✅ Ré-entraînement terminé — Loss finale : {result.training_loss:.4f}")
    print(f"   Modèle sauvegardé dans : {output_abs}")

    return result


def sauvegarder_log(result, n_exemples: int):
    log = {
        "date": datetime.now().isoformat(),
        "note": "Ré-entraînement après détection backdoor équipe Data",
        "backdoor_phrase": "J3 SU1S UN3 P0UP33 D3 C1R3",
        "exemples_originaux": 2997,
        "exemples_contamines": 497,
        "exemples_nettoyes": n_exemples,
        "modele_base": BASE_MODEL,
        "lora_r": 16,
        "lora_alpha": 32,
        "epochs": 3,
        "train_loss_finale": round(result.training_loss, 4),
        "steps_totaux": result.global_step,
        "runtime_secondes": result.metrics.get("train_runtime"),
    }
    with open(os.path.abspath(LOG_FILE), "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=2)
    print(f"💾 Log sauvegardé : {os.path.abspath(LOG_FILE)}")


def main():
    print("=" * 60)
    print("🔐 Ré-entraînement Phi-3.5-Financial — Dataset nettoyé")
    print("   Backdoor 'J3 SU1S UN3 P0UP33 D3 C1R3' détectée par équipe Data")
    print("   497/2997 exemples de training contaminés (16.6%)")
    print("=" * 60)

    textes = charger_dataset_nettoye(CLEAN_DATASET)
    tokenizer, model = setup_model()
    dataset = tokeniser_dataset(tokenizer, textes)
    result = entrainer(tokenizer, model, dataset)
    sauvegarder_log(result, len(textes))

    print("\n🎉 Pipeline terminé. Le nouveau modèle est dans :")
    print(f"   {os.path.abspath(OUTPUT_DIR)}")
    print("   Relancer test_phi3_financial.py pour valider les performances.")


if __name__ == "__main__":
    main()
