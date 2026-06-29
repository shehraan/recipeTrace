"use client";

import type { ReactNode } from "react";

import { DemoEvidenceDrawer } from "./evidence-drawer";
import { DemoHeader, DemoNav } from "./demo-nav";

export function DemoShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-amber-50/80 via-stone-50 to-stone-50">
      <DemoHeader />
      <DemoNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
      <DemoEvidenceDrawer />
    </div>
  );
}
