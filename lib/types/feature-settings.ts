import { z } from "zod";

/**
 * All toggleable/reserved module keys. `savings`, `cards`,
 * `aiReceiptScanning`, and `recurringTransactions` have UI/API wired today
 * (see `lib/utils/features.ts` and the Features tab on `/settings`).
 * `notifications` and `bankSync` are reserved for modules that don't exist
 * yet — keeping them here now means turning them on later is a UI change,
 * not a schema migration.
 */
export const FEATURE_KEYS = [
  "savings",
  "cards",
  "aiReceiptScanning",
  "recurringTransactions",
  "notifications",
  "bankSync",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/** Full, always-complete shape of an account's feature preferences. */
export const featureSettingsSchema = z.object({
  savings: z.boolean(),
  cards: z.boolean(),
  aiReceiptScanning: z.boolean(),
  recurringTransactions: z.boolean(),
  notifications: z.boolean(),
  bankSync: z.boolean(),
});

export type FeatureSettings = z.infer<typeof featureSettingsSchema>;

/** Every module starts enabled — toggles are opt-out, not opt-in. */
export const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  savings: true,
  cards: true,
  aiReceiptScanning: true,
  recurringTransactions: true,
  notifications: true,
  bankSync: true,
};

/**
 * Parses an account's stored `featureSettings` JSON into a complete
 * `FeatureSettings` object. Merges over `DEFAULT_FEATURE_SETTINGS` key by
 * key so:
 * - `null` (never configured) resolves to all-defaults.
 * - Old accounts missing newer keys (e.g. added after they last saved)
 *   still get a default for the missing key.
 * - Malformed/unexpected values for a single key fall back to that key's
 *   default instead of invalidating the whole object.
 *
 * Never throws — always returns a complete, typed object.
 */
export const parseFeatureSettings = (json: unknown): FeatureSettings => {
  const source =
    json !== null && typeof json === "object" && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : {};

  const result = { ...DEFAULT_FEATURE_SETTINGS };
  for (const key of FEATURE_KEYS) {
    const value = source[key];
    if (typeof value === "boolean") {
      result[key] = value;
    }
  }
  return result;
};

/** Metadata for a module that has a toggle rendered on the settings page. */
export interface ToggleableModule {
  key: FeatureKey;
  label: string;
  description: string;
}

/**
 * Modules with a toggle in the Features settings UI today. Reserved keys
 * (`notifications`, `bankSync`) are intentionally excluded until their
 * features ship — showing a toggle for something that doesn't exist yet
 * would be confusing.
 */
export const TOGGLEABLE_MODULES: readonly ToggleableModule[] = [
  {
    key: "savings",
    label: "Savings",
    description: "Track savings pockets and goals.",
  },
  {
    key: "cards",
    label: "Cards",
    description: "Manage cards and card payments.",
  },
  {
    key: "aiReceiptScanning",
    label: "AI receipt scanning",
    description: "Scan receipts to auto-fill transactions.",
  },
  {
    key: "recurringTransactions",
    label: "Recurring transactions",
    description: "Auto-post repeating transactions like rent and bills.",
  },
];
