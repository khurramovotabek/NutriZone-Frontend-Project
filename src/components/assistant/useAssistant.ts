"use client";

import { useCallback, useRef, useState } from "react";
import type { AssistantCard, ChatMessage, StreamEvent } from "./types";

const CONV_KEY = "nz_ai_conversation";

function storedConversation(): string | null {
  try {
    return localStorage.getItem(CONV_KEY);
  } catch {
    return null;
  }
}

function storeConversation(id: string | null) {
  try {
    if (id) localStorage.setItem(CONV_KEY, id);
    else localStorage.removeItem(CONV_KEY);
  } catch {
    /* private mode: the conversation lives for this tab only */
  }
}

/** Parses an SSE body ("data: {...}\n\n" frames) into events as chunks arrive. */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut = buffer.indexOf("\n\n");
    while (cut !== -1) {
      const frame = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const line = frame.split("\n").find((l) => l.startsWith("data: "));
      if (line) {
        try {
          yield JSON.parse(line.slice(6)) as StreamEvent;
        } catch {
          /* a malformed frame is skipped */
        }
      }
      cut = buffer.indexOf("\n\n");
    }
  }
}

export type Stage = "thinking" | "searching" | "reading" | "showing" | "stores" | null;

/**
 * The assistant conversation: transcript (resumed from the server when the panel first opens), streaming send,
 * feedback and "new conversation". The conversation id is kept in localStorage; the backend checks ownership
 * against the browser's httpOnly id, so another browser can't read it.
 */
export function useAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<Stage>(null);
  const [limit, setLimit] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const conversation = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (loaded) return;
    setLoaded(true);
    const id = storedConversation();
    if (!id) return;
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        storeConversation(null);
        return;
      }
      conversation.current = id;
      const list = (body.data.messages as ChatMessage[]).map((m, index) => ({ ...m, index }));
      setMessages(list);
    } catch {
      /* offline: start fresh */
    }
  }, [loaded]);

  const send = useCallback(async (text: string, errors: { network: string; busy: string; full: string; limited: string }) => {
    const message = text.trim();
    if (!message || busy) return;
    setLimit(null);
    setBusy(true);
    setStage("thinking");
    const base = messages.length;
    setMessages((m) => [...m, { role: "user", text: message, index: base }, { role: "assistant", text: "", products: [] }]);
    const patch = (fn: (m: ChatMessage) => ChatMessage) => setMessages((all) => all.map((m, i) => (i === all.length - 1 ? fn(m) : m)));
    const controller = new AbortController();
    abort.current = controller;
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversation_id: conversation.current }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        const code = body?.error?.code;
        if (code === "CONVERSATION_FULL") {
          conversation.current = null;
          storeConversation(null);
        }
        const msg = code === "RATE_LIMITED" ? errors.limited : code === "CONVERSATION_FULL" ? errors.full : res.status >= 500 ? errors.busy : body?.error?.message || errors.busy;
        if (code === "RATE_LIMITED" || code === "CONVERSATION_FULL") setLimit(msg);
        patch((m) => ({ ...m, text: msg, error: true }));
        return;
      }
      for await (const ev of readEvents(res.body)) {
        if (ev.type === "start") {
          conversation.current = ev.conversation_id;
          storeConversation(ev.conversation_id);
        } else if (ev.type === "status") setStage(ev.stage);
        else if (ev.type === "text") {
          setStage(null);
          patch((m) => ({ ...m, text: m.text + ev.delta }));
        } else if (ev.type === "products") {
          patch((m) => ({ ...m, products: [...(m.products ?? []), ...ev.items.filter((c: AssistantCard) => !(m.products ?? []).some((p) => p.id === c.id))] }));
        } else if (ev.type === "error") {
          patch((m) => ({ ...m, text: (m.text ? m.text + "\n\n" : "") + ev.message, error: true }));
        } else if (ev.type === "done") {
          // the stored transcript has user + assistant per turn: the answer's feedback index is 2*turns-1
          if (ev.saved) patch((m) => ({ ...m, index: ev.turns * 2 - 1 }));
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") patch((m) => ({ ...m, text: (m.text ? m.text + "\n\n" : "") + errors.network, error: true }));
    } finally {
      setBusy(false);
      setStage(null);
      abort.current = null;
    }
  }, [busy, messages.length]);

  const stop = useCallback(() => abort.current?.abort(), []);

  const reset = useCallback(() => {
    abort.current?.abort();
    conversation.current = null;
    storeConversation(null);
    setMessages([]);
    setLimit(null);
  }, []);

  const rate = useCallback(async (msg: ChatMessage, value: "up" | "down") => {
    if (msg.index === undefined || !conversation.current) return;
    const next = msg.feedback === value ? null : value;
    setMessages((all) => all.map((m) => (m === msg ? { ...m, feedback: next } : m)));
    await fetch(`/api/assistant/conversations/${conversation.current}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: msg.index, value: next }),
    }).catch(() => null);
  }, []);

  return { messages, busy, stage, limit, load, send, stop, reset, rate };
}
