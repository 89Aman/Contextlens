export class ApiClient {
  static async sendChat(prompt: string, episodeId: string, gitContext: any): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ response: `Echo: ${prompt} (Context: ${gitContext?.branch || 'none'})` });
      }, 1000);
    });
  }

  static async explainDiff(diff: string): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ response: `Explanation for diff length ${diff.length}` });
      }, 1000);
    });
  }

  static async summarizeBranch(branch: string): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ response: `Summary for branch ${branch}` });
      }, 1000);
    });
  }
}
