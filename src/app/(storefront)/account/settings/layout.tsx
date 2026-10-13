import { segmentMetadata } from "@/lib/page-meta";

export const generateMetadata = segmentMetadata("settings");

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
