"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, type LucideIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { useUpdateTheme } from "@/lib/data-hooks/users/useUser";

type ThemeValue = "light" | "dark" | "system";

const OPTIONS: {
  value: ThemeValue;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Bright, warm surfaces",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easy on the eyes",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device",
    icon: Monitor,
  },
];

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const updateTheme = useUpdateTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes only knows the resolved value on the client — wait for mount so
  // the active state doesn't flash the wrong option during hydration.
  useEffect(() => setMounted(true), []);

  const selected = (mounted ? theme : undefined) as ThemeValue | undefined;

  const handleSelect = async (value: ThemeValue) => {
    if (value === selected) return;
    // Apply instantly for a responsive feel, then persist to the account.
    setTheme(value);
    try {
      await updateTheme.mutateAsync(value);
      toast.success("Appearance updated");
    } catch (error) {
      console.error("Failed to save theme preference:", error);
      toast.error("Couldn't save your preference. It's applied for now.");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = selected === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            aria-pressed={isActive}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ease-out ${
              isActive
                ? "border-secondary bg-secondary/10 shadow-soft"
                : "border-gray-200/70 bg-surface-card hover:-translate-y-0.5 hover:border-gray-300/80 hover:shadow-card"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isActive
                  ? "bg-secondary/20 text-secondary-700"
                  : "bg-surface-muted text-gray-500"
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight text-gray-900">
                {option.label}
              </span>
              <span className="block truncate text-xs text-gray-500">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
