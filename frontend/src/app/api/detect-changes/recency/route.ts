import { NextResponse } from "next/server";

const RECENCY_PERIODS = ["1 month", "3 months", "6 months", "1 year", "2 years", "Historical"];

export async function GET() {
  // In a real setup, proxy to backend `/recency_select`. For now, return the known constants.
  return NextResponse.json({ recency_periods: RECENCY_PERIODS });
}
