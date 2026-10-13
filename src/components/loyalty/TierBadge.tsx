"use client";

import { useId, type ReactNode } from "react";
import type { TierIconKey } from "@/lib/loyalty-api";

/**
 * Premium tier insignia -- eight distinct, hand-built SVG badges that grow in
 * ornament as the tier rises:
 *
 *   bronze   ribbon medal, single star
 *   silver   ribbon medal with a beaded rim, star in a ring
 *   gold     ribbon medal inside a laurel wreath
 *   platinum 16-point rosette with a four-point sparkle
 *   diamond  brilliant-cut gem, individually shaded facets
 *   elite    winged shield with three rank chevrons
 *   legend   shield on a sunburst with a twin flame and laurel
 *   vip      jewelled royal crown on a radiant halo
 *
 * The metal is generated from the tier's own accent colour (set by staff in
 * the dashboard) via CSS color-mix, so a recoloured tier still gets correct
 * highlights and shadows. Gradient ids come from useId() so any number of
 * badges can share a page.
 */

// Server (Node) and browser trig can differ in the last float digit -> hydration
// mismatch; every computed coordinate is rounded to 2 decimals.
const r2 = (n: number) => Math.round(n * 100) / 100;

const mix = (color: string, pct: number, other: string) => `color-mix(in srgb, ${color} ${pct}%, ${other})`;

function starPoints(cx: number, cy: number, outer: number, inner: number, points = 5, rotation = -90): string {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((rotation + (i * 180) / points) * Math.PI) / 180;
    out.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return out.join(" ");
}

function Laurel({ cx, cy, r, from, to, fill, leaves = 7 }: { cx: number; cy: number; r: number; from: number; to: number; fill: string; leaves?: number }) {
  const items: ReactNode[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < leaves; i++) {
      const deg = from + ((to - from) * i) / (leaves - 1);
      const a = (deg * Math.PI) / 180;
      const x = r2(cx + side * r * Math.cos(a));
      const y = r2(cy + r * Math.sin(a));
      const rot = r2(side === 1 ? deg + 90 + 28 : 180 - deg + 90 - 28);
      items.push(<ellipse key={`${side}-${i}`} cx={x} cy={y} rx={2.3} ry={5.2} transform={`rotate(${rot} ${x} ${y})`} fill={fill} />);
    }
  }
  return <g>{items}</g>;
}

function Rays({ cx, cy, count, inner, outer, fill, opacity }: { cx: number; cy: number; count: number; inner: number; outer: number; fill: string; opacity: number }) {
  const rays: ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    const a = r2((i * 360) / count);
    rays.push(<path key={i} d={`M${cx - 1.6} ${cy - inner}L${cx} ${cy - outer}L${cx + 1.6} ${cy - inner}Z`} transform={`rotate(${a} ${cx} ${cy})`} fill={fill} />);
  }
  return <g opacity={opacity}>{rays}</g>;
}

export default function TierBadge({ icon, color, size = 48, className = "", title }: { icon: TierIconKey; color: string; size?: number; className?: string; title?: string }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `nzt-${raw}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  const light = mix(color, 35, "#ffffff");
  const lighter = mix(color, 15, "#ffffff");
  const dark = mix(color, 55, "#000000");
  const darker = mix(color, 35, "#000000");

  const defs = (
    <defs>
      <linearGradient id={id("metal")} x1="12" y1="6" x2="68" y2="74" gradientUnits="userSpaceOnUse">
        <stop offset="0" style={{ stopColor: lighter }} />
        <stop offset="0.28" style={{ stopColor: color }} />
        <stop offset="0.55" style={{ stopColor: dark }} />
        <stop offset="0.78" style={{ stopColor: color }} />
        <stop offset="1" style={{ stopColor: light }} />
      </linearGradient>
      <radialGradient id={id("face")} cx="0.36" cy="0.3" r="0.85">
        <stop offset="0" style={{ stopColor: light }} />
        <stop offset="0.55" style={{ stopColor: color }} />
        <stop offset="1" style={{ stopColor: darker }} />
      </radialGradient>
      <linearGradient id={id("ribbon")} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" style={{ stopColor: mix(color, 45, "#0f172a") }} />
        <stop offset="0.5" style={{ stopColor: mix(color, 70, "#0f172a") }} />
        <stop offset="1" style={{ stopColor: mix(color, 40, "#0f172a") }} />
      </linearGradient>
      <linearGradient id={id("gloss")} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <radialGradient id={id("halo")} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" style={{ stopColor: light }} stopOpacity="0.9" />
        <stop offset="1" style={{ stopColor: color }} stopOpacity="0" />
      </radialGradient>
    </defs>
  );

  // White emblem with an engraved (offset, dark) shadow underneath.
  const engrave = (node: (fill: string) => ReactNode) => (
    <>
      <g transform="translate(0 0.9)" opacity="0.45">{node(darker)}</g>
      {node("#ffffff")}
    </>
  );

  const medal = (inner: ReactNode, opts: { beads?: boolean; laurel?: boolean } = {}) => (
    <>
      {/* ribbon tails */}
      <path d="M28 46L20 74l7-3.5 4.5 6L37 50z" fill={url("ribbon")} />
      <path d="M52 46l8 28-7-3.5-4.5 6L43 50z" fill={url("ribbon")} />
      <path d="M28 46L20 74l7-3.5M52 46l8 28-7-3.5" stroke="#fff" strokeOpacity="0.18" strokeWidth="0.8" fill="none" />
      {opts.laurel && <Laurel cx={40} cy={34} r={27} from={-35} to={95} fill={url("metal")} />}
      {/* coin body */}
      <circle cx="40" cy="35.5" r="22.5" fill={darker} opacity="0.5" />
      <circle cx="40" cy="34" r="22.5" fill={url("metal")} />
      <circle cx="40" cy="34" r="18" fill={url("face")} />
      <circle cx="40" cy="34" r="18" fill="none" stroke={darker} strokeOpacity="0.5" strokeWidth="0.9" />
      {opts.beads &&
        Array.from({ length: 28 }, (_, i) => {
          const a = (i / 28) * Math.PI * 2;
          return <circle key={i} cx={r2(40 + 20.3 * Math.cos(a))} cy={r2(34 + 20.3 * Math.sin(a))} r="0.85" fill={lighter} opacity="0.9" />;
        })}
      {inner}
      <path d="M22 30a18 18 0 0 1 32-11c-9-3-22-1-32 11z" fill={url("gloss")} opacity="0.55" />
    </>
  );

  const shield = "M40 12l19 6.5v17c0 13.5-8.2 23.3-19 28.5-10.8-5.2-19-15-19-28.5v-17z";
  const shieldInner = "M40 17.5l14.2 4.9v13.2c0 10.4-6.2 18-14.2 22.2-8-4.2-14.2-11.8-14.2-22.2V22.4z";

  let body: ReactNode;
  switch (icon) {
    case "bronze":
      body = medal(engrave((fill) => <polygon points={starPoints(40, 34.5, 10.5, 4.4)} fill={fill} />));
      break;
    case "silver":
      body = medal(
        engrave((fill) => (
          <g fill={fill}>
            <polygon points={starPoints(40, 34.5, 8.6, 3.6)} />
            <circle cx="40" cy="34.5" r="12.6" fill="none" stroke={fill} strokeWidth="1.6" />
          </g>
        )),
        { beads: true },
      );
      break;
    case "gold":
      body = medal(
        engrave((fill) => (
          <g fill={fill}>
            <polygon points={starPoints(40, 32.5, 9.5, 4)} />
            <path d="M31 42.5h18l-1.6 3.2H32.6z" />
          </g>
        )),
        { beads: true, laurel: true },
      );
      break;
    case "platinum":
      body = (
        <>
          <Rays cx={40} cy={40} count={24} inner={20} outer={37} fill={url("halo")} opacity={0.55} />
          <polygon points={starPoints(40, 41.3, 30, 24.5, 16, -90)} fill={darker} opacity="0.45" />
          <polygon points={starPoints(40, 40, 30, 24.5, 16, -90)} fill={url("metal")} />
          <circle cx="40" cy="40" r="20" fill={darker} opacity="0.35" />
          <circle cx="40" cy="40" r="19" fill={url("face")} />
          <circle cx="40" cy="40" r="15.5" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.9" />
          {engrave((fill) => (
            <g fill={fill}>
              <path d="M40 27c1.3 7.4 5.6 11.7 13 13-7.4 1.3-11.7 5.6-13 13-1.3-7.4-5.6-11.7-13-13 7.4-1.3 11.7-5.6 13-13z" />
              <circle cx="50.5" cy="29.5" r="1.4" />
              <circle cx="29.5" cy="50.5" r="1.1" />
            </g>
          ))}
          <path d="M23 36a17 17 0 0 1 29-10c-9-2.5-20-.5-29 10z" fill={url("gloss")} opacity="0.5" />
        </>
      );
      break;
    case "diamond": {
      const G = [10, 25, 40, 55, 70];
      const gy = 33;
      const T = [26, 40, 54];
      const ty = 19;
      const C = [40, 71];
      const facets: [string, string][] = [
        [`${G[0]},${gy} ${T[0]},${ty} ${G[1]},${gy}`, lighter],
        [`${T[0]},${ty} ${T[1]},${ty} ${G[2]},${gy} ${G[1]},${gy}`, light],
        [`${T[1]},${ty} ${T[2]},${ty} ${G[3]},${gy} ${G[2]},${gy}`, color],
        [`${T[2]},${ty} ${G[4]},${gy} ${G[3]},${gy}`, dark],
        [`${G[0]},${gy} ${G[1]},${gy} ${C[0]},${C[1]}`, light],
        [`${G[1]},${gy} ${G[2]},${gy} ${C[0]},${C[1]}`, color],
        [`${G[2]},${gy} ${G[3]},${gy} ${C[0]},${C[1]}`, dark],
        [`${G[3]},${gy} ${G[4]},${gy} ${C[0]},${C[1]}`, darker],
      ];
      body = (
        <>
          <ellipse cx="40" cy="40" rx="34" ry="30" fill={url("halo")} opacity="0.45" />
          <polygon points={`${G[0]},${gy + 1.5} ${T[0]},${ty + 1.5} ${T[2]},${ty + 1.5} ${G[4]},${gy + 1.5} ${C[0]},${C[1] + 1.5}`} fill={darker} opacity="0.4" />
          {facets.map(([pts, fill], i) => (
            <polygon key={i} points={pts} style={{ fill }} />
          ))}
          <polygon points={`${G[0]},${gy} ${T[0]},${ty} ${T[2]},${ty} ${G[4]},${gy} ${C[0]},${C[1]}`} fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1" strokeLinejoin="round" />
          <path d={`M${G[0]} ${gy}H${G[4]}M${T[0]} ${ty}L${G[1]} ${gy}L${C[0]} ${C[1]}M${T[1]} ${ty}L${G[2]} ${gy}M${T[2]} ${ty}L${G[3]} ${gy}L${C[0]} ${C[1]}M${G[2]} ${gy}L${C[0]} ${C[1]}`} stroke="#fff" strokeOpacity="0.5" strokeWidth="0.7" fill="none" />
          <path d={`M${T[0]} ${ty}L${G[1]} ${gy}L${G[0]} ${gy}z`} fill="#fff" opacity="0.35" />
          <path d="M60 10c.7 3.6 2.4 5.3 6 6-3.6.7-5.3 2.4-6 6-.7-3.6-2.4-5.3-6-6 3.6-.7 5.3-2.4 6-6z" fill="#fff" />
          <circle cx="18" cy="16" r="1.3" fill="#fff" opacity="0.85" />
        </>
      );
      break;
    }
    case "elite": {
      const feathers = (side: 1 | -1) =>
        [0, 1, 2, 3].map((k) => {
          const y = 24 + k * 7;
          const len = 17 - k * 2.6;
          const x0 = side === -1 ? 23 : 57;
          const x1 = x0 + side * len;
          return <path key={k} d={`M${x0} ${y}Q${x0 + side * len * 0.55} ${y - 7 + k} ${x1} ${y - 5 + k * 1.2}Q${x0 + side * len * 0.5} ${y + 1} ${x0} ${y + 5}Z`} fill={url("metal")} stroke={darker} strokeOpacity="0.35" strokeWidth="0.6" />;
        });
      body = (
        <>
          <g>{feathers(-1)}</g>
          <g>{feathers(1)}</g>
          <path d={shield} fill={darker} opacity="0.45" transform="translate(0 1.4)" />
          <path d={shield} fill={url("metal")} />
          <path d={shieldInner} fill={url("face")} />
          <path d={shieldInner} fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="0.9" />
          {engrave((fill) => (
            <g fill="none" stroke={fill} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M32 27.5l8 5.5 8-5.5" />
              <path d="M32 35l8 5.5 8-5.5" />
              <path d="M32 42.5l8 5.5 8-5.5" />
            </g>
          ))}
          <path d="M26 23l14-4.8L54 23c-9-2-19-2-28 0z" fill={url("gloss")} opacity="0.7" />
        </>
      );
      break;
    }
    case "legend":
      body = (
        <>
          <Rays cx={40} cy={36} count={20} inner={22} outer={38} fill={url("halo")} opacity={0.6} />
          <Laurel cx={40} cy={40} r={25} from={20} to={100} fill={url("metal")} leaves={6} />
          <path d={shield} fill={darker} opacity="0.45" transform="translate(0 1.4)" />
          <path d={shield} fill={url("metal")} />
          <path d={shieldInner} fill={url("face")} />
          <path d={shieldInner} fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="0.9" />
          {engrave((fill) => (
            <g fill={fill}>
              <path d="M40 22.5c5.8 6.7 9.8 11 8.3 18.5-.9 5-4.5 8.7-8.3 8.7-5.2 0-9-3.9-9-9.2 0-4.5 2.6-7.4 4.9-10 .2 3.4 1.9 5.4 4 5.7-1.3-4.4-1.5-9.1.1-13.7z" />
            </g>
          ))}
          <path d="M40 36.5c2.8 3.3 4 5.5 3.3 8.4-.4 2-2 3.4-3.3 3.4-2.1 0-3.6-1.6-3.6-3.7 0-2.4 1.7-4 3.6-8.1z" style={{ fill: color }} opacity="0.9" />
          <path d="M26 23l14-4.8L54 23c-9-2-19-2-28 0z" fill={url("gloss")} opacity="0.7" />
        </>
      );
      break;
    case "vip":
    default:
      body = (
        <>
          <Rays cx={40} cy={40} count={28} inner={16} outer={39} fill={url("halo")} opacity={0.7} />
          <circle cx="40" cy="41" r="21" fill={url("halo")} opacity="0.6" />
          {/* crown */}
          <path d="M16 53L11.5 25.5l14 12L40 16.5l14.5 21 14-12L64 53z" fill={darker} opacity="0.45" transform="translate(0 1.5)" />
          <path d="M16 53L11.5 25.5l14 12L40 16.5l14.5 21 14-12L64 53z" fill={url("metal")} />
          <path d="M19.5 49.5l-2.6-15.5 9.2 7.8L40 22.5l13.9 19.3 9.2-7.8-2.6 15.5z" fill={url("face")} opacity="0.85" />
          <rect x="14.5" y="52" width="51" height="9" rx="2.5" fill={url("metal")} />
          <rect x="14.5" y="52" width="51" height="9" rx="2.5" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.8" />
          {/* jewels */}
          {[
            [11.5, 25.5, 3.4],
            [40, 16.5, 4],
            [68.5, 25.5, 3.4],
          ].map(([x, y, r], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill="#fff" />
              <circle cx={x} cy={y} r={r * 0.62} style={{ fill: mix(color, 30, "#dc2626") }} />
              <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.25} fill="#fff" opacity="0.9" />
            </g>
          ))}
          {[26, 40, 54].map((x, i) => (
            <g key={x}>
              <rect x={x - 3} y="53.5" width="6" height="6" rx="1" transform={`rotate(45 ${x} 56.5)`} style={{ fill: i === 1 ? "#38bdf8" : "#22c55e" }} />
              <rect x={x - 3} y="53.5" width="6" height="6" rx="1" transform={`rotate(45 ${x} 56.5)`} fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="0.7" />
            </g>
          ))}
          <path d="M22 44c5-3 11-4.5 18-4.5s13 1.5 18 4.5" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" fill="none" />
          <path d="M14.5 27l11 9.5L40 20l1.2 3L26 40z" fill="#fff" opacity="0.28" />
        </>
      );
      break;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {defs}
      {body}
    </svg>
  );
}
