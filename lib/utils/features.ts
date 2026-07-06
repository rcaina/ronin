import type { FeatureKey, FeatureSettings } from "@/lib/types/feature-settings";

// ---------------------------------------------------------------------------
// Features vs. entitlements
//
// `lib/utils/entitlements.ts` answers "may they" — what the account's plan
// permits. This file answers "do they want it" — a household preference,
// account-wide, editable by an ADMIN via `/settings`. A module should only
// be shown/usable when BOTH allow it: an enabled-but-unentitled feature
// stays hidden behind the paywall, and a disabled-but-entitled feature stays
// hidden because the household turned it off. Neither check substitutes for
// the other.
// ---------------------------------------------------------------------------

/**
 * Whether a module is turned on for the account, per its stored preference.
 * Pure and framework-agnostic — operates on an already-parsed
 * `FeatureSettings` object (see `parseFeatureSettings`), never on raw JSON.
 */
export const isFeatureEnabled = (
  settings: FeatureSettings,
  feature: FeatureKey,
): boolean => settings[feature];
