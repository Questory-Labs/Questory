import { NextResponse } from "next/server";

/** qMonitor baseUrl probe when pointed at the web origin. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "fe" });
}
