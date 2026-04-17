import { createFileRoute } from "@tanstack/react-router";
import AdminUsers from "@/pages/staff/AdminUsers";

export const Route = createFileRoute("/staff/admin/users")({
  component: AdminUsers,
});
