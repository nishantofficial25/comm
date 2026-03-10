// app/api/track-resize/route.ts
import { NextResponse } from "next/server";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token)
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in .env.local",
    );
  const { Redis } = require("@upstash/redis");
  return new Redis({ url, token });
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  let type = "unknown";
  try {
    const body = await req.json();
    if (body?.type && typeof body.type === "string") type = body.type;
  } catch {
    /* ignore parse errors */
  }

  try {
    const redis = getRedis();
    // Three separate awaited calls — no pipeline ambiguity
    const total = (await redis.incr("resizes:total")) as number;
    await redis.incr(`resizes:${type}`);
    await redis.incr(`resizes:date:${todayKey()}`);
    // Return total as a plain number — not nested in any object
    return NextResponse.json({ ok: true, total: Number(total), type });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 200 },
    );
  }
}

export async function GET() {
  try {
    const redis = getRedis();
    const keys = [
      "resizes:total",
      "resizes:image",
      "resizes:pdf",
      "resizes:imagetopdf",
      "resizes:signature",
    ];
    const vals = (await redis.mget(...keys)) as (number | null)[];
    const [total, image, pdf, imagetopdf, signature] = vals.map((v) =>
      Number(v ?? 0),
    );

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return todayKey(d);
    });
    const dailyVals = (await redis.mget(
      ...days.map((d) => `resizes:date:${d}`),
    )) as (number | null)[];
    const daily = days.map((date, i) => ({
      date,
      count: Number(dailyVals[i] ?? 0),
    }));

    return NextResponse.json({
      total,
      image,
      pdf,
      imagetopdf,
      signature,
      daily,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 500 },
    );
  }
}
