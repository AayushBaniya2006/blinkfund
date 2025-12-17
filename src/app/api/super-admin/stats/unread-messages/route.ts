import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Not configured" }, { status: 503 });
}
