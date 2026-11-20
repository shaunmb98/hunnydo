import { handler } from "@/lib/admin";
import { autocompleteAddress } from "@/lib/places";

export const POST = handler<{ input?: string }>(async ({ body }) => {
  const input = typeof body.input === "string" ? body.input.trim().slice(0, 200) : "";
  if (input.length < 3) return { suggestions: [] };
  return { suggestions: await autocompleteAddress(input) };
});
