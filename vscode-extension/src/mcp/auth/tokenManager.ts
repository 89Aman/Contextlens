/**
 * MCP Token Manager
 *
 * Replaces the static per-session secret with rotating tokens.
 * Tokens auto-expire and regenerate, preventing replay attacks.
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto';

export interface TokenInfo {
  /** The current token value */
  token: string;
  /** When this token was generated (ms epoch) */
  createdAt: number;
  /** When this token expires (ms epoch) */
  expiresAt: number;
}

/**
 * Constant-time string comparison. Hashes both sides with SHA-256 to
 * normalize length, then compares digests with timingSafeEqual so token
 * length and content differences do not leak via timing.
 */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const GRACE_PERIOD_MS = 60 * 1000; // 1 minute grace for in-flight requests

export class TokenManager {
  private currentToken: TokenInfo | null = null;
  private previousToken: TokenInfo | null = null;
  private ttlMs: number;
  private rotationTimer: ReturnType<typeof setInterval> | null = null;
  private onRotateCallback: ((token: string) => void) | null = null;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Generate initial token and start rotation timer.
   */
  start(): string {
    this.rotate();
    this.rotationTimer = setInterval(() => this.rotate(), this.ttlMs);
    return this.currentToken!.token;
  }

  /**
   * Stop rotation timer and clear tokens.
   */
  stop(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
    this.currentToken = null;
    this.previousToken = null;
  }

  /**
   * Rotate token: current becomes previous (with grace period), new one generated.
   */
  private rotate(): void {
    this.previousToken = this.currentToken;
    const now = Date.now();
    this.currentToken = {
      token: randomBytes(32).toString('hex'),
      createdAt: now,
      expiresAt: now + this.ttlMs,
    };

    if (this.onRotateCallback) {
      this.onRotateCallback(this.currentToken.token);
    }
  }

  /**
   * Force-regenerate the token immediately.
   */
  regenerate(): string {
    this.rotate();
    return this.currentToken!.token;
  }

  /**
   * Get current active token.
   */
  getToken(): string | null {
    return this.currentToken?.token || null;
  }

  /**
   * Get full token info (for writing to secret file).
   */
  getTokenInfo(): TokenInfo | null {
    return this.currentToken;
  }

  /**
   * Validate a token. Accepts current token or previous token within grace period.
   * Uses constant-time comparison to avoid timing side-channels.
   */
  validate(token: string): boolean {
    if (!token) return false;

    // Check current token
    if (this.currentToken && safeEqual(token, this.currentToken.token)) {
      return true;
    }

    // Check previous token within grace period
    if (this.previousToken && safeEqual(token, this.previousToken.token)) {
      const graceCutoff = this.previousToken.expiresAt + GRACE_PERIOD_MS;
      if (Date.now() < graceCutoff) {
        return true;
      }
    }

    return false;
  }

  /**
   * Register callback for token rotation events.
   */
  onRotate(callback: (newToken: string) => void): void {
    this.onRotateCallback = callback;
  }

  /**
   * Check if token is expiring soon (within 5 minutes).
   */
  isExpiringSoon(): boolean {
    if (!this.currentToken) return true;
    return (this.currentToken.expiresAt - Date.now()) < 5 * 60 * 1000;
  }
}
