import { createFileRoute } from "@tanstack/react-router";
import PublicLayout from "@/components/PublicLayout";
import IndexPage from "@/pages/Index";

export const Route = createFileRoute("/")({
  component: () => (
    <PublicLayout><IndexPage /></PublicLayout>
  ),
  head: () => ({
    meta: [
      { title: "Netlink General Solutions - IT & Network Solutions" },
      { name: "description", content: "Netlink General Solutions provides cutting-edge IT infrastructure, network solutions, and digital transformation services." },
    ],
  }),
});
