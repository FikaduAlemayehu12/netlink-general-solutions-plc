import { createFileRoute } from "@tanstack/react-router";
import PerformancePage from "@/pages/staff/PerformancePage";

export const Route = createFileRoute("/staff/performance")({
  component: PerformancePage,
});
