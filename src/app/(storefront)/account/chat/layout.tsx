import { segmentMetadata } from "@/lib/page-meta";

export const generateMetadata = segmentMetadata("chat");

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
