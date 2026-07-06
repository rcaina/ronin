import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getFeatureSettings, updateFeatureSettings } from "../services/account";
import type { FeatureSettings } from "@/lib/types/feature-settings";
import { DEFAULT_FEATURE_SETTINGS } from "@/lib/types/feature-settings";

export const featureSettingsKey = ["account", "feature-settings"] as const;

/**
 * Account-wide module on/off preferences — readable by any account member.
 * Used both by the Features settings tab and by nav/pages to hide disabled
 * modules.
 */
export const useFeatureSettings = () => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: featureSettingsKey,
    queryFn: getFeatureSettings,
    enabled: !!session,
    staleTime: 60 * 1000,
  });
};

/**
 * Convenience read of a single module's enabled state. Defaults to enabled
 * (matches `DEFAULT_FEATURE_SETTINGS`) while the query is loading or for
 * unauthenticated callers, so nav doesn't flash-hide items before the
 * settings load.
 */
export const useIsFeatureEnabled = (
  feature: keyof FeatureSettings,
): boolean => {
  const { data } = useFeatureSettings();
  return (data ?? DEFAULT_FEATURE_SETTINGS)[feature];
};

/** ADMIN-only mutation — PATCHes a subset of module preferences. */
export const useUpdateFeatureSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateFeatureSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: featureSettingsKey });
    },
  });
};
