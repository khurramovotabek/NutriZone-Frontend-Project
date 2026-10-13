import { segmentMetadata } from "@/lib/page-meta";

export const generateMetadata = segmentMetadata("notifications");

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
