import { segmentMetadata } from "@/lib/page-meta";
import { AppMessages } from "@/i18n/ClientMessages";

export const generateMetadata = segmentMetadata("verifyOtp");

export default function VerifyOtpLayout({ children }: { children: React.ReactNode }) {
  return <AppMessages>{children}</AppMessages>;
}
