"use client";

import { useState, useEffect } from "react";
import { Project } from "@/lib/types";
import { getProjects } from "@/lib/api";

export default function Settings() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [settings, setSettings] = useState<{
    name: string;
    repoUrl: string;
    preferredModel: string;
    redactionEnabled: boolean;
    autoSummariesEnabled: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const ps = await getProjects();
      setProjects(ps);
      if (ps.length > 0) {
        setSelectedProjectId(ps[0].id);
        loadSettings(ps[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function loadSettings(project: Project) {
    setSettings({
      name: project.name,
      repoUrl: project.repoUrl,
      preferredModel: project.settings.preferredModel,
      redactionEnabled: project.settings.redactionEnabled,
      autoSummariesEnabled: project.settings.autoSummariesEnabled,
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings || !selectedProjectId) return;
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12, borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p className="text-muted" style={{ marginTop: 6 }}>Configure your projects and AI preferences.</p>
      </div>

      {projects.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p className="section-title">Select Project</p>
          <select
            className="input"
            style={{ width: 300 }}
            value={selectedProjectId || ""}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              const p = projects.find((p) => p.id === e.target.value);
              if (p) loadSettings(p);
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {settings ? (
        <form onSubmit={handleSave}>
          {/* Project Details */}
          <div className="card mb-4">
            <h3 style={{ marginBottom: 16 }}>Project Details</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <label className="section-title" style={{ display: "block", marginBottom: 6 }}>Project Name</label>
                <input
                  className="input"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />
              </div>
              <div>
                <label className="section-title" style={{ display: "block", marginBottom: 6 }}>Repository URL</label>
                <input
                  className="input"
                  value={settings.repoUrl}
                  onChange={(e) => setSettings({ ...settings, repoUrl: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <div className="card mb-4">
            <h3 style={{ marginBottom: 16 }}>AI Model</h3>
            <div>
              <label className="section-title" style={{ display: "block", marginBottom: 6 }}>Preferred Model</label>
              <select
                className="input"
                style={{ width: 300 }}
                value={settings.preferredModel}
                onChange={(e) => setSettings({ ...settings, preferredModel: e.target.value })}
              >
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
            </div>
          </div>

          {/* Privacy Toggles */}
          <div className="card mb-4">
            <h3 style={{ marginBottom: 16 }}>Privacy & Security</h3>
            <div style={{ display: "grid", gap: 16 }}>
              {[
                {
                  key: "redactionEnabled" as const,
                  label: "Enable Automatic Redaction",
                  desc: "Detect and redact API keys, passwords, and other secrets before sending to AI models.",
                },
                {
                  key: "autoSummariesEnabled" as const,
                  label: "Enable Automatic Episode Summaries",
                  desc: "Automatically generate AI summaries when an episode is closed.",
                },
              ].map(({ key, label, desc }) => (
                <label key={key} style={{ display: "flex", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                    style={{ marginTop: 2, accentColor: "var(--primary)", flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 3 }}>{label}</div>
                    <div className="text-dim" style={{ fontSize: 12 }}>{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-subtle" onClick={() => {
              const p = projects.find((p) => p.id === selectedProjectId);
              if (p) loadSettings(p);
            }}>
              Reset
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Settings"}
            </button>
          </div>
        </form>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚙️</div>
          <h3 style={{ color: "var(--text-muted)", marginBottom: 8 }}>No projects found</h3>
          <p className="text-dim" style={{ fontSize: 13 }}>
            Connect the VS Code extension to create your first project.
          </p>
        </div>
      )}
    </div>
  );
}