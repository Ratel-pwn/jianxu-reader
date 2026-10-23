import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

export const colors = { bg: '#f8f7f3', surface: '#ffffff', ink: '#242c2b', muted: '#67716d', line: '#dedfd7', accent: '#216653', danger: '#a13636' };
export function Label({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <Text style={[s.label, muted && { color: colors.muted }]}>{children}</Text>;
}
export function Heading({ children }: { children: React.ReactNode }) { return <Text style={s.heading}>{children}</Text>; }
export function Button({ title, onPress, disabled, variant = 'plain', testID }: { title: string; onPress: () => void; disabled?: boolean; variant?: 'plain' | 'primary' | 'danger'; testID?: string }) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} onPress={onPress} disabled={disabled} style={({ pressed }) => [s.button, variant === 'primary' && s.primary, { opacity: disabled ? .4 : pressed ? .65 : 1 }]}><Text style={[s.buttonText, variant === 'primary' && { color: 'white' }, variant === 'danger' && { color: colors.danger }]}>{title}</Text></Pressable>;
}
export function Field(props: TextInputProps) { return <TextInput placeholderTextColor={colors.muted} {...props} style={[s.field, props.multiline && { minHeight: 108, textAlignVertical: 'top' }, props.style]} />; }
export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) { return <View style={[s.row, style]}>{children}</View>; }
export function Busy({ message }: { message: string }) { return <View style={s.state}><ActivityIndicator color={colors.accent}/><Label muted>{message}</Label></View>; }
export function ErrorMessage({ message }: { message: string }) { return <Text accessibilityRole="alert" style={s.error}>{message}</Text>; }
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16, paddingBottom: 36 },
  heading: { fontSize: 28, fontWeight: '600', color: colors.ink, lineHeight: 38 },
  label: { fontSize: 16, lineHeight: 25, color: colors.ink },
  small: { fontSize: 13, lineHeight: 20, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  button: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center', borderRadius: 10 },
  buttonText: { fontSize: 15, fontWeight: '600', color: colors.accent },
  primary: { backgroundColor: colors.accent },
  field: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 10, padding: 13, fontSize: 16, color: colors.ink },
  state: { paddingVertical: 28, gap: 12, alignItems: 'center' },
  error: { fontSize: 15, lineHeight: 23, color: colors.danger },
  separator: { height: 1, backgroundColor: colors.line },
});
