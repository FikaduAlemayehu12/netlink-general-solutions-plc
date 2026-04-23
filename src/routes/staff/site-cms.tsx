import { createFileRoute } from "@tanstack/react-router";
import SiteCmsPage from "@/pages/staff/SiteCmsPage";

export const Route = createFileRoute("/staff/site-cms")({
  component: SiteCmsPage,
});
