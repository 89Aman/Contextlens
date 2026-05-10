"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Project, Episode } from "@/lib/types";
import { getProject, getProjectEpisodes } from "@/lib/api";
import EpisodeCard from "@/components/EpisodeCard";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const [proj, eps] = await Promise.all([getProject(projectId), getProjectEpisodes(projectId)]);
        setProject(proj);
        setEpisodes(eps);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  // Unique branches
  const branches = useMemo(() => {
    return ["all", ...Array.from(new Set(episodes.map((e) => e.branchName)))];
  }, [episodes]);

  const filtered = useMemo(() => {
    return episodes.filter((ep) => {
      const matchBranch = branchFilter === "all" || ep.branchName === branchFilter;
      const matchSearch = !search || ep.label.toLowerCase().includes(search.toLowerCase());
      return matchBranch && matchSearch;
    });
  }, [episodes, branchFilter, search]);

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

  if (!project) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <h3 className="text-muted">Project not found</h3>
        <Link href="/" className="btn btn-ghost" style={{ marginTop: 16, display: "inline-flex" }}>← Back Home</Link>
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
          <span>Projects</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="18" height="18" fill="none" stroke="var(--primary-light)" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3.5L10 7h9a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          <h1 style={{ fontSize: 22 }}>{project.name}</h1>
        </div>
        {project.repoUrl && (
          <p className="text-dim mono" style={{ fontSize: 12, marginTop: 4 }}>{project.repoUrl}</p>
        )}
      </div>

      {/* Branch links */}
      {branches.filter(b => b !== "all").length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p className="section-title">Branches</p>
          <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
            {branches.filter(b => b !== "all").map((branch) => (
              <Link
                key={branch}
                href={`/branch/${projectId}/${encodeURIComponent(branch)}`}
                className="badge badge-indigo"
                style={{ textDecoration: "none", cursor: "pointer" }}
              >
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 3v12m0 0a3 3 0 106 0m-6 0a3 3 0 000 6m0-6h12m0 0V9m0 6a3 3 0 100-6" />
                </svg>
                {branch}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-2" style={{ marginBottom: 16 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <svg
            width="14" height="14" fill="none" stroke="var(--text-dim)" strokeWidth="2" viewBox="0 0 24 24"
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="input"
            style={{ paddingLeft: 32 }}
            placeholder="Search episodes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ width: 180 }}
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b} value={b}>{b === "all" ? "All branches" : b}</option>
          ))}
        </select>
      </div>

      {/* Episode Timeline */}
      <p className="section-title">Episode Timeline ({filtered.length})</p>
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🧠</div>
          <h3 style={{ color: "var(--text-muted)", marginBottom: 8 }}>No episodes yet</h3>
          <p className="text-dim" style={{ fontSize: 13 }}>
            {search || branchFilter !== "all"
              ? "No episodes match your search. Try clearing the filters."
              : "Start an AI coding session with the VS Code extension to capture episodes."}
          </p>
        </div>
      ) : (
        <div className="timeline">
          {filtered.map((ep) => (
            <EpisodeCard key={ep.id} episode={ep} showTimeline={true} />
          ))}
        </div>
      )}
    </div>
  );
}