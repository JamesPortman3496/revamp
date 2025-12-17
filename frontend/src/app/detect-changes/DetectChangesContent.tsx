export type ChangeRow = {
  revision: string;
  sectionTitle: string;
  pageNumber: string | number;
  changesExtracted: string;
  relevance: string;
  strongLinks?: string | string[];
  softLinks?: string | string[];
  status?: string;
};

export type DetectChangesData = {
  metrics: {
    docChanges: number | string;
    sectionChanges: number | string;
    relevantSectionChanges: number | string;
  };
  rows: ChangeRow[];
  revisions: {
    current: string;
    previous: string;
  };
};

type Props = {
  data: DetectChangesData;
};

export default function DetectChangesContent({ data }: Props) {
  if (!data) return null;

  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Changes in document", value: data.metrics.docChanges },
          { title: "Changes in section", value: data.metrics.sectionChanges },
          { title: "Relevant changes in section", value: data.metrics.relevantSectionChanges },
        ].map((metric) => (
          <div key={metric.title} className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm text-muted-foreground">{metric.title}</p>
            <p className="text-3xl font-semibold mt-2">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Changes table</h2>
            <p className="text-sm text-muted-foreground">Sentences flagged as new or modified in the current revision.</p>
          </div>
          <button className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold">
            Submit changes
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-border overflow-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Revision</th>
                <th className="px-3 py-2 text-left">Section title</th>
                <th className="px-3 py-2 text-left">Page number</th>
                <th className="px-3 py-2 text-left w-[32rem]">Changes extracted</th>
                <th className="px-3 py-2 text-left">Relevance</th>
                <th className="px-3 py-2 text-left">Strong links</th>
                <th className="px-3 py-2 text-left">Soft links</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, idx) => (
                <tr key={`${row.changesExtracted}-${idx}`} className="border-t border-border/70">
                  <td className="px-3 py-3 text-foreground">{row.revision}</td>
                  <td className="px-3 py-3 text-muted-foreground">{row.sectionTitle}</td>
                  <td className="px-3 py-3 text-muted-foreground">{row.pageNumber}</td>
                  <td className="px-3 py-3 text-foreground w-[32rem]">{row.changesExtracted}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center rounded-full bg-accent-2/20 text-accent-2-foreground px-3 py-1 text-xs font-semibold">
                      {row.relevance}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-foreground">
                    {Array.isArray(row.strongLinks) ? row.strongLinks.join(", ") : row.strongLinks || "—"}
                  </td>
                  <td className="px-3 py-3 text-foreground">
                    {Array.isArray(row.softLinks) ? row.softLinks.join(", ") : row.softLinks || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <select className="w-full rounded-lg border border-border bg-card text-foreground px-2 py-2 text-xs" defaultValue={row.status || "Not started"}>
                      {["Not started", "Reviewed", "Addressed"].map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)] h-72">
          <h3 className="text-lg font-semibold">Current revision</h3>
          <p className="text-sm text-muted-foreground">{data.revisions.current}</p>
          <div className="mt-3 h-48 rounded-xl border border-border bg-muted/30"></div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)] h-72">
          <h3 className="text-lg font-semibold">Previous revision</h3>
          <p className="text-sm text-muted-foreground">{data.revisions.previous}</p>
          <div className="mt-3 h-48 rounded-xl border border-border bg-muted/30"></div>
        </div>
      </section>
    </>
  );
}
