"use client";

import { useAuth } from "./context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (requiredRoles && user && !requiredRoles.includes(user.role)) {
      // Redirect to appropriate dashboard based on role
      if (user.role === "client" || user.role === "lab_staff") {
        router.replace("/client/dashboard");
      } else {
        router.replace("/admin/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, user, requiredRoles, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requiredRoles && user && !requiredRoles.includes(user.role)) return null;

  return <>{children}</>;
}
