import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { isAdmin } from "@/lib/admin";
import { clerkEnabled } from "@/lib/clerk";
import { openCrisisEvents, openReports } from "@/lib/group";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!clerkEnabled || !(await isAdmin())) redirect("/");
  const [reports, crises] = await Promise.all([openReports(), openCrisisEvents()]);
  return (
    <AdminPanel
      reports={reports.map((r) => ({ ...r, created_at: r.created_at.toISOString() }))}
      crises={crises.map((c) => ({ ...c, created_at: c.created_at.toISOString() }))}
    />
  );
}
