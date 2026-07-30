import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { predictConflict } from "@/lib/ai/client";
import { publishDashboardUpdate } from "@/lib/realtime/redis";

const BodySchema = z.object({
  threadId: z.string(),
  signalsSummary: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const prediction = await predictConflict(parsed.data.signalsSummary);

    // Push to live dashboard subscribers.
    await publishDashboardUpdate({
      type: "tension_update",
      threadId: parsed.data.threadId,
      prediction,
    });

    return NextResponse.json(prediction);
  } catch (err) {
    console.error("Conflict prediction failed", err);
    return NextResponse.json({ error: "Prediction failed" }, { status: 502 });
  }
}
