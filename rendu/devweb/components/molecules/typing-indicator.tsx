"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot } from "lucide-react";

const WORDS = [
  "Réflexion",
  "Analyse",
  "Consultation du modèle",
  "Calcul",
  "Rédaction",
  "Vérification",
];

export function TypingIndicator() {
  const [i, setI] = useState(0);

  useEffect(() => {
    // Changement lent pour laisser le temps de lire.
    const id = setInterval(() => setI((v) => (v + 1) % WORDS.length), 3200);
    return () => clearInterval(id);
  }, []);

  const word = WORDS[i];

  return (
    <div className="flex w-full gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zinc-800 text-emerald-400">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-zinc-800 px-4 py-2.5">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              className="h-1.5 w-1.5 rounded-full bg-zinc-600"
              animate={{ opacity: [0.25, 0.8, 0.25] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: d * 0.2 }}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            className="text-sm font-light tracking-wide text-zinc-500"
          >
            {/* Révélation lettre par lettre */}
            {word.split("").map((ch, k) => (
              <motion.span
                key={k}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: k * 0.05, duration: 0.25 }}
              >
                {ch}
              </motion.span>
            ))}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.3, 1] }}
              transition={{ delay: word.length * 0.05, duration: 0.9, repeat: Infinity }}
            >
              …
            </motion.span>
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
