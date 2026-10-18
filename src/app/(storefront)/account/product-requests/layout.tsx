import { segmentMetadata } from "@/lib/page-meta";

export const generateMetadata = segmentMetadata("productRequests");

export default function ProductRequestsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
