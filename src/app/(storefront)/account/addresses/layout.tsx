import { segmentMetadata } from "@/lib/page-meta";

export const generateMetadata = segmentMetadata("addresses");

export default function AddressesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
