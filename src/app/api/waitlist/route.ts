import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Waitlist not available" },
    { status: 503 }
  );
}
