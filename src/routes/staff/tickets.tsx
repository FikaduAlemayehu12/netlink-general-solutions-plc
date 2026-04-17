import { createFileRoute } from "@tanstack/react-router";
import TicketsPage from "@/pages/staff/TicketsPage";

export const Route = createFileRoute("/staff/tickets")({
  component: TicketsPage,
});
