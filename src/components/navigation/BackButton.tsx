"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  href: string;
  label?: string;
}

export default function BackButton({ href, label = "Back" }: BackButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className="mb-4 gap-1 pl-1 text-muted-foreground hover:text-foreground"
    >
      <Link href={href}>
        <ChevronLeft className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
} 