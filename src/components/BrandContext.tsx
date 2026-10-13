"use client";

import { createContext, useContext } from "react";
import { DEFAULT_BRAND, type Brand } from "@/lib/brand";

const BrandContext = createContext<Brand>(DEFAULT_BRAND);

export function BrandProvider({ brand, children }: { brand: Brand; children: React.ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

/** The configured brand (name / logo) for client components. */
export function useBrand(): Brand {
  return useContext(BrandContext);
}
