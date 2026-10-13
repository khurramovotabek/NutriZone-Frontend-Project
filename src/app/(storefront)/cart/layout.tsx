import { segmentMetadata } from "@/lib/page-meta";

export const generateMetadata = segmentMetadata("cart");

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
