export class Redaction {
  static redact(content: string): string {
    return content.replace(/sk-[A-Za-z0-9_-]{32,}/g, '[REDACTED_API_KEY]');
  }
}
