import type { FeatureSettings } from "@/lib/types/feature-settings";
import { parseErrorResponse } from "./http";

export const getFeatureSettings = async (): Promise<FeatureSettings> => {
  const response = await fetch("/api/account/feature-settings");
  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<FeatureSettings>;
};

export const updateFeatureSettings = async (
  patch: Partial<FeatureSettings>,
): Promise<FeatureSettings> => {
  const response = await fetch("/api/account/feature-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!response.ok) return parseErrorResponse(response);
  return response.json() as Promise<FeatureSettings>;
};
