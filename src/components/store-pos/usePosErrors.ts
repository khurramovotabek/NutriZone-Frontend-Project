"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import type { PosError } from "./types";

const KNOWN = new Set([
  "STOCK_LIMIT", "NO_PRICE", "PRODUCT_INACTIVE", "OUT_OF_STOCK", "CASH_TENDERED_TOO_LOW", "PAYMENT_METHOD_UNAVAILABLE", "EMPTY_BASKET", "SALE_CLOSED",
  "NEW_CUSTOMER_NAME_REQUIRED", "VALIDATION_FAILED", "NETWORK", "NO_SESSION", "REGISTER_CLOSED", "REGISTER_ALREADY_OPEN", "OPEN_BASKET",
  "COINS_NEED_CUSTOMER", "DISCOUNT_TOO_HIGH", "EXPIRED_BATCH", "PAYMENT_SPLIT_MISMATCH", "RETURN_QTY_TOO_HIGH", "NOTHING_TO_RETURN", "NOT_REFUNDABLE", "REDEEM_ABOVE_LIMIT", "REDEEM_BELOW_MINIMUM", "INSUFFICIENT_COINS", "REDEEM_DISABLED",
  "PIN_WRONG", "PIN_LOCKED", "KASSA_PIN_NOT_SET", "CASHIER_NOT_ALLOWED", "OWNER_ONLY",
]);

/** Maps the POS API's stable error codes to localized, human messages. */
export function usePosErrors() {
  const t = useTranslations("storePos");
  return useCallback(
    (error: PosError) => {
      if (error.code === "STOCK_LIMIT") return t("errors.STOCK_LIMIT", { count: Number(error.details?.available ?? 0) });
      return KNOWN.has(error.code) ? t(`errors.${error.code}`) : error.message || t("errors.generic");
    },
    [t],
  );
}
