import { segmentMetadata } from "@/lib/page-meta";

export const generateMetadata = segmentMetadata("autoLogin");

export default function AutoLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
