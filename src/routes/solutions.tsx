import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/PublicLayout";
import Solutions from "@/pages/Solutions";

export const Route = createFileRoute("/solutions")({
  component: () => <PublicLayout><Solutions /></PublicLayout>,
});
