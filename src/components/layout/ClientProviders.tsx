"use client";

import { Toaster } from "@/components/ui/toaster";
import { Suspense } from "react";
import dynamic from "next/dynamic";

const AIChatButton = dynamic(
  () => import("@/components/ai/AIChatButton"),
  { ssr: false }
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
      <Suspense fallback={null}>
        <AIChatButton />
      </Suspense>
    </>
  );
} 