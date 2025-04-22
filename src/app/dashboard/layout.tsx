import { ClerkProvider } from "@clerk/nextjs";
import DashboardNav from "@/components/DashboardNav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TaskFlow - Dashboard",
  description: "Manage your projects and tasks effectively with TaskFlow.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <DashboardNav />
        <main className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </ClerkProvider>
  );
} 