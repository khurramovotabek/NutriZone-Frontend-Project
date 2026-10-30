import { segmentMetadata } from "@/lib/page-meta";
import { AppMessages } from "@/i18n/ClientMessages";

export const generateMetadata = segmentMetadata("checkout");

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <AppMessages>{children}</AppMessages>;
}
