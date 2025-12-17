import { NextResponse } from "next/server";

const FALLBACK_DOC_TYPES = ["Legislation", "Guidance"];

export async function GET() {
  // No backend endpoint for doc types; return fallback for now.
  return NextResponse.json({ doc_types: FALLBACK_DOC_TYPES });
}
