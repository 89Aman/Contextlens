import * as vscode from 'vscode';

export class Auth {
  private static instance: Auth;

  private constructor(private secretStorage: vscode.SecretStorage) {}

  static initialize(context: vscode.ExtensionContext) {
    if (!Auth.instance) {
      Auth.instance = new Auth(context.secrets);
    }
  }

  static get(): Auth {
    return Auth.instance;
  }

  async getToken(): Promise<string | undefined> {
    return this.secretStorage.get('contextlens.token');
  }

  async setToken(token: string): Promise<void> {
    await this.secretStorage.store('contextlens.token', token);
  }

  async clearToken(): Promise<void> {
    await this.secretStorage.delete('contextlens.token');
  }
}
