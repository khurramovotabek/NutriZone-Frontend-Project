import { segmentMetadata } from "@/lib/page-meta";

export const generateMetadata = segmentMetadata("verifyOtp");

export default function VerifyOtpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
