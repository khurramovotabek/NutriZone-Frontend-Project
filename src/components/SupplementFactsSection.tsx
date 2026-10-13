import CompositionTable from "@/components/CompositionTable";
import { parseKeyValueText } from "@/lib/parse-key-value-text";

/**
 * Renders the real `product.supplement_facts` text as a proper
 * key/value table (see `parseKeyValueText`'s own docstring for why
 * this is a safe re-flow of the same real text, never fabricated
 * data) -- any line that isn't itself a "label — value" fact (e.g. a
 * standalone claim like "100% Micronized") still renders, just below
 * the table as plain text, never silently dropped.
 */
export default function SupplementFactsSection({ text }: { text: string }) {
  const { rows, notes } = parseKeyValueText(text);

  if (rows.length === 0) {
    return <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">{text}</p>;
  }

  return (
    <div className="space-y-3">
      <CompositionTable rows={rows} />
      {notes.map((note, idx) => (
        <p key={idx} className="text-sm leading-relaxed text-ink-muted">
          {note}
        </p>
      ))}
    </div>
  );
}
