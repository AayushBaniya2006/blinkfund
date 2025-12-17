import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not configured" }, { status: 503 });
}
