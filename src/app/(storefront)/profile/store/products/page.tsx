import { redirect } from "next/navigation";

/** Stock management now lives inside the POS terminal ("Ombor" tab). Old links keep working. */
export default function StoreProductsPage() {
  redirect("/profile/store/pos?tab=stock");
}
