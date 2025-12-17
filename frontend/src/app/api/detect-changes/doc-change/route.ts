import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;

const mockResponse = {
  metrics: {
    docChanges: 12,
    sectionChanges: 4,
    relevantSectionChanges: 2,
  },
  rows: [
    { sentence: "Updated compliance threshold from 10% to 12%.", section: "Compliance", relevance: "Relevant", status: "Reviewed" },
    { sentence: "Added appendix detailing risk assessment.", section: "Appendix", relevance: "Maybe", status: "Not started" },
    { sentence: "Clarified reporting cadence to quarterly.", section: "Reporting", relevance: "Relevant", status: "Addressed" },
  ],
  revisions: {
    current: "Current revision placeholder",
    previous: "Previous revision placeholder",
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (BACKEND_BASE_URL) {
    try {
      const url = `${BACKEND_BASE_URL}/doc_change?doc_typ=${encodeURIComponent(
        searchParams.get("doc_typ") || "",
      )}&docs=${encodeURIComponent(searchParams.get("docs") || "")}&recency=${encodeURIComponent(
        searchParams.get("recency") || "",
      )}&sec=${encodeURIComponent(searchParams.get("sec") || "")}&rel_type=${encodeURIComponent(
        searchParams.get("rel_type") || "",
      )}`;

      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const transformed = {
          metrics: {
            docChanges: data.num_tot_changes ?? "—",
            sectionChanges: data.num_sec_changes ?? "—",
            relevantSectionChanges: data.num_rel_sec_changes ?? "—",
          },
          rows:
            data.detail_df?.map((row: any[]) => ({
              sentence: row[3] ?? row[0] ?? "Sentence",
              section: row[2] ?? row[1] ?? "Section",
              relevance: row[4] ?? "Relevant",
              status: row[8] ?? "Not started",
            })) || [],
          revisions: {
            current: data.current_rev ?? "Current revision placeholder",
            previous: data.previous_rev ?? "Previous revision placeholder",
          },
        };
        return NextResponse.json(transformed);
      }
    } catch (err) {
      console.error("doc_change backend call failed, using mock", err);
    }
  }

  return NextResponse.json(mockResponse);
}
