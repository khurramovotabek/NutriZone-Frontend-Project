export const ASSISTANT_OPEN_EVENT = "nz:assistant-open";

/** Opens the shopping advisor widget, optionally sending a first question for the shopper. */
export function openAssistant(text?: string) {
  window.dispatchEvent(new CustomEvent(ASSISTANT_OPEN_EVENT, { detail: { text } }));
}
