import { ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

interface Props { children: ReactNode; }

export default function StaffGuard({ children }: Props) {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-brand/30 border-t-cyan-brand rounded-full animate-spin" />
      </div>
    );
  }

  // Must be logged in AND have at least one staff role
  if (!user) return <Navigate to="/staff/login" replace />;
  // Authenticated client (no staff role) → redirect to client portal
  if (roles.length === 0) {
    return <Navigate to="/portal" replace />;
  }
  return <>{children}</>;
}
