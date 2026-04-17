import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/PublicLayout";
import Services from "@/pages/Services";

export const Route = createFileRoute("/services")({
  component: () => <PublicLayout><Services /></PublicLayout>,
});
