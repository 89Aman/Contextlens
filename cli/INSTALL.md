# ContextLens CLI Installation Guide

## Option 1: Local Usage (Recommended for Development)

You can use the CLI directly from the ContextLens directory:

```bash
# From within the ContextLens directory
node contextlens-cli.js <command> [options]

# Or make it executable and run directly
chmod +x contextlens-cli.js
./contextlens-cli.js <command> [options]
```

## Option 2: Global Installation

To install the CLI globally so you can use it from anywhere:

```bash
# From the ContextLens directory
npm link

# Then you can use it anywhere:
contextlens <command> [options]
```

## Option 3: Add to PATH

Add the ContextLens directory to your PATH:

```bash
# Add to your ~/.bashrc, ~/.zshrc, or equivalent
export PATH="$PATH:/path/to/ContextLens"

# Then reload your shell
source ~/.bashrc
```

## Available Commands

Once installed, you can use:

```bash
# Get help
contextlens --help
contextlens help

# Check version
contextlens --version

# Initialize ContextLens in current directory
contextlens init

# Check status
contextlens status

# Manually trigger sync
contextlens sync
contextlens sync --force
contextlens sync --dry-run

# View configuration
contextlens config list
contextlens config get <key>
contextlens config set <key> <value>

# View logs
contextlens logs
contextlens logs --lines 50
contextlens logs --follow
```

## Example Usage

```bash
# Initialize a new ContextLens project
cd /my/project
contextlens init

# Check the status
contextlens status

# Configure Firebase project ID
contextlens config set firebaseProject my-contextlens-project

# Manually sync coding sessions
contextlens sync

# View recent activity
contextlens logs --lines 20
```

## Uninstalling

To remove the global installation:

```bash
npm unlink -g contextlens-cli
# or if you used npm link
npm unlink
```