"use client";

import { ReactNode } from "react";
import DashboardNav from "@/components/DashboardNav";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";

interface AuthedLayoutProps {
  children: ReactNode;
}

export default function AuthedLayout({ children }: AuthedLayoutProps) {
  return (
    <NotificationProvider>
      <div className="flex min-h-screen flex-col">
        <DashboardNav />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </NotificationProvider>
  );
} 