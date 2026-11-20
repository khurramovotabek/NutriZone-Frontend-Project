import { CheckCircle2 } from "lucide-react";

type Block = { kind: "p"; text: string } | { kind: "h"; text: string } | { kind: "ul"; items: string[] };

const BULLET = /^\s*(?:[•●▪◦·*-]|\d+[.)])\s+/;

/**
 * The product's own description text, laid out for reading: a short line ending in ":" ("Asosiy afzalliklari:")
 * becomes a small heading, "•"/"-" lines become a check-marked list, everything else stays a paragraph. A re-flow
 * of exactly the text the admin wrote -- nothing added, nothing dropped.
 */
export default function ProductDescription({ text }: { text: string }) {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (BULLET.test(line)) {
      const item = line.replace(BULLET, "");
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ul") last.items.push(item);
      else blocks.push({ kind: "ul", items: [item] });
    } else if (line.endsWith(":") && line.length <= 60) {
      blocks.push({ kind: "h", text: line.slice(0, -1) });
    } else {
      blocks.push({ kind: "p", text: line });
    }
  }

  return (
    <div className="max-w-3xl space-y-3.5 text-[15px] leading-relaxed text-ink-muted">
      {blocks.map((b, i) =>
        b.kind === "h" ? (
          <h3 key={i} className="pt-1 text-sm font-semibold uppercase tracking-wide text-ink">{b.text}</h3>
        ) : b.kind === "ul" ? (
          <ul key={i} className="grid gap-2 sm:grid-cols-2">
            {b.items.map((item, j) => (
              <li key={j} className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-surface/50 px-3 py-2.5 text-sm text-ink">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.text}</p>
        ),
      )}
    </div>
  );
}
