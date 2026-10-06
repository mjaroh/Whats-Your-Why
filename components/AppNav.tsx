"use client";

import { LogoButton } from "./AboutAskesis";
import { Avatar } from "./MediaBits";

/** Who's signed in, for the photo that opens their profile. */
export type NavMe = { username: string; hasAvatar: boolean; version?: number };

// Top bar for signed-in athletes: the logo, the group and coach tabs, and
// their own photo, which opens their profile.
export function AppNav(props: { active: "group" | "coach" | "profile"; me: NavMe }) {
  const tab = (name: "group" | "coach", label: string, href: string) => (
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
  const onProfile = props.active === "profile";

  return (
    <header className="top-bar relative z-10 border-b border-line">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 pb-4">
        <LogoButton className="text-paper" />
        <nav className="flex gap-6 sm:gap-8">
          {tab("group", "Group", "/community")}
          {tab("coach", "Coach", "/coach")}
        </nav>
        <a
          href="/profile"
          aria-label="Your profile"
          aria-current={onProfile ? "page" : undefined}
          className={`rounded-full p-0.5 ring-1 transition-colors ${
            onProfile ? "ring-paper" : "ring-transparent hover:ring-paper/40"
          }`}
        >
          <Avatar username={props.me.username} hasAvatar={props.me.hasAvatar} size={32} version={props.me.version} />
        </a>
      </div>
    </header>
  );
}
