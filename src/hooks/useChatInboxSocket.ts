"use client";

import { useEffect, useRef } from "react";

/**
 * Real-time delivery for the conversation LIST -- the per-user
 * counterpart to `useChatSocket`'s per-conversation one. Without this,
 * a participant sitting on their conversation list (or a different
 * thread) never learned a new message arrived in one of their OTHER
 * conversations short of a manual reload: `useChatSocket` only ever
 * joins the one conversation it's given, so a brand-new conversation,
 * or a reply in one that isn't currently open, was invisible until the
 * next full page load. Connects once per mount (not per conversation --
 * there's no id to key on here) to `wss://<api-origin>/ws/chat/inbox/`,
 * the exact path `ChatInboxConsumer`/`routing.py` register. Same
 * fresh-ticket-per-attempt, capped-exponential-backoff reconnect
 * strategy as `useChatSocket`, for the identical reason (a ticket is
 * short-lived and single-use).
 *
 * `onConversationUpdated` fires with the real conversation id from the
 * broadcast's own `conversation_id` field -- deliberately a bare
 * pointer, never a duplicated conversation-card shape (see
 * `ChatInboxConsumer`'s own docstring): the caller re-fetches the real
 * list/detail over the existing REST endpoints, exactly as if the
 * user had refreshed, just without them having to.
 */
export function useChatInboxSocket(enabled: boolean, onConversationUpdated: (conversationId: string) => void): void {
  const onUpdateRef = useRef(onConversationUpdated);
  useEffect(() => {
    onUpdateRef.current = onConversationUpdated;
  }, [onConversationUpdated]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let socket: WebSocket | null = null;
    let attempt = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function scheduleReconnect() {
      if (cancelled) return;
      const delay = Math.min(1000 * 2 ** attempt, 15000);
      attempt += 1;
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        connect();
      }, delay);
    }

    async function connect() {
      try {
        const res = await fetch("/api/chat/ws-ticket", { cache: "no-store" });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok || !body.success) {
          scheduleReconnect();
          return;
        }

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
        const wsOrigin = apiBaseUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
        socket = new WebSocket(`${wsOrigin}/ws/chat/inbox/?token=${encodeURIComponent(body.data.ticket)}`);

        socket.onopen = () => {
          attempt = 0;
        };
        socket.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed?.type === "conversation.updated" && typeof parsed.conversation_id === "string") {
              onUpdateRef.current(parsed.conversation_id);
            }
          } catch {
            // Ignore malformed frames -- never crashes the socket over one bad payload.
          }
        };
        socket.onclose = () => {
          if (cancelled) return;
          scheduleReconnect();
        };
        socket.onerror = () => {
          socket?.close();
        };
      } catch {
        if (!cancelled) scheduleReconnect();
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      socket?.close();
    };
  }, [enabled]);
}
