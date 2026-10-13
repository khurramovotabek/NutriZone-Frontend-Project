import { apiFetch } from "@/lib/api";

export interface PublicSiteSettings {
  site_name: string;
  support_phone: string;
  support_email: string;
  address: string;
  working_hours: string;
  telegram_username: string;
  telegram_channel_url: string | null;
  instagram_url: string | null;
  primary_color: string;
}

export async function getPublicSiteSettings() {
  return apiFetch<PublicSiteSettings>("/api/v1/settings/public");
}

export interface ContactMessageInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export async function submitContactMessage(input: ContactMessageInput) {
  return apiFetch<{ id: string }>("/api/v1/contact-messages", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
