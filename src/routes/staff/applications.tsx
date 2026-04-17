import { createFileRoute } from "@tanstack/react-router";
import ApplicationsPage from "@/pages/staff/ApplicationsPage";

export const Route = createFileRoute("/staff/applications")({
  component: ApplicationsPage,
});
