"use client";

import { useEffect, useState } from "react";
import DetectChangesContent, { DetectChangesData } from "./DetectChangesContent";
import { DOC_TYPES, RECENCY_PERIODS, REL_TYPES } from "@/constants/backend";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function DetectChangesPage() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [docs, setDocs] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [recencyOptions, setRecencyOptions] = useState<string[]>([]);
  const [selectedRecency, setSelectedRecency] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [relevanceOptions, setRelevanceOptions] = useState<string[]>([]);
  const [selectedRelevance, setSelectedRelevance] = useState("");
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [docChangeData, setDocChangeData] = useState<DetectChangesData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDocumentEnabled = Boolean(selectedDocType);
  const isRecencyEnabled = Boolean(selectedDoc);
  const isSectionEnabled = Boolean(selectedRecency);
  const isRelevanceEnabled = Boolean(selectedSection);

  // Load static doc types from shared constants on mount.
  useEffect(() => {
    setDocTypes([...DOC_TYPES]);
  }, []);

  const handleDocTypeChange = async (value: string) => {
    setSelectedDocType(value);
    setDocs([]);
    setSelectedDoc("");
    setRecencyOptions([]);
    setSelectedRecency("");
    setSections([]);
    setSelectedSection("");
    setRelevanceOptions([]);
    setSelectedRelevance("");
    setDocChangeData(null);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/detect-changes/doc-select?doc_typ=${encodeURIComponent(value)}`);
      const data = await res.json();
      setDocs(data.docs || []);
    } catch (err) {
      console.error(err);
      setErrorMessage("Unable to load documents for the selected type.");
    }
  };

  const handleDocChange = (value: string) => {
    setSelectedDoc(value);
    setRecencyOptions([]);
    setSelectedRecency("");
    setSections([]);
    setSelectedSection("");
    setRelevanceOptions([]);
    setSelectedRelevance("");
    setDocChangeData(null);
    if (!value) return;
    setRecencyOptions([...RECENCY_PERIODS]);
  };

  const handleRecencyChange = async (value: string) => {
    setSelectedRecency(value);
    setSections([]);
    setSelectedSection("");
    setRelevanceOptions([]);
    setSelectedRelevance("");
    setDocChangeData(null);
    setErrorMessage(null);
    if (!value || !selectedDocType || !selectedDoc) return;
    try {
      const res = await fetch(
        `/api/detect-changes/sections?doc_typ=${encodeURIComponent(selectedDocType)}&docs=${encodeURIComponent(selectedDoc)}&recency=${encodeURIComponent(value)}`,
      );
      const data = await res.json();
      setSections(data.sections || []);
    } catch (err) {
      console.error(err);
      setErrorMessage("Unable to load sections for the chosen recency.");
    }
  };

  const handleSectionChange = (value: string) => {
    setSelectedSection(value);
    setRelevanceOptions([]);
    setSelectedRelevance("");
    setDocChangeData(null);
    if (!value) return;
    setRelevanceOptions([...REL_TYPES]);
  };

  const handleRelevanceChange = async (value: string) => {
    setSelectedRelevance(value);
    setDocChangeData(null);
    setErrorMessage(null);
    if (!value) return;
    setIsLoadingContent(true);
    const startedAt = Date.now();
    try {
      const res = await fetch(
        `/api/detect-changes/doc-change?doc_typ=${encodeURIComponent(selectedDocType)}&docs=${encodeURIComponent(selectedDoc)}&recency=${encodeURIComponent(selectedRecency)}&sec=${encodeURIComponent(selectedSection)}&rel_type=${encodeURIComponent(value)}`,
      );
      if (!res.ok) {
        throw new Error("Failed to fetch document changes.");
      }
      const data = await res.json();
      const rows =
        (data.rows || []).map((row: any) => ({
          revision: row.revision ?? row.rev ?? "Revision",
          sectionTitle: row.sectionTitle ?? row.section ?? "Section",
          pageNumber: row.pageNumber ?? "—",
          changesExtracted: row.changesExtracted ?? row.sentence ?? "Change detail",
          relevance: row.relevance ?? "Relevant",
          strongLinks: row.strongLinks ?? "—",
          softLinks: row.softLinks ?? "—",
          status: row.status ?? "Not started",
        })) ?? [];

      setDocChangeData({
        metrics: {
          docChanges: data.metrics?.docChanges ?? "—",
          sectionChanges: data.metrics?.sectionChanges ?? "—",
          relevantSectionChanges: data.metrics?.relevantSectionChanges ?? "—",
        },
        rows,
        revisions: {
          current: data.revisions?.current ?? "Current revision placeholder",
          previous: data.revisions?.previous ?? "Previous revision placeholder",
        },
      });
    } catch (err) {
      console.error(err);
      setErrorMessage("Unable to load change data for the selected filters.");
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 1000 - elapsed);
      if (remaining) {
        await sleep(remaining);
      }
      setIsLoadingContent(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="px-8 py-10">
        <div className="max-w-screen-xl w-full mx-auto space-y-8">
          <header className="bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-soft)] flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Detect changes</p>
                <h1 className="text-3xl font-semibold">Identify revisions across document updates</h1>
                <p className="text-muted-foreground mt-2">
                  Select a document, recency window, sections, and relevance to surface granular change sentences.
                </p>
              </div>
            </div>

            <div className="border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-surface">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Instructions</p>
                  <p className="text-base font-semibold">How to use Detect Changes</p>
                </div>
                <button
                  onClick={() => setShowInstructions((prev) => !prev)}
                  aria-expanded={showInstructions}
                  className="px-3 py-2 rounded-lg bg-muted text-foreground text-sm font-semibold hover:bg-muted/70 transition"
                >
                  {showInstructions ? "Hide" : "Show"}
                </button>
              </div>
              {showInstructions && (
                <div className="px-4 py-4 bg-muted/30 border-t border-border text-sm text-foreground">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-6 w-6 rounded-full bg-accent-3 text-accent-3-foreground flex items-center justify-center text-xs font-semibold">
                          1
                        </span>
                        <div>
                          <p className="font-semibold">Purpose</p>
                          <p className="text-muted-foreground">Identify changes between document revisions.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-6 w-6 rounded-full bg-accent-3 text-accent-3-foreground flex items-center justify-center text-xs font-semibold">
                          2
                        </span>
                        <div>
                          <p className="font-semibold">Select inputs</p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Document Type (Gov.UK or not)</li>
                            <li>Document</li>
                            <li>Recency</li>
                            <li>Section(s)</li>
                            <li>Relevance (all, relevant, maybe, not relevant)</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-6 w-6 rounded-full bg-accent-3 text-accent-3-foreground flex items-center justify-center text-xs font-semibold">
                          3
                        </span>
                        <div>
                          <p className="font-semibold">Review outputs</p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Key metrics for the document and chosen sections</li>
                            <li>Detailed table of new/modified sentences</li>
                            <li>Current and previous revisions for side-by-side review</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-6 w-6 rounded-full bg-accent-3 text-accent-3-foreground flex items-center justify-center text-xs font-semibold">
                          4
                        </span>
                        <div>
                          <p className="font-semibold">Tag status</p>
                          <ul className="list-disc list-inside text-muted-foreground space-y-1">
                            <li>Not started: Change not yet reviewed</li>
                            <li>Reviewed: Seen but not addressed</li>
                            <li>Addressed: Reviewed and actioned</li>
                          </ul>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-surface p-4">
                        <p className="text-sm font-semibold">Tip</p>
                        <p className="text-muted-foreground mt-1">
                          Use the filters first, then scan metrics and the table. Status updates will be saved for the selected rows.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </header>
          {errorMessage && (
            <div className="rounded-2xl border border-accent-3/40 bg-accent-3/10 text-accent-3-foreground px-4 py-3 text-sm">
              {errorMessage}
            </div>
          )}

          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {[
              { label: "Document type", enabled: true },
              { label: "Document", enabled: isDocumentEnabled },
              { label: "Recency", enabled: isRecencyEnabled },
              { label: "Section(s)", enabled: isSectionEnabled },
              { label: "Relevance", enabled: isRelevanceEnabled },
            ].map((item) => (
              <div
                key={item.label}
                className={`bg-surface border border-border rounded-xl p-3 transition ${item.enabled ? "" : "opacity-50"}`}
                aria-disabled={!item.enabled}
              >
                <label className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</label>
                {item.label === "Document type" ? (
                  <select
                    className="mt-2 w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed"
                    onChange={(e) => handleDocTypeChange(e.target.value)}
                    value={selectedDocType}
                  >
                    <option value="" disabled>
                      Select type
                    </option>
                    {docTypes.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : item.label === "Document" ? (
                  <select
                    className="mt-2 w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed"
                    disabled={!isDocumentEnabled}
                    onChange={(e) => handleDocChange(e.target.value)}
                    value={selectedDoc}
                  >
                    {!isDocumentEnabled ? (
                      <option value="">Select document type first</option>
                    ) : (
                      <>
                        <option value="">Select document</option>
                        {docs.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                ) : item.label === "Recency" ? (
                  <select
                    className="mt-2 w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed"
                    disabled={!isRecencyEnabled}
                    onChange={(e) => handleRecencyChange(e.target.value)}
                    value={selectedRecency}
                  >
                    {!isRecencyEnabled ? (
                      <option value="">Select document first</option>
                    ) : (
                      <>
                        <option value="">Select recency</option>
                        {recencyOptions.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                ) : item.label === "Section(s)" ? (
                  <select
                    className="mt-2 w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed"
                    disabled={!isSectionEnabled}
                    onChange={(e) => handleSectionChange(e.target.value)}
                    value={selectedSection}
                  >
                    {!isSectionEnabled ? (
                      <option value="">Select recency first</option>
                    ) : (
                      <>
                        <option value="">Select sections</option>
                        {sections.map((section) => (
                          <option key={section} value={section}>
                            {section}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                ) : (
                  <select
                    className="mt-2 w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed"
                    disabled={!isRelevanceEnabled}
                    onChange={(e) => handleRelevanceChange(e.target.value)}
                    value={selectedRelevance}
                  >
                    {!isRelevanceEnabled ? (
                      <option value="">Select section first</option>
                    ) : (
                      <>
                        <option value="">Select relevance</option>
                        {relevanceOptions.map((rel) => (
                          <option key={rel} value={rel}>
                            {rel}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                )}
              </div>
            ))}
          </section>

          {isLoadingContent && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-[var(--shadow-soft)] text-sm text-muted-foreground">
              Loading changes…
            </div>
          )}
          {!isLoadingContent && docChangeData && <DetectChangesContent data={docChangeData} />}
        </div>
      </main>
    </div>
  );
}
