import { Project } from "@/lib/types";
import { getProjects } from "@/lib/api";
import ProjectCard from "@/components/ProjectCard";

export default async function Home() {
  let projects: Project[] = [];
  try {
    projects = await getProjects();
  } catch {
    // Continue silently
  }

  return (
    <div>
      <div className="page-header">
        <h1>Welcome to ContextLens</h1>
        <p className="text-muted" style={{ marginTop: 6 }}>
          Your AI workflow memory layer — capturing coding sessions as searchable episodes.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Projects", value: projects.length, icon: "📁" },
          { label: "Episodes Today", value: "—", icon: "🧠" },
          { label: "AI Calls", value: "—", icon: "⚡" },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: "14px 16px" }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: 16 }}>{stat.icon}</span>
              <span className="text-dim" style={{ fontSize: 12 }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="mb-6">
        <p className="section-title">Your Projects</p>
        {projects.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
            <h3 style={{ marginBottom: 8, color: "var(--text-muted)" }}>No projects yet</h3>
            <p className="text-dim" style={{ fontSize: 13 }}>
              Connect the VS Code extension to start capturing your AI coding sessions.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Quick tips for empty state */}
      {projects.length === 0 && (
        <div>
          <p className="section-title">Getting Started</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { step: "01", title: "Install VS Code Extension", desc: "Captures your AI sessions automatically in the background." },
              { step: "02", title: "Start Coding with AI", desc: "Every Gemini chat is recorded as an episode with full context." },
              { step: "03", title: "Review Episodes", desc: "Browse your timeline, view diffs, and understand AI decisions." },
              { step: "04", title: "Generate Branch Summaries", desc: "One-click PR summaries from your entire branch context." },
            ].map((tip) => (
              <div key={tip.step} className="card flex gap-3" style={{ alignItems: "flex-start" }}>
                <span className="badge badge-indigo" style={{ fontSize: 13, padding: "4px 10px", flexShrink: 0 }}>{tip.step}</span>
                <div>
                  <h4 style={{ marginBottom: 4 }}>{tip.title}</h4>
                  <p className="text-dim" style={{ fontSize: 12, lineHeight: "18px" }}>{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}