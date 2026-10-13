"use client";

import { useRef, type ReactNode } from "react";

/**
 * Drives the `.nz-liquid` specular sheen: on pointer move, writes the
 * pointer position (relative to the hovered glass pane) into that pane's
 * own --mx/--my custom properties. One delegated listener for the whole
 * page, no per-card state, no re-renders.
 */
export default function ContactSpotlight({ children, className = "" }: { children: ReactNode; className?: string }) {
  const frame = useRef<number | null>(null);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const target = (e.target as HTMLElement).closest<HTMLElement>(".nz-liquid");
    if (!target) return;
    const { clientX, clientY } = e;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${clientX - rect.left}px`);
      target.style.setProperty("--my", `${clientY - rect.top}px`);
    });
  }

  return (
    <div onPointerMove={handlePointerMove} className={className}>
      {children}
    </div>
  );
}
