"use client";

import Link from "next/link";
import { tabClassName } from "@/components/Tabs";
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
    <>
      {/* Underline tab row under the page header; sticks under it on mobile */}
      <div className="sticky top-0 z-20 border-b border-gray-200/70 bg-surface/90 px-4 pt-3 backdrop-blur-md sm:px-6 lg:static lg:z-auto lg:border-b-0 lg:bg-surface lg:px-8 lg:backdrop-blur-none">
        <nav className="flex flex-wrap">
          {savingsNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={tabClassName(isActive)}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
