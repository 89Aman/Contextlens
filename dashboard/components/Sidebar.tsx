"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Project } from "@/lib/types";

export default function Sidebar({ projects }: { projects: Project[] }) {
  const pathname = usePathname();

  const getSelectedProjectId = (): string | null => {
    const m = pathname.match(/^\/project\/([^/]+)/);
    if (m) return m[1];
    const b = pathname.match(/^\/branch\/([^/]+)/);
    if (b) return b[1];
    return null;
  };

  const selectedProjectId = getSelectedProjectId();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-dot" />
        ContextLens
      </div>

      <nav className="sidebar-nav">
        <p className="section-title" style={{ padding: "8px 10px 4px" }}>Navigation</p>

        <Link
          href="/"
          className={`sidebar-nav-item ${pathname === "/" ? "active" : ""}`}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </Link>

        {projects.length > 0 && (
          <>
            <p className="section-title" style={{ padding: "16px 10px 4px" }}>Projects</p>
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className={`sidebar-nav-item ${selectedProjectId === project.id ? "active" : ""}`}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3.5L10 7h9a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {project.name}
                </span>
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <Link
          href="/settings"
          className={`sidebar-nav-item ${pathname === "/settings" ? "active" : ""}`}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </Link>
      </div>
    </aside>
  );
}