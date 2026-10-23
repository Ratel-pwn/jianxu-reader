import React from 'react';
import { Text, View } from 'react-native';
import type { Post } from '../model/types';
import { Button, Label, Row, colors, s } from '../../../components/ui';

export function PostCard({ post, own, open, report, block, remove }: { post: Post; own: boolean; open?: () => void; report: () => void; block: () => void; remove: () => void }) {
  return <View style={{ gap: 8, paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.line }}><Text style={s.small}>{post.author} · {new Date(post.createdAt).toLocaleDateString()}{post.bookTitle ? ` · ${post.bookTitle}` : ''}</Text><Label>{post.body}</Label><Row>
    {open && <Button title="查看讨论" onPress={open}/>} {own ? <Button title="删除" variant="danger" onPress={remove}/> : <><Button title="举报" onPress={report}/><Button title="屏蔽作者" onPress={block}/></>}
  </Row></View>;
}
