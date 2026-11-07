/**
 * True on a device with a mouse/trackpad (a desk kassa). On phones and tablets focusing a text field opens the
 * on-screen keyboard and scrolls the page, so the POS only auto-focuses its scanner field where this is true -- a
 * keyboard-wedge scanner is caught by PosTerminal's global listener wherever the focus is.
 */
export function hasFinePointer(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;
}
