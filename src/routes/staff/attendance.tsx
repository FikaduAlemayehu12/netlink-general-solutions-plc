import { createFileRoute } from "@tanstack/react-router";
import AttendancePage from "@/pages/staff/AttendancePage";

export const Route = createFileRoute("/staff/attendance")({
  component: AttendancePage,
});
