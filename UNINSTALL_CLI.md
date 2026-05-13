# ContextLens CLI Uninstallation

## To uninstall the global CLI:

```bash
# If you installed with npm link
npm unlink contextlens-backend

# Or if you installed globally another way
npm uninstall -g contextlens-cli
```

## To remove from PATH (if you added it manually):

1. Remove the PATH addition from your shell profile (~/.bashrc, ~/.zshrc, etc.)
2. Reload your shell: `source ~/.bashrc` or restart your terminal

## To remove local installation:

Simply delete the `contextlens-cli.js` file from your ContextLens directory:

```bash
rm /path/to/ContextLens/contextlens-cli.js
```

The CLI is designed to be non-invasive and leaves no persistent state behind when removed.