"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Spinner } from "@/components/ui/spinner";
import AuthedLayout from "@/components/AuthedLayout";

export default function WorkspacesLayout({
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
        <Spinner size="lg" />
      </div>
    );
  }

  return <AuthedLayout>{children}</AuthedLayout>;
} 