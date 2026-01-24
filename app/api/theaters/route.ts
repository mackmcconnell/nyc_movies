import { NextResponse } from "next/server";
import { getTheaters } from "@/lib/queries";

export async function GET() {
  const theaters = getTheaters();
  return NextResponse.json({ theaters });
}
