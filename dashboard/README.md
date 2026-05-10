# ContextLens Web Dashboard

This is the web dashboard for ContextLens, an AI workflow memory layer for coding.

## Features

- Project overview
- Episode timeline with detailed views
- Branch summaries with AI-generated insights
- Search and filtering capabilities
- Settings management
- Responsive, dark-mode-first design

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A running ContextLens backend API (see [Builder Spec 2](./../ContextLens_Builder_2_Backend_AI_Services.txt))

### Installation

1. Navigate to the dashboard directory:
   ```bash
   cd dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the API URL:
   Create a `.env.local` file in the dashboard directory with:
   ```
   NEXT_PUBLIC_API_URL=http://your-backend-api-url
   ```

   If not specified, the dashboard will attempt to connect to the backend on the same origin.

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

To create a production build:
```bash
npm run build
```

To start the production server:
```bash
npm start
```

## Project Structure

- `/app` - Next.js app router pages and layouts
- `/components` - Reusable UI components
- `/lib` - API utilities and TypeScript types
- `/public` - Static assets

## API Integration

The dashboard connects to the ContextLens backend API. Expected endpoints include:

- `GET /api/projects` - List user's projects
- `GET /api/projects/:id` - Get project details
- `GET /api/projects/:id/episodes` - Get episodes for a project
- `GET /api/episodes/:id` - Get episode details
- `GET /api/episodes/:id/calls` - Get calls for an episode
- `POST /api/episodes/:id/explain` - Generate explain diff for an episode
- `GET /api/branches/:projectId/:branchName/summary` - Get branch summary
- `POST /api/search` - Search episodes and calls

## Design Principles

- Dark-mode-first interface
- Clean, developer-tool aesthetic
- Responsive layout for side-by-side viewing with VS Code
- Premium feel with skeleton loaders, smooth transitions, and good empty states
- Linear/Vercel design inspiration

## Components

- `ProjectCard` - Overview of a project with recent episodes
- `EpisodeCard` - Compact view of an episode/session
- `EpisodeTimeline` - Vertical timeline of episodes
- `BranchSummaryList` - List of branch summaries
- `DiffViewer` - View code changes (placeholder for Monaco integration)
- `ExplainDiffCard` - Display AI-generated explanations
- `SearchBar` - Search episodes by text and filters
- `BranchFilter` - Filter episodes by branch
- `CopyMarkdownButton` - Export branch summary as markdown
- `MetadataPill` - Small badge-like component for metadata
- `LoadingSkeleton` - Placeholder loading animations

## Pages

- `/` - Home page with projects list and recent activity
- `/project/[projectId]` - Project overview with episode timeline
- `/episode/[episodeId]` - Detailed view of a specific episode
- `/branch/[projectId]/[branchName]` - Branch summary and episode history
- `/settings` - User and project settings

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Base URL for the ContextLens backend API