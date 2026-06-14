"use client";

import Image from "next/image";
import roninLogo from "@/public/ronin_logo.jpg";

// Slim mobile top bar. Primary navigation now lives in the MobileBottomNav;
// this keeps the brand mark up top (a receipt-capture camera action will live
// here later).
export default function MobileHeader() {
  return (
    <div className="fixed left-0 right-0 top-0 z-[60] border-b border-gray-200/70 bg-white/90 backdrop-blur-md lg:hidden">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 flex-shrink-0">
            <Image
              src={roninLogo}
              alt="Ronin Logo"
              width={36}
              height={36}
              className="h-full w-full rounded-full ring-2 ring-secondary/40"
              priority
            />
          </div>
          <h1 className="text-sm font-bold tracking-[0.2em] text-secondary-700">
            RONIN
          </h1>
        </div>
      </div>
    </div>
  );
}
