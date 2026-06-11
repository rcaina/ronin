"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Target, DollarSign } from "lucide-react";

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
      href: `/savings/${id}/allocations`,
      icon: <DollarSign className="h-4 w-4" />,
      label: "Allocations",
    },
  ];

  return (
    <div className="hidden bg-surface px-4 pt-3 sm:px-6 lg:block lg:px-8">
      <nav className="inline-flex rounded-full bg-surface-muted p-1">
        {savingsNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out ${
                isActive
                  ? "bg-white text-gray-900 shadow-soft"
                  : "text-gray-500 hover:text-gray-700"
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
