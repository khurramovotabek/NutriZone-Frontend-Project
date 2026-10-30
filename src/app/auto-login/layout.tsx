import { segmentMetadata } from "@/lib/page-meta";
import { AppMessages } from "@/i18n/ClientMessages";

export const generateMetadata = segmentMetadata("autoLogin");

export default function AutoLoginLayout({ children }: { children: React.ReactNode }) {
  return <AppMessages>{children}</AppMessages>;
}
