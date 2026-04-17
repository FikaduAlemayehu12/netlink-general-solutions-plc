import { createFileRoute } from "@tanstack/react-router";
import RecycleBinPage from "@/pages/staff/RecycleBinPage";

export const Route = createFileRoute("/staff/recycle-bin")({
  component: RecycleBinPage,
});
