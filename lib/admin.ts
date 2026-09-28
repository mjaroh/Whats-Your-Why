import "server-only";
import { currentUser } from "@clerk/nextjs/server";

// Admins are listed by email in ADMIN_EMAILS (comma separated), e.g. Michael's
// Clerk sign-in email. They can remove group messages, ban accounts and
// review crisis alerts at /admin.
export async function isAdmin(): Promise<boolean> {
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return false;
  const user = await currentUser();
  return Boolean(
    user?.emailAddresses?.some(
      (e) => allowed.includes(e.emailAddress.toLowerCase()) && e.verification?.status === "verified",
    ),
  );
}
