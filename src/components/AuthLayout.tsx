"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import SideNav from "./SideNav";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        Loading...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="bg-gray/90 flex min-h-screen text-black">
      <SideNav isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div
        className={`flex-1 transition-all duration-300 ${isCollapsed ? "pl-16" : "pl-64"}`}
      >
        {children}
      </div>
    </main>
  );
}
