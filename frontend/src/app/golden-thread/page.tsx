const dropdowns = [
  { label: "Document type", placeholder: "Select type" },
  { label: "Document", placeholder: "Select document" },
  { label: "Recency", placeholder: "Select recency" },
  { label: "Link relevance", placeholder: "Select relevance" },
];

export default function GoldenThreadPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="px-8 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-soft)] flex flex-col gap-3">
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Golden thread</p>
            <h1 className="text-3xl font-semibold">Trace dependencies across revisions</h1>
            <p className="text-muted-foreground">
              Visualise the chain of impacts and link relevancy for your selected document and recency window.
            </p>
          </header>

          <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {dropdowns.map((item) => (
              <div key={item.label} className="bg-surface border border-border rounded-xl p-3">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</label>
                <select className="mt-2 w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent">
                  <option>{item.placeholder}</option>
                  <option>Placeholder A</option>
                  <option>Placeholder B</option>
                </select>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-[var(--shadow-soft)] h-96">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-semibold">Golden Thread</h2>
                  <p className="text-sm text-muted-foreground">
                    Identifying links between legislative/regulatory changes and our Sellafield Manuals and Practices.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    An interactive visualisation to go from big picture to detail in one click.
                  </p>
                </div>
                <button className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-semibold">
                  Generate Golden Thread
                </button>
              </div>
              <div className="h-72 rounded-xl border border-border bg-muted/30"></div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
