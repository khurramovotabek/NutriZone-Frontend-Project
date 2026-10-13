import { segmentMetadata } from "@/lib/page-meta";

export const generateMetadata = segmentMetadata("checkout");

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
