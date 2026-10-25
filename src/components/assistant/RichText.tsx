import { Fragment, type ReactNode } from "react";

/**
 * The assistant's answer as safe React nodes: paragraphs, "- " / "• " / "1. " list lines, **bold**, _italic_, ~~struck~~ -- nothing
 * else is interpreted (no HTML, no links), so model output can never inject markup.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|~~[^~]+~~|(?<![\w])_[^_]+_(?![\w]))/g).filter(Boolean).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={key} className="font-semibold text-ink">{part.slice(2, -2)}</strong>;
    if (part.startsWith("~~") && part.endsWith("~~") && part.length > 4) return <s key={key} className="text-ink-soft">{part.slice(2, -2)}</s>;
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) return <em key={key} className="text-ink-muted">{part.slice(1, -1)}</em>;
    return <Fragment key={key}>{part.replace(/\*\*/g, "")}</Fragment>;
  });
}

const LIST_LINE = /^([-•*]|\d+[.)])\s+/;

/** Paragraph blocks, with a run of list lines inside a block ("Intro:\n• a\n• b") split off as its own list. */
function splitBlocks(text: string): string[] {
  const out: string[] = [];
  for (const block of text.replace(/\r/g, "").split(/\n{2,}/)) {
    let run: string[] = [];
    let runIsList: boolean | null = null;
    for (const line of block.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const isList = LIST_LINE.test(line);
      if (runIsList !== null && isList !== runIsList) {
        out.push(run.join("\n"));
        run = [];
      }
      run.push(line);
      runIsList = isList;
    }
    if (run.length) out.push(run.join("\n"));
  }
  return out;
}

export default function RichText({ text }: { text: string }) {
  const blocks = splitBlocks(text);
  return (
    <div className="grid gap-2">
      {blocks.map((block, b) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const isList = lines.length > 0 && lines.every((l) => LIST_LINE.test(l));
        if (isList) {
          const ordered = /^\d/.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={b} className={`grid gap-1 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-primary`}>
              {lines.map((l, i) => <li key={i}>{inline(l.replace(LIST_LINE, ""), `${b}-${i}`)}</li>)}
            </Tag>
          );
        }
        return (
          <p key={b}>
            {lines.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{inline(l, `${b}-${i}`)}</Fragment>)}
          </p>
        );
      })}
    </div>
  );
}
