import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/PublicLayout";
import Contact from "@/pages/Contact";

export const Route = createFileRoute("/contact")({
  component: () => <PublicLayout><Contact /></PublicLayout>,
});
