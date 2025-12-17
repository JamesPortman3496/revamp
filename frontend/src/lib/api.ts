import {
  DocChangeResponse,
  DocSelectResponse,
  LinkRelSelectResponse,
  PlotResponse,
  RecSelectResponse,
  RecencySelectResponse,
  RelevanceSelectResponse,
  SaveChangesRequest,
  SaveChangesResponse,
  SectionSelectResponse,
} from "../types/api";

const BASE_URL = process.env.BACKEND_BASE_URL || "http://localhost:5000";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: init?.headers,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getDocOptions: (doc_typ: string) =>
    http<DocSelectResponse>(`/doc_select?doc_typ=${encodeURIComponent(doc_typ)}`),

  getRecencyOptions: () => http<RecencySelectResponse>("/recency_select"),

  getSectionOptions: (params: { doc_typ: string; docs: string; recency: string }) =>
    http<SectionSelectResponse>(
      `/sec_select?doc_typ=${encodeURIComponent(params.doc_typ)}&docs=${encodeURIComponent(
        params.docs,
      )}&recency=${encodeURIComponent(params.recency)}`,
    ),

  getRelevanceOptions: () => http<RelevanceSelectResponse>("/relevance_select"),

  getDocChanges: (params: {
    doc_typ: string;
    docs: string;
    recency: string;
    sec: string;
    rel_type: string;
  }) =>
    http<DocChangeResponse>(
      `/doc_change?doc_typ=${encodeURIComponent(params.doc_typ)}&docs=${encodeURIComponent(
        params.docs,
      )}&recency=${encodeURIComponent(params.recency)}&sec=${encodeURIComponent(
        params.sec,
      )}&rel_type=${encodeURIComponent(params.rel_type)}`,
  ),

  saveChanges: (payload: SaveChangesRequest) => {
    const body = new URLSearchParams();
    body.set("results", JSON.stringify(payload.results));
    return http<SaveChangesResponse>("/save_changes", {
      method: "POST",
      body,
    });
  },

  plotTreemap: (params: { document_type: string; docs: string; maybe_link: string; recency_date: string }) =>
    http<PlotResponse>(
      `/plot_treemap?document_type=${encodeURIComponent(params.document_type)}&docs=${encodeURIComponent(
        params.docs,
      )}&maybe_link=${encodeURIComponent(params.maybe_link)}&recency_date=${encodeURIComponent(
        params.recency_date,
      )}`,
    ),

  linkRelOptions: () => http<LinkRelSelectResponse>("/link_rel_select"),

  recencyOptionsForLink: () => http<RecSelectResponse>("/rec_select"),

  plotSankey: (params: { document_type: string; maybe_link: string; recency_date: string }) =>
    http<PlotResponse>(
      `/plot_sankey?document_type=${encodeURIComponent(params.document_type)}&maybe_link=${encodeURIComponent(
        params.maybe_link,
      )}&recency_date=${encodeURIComponent(params.recency_date)}`,
    ),
};
