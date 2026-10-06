"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

// The ••• menu, on the profile only: retake, membership, admin, sign out.
export function ProfileMenu(props: { member: boolean; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const { signOut } = useClerk();

  async function manage() {
    const res = await fetch("/api/billing/portal", { method: "POST" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { url?: string } | null;
    if (data?.url) window.location.href = data.url;
  }

  const item = "block w-full px-5 py-3 text-left text-sm text-paper/80 hover:bg-paper/5";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="px-2 py-1 text-xl leading-none text-paper/70"
      >
        •••
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-56 border border-line bg-ink py-2">
          <a href="/?retake=1" className={item}>
            Retake the Seven Whys
          </a>
          {props.member && (
            <button type="button" onClick={manage} className={item}>
              Manage membership
            </button>
          )}
          {props.admin && (
            <a href="/admin" className={item}>
              Admin
            </a>
          )}
          <button type="button" onClick={() => signOut({ redirectUrl: "/" })} className={item}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
