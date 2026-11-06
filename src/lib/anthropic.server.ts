// Server-only Anthropic Messages API helper. All AI text in the app goes
// through here, using the project's own ANTHROPIC_API_KEY secret.

// Single place to change the model. ANTHROPIC_MODEL secret/env overrides it.
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";

export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
}

const TIMEOUT_MS = 60_000;

export class AnthropicError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export type AnthropicResult = { text: string; stopReason: string | null; model: string };

/**
 * One Messages API call with a 60s timeout and a single retry on 429/5xx.
 * Never logs the key or the prompt.
 */
export async function callAnthropic(prompt: string, maxTokens: number): Promise<AnthropicResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AnthropicError("ANTHROPIC_API_KEY is not configured");
  const model = anthropicModel();

  const attempt = async () =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

  let response: Response;
  try {
    response = await attempt();
  } catch (e) {
    throw new AnthropicError(`Anthropic request failed: ${(e as Error).name}`);
  }
  if (response.status === 429 || response.status >= 500) {
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 10_000) : 2_000;
    await response.body?.cancel();
    await new Promise((r) => setTimeout(r, waitMs));
    try {
      response = await attempt();
    } catch (e) {
      throw new AnthropicError(`Anthropic request failed: ${(e as Error).name}`);
    }
  }
  if (!response.ok) {
    const errText = await response.text();
    console.error("[anthropic] error", response.status, errText.slice(0, 500));
    throw new AnthropicError(`Anthropic API error ${response.status}`, response.status);
  }

  const json = (await response.json()) as any;
  return {
    text: json?.content?.[0]?.text ?? "",
    stopReason: json?.stop_reason ?? null,
    model,
  };
}
