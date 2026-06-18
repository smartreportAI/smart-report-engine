"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  Activity,
  Building2,
  ChevronsUpDown,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/context";

const sidebarVariants = {
  open: { width: "16rem" },
  closed: { width: "4rem" },
};

const contentVariants = {
  open: { display: "block", opacity: 1 },
  closed: { display: "block", opacity: 1 },
};

const variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: { x: { stiffness: 1000, velocity: -100 } },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: { x: { stiffness: 100 } },
  },
};

const transitionProps = {
  type: "tween" as const,
  ease: "easeOut" as const,
  duration: 0.2,
  staggerChildren: 0.1,
};

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match: string;
}

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, match: "dashboard" },
  { href: "/admin/clients", label: "Clients", icon: Building2, match: "clients" },
  { href: "/admin/reports", label: "Reports", icon: FileText, match: "reports" },
  { href: "/admin/mappings", label: "Mappings", icon: Database, match: "mappings" },
  { href: "/admin/users", label: "Users", icon: Users, match: "users" },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText, match: "audit" },
  { href: "/admin/settings", label: "Settings", icon: Settings, match: "settings" },
];

const clientNav: NavItem[] = [
  { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard, match: "dashboard" },
  { href: "/client/reports", label: "My Reports", icon: FileText, match: "reports" },
  { href: "/client/credits", label: "Credits", icon: CreditCard, match: "credits" },
  { href: "/client/settings", label: "Settings", icon: Settings, match: "settings" },
];

export function SessionNavBar({ role = "admin" }: { role?: "admin" | "client" }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = role === "admin" ? adminNav : clientNav;
  const initials = (user?.name || "User")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.div
      className={cn("sidebar fixed left-0 z-40 h-full shrink-0 border-r border-slate-200")}
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <motion.div
        className="relative z-40 flex text-slate-600 h-full shrink-0 flex-col bg-white transition-all"
        variants={contentVariants}
      >
        <motion.ul variants={staggerVariants} className="flex h-full flex-col">
          <div className="flex grow flex-col items-center">
            {/* Brand / Org header */}
            <div className="flex h-[64px] w-full shrink-0 items-center border-b border-slate-100 px-3">
              <div className="flex w-full items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-sm shadow-blue-600/30">
                  <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <motion.li variants={variants} className="flex w-fit flex-col">
                  {!isCollapsed && (
                    <>
                      <p className="text-sm font-bold text-slate-900 leading-tight">Smart Report</p>
                      <p className="text-[11px] text-slate-400 leading-tight">Health Platform</p>
                    </>
                  )}
                </motion.li>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex h-full w-full flex-col">
              <div className="flex grow flex-col gap-4">
                <ScrollArea className="h-16 grow px-3 py-4">
                  <div className={cn("flex w-full flex-col gap-1.5")}>
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname?.includes(item.match);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex h-10 w-full flex-row items-center rounded-lg px-2.5 transition-colors hover:bg-slate-100 hover:text-blue-600",
                            isActive && "bg-blue-50 text-blue-600 font-medium"
                          )}
                        >
                          <Icon className="h-5 w-5 shrink-0" strokeWidth={isActive ? 2.4 : 2} />
                          <motion.li variants={variants}>
                            {!isCollapsed && (
                              <p className="ml-3 text-sm font-medium">{item.label}</p>
                            )}
                          </motion.li>
                        </Link>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Footer: account dropdown */}
              <div className="flex flex-col p-3">
                <Separator className="w-full mb-3" />
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="w-full">
                    <div className="flex h-10 w-full flex-row items-center gap-3 rounded-lg px-2.5 transition-colors hover:bg-slate-100 hover:text-blue-600">
                      <Avatar className="size-7 shrink-0">
                        <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
                      </Avatar>
                      <motion.li variants={variants} className="flex w-full items-center gap-2">
                        {!isCollapsed && (
                          <>
                            <p className="text-sm font-medium truncate max-w-[120px]">{user?.name}</p>
                            <ChevronsUpDown className="ml-auto h-4 w-4 text-slate-400" />
                          </>
                        )}
                      </motion.li>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent sideOffset={8} align="start">
                    <div className="flex flex-row items-center gap-2 p-2">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-medium text-slate-900">{user?.name}</span>
                        <span className="line-clamp-1 text-xs text-slate-500">{user?.email}</span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="flex items-center gap-2 text-slate-600" asChild>
                      <Link href={role === "admin" ? "/admin/settings" : "/client/settings"}>
                        <UserCircle className="h-4 w-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={logout}
                      className="flex items-center gap-2 text-red-600 focus:bg-red-50 focus:text-red-700"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </motion.ul>
      </motion.div>
    </motion.div>
  );
}
