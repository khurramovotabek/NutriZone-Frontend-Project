"use client";

/**
 * Receipt printing for thermal printers (58 / 80 mm roll) through the browser's
 * own print pipeline: the receipt page `/r/<token>?print=<width>&autoprint=1` is
 * loaded in an off-screen iframe and prints itself, so the paper slip is exactly
 * the e-receipt the QR code points to. With Chrome started in kiosk-printing
 * mode (`--kiosk-printing`) and the thermal printer set as the default printer,
 * the slip prints silently the moment the sale completes.
 *
 * Printing never blocks or undoes a sale: the sale is already saved, and a slip
 * that didn't come out can be printed again from the receipt or from History.
 */

export type PaperWidth = 58 | 80;
export type PrinterSettings = { width: PaperWidth; auto: boolean };
export type PrintOutcome = "printed" | "failed";

const KEY = "nz_pos_printer";
const DEFAULTS: PrinterSettings = { width: 80, auto: true };

export function loadPrinterSettings(): PrinterSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return { width: raw?.width === 58 ? 58 : 80, auto: raw?.auto !== false };
  } catch {
    return DEFAULTS;
  }
}

export function savePrinterSettings(settings: PrinterSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* private mode / storage blocked -- settings just won't persist */
  }
}

export function receiptPath(token: string) {
  return `/r/${token}`;
}

let active: HTMLIFrameElement | null = null;

export function printReceipt(token: string, width: PaperWidth): Promise<PrintOutcome> {
  return new Promise((resolve) => {
    active?.remove();
    const frame = document.createElement("iframe");
    active = frame;
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    // Off-screen but rendered (a display:none frame is skipped by some print engines).
    Object.assign(frame.style, { position: "fixed", left: "-10000px", top: "0", width: `${width}mm`, height: "10px", border: "0", opacity: "0" });

    let settled = false;
    const finish = (outcome: PrintOutcome) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      resolve(outcome);
      // keep the frame a little so the spooler has the document
      setTimeout(() => frame === active && (frame.remove(), (active = null)), 30_000);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.contentWindow || e.data?.source !== "nz-receipt") return;
      if (e.data.type === "printed") finish("printed");
      else if (e.data.type === "failed") finish("failed");
    };
    // The page didn't load (offline, server down): report it so the cashier can retry.
    const timer = setTimeout(() => finish("failed"), 25_000);
    window.addEventListener("message", onMessage);
    frame.src = `${receiptPath(token)}?print=${width}&autoprint=1`;
    document.body.appendChild(frame);
  });
}

/** A 2D scanner reading a NutriZone receipt QR: returns its e-receipt token. */
export function receiptTokenFrom(scanned: string): string | null {
  const m = scanned.trim().match(/\/r\/([A-Za-z0-9_-]{8,32})(?:[/?#]|$)/);
  return m ? m[1] : null;
}
