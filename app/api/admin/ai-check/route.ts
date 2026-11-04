import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { anthropic, MODEL, QUICK } from "@/lib/claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = { ok: true; ms: number } | { ok: false; ms: number; status?: number; type?: string; message: string };

async function check(run: () => Promise<unknown>): Promise<Check> {
  const t = Date.now();
  try {
    await run();
    return { ok: true, ms: Date.now() - t };
  } catch (err) {
    const ms = Date.now() - t;
    if (err instanceof Anthropic.APIError) {
      const body = err.error as { error?: { type?: string; message?: string } } | undefined;
      return {
        ok: false,
        ms,
        status: err.status,
        type: body?.error?.type,
        message: body?.error?.message ?? err.message,
      };
    }
    return { ok: false, ms, message: err instanceof Error ? err.message : String(err) };
  }
}

// Admin only: one tiny request of each kind the app makes, so a broken AI
// connection shows its real error on screen. The key itself is never shown,
// only its last 4 characters, to match against the Claude Console.
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false }, { status: 403 });
  const key = process.env.ANTHROPIC_API_KEY ?? "";
  const client = anthropic();
  const [text, structured] = await Promise.all([
    check(() =>
      client.messages.create({
        model: MODEL,
        ...QUICK,
        messages: [{ role: "user", content: "Reply with the word ok." }],
      }),
    ),
    check(() =>
      client.messages.parse({
        model: MODEL,
        ...QUICK,
        messages: [{ role: "user", content: "Is the sky blue on a clear day?" }],
        output_config: { effort: "low", format: zodOutputFormat(z.object({ yes: z.boolean() })) },
      }),
    ),
  ]);
  return NextResponse.json(
    {
      model: MODEL,
      key: key ? { set: true, ending: key.slice(-4), length: key.length } : { set: false },
      checks: { text, structured },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
