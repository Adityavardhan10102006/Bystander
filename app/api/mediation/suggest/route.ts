import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateNudge } from "@/lib/ai/client";

const BodySchema = z.object({
  context: z.string().min(1),
  prediction: z.object({
    tensionScore: z.number(),
    trend: z.number(),
    confidence: z.number(),
    signalsFired: z.array(z.string()),
  }),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const nudge = await generateNudge(parsed.data.context, parsed.data.prediction);
    return NextResponse.json(nudge);
  } catch (err) {
    console.error("Nudge generation failed", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 502 });
  }
}
