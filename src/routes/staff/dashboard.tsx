import { createFileRoute } from "@tanstack/react-router";
import StaffDashboard from "@/pages/staff/StaffDashboard";

export const Route = createFileRoute("/staff/dashboard")({
  component: StaffDashboard,
});
