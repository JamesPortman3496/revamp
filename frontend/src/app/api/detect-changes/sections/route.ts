import { NextResponse } from "next/server";

type SectionsMap = Record<string, Record<string, string[]>>;

// Mocked sections by doc type/document and recency to mimic backend sec_select
const MOCK_SECTIONS: SectionsMap = {
  legislation: {
    "1 month": ["Introduction", "Scope", "Compliance"],
    "3 months": ["Scope", "Compliance", "Penalties"],
    default: ["Overview", "Requirements", "Definitions"],
  },
  guidance: {
    "1 month": ["Summary", "Process", "References"],
    "6 months": ["Process", "Examples", "Notes"],
    default: ["Summary", "Details", "Appendix"],
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const docTyp = (searchParams.get("doc_typ") || "").toLowerCase();
  const recency = searchParams.get("recency") || "";

  const byDocType = MOCK_SECTIONS[docTyp] || MOCK_SECTIONS.guidance;
  const sections = byDocType[recency] || byDocType.default || [];

  return NextResponse.json({ sections });
}
