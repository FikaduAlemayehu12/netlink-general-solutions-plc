import { createFileRoute } from "@tanstack/react-router";
import TeamPage from "@/pages/staff/TeamPage";

export const Route = createFileRoute("/staff/team")({
  component: TeamPage,
});
