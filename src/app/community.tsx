import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { Button, Busy, ErrorMessage, Field, Label, Row, s } from '../components/ui';
import { CommunityError, communityRequest, loadSession, storeSession } from '../features/community/services/client';
import { type Session, type Post, type Thread, type User, validCommunityEndpoint } from '../features/community/model/types';
import { PostCard } from '../features/community/components/PostCard';
import { ReaderPanel } from '../features/reader/components/ReaderPanel';
import { getSetting, setSetting } from '../services/database';

export default function Community() {
  const [endpoint, setEndpoint] = useState(''), [session, setSession] = useState<Session | null>(null), [loading, setLoading] = useState(true);
  const [name, setName] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]), [thread, setThread] = useState<Thread | null>(null), [blocked, setBlocked] = useState<User[]>([]);
  const [draft, setDraft] = useState(''), [bookTitle, setBookTitle] = useState(''), [reply, setReply] = useState(''), [report, setReport] = useState<Post | null>(null), [reason, setReason] = useState('');
  const [notice, setNotice] = useState(''), [compose, setCompose] = useState(false), [account, setAccount] = useState(false);
  const activePanel = report ? 'report' : compose ? 'compose' : account ? 'account' : thread ? 'thread' : null;
  const closePanel = () => { if (report) setReport(null); else if (compose) setCompose(false); else if (account) setAccount(false); else setThread(null); };
  useEffect(() => { Promise.all([loadSession(), getSetting('community.endpoint', '')]).then(([saved, address]) => { setSession(saved); setEndpoint(saved?.endpoint || address); }).catch(() => setError('连接配置读取失败')).finally(() => setLoading(false)); }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); }
    catch (e) {
      if (e instanceof CommunityError && e.status === 401 && session) {
        await storeSession(null).catch(() => undefined); setSession(null); setPosts([]); setThread(null); setAccount(false); setReport(null); setCompose(false);
      }
      setError(e instanceof Error ? e.message : '连接失败，请重试');
    } finally { setBusy(false); }
  }
  async function refresh(active = session) { if (active) setPosts(await communityRequest<Post[]>(active.endpoint, '/posts', { token: active.token })); }
  async function authenticate(register: boolean) {
    if (!validCommunityEndpoint(endpoint, __DEV__)) { setError('请填写 HTTPS 社区地址'); return; }
    await run(async () => {
      const result = await communityRequest<Omit<Session, 'endpoint'>>(endpoint, register ? '/auth/register' : '/auth/login', { method: 'POST', body: { name, password } });
      const active = { ...result, endpoint }; await storeSession(active); await setSetting('community.endpoint', endpoint); setSession(active); setPassword(''); await refresh(active);
    });
  }
  async function action(path: string, method: string, body?: unknown) {
    if (!session) return;
    await communityRequest(session.endpoint, path, { method, body, token: session.token });
  }
  function deletePost(post: Post) { Alert.alert('删除内容？', '主题帖下的回复也会一起删除。', [{ text: '取消', style: 'cancel' }, { text: '删除', style: 'destructive', onPress: () => void run(async () => { await action(`/posts/${post.id}`, 'DELETE'); setThread(null); await refresh(); }) }]); }
  function block(post: Post) { Alert.alert(`屏蔽 ${post.author}？`, '双方的内容将互相不可见。', [{ text: '取消', style: 'cancel' }, { text: '屏蔽', onPress: () => void run(async () => { await action(`/blocks/${post.authorId}`, 'POST'); setThread(null); await refresh(); setNotice('已屏蔽，可在账户中解除'); }) }]); }
  function card(post: Post, open?: () => void) { return <PostCard key={post.id} post={post} own={post.authorId === session?.user.id} open={open} report={() => { setReport(post); setReason(''); }} block={() => block(post)} remove={() => deletePost(post)}/>; }
  if (loading) return <Busy message="正在读取社区配置…"/>;
  return <><ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    {!!error && <ErrorMessage message={error}/>} {!!notice && <Label muted>{notice}</Label>}
    {!session ? <><Label>连接社区</Label><Label muted>尚未连接社区。阅读记录和笔记不会自动公开。</Label>
      <Field accessibilityLabel="社区地址" placeholder="https://社区服务地址" value={endpoint} onChangeText={setEndpoint} autoCapitalize="none" autoCorrect={false}/>
      <Field accessibilityLabel="用户名" placeholder="用户名" value={name} onChangeText={setName} autoCapitalize="none" maxLength={30}/>
      <Field accessibilityLabel="密码" placeholder="密码，至少 10 个字符" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" maxLength={128}/>
      <Row><Button title="登录" variant="primary" disabled={busy || !name.trim() || password.length < 10} onPress={() => void authenticate(false)}/><Button title="注册" disabled={busy || !name.trim() || password.length < 10} onPress={() => void authenticate(true)}/></Row>
    </> : <><Row style={{ justifyContent: 'space-between' }}><Label>{session.user.name}</Label><Button title="账户" onPress={() => { setAccount(true); void run(async () => setBlocked(await communityRequest<User[]>(session.endpoint, '/blocks', { token: session.token }))); }}/></Row>
      <Row><Button title="刷新讨论" onPress={() => void run(() => refresh())} disabled={busy}/><Button title="写讨论" variant="primary" onPress={() => setCompose(true)}/></Row>
      {posts.length === 0 && <Label muted>尚未加载讨论，或当前没有可见内容。点击刷新获取最新讨论。</Label>}
      {posts.map(post => card(post, () => void run(async () => setThread(await communityRequest<Thread>(session.endpoint, `/posts/${post.id}`, { token: session.token })))))}
    </>}{busy && <Busy message="正在连接…"/>}
  </ScrollView>
  <ReaderPanel title={activePanel ? { compose: '写讨论', thread: '讨论', report: '举报内容', account: '账户' }[activePanel] : ''} visible={!!activePanel} close={closePanel}>
  {activePanel === 'compose' && <><Field accessibilityLabel="书名（可选）" placeholder="书名（可选）" value={bookTitle} onChangeText={setBookTitle} maxLength={200}/><Field accessibilityLabel="讨论内容" placeholder="写下想讨论的内容" multiline value={draft} onChangeText={setDraft} maxLength={5000}/><Text style={s.small}>发布后，连接到此社区的用户可见。请勿发布整章书籍或未授权内容。</Text><Button title="发布" variant="primary" disabled={busy || !draft.trim()} onPress={() => void run(async () => { await action('/posts', 'POST', { body: draft, bookTitle }); setDraft(''); setBookTitle(''); setCompose(false); await refresh(); })}/></>}
  {activePanel === 'thread' && thread && <>{card(thread.post)}{thread.replies.map(p => card(p))}<Field accessibilityLabel="回复内容" placeholder="回复这条讨论" multiline value={reply} onChangeText={setReply} maxLength={5000}/><Button title="发送回复" variant="primary" disabled={busy || !reply.trim()} onPress={() => void run(async () => { await action('/posts', 'POST', { body: reply, parentId: thread.post.id }); setReply(''); setThread(await communityRequest<Thread>(session!.endpoint, `/posts/${thread.post.id}`, { token: session!.token })); })}/></>}
  {activePanel === 'report' && <><Label muted>{report?.body.slice(0, 120)}</Label><Field accessibilityLabel="举报原因" placeholder="请说明违规原因" multiline value={reason} onChangeText={setReason} maxLength={500}/><Button title="提交举报" variant="primary" disabled={busy || !reason.trim()} onPress={() => void run(async () => { await action('/reports', 'POST', { postId: report!.id, reason }); setReport(null); setNotice('举报已提交，等待管理员处理'); })}/></>}
  {activePanel === 'account' && <><Label>{session?.user.name}</Label><Label muted>已屏蔽用户</Label>{blocked.length === 0 && <Text style={s.small}>暂无屏蔽</Text>}{blocked.map(user => <Row key={user.id}><Label>{user.name}</Label><Button title="解除屏蔽" onPress={() => void run(async () => { await action(`/blocks/${user.id}`, 'DELETE'); setBlocked(blocked.filter(u => u.id !== user.id)); await refresh(); })}/></Row>)}
    <Button title="退出登录" onPress={() => void run(async () => { try { await action('/auth/logout', 'POST'); } finally { await storeSession(null); setSession(null); setPosts([]); setAccount(false); } })}/>
    <Button title="删除账户" variant="danger" onPress={() => Alert.alert('永久删除社区账户？', '账户、已发布的帖子和回复将被删除。本机书籍与私人笔记保留。', [{ text: '取消', style: 'cancel' }, { text: '删除账户', style: 'destructive', onPress: () => void run(async () => { await action('/account', 'DELETE'); await storeSession(null); setSession(null); setPosts([]); setAccount(false); setNotice('社区账户已删除'); }) }])}/></>}{!!error && <ErrorMessage message={error}/>}</ReaderPanel>
  </>;
}
