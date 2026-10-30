import { segmentMetadata } from "@/lib/page-meta";
import { AppMessages } from "@/i18n/ClientMessages";

export const generateMetadata = segmentMetadata("cart");

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <AppMessages>{children}</AppMessages>;
}
