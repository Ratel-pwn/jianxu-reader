import React from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Heading, Row, s } from '../../../components/ui';

export function ReaderPanel({ title, visible, close, children }: { title: string; visible: boolean; close: () => void; children: React.ReactNode }) {
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}><SafeAreaView style={s.screen}>
    <View style={{ paddingHorizontal: 20, paddingTop: 12 }}><Row style={{ justifyContent: 'space-between' }}><Heading>{title}</Heading><Button title="关闭" onPress={close}/></Row></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView>
  </SafeAreaView></Modal>;
}
