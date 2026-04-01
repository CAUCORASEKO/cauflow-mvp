import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { getAuthenticatedHomePath } from "@/lib/platform-nav";
import type { UserRole } from "@/types/api";

export function ProtectedRoute({
  roles
}: {
  roles?: UserRole[];
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="shell py-24">
        <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-slate-950/75 px-6 py-8 shadow-glow backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Session</p>
          <p className="mt-3 font-display text-2xl text-white">Restoring your workspace</p>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            CauFlow is reattaching your account context and role-aware access.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!user.emailVerified) {
    return (
      <Navigate
        to="/verify-email"
        replace
        state={{ email: user.email, reason: "verification_required" }}
      />
    );
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getAuthenticatedHomePath(user)} replace />;
  }

  return <Outlet />;
}
