import { createFileRoute } from "@tanstack/react-router";
import HRSystemPage from "@/pages/staff/HRSystemPage";

export const Route = createFileRoute("/staff/hr")({
  component: HRSystemPage,
});
