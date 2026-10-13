"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/account-api";

export type ChatSocketStatus = "connecting" | "open" | "closed";

/**
 * Real-time delivery for one conversation. Fetches a fresh, short-lived
 * ws-ticket (never the real HttpOnly access token) via the Next.js proxy,
 * then opens `wss://<api-origin>/ws/chat/{id}/?token=...` -- the exact
 * path `apps/chat/interfaces/routing.py` registers, proxied 1:1 by nginx's
 * own `/ws/` location block (confirmed against `docker/nginx/nginx.conf`).
 * Reconnects with capped exponential backoff on any close/error (a fresh
 * ticket is always minted before each attempt, since the previous one may
 * have expired).
 *
 * `onMessage` is invoked directly from the socket's own `onmessage`
 * handler -- a genuine external-system callback, not a value bridged
 * through hook state -- so the caller applies it straight to its own
 * state inside that callback, matching this app's existing
 * fetch-then-setState convention (e.g. StoreRatingWidget) rather than
 * adding a second `useEffect` that reacts to a changed "lastMessage"
 * value (which the compiler correctly flags as an avoidable extra
 * render).
 */
const HEARTBEAT_MS = 25_000; // under the server's 90s presence TTL, and under proxies' idle-connection timeouts
const TYPING_TTL_MS = 6_000; // hide "typing..." if the stop signal never arrives (tab closed mid-sentence)

export interface ChatSocket {
  status: ChatSocketStatus;
  /** The other participant is typing right now. */
  otherTyping: boolean;
  /** The other participant has this conversation open right now. */
  otherOnline: boolean;
  /** Latest time the other participant read my messages (from live read receipts); older reads come with each message's own `read_at`. */
  otherReadAt: string | null;
  /** Throttled on the caller's side is not needed -- this dedupes repeated "still typing" calls itself. */
  sendTyping: (isTyping: boolean) => void;
  /** Marks every message the other side sent as read (persisted server-side), telling them "✓✓". */
  markRead: () => void;
}

export function useChatSocket(conversationId: string | null, onMessage: (message: Message) => void): ChatSocket {
  const [status, setStatus] = useState<ChatSocketStatus>("connecting");
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(null);
  const onMessageRef = useRef(onMessage);
  const socketRef = useRef<WebSocket | null>(null);
  const typingSentRef = useRef<{ value: boolean; at: number }>({ value: false, at: 0 });
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    let socket: WebSocket | null = null;
    let attempt = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let heartbeatId: ReturnType<typeof setInterval> | null = null;
    let typingTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleReconnect() {
      if (cancelled) return;
      const delay = Math.min(1000 * 2 ** attempt, 15000);
      attempt += 1;
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        setStatus("connecting");
        connect();
      }, delay);
    }

    function handleFrame(parsed: { type?: string; [key: string]: unknown }) {
      switch (parsed.type) {
        case "message.created":
          if (parsed.message) onMessageRef.current(parsed.message as Message);
          setOtherTyping(false); // their message landed -- they're done typing
          break;
        case "typing":
          setOtherTyping(Boolean(parsed.is_typing));
          if (typingTimer) clearTimeout(typingTimer);
          if (parsed.is_typing) typingTimer = setTimeout(() => setOtherTyping(false), TYPING_TTL_MS);
          break;
        case "presence":
          setOtherOnline(Boolean(parsed.online));
          if (!parsed.online) setOtherTyping(false);
          break;
        case "messages.read":
          setOtherReadAt(String(parsed.read_at));
          break;
      }
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
        socket = new WebSocket(`${wsOrigin}/ws/chat/${conversationId}/?token=${encodeURIComponent(body.data.ticket)}`);
        socketRef.current = socket;

        socket.onopen = () => {
          attempt = 0;
          setStatus("open");
          heartbeatId = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ type: "ping" })), HEARTBEAT_MS);
        };
        socket.onmessage = (event) => {
          try {
            handleFrame(JSON.parse(event.data));
          } catch {
            // A malformed frame is ignored -- never tears down a healthy connection.
          }
        };
        socket.onclose = () => {
          if (heartbeatId) clearInterval(heartbeatId);
          socketRef.current = null;
          if (cancelled) return;
          setStatus("closed");
          setOtherOnline(false);
          setOtherTyping(false);
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
      if (heartbeatId) clearInterval(heartbeatId);
      if (typingTimer) clearTimeout(typingTimer);
      socketRef.current = null;
      socket?.close();
      setOtherTyping(false);
      setOtherOnline(false);
      setOtherReadAt(null);
    };
  }, [conversationId]);

  const send = useCallback((payload: object) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }, []);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const last = typingSentRef.current;
      const now = Date.now();
      // "still typing" is re-sent at most every 3s; a change of state always goes out.
      if (last.value === isTyping && (!isTyping || now - last.at < 3000)) return;
      typingSentRef.current = { value: isTyping, at: now };
      send({ type: "typing", is_typing: isTyping });
    },
    [send],
  );

  const markRead = useCallback(() => send({ type: "read" }), [send]);

  return { status, otherTyping, otherOnline, otherReadAt, sendTyping, markRead };
}
