"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Episode, Call } from "@/lib/types";
import { getEpisode, getEpisodeCalls, explainEpisodeDiff } from "@/lib/api";

const DiffViewer = React.memo(function DiffViewer({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  const MAX_LINES = 1000;
  const isTruncated = lines.length > MAX_LINES;
  const displayLines = isTruncated ? lines.slice(0, MAX_LINES) : lines;

  return (
    <div className="diff-block">
      <div className="diff-header">
        git diff {isTruncated && <span style={{color: "var(--text-dim)", marginLeft: 8, fontWeight: 400}}>(showing first {MAX_LINES} lines)</span>}
      </div>
      {displayLines.map((line, i) => {
        const isAdd = line.startsWith("+") && !line.startsWith("+++");
        const isDel = line.startsWith("-") && !line.startsWith("---");
        return (
          <div key={i} className={`diff-line ${isAdd ? "diff-add" : isDel ? "diff-del" : ""}`}>
            <span className="diff-line-num">{i + 1}</span>
            <span className="diff-line-content">{line || " "}</span>
          </div>
        );
      })}
    </div>
  );
});

function CollapsibleSection({ title, children, defaultOpen = false }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="collapsible-header" onClick={() => setOpen(!open)}>
        <h3 style={{ margin: 0, fontSize: "13px" }}>{title}</h3>
        <svg
          className={`chevron ${open ? "open" : ""}`}
          width="16" height="16" fill="none" stroke="var(--text-dim)" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>{children}</div>}
    </div>
  );
}

function CallDetails({ call }: { call: Call }) {
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <div className="flex gap-2 mb-2" style={{ flexWrap: "wrap" }}>
          <span className="badge badge-indigo">{call.modelName}</span>
          <span className="badge badge-gray">{call.branchName}</span>
          {call.activeFilePath && <span className="badge badge-gray mono">{call.activeFilePath}</span>}
          <span className="badge badge-gray">{call.latencyMs}ms</span>
          <span className={`badge ${call.status === "completed" ? "badge-green" : "badge-red"}`}>{call.status}</span>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <p className="section-title">Prompt</p>
        <div style={{
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          padding: "12px",
          fontSize: 13,
          lineHeight: "20px",
          whiteSpace: "pre-wrap",
          color: "var(--text-primary)",
        }}>
          {call.promptText}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <p className="section-title">Response</p>
        <div style={{
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          padding: "12px",
          fontSize: 13,
          lineHeight: "20px",
          whiteSpace: "pre-wrap",
          color: "var(--text-primary)",
        }}>
          {call.modelResponse}
        </div>
      </div>

      {call.diffSnapshot && (
        <div>
          <p className="section-title">Diff</p>
          <DiffViewer diff={atob(call.diffSnapshot)} />
        </div>
      )}

      {call.tokenUsage && (
        <div className="flex gap-2" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <span className="badge badge-gray">↑ {call.tokenUsage.promptTokens} prompt tokens</span>
          <span className="badge badge-gray">↓ {call.tokenUsage.completionTokens} completion tokens</span>
          <span className="badge badge-gray">Σ {call.tokenUsage.totalTokens} total</span>
        </div>
      )}
    </>
  );
}

export default function EpisodeDetailPage() {
  const { episodeId } = useParams<{ episodeId: string }>();
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState(false);
  const [explainResult, setExplainResult] = useState<{ summary: string; risks: string[]; checks: string[] } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [ep, cs] = await Promise.all([getEpisode(episodeId), getEpisodeCalls(episodeId)]);
        setEpisode(ep);
        setCalls(cs);
        if (ep.explainDiffSummary) {
          setExplainResult({
            summary: ep.explainDiffSummary,
            risks: ep.explainDiffRisks || [],
            checks: ep.explainDiffChecks || [],
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [episodeId]);

  async function handleExplainDiff() {
    setExplaining(true);
    try {
      const result = await explainEpisodeDiff(episodeId);
      setExplainResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setExplaining(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 20, width: 200, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 32, width: 400, marginBottom: 24 }} />
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12, borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  if (!episode) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <h3 className="text-muted">Episode not found</h3>
        <Link href="/" className="btn btn-ghost" style={{ marginTop: 16, display: "inline-flex" }}>← Back Home</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="page-header">
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>
          <span className="text-muted">{episode.branchName}</span>
          <span>›</span>
          <span>Episode</span>
        </div>
        <div className="flex items-center gap-2">
          <h1 style={{ fontSize: 20 }}>{episode.label}</h1>
          <span className={`badge ${episode.status === "active" ? "badge-green" : "badge-gray"}`}>{episode.status}</span>
          <span className="badge badge-indigo">{episode.branchName}</span>
        </div>
        {/* Metadata */}
        <div className="flex gap-2 text-dim" style={{ marginTop: 8, fontSize: 12, flexWrap: "wrap" }}>
          <span>Started {new Date(episode.startedAt).toLocaleString()}</span>
          {episode.endedAt && <><span>·</span><span>Ended {new Date(episode.endedAt).toLocaleString()}</span></>}
          {episode.callCount > 0 && <><span>·</span><span>{episode.callCount} AI calls</span></>}
          {episode.changedFiles?.length > 0 && <><span>·</span><span>{episode.changedFiles.length} files changed</span></>}
        </div>
      </div>

      {/* Changed files */}
      {episode.changedFiles?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p className="section-title">Changed Files</p>
          <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
            {episode.changedFiles.map((f) => (
              <span key={f} className="badge badge-gray mono">{f}</span>
            ))}
          </div>
        </div>
      )}

      {/* AI Calls */}
      <p className="section-title">AI Calls ({calls.length})</p>
      {calls.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "32px", marginBottom: 16 }}>
          <p className="text-dim">No AI calls recorded for this episode.</p>
        </div>
      ) : (
        calls.map((call, idx) => (
          <div key={call.id} style={{ marginBottom: 12 }}>
            <CollapsibleSection title={`Call ${idx + 1} — ${call.intentTag || "AI Interaction"}`} defaultOpen={idx === 0}>
              <CallDetails call={call} />
            </CollapsibleSection>
          </div>
        ))
      )}

      {/* Explain Diff Card */}
      <div className="card" style={{ borderColor: "rgba(99,102,241,0.3)", marginTop: 8 }}>
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize: 18 }}>🧠</span>
          <h3 style={{ margin: 0 }}>Explain Diff</h3>
          {!explainResult && (
            <button
              className="btn btn-primary"
              style={{ marginLeft: "auto", fontSize: 12, padding: "4px 10px" }}
              onClick={handleExplainDiff}
              disabled={explaining}
            >
              {explaining ? "Analyzing…" : "Run Analysis"}
            </button>
          )}
        </div>

        {explainResult ? (
          <div>
            <p style={{ fontSize: 13, lineHeight: "20px", color: "var(--text-muted)", marginBottom: 12 }}>
              {explainResult.summary}
            </p>
            {explainResult.risks.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p className="section-title">Risks</p>
                <div className="space-y-3">
                  {explainResult.risks.map((risk, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="badge badge-orange">⚠</span>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {explainResult.checks.length > 0 && (
              <div>
                <p className="section-title">Review Checks</p>
                <div className="space-y-3">
                  {explainResult.checks.map((check, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="badge badge-green">✓</span>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{check}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-dim" style={{ fontSize: 13 }}>
            Run analysis to get an AI-powered summary of code changes, risks, and review checklist.
          </p>
        )}
      </div>
    </div>
  );
}