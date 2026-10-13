import { segmentMetadata } from "@/lib/page-meta";

export const generateMetadata = segmentMetadata("account");

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
