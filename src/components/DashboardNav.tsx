"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import Logo from "./Logo";
import { NotificationsDropdown } from "./notifications/NotificationsDropdown";
import { 
  Bell, 
  Menu, 
  X, 
  ChevronDown,
  Home,
  FolderOpen,
  Users,
  CheckSquare,
  LayoutGrid,
  Settings,
  Map
} from "lucide-react";
import { Button } from "./ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

export default function DashboardNav() {
  const { user } = useUser();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Handle scroll effect for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Get role from user metadata
  const role = user?.publicMetadata?.role as string || "member";
  
  const navigationItems = [
    { name: "Dashboard", href: "/dashboard", icon: <Home className="h-4 w-4 mr-2" /> },
    { name: "Workspaces", href: "/workspaces", icon: <LayoutGrid className="h-4 w-4 mr-2" /> },
    { name: "Projects", href: "/projects", icon: <FolderOpen className="h-4 w-4 mr-2" /> },
    { name: "Tasks", href: "/tasks", icon: <CheckSquare className="h-4 w-4 mr-2" /> },
    { name: "Roadmap", href: "/roadmap", icon: <Map className="h-4 w-4 mr-2" /> },
    { name: "Team", href: "/team", icon: <Users className="h-4 w-4 mr-2" /> },
  ];
  
  // Admin links
  const adminItems = [
    { name: "User Management", href: "/admin/users" },
    { name: "Project Settings", href: "/admin/projects" },
    { name: "Analytics", href: "/admin/analytics" },
  ];

  return (
    <nav 
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background transition-all",
        scrolled ? "shadow-sm" : ""
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Logo />
            </div>
            <div className="hidden md:flex md:items-center md:space-x-1 ml-6">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    pathname === item.href || pathname?.startsWith(item.href + "/")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
              
              {/* Admin dropdown */}
              {role === "admin" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                        pathname?.startsWith("/admin")
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Admin
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Admin Controls</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {adminItems.map((item) => (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link 
                          href={item.href}
                          className={cn(
                            "w-full cursor-pointer",
                            pathname === item.href && "font-medium"
                          )}
                        >
                          {item.name}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          {/* Right side - notifications, user, etc. */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center">
              {/* Notification bell */}
              <NotificationsDropdown />
              
              {/* User profile */}
              <div className="ml-2 flex items-center">
                <UserButton 
                  afterSignOutUrl="/" 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "h-8 w-8"
                    }
                  }}
                />
                <div className="ml-2 hidden lg:block">
                  <p className="text-sm font-medium leading-none">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{role}</p>
                </div>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <Button
              variant="ghost" 
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div 
        className={cn(
          "fixed inset-x-0 top-16 z-50 bg-background border-b shadow-sm md:hidden transition-all overflow-hidden duration-300 ease-in-out", 
          isMobileMenuOpen ? "max-h-screen" : "max-h-0"
        )}
      >
        <div className="py-3 px-4 space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center py-2 px-3 rounded-md text-sm font-medium",
                pathname === item.href || pathname?.startsWith(item.href + "/")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent"
              )}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
          
          {/* Admin links for mobile */}
          {role === "admin" && (
            <>
              <div className="pt-2 pb-1">
                <p className="px-3 text-xs font-medium uppercase text-muted-foreground">
                  Admin Controls
                </p>
              </div>
              {adminItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center py-2 px-3 rounded-md text-sm font-medium",
                    pathname === item.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              ))}
            </>
          )}
        </div>
        
        {/* Mobile user profile */}
        <div className="p-4 border-t">
          <div className="flex items-center">
            <UserButton afterSignOutUrl="/" />
            <div className="ml-3">
              <div className="text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <NotificationsDropdown />
          </div>
        </div>
      </div>
    </nav>
  );
} 