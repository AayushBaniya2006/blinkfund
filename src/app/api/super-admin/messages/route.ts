import { NextResponse } from "next/server";

const notConfigured = () => NextResponse.json({ error: "Not configured" }, { status: 503 });

export const GET = notConfigured;
export const PATCH = notConfigured;
export const DELETE = notConfigured;
