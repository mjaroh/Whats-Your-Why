import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { todaysQuestion } from "@/lib/questionOfDay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The question of the day for the opening screen. Public: it's the same
// question for everyone, and it's written at most once a day.
export async function GET() {
  let question: string | null = null;
  if (hasDatabase() && process.env.ANTHROPIC_API_KEY) {
    question = await todaysQuestion().catch((err) => {
      console.error("question of the day failed", err);
      return null;
    });
  }
  return NextResponse.json(
    { question },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
