import NavBar from "../components/layout/navbar";

const recentChanges = [
  { doc: "Placeholder document A", revDate: "2024-12-04", relevant: 8, maybe: 3, notRelevant: 1 },
  { doc: "Placeholder document B", revDate: "2024-11-29", relevant: 4, maybe: 2, notRelevant: 5 },
  { doc: "Placeholder document C", revDate: "2024-11-22", relevant: 6, maybe: 1, notRelevant: 0 },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavBar />
      <main className="px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="bg-card text-card-foreground rounded-2xl border border-border shadow-[var(--shadow-soft)] p-8 text-center space-y-3">
            <h1 className="text-4xl font-bold leading-tight">SLComply.ai</h1>
            <p className="text-lg text-muted-foreground">
              A Sellafield Ltd and PA Consulting solution to accelerate from weeks to minutes the analysis of legislative and regulatory documents.
            </p>
            <p className="text-sm text-muted-foreground">
              This pilot currently focuses on documents within Remediation only. For more information please contact Edwin Matthews.
            </p>
          </header>

          <section className="bg-card border border-border rounded-2xl shadow-[var(--shadow-soft)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Most recent changes in legislation and regulation</h2>
                <p className="text-sm text-muted-foreground">Mirrors the legacy table with a cleaner, modern look.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Live data TBD</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Document</th>
                    <th className="px-4 py-3 text-left">Revision Date</th>
                    <th className="px-4 py-3 text-center">Relevant</th>
                    <th className="px-4 py-3 text-center">Maybe Relevant</th>
                    <th className="px-4 py-3 text-center">Not Relevant</th>
                  </tr>
                </thead>
                <tbody>
                  {recentChanges.map((row) => (
                    <tr key={row.doc} className="border-t border-border/70">
                      <td className="px-4 py-3 text-foreground">{row.doc}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.revDate}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-[2.5rem] justify-center rounded-full bg-accent/12 text-accent px-3 py-1 text-xs font-semibold">
                          {row.relevant}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-[2.5rem] justify-center rounded-full bg-accent-2/15 text-accent-2-foreground px-3 py-1 text-xs font-semibold">
                          {row.maybe}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-[2.5rem] justify-center rounded-full bg-muted text-foreground px-3 py-1 text-xs font-semibold">
                          {row.notRelevant}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
