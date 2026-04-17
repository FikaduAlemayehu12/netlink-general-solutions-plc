import { createFileRoute } from "@tanstack/react-router";
import ProfilePage from "@/pages/staff/ProfilePage";

export const Route = createFileRoute("/staff/profile")({
  component: ProfilePage,
});
