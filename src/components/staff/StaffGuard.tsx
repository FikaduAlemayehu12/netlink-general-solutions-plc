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
  if (roles.length === 0) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-4">
        <div className="bg-card/10 backdrop-blur-md border border-destructive/30 rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-primary-foreground font-heading text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-primary-foreground/60 text-sm mb-4">
            You do not have permission to access the staff portal. This area is restricted to authorized staff members only.
          </p>
          <a href="/" className="text-cyan-brand text-sm hover:underline">← Back to Website</a>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
