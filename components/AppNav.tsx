"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

// Top bar for signed-in athletes: the group (free) and their coach (members).
export function AppNav(props: { active: "group" | "coach" | "profile"; member: boolean; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const { signOut } = useClerk();

  async function manage() {
    const res = await fetch("/api/billing/portal", { method: "POST" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { url?: string } | null;
    if (data?.url) window.location.href = data.url;
  }

  const tab = (name: "group" | "coach" | "profile", label: string, href: string) => (
    <a
      href={href}
      aria-current={props.active === name ? "page" : undefined}
      className={`pb-1 text-xs tracking-[0.2em] uppercase transition-colors ${
        props.active === name ? "border-b border-paper text-paper" : "text-paper/45 hover:text-paper/80"
      }`}
    >
      {label}
    </a>
  );
  const item = "block w-full px-5 py-3 text-left text-sm text-paper/80 hover:bg-paper/5";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-ink/90 pt-5 pb-4 backdrop-blur-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/askesis-mark.png" alt="Askesis" width={21} height={32} className="h-8 w-auto opacity-90" />
      <nav className="flex gap-5 sm:gap-7">
        {tab("group", "Group", "/community")}
        {tab("coach", "Coach", "/coach")}
        {tab("profile", "Profile", "/profile")}
      </nav>
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
          <div className="absolute right-0 mt-2 w-56 border border-line bg-ink py-2">
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
    </header>
  );
}
