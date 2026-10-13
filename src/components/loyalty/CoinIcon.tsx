"use client";

import { useId } from "react";

/**
 * The NutriZone coin: a minted gold coin with a milled rim, a recessed
 * face, an embossed "N" monogram and a soft specular highlight. Pure SVG
 * (crisp at any size, no image request); gradient ids come from useId()
 * so any number of coins can share a page.
 */
export default function CoinIcon({ size = 24, className = "", title }: { size?: number; className?: string; title?: string }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `nzc-${raw}-${name}`;

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <defs>
        <linearGradient id={id("rim")} x1="10" y1="6" x2="54" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.35" stopColor="#f5c542" />
          <stop offset="0.7" stopColor="#d4940f" />
          <stop offset="1" stopColor="#8a5a06" />
        </linearGradient>
        <radialGradient id={id("face")} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#fff6c9" />
          <stop offset="0.45" stopColor="#f7cf4a" />
          <stop offset="1" stopColor="#c7860c" />
        </radialGradient>
        <linearGradient id={id("mark")} x1="22" y1="20" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a86b05" />
          <stop offset="1" stopColor="#6e4303" />
        </linearGradient>
        <linearGradient id={id("shine")} x1="14" y1="10" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* body + milled edge */}
      <circle cx="32" cy="33.5" r="29" fill="#7a4d05" opacity="0.35" />
      <circle cx="32" cy="32" r="29" fill={`url(#${id("rim")})`} />
      <circle cx="32" cy="32" r="27" fill="none" stroke="#8a5a06" strokeOpacity="0.45" strokeWidth="2.2" strokeDasharray="1.1 2.1" />

      {/* recessed face */}
      <circle cx="32" cy="32" r="22.5" fill="#9a6405" opacity="0.55" />
      <circle cx="32" cy="32.6" r="21.5" fill={`url(#${id("face")})`} />
      <circle cx="32" cy="32" r="18.2" fill="none" stroke="#b07a0a" strokeOpacity="0.55" strokeWidth="0.9" />

      {/* embossed N monogram: light offset below, dark mark on top */}
      <path d="M24 43V21h4.6l7.6 13.2V21H40v22h-4.5l-7.7-13.3V43z" fill="#fff4c2" opacity="0.7" transform="translate(0.7 0.9)" />
      <path d="M24 43V21h4.6l7.6 13.2V21H40v22h-4.5l-7.7-13.3V43z" fill={`url(#${id("mark")})`} />

      {/* specular highlight */}
      <path d="M12 26C14 15 23 7.5 34 7.8c-9 3.2-16.4 9.8-19.6 19.4z" fill={`url(#${id("shine")})`} />
      <circle cx="47" cy="17" r="1.6" fill="#fff" opacity="0.8" />
    </svg>
  );
}
