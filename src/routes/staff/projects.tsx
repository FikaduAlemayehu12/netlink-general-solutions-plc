import { createFileRoute } from "@tanstack/react-router";
import ProjectsPage from "@/pages/staff/ProjectsPage";

export const Route = createFileRoute("/staff/projects")({
  component: ProjectsPage,
});
