"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface MobileHeaderAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

interface MobileHeaderActionContextType {
  action: MobileHeaderAction | null;
  setMobileHeaderAction: (action: MobileHeaderAction | null) => void;
}

const MobileHeaderActionContext = createContext<
  MobileHeaderActionContextType | undefined
>(undefined);

export function MobileHeaderActionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [action, setAction] = useState<MobileHeaderAction | null>(null);

  return (
    <MobileHeaderActionContext.Provider
      value={{ action, setMobileHeaderAction: setAction }}
    >
      {children}
    </MobileHeaderActionContext.Provider>
  );
}

export function useMobileHeaderAction() {
  const context = useContext(MobileHeaderActionContext);
  if (context === undefined) {
    throw new Error(
      "useMobileHeaderAction must be used within a MobileHeaderActionProvider",
    );
  }
  return context;
}
