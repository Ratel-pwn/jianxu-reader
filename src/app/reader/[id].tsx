import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Busy, ErrorMessage, Field, Label, Row, colors, s } from '../../components/ui';
import { useReader } from '../../features/reader/hooks/useReader';
import { EpubReader } from '../../features/reader/components/EpubReader';
import { PdfReader } from '../../features/reader/components/PdfReader';
import { ReaderPanel } from '../../features/reader/components/ReaderPanel';
import { beforeOrAt, locatorLabel, type Locator } from '../../features/reader/model/types';

export default function Reader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useReader(id);
  const [panel, setPanel] = useState<'contents' | 'notes' | 'font' | 'companion' | null>(null);
  const [draft, setDraft] = useState(''), [selection, setSelection] = useState<{ quote: string; location: Locator } | null>(null);
  const [pages, setPages] = useState(0), [pageDraft, setPageDraft] = useState(''), [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  if (r.loading) return <SafeAreaView style={s.screen}><Busy message="正在打开书籍…"/></SafeAreaView>;
  if (!r.book || !r.target) return <SafeAreaView style={s.screen}><View style={s.content}><ErrorMessage message={r.error || '书籍不存在'}/><Button title="返回书库" onPress={() => router.back()}/></View></SafeAreaView>;
  const book = r.book;
  async function saveNote() {
    if (!draft.trim() && !selection) return;
    setSaving(true);
    try { await r.annotate('note', draft, selection?.quote, selection?.location); setDraft(''); setSelection(null); setNotice('笔记已保存'); }
    catch { r.setError('笔记保存失败，草稿已保留'); }
    finally { setSaving(false); }
  }
  function link(href: string) {
    const [path, fragment] = href.split('#');
    const index = book.chapters.findIndex(c => c.href === path);
    if (index >= 0) r.navigate({ href: path, chapter: index, progression: 0, fragment });
  }
  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
    <Row style={{ paddingHorizontal: 8, flexWrap: 'nowrap' }}><Button title="书库" onPress={() => { void r.flush(); router.back(); }}/><Text numberOfLines={1} style={{ flex: 1, fontSize: 16, color: colors.ink }}>{book.title}</Text><Button title="伴读" onPress={() => setPanel('companion')}/></Row>
    <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 8 }} showsHorizontalScrollIndicator={false}><Button title={book.format === 'pdf' ? '页码' : '目录'} onPress={() => setPanel('contents')}/><Button title={`笔记${r.notes.length ? ` ${r.notes.length}` : ''}`} onPress={() => setPanel('notes')}/>{book.format === 'epub' && <Button title="字号与背景" onPress={() => setPanel('font')}/>}<Button title="加书签" onPress={() => { void r.annotate('bookmark', '').then(() => setNotice('书签已保存')).catch(() => r.setError('书签保存失败')); }}/></ScrollView>
    {!!r.error && <View style={{ padding: 12 }}><ErrorMessage message={r.error}/><Button title="关闭提示" onPress={() => r.setError('')}/></View>}
    {book.format === 'epub' ? <EpubReader book={book} location={r.target} typography={r.typography} onPosition={r.moved} onSelection={(quote, location) => setSelection({ quote, location })} onLink={link}/> : <PdfReader book={book} location={r.target} onPosition={r.moved} onPages={setPages} onError={r.setError}/>}
    {selection && <Row style={{ paddingHorizontal: 12 }}><Button title="为选中文字记笔记" onPress={() => setPanel('notes')}/><Button title="取消选取" onPress={() => setSelection(null)}/></Row>}
    <View style={{ paddingHorizontal: 12, borderTopWidth: 1, borderColor: colors.line }}><Row style={{ justifyContent: 'space-between' }}>
      <Text style={[s.small, { flex: 1 }]} numberOfLines={1}>{locatorLabel(r.position, book.chapters)}</Text><Button title="我读到这里" onPress={() => { void r.mark().then(saved => { if (saved) setNotice('伴读边界已更新'); }); }}/></Row>
      {book.format === 'epub' && <Row style={{ justifyContent: 'space-between' }}><Button title="上一章" disabled={r.target.chapter === 0} onPress={() => link(book.chapters[r.target!.chapter - 1].href)}/><Button title="下一章" disabled={r.target.chapter === book.chapters.length - 1} onPress={() => link(book.chapters[r.target!.chapter + 1].href)}/></Row>}
      {!!notice && <Row><Text accessibilityLiveRegion="polite" style={s.small}>{notice}</Text><Button title="收起" onPress={() => setNotice('')}/></Row>}
    </View>
    <ReaderPanel visible={panel === 'contents'} title={book.format === 'pdf' ? '跳转页码' : '目录'} close={() => setPanel(null)}>
      {book.format === 'epub' ? book.chapters.map((chapter, index) => <Button key={chapter.id} title={`${index + 1}. ${chapter.title}`} onPress={() => { link(chapter.href); setPanel(null); }}/>) : <><Label>共 {pages || '—'} 页</Label><Field accessibilityLabel="页码" keyboardType="number-pad" value={pageDraft} onChangeText={setPageDraft} placeholder="输入页码"/><Button title="跳转" variant="primary" disabled={!Number.isInteger(Number(pageDraft)) || Number(pageDraft) < 1 || Number(pageDraft) > pages} onPress={() => { r.navigate({ href: 'original.pdf', chapter: 0, page: Number(pageDraft), progression: (Number(pageDraft) - 1) / Math.max(1, pages - 1) }); setPanel(null); }}/></>}
    </ReaderPanel>
    <ReaderPanel visible={panel === 'notes'} title="笔记与书签" close={() => setPanel(null)}>
      {!!selection && <Label muted>“{selection.quote}”</Label>}
      <Field accessibilityLabel="笔记内容" placeholder={book.format === 'pdf' ? '为当前页写一条笔记' : '记下此刻的想法'} multiline value={draft} onChangeText={setDraft} maxLength={5000}/>
      <Button title={saving ? '保存中…' : '保存笔记'} variant="primary" disabled={saving || (!draft.trim() && !selection)} onPress={() => void saveNote()}/>
      {r.notes.length === 0 && <Label muted>还没有笔记或书签。</Label>}
      {r.notes.map(note => <View key={note.id} style={{ gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line }}><Text style={s.small}>{note.kind === 'bookmark' ? '书签' : '笔记'} · {locatorLabel(note.locator, book.chapters)}</Text>{!!note.quote && <Label muted>“{note.quote}”</Label>}{!!note.text && <Label>{note.text}</Label>}<Row><Button title="查看原文" onPress={() => { r.navigate(note.locator); setPanel(null); }}/><Button title="删除" variant="danger" onPress={() => { void r.removeNote(note.id).catch(() => r.setError('删除失败')); }}/></Row></View>)}
    </ReaderPanel>
    <ReaderPanel visible={panel === 'font'} title="阅读外观" close={() => setPanel(null)}>
      <Row><Button title="缩小字号" disabled={r.typography.size <= 14} onPress={() => void r.updateTypography({ ...r.typography, size: r.typography.size - 2 })}/><Label>{r.typography.size}</Label><Button title="放大字号" disabled={r.typography.size >= 36} onPress={() => void r.updateTypography({ ...r.typography, size: r.typography.size + 2 })}/></Row>
      <Row>{([1.5, 1.8, 2.1] as const).map(lineHeight => <Button key={lineHeight} title={`行距 ${lineHeight}`} variant={r.typography.lineHeight === lineHeight ? 'primary' : 'plain'} onPress={() => void r.updateTypography({ ...r.typography, lineHeight })}/>)}</Row>
      <Row>{(['paper', 'light', 'dark'] as const).map((theme, i) => <Button key={theme} title={['纸色', '明亮', '夜间'][i]} variant={r.typography.theme === theme ? 'primary' : 'plain'} onPress={() => void r.updateTypography({ ...r.typography, theme })}/>)}</Row>
    </ReaderPanel>
    <ReaderPanel visible={panel === 'companion'} title="伴读" close={() => setPanel(null)}>
      <Label>范围截至：{locatorLabel(r.cutoff, book.chapters)}</Label>{r.cutoff && <Button title="查看边界原文" onPress={() => { r.navigate(r.cutoff!); setPanel(null); }}/>}
      <Label muted>AI 尚未启用。人物、关系、术语和回顾将在接入后按此边界生成。</Label><Button title="AI 连接配置" onPress={() => { setPanel(null); router.push('/settings'); }}/>
      {r.cutoff && <><Label>范围内的笔记</Label>{r.notes.filter(n => n.kind === 'note' && beforeOrAt(n.locator, r.cutoff!)).map(note => <View key={note.id}><Label>{note.text || note.quote}</Label><Button title="查看原文" onPress={() => { r.navigate(note.locator); setPanel(null); }}/></View>)}{!r.notes.some(n => n.kind === 'note' && beforeOrAt(n.locator, r.cutoff!)) && <Label muted>此范围内还没有笔记。</Label>}</>}
    </ReaderPanel>
  </SafeAreaView>;
}
