import { NextResponse } from "next/server";

// Mocked relevance options to mimic backend relevance_select
const MOCK_RELEVANCE_OPTIONS = ["Not relevant", "Relevant", "Maybe", "All"];

export async function GET() {
  return NextResponse.json({ rel_type: MOCK_RELEVANCE_OPTIONS });
}
