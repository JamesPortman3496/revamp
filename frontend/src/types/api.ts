export type DocSelectResponse = {
  docs: string[];
};

export type RecencySelectResponse = {
  recency_periods: string[];
};

export type SectionSelectResponse = {
  secs: string[];
};

export type RelevanceSelectResponse = {
  rel_type: string[];
};

export type StatusOption = string;

export type DetailRow =
  | [
      // when non-gov, revisionNumber is included at the start
      string,
      string,
      number | string,
      string,
      string,
      string[],
      string[],
      number | string,
      string,
    ]
  | [
      string,
      number | string,
      string,
      string,
      string[],
      string[],
      number | string,
      string,
    ];

export type DocChangeResponse = {
  doc_type: string;
  num_sec_changes: number;
  num_tot_changes: number;
  num_rel_sec_changes: number;
  info: string;
  current_rev: string;
  previous_rev: string;
  current_rev_pdf: string;
  previous_rev_pdf: string;
  table_heading: string;
  status: StatusOption[];
  detail_df: DetailRow[];
};

export type SaveChangesRequest = {
  results: { id: string | number; value: string }[];
};

export type SaveChangesResponse = {
  success: boolean;
  txt_msg: string;
};

export type LinkRelSelectResponse = {
  link_rel_types: string[];
};

export type RecSelectResponse = {
  recency_types: string[];
};

export type PlotResponse = unknown; // plotly JSON; structure handled downstream
