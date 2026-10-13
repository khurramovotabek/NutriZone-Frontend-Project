"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { AttachmentUpload, Conversation, ConversationDetail, CustomerProfile, Message } from "@/lib/account-api";
import InquiriesWorkspace from "@/components/store-dashboard/inquiries/InquiriesWorkspace";

const MESSAGE_PAGE_SIZE = 30;

/** Module-level so its identity is stable across renders (the workspace loads the list in an effect keyed on it). */
async function fetchConversations(status: "all" | "open" | "closed" | "archived") {
  try {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    params.set("page_size", "50");
    const res = await fetch(`/api/chat/conversations?${params.toString()}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok || !body.success) return null;
    return { data: body.data as Conversation[], totalCount: body.pagination?.total_count ?? body.data.length };
  } catch {
    return null;
  }
}

/**
 * Store Dashboard -> Inquiries: a premium redesign of the store
 * owner's own real chat inbox (see InquiriesWorkspace's own docstring
 * for the full, honest account of what the Chat API does and doesn't
 * support for this role). This page only owns data-fetching against
 * the existing `/api/chat/*` proxy routes; all UI lives in
 * InquiriesWorkspace so the page itself stays a thin composition root.
 */
export default function StoreInquiriesPage() {
  const t = useTranslations("myStore");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((body) => {
        if (body?.success) setCurrentUserId(body.data.id);
      })
      .catch(() => {});
  }, []);

  async function fetchDetail(id: string) {
    try {
      const res = await fetch(`/api/chat/conversations/${id}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.success) return null;
      return body.data as ConversationDetail;
    } catch {
      return null;
    }
  }

  async function fetchMessages(id: string, page: number) {
    try {
      const res = await fetch(`/api/chat/conversations/${id}/messages?page=${page}&page_size=${MESSAGE_PAGE_SIZE}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.success) return null;
      return { data: body.data as Message[], totalPages: body.pagination?.total_pages ?? 1 };
    } catch {
      return null;
    }
  }

  async function sendMessage(id: string, content: string) {
    try {
      const res = await fetch(`/api/chat/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) return null;
      return body.data as Message;
    } catch {
      return null;
    }
  }

  async function sendSticker(id: string, code: string) {
    try {
      const res = await fetch(`/api/chat/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_type: "sticker", content: code }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) return null;
      return body.data as Message;
    } catch {
      return null;
    }
  }

  async function fetchCustomerProfile(id: string) {
    try {
      const res = await fetch(`/api/chat/conversations/${id}/customer-profile`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.success) return null;
      return body.data as CustomerProfile;
    } catch {
      return null;
    }
  }

  async function sendAttachment(id: string, attachment: AttachmentUpload) {
    try {
      const res = await fetch(`/api/chat/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_type: "attachment", ...attachment }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) return null;
      return body.data as Message;
    } catch {
      return null;
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink">{t("navInquiries")}</h2>
        <p className="text-sm text-ink-muted">{t("inquirySubtitle")}</p>
      </div>
      <InquiriesWorkspace
        currentUserId={currentUserId}
        fetchConversations={fetchConversations}
        fetchDetail={fetchDetail}
        fetchMessages={fetchMessages}
        sendMessage={sendMessage}
        sendAttachment={sendAttachment}
        sendSticker={sendSticker}
        fetchCustomerProfile={fetchCustomerProfile}
      />
    </div>
  );
}
