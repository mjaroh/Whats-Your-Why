"use client";

import { useEffect, useState } from "react";
import { WidgetBridge, widgetsAvailable } from "@/lib/client/widgets";

// Home Screen and Lock Screen widgets for the must dos. Only in the iPhone
// app (iOS 17 or later, when widgets can be tapped).
export function WidgetSetup() {
  const [state, setState] = useState<"web" | "old" | "off" | "on">("web");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!widgetsAvailable()) return;
    WidgetBridge.status()
      .then((s) => setState(!s.supported ? "old" : s.linked ? "on" : "off"))
      .catch(() => {});
  }, []);

  if (state === "web") return null;

  async function turnOn() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/widget/link", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { token?: string };
      if (!res.ok || !data.token) throw new Error();
      await WidgetBridge.link({ token: data.token, baseUrl: window.location.origin });
      setState("on");
    } catch {
      setNote("Couldn't turn on widgets. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setNote(null);
    try {
      await fetch("/api/widget/link", { method: "DELETE" });
      await WidgetBridge.unlink();
      setState("off");
    } catch {
      setNote("Couldn't turn off widgets. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12">
      <h2 className="border-b border-line pb-2 text-xs tracking-[0.2em] text-mute uppercase">Widgets</h2>
      {state === "old" ? (
        <p className="mt-4 text-sm leading-relaxed text-paper/70">
          Must do widgets need iOS 17 or later. Update your iPhone in Settings → General → Software Update to use them.
        </p>
      ) : state === "off" ? (
        <>
          <p className="mt-4 text-sm leading-relaxed text-paper/70">
            Check off your must dos right from your Home Screen or Lock Screen.
          </p>
          <button
            type="button"
            onClick={turnOn}
            disabled={busy}
            className="mt-5 w-full bg-paper py-4 text-xs tracking-[0.2em] text-ink uppercase disabled:opacity-50"
          >
            {busy ? "Turning on…" : "Turn on widgets"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-paper/80">Widgets are on. Now add them:</p>
          <Steps
            title="Home Screen"
            steps={[
              "Go to your Home Screen and press and hold an empty spot until the apps jiggle.",
              "Tap Edit in the top corner, then Add Widget.",
              "Search for Askesis, pick a size, and tap Add Widget.",
            ]}
          />
          <Steps
            title="Lock Screen"
            steps={[
              "Lock your iPhone, then press and hold the Lock Screen and tap Customize.",
              "Tap Lock Screen, then tap the widget area under the time.",
              "Choose Askesis and tap the must dos widget to add it, then tap Done.",
            ]}
          />
          <p className="mt-5 text-xs leading-relaxed text-mute">
            Tap a must do on the widget to check it off. Your iPhone may ask you to unlock first when you tap it on the
            Lock Screen.
          </p>
          <button
            type="button"
            onClick={turnOff}
            disabled={busy}
            className="mt-5 w-full py-3 text-xs tracking-[0.2em] text-paper/60 uppercase disabled:opacity-50"
          >
            Turn off widgets
          </button>
        </>
      )}
      {note && <p className="mt-3 text-xs text-mute">{note}</p>}
    </section>
  );
}

function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="mt-5">
      <h3 className="text-xs tracking-[0.2em] text-paper uppercase">{title}</h3>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-paper/70">
        {steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
