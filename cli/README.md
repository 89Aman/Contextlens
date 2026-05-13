# ContextLens CLI (cl) 🚀

The official Command Line Interface for **ContextLens** — AI-driven coding context and insights.

Interact with the ContextLens system directly from your terminal using the shorthand `cl`. Track your AI-powered coding sessions, manage projects, and view logs across your entire development workflow.

## Installation

Install the CLI globally via npm:

```bash
npm install -g contextlens
```

Or run it without installing using npx:

```bash
npx cl status
```

## Quick Start

1. **Authenticate**: Get your Firebase ID token from the dashboard and login:
   ```bash
   cl auth <your-token>
   ```

2. **Initialize** a project in your current directory:
   ```bash
   cl init <your-project-id>
   ```

3. **Check Status**:
   ```bash
   cl status
   ```

## Commands

### `cl auth <token>`
Saves your authentication token globally so you don't have to provide it for every command.

### `cl init [project-id]`
Creates a `.contextlens` directory in the current folder. If a project ID is provided, it links the folder to that project.

### `cl config [action] [key] [value]`
Manage your settings.
- `cl config list`: Show all merged settings.
- `cl config set <key> <value>`: Set a project-specific setting.
- `cl config set <key> <value> --global`: Set a global setting.
- `cl config get <key>`: Show a specific setting.

### `cl status`
Shows connection status, linked project, and basic statistics (episode and call counts) from the backend.

### `cl logs`
Displays a list of recent activity (AI calls, git commits) for the current project.
- `--lines <n>`: Number of logs to show.

### `cl log-call`
Manually log an external event or AI interaction.
```bash
cl log-call --prompt "Fixed the database bug" --response "Changes applied to index.js" --source manual
```

### `cl sync`
Verifies connectivity and ensures your local environment is correctly linked to the ContextLens backend.

### `cl git-hook <hook>`
Automate logging via Git hooks. For example, add this to your `.git/hooks/post-commit`:
```bash
#!/bin/sh
cl git-hook post-commit
```

## License

MIT
