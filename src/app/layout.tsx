"use client";
import "@/styles/globals.css";

import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ConditionalLayout from "@/components/ConditionalLayout";
import { useState } from "react";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <html lang="en" className={geist.variable}>
      <body className="">
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <ConditionalLayout>{children}</ConditionalLayout>
          </SessionProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
