import { segmentMetadata } from "@/lib/page-meta";

export const generateMetadata = segmentMetadata("orders");

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
