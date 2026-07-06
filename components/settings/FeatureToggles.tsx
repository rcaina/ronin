"use client";

import { toast } from "react-hot-toast";
import { TOGGLEABLE_MODULES } from "@/lib/types/feature-settings";
import {
  useFeatureSettings,
  useUpdateFeatureSettings,
} from "@/lib/data-hooks/accounts/useFeatureSettings";

interface FeatureTogglesProps {
  /** Only ADMIN users may flip a toggle; everyone else sees them disabled. */
  isAdmin: boolean;
}

/** A single on/off row: label + description on the left, switch on the right. */
const ToggleRow = ({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) => (
  <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="mt-0.5 text-xs text-gray-500">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ease-out ${
        checked ? "bg-secondary" : "bg-gray-200"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-soft transition-transform duration-200 ease-out ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

export default function FeatureToggles({ isAdmin }: FeatureTogglesProps) {
  const { data: settings, isLoading } = useFeatureSettings();
  const updateFeatureSettings = useUpdateFeatureSettings();

  const handleToggle = async (
    key: (typeof TOGGLEABLE_MODULES)[number]["key"],
  ) => {
    if (!settings) return;
    const next = !settings[key];
    try {
      await updateFeatureSettings.mutateAsync({ [key]: next });
      toast.success(next ? "Feature turned on" : "Feature turned off");
    } catch (error) {
      console.error("Failed to update feature settings:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update feature settings. Please try again.",
      );
    }
  };

  return (
    <div className="card-surface p-5 sm:p-6">
      <h3 className="text-base font-semibold tracking-tight text-gray-900">
        Features
      </h3>
      <p className="mt-1 text-sm text-gray-600">
        Turn modules on or off for your household. Turning a module off hides it
        from navigation — your data is kept and comes back when you turn it back
        on.
      </p>

      {!isAdmin && (
        <p className="mt-4 rounded-xl bg-secondary-50 p-3 text-sm text-secondary-800">
          Only account admins can change features.
        </p>
      )}

      <div className="mt-4 divide-y divide-gray-200/70">
        {isLoading || !settings
          ? TOGGLEABLE_MODULES.map((module) => (
              <div
                key={module.key}
                className="h-14 animate-pulse py-3 first:pt-0 last:pb-0"
              >
                <div className="h-full rounded-xl bg-surface-muted" />
              </div>
            ))
          : TOGGLEABLE_MODULES.map((module) => (
              <ToggleRow
                key={module.key}
                label={module.label}
                description={module.description}
                checked={settings[module.key]}
                disabled={!isAdmin || updateFeatureSettings.isPending}
                onChange={() => void handleToggle(module.key)}
              />
            ))}
      </div>
    </div>
  );
}
