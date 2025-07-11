"use client";

import { useState, useEffect } from "react";
import { redirect } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Spinner } from "@/components/ui/spinner";
import { AppLayout } from "@/components/layout/AppLayout";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const { userId, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      if (!userId) {
        redirect("/sign-in");
      } else {
        setLoading(false);
      }
    }
  }, [userId, isLoaded]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner size="lg" />
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <AppLayout>{children}</AppLayout>
    </NotificationProvider>
  );
} 