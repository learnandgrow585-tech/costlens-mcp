/**
 * Anthropic → FOCUS 1.2 adapter.
 *
 * Requires env var:
 *   ANTHROPIC_API_KEY — API key from console.anthropic.com/settings/keys
 *
 * Connection check:  verifies the key is valid via GET /v1/models.
 * Billing data:      Anthropic does not yet publish a public billing/cost API.
 *                    fetchAnthropicRecords() returns fetched=false so the store
 *                    falls back to sample data for Anthropic costs. When Anthropic
 *                    releases a cost endpoint this adapter will be updated.
 *
 * Practical effect:
 *   - /connect page shows "✓ Connected" once ANTHROPIC_API_KEY is set.
 *   - The dashboard shows the realistic sample Anthropic cost figures.
 *   - Future: real per-model spend when billing API is available.
 */

import type { FocusRecord } from "@/lib/focus/schema";
import { logger } from "@/lib/utils/logger";

// ── Public API ────────────────────────────────────────────────────────────

export interface AnthropicAdapterResult {
  records: FocusRecord[];
  months:  string[];
  fetched: boolean;
  error?:  string;
  note?:   string;
}

export async function fetchAnthropicRecords(): Promise<AnthropicAdapterResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      records: [], months: [], fetched: false,
      error: "ANTHROPIC_API_KEY not set"
    };
  }

  // Anthropic does not expose a public billing cost API yet.
  // Return fetched=false so the store falls back to sample Anthropic records.
  logger.info("Anthropic billing API not available — using sample data for Anthropic costs");
  return {
    records: [], months: [], fetched: false,
    note: "Anthropic billing API not yet public — dashboard shows sample cost estimates"
  };
}

/** Verifies ANTHROPIC_API_KEY is accepted by the Anthropic API. */
export async function checkAnthropicConnection(): Promise<{ connected: boolean; error?: string; note?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { connected: false, error: "ANTHROPIC_API_KEY not set" };
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01"
      }
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        connected: false,
        error: `Anthropic API error (${res.status}): ${text.slice(0, 100)}`
      };
    }
    return {
      connected: true,
      note: "API key valid — cost figures use sample estimates (billing API coming soon)"
    };
  } catch (err) {
    return { connected: false, error: err instanceof Error ? err.message : String(err) };
  }
}
