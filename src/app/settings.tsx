import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, ErrorMessage, Field, Label, s } from '../components/ui';
import { getSetting, setSetting } from '../services/database';
import { emptyAIConfiguration, validateAIConfiguration } from '../features/settings/model/ai';

export default function Settings() {
  const [config, setConfig] = useState(emptyAIConfiguration), [error, setError] = useState(''), [saved, setSaved] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { getSetting('ai', emptyAIConfiguration).then(setConfig).catch(() => setError('配置读取失败')); }, []);
  async function save() {
    const issue = validateAIConfiguration(config);
    if (issue) { setError(issue); return; }
    setBusy(true);
    try { await setSetting('ai', config); setError(''); setSaved(true); } catch { setError('配置保存失败'); } finally { setBusy(false); }
  }
  return <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Label>AI 连接</Label><Text style={s.small}>当前版本只保存配置，AI 调用未开放。不会发送书籍内容，也不会产生模型费用。</Text>
    <Field accessibilityLabel="服务名称" placeholder="服务名称" value={config.provider} onChangeText={provider => { setConfig({ ...config, provider }); setSaved(false); }}/>
    <Field accessibilityLabel="HTTPS 服务地址" placeholder="https://服务地址" autoCapitalize="none" autoCorrect={false} keyboardType="url" value={config.endpoint} onChangeText={endpoint => { setConfig({ ...config, endpoint }); setSaved(false); }}/>
    <Field accessibilityLabel="模型名称" placeholder="模型名称" autoCapitalize="none" autoCorrect={false} value={config.model} onChangeText={model => { setConfig({ ...config, model }); setSaved(false); }}/>
    {!!error && <ErrorMessage message={error}/>}<Button title={busy ? '保存中…' : '保存配置'} variant="primary" disabled={busy} onPress={() => void save()}/>{saved && <Label muted>已保存，调用仍未启用。</Label>}
    <View style={s.separator}/><Label>本机数据</Label><Label muted>书籍、阅读位置、伴读边界和笔记只保存在本机。移除书籍会删除其本地记录。卸载应用前请保留原始书籍文件。</Label>
  </ScrollView>;
}
