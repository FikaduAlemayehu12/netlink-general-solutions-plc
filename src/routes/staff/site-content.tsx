import { createFileRoute } from "@tanstack/react-router";
import SiteContentPage from "@/pages/staff/SiteContentPage";

export const Route = createFileRoute("/staff/site-content")({
  component: SiteContentPage,
});
