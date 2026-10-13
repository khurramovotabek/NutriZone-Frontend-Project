/**
 * Renders a blog post's plain-text body as a readable article, without asking editors for markup:
 *   a blank line separates blocks; a short line with no final punctuation followed by text is a heading;
 *   "1. Title" lines are numbered headings; lines starting with "•", "-" or "*" form a bullet list;
 *   a block starting with "Muhim:" / "Важно:" / "Important:" becomes a highlighted note.
 */
type Block = { kind: "h" | "num" | "p" | "ul" | "note"; text?: string; n?: string; items?: string[] };

const BULLET = /^\s*[•\-*]\s+/;
const NOTE = /^(muhim|важно|important)\s*:/i;

function isHeading(line: string, next: string | undefined) {
  const s = line.trim();
  return s.length > 2 && s.length <= 70 && !/[.!…:;,]$/.test(s) && !BULLET.test(s) && next !== undefined && next.trim() !== "";
}

export function parseArticle(body: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of body.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").filter((l) => l.trim());
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      const num = line.match(/^(\d{1,2})[.)]\s+(.{2,70})$/);
      if (NOTE.test(line)) {
        blocks.push({ kind: "note", text: lines.slice(i).join(" ") });
        break;
      }
      if (num && !/[.!;,]$/.test(num[2]) && lines[i + 1] !== undefined) {
        blocks.push({ kind: "num", n: num[1], text: num[2] });
        i += 1;
      } else if (BULLET.test(line)) {
        const items: string[] = [];
        while (i < lines.length && BULLET.test(lines[i])) items.push(lines[i++].replace(BULLET, "").trim());
        blocks.push({ kind: "ul", items });
      } else if (isHeading(line, lines[i + 1])) {
        blocks.push({ kind: "h", text: line });
        i += 1;
      } else {
        const para: string[] = [];
        while (i < lines.length && !BULLET.test(lines[i]) && !(para.length && isHeading(lines[i], lines[i + 1]))) para.push(lines[i++].trim());
        blocks.push({ kind: "p", text: para.join(" ") });
      }
    }
  }
  return blocks;
}

export default function ArticleBody({ body }: { body: string }) {
  const blocks = parseArticle(body);
  return (
    <div className="mt-8 space-y-5 text-[17px] leading-[1.75] text-ink-muted">
      {blocks.map((b, i) => {
        if (b.kind === "h") return <h2 key={i} className="pt-4 text-2xl font-extrabold tracking-tight text-ink">{b.text}</h2>;
        if (b.kind === "num")
          return (
            <h3 key={i} className="flex items-center gap-3 pt-3 text-xl font-bold text-ink">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-base font-black text-primary">{b.n}</span>
              {b.text}
            </h3>
          );
        if (b.kind === "ul")
          return (
            <ul key={i} className="space-y-2.5">
              {b.items!.map((it, j) => (
                <li key={j} className="flex gap-3">
                  <span className="mt-[0.7em] h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          );
        if (b.kind === "note")
          return (
            <p key={i} className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4 text-[15px] font-medium text-amber-800 dark:text-amber-200">
              {b.text}
            </p>
          );
        return (
          <p key={i} className={i === 0 ? "text-lg text-ink" : ""}>
            {b.text}
          </p>
        );
      })}
    </div>
  );
}
