import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/PublicLayout";
import ContentDetail from "@/pages/ContentDetail";

export const Route = createFileRoute("/blog/$id")({
  component: () => <PublicLayout><ContentDetail /></PublicLayout>,
});
