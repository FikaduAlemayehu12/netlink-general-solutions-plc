import { createFileRoute } from "@tanstack/react-router";
import MessagesPage from "@/pages/staff/MessagesPage";

export const Route = createFileRoute("/staff/messages")({
  component: MessagesPage,
});
