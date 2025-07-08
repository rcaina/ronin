"use client";
import "@/styles/globals.css";

import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
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
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#363636",
                  color: "#fff",
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: "#10b981",
                    secondary: "#fff",
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "#fff",
                  },
                },
              }}
            />
          </SessionProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
