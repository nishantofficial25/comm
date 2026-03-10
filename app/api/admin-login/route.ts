import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  (await cookies()).set("admin-session", "true", {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "strict",
  });

  return NextResponse.json({ success: true });
}
