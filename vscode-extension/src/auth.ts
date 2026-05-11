import * as vscode from 'vscode';

// Must match: "<publisher>.<name>" from package.json
const EXTENSION_ID = 'noventra-Labs.contextlens';

const API_BASE = 'https://contextlens-backend-001.web.app/api';
const SECRET_TOKEN_KEY = 'contextlens.auth.token';
const SECRET_UID_KEY = 'contextlens.auth.uid';

/**
 * AuthManager handles the full VS Code → Browser → Backend → VS Code
 * sign-in callback loop using `vscode://` URI handlers.
 */
export class AuthManager implements vscode.UriHandler {
  private _onDidSignIn = new vscode.EventEmitter<{ uid: string; token: string }>();
  public readonly onDidSignIn = this._onDidSignIn.event;

  private _onDidSignOut = new vscode.EventEmitter<void>();
  public readonly onDidSignOut = this._onDidSignOut.event;

  private signInResolver: ((value: { uid: string; token: string }) => void) | null = null;

  constructor(private context: vscode.ExtensionContext) {}

  // ── URI Handler ────────────────────────────────────────────────────────────

  /**
   * Register this class as the extension's URI handler.
   * VS Code will call handleUri when a vscode://<extension-id>?... URL is opened.
   */
  registerUriHandler(): void {
    this.context.subscriptions.push(
      vscode.window.registerUriHandler(this)
    );
  }

  /**
   * Called by VS Code when a vscode://<extension-id>?uid=...&token=... URI is received.
   */
  async handleUri(uri: vscode.Uri): Promise<void> {
    const query = new URLSearchParams(uri.query);
    const uid = query.get('uid');
    const token = query.get('token');

    if (!uid || !token) {
      vscode.window.showErrorMessage('ContextLens: Sign-in failed — missing uid or token in callback.');
      return;
    }

    // Store in SecretStorage
    await this.context.secrets.store(SECRET_TOKEN_KEY, token);
    await this.context.secrets.store(SECRET_UID_KEY, uid);

    // Notify listeners
    this._onDidSignIn.fire({ uid, token });

    // Resolve any pending ensureSignedIn() promise
    if (this.signInResolver) {
      this.signInResolver({ uid, token });
      this.signInResolver = null;
    }

    vscode.window.showInformationMessage('ContextLens: Sign-in successful! ✦');
  }

  // ── Sign In / Out ──────────────────────────────────────────────────────────

  /**
   * Opens the browser to the backend /auth/login route with a callback
   * URI that points back to this extension.
   */
  async signIn(): Promise<{ uid: string; token: string }> {
    // Use vscode.env.uriScheme to support both 'vscode' and 'vscode-insiders'
    // Bypassing asExternalUri here to prevent resolving to unknown schemes like 'antigravity:'
    // which the local OS browser might not understand.
    const callbackUriStr = `${vscode.env.uriScheme}://${EXTENSION_ID}`;

    const loginUrl = `${API_BASE}/auth/login?callback=${encodeURIComponent(callbackUriStr)}`;

    await vscode.env.openExternal(vscode.Uri.parse(loginUrl));

    // Return a promise that resolves when handleUri fires
    return new Promise<{ uid: string; token: string }>((resolve) => {
      this.signInResolver = resolve;
    });
  }

  /**
   * If already signed in (token exists in SecretStorage), returns immediately.
   * Otherwise triggers signIn() and waits for the callback.
   */
  async ensureSignedIn(): Promise<{ uid: string; token: string }> {
    const existing = await this.loadAuthState();
    if (existing) {
      return existing;
    }

    return this.signIn();
  }

  /**
   * Clear stored credentials.
   */
  async signOut(): Promise<void> {
    await this.context.secrets.delete(SECRET_TOKEN_KEY);
    await this.context.secrets.delete(SECRET_UID_KEY);
    this._onDidSignOut.fire();
    vscode.window.showInformationMessage('ContextLens: Signed out.');
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  async loadAuthState(): Promise<{ uid: string; token: string } | null> {
    const token = await this.context.secrets.get(SECRET_TOKEN_KEY);
    const uid = await this.context.secrets.get(SECRET_UID_KEY);
    if (token && uid) {
      return { uid, token };
    }
    return null;
  }

  async getToken(): Promise<string | undefined> {
    return this.context.secrets.get(SECRET_TOKEN_KEY);
  }

  async getUid(): Promise<string | undefined> {
    return this.context.secrets.get(SECRET_UID_KEY);
  }

  /**
   * Clear stored credentials and prompt to re-sign-in.
   * Used by apiClient when a 401 is received.
   */
  async handleSessionExpired(): Promise<void> {
    await this.context.secrets.delete(SECRET_TOKEN_KEY);
    await this.context.secrets.delete(SECRET_UID_KEY);

    const action = await vscode.window.showWarningMessage(
      'ContextLens: Session expired. Please sign in again.',
      'Sign In'
    );
    if (action === 'Sign In') {
      vscode.commands.executeCommand('contextlens.signIn');
    }
  }
}

// ── Singleton accessor (set from extension.ts) ────────────────────────────

let _authManager: AuthManager | null = null;

export function setAuthManager(am: AuthManager) {
  _authManager = am;
}

export function getAuthManager(): AuthManager {
  if (!_authManager) {
    throw new Error('AuthManager not initialized. Call setAuthManager() in activate().');
  }
  return _authManager;
}
