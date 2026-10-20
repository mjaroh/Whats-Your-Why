// Membership prices. Existing subscribers keep the price they signed up at;
// these apply to new checkouts.
export const PLANS = {
  month: { cents: 1499, interval: "month", label: "$14.99 / month", note: null },
  year: { cents: 12000, interval: "year", label: "$120 / year", note: "Save 33%" },
} as const;

export type PlanId = keyof typeof PLANS;
export const isPlanId = (v: unknown): v is PlanId => v === "month" || v === "year";
