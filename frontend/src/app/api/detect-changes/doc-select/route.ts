import { NextResponse } from "next/server";

const FALLBACK_DOCS: Record<string, string[]> = {
  legislation: ["Legislation Doc A", "Legislation Doc B"],
  guidance: ["Guidance Doc A", "Guidance Doc B"],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const docTyp = searchParams.get("doc_typ") || "";

  // In a real environment, proxy to the backend:
  // const res = await fetch(`${process.env.BACKEND_BASE_URL}/doc_select?doc_typ=${encodeURIComponent(docTyp)}`);
  // const data = await res.json();
  // return NextResponse.json(data);

  const docs = FALLBACK_DOCS[docTyp.toLowerCase()] || [];
  return NextResponse.json({ docs });
}
