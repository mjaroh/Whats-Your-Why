"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

// The ••• menu, on the profile only: retake, membership, admin, sign out.
export function ProfileMenu(props: { member: boolean; admin: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!data?.ok) {
      setDeleting(false);
      setDeleteError(data?.error ?? "Couldn't delete your account. Try again.");
      return;
    }
    await signOut({ redirectUrl: "/" }).catch(() => (window.location.href = "/"));
  }
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
          <a href="/privacy" className={item}>
            Privacy Policy
          </a>
          <a href="/terms" className={item}>
            Terms of Use
          </a>
          <button type="button" onClick={() => signOut({ redirectUrl: "/" })} className={item}>
            Sign out
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setConfirmDelete(true);
            }}
            className={`${item} text-alert`}
          >
            Delete account
          </button>
        </div>
      )}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-ink/80"
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div
            role="dialog"
            aria-label="Delete account"
            onClick={(e) => e.stopPropagation()}
            className="rise mx-auto w-full max-w-md border-t border-line bg-ink px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-left"
          >
            <h2 className="font-display text-2xl font-bold tracking-tight">Delete your account?</h2>
            <p className="mt-3 text-sm leading-relaxed text-paper/70">
              This permanently deletes your why, your coach chat, your group posts, your habits and sleep log, your
              videos and your photo. If you have a membership it&rsquo;s cancelled so you won&rsquo;t be charged again.
              This can&rsquo;t be undone.
            </p>
            {deleteError && <p className="mt-3 text-sm text-mute">{deleteError}</p>}
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting}
              className="mt-6 w-full bg-status-red py-4 text-sm tracking-[0.2em] text-night uppercase disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete my account"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="mt-3 w-full py-3 text-xs tracking-[0.2em] text-paper/60 uppercase"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
