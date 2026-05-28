import { z } from "zod";

/**
 * FOCUS 1.2 (FinOps Open Cost & Usage Specification) schema.
 * https://focus.finops.org/focus-specification/
 *
 * Only the columns we actively query are strict — the rest are optional
 * so we can load data from all providers without crashing on missing fields.
 */

export const ChargeTypeSchema = z.enum([
  "Usage",
  "Purchase",
  "Tax",
  "Credit",
  "Adjustment"
]);

export const ServiceCategorySchema = z.enum([
  "AI and Machine Learning",
  "Compute",
  "Storage",
  "Databases",
  "Networking",
  "Security",
  "Management",
  "Developer Tools",
  "Other"
]);

export const FocusRecordSchema = z.object({
  // Identity
  ProviderName: z.string(),
  PublisherName: z.string().optional(),
  ServiceName: z.string(),
  ServiceCategory: ServiceCategorySchema,

  // Billing period
  BillingPeriodStart: z.string(), // ISO 8601
  BillingPeriodEnd: z.string(),

  // Costs (all in BillingCurrency)
  BilledCost: z.number(),
  EffectiveCost: z.number(),
  ListCost: z.number().optional(),
  BillingCurrency: z.string().default("USD"),

  // Charge info
  ChargeType: ChargeTypeSchema,
  ChargeDescription: z.string().optional(),

  // Location
  RegionId: z.string().optional(),
  RegionName: z.string().optional(),

  // Account
  SubAccountId: z.string().optional(),
  SubAccountName: z.string().optional(),

  // Resource (optional — not all providers include this)
  ResourceId: z.string().optional(),
  ResourceName: z.string().optional(),
  ResourceType: z.string().optional(),

  // Tags (free-form key-value)
  Tags: z.record(z.string()).optional()
});

export type FocusRecord = z.infer<typeof FocusRecordSchema>;
export type ChargeType = z.infer<typeof ChargeTypeSchema>;
export type ServiceCategory = z.infer<typeof ServiceCategorySchema>;

/** Groups a list of records by a string key. */
export function groupBy<T>(
  records: T[],
  key: (r: T) => string
): Record<string, T[]> {
  return records.reduce<Record<string, T[]>>((acc, r) => {
    const k = key(r);
    (acc[k] ??= []).push(r);
    return acc;
  }, {});
}

/** Sums BilledCost across a list of records. */
export function sumCost(records: FocusRecord[]): number {
  return records.reduce((sum, r) => sum + r.BilledCost, 0);
}

/** Rounds to 2 decimal places. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
