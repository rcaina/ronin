"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ActionVariant = "primary" | "secondary" | "danger" | "outline" | "ghost";

export interface HeaderAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: ActionVariant;
}

interface BudgetHeaderContextType {
  actions: HeaderAction[];
  setActions: (actions: HeaderAction[]) => void;
  title?: string;
  description?: string;
  setTitle: (title?: string) => void;
  setDescription: (description?: string) => void;
}

const BudgetHeaderContext = createContext<BudgetHeaderContextType | undefined>(
  undefined,
);

export function BudgetHeaderProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<HeaderAction[]>([]);
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState<string | undefined>(undefined);

  return (
    <BudgetHeaderContext.Provider
      value={{
        actions,
        setActions,
        title,
        setTitle,
        description,
        setDescription,
      }}
    >
      {children}
    </BudgetHeaderContext.Provider>
  );
}

export function useBudgetHeader() {
  const context = useContext(BudgetHeaderContext);
  if (context === undefined) {
    throw new Error(
      "useBudgetHeader must be used within a BudgetHeaderProvider",
    );
  }
  return context;
}
