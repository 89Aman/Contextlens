import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { getProjects } from "@/lib/api";
import { Project } from "@/lib/types";

export const metadata: Metadata = {
  title: "ContextLens – AI Workflow Memory",
  description: "Capture, visualize and understand your AI-assisted coding sessions",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let projects: Project[] = [];
  try {
    projects = await getProjects();
  } catch {
    // Continue with empty projects array
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:ital,wght@0,400;0,500;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-shell">
          <Sidebar projects={projects} />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}