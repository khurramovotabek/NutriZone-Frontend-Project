"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";

/**
 * Print mode helper: prints as soon as the receipt (and its QR) is on screen,
 * then tells the parent POS window (the page is loaded in a hidden iframe) how it went,
 * so the till can offer "print again" when the printer is off or out of paper.
 */
export function AutoPrint() {
  useEffect(() => {
    const notify = (type: string) => window.parent?.postMessage({ source: "nz-receipt", type }, window.location.origin);
    const timer = setTimeout(() => {
      try {
        window.print();
        notify("printed");
      } catch {
        notify("failed");
      }
    }, 150);
    notify("ready");
    return () => clearTimeout(timer);
  }, []);
  return null;
}

export function ReceiptActions({ url, labels }: { url: string; labels: { pdf: string; share: string; copy: string; copied: string } }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    // navigator only exists in the browser -- decided after mount so SSR and hydration agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator.share === "function");
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked -- the link is printed under the QR anyway */
    }
  }

  return (
    <div className="nzr-actions">
      <button type="button" onClick={() => window.print()} className="nzr-btn nzr-btn-primary">
        <Download className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
        {labels.pdf}
      </button>
      {canShare ? (
        <button type="button" onClick={() => navigator.share({ url }).catch(() => {})} className="nzr-btn">
          <Share2 className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          {labels.share}
        </button>
      ) : (
        <button type="button" onClick={copy} className="nzr-btn">
          {copied ? <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /> : <Copy className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />}
          {copied ? labels.copied : labels.copy}
        </button>
      )}
    </div>
  );
}
