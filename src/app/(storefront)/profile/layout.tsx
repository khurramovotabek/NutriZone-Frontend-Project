import { segmentMetadata } from "@/lib/page-meta";
import { AppMessages } from "@/i18n/ClientMessages";

export const generateMetadata = segmentMetadata("profile");

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <AppMessages>{children}</AppMessages>;
}
