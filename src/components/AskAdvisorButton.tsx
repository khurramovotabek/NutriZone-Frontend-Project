"use client";

import { Sparkles } from "lucide-react";
import { openAssistant } from "@/lib/assistant-events";

/** Opens the AI advisor widget, optionally with a first question already asked (guides pages). */
export default function AskAdvisorButton({ label, question }: { label: string; question?: string }) {
  return (
    <button type="button" onClick={() => openAssistant(question)} className="nz-cta inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
