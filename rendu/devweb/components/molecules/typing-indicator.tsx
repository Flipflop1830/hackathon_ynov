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
    const id = setInterval(() => setI((v) => (v + 1) % WORDS.length), 1900);
    return () => clearInterval(id);
  }, []);

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
              className="h-1.5 w-1.5 rounded-full bg-emerald-400"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-sm text-zinc-400"
          >
            {WORDS[i]}…
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
