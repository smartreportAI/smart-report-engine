"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
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
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard, match: "dashboard" },
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
      className={cn("sidebar fixed left-0 z-40 h-full shrink-0 border-r border-slate-900 bg-slate-950 shadow-2xl")}
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <motion.div
        className="relative z-40 flex text-slate-400 h-full shrink-0 flex-col transition-all"
        variants={contentVariants}
      >
        <motion.ul variants={staggerVariants} className="flex h-full flex-col">
          <div className="flex grow flex-col items-center">
            
            {/* Brand / Org header - PRAGNYA */}
            <div className="flex h-[72px] w-full shrink-0 items-center border-b border-slate-800/50 px-4 mt-2">
              <div className="flex w-full items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-md overflow-hidden p-0.5">
                  <img src="/logos/pragnya_logo_v2_origami_1782015159098.png" alt="Pragnya Icon" className="h-full w-full object-contain" />
                </div>
                <motion.li variants={variants} className="flex w-fit flex-col">
                  {!isCollapsed && (
                    <div className="flex flex-col">
                      <p className="text-[18px] font-extrabold tracking-tight">
                        <span className="text-white">Prag</span>
                        <span className="text-emerald-400">nya</span>
                      </p>
                    </div>
                  )}
                </motion.li>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex h-full w-full flex-col mt-4">
              <div className="flex grow flex-col gap-4">
                <ScrollArea className="h-16 grow px-3 py-2">
                  <div className={cn("flex w-full flex-col gap-1.5")}>
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname?.includes(item.match);
                      return (
                         <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "group flex h-11 w-full flex-row items-center rounded-xl px-2.5 transition-all duration-200 relative overflow-hidden",
                            isActive 
                              ? "bg-white/10 text-white font-medium" 
                              : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                          )}
                        >
                          <Icon 
                            className={cn(
                              "h-5 w-5 shrink-0 transition-all duration-200",
                              isActive ? "text-white" : "opacity-70 group-hover:opacity-100"
                            )} 
                            strokeWidth={isActive ? 2 : 1.5} 
                          />
                          <motion.li variants={variants}>
                            {!isCollapsed && (
                              <p className={cn("ml-3 text-sm transition-all duration-300", isActive ? "tracking-tight" : "tracking-normal")}>
                                {item.label}
                              </p>
                            )}
                          </motion.li>
                        </Link>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Footer: account dropdown (Logout System Page) */}
              <div className="flex flex-col p-3 mb-2">
                <Separator className="w-full mb-3 bg-slate-800/50" />
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="w-full outline-none">
                    <div className="flex h-12 w-full flex-row items-center gap-3 rounded-xl px-2 transition-colors hover:bg-slate-900 group">
                      <Avatar className="size-8 shrink-0 ring-2 ring-slate-800 group-hover:ring-slate-700 transition-all">
                        <AvatarFallback className="bg-slate-800 text-slate-300 text-[11px] font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <motion.li variants={variants} className="flex w-full items-center gap-2">
                        {!isCollapsed && (
                          <>
                            <div className="flex flex-col items-start leading-tight">
                              <p className="text-[13px] font-semibold text-slate-200 truncate max-w-[120px]">{user?.name}</p>
                              <p className="text-[10px] text-slate-500 capitalize mt-0.5">{role}</p>
                            </div>
                            <ChevronsUpDown className="ml-auto h-4 w-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                          </>
                        )}
                      </motion.li>
                    </div>
                  </DropdownMenuTrigger>
                  
                  {/* Premium Dark Branded Popover */}
                  <DropdownMenuContent 
                    sideOffset={12} 
                    align="start" 
                    className="w-64 bg-slate-950/95 backdrop-blur-xl border border-slate-800 shadow-[0_12px_40px_rgba(0,0,0,0.4)] rounded-2xl p-1"
                  >
                    <div className="flex flex-col p-3 pb-4 border-b border-slate-800/60 bg-gradient-to-b from-slate-900/50 to-transparent rounded-t-xl mb-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Pragnya Workspace</p>
                      <div className="flex flex-row items-center gap-3">
                        <Avatar className="size-10 shadow-lg ring-1 ring-white/10">
                          <AvatarFallback className="bg-blue-600 text-white text-sm font-bold">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-semibold text-white tracking-tight">{user?.name}</span>
                          <span className="line-clamp-1 text-xs text-slate-400 font-medium">{user?.email}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-1">
                      <DropdownMenuItem className="flex items-center gap-2 text-slate-300 hover:text-white focus:bg-slate-900 focus:text-white rounded-lg p-2.5 cursor-pointer transition-colors" asChild>
                        <Link href={role === "admin" ? "/admin/settings" : "/client/settings"}>
                          <UserCircle className="h-4 w-4" /> 
                          <span className="font-medium text-sm">Account Settings</span>
                        </Link>
                      </DropdownMenuItem>
                    </div>
                    
                    <DropdownMenuSeparator className="bg-slate-800/60 my-1" />
                    
                    <div className="p-1">
                      <DropdownMenuItem
                        onClick={logout}
                        className="flex items-center gap-2 text-rose-400 hover:text-rose-300 focus:bg-rose-500/10 focus:text-rose-300 rounded-lg p-2.5 cursor-pointer transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> 
                        <span className="font-medium text-sm">Sign out securely</span>
                      </DropdownMenuItem>
                    </div>
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
