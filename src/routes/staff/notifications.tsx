import { createFileRoute } from "@tanstack/react-router";
import NotificationsPage from "@/pages/staff/NotificationsPage";

export const Route = createFileRoute("/staff/notifications")({
  component: NotificationsPage,
});
