"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Target, PiggyBank, DollarSign } from "lucide-react";

interface SavingsNavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export default function SavingsPageNavigation() {
  const params = useParams();
  const id = params.id as string;
  const pathname = usePathname();

  const savingsNavItems: SavingsNavItem[] = [
    {
      href: `/savings/${id}`,
      icon: <Target className="h-4 w-4" />,
      label: "Overview",
    },
    {
      href: `/savings/${id}/pockets`,
      icon: <PiggyBank className="h-4 w-4" />,
      label: "Pockets",
    },
    {
      href: `/savings/${id}/allocations`,
      icon: <DollarSign className="h-4 w-4" />,
      label: "Allocations",
    },
  ];

  return (
    <div className="hidden border-b border-gray-200 bg-primary lg:block">
      <nav className="mx-auto flex w-full overflow-x-auto px-4 sm:px-6 lg:px-8">
        {savingsNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4 ${
                isActive ? "text-accent" : "text-white hover:text-secondary"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
