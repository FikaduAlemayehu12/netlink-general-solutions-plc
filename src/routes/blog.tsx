import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/PublicLayout";
import Blog from "@/pages/Blog";

export const Route = createFileRoute("/blog")({
  component: () => <PublicLayout><Blog /></PublicLayout>,
});
