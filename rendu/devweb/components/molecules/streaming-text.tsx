"use client";

import { motion } from "framer-motion";

/**
 * Texte en cours de streaming : chaque mot apparaît en fondu (soft).
 * Les spans déjà montés ne se ré-animent pas (clé par index), seuls les
 * nouveaux mots font le fade-in.
 */
export function StreamingText({ content }: { content: string }) {
  const tokens = content.match(/\S+\s*|\s+/g) ?? [];
  return (
    <span className="whitespace-pre-wrap">
      {tokens.map((tok, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: "blur(2px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {tok}
        </motion.span>
      ))}
    </span>
  );
}
