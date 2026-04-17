import { createFileRoute } from "@tanstack/react-router";
import PlansPage from "@/pages/staff/PlansPage";

export const Route = createFileRoute("/staff/plans")({
  component: PlansPage,
});
