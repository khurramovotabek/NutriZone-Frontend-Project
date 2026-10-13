"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarOff, Clock } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { Fieldset } from "@/components/store-dashboard/Fieldset";
import { useStoreDashboard } from "@/components/store-dashboard/StoreDashboardContext";
import { type SpecialHoursEntry } from "@/components/store-dashboard/types";
import WeeklyHoursEditor from "@/components/store-dashboard/WeeklyHoursEditor";

const INPUT_CLASS_COMPACT = "nz-glass-input rounded-md px-2 py-1 text-sm";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function StoreHoursPage() {
  const t = useTranslations("myStore");
  const { store, saveField } = useStoreDashboard();

  // Local draft copy of special_hours: needed so a freshly "added" row
  // (no date picked yet) can exist on screen without persisting an
  // invalid, date-less entry to the real store the instant "Add" is
  // clicked -- a row is only sent to saveField() once it has a real
  // date. Re-synced whenever the canonical store object changes (a
  // successful save, or the initial load).
  const [entries, setEntries] = useState<SpecialHoursEntry[]>(store?.special_hours ?? []);
  const [duplicateIdx, setDuplicateIdx] = useState<number | null>(null);
  const [syncedHours, setSyncedHours] = useState(store?.special_hours);
  if (store?.special_hours !== syncedHours) {
    setSyncedHours(store?.special_hours);
    setEntries(store?.special_hours ?? []);
  }

  if (!store) return null;


  function persist(next: SpecialHoursEntry[]) {
    setEntries(next);
    // Never persists a draft row that has no date yet -- the backend's
    // own ListField has no per-item schema, so this is the one place
    // guarding against ever saving a structurally meaningless entry.
    saveField({ special_hours: next.filter((entry) => entry.date) });
  }

  function updateEntry(idx: number, patch: Partial<SpecialHoursEntry>) {
    if (patch.date !== undefined) {
      const isDuplicate = patch.date !== "" && entries.some((entry, i) => i !== idx && entry.date === patch.date);
      if (isDuplicate) {
        setDuplicateIdx(idx);
        return;
      }
      setDuplicateIdx(null);
    }
    persist(entries.map((entry, i) => (i === idx ? { ...entry, ...patch } : entry)));
  }

  function removeEntry(idx: number) {
    setDuplicateIdx(null);
    persist(entries.filter((_, i) => i !== idx));
  }

  function addEntry() {
    // Defaults to today, closed -- the single most common real use
    // (marking today/an upcoming holiday as closed); the owner picks
    // the real date and can flip to custom hours instead. Falls back
    // to an empty, not-yet-persisted draft row if today is already
    // taken, rather than silently overwriting that existing entry.
    const date = entries.some((entry) => entry.date === todayIso()) ? "" : todayIso();
    const next = [...entries, { date, closed: true }];
    if (date) {
      persist(next);
    } else {
      setEntries(next);
    }
  }

  const sortedEntries = entries.map((entry, idx) => ({ entry, idx })).sort((a, b) => a.entry.date.localeCompare(b.entry.date));

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Fieldset legend={t("workingHours")} icon={<Clock className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden="true" />}>
          <WeeklyHoursEditor value={store.working_hours} onSave={(week) => saveField({ working_hours: week })} />
        </Fieldset>
      </Card>

      <Card className="p-5">
        <Fieldset legend={t("specialHours")} icon={<CalendarOff className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden="true" />}>
          <p className="text-xs text-ink-soft">{t("specialHoursHint")}</p>

          {sortedEntries.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("specialHoursEmpty")}</p>
          ) : (
            <div className="space-y-2">
              {sortedEntries.map(({ entry, idx }) => (
                <div key={idx} className="nz-glass flex flex-wrap items-center gap-2 rounded-lg px-3 py-2">
                  <label className="sr-only" htmlFor={`special-date-${idx}`}>
                    {t("dateLabel")}
                  </label>
                  <input
                    id={`special-date-${idx}`}
                    type="date"
                    value={entry.date}
                    onChange={(e) => updateEntry(idx, { date: e.target.value })}
                    className={INPUT_CLASS_COMPACT}
                  />
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <input type="checkbox" checked={entry.closed ?? false} onChange={(e) => updateEntry(idx, { closed: e.target.checked })} />
                    {t("closed")}
                  </label>
                  {!entry.closed && (
                    <>
                      <input
                        type="time"
                        aria-label={`${entry.date || t("dateLabel")} ${t("openTime")}`}
                        defaultValue={entry.open ?? ""}
                        onBlur={(e) => updateEntry(idx, { open: e.target.value })}
                        className={INPUT_CLASS_COMPACT}
                      />
                      <span className="text-ink-soft">&mdash;</span>
                      <input
                        type="time"
                        aria-label={`${entry.date || t("dateLabel")} ${t("closeTime")}`}
                        defaultValue={entry.close ?? ""}
                        onBlur={(e) => updateEntry(idx, { close: e.target.value })}
                        className={INPUT_CLASS_COMPACT}
                      />
                    </>
                  )}
                  <input
                    type="text"
                    defaultValue={entry.note ?? ""}
                    maxLength={80}
                    placeholder={t("specialNotePlaceholder")}
                    onBlur={(e) => e.target.value !== (entry.note ?? "") && updateEntry(idx, { note: e.target.value })}
                    className={`${INPUT_CLASS_COMPACT} min-w-[140px] flex-1`}
                  />
                  <button type="button" onClick={() => removeEntry(idx)} className="ml-auto shrink-0 text-xs font-medium text-red-500 hover:underline">
                    {t("removeSpecialDay")}
                  </button>
                  {duplicateIdx === idx && <p className="w-full text-xs text-red-500">{t("duplicateDateError")}</p>}
                </div>
              ))}
            </div>
          )}

          <Button type="button" variant="secondary" onClick={addEntry}>
            {t("addSpecialDay")}
          </Button>
        </Fieldset>
      </Card>
    </div>
  );
}
