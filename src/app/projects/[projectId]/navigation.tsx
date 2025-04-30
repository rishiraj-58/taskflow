"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { CalendarDaysIcon, CheckCircleIcon, ClipboardListIcon, LayoutDashboardIcon, ListChecksIcon, UsersIcon, Bug, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ProjectNavigation() {
  const pathname = usePathname();
  const params = useParams();

  const projectId = Array.isArray(params.projectId) 
    ? params.projectId[0] 
    : params.projectId;

  const navItems = [
    {
      title: "Overview",
      href: `/projects/${projectId}`,
      icon: LayoutDashboardIcon,
    },
    {
      title: "Tasks",
      href: `/projects/${projectId}/tasks`,
      icon: CheckCircleIcon,
    },
    {
      title: "Sprints",
      href: `/projects/${projectId}/sprints`,
      icon: ListChecksIcon,
    },
    {
      title: "Calendar",
      href: `/projects/${projectId}/calendar`,
      icon: CalendarDaysIcon,
    },
    {
      title: "Bugs",
      href: `/projects/${projectId}/bugs`,
      icon: Bug,
    },
    {
      title: "Documents",
      href: `/projects/${projectId}/documents`,
      icon: FileText,
    },
    {
      title: "Members",
      href: `/projects/${projectId}/members`,
      icon: UsersIcon,
    },
  ];

  return (
    <nav className="grid items-start gap-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === item.href
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-start"
          )}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.title}
        </Link>
      ))}
    </nav>
  );
} 