import { createFileRoute } from "@tanstack/react-router";
import ClientPortal from "@/pages/ClientPortal";

export const Route = createFileRoute("/portal")({
  component: ClientPortal,
});
