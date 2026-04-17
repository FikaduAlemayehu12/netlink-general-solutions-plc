import { createFileRoute } from "@tanstack/react-router";
import ActivityLogPage from "@/pages/staff/ActivityLogPage";

export const Route = createFileRoute("/staff/activity-log")({
  component: ActivityLogPage,
});
