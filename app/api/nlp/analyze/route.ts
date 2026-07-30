import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeMessage } from "@/lib/ai/client";

const BodySchema = z.object({
  text: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const analysis = await analyzeMessage(parsed.data.text);
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("NLP analysis failed", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 502 });
  }
}
