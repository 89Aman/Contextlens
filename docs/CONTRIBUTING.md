# Contributing to ContextLens

We love contributions! Whether you're fixing a bug, adding a feature, or improving documentation, we're happy to have you.

## Repository Structure

ContextLens is a monorepo containing:
- `/vscode-extension`: The VS Code extension source code.
- `/contextlens-dashboard`: The React-based web dashboard.
- `/src`: The backend Cloud Functions source code.
- `/docs`: Detailed architectural documentation and design specs.

## Getting Started

1.  **Fork & Clone**: Fork the repository and clone it to your local machine.
2.  **Environment Setup**: Follow the READMEs in each subdirectory to set up local environment variables.
3.  **Branching**: Create a new branch for your work: `git checkout -b feature/your-feature-name` or `bugfix/your-fix-name`.

## Development Workflow

### VS Code Extension
- Open the `/vscode-extension` folder.
- Run `npm install`.
- Use the **Extension Development Host** (`F5`) to test your changes.
- Ensure all new modules are properly exported and documented.

### Web Dashboard
- Open the `/contextlens-dashboard` folder.
- Run `npm install`.
- Run `npm run dev` to start the local Vite server.
- Follow the design system guidelines in `ARCHITECTURE.md`.

### Backend
- Open the `/src` folder.
- Use `firebase emulators:start` to test functions locally.

## Coding Guidelines

- **TypeScript**: Use TypeScript for all frontend and extension code.
- **JSDoc**: Document all classes, interfaces, and public methods with JSDoc.
- **Error Handling**: Use consistent error handling patterns (try-catch with descriptive messages).
- **Testing**: We use Jest for testing. Please add unit tests for any non-trivial logic.
- **Commit Messages**: Use conventional commits (e.g., `feat:`, `fix:`, `docs:`, `chore:`).

## Submitting a Pull Request

1.  **Small PRs**: Keep PRs focused on a single change.
2.  **Clear Title**: Use conventional commit titles for PRs (e.g., `feat: add AI redaction`).
3.  **Description**: Explain *why* the change is needed, not just *what* was changed.
4.  **Tests**: Include tests for all new logic.
5.  **Documentation**: Update relevant Markdown files and JSDoc.
6.  **Review**: Be prepared to iterate based on feedback.

## Reporting Issues

- **Check Existing Issues**: Search the issue tracker before opening a new one.
- **Use Templates**: Use the provided issue templates if available.
- **Provide Context**: Include Node.js version, OS, and clear steps to reproduce.
- **Logs**: Attach relevant logs from the VS Code Output channel or backend server.

## Project Principles

- **Security First**: Never log or upload raw secrets or PII. Use redaction utilities.
- **Minimalist Core**: Keep the extension fast and lightweight.
- **Context is King**: Ensure all features contribute to the preservation of developer context.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
