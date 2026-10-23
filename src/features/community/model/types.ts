export type User = { id: number; name: string };
export type Session = { token: string; user: User; endpoint: string };
export type Post = { id: number; authorId: number; author: string; parentId: number | null; body: string; bookTitle: string; createdAt: number };
export type Thread = { post: Post; replies: Post[] };

export function validCommunityEndpoint(value: string, development = false): boolean {
  try { const u = new URL(value); return !u.username && !u.password && !u.search && !u.hash && (u.protocol === 'https:' || (development && u.protocol === 'http:' && ['localhost', '127.0.0.1', '10.0.2.2'].includes(u.hostname))); } catch { return false; }
}
