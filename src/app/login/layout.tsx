import { AppMessages } from "@/i18n/ClientMessages";

/** Client components here use the app-only translations (src/i18n/ClientMessages.tsx). */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AppMessages>{children}</AppMessages>;
}
