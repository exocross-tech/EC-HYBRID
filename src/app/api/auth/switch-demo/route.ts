import { NextResponse } from "next/server";

/**
 * DECOMMISSIONED: Demo account switching is permanently disabled in production.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Demo account switching is permanently disabled." },
    { status: 404 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "Demo account switching is permanently disabled." },
    { status: 404 }
  );
}
