import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { clerkEnabled } from "@/lib/clerk";

const isMemberRoute = createRouteMatcher([
  "/coach(.*)",
  "/community(.*)",
  "/profile(.*)",
  "/admin(.*)",
  "/api/group(.*)",
  "/api/media(.*)",
  "/api/avatar(.*)",
  "/api/profile(.*)",
  "/api/favorites(.*)",
  "/api/admin(.*)",
  "/welcome(.*)",
  "/api/coach(.*)",
  "/api/account(.*)",
  "/api/billing/checkout(.*)",
  "/api/billing/portal(.*)",
]);

const withClerk = clerkMiddleware(async (auth, req) => {
  if (isMemberRoute(req)) await auth.protect();
});

export default function proxy(req: NextRequest, ev: Parameters<typeof withClerk>[1]) {
  // Without Clerk keys, pass everything through so the free exercise still works.
  if (!clerkEnabled) return NextResponse.next();
  return withClerk(req, ev);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
