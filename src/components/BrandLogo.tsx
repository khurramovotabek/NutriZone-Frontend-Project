import MediaImage from "@/components/MediaImage";

const MONOGRAM_GRADIENTS = [
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
];

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}

/** Stable per-name pick, so a brand keeps its colour everywhere. */
function gradientFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return MONOGRAM_GRADIENTS[hash % MONOGRAM_GRADIENTS.length];
}

/**
 * A brand's logo on a white ground (logos are designed for light
 * backgrounds -- a white wordmark vanished on the dark theme's surface),
 * or a coloured monogram of its initials when there's no logo yet. Fills
 * its parent, which sets the size and corner radius.
 */
export default function BrandLogo({ name, logoUrl, padding = "p-4", textSize = "text-2xl", sizes, loading = "lazy" }: { name: string; logoUrl: string | null; padding?: string; textSize?: string; sizes?: string; loading?: "lazy" | "eager" }) {
  if (!logoUrl) {
    return (
      <span aria-hidden="true" className={`flex h-full w-full items-center justify-center bg-gradient-to-br font-black tracking-tight text-white ${gradientFor(name)} ${textSize}`}>
        {initials(name)}
      </span>
    );
  }
  return (
    <span className="relative block h-full w-full bg-white">
      <MediaImage
        src={logoUrl}
        alt=""
        fit="contain"
        padding={padding}
        sizes={sizes}
        loading={loading}
        fallbackIcon={<span className={`font-black text-slate-400 ${textSize}`}>{initials(name)}</span>}
      />
    </span>
  );
}
