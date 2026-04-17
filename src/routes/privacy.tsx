import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/PublicLayout";
import Privacy from "@/pages/Privacy";

export const Route = createFileRoute("/privacy")({
  component: () => <PublicLayout><Privacy /></PublicLayout>,
});
