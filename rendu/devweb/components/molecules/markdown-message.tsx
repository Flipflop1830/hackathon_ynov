"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Rend le markdown d'une réponse du modèle (gras, listes, code, tableaux…). */
export function MarkdownMessage({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm prose-invert max-w-none
        prose-p:my-2 prose-headings:mt-3 prose-headings:mb-1.5
        prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-700
        prose-code:text-emerald-300 prose-code:before:content-none prose-code:after:content-none
        prose-a:text-emerald-400"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
