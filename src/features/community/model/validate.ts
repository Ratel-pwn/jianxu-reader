import type { Post, User } from './types';
function isUser(value: unknown): value is User {
  const v = value as User | null;
  return !!v && Number.isSafeInteger(v.id) && v.id > 0 && typeof v.name === 'string' && v.name.length <= 30;
}
function isPost(value: unknown): value is Post {
  const v = value as Post | null;
  return !!v && Number.isSafeInteger(v.id) && v.id > 0 && Number.isSafeInteger(v.authorId) &&
    typeof v.author === 'string' && v.author.length <= 30 && typeof v.body === 'string' && v.body.length <= 5000 &&
    typeof v.bookTitle === 'string' && v.bookTitle.length <= 200 && Number.isFinite(v.createdAt) &&
    (v.parentId === null || Number.isSafeInteger(v.parentId));
}
export function validateCommunityResponse(path: string, method: string, value: unknown) {
  const data = value as Record<string, unknown> | null;
  let valid = false;
  if (path === '/auth/login' || path === '/auth/register') valid = !!data && isUser(data.user) && typeof data.token === 'string' && /^[a-f0-9]{64}$/.test(data.token);
  else if (path === '/posts' && method === 'GET') valid = Array.isArray(value) && value.length <= 50 && value.every(isPost);
  else if (path === '/posts' && method === 'POST') valid = isPost(value);
  else if (/^\/posts\/\d+$/.test(path) && method === 'GET') valid = !!data && isPost(data.post) && Array.isArray(data.replies) && data.replies.length <= 100 && data.replies.every(isPost);
  else if (path === '/blocks' && method === 'GET') valid = Array.isArray(value) && value.every(isUser);
  else if (path === '/me') valid = isUser(value);
  else valid = !!data && data.ok === true;
  if (!valid) throw new Error('社区返回了无法识别的数据，请检查服务版本');
}
