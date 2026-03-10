import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      type = "image",
      outputType = "image",
      conditionName = "unknown",
      success = true,
    } = body;

    const today = new Date().toISOString().split("T")[0];

    // Global counter
    await redis.incr("resize:total");

    // Daily counter
    await redis.incr(`resize:daily:${today}`);

    // Type counter
    await redis.incr(`resize:type:${type}`);

    // Output type counter
    await redis.incr(`resize:output:${outputType}`);

    // Condition based counter
    if (conditionName) {
      await redis.incr(`resize:condition:${conditionName}`);
    }

    // Success / failure
    await redis.incr(`resize:success:${success}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
