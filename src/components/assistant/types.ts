/** Shapes of /api/assistant (backend: apps/assistant). */

export type AssistantCard = {
  id: string;
  slug: string | null;
  name: string;
  brand: string;
  image: string | null;
  price: string | null;
  compare_at_price: string | null;
  discount_percent: number | null;
  currency: string;
  rating: number | null;
  rating_count: number;
  variant_id: string;
  in_stock: boolean;
};

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  products?: AssistantCard[];
  feedback?: "up" | "down" | null;
  /** quick replies offered under the answer (free local advisor) */
  chips?: string[];
  /** index in the stored transcript (feedback is sent by it); undefined while streaming */
  index?: number;
  error?: boolean;
};

export type StreamEvent =
  | { type: "start"; conversation_id: string }
  | { type: "status"; stage: "searching" | "reading" | "showing" | "stores" }
  | { type: "text"; delta: string }
  | { type: "products"; items: AssistantCard[] }
  | { type: "chips"; items: string[] }
  | { type: "done"; conversation_id: string; turns: number; saved: boolean }
  | { type: "error"; code: string; message: string };
