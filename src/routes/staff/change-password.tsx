import { createFileRoute } from "@tanstack/react-router";
import ChangePassword from "@/pages/staff/ChangePassword";

export const Route = createFileRoute("/staff/change-password")({
  component: ChangePassword,
});
