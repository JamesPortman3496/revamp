export const DOC_TYPES = ["Legislation", "Guidance"] as const;

export const REL_TYPES = ["not relevant", "relevant", "maybe relevant", "all"] as const;

export const RECENCY_PERIODS = ["1 month", "3 months", "6 months", "1 year", "2 years", "Historical"] as const;

export const RECENCY_TYPES = ["New", "Historical"] as const;

export const LINK_RELEVANCY_TYPES = ["Strong", "Soft"] as const;

export const LINK_REL_MAP = { "not relevant": 0, Soft: 0.5, Strong: 1 } as const;

export const DT_FORMAT = "%Y-%m-%d";

export const STATUS = ["Not Started", "Reviewed", "Addressed", "Not Relevant"] as const;

export const START_DT_FOR_BACKLOG_STATS = "01/01/2022";
