import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { HttpError } from "./admin";

// A diagnosis should never outlive the request that asked for it.
const client = new Anthropic({ timeout: 75_000, maxRetries: 1 });
// Prompts include text the user can edit (briefs, notes, pasted quotes). Cap what one call can send.
const MAX_PROMPT_CHARS = 30_000;
const MODEL = "claude-opus-5-5";

export type ImageInput = {
  data: string; // base64, no data: prefix
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
};

/**
 * One Claude call that returns JSON matching a Zod schema.
 * Used for photo diagnosis, review analysis, outreach drafting and quote extraction.
 */
export async function structured<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  images?: ImageInput[];
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const content: Anthropic.ContentBlockParam[] = [
    ...(opts.images ?? []).map(
      (img): Anthropic.ImageBlockParam => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      }),
    ),
    { type: "text", text: opts.prompt.slice(0, MAX_PROMPT_CHARS) },
  ];

  // Fast mode roughly halves the wait on long answers. If it's rate limited or unavailable, run at normal speed.
  const request = (fast: boolean) =>
    client.messages.parse({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 8000,
      system: opts.system,
      messages: [{ role: "user", content }],
      ...(fast ? { speed: "fast" as const } : {}),
      output_config: {
        effort: opts.effort ?? "low",
        format: zodOutputFormat(opts.schema),
      },
    });

  try {
    let response;
    try {
      response = await request(true);
    } catch (err) {
      if (err instanceof Anthropic.APIError && (err.status === 429 || err.status === 400 || err.status === 403)) {
        response = await request(false);
      } else {
        throw err;
      }
    }
    if (response.stop_reason === "refusal") {
      throw new HttpError(422, "The assistant couldn't help with that one. Try rewording it.");
    }
    if (!response.parsed_output) {
      throw new HttpError(502, "The assistant returned something we couldn't read. Try again.");
    }
    return response.parsed_output as z.infer<S>;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Anthropic.RateLimitError) {
      throw new HttpError(429, "The assistant is busy. Give it a few seconds and try again.");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new HttpError(503, "Couldn't reach the assistant. Check your connection and try again.");
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[ai]", err.status, err.message);
      throw new HttpError(502, "The assistant hit an error. Try again.");
    }
    throw err;
  }
}
