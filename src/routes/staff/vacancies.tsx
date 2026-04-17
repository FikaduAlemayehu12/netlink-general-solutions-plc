import { createFileRoute } from "@tanstack/react-router";
import VacanciesPage from "@/pages/staff/VacanciesPage";

export const Route = createFileRoute("/staff/vacancies")({
  component: VacanciesPage,
});
