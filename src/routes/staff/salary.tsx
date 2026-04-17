import { createFileRoute } from "@tanstack/react-router";
import SalaryPage from "@/pages/staff/SalaryPage";

export const Route = createFileRoute("/staff/salary")({
  component: SalaryPage,
});
