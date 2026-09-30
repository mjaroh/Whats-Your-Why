import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { isAdmin } from "@/lib/admin";
import { clerkEnabled } from "@/lib/clerk";
import { openCrisisEvents, openReports, pendingVideos } from "@/lib/group";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!clerkEnabled || !(await isAdmin())) redirect("/");
  const [reports, crises, videos] = await Promise.all([openReports(), openCrisisEvents(), pendingVideos()]);
  return (
    <AdminPanel
      reports={reports.map((r) => ({ ...r, created_at: r.created_at.toISOString() }))}
      crises={crises.map((c) => ({ ...c, created_at: c.created_at.toISOString() }))}
      videos={videos.map((v) => ({ ...v, created_at: v.created_at.toISOString() }))}
    />
  );
}
