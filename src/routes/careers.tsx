import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/PublicLayout";
import Careers from "@/pages/Careers";

export const Route = createFileRoute("/careers")({
  component: () => <PublicLayout><Careers /></PublicLayout>,
});
