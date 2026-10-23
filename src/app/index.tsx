import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, View, Text, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Busy, ErrorMessage, Field, Heading, Label, Row, colors, s } from '../components/ui';
import { listBooks } from '../services/database';
import { pickAndImport, deleteBook } from '../services/importBook';
import { locatorLabel, type Book } from '../features/reader/model/types';

export default function Library() {
  const [books, setBooks] = useState<Book[]>([]), [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true), [progress, setProgress] = useState(''), [error, setError] = useState('');
  const refresh = useCallback(async () => { try { setBooks(await listBooks()); setError(''); } catch { setError('书库读取失败，请重试'); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  async function importFile() {
    setError('');
    try { const id = await pickAndImport(setProgress); await refresh(); if (id) router.push(`/reader/${id}`); }
    catch (e) { setError(e instanceof Error ? e.message : '导入失败，请检查文件后重试'); }
    finally { setProgress(''); }
  }
  function confirmDelete(book: Book) {
    Alert.alert('移除这本书？', '本机文件、笔记和阅读记录将一起删除。', [{ text: '取消', style: 'cancel' }, { text: '移除', style: 'destructive', onPress: () => { void deleteBook(book).then(refresh).catch(() => setError('移除失败，请重试')); } }]);
  }
  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
    <View style={local.header}><Row style={{ justifyContent: 'space-between' }}><Heading>书库</Heading><Button title="导入书籍" variant="primary" disabled={!!progress} onPress={() => void importFile()}/></Row>
      <Row><Button title="社区" onPress={() => router.push('/community')}/><Button title="设置" onPress={() => router.push('/settings')}/></Row>
      {books.length > 0 && <Field accessibilityLabel="搜索书名或作者" placeholder="搜索书名或作者" value={query} onChangeText={setQuery}/>}
      {!!error && <ErrorMessage message={error}/>} {!!progress && <Busy message={progress}/>}
    </View>
    {loading ? <Busy message="正在打开书库…"/> : <FlatList data={books.filter(b => `${b.title} ${b.author}`.toLowerCase().includes(query.toLowerCase()))} keyExtractor={b => b.id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
      ListEmptyComponent={<View style={{ paddingVertical: 28, gap: 10 }}><Label>{query ? '没有找到这本书' : '导入一本书，开始阅读'}</Label><Label muted>{query ? '试试其他书名或作者。' : '支持 PDF 和 EPUB，书籍与笔记保存在本机。'}</Label>{!!error && <Button title="重试" onPress={() => void refresh()}/>}</View>}
      renderItem={({ item }) => <View style={local.book}><Pressable accessibilityRole="button" accessibilityLabel={`阅读 ${item.title}`} style={{ flex: 1, gap: 6 }} onPress={() => router.push(`/reader/${item.id}`)}>
        <Text style={local.title}>{item.title}</Text><Text style={s.small}>{[item.author, item.format.toUpperCase()].filter(Boolean).join(' · ')}</Text><Text style={s.small}>{item.position ? locatorLabel(item.position, item.chapters) : '开始阅读'}</Text>
      </Pressable><Button title="移除" onPress={() => confirmDelete(item)}/></View>}/>}
  </SafeAreaView>;
}
const local = StyleSheet.create({ header: { padding: 20, paddingBottom: 12, gap: 12 }, book: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 22, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, title: { fontSize: 21, lineHeight: 30, color: colors.ink, fontWeight: '500' } });
