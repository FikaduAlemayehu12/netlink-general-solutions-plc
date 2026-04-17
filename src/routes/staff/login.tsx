import { createFileRoute } from "@tanstack/react-router";
import StaffLogin from "@/pages/staff/StaffLogin";

export const Route = createFileRoute("/staff/login")({
  component: StaffLogin,
});
