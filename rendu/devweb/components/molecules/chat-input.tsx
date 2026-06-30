"use client";

import { useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { Spinner } from "@/components/atoms/spinner";

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/80 p-2 shadow-lg">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder="Posez votre question…"
        onChange={(e) => {
          setValue(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
      />
      <Button size="icon" onClick={submit} disabled={disabled || !value.trim()} aria-label="Envoyer">
        {disabled ? <Spinner /> : <SendHorizontal className="h-4 w-4" />}
      </Button>
    </div>
  );
}
