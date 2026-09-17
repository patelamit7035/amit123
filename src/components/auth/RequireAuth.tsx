import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

/** Gate for the signed-in area. `adminOnly` also enforces the admin role. */
export function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
