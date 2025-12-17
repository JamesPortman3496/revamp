import { NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;

const mockResponse = {
  metrics: {
    docChanges: 12,
    sectionChanges: 4,
    relevantSectionChanges: 2,
  },
  rows: [
    {
      revision: "Rev 10 -> Rev 11",
      sectionTitle: "Compliance",
      pageNumber: 12,
      changesExtracted: "Updated compliance threshold from 10% to 12%.",
      relevance: "Relevant",
      strongLinks: "Threshold definition",
      softLinks: "Guidance summary",
      status: "Reviewed",
    },
    {
      revision: "Rev 10 -> Rev 11",
      sectionTitle: "Appendix A",
      pageNumber: 33,
      changesExtracted: "Added appendix detailing risk assessment.",
      relevance: "Maybe",
      strongLinks: "Risk register",
      softLinks: "Review notes",
      status: "Not started",
    },
    {
      revision: "Rev 10 -> Rev 11",
      sectionTitle: "Reporting",
      pageNumber: 18,
      changesExtracted: "Clarified reporting cadence to quarterly.",
      relevance: "Relevant",
      strongLinks: "Reporting schedule",
      softLinks: "Team comms",
      status: "Addressed",
    },
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
              revision: row[0] ?? "Revision",
              sectionTitle: row[1] ?? row[2] ?? "Section",
              pageNumber: row[5] ?? "—",
              changesExtracted: row[3] ?? row[0] ?? "Change detail",
              relevance: row[4] ?? "Relevant",
              strongLinks: row[6] ?? "—",
              softLinks: row[7] ?? "—",
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
