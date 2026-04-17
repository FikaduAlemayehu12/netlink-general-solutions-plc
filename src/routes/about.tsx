import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/PublicLayout";
import About from "@/pages/About";

export const Route = createFileRoute("/about")({
  component: () => <PublicLayout><About /></PublicLayout>,
});
