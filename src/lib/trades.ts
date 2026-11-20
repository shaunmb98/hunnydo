import type { TradeId, Urgency } from "./types";

export interface TradeInfo {
  id: TradeId;
  label: string;
  pro: string; // what you call the person
  query: string; // Google Places text query
  examples: string;
}

export const TRADES: TradeInfo[] = [
  { id: "plumbing", label: "Plumbing", pro: "Plumber", query: "plumber", examples: "Leaks, water heaters, drains, main lines" },
  { id: "electrical", label: "Electrical", pro: "Electrician", query: "electrician", examples: "Breakers, outlets, wiring, panels" },
  { id: "hvac", label: "Heating & Air", pro: "HVAC tech", query: "HVAC air conditioning heating repair", examples: "AC not cooling, furnace, thermostat" },
  { id: "roofing", label: "Roofing", pro: "Roofer", query: "roofing contractor roof repair", examples: "Leaks, missing shingles, tile, gutters" },
  { id: "appliance", label: "Appliances", pro: "Appliance tech", query: "appliance repair", examples: "Washer, dryer, fridge, dishwasher, oven" },
  { id: "handyman", label: "Handyman", pro: "Handyman", query: "handyman", examples: "Drywall, doors, fixtures, odd jobs" },
  { id: "pest", label: "Pest Control", pro: "Pest control", query: "pest control", examples: "Termites, scorpions, rodents, ants" },
  { id: "landscaping", label: "Yard & Irrigation", pro: "Landscaper", query: "landscaping irrigation repair", examples: "Sprinklers, trees, drainage, yard cleanup" },
];

export const TRADE_IDS = TRADES.map((t) => t.id) as [TradeId, ...TradeId[]];

export function trade(id?: TradeId | string): TradeInfo {
  return TRADES.find((t) => t.id === id) ?? TRADES[5];
}

export const URGENCY: Record<Urgency, { label: string; blurb: string; tone: "red" | "amber" | "green" }> = {
  emergency: { label: "Emergency", blurb: "Deal with this today", tone: "red" },
  soon: { label: "This week", blurb: "Don't let it sit", tone: "amber" },
  routine: { label: "Can wait", blurb: "Schedule when convenient", tone: "green" },
};
