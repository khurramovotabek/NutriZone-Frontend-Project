import { segmentMetadata } from "@/lib/page-meta";

export const generateMetadata = segmentMetadata("profile");

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
