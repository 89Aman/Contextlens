"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BranchSummary, Episode } from "@/lib/types";
import { getBranchSummary, getProjectEpisodes } from "@/lib/api";
import EpisodeCard from "@/components/EpisodeCard";

export default function BranchPage() {
  const { projectId, branchName } = useParams<{ projectId: string; branchName: string }>();
  const decodedBranch = decodeURIComponent(branchName);

  const [summary, setSummary] = useState<BranchSummary | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const eps = await getProjectEpisodes(projectId);
        setEpisodes(eps.filter((e) => e.branchName === decodedBranch));
        const sum = await getBranchSummary(projectId, decodedBranch);
        setSummary(sum);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, decodedBranch]);

  async function generateSummary() {
    setSummaryLoading(true);
    try {
      const sum = await getBranchSummary(projectId, decodedBranch);
      setSummary(sum);
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function copyAsMarkdown() {
    if (!summary) return;
    const md = [
      `## Branch: ${decodedBranch}`,
      "",
      "### Summary",
      summary.prSummary,
      "",
      "### Key Changes",
      ...summary.keyChanges.map((c) => `- ${c}`),
      "",
      "### Review Risks",
      ...summary.reviewRisks.map((r) => `- ⚠ ${r}`),
    ].join("\n");

    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 20, width: 200, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 32, width: 400, marginBottom: 24 }} />
        {[1, 2].map((i) => (
          <div key={i} className="skeleton" style={{ height: 120, marginBottom: 12, borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>
          <Link href={`/project/${projectId}`}>Project</Link>
          <span>›</span>
          <span>Branches</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="18" height="18" fill="none" stroke="var(--primary-light)" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 106 0m-6 0a3 3 0 000 6m0-6h12m0 0V9m0 6a3 3 0 100-6" />
          </svg>
          <h1 style={{ fontSize: 20 }}>{decodedBranch}</h1>
          <span className="badge badge-indigo">branch</span>
          {summary && (
            <button
              className="btn btn-ghost"
              style={{ marginLeft: "auto", fontSize: 12, padding: "5px 12px" }}
              onClick={copyAsMarkdown}
            >
              {copied ? (
                <>✓ Copied!</>
              ) : (
                <>
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path strokeLinecap="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy as Markdown
                </>
              )}
            </button>
          )}
        </div>
        <p className="text-dim" style={{ marginTop: 6, fontSize: 13 }}>
          {episodes.length} episode{episodes.length !== 1 ? "s" : ""} on this branch
        </p>
      </div>

      {/* Branch Summary */}
      <div style={{ marginBottom: 24 }}>
        <div className="flex items-center gap-2 mb-2">
          <p className="section-title" style={{ margin: 0 }}>Branch Summary</p>
          {!summary && (
            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: "4px 10px" }}
              onClick={generateSummary}
              disabled={summaryLoading}
            >
              {summaryLoading ? "Generating…" : "✨ Generate"}
            </button>
          )}
        </div>

        {summary ? (
          <div className="space-y-3">
            {/* PR Summary */}
            <div className="card" style={{ borderColor: "rgba(99,102,241,0.3)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: 16 }}>📋</span>
                <h3 style={{ margin: 0, fontSize: 13 }}>PR Summary</h3>
              </div>
              <p style={{ fontSize: 13, lineHeight: "20px", color: "var(--text-muted)" }}>{summary.prSummary}</p>
            </div>

            {/* Key Changes */}
            {summary.keyChanges.length > 0 && (
              <div className="card">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: 16 }}>🔧</span>
                  <h3 style={{ margin: 0, fontSize: 13 }}>Key Changes</h3>
                </div>
                <div className="space-y-3">
                  {summary.keyChanges.map((change, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span style={{ color: "var(--primary-light)", marginTop: 2, flexShrink: 0 }}>›</span>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{change}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review Risks */}
            {summary.reviewRisks.length > 0 && (
              <div className="card" style={{ borderColor: "rgba(249,115,22,0.3)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <h3 style={{ margin: 0, fontSize: 13 }}>Review Risks</h3>
                </div>
                <div className="space-y-3">
                  {summary.reviewRisks.map((risk, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="badge badge-orange" style={{ flexShrink: 0 }}>!</span>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", padding: "32px" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>🧠</div>
            <h3 style={{ color: "var(--text-muted)", marginBottom: 8 }}>No summary yet</h3>
            <p className="text-dim" style={{ fontSize: 13, marginBottom: 16 }}>
              Generate an AI-powered PR summary for this branch.
            </p>
            <button className="btn btn-primary" onClick={generateSummary} disabled={summaryLoading}>
              {summaryLoading ? "Generating…" : "✨ Generate Summary"}
            </button>
          </div>
        )}
      </div>

      {/* Episodes */}
      <p className="section-title">Episodes on this branch ({episodes.length})</p>
      {episodes.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "32px" }}>
          <p className="text-dim">No episodes found on this branch.</p>
        </div>
      ) : (
        <div className="timeline">
          {episodes.map((ep) => (
            <EpisodeCard key={ep.id} episode={ep} showTimeline={true} />
          ))}
        </div>
      )}
    </div>
  );
}