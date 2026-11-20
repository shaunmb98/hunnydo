import type { TradeId, Urgency } from "./types";

export interface TradeInfo {
  id: TradeId;
  label: string;
  pro: string; // what you call the person
  query: string; // Google Places text query
  examples: string;
  core?: boolean; // looked up for every home during onboarding
}

export const TRADES: TradeInfo[] = [
  { id: "plumbing", label: "Plumbing", pro: "Plumber", query: "plumber", examples: "Leaks, water heaters, drains, main lines", core: true },
  { id: "electrical", label: "Electrical", pro: "Electrician", query: "electrician", examples: "Breakers, outlets, wiring, panels", core: true },
  { id: "hvac", label: "Heating & air", pro: "HVAC tech", query: "HVAC contractor", examples: "AC not cooling, furnace, thermostat", core: true },
  { id: "roofing", label: "Roofing", pro: "Roofer", query: "roofing contractor", examples: "Leaks, missing shingles, tile, flashing", core: true },
  { id: "appliance", label: "Appliances", pro: "Appliance tech", query: "appliance repair", examples: "Washer, dryer, fridge, dishwasher, oven", core: true },
  { id: "handyman", label: "Handyman", pro: "Handyman", query: "handyman", examples: "Drywall, doors, fixtures, odd jobs", core: true },
  { id: "pest", label: "Pest control", pro: "Pest control", query: "pest control", examples: "Termites, scorpions, rodents, ants", core: true },
  { id: "landscaping", label: "Yard & irrigation", pro: "Landscaper", query: "landscaper", examples: "Sprinklers, drainage, yard cleanup", core: true },
  { id: "dryer_vent", label: "Dryer vents & ducts", pro: "Vent cleaner", query: "dryer vent cleaning", examples: "Dryer taking forever, lint buildup, air duct cleaning" },
  { id: "garage_door", label: "Garage doors", pro: "Garage door tech", query: "garage door repair", examples: "Door won't open, broken spring, noisy opener" },
  { id: "pool", label: "Pool & spa", pro: "Pool tech", query: "pool service and repair", examples: "Green water, pump or heater trouble, leaks" },
  { id: "locksmith", label: "Locksmith", pro: "Locksmith", query: "locksmith", examples: "Locked out, rekeying, broken locks" },
  { id: "painting", label: "Painting", pro: "Painter", query: "house painter", examples: "Interior, exterior, cabinets, stucco touch-up" },
  { id: "flooring", label: "Flooring", pro: "Flooring installer", query: "flooring contractor", examples: "Tile, hardwood, vinyl, loose or cracked floors" },
  { id: "windows", label: "Windows & glass", pro: "Glass tech", query: "window and glass repair", examples: "Cracked panes, foggy glass, stuck sliders, screens" },
  { id: "cleaning", label: "House cleaning", pro: "Cleaner", query: "house cleaning service", examples: "Deep cleans, move-out cleans, regular service" },
  { id: "carpet", label: "Carpet & upholstery", pro: "Carpet cleaner", query: "carpet cleaning", examples: "Stains, pet odor, tile and grout" },
  { id: "chimney", label: "Chimney & fireplace", pro: "Chimney sweep", query: "chimney sweep", examples: "Smoke backing up, creosote, gas fireplace service" },
  { id: "gutters", label: "Gutters", pro: "Gutter service", query: "gutter cleaning and repair", examples: "Overflowing, sagging or leaking gutters" },
  { id: "tree", label: "Tree service", pro: "Arborist", query: "tree service", examples: "Trimming, removal, storm damage, stumps" },
  { id: "fencing", label: "Fences & gates", pro: "Fence contractor", query: "fence contractor", examples: "Leaning fence, broken gate, block wall repair" },
  { id: "concrete", label: "Concrete & masonry", pro: "Mason", query: "concrete contractor", examples: "Cracked driveway, pavers, brick and block work" },
  { id: "water_damage", label: "Water damage & mold", pro: "Restoration crew", query: "water damage restoration", examples: "Flooded rooms, wet drywall, mold" },
  { id: "septic", label: "Septic & sewer", pro: "Septic service", query: "septic and sewer service", examples: "Backups, slow drains across the house, tank pumping" },
  { id: "solar", label: "Solar", pro: "Solar tech", query: "solar panel repair", examples: "Panels not producing, inverter faults, cleaning" },
  { id: "junk", label: "Junk removal", pro: "Hauler", query: "junk removal", examples: "Old appliances, yard debris, garage cleanouts" },
  { id: "remodel", label: "Remodeling", pro: "General contractor", query: "general contractor remodeling", examples: "Kitchens, baths, additions, bigger projects" },
];

/** The trades every home gets pros for at sign-up. The rest are looked up when first needed. */
export const CORE_TRADES = TRADES.filter((t) => t.core);
export const MORE_TRADES = TRADES.filter((t) => !t.core);

export const TRADE_IDS = TRADES.map((t) => t.id) as [TradeId, ...TradeId[]];

export function trade(id?: TradeId | string): TradeInfo {
  return TRADES.find((t) => t.id === id) ?? TRADES[5];
}

export const URGENCY: Record<Urgency, { label: string; blurb: string; tone: "red" | "amber" | "green" }> = {
  emergency: { label: "Emergency", blurb: "Deal with this today", tone: "red" },
  soon: { label: "This week", blurb: "Don't let it sit", tone: "amber" },
  routine: { label: "Can wait", blurb: "Schedule when convenient", tone: "green" },
};
