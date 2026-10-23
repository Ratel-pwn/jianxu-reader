import * as SecureStore from 'expo-secure-store';
import type { Session } from '../model/types';
import { validCommunityEndpoint } from '../model/types';
import { validateCommunityResponse } from '../model/validate';
export class CommunityError extends Error { constructor(message: string, readonly status: number) { super(message); } }

export async function communityRequest<T>(endpoint: string, path: string, options: { token?: string; method?: string; body?: unknown } = {}): Promise<T> {
  if (!validCommunityEndpoint(endpoint, __DEV__)) throw new Error('请使用 HTTPS 社区地址');
  const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 12000);
  try {
    const response = await fetch(endpoint.replace(/\/$/, '') + path, { method: options.method || 'GET', signal: abort.signal, headers: { 'Content-Type': 'application/json', ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) }, ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }) });
    const data = await response.json();
    if (!response.ok) throw new CommunityError(data.error || '社区请求失败', response.status);
    validateCommunityResponse(path, options.method || 'GET', data);
    return data as T;
  } catch (e) { if (e instanceof Error && e.name === 'AbortError') throw new Error('连接超时，请稍后重试'); if (e instanceof TypeError) throw new Error('无法连接社区，请检查服务地址和网络'); throw e; }
  finally { clearTimeout(timeout); }
}
const SESSION_KEY = 'jianxu.community.session';
export async function loadSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try { const s = JSON.parse(raw); return s.token && s.user?.id && s.endpoint ? s : null; } catch { return null; }
}
export async function storeSession(session: Session | null) {
  if (session) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}
