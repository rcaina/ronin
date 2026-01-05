"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ActionVariant = "primary" | "secondary" | "danger" | "outline" | "ghost";

export interface HeaderAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: ActionVariant;
}

interface PocketHeaderContextType {
  action: HeaderAction | null;
  setAction: (action: HeaderAction | null) => void;
}

const PocketHeaderContext = createContext<PocketHeaderContextType | undefined>(
  undefined,
);

export function PocketHeaderProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<HeaderAction | null>(null);

  return (
    <PocketHeaderContext.Provider
      value={{
        action,
        setAction,
      }}
    >
      {children}
    </PocketHeaderContext.Provider>
  );
}

export function usePocketHeader() {
  const context = useContext(PocketHeaderContext);
  if (context === undefined) {
    throw new Error(
      "usePocketHeader must be used within a PocketHeaderProvider",
    );
  }
  return context;
}
