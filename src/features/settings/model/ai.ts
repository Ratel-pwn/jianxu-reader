export type AIConfiguration = { provider: string; endpoint: string; model: string };
export const emptyAIConfiguration: AIConfiguration = { provider: '', endpoint: '', model: '' };
export const AI_RUNTIME_ENABLED = false as const;
export function validateAIConfiguration(config: AIConfiguration): string | null {
  if (!config.provider.trim() || !config.model.trim()) return '请填写服务名称和模型名称';
  try {
    const url = new URL(config.endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return '请填写不含密钥或参数的 HTTPS 服务地址';
  } catch { return '服务地址格式不正确'; }
  return null;
}
