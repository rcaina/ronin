"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface MobileHeaderAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

interface MobileHeaderActionContextType {
  action: MobileHeaderAction | null;
  setMobileHeaderAction: (action: MobileHeaderAction | null) => void;
  /** Where a headerless page portals its secondary-actions menu. */
  menuSlot: HTMLElement | null;
  setMenuSlot: (slot: HTMLElement | null) => void;
  /** Where a headerless page portals its back button and title, over the logo. */
  leadSlot: HTMLElement | null;
  setLeadSlot: (slot: HTMLElement | null) => void;
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
  const [menuSlot, setMenuSlot] = useState<HTMLElement | null>(null);
  const [leadSlot, setLeadSlot] = useState<HTMLElement | null>(null);

  const value = useMemo(
    () => ({
      action,
      setMobileHeaderAction: setAction,
      menuSlot,
      setMenuSlot,
      leadSlot,
      setLeadSlot,
    }),
    [action, menuSlot, leadSlot],
  );

  return (
    <MobileHeaderActionContext.Provider value={value}>
      {children}
    </MobileHeaderActionContext.Provider>
  );
}

/** Nulls outside the provider, so `PageHeader` still renders on shell-less routes. */
export function useMobileHeaderSlots() {
  const context = useContext(MobileHeaderActionContext);
  return {
    menuSlot: context?.menuSlot ?? null,
    leadSlot: context?.leadSlot ?? null,
    shortcutLabel: context?.action?.label ?? null,
  };
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
