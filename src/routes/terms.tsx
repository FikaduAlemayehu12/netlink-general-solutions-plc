import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/PublicLayout";
import Privacy from "@/pages/Privacy";

export const Route = createFileRoute("/terms")({
  component: () => <PublicLayout><Privacy /></PublicLayout>,
});
