import { Fragment, type ReactNode } from "react";

/**
 * The assistant's answer as safe React nodes: paragraphs, "- " / "• " / "1. " list lines and **bold** -- nothing
 * else is interpreted (no HTML, no links), so model output can never inject markup.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4
      ? <strong key={`${keyBase}-${i}`} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
      : <Fragment key={`${keyBase}-${i}`}>{part.replace(/\*\*/g, "")}</Fragment>,
  );
}

export default function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="grid gap-2">
      {blocks.map((block, b) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const isList = lines.length > 0 && lines.every((l) => /^([-•*]|\d+[.)])\s+/.test(l));
        if (isList) {
          const ordered = /^\d/.test(lines[0]);
          const Tag = ordered ? "ol" : "ul";
          return (
            <Tag key={b} className={`grid gap-1 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-primary`}>
              {lines.map((l, i) => <li key={i}>{inline(l.replace(/^([-•*]|\d+[.)])\s+/, ""), `${b}-${i}`)}</li>)}
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
